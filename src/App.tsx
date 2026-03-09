import { useState } from "react";
import { FriendList } from "./components/FriendList";

/** iOS 393×852 비율 고정 뷰포트 — 모바일 시연용 (프레임 없음, 스크롤 시 화면 고정) */
function App() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "#0A0A0B",
      }}
    >
      {/* 393:852 비율 유지, 뷰포트에 맞게 스케일 (letterboxing) */}
      <div
        className="relative flex-1 min-h-0 w-full overflow-hidden"
        style={{
          maxWidth: "min(100vw, calc(100dvh * 393 / 852))",
          maxHeight: "min(100dvh, calc(100vw * 852 / 393))",
        }}
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
    </div>
  );
}

export default App;
