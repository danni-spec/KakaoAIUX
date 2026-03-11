import { SquircleAvatar, SquircleDiv } from "./SquircleAvatar";

const UPDATED_FRIENDS = [
  { name: "카나나알림", hasUpdate: true, isAd: false, photo: "/voice-effect.png" },
  { name: "김영지", hasUpdate: false, isAd: false, photo: "/profile-yerin.png" },
  { name: "이해수 ❤️", hasUpdate: false, isAd: false, photo: "/profile-jieun.png" },
  { name: "Hermes", hasUpdate: true, isAd: true, photo: "/hermes.png?v=2" },
  { name: "강지훈", hasUpdate: false, isAd: false, photo: "/profile-junhyuk.png" },
  { name: "고성현", hasUpdate: false, isAd: false, photo: "/profile-geonho.png" },
  { name: "박채원", hasUpdate: false, isAd: false, photo: "/profile-chaewon.png" },
  { name: "이도현", hasUpdate: false, isAd: false, photo: "/profile-dohyun.png" },
  { name: "서은재", hasUpdate: false, isAd: false, photo: "/profile-emma.png" },
  { name: "김태형", hasUpdate: false, isAd: false, photo: "/profile-taehyung.png" },
  { name: "유나",   hasUpdate: false, isAd: false, photo: "/profile-yuna.png" },
];

interface UpdatedFriendsSectionProps {
  darkMode?: boolean;
  onFriendClick?: (name: string) => void;
}

export function UpdatedFriendsSection({ darkMode = false, onFriendClick }: UpdatedFriendsSectionProps) {
  return (
    <section className="mb-5 pt-1">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-3">
        친구의 새소식 {UPDATED_FRIENDS.length}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-1 scrollbar-hide">
        {UPDATED_FRIENDS.map((friend) => (
          <div
            key={friend.name}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer select-none"
            style={friend.name === "카나나알림" ? { touchAction: "manipulation" } : undefined}
            onClick={(e) => {
              e.stopPropagation();
              onFriendClick?.(friend.name);
            }}
          >
            <div className="relative" style={{ perspective: "200px" }}>
              {friend.photo ? (
                <SquircleAvatar
                  src={friend.photo}
                  alt={friend.name}
                  className={`w-[48px] h-[48px] ${friend.name === "카나나알림" ? "animate-flip-y" : ""}`}
                  noOutline={friend.name === "카나나알림"}
                />
              ) : (
                /* 글자 플레이스홀더도 SquircleDiv로 동일한 프레임 적용 */
                <SquircleDiv className="w-[48px] h-[48px] bg-gray-800 flex items-center justify-center">
                  <span className="text-white font-bold text-[22px]">N</span>
                </SquircleDiv>
              )}
              {friend.hasUpdate && !friend.isAd && (
                <span className="absolute top-0 right-0.5 w-[11px] h-[11px] bg-red-500 rounded-full border-2 border-white" />
              )}
              {friend.isAd && (
                <span className="absolute -top-0.5 right-0 bg-white outline outline-1 outline-black/15 text-[9px] px-1 py-[2.5px] rounded-[20px] font-semibold leading-none text-black">
                  AD
                </span>
              )}
            </div>
            <span className={`text-[11.5px] font-medium truncate max-w-[64px] text-center leading-tight ${darkMode ? "text-white" : "text-[#191919]"}`}>
              {friend.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
