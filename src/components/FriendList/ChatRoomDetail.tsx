import { useState, useRef, useEffect, useCallback } from "react";
import { useChatRooms } from "../../contexts/ChatRoomContext";
import { CHAT_BUBBLE_RADIUS } from "../../constants/chat";
import { SquircleAvatar } from "./SquircleAvatar";
import { LinkifyText } from "./LinkifyText";

function formatMessageTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h >= 12 ? "오후" : "오전"} ${h > 12 ? h - 12 : h === 0 ? 12 : h}:${m}`;
}

const CIRCLE_ANGLE_THRESHOLD = 252;
const MIN_POINTS_FOR_ANGLE = 8;

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

// ── 팝업 공유 스타일 ──
const POPUP_POSITION_STYLE: React.CSSProperties = {
  left: 16,
  right: 16,
  bottom: 16,
  transition: "bottom 0.35s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease",
};

const GLOW_GRADIENT_BG =
  "conic-gradient(from 0deg, #e01080, rgba(255,255,255,0.4), #9010e0, #1a50e0, rgba(255,255,255,0.4), #00b8e0, #9010e0, #e05000, rgba(255,255,255,0.4), #e01080)";

const cardBoxShadow = (darkMode: boolean) =>
  darkMode
    ? "inset 0 0 0 1px rgba(255,255,255,0.12)"
    : "inset 0 0 0 1px #ffffff, 0 0 24px rgba(0,0,0,0.12), 0 0 48px rgba(0,0,0,0.06)";

// ── 상품 데이터 ──
const PRODUCT_DATA = {
  name: "에르메스 로즈 립밤",
  brand: "HERMÈS",
  image: "/hermes-lipbalm.png?v=2",
  prices: [
    { store: "카카오쇼핑", price: 52000, url: "#", icon: "/kakaoshopping-icon.png" },
    { store: "네이버", price: 54000, url: "#", icon: "/naver-icon.jpg" },
    { store: "쿠팡", price: 55800, url: "#", icon: "/coupang-icon.svg" },
  ],
  gifts: [
    { label: "선물 포장", desc: "카카오 선물하기로 바로 전달", price: 52000 },
    { label: "기프트 카드 동봉", desc: "메시지 카드와 함께 배송", price: 54000 },
  ],
};

export function ChatRoomDetail({
  darkMode,
  onOpenAI,
  placePopupOpen: placePopupProp,
  onPlacePopupChange,
}: {
  darkMode: boolean;
  onOpenAI?: () => void;
  placePopupOpen?: boolean;
  onPlacePopupChange?: (open: boolean) => void;
}) {
  const { activeChatRoom, closeChatRoom, sendMessage } = useChatRooms();
  const [text, setText] = useState("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [productPopup, setProductPopup] = useState(false);
  const [placePopupLocal, setPlacePopupLocal] = useState(false);
  const [locationPopup, setLocationPopup] = useState(false);
  const placePopup = placePopupProp ?? placePopupLocal;
  const setPlacePopup = onPlacePopupChange ?? setPlacePopupLocal;
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 키보드 감지 (포커스 기반 — VisualViewport 조작 없이)
  const onInputFocus = useCallback(() => {
    setKeyboardOpen(true);
    // 메시지 맨 아래로
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, []);
  const onInputBlur = useCallback(() => setKeyboardOpen(false), []);

  // 원 제스처 (마우스)
  const circlePointsRef = useRef<{ x: number; y: number }[]>([]);
  const circleFiredRef = useRef(false);
  const mouseDownRef = useRef(false);
  const mouseAngleRef = useRef(0);
  const mouseCenterSumRef = useRef({ sx: 0, sy: 0 });
  const mousePointCountRef = useRef(0);
  const mouseCenterRef = useRef({ x: 0, y: 0 });

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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
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
        onOpenAI?.();
      }
    }
  }, [onOpenAI]);

  const handleMouseUp = useCallback(() => {
    mouseDownRef.current = false;
    circlePointsRef.current = [];
  }, []);

  // 원 제스처 (터치)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    type GesturePhase = "idle" | "pending" | "gesture" | "scroll";
    let gesturePhase: GesturePhase = "idle";
    let startPos = { x: 0, y: 0 };
    let cumulAngle = 0;
    let pointCount = 0;
    let centerSum = { sx: 0, sy: 0 };
    let center = { x: 0, y: 0 };
    const pts: { x: number; y: number }[] = [];

    const reset = () => {
      gesturePhase = "idle";
      cumulAngle = 0;
      pointCount = 0;
      centerSum = { sx: 0, sy: 0 };
      pts.length = 0;
    };

    const onTouchStart = (e: TouchEvent) => {
      const { clientX: x, clientY: y } = e.touches[0];
      pts.length = 0;
      pts.push({ x, y });
      startPos = { x, y };
      gesturePhase = "pending";
      cumulAngle = 0;
      pointCount = 1;
      centerSum = { sx: x, sy: y };
      center = { x, y };
    };

    const onTouchMove = (e: TouchEvent) => {
      if (gesturePhase === "idle" || gesturePhase === "scroll") return;
      const { clientX: x, clientY: y } = e.touches[0];

      pts.push({ x, y });
      pointCount++;
      centerSum.sx += x;
      centerSum.sy += y;
      center = { x: centerSum.sx / pointCount, y: centerSum.sy / pointCount };

      if (gesturePhase === "pending") {
        const dx = Math.abs(x - startPos.x);
        const dy = Math.abs(y - startPos.y);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= 10) {
          if (dx > 0 && dy / dx >= 1.8) {
            gesturePhase = "scroll";
            pts.length = 0;
            return;
          }
          gesturePhase = "gesture";
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();
      if (pts.length >= MIN_POINTS_FOR_ANGLE) {
        cumulAngle = calcIncrementalAngle(pts, cumulAngle, center.x, center.y);
        if (Math.abs(cumulAngle) * (180 / Math.PI) >= CIRCLE_ANGLE_THRESHOLD) {
          reset();
          onOpenAI?.();
        }
      }
    };

    const onTouchEnd = () => { reset(); };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onOpenAI]);

  // 메시지 추가 시 자동 스크롤
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, [activeChatRoom?.messages.length]);

  if (!activeChatRoom) return null;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(activeChatRoom.id, trimmed);
    setText("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col ${darkMode ? "bg-[#1c1c1e]" : "bg-[#abc1d1]"}`}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* 헤더 */}
      <div
        className={`relative flex items-center px-4 h-[44px] flex-shrink-0 ${darkMode ? "bg-[#2c2c2e]" : "bg-[#abc1d1]"}`}
      >
        <button
          type="button"
          className="z-10"
          onClick={closeChatRoom}
        >
          <img src="/backIcon.svg" alt="뒤로" className={`w-[24px] h-[24px] ${darkMode ? "invert" : ""}`} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className={`text-[17px] font-bold truncate ${darkMode ? "text-white" : "text-[#191919]"}`}>
            {activeChatRoom.name}
            {activeChatRoom.members.length > 1 && (
              <span className="text-[17px] font-bold ml-1 text-[#6c6c6c]">
                {activeChatRoom.members.length + 1}
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-[18px] z-10" style={{ marginRight: 4 }}>
          <button type="button" aria-label="검색">
            <img src="/searchIcon.svg" alt="" className={`w-[24px] h-[24px] ${darkMode ? "invert" : ""}`} />
          </button>
          <button type="button" aria-label="더보기">
            <img src="/moreIcon.svg" alt="" className={`w-[24px] h-[24px] ${darkMode ? "invert" : ""}`} />
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-[10px] py-3"
        style={{ overscrollBehavior: "contain" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {activeChatRoom.messages.length === 0 && (
          <div className="h-full" />
        )}
        {activeChatRoom.messages.map((msg, i) => {
          const isMe = msg.sender === "me";
          const showAvatar =
            !isMe &&
            (i === 0 || activeChatRoom.messages[i - 1].sender !== msg.sender);
          const member = activeChatRoom.members.find((m) => m.name === msg.sender);

          return (
            <div key={msg.id} className={`flex mb-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-[36px] mr-2 flex-shrink-0">
                  {showAvatar && member && (
                    <SquircleAvatar src={member.photo} alt={member.name} className="w-[36px] h-[36px]" />
                  )}
                </div>
              )}
              <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                {showAvatar && !isMe && (
                  <p className={`text-[12px] mb-1 ${darkMode ? "text-gray-300" : "text-[#000000]"}`}>
                    {msg.sender}
                  </p>
                )}
                <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  {msg.image ? (
                    <div className="overflow-hidden" style={{ borderRadius: CHAT_BUBBLE_RADIUS, maxWidth: 220 }}>
                      <img src={msg.image} alt={msg.text} className="w-full object-cover" />
                    </div>
                  ) : (
                    <div
                      className={`px-3 py-[9px] min-h-[36px] text-[15px] leading-snug ${
                        isMe
                          ? "bg-[#FEE500] text-[#191919]"
                          : darkMode
                            ? "bg-[#3a3a3c] text-white"
                            : "bg-white text-[#191919]"
                      }`}
                      style={{ borderRadius: CHAT_BUBBLE_RADIUS, wordBreak: "keep-all" }}
                    >
                      <LinkifyText text={msg.text} onLinkClick={(kw) => {
                        if (kw.includes("뚜흐느솔로")) setPlacePopup(true);
                        else if (kw.includes("에르메스")) setProductPopup(true);
                        else if (kw.includes("어디쯤")) setLocationPopup(true);
                      }} />
                    </div>
                  )}
                  <span className={`text-[10px] flex-shrink-0 ${darkMode ? "text-gray-500" : "text-black/60"}`}>
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 입력 영역 */}
      <div className={`flex items-center gap-[10px] px-[12px] py-[8px] flex-shrink-0 ${darkMode ? "bg-[#2c2c2e]" : "bg-white"}`} style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}>
        <button type="button" className={`flex-shrink-0 w-[32px] h-[32px] rounded-full flex items-center justify-center ${darkMode ? "bg-white/[0.12]" : "bg-black/[0.06]"}`}>
          <img src="/plusIcon.svg" alt="추가" className={`w-[20px] h-[20px] ${darkMode ? "invert" : ""}`} />
        </button>
        <div className={`flex-1 flex items-center h-[36px] rounded-[18px] pl-[12px] pr-[6px] ${darkMode ? "bg-[#3a3a3c]" : "bg-[#f1f1f1]"}`}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={onInputFocus}
            onBlur={onInputBlur}
            placeholder="메시지 입력"
            className={`flex-1 outline-none bg-transparent ${darkMode ? "text-white placeholder:text-gray-500" : "text-[#191919] placeholder:text-black/50"}`}
            style={{ fontSize: "16px" }}
          />
          <button type="button" className="flex-shrink-0 ml-[4px]">
            <img src="/emojiIcon.svg" alt="이모티콘" className={`w-[23px] h-[23px] ${darkMode ? "invert" : ""}`} />
          </button>
        </div>
        <div className="flex-shrink-0 w-[32px] h-[32px]">
          {text.trim() ? (
            <button
              type="button"
              className="w-[32px] h-[32px] rounded-full bg-[#FEE500] flex items-center justify-center active:opacity-80"
              onClick={handleSend}
            >
              <svg className="w-[18px] h-[18px] text-[#191919]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          ) : (
            <button type="button" className={`w-[32px] h-[32px] rounded-full flex items-center justify-center ${darkMode ? "bg-white/[0.12]" : "bg-black/[0.06]"}`}>
              <img src="/sharpIcon.svg" alt="샵" className={`w-[20px] h-[20px] ${darkMode ? "invert" : ""}`} />
            </button>
          )}
        </div>
      </div>
      {!keyboardOpen && (
        <div className={`flex-shrink-0 flex items-end justify-center pb-2 pt-[12px] ${darkMode ? "bg-[#2c2c2e]" : "bg-white"}`}>
          <div className={`w-[134px] h-[5px] rounded-full ${darkMode ? "bg-white" : "bg-black"}`} />
        </div>
      )}

      {/* ── 상품 레이어 팝업 ── */}
      {productPopup && (
        <>
          {/* 투명 배경 터치 영역 */}
          <div
            className="absolute inset-0 z-[60]"
            onClick={() => setProductPopup(false)}
          />
          {/* 팝업 외곽 래퍼: bottom 포지셔닝 (transform 미사용 → backdrop-filter 보존) */}
          <div
            className="absolute z-[61]"
            style={POPUP_POSITION_STYLE}
          >
            <div className="relative">
              {/* 핑크 그라디언트 글로우 */}
              <div
                className="absolute inset-[-8px] rounded-[32px] overflow-hidden pointer-events-none animate-glow-breathe"
                style={{ zIndex: 0 }}
              >
                <div
                  className="absolute inset-[-100%] animate-gradient-spin"
                  style={{ background: GLOW_GRADIENT_BG }}
                />
              </div>
              {/* 카드 본체 */}
              <div
                className={`relative rounded-[30px] overflow-hidden ai-layer-blur ${darkMode ? "dark" : ""}`}
                style={{ zIndex: 1, boxShadow: cardBoxShadow(darkMode) }}
              >
            {/* 상품 이미지 + 정보 */}
            <div className="flex items-center gap-4 px-5 pt-5 pb-4">
              <div className="w-[80px] h-[80px] rounded-[12px] overflow-hidden flex-shrink-0">
                <img src="/hermes-lipbalm.png" alt="에르메스 립밤" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-semibold tracking-wide ${darkMode ? "text-gray-400" : "text-gray-400"}`}>
                  {PRODUCT_DATA.brand}
                </p>
                <p className={`text-[17px] font-bold mt-0.5 leading-snug ${darkMode ? "text-white" : "text-[#191919]"}`}>
                  {PRODUCT_DATA.name}
                </p>
              </div>
            </div>

            {/* 추천 이유 */}
            <div className={`flex items-start gap-2 px-5 pb-4 text-[13px] leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
              <img src="/voice-effect.png" alt="어시스턴트" className="w-[32px] h-[32px] rounded-full flex-shrink-0 mt-0.5 animate-flip-y" />
              <span>대화에서 언급된 에르메스 립밤이에요. 시어버터 베이스로 촉촉하게 밀착되고, 은은한 로즈 컬러가 자연스러운 혈색을 만들어줘요.</span>
            </div>

            {/* 최저가 타이틀 */}
            <p className={`px-5 pb-2 text-[13px] font-semibold ${darkMode ? "text-gray-300" : "text-[#191919]"}`}>최저가</p>

            {/* 최저가 리스트 */}
            <div className="px-2 pb-5">
              <div className="flex flex-col divide-y divide-white">
                {PRODUCT_DATA.prices.map((p) => (
                  <div
                    key={p.store}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <img src={p.icon} alt={p.store} className="w-[24px] h-[24px] rounded-full object-cover" />
                      <span className={`text-[14px] font-medium ${darkMode ? "text-gray-200" : "text-[#191919]"}`}>
                        {p.store}
                      </span>
                    </div>
                    <span className={`text-[15px] font-bold ${darkMode ? "text-white" : "text-[#191919]"}`}>
                      {p.price.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── 플레이스 정보 팝업 ── */}
      {placePopup && (
        <>
          <div
            className="absolute inset-0 z-[60]"
            onClick={() => setPlacePopup(false)}
          />
          <div
            className="absolute z-[61]"
            style={POPUP_POSITION_STYLE}
          >
            <div className="relative">
              <div
                className="absolute inset-[-8px] rounded-[32px] overflow-hidden pointer-events-none animate-glow-breathe"
                style={{ zIndex: 0 }}
              >
                <div
                  className="absolute inset-[-100%] animate-gradient-spin"
                  style={{ background: GLOW_GRADIENT_BG }}
                />
              </div>
              <div
                className={`relative rounded-[30px] overflow-hidden ai-layer-blur ${darkMode ? "dark" : ""}`}
                style={{ zIndex: 1, boxShadow: cardBoxShadow(darkMode) }}
              >
                {/* 플레이스 이미지 */}
                <div className="w-full h-[240px] overflow-hidden">
                  <img src="/cafe-exterior.jpg" alt="뚜흐느솔로" className="w-full h-full object-cover" />
                </div>

                {/* 플레이스 정보 */}
                <div className="px-5 pt-4 pb-3">
                  <p className={`text-[18px] font-bold leading-tight ${darkMode ? "text-white" : "text-[#191919]"}`}>
                    뚜흐느솔로
                  </p>
                  <div className="flex items-center gap-0.5 mt-1">
                    <span className="text-[13px] font-semibold" style={{ marginRight: 2 }}><span className="text-red-500">★</span> <span className={darkMode ? "text-white" : "text-[#191919]"}>4.7</span></span>
                    <span className={`text-[13px] ${darkMode ? "text-gray-300" : "text-[#555]"}`}>리뷰 328</span>
                    <span className={`text-[13px] ${darkMode ? "text-gray-300" : "text-[#555]"}`}>·</span>
                    <span className={`text-[13px] ${darkMode ? "text-gray-300" : "text-[#555]"}`}>카페 · 성수동2가</span>
                  </div>
                </div>

                {/* 추천 사유 */}
                <div className={`flex items-start gap-2 px-5 pb-4 text-[13px] leading-relaxed ${darkMode ? "text-gray-400" : "text-gray-700"}`}>
                  <span>서은재님과 오늘 3시에 약속한 카페예요. 성수역 3번 출구에서 도보 5분 거리에 있어요.</span>
                  <img src="/voice-effect.png" alt="어시스턴트" className="w-[32px] h-[32px] rounded-full flex-shrink-0 mt-0.5 animate-flip-y" />
                </div>

                {/* 버튼 */}
                <div className="flex px-5 gap-2 pb-5">
                  <button
                    type="button"
                    className={`flex-1 h-[40px] rounded-full text-[14px] font-semibold ${darkMode ? "bg-white/10 text-gray-300" : "bg-[rgba(0,0,0,0.10)] text-[#191919]"}`}
                    onClick={() => setPlacePopup(false)}
                  >
                    공유하기
                  </button>
                  <button
                    type="button"
                    className={`flex-1 h-[40px] rounded-full text-[14px] font-semibold ${darkMode ? "bg-white/10 text-gray-300" : "bg-[rgba(0,0,0,0.10)] text-[#191919]"}`}
                    onClick={() => setPlacePopup(false)}
                  >
                    길찾기
                  </button>
                  <button
                    type="button"
                    className={`flex-1 h-[40px] rounded-full text-[14px] font-semibold ${darkMode ? "bg-white text-black" : "bg-[#191919] text-white"}`}
                    onClick={() => setPlacePopup(false)}
                  >
                    예약하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      {/* ── 위치 공유 팝업 ── */}
      {locationPopup && (
        <>
          <div
            className="absolute inset-0 z-[60]"
            onClick={() => setLocationPopup(false)}
          />
          <div
            className="absolute z-[61]"
            style={POPUP_POSITION_STYLE}
          >
            <div className="relative">
              <div
                className="absolute inset-[-8px] rounded-[32px] overflow-hidden pointer-events-none animate-glow-breathe"
                style={{ zIndex: 0 }}
              >
                <div
                  className="absolute inset-[-100%] animate-gradient-spin"
                  style={{ background: GLOW_GRADIENT_BG }}
                />
              </div>
              <div
                className={`relative rounded-[28px] overflow-hidden backdrop-blur-[4px]`}
                style={{
                  zIndex: 1,
                  backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.9)",
                  boxShadow: cardBoxShadow(darkMode),
                }}
              >
                {/* 타이틀 + 설명 */}
                <div className="px-5 pt-8 pb-4">
                  <p className={`text-[18px] font-bold leading-tight ${darkMode ? "text-white" : "text-[#191919]"}`}>
                    기다리는 친구에게 나의 위치를 공유할까요?
                  </p>
                  <p className={`text-[15px] mt-1 leading-relaxed ${darkMode ? "text-gray-300" : "text-[#191919]"}`}>
                    약속 장소인 판교역까지 약 2km 남았어요.<br />현재 위치를 공유하고 남은 시간을 알려주세요!
                  </p>
                </div>

                {/* 카카오맵 카드 */}
                <div className="mx-5 mb-4 rounded-[16px] overflow-hidden" style={{ border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)" }}>
                  {/* 카카오맵 헤더 + 도착 정보 */}
                  <div className={`px-4 pt-3 pb-3 ${darkMode ? "bg-[#2c2c2e]" : "bg-white"}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <img src="/kakaomap-icon.png" alt="카카오맵" className="w-5 h-5 rounded-full" />
                      <span className={`text-[13px] font-medium ${darkMode ? "text-gray-300" : "text-[#191919]"}`}>카카오맵</span>
                    </div>
                    <p className={`text-[17px] font-bold ${darkMode ? "text-white" : "text-[#191919]"}`}>오전 10:15 도착</p>
                    <p className={`text-[14px] mt-1 ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>거의 다 왔어요, 조금만 서두르세요!</p>
                  </div>
                  {/* 지도 이미지 */}
                  <div className="w-full h-[180px] overflow-hidden">
                    <img src="/map-pangyo.png" alt="판교역 지도" className="w-full h-full object-cover" />
                  </div>
                </div>

                {/* 버튼 */}
                <div className="flex px-5 gap-2 pb-5">
                  <button
                    type="button"
                    className={`flex-1 h-[44px] rounded-full text-[14px] font-semibold ${darkMode ? "bg-white/10 text-gray-300" : "bg-[rgba(0,0,0,0.10)] text-[#191919]"}`}
                    onClick={() => setLocationPopup(false)}
                  >
                    카카오맵 홈
                  </button>
                  <button
                    type="button"
                    className="flex-1 h-[44px] rounded-full text-[14px] font-semibold text-[#191919]"
                    style={{ background: "#FEE500" }}
                    onClick={() => {
                      if (activeChatRoom) {
                        sendMessage(activeChatRoom.id, "📍 내 위치를 공유했어요", "/location-share-card.png");
                      }
                      setLocationPopup(false);
                    }}
                  >
                    공유하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
