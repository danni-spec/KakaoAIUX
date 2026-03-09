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
const DIRECTION_DECIDE_DISTANCE = 10; // px: 이 거리 이상 이동 시 방향 판별
const VERTICAL_RATIO = 1.8; // dy/dx 비율이 이 이상이면 수직 스크롤로 판정
const MIN_POINTS_FOR_ANGLE = 8; // 누적 각도 계산 최소 포인트 수

/** 누적 각도 계산 — 증분 업데이트용 (전체 재계산 없이 마지막 포인트만 추가) */
function calcIncrementalAngle(
  points: { x: number; y: number }[],
  prevAngle: number,
  cx: number,
  cy: number,
): number {
  const len = points.length;
  if (len < 2) return prevAngle;
  const a1 = Math.atan2(points[len - 2].y - cy, points[len - 2].x - cx);
  const a2 = Math.atan2(points[len - 1].y - cy, points[len - 1].x - cx);
  let delta = a2 - a1;
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta < -Math.PI) delta += 2 * Math.PI;
  return prevAngle + delta;
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

  // ── 원 제스처: pending에서는 스크롤 허용, gesture 확정 후에만 차단 ──
  const mainRef = useRef<HTMLElement>(null);
  const gesturePhaseRef = useRef<GesturePhase>("idle");
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // 증분 각도 + 중심점 캐시 (매 프레임 전체 재계산 방지)
  const cumulAngleRef = useRef(0);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointCountRef = useRef(0);
  const centerSumRef = useRef<{ sx: number; sy: number }>({ sx: 0, sy: 0 });

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    const resetGesture = () => {
      circlePointsRef.current = [];
      gesturePhaseRef.current = "idle";
      cumulAngleRef.current = 0;
      pointCountRef.current = 0;
      centerSumRef.current = { sx: 0, sy: 0 };
    };

    const onTouchStart = (e: TouchEvent) => {
      const { clientX: x, clientY: y } = e.touches[0];
      circlePointsRef.current = [{ x, y }];
      circleFiredRef.current = false;
      startPosRef.current = { x, y };
      gesturePhaseRef.current = "pending";
      cumulAngleRef.current = 0;
      pointCountRef.current = 1;
      centerSumRef.current = { sx: x, sy: y };
      centerRef.current = { x, y };
    };

    const onTouchMove = (e: TouchEvent) => {
      const phase = gesturePhaseRef.current;
      if (phase === "idle" || phase === "scroll" || circleFiredRef.current) return;

      const { clientX: x, clientY: y } = e.touches[0];

      // pending: 포인트만 수집, 스크롤은 허용 (preventDefault 안 함)
      if (phase === "pending") {
        circlePointsRef.current.push({ x, y });
        // 중심점 증분 업데이트
        pointCountRef.current++;
        centerSumRef.current.sx += x;
        centerSumRef.current.sy += y;
        centerRef.current = {
          x: centerSumRef.current.sx / pointCountRef.current,
          y: centerSumRef.current.sy / pointCountRef.current,
        };

        const dx = Math.abs(x - startPosRef.current.x);
        const dy = Math.abs(y - startPosRef.current.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= DIRECTION_DECIDE_DISTANCE) {
          if (dx > 0 && dy / dx >= VERTICAL_RATIO) {
            // 수직 → 스크롤로 판정
            gesturePhaseRef.current = "scroll";
            circlePointsRef.current = [];
            return;
          }
          // 비수직 → 제스처 확정, 여기서부터 스크롤 차단
          gesturePhaseRef.current = "gesture";
          e.preventDefault();
        }
        return;
      }

      // gesture: 스크롤 완전 차단 + 증분 각도 계산
      e.preventDefault();
      circlePointsRef.current.push({ x, y });
      // 중심점 증분 업데이트
      pointCountRef.current++;
      centerSumRef.current.sx += x;
      centerSumRef.current.sy += y;
      centerRef.current = {
        x: centerSumRef.current.sx / pointCountRef.current,
        y: centerSumRef.current.sy / pointCountRef.current,
      };

      // 증분 각도 (O(1) — 마지막 2포인트만 비교)
      if (circlePointsRef.current.length >= MIN_POINTS_FOR_ANGLE) {
        cumulAngleRef.current = calcIncrementalAngle(
          circlePointsRef.current,
          cumulAngleRef.current,
          centerRef.current.x,
          centerRef.current.y,
        );
        if (Math.abs(cumulAngleRef.current) * (180 / Math.PI) >= CIRCLE_ANGLE_THRESHOLD) {
          circleFiredRef.current = true;
          resetGesture();
          openAIPopup();
        }
      }
    };

    const onTouchEnd = () => { resetGesture(); };

    // touchstart/touchend: passive (스크롤 성능 유지)
    // touchmove: non-passive (gesture 확정 후에만 preventDefault 호출)
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
  const mouseAngleRef = useRef(0);
  const mouseCenterSumRef = useRef<{ sx: number; sy: number }>({ sx: 0, sy: 0 });
  const mousePointCountRef = useRef(0);
  const mouseCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    mouseDownRef.current = true;
    circlePointsRef.current = [{ x: e.clientX, y: e.clientY }];
    circleFiredRef.current = false;
    mouseAngleRef.current = 0;
    mousePointCountRef.current = 1;
    mouseCenterSumRef.current = { sx: e.clientX, sy: e.clientY };
    mouseCenterRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!mouseDownRef.current || circleFiredRef.current) return;
      e.preventDefault();
      circlePointsRef.current.push({ x: e.clientX, y: e.clientY });
      mousePointCountRef.current++;
      mouseCenterSumRef.current.sx += e.clientX;
      mouseCenterSumRef.current.sy += e.clientY;
      mouseCenterRef.current = {
        x: mouseCenterSumRef.current.sx / mousePointCountRef.current,
        y: mouseCenterSumRef.current.sy / mousePointCountRef.current,
      };
      if (circlePointsRef.current.length >= MIN_POINTS_FOR_ANGLE) {
        mouseAngleRef.current = calcIncrementalAngle(
          circlePointsRef.current,
          mouseAngleRef.current,
          mouseCenterRef.current.x,
          mouseCenterRef.current.y,
        );
        if (Math.abs(mouseAngleRef.current) * (180 / Math.PI) >= CIRCLE_ANGLE_THRESHOLD) {
          circleFiredRef.current = true;
          circlePointsRef.current = [];
          mouseDownRef.current = false;
          openAIPopup();
        }
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
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", willChange: "scroll-position" }}
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
