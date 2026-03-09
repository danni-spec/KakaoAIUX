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

/** 원 제스처 감지: 포인트들의 중심 기준 각도 범위가 300° 이상이면 원으로 판정 */
function detectCircle(points: { x: number; y: number }[]): boolean {
  if (points.length < 20) return false;
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  const angles = points.map((p) => Math.atan2(p.y - cy, p.x - cx));
  // 12등분 버킷에 포인트가 분포되었는지 확인
  const buckets = new Set<number>();
  for (const a of angles) {
    buckets.add(Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12) % 12);
  }
  return buckets.size >= 10;
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

  // ── 원 제스처: 드래그 감지 → 오버레이 활성화 ──
  const DRAG_THRESHOLD = 5; // 포인트 수가 이 이상이면 "제스처 중"으로 판정
  const [gestureActive, setGestureActive] = useState(false);

  // 제스처 중 iOS 바운스 방지: body overflow 제어
  useEffect(() => {
    if (gestureActive) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [gestureActive]);

  // ── 원 제스처: 터치 ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    circlePointsRef.current = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
    circleFiredRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (circleFiredRef.current) return;
      circlePointsRef.current.push({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      // 일정 포인트 이상 → 제스처 중으로 판정, 오버레이 활성화
      if (circlePointsRef.current.length === DRAG_THRESHOLD) {
        setGestureActive(true);
      }
      if (detectCircle(circlePointsRef.current)) {
        circleFiredRef.current = true;
        circlePointsRef.current = [];
        setGestureActive(false);
        openAIPopup();
      }
    },
    [openAIPopup]
  );

  const handleTouchEnd = useCallback(() => {
    circlePointsRef.current = [];
    setGestureActive(false);
  }, []);

  // ── 원 제스처: 마우스 ──
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
      if (circlePointsRef.current.length === DRAG_THRESHOLD) {
        setGestureActive(true);
      }
      if (detectCircle(circlePointsRef.current)) {
        circleFiredRef.current = true;
        circlePointsRef.current = [];
        mouseDownRef.current = false;
        setGestureActive(false);
        openAIPopup();
      }
    },
    [openAIPopup]
  );

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    circlePointsRef.current = [];
    setGestureActive(false);
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
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pb-28"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
      {/* 제스처 활성 시 투명 오버레이: 스크롤·스와이프·탭 완전 차단 */}
      {gestureActive && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ touchAction: "none", userSelect: "none", WebkitUserSelect: "none" }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 오버레이 위에서도 제스처 포인트 수집 계속
            if (circleFiredRef.current) return;
            circlePointsRef.current.push({ x: e.touches[0].clientX, y: e.touches[0].clientY });
            if (detectCircle(circlePointsRef.current)) {
              circleFiredRef.current = true;
              circlePointsRef.current = [];
              setGestureActive(false);
              openAIPopup();
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            circlePointsRef.current = [];
            setGestureActive(false);
          }}
          onMouseMove={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!mouseDownRef.current || circleFiredRef.current) return;
            circlePointsRef.current.push({ x: e.clientX, y: e.clientY });
            if (detectCircle(circlePointsRef.current)) {
              circleFiredRef.current = true;
              circlePointsRef.current = [];
              mouseDownRef.current = false;
              setGestureActive(false);
              openAIPopup();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            mouseDownRef.current = false;
            circlePointsRef.current = [];
            setGestureActive(false);
          }}
        />
      )}
    </div>
  );
}
