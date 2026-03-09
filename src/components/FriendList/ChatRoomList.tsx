import { useState } from "react";
import { useChatRooms } from "../../contexts/ChatRoomContext";
import { SquircleAvatar, SquircleDiv } from "./SquircleAvatar";

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 1000 * 60) return "방금";
  if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}분 전`;
  if (diff < 1000 * 60 * 60 * 24) {
    const d = new Date(ts);
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h >= 12 ? "오후" : "오전"} ${h > 12 ? h - 12 : h}:${m}`;
  }
  return "어제";
}

type ChipId = "all" | "unread" | "chatgpt" | "add";

export function ChatRoomList({ darkMode }: { darkMode: boolean }) {
  const { chatRooms, openChatRoom } = useChatRooms();
  const [selectedChip, setSelectedChip] = useState<ChipId>("all");

  return (
    <div className="pb-28">
      {/* 헤더 */}
      <div className="px-4 pt-1 pb-3">
        <h2 className={`text-[22px] font-bold ${darkMode ? "text-white" : "text-[#191919]"}`}>
          채팅
        </h2>
      </div>

      {/* 칩: 친구탭과 동일한 스타일 */}
      <div className={`flex gap-2 px-4 pb-3 pt-[5px] overflow-x-auto scrollbar-hide transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
        {(["all", "unread", "chatgpt"] as ChipId[]).map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setSelectedChip(chip)}
            className={`flex-shrink-0 px-[17px] h-[36px] rounded-full font-semibold text-[14px] outline outline-1 transition-colors duration-200 ${
              selectedChip === chip
                ? darkMode ? "bg-white text-black outline-transparent" : "bg-black text-white outline-transparent"
                : darkMode ? "bg-[#2c2c2e] text-gray-300 outline-[#3a3a3c]" : "bg-white text-black outline-gray-200 hover:bg-gray-50"
            }`}
          >
            {chip === "all" ? "전체" : chip === "unread" ? "안읽음" : "ChatGPT"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedChip("add")}
          className={`flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center outline outline-1 transition-colors duration-200 ${
            selectedChip === "add"
              ? darkMode ? "bg-white text-black outline-transparent" : "bg-black text-white outline-transparent"
              : darkMode ? "bg-[#2c2c2e] text-gray-300 outline-[#3a3a3c]" : "bg-white text-black outline-gray-200 hover:bg-gray-50"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* 채팅방 리스트 */}
      <div>
        {chatRooms.map((room) => (
          <button
            key={room.id}
            type="button"
            className={`w-full flex items-center gap-3 px-5 py-[10px] text-left transition-colors active:bg-black/5 ${darkMode ? "active:bg-white/5" : ""}`}
            onClick={() => openChatRoom(room.id)}
          >
            {/* 아바타: 친구탭과 동일하게 SquircleAvatar(mask-image) 적용 */}
            {room.members.length === 1 ? (
              <SquircleAvatar
                src={room.members[0].photo}
                alt={room.members[0].name}
                className="w-[50px] h-[50px] flex-shrink-0"
              />
            ) : (
              <div className="relative w-[50px] h-[50px] flex-shrink-0">
                {room.members.length === 2 && (
                  <>
                    <SquircleDiv className={`absolute top-0 left-0 w-[34px] h-[34px] flex items-center justify-center ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
                      <SquircleAvatar
                        src={room.members[0].photo}
                        alt={room.members[0].name}
                        className="w-[30px] h-[30px]"
                      />
                    </SquircleDiv>
                    <SquircleDiv className={`absolute bottom-0 right-0 w-[34px] h-[34px] flex items-center justify-center ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
                      <SquircleAvatar
                        src={room.members[1].photo}
                        alt={room.members[1].name}
                        className="w-[30px] h-[30px]"
                      />
                    </SquircleDiv>
                  </>
                )}
                {room.members.length === 3 && (
                  <>
                    <SquircleDiv className={`absolute top-0 left-1/2 -translate-x-1/2 w-[28px] h-[28px] flex items-center justify-center z-[2] ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
                      <SquircleAvatar
                        src={room.members[0].photo}
                        alt={room.members[0].name}
                        className="w-[24px] h-[24px]"
                      />
                    </SquircleDiv>
                    <SquircleDiv className={`absolute bottom-0 left-[1px] w-[28px] h-[28px] flex items-center justify-center z-[1] ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
                      <SquircleAvatar
                        src={room.members[1].photo}
                        alt={room.members[1].name}
                        className="w-[24px] h-[24px]"
                      />
                    </SquircleDiv>
                    <SquircleDiv className={`absolute bottom-0 right-[1px] w-[28px] h-[28px] flex items-center justify-center z-[1] ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
                      <SquircleAvatar
                        src={room.members[2].photo}
                        alt={room.members[2].name}
                        className="w-[24px] h-[24px]"
                      />
                    </SquircleDiv>
                  </>
                )}
                {room.members.length >= 4 && (
                  <>
                    <SquircleAvatar
                      src={room.members[0].photo}
                      alt={room.members[0].name}
                      className="absolute top-[1px] left-[1px] w-[23px] h-[23px]"
                    />
                    <SquircleAvatar
                      src={room.members[1].photo}
                      alt={room.members[1].name}
                      className="absolute top-[1px] right-[1px] w-[23px] h-[23px]"
                    />
                    <SquircleAvatar
                      src={room.members[2].photo}
                      alt={room.members[2].name}
                      className="absolute bottom-[1px] left-[1px] w-[23px] h-[23px]"
                    />
                    <SquircleAvatar
                      src={room.members[3].photo}
                      alt={room.members[3].name}
                      className="absolute bottom-[1px] right-[1px] w-[23px] h-[23px]"
                    />
                  </>
                )}
              </div>
            )}

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-[15px] font-semibold truncate ${darkMode ? "text-white" : "text-[#191919]"}`}>
                  {room.name}
                  {room.members.length > 1 && (
                    <span className="text-[15px] font-semibold ml-1 text-[#6c6c6c]">
                      {room.members.length + 1}
                    </span>
                  )}
                </p>
                <span className={`text-[12px] flex-shrink-0 ml-2 ${darkMode ? "text-gray-500" : "text-gray-400"}`}>
                  {room.lastTimestamp ? formatTime(room.lastTimestamp) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`text-[14px] truncate ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {room.lastMessage || "대화를 시작해 보세요"}
                </p>
                {room.unreadCount > 0 && (
                  <span className="flex-shrink-0 ml-2 min-w-[20px] h-[20px] rounded-full bg-[#FF3B30] text-white text-[11px] font-bold flex items-center justify-center px-1.5">
                    {room.unreadCount > 99 ? "99+" : room.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
