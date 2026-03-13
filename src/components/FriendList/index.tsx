import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { Header } from "./Header";
import { TabNavigation } from "./TabNavigation";
import { UpdatedFriendsSection } from "./UpdatedFriendsSection";
import { BirthdayFriendsSection } from "./BirthdayFriendsSection";
import { AIFriendsSection } from "./AIFriendsSection";
import { FavoriteFriendsSection } from "./FavoriteFriendsSection";
import { AllFriendsSection } from "./AllFriendsSection";
import { BottomNavBar } from "./BottomNavBar";
import { StatusBar } from "./StatusBar";
import { AILayerPopup } from "./AILayerPopup";
import { NotificationBanner } from "./NotificationBanner";
import { ChatRoomList } from "./ChatRoomList";
import { ChatRoomDetail } from "./ChatRoomDetail";
import { useChatRooms } from "../../contexts/ChatRoomContext";

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
  const [gnbTab, setGnbTab] = useState(0); // 0: 친구, 1: 채팅, 2~4: 기타
  const chatRoomActions = useChatRooms();
  const { activeChatRoomId, activeChatRoom, chatRooms } = chatRoomActions;
  const totalUnread = chatRooms.reduce((sum, r) => sum + r.unreadCount, 0);
  const [aiPopupOpen, setAiPopupOpen] = useState(false);
  const [aiPopupMinimized, setAiPopupMinimized] = useState(false);
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

  // 채팅방 전환 시 장소 팝업 닫기
  useEffect(() => {
    setPlacePopupOpen(false);
  }, [activeChatRoomId]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [showNotificationList, setShowNotificationList] = useState(false);
  const [placePopupOpen, setPlacePopupOpen] = useState(false);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const circlePointsRef = useRef<{ x: number; y: number }[]>([]);
  const circleFiredRef = useRef(false);
  const mouseDownRef = useRef(false);


  const handleFriendClick = useCallback((name: string) => {
    if (name === "와이프 해수 ❤️") {
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
  const mouseGesturePhaseRef = useRef<GesturePhase>("idle");

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownRef.current = true;
    mouseGesturePhaseRef.current = "pending";
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
      const phase = mouseGesturePhaseRef.current;
      if (phase === "idle" || phase === "scroll") return;

      const x = e.clientX;
      const y = e.clientY;

      if (phase === "pending") {
        circlePointsRef.current.push({ x, y });
        mousePointCountRef.current++;
        mouseCenterSumRef.current.sx += x;
        mouseCenterSumRef.current.sy += y;
        mouseCenterRef.current = {
          x: mouseCenterSumRef.current.sx / mousePointCountRef.current,
          y: mouseCenterSumRef.current.sy / mousePointCountRef.current,
        };
        const dx = Math.abs(x - circlePointsRef.current[0].x);
        const dy = Math.abs(y - circlePointsRef.current[0].y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= DIRECTION_DECIDE_DISTANCE) {
          if (dx > 0 && dy / dx >= VERTICAL_RATIO) {
            mouseGesturePhaseRef.current = "scroll";
            circlePointsRef.current = [];
            return;
          }
          mouseGesturePhaseRef.current = "gesture";
        }
        return;
      }

      e.preventDefault();
      circlePointsRef.current.push({ x, y });
      mousePointCountRef.current++;
      mouseCenterSumRef.current.sx += x;
      mouseCenterSumRef.current.sy += y;
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
          mouseGesturePhaseRef.current = "idle";
          openAIPopup();
        }
      }
    },
    [openAIPopup]
  );

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    mouseGesturePhaseRef.current = "idle";
    circlePointsRef.current = [];
  }, []);

  return (
    <div
      className={`h-full w-full overflow-hidden flex flex-col relative transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}
    >
      <SquircleClipDef />
      <StatusBar darkMode={darkMode} />
      {/* 원 제스처: 모든 탭에서 원을 그리면 AI 레이어 박스 노출 */}
      <div
        ref={mainRef as React.RefObject<HTMLDivElement>}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide"
        style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* ── 탭 0: 친구 목록 ── */}
        {gnbTab === 0 && (
          <div className="pb-28">
            <Header darkMode={darkMode} />
            <div>
              <TabNavigation darkMode={darkMode} />
            </div>
            <UpdatedFriendsSection darkMode={darkMode} onFriendClick={handleFriendClick} />
            <BirthdayFriendsSection darkMode={darkMode} />
            <AIFriendsSection
              darkMode={darkMode}
              onOpenAI={openAIPopup}
              onJournalClick={() => {
                setShowNotificationList(true);
                flushSync(() => setAiPopupOpen(true));
              }}
            />
            <FavoriteFriendsSection darkMode={darkMode} />
            <AllFriendsSection darkMode={darkMode} />
          </div>
        )}
        {/* ── 탭 1: 채팅 목록 ── */}
        {gnbTab === 1 && <ChatRoomList darkMode={darkMode} />}
      </div>
      {/* ── 채팅방 상세 (어떤 탭이든 활성 채팅방이 있으면 오버레이) ── */}
      {activeChatRoomId && (
        <ChatRoomDetail
          darkMode={darkMode}
          onOpenAI={openAIPopup}
          placePopupOpen={placePopupOpen}
          onPlacePopupChange={setPlacePopupOpen}
        />
      )}
      <NotificationBanner
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
      {/* absolute 오버레이 → backdrop-blur 실효 */}
      <BottomNavBar darkMode={darkMode} activeTab={gnbTab} onTabChange={setGnbTab} unreadCount={totalUnread} disabled={aiPopupOpen && !aiPopupMinimized} />
      {/* iOS 홈 인디케이터 */}
      <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className={`w-[134px] h-[5px] rounded-full ${darkMode ? "bg-white" : "bg-black"}`} />
      </div>
      <AILayerPopup
        isOpen={aiPopupOpen}
        onClose={() => {
          setAiPopupOpen(false);
          setShowNotificationList(false);
        }}
        inputRef={aiInputRef}
        darkMode={darkMode}
        onDarkModeToggle={setDarkMode}
        suggestContext={
          activeChatRoomId && activeChatRoom
            ? (activeChatRoom.messages.length <= 1 ? "chat-room-new" : "chat-room")
            : gnbTab === 1
              ? "chat-list"
              : "friend"
        }
        chatPartnerName={activeChatRoom?.members.length === 1 ? activeChatRoom.members[0].name : undefined}
        chatProductSuggestions={
          activeChatRoom?.name === "박채원"
            ? ["에르메스 립밤", "샤넬 립스틱", "디올 립글로우"]
            : activeChatRoom?.name === "서은재"
              ? ["성수동 뚜흐느솔로"]
              : activeChatRoom?.name === "카카오 신입동기 모임방"
                ? ["성수동 핫플"]
                : undefined
        }
        chatRoomMessages={activeChatRoom?.messages.map(m => ({ sender: m.sender, text: m.text }))}
        onSendReply={activeChatRoomId ? (text) => chatRoomActions.sendMessage(activeChatRoomId, text) : undefined}
        onSendToMyChat={(text, voice) => chatRoomActions.sendMessage("room-my", text, undefined, voice)}
        allChatRooms={chatRoomActions.chatRooms.map(r => ({ name: r.name, unreadCount: r.unreadCount, lastMessage: r.lastMessage, messages: r.messages.map(m => ({ sender: m.sender, text: m.text })) }))}
        onMarkAllRead={chatRoomActions.markAllRead}
        showNotificationList={showNotificationList}
        onNotificationListClose={() => setShowNotificationList(false)}
        onMinimizedChange={setAiPopupMinimized}
        onChipPlaceClick={
          activeChatRoom?.name === "서은재"
            ? () => {
                setAiPopupOpen(false);
                setPlacePopupOpen(true);
              }
            : undefined
        }
        onCreateChatRoom={(members, initialMessage) => {
          const { openDirectChat, createGroupChat, sendMessage } = chatRoomActions;
          let room;
          if (members.length === 1) {
            room = openDirectChat(members[0]);
          } else {
            room = createGroupChat(members);
          }
          if (room && initialMessage) {
            sendMessage(room.id, initialMessage);
          }
          setGnbTab(1);
        }}
      />
    </div>
  );
}
