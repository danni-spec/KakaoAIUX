import { useState, useRef, useEffect, useCallback } from "react";
import { useChatRooms } from "../../contexts/ChatRoomContext";
import { SquircleAvatar } from "./SquircleAvatar";
import { StatusBar } from "./StatusBar";

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

export function ChatRoomDetail({ darkMode, onOpenAI }: { darkMode: boolean; onOpenAI?: () => void }) {
  const { activeChatRoom, closeChatRoom, sendMessage } = useChatRooms();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className={`absolute inset-0 z-50 flex flex-col ${darkMode ? "bg-[#1c1c1e]" : "bg-[#abc1d1]"}`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <StatusBar darkMode={darkMode} bgColor={darkMode ? "#1c1c1e" : "#abc1d1"} />
      {/* 헤더 */}
      <div
        className={`relative flex items-center px-4 h-[56px] flex-shrink-0 ${darkMode ? "bg-[#2c2c2e]" : "bg-[#abc1d1]"}`}
      >
        <button
          type="button"
          className="p-1 z-10 -ml-[4px]"
          onClick={closeChatRoom}
        >
          <svg className={`w-6 h-6 ${darkMode ? "text-white" : "text-[#191919]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className={`text-[16px] font-semibold truncate ${darkMode ? "text-white" : "text-[#191919]"}`}>
            {activeChatRoom.name}
            {activeChatRoom.members.length > 1 && (
              <span className="text-[16px] font-semibold ml-1 text-[#6c6c6c]">
                {activeChatRoom.members.length + 1}
              </span>
            )}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 z-10">
          <svg className={`w-5 h-5 ${darkMode ? "text-gray-300" : "text-[#191919]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg className={`w-5 h-5 ${darkMode ? "text-gray-300" : "text-[#191919]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {activeChatRoom.messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className={`text-[14px] ${darkMode ? "text-gray-500" : "text-gray-600"}`}>
              대화를 시작해 보세요
            </p>
          </div>
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
              <div className={`max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
                {showAvatar && !isMe && (
                  <p className={`text-[12px] mb-1 ${darkMode ? "text-gray-300" : "text-[#555]"}`}>
                    {msg.sender}
                  </p>
                )}
                <div className={`flex items-end gap-1 ${isMe ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`rounded-[16px] px-3 py-2 text-[14px] leading-relaxed ${
                      isMe
                        ? "bg-[#FEE500] text-[#191919]"
                        : darkMode
                          ? "bg-[#3a3a3c] text-white"
                          : "bg-white text-[#191919]"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className={`text-[10px] flex-shrink-0 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {formatMessageTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 입력 영역 */}
      <div className={`flex items-center gap-2 px-3 py-2 flex-shrink-0 ${darkMode ? "bg-[#2c2c2e]" : "bg-white"}`}>
        <button type="button" className="p-1.5 flex-shrink-0">
          <svg className={`w-6 h-6 ${darkMode ? "text-gray-400" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
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
          placeholder="메시지 입력"
          className={`flex-1 text-[14px] outline-none bg-transparent ${darkMode ? "text-white placeholder:text-gray-500" : "text-[#191919] placeholder:text-gray-400"}`}
          style={{ fontSize: "16px" }}
        />
        {text.trim() && (
          <button
            type="button"
            className="w-[32px] h-[32px] rounded-full bg-[#FEE500] flex items-center justify-center flex-shrink-0 active:opacity-80"
            onClick={handleSend}
          >
            <svg className="w-4 h-4 text-[#191919]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      {/* 하단 인디케이터 바 */}
      <div className={`flex-shrink-0 flex items-end justify-center pb-2 pt-[12px] ${darkMode ? "bg-[#2c2c2e]" : "bg-white"}`}>
        <div className={`w-[134px] h-[5px] rounded-full ${darkMode ? "bg-white" : "bg-black"}`} />
      </div>
    </div>
  );
}
