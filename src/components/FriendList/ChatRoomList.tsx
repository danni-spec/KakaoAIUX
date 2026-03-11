import { useState } from "react";
import { useChatRooms } from "../../contexts/ChatRoomContext";
import { SquircleAvatar, SquircleDiv } from "./SquircleAvatar";
import { ChipBar } from "./ChipBar";
import type { ChipItem } from "./ChipBar";
import { HeaderIconBar } from "./HeaderIconBar";
import type { HeaderIcon } from "./HeaderIconBar";

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

const CHAT_HEADER_ICONS: HeaderIcon[] = [
  { src: "/searchIcon.svg", label: "검색" },
  { src: "/newChatIcon.svg", label: "새채팅" },
  { src: "/settingIcon.svg", label: "설정" },
];

const CHAT_CHIPS: ChipItem[] = [
  { id: "all", label: "전체" },
  {
    id: "unread",
    label: "안읽음",
    inactiveIcon: <img src="/chattabIcoFolder.svg" alt="" className="w-[18px] h-[18px]" />,
  },
  { id: "chatgpt", label: "ChatGPT" },
  {
    id: "add",
    label: "",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
];

export function ChatRoomList({ darkMode }: { darkMode: boolean }) {
  const { chatRooms, openChatRoom } = useChatRooms();
  const [selectedChip, setSelectedChip] = useState("all");

  return (
    <div className="pb-28">
      {/* 헤더 — 친구탭 GNB와 동일한 h-[56px] */}
      <div className="px-4 h-[56px] flex items-center justify-between">
        <h2 className={`text-[22px] font-bold ${darkMode ? "text-white" : "text-[#191919]"}`}>
          채팅
        </h2>
        <HeaderIconBar icons={CHAT_HEADER_ICONS} darkMode={darkMode} />
      </div>

      <ChipBar chips={CHAT_CHIPS} activeId={selectedChip} onChange={setSelectedChip} darkMode={darkMode} />

      {/* 채팅방 리스트 */}
      <div>
        {(selectedChip === "unread" ? chatRooms.filter((r) => r.unreadCount > 0) : chatRooms).map((room) => (
          <button
            key={room.id}
            type="button"
            className={`w-full flex items-center gap-3 px-4 py-[10px] text-left transition-colors active:bg-black/5 ${darkMode ? "active:bg-white/5" : ""}`}
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
                  <div className="grid grid-cols-2 gap-[2px] place-items-center w-full h-full">
                    {room.members.slice(0, 4).map((member) => (
                      <SquircleAvatar
                        key={member.name}
                        src={member.photo}
                        alt={member.name}
                        className="w-[23px] h-[23px]"
                        noOutline
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className={`text-[15px] font-semibold truncate flex items-center gap-1.5 ${darkMode ? "text-white" : "text-[#191919]"}`}>
                  {room.id === "room-my" && (
                    <span className="flex-shrink-0 w-[15px] h-[15px] rounded-full bg-black text-white flex items-center justify-center">
                      <span className="badge-na">나</span>
                    </span>
                  )}
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
