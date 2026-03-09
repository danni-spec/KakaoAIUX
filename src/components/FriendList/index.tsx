import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { StatusBar } from "./StatusBar";
import { Header } from "./Header";
import { TabNavigation } from "./TabNavigation";
import { UpdatedFriendsSection } from "./UpdatedFriendsSection";
import { BirthdayFriendsSection } from "./BirthdayFriendsSection";
import { FavoriteFriendsSection } from "./FavoriteFriendsSection";
import { AllFriendsSection } from "./AllFriendsSection";
import { BottomNavBar } from "./BottomNavBar";
import { AILayerPopup } from "./AILayerPopup";
import { DarkModeOverlay } from "./DarkModeOverlay";
import { MapLayerOverlay } from "./MapLayerOverlay";
import { NotificationBanner } from "./NotificationBanner";
import { BirthdayGiftPopup } from "./BirthdayGiftPopup";

/**
 * Squircle clipPath — 첨부 이미지와 동일한 형태 (코너 강하게 둥글게)
 * clipPathUnits="objectBoundingBox" 덕에 어떤 크기에도 자동 스케일
 */
function SquircleClipDef() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/* 스퀘어클 — 0.7/0.3 컨트롤 포인트로 코너를 더 둥글게 */}
        <clipPath id="sq" clipPathUnits="objectBoundingBox">
          <path d="
            M 0.5,0
            C 0.7,0  1,0.3  1,0.5
            C 1,0.7  0.7,1  0.5,1
            C 0.3,1  0,0.7  0,0.5
            C 0,0.3  0.3,0  0.5,0
            Z
          " />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * 원 제스처 상태 — ref로 관리하여 리렌더 없이 추적
 * - "idle": 터치 대기
 * - "pending": 터치 시작 후 방향 판별 대기 (스크롤 vs 원)
 * - "gesture": 원 그리기 진행 중 (스크롤 차단)
 * - "scroll": 수직 스크롤로 판정 (제스처 포기, 브라우저 스크롤 허용)
 */
type GesturePhase = "idle" | "pending" | "gesture" | "scroll";

const CIRCLE_ANGLE_THRESHOLD = 252; // 원의 70% = 252°
const DIRECTION_DECIDE_DISTANCE = 12; // px: 이 거리 이상 이동 시 방향 판별
const VERTICAL_RATIO = 2.0; // dy/dx 비율이 이 이상이면 수직 스크롤로 판정
const MIN_POINTS_FOR_ANGLE = 8; // 누적 각도 계산 최소 포인트 수

/** 누적 각도 계산: 연속 포인트 간 중심 기준 각도 변화의 절대합 */
function calcCumulativeAngle(points: { x: number; y: number }[]): number {
  if (points.length < MIN_POINTS_FOR_ANGLE) return 0;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a1 = Math.atan2(points[i - 1].y - cy, points[i - 1].x - cx);
    const a2 = Math.atan2(points[i].y - cy, points[i].x - cx);
    let delta = a2 - a1;
    // -π ~ π 범위로 정규화
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    total += delta;
  }
  return Math.abs(total) * (180 / Math.PI); // 도 단위
}

export function FriendList() {
  const [aiPopupOpen, setAiPopupOpen] = useState(false);
  const [darkModeOverlayOpen, setDarkModeOverlayOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    return false;
  });

  // Sync darkMode → localStorage + body class
  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mapLayerOpen, setMapLayerOpen] = useState(false);
  const mapDestination = "";
  const [giftPopupOpen, setGiftPopupOpen] = useState(false);
  const giftPopupFriend = { name: "", photo: "" };
  const aiInputRef = useRef<HTMLInputElement>(null);
  const circlePointsRef = useRef<{ x: number; y: number }[]>([]);
  const circleFiredRef = useRef(false);
  const mouseDownRef = useRef(false);


  const handleFriendClick = useCallback((name: string) => {
    if (name === "이해수 ❤️") {
      setNotificationOpen(true);
    }
  }, []);

  const openAIPopup = useCallback(() => {
    flushSync(() => setAiPopupOpen(true));
  }, []);

  // ── 원 제스처: 방향 판별 후 선택적 preventDefault ──
  const mainRef = useRef<HTMLElement>(null);
  const gesturePhaseRef = useRef<GesturePhase>("idle");
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const { clientX: x, clientY: y } = e.touches[0];
      circlePointsRef.current = [{ x, y }];
      circleFiredRef.current = false;
      startPosRef.current = { x, y };
      gesturePhaseRef.current = "pending";
    };

    const onTouchMove = (e: TouchEvent) => {
      const phase = gesturePhaseRef.current;
      if (phase === "idle" || phase === "scroll" || circleFiredRef.current) return;

      const { clientX: x, clientY: y } = e.touches[0];
      circlePointsRef.current.push({ x, y });

      // pending 단계: 일정 거리 이동 후 방향 판별
      if (phase === "pending") {
        const dx = Math.abs(x - startPosRef.current.x);
        const dy = Math.abs(y - startPosRef.current.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= DIRECTION_DECIDE_DISTANCE) {
          if (dx > 0 && dy / dx >= VERTICAL_RATIO) {
            // 수직 이동 → 스크롤로 판정, 제스처 포기
            gesturePhaseRef.current = "scroll";
            circlePointsRef.current = [];
            return;
          }
          // 비수직 → 원 제스처 진행
          gesturePhaseRef.current = "gesture";
        }
        return; // 아직 판별 안 됨 → 스크롤도 제스처도 아님
      }

      // gesture 단계: 스크롤 차단 + 누적 각도 체크
      e.preventDefault();
      const angle = calcCumulativeAngle(circlePointsRef.current);
      if (angle >= CIRCLE_ANGLE_THRESHOLD) {
        circleFiredRef.current = true;
        circlePointsRef.current = [];
        gesturePhaseRef.current = "idle";
        openAIPopup();
      }
    };

    const onTouchEnd = () => {
      circlePointsRef.current = [];
      gesturePhaseRef.current = "idle";
    };

    // passive: false → gesture 단계에서 preventDefault 가능
    // pending/scroll 단계에서는 preventDefault를 호출하지 않으므로 스크롤 정상 동작
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [openAIPopup]);

  // ── 원 제스처: 마우스 (데스크탑) ──
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseDownRef.current = true;
    circlePointsRef.current = [{ x: e.clientX, y: e.clientY }];
    circleFiredRef.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseDownRef.current || circleFiredRef.current) return;
      e.preventDefault();
      circlePointsRef.current.push({ x: e.clientX, y: e.clientY });
      if (calcCumulativeAngle(circlePointsRef.current) >= CIRCLE_ANGLE_THRESHOLD) {
        circleFiredRef.current = true;
        circlePointsRef.current = [];
        mouseDownRef.current = false;
        openAIPopup();
      }
    },
    [openAIPopup]
  );

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    circlePointsRef.current = [];
  }, []);

  return (
    <div
      className={`h-full flex flex-col relative transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <SquircleClipDef />
      <StatusBar darkMode={darkMode} />
      {/* pb-28: 플로팅 GNB 높이(≈60px) + bottom-3(12px) + 여유분 — 탑바·칩 포함 스크롤 */}
      {/* 원 제스처: 화면에 원을 그리면 AI 레이어 박스 노출 */}
      <main
        ref={mainRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-28"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Header darkMode={darkMode} />
        <div>
          <TabNavigation darkMode={darkMode} />
        </div>
        <UpdatedFriendsSection darkMode={darkMode} onFriendClick={handleFriendClick} />
        <BirthdayFriendsSection darkMode={darkMode} />
        <FavoriteFriendsSection darkMode={darkMode} />
        <AllFriendsSection darkMode={darkMode} />
      </main>
      <NotificationBanner
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
      {/* absolute 오버레이 → backdrop-blur 실효 */}
      <BottomNavBar darkMode={darkMode} />
      <AILayerPopup
        isOpen={aiPopupOpen}
        onClose={() => setAiPopupOpen(false)}
        inputRef={aiInputRef}
        darkMode={darkMode}
        onDarkModeToggle={setDarkMode}
      />
      <DarkModeOverlay
        isOpen={darkModeOverlayOpen}
        onClose={() => setDarkModeOverlayOpen(false)}
        darkMode={darkMode}
        onToggle={setDarkMode}
        onOpenAI={() => {
          setDarkModeOverlayOpen(false);
          openAIPopup();
        }}
      />
      <MapLayerOverlay
        isOpen={mapLayerOpen}
        onClose={() => setMapLayerOpen(false)}
        destination={mapDestination}
      />
      <BirthdayGiftPopup
        isOpen={giftPopupOpen}
        onClose={() => setGiftPopupOpen(false)}
        friendName={giftPopupFriend.name}
        friendPhoto={giftPopupFriend.photo}
      />
    </div>
  );
}
