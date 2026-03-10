import { useState, useEffect, useCallback } from "react";
import { FriendList } from "./components/FriendList";
import { ChatRoomProvider } from "./contexts/ChatRoomContext";

/**
 * VisualViewport 높이를 추적하여 키보드가 올라와도
 * 앱 컨테이너가 정확한 가용 높이를 유지하도록 한다.
 * 동시에 window.scrollTo(0,0)으로 브라우저가 뷰를 밀어올리는 것을 차단.
 */
function useViewportHeight() {
  const [height, setHeight] = useState<string>("100dvh");

  const update = useCallback(() => {
    const vv = window.visualViewport;
    if (vv) {
      setHeight(`${vv.height}px`);
    }
    // 브라우저가 화면을 위로 밀어올리는 것을 강제 차단
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    // 추가 안전장치: window scroll 이벤트에서도 강제 복원
    const onWindowScroll = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener("scroll", onWindowScroll, { passive: false });

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, [update]);

  return height;
}

/** 풀스크린 모바일 웹 레이아웃 */
function App() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const appHeight = useViewportHeight();

  return (
    <ChatRoomProvider>
    <div
      className="w-full overflow-hidden overflow-x-hidden relative"
      style={{ height: appHeight, maxWidth: "100%" }}
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
