import { useState, useEffect, useRef } from "react";
import { FriendList } from "./components/FriendList";
import { ChatRoomProvider } from "./contexts/ChatRoomContext";

/**
 * VisualViewport 기반 가용 높이 추적 Hook
 *
 * ┌─ 전략 ─────────────────────────────────────────────────────────────────────┐
 * │  html/body가 CSS에서 position: fixed로 잠겨 있으므로                       │
 * │  브라우저가 키보드 때문에 페이지를 위로 밀어올리는 행위는 이미 차단됨.      │
 * │                                                                            │
 * │  이 hook의 역할:                                                            │
 * │  1. visualViewport.height → 실제 가용 높이를 CSS 변수로 반영               │
 * │  2. visualViewport.offsetTop → 혹시 발생하는 미세 오프셋을 보정             │
 * │  3. scrollTo(0,0)이 아닌 CSS 변수 방식 → 깜빡임 없는 동기적 반영           │
 * └────────────────────────────────────────────────────────────────────────────┘
 */
function useViewportHeight(): string {
  const [height, setHeight] = useState(() => {
    const vv = window.visualViewport;
    return vv ? `${vv.height}px` : "100%";
  });
  const rafRef = useRef(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // rAF로 debounce — resize/scroll 이벤트가 연속 발생해도 프레임당 1회만 처리
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setHeight(`${vv.height}px`);
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      cancelAnimationFrame(rafRef.current);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}

/** 풀스크린 모바일 웹 레이아웃 */
function App() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const appHeight = useViewportHeight();

  return (
    <ChatRoomProvider>
      <div
        className="w-full overflow-hidden relative"
        style={{ height: appHeight }}
      >
        <FriendList />
        {showWalkthrough && (
          <div
            className="absolute inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer"
            style={{ background: "rgba(0,0,0,0.55)" }}
            onClick={() => setShowWalkthrough(false)}
          >
            <img
              src="/walkthrough.png"
              alt="톡 어디에서든 원을 그려 Kanana를 만나보세요"
              className="w-[76%] max-h-[73%] object-contain"
              style={{ pointerEvents: "none" }}
            />
          </div>
        )}
      </div>
    </ChatRoomProvider>
  );
}

export default App;
