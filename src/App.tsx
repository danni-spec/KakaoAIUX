import { useState } from "react";
import { FriendList } from "./components/FriendList";
import { ChatRoomProvider } from "./contexts/ChatRoomContext";

function App() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);

  return (
    <ChatRoomProvider>
      <div className="w-full h-full overflow-hidden relative">
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
