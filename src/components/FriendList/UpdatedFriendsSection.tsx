import { SquircleAvatar, SquircleDiv } from "./SquircleAvatar";
import { usePersona, type PersonaId } from "../../App";

const UPDATED_BY_PERSONA: Record<PersonaId, { name: string; hasUpdate: boolean; isAd: boolean; photo: string }[]> = {
  golf: [
    { name: "와이프 해수 ❤️", hasUpdate: false, isAd: false, photo: "/profile-jieun.png" },
    { name: "딸지민", hasUpdate: false, isAd: false, photo: "/profile-chaewon.png" },
    { name: "김민수", hasUpdate: false, isAd: false, photo: "/profile-kimminsu.png" },
    { name: "Titleist", hasUpdate: true, isAd: true, photo: "/hermes.png?v=2" },
    { name: "강지훈", hasUpdate: false, isAd: false, photo: "/profile-junhyuk.png" },
    { name: "고성현", hasUpdate: false, isAd: false, photo: "/profile-geonho.png" },
    { name: "준서", hasUpdate: false, isAd: false, photo: "/profile-dohyun.png" },
    { name: "이과장", hasUpdate: false, isAd: false, photo: "/profile-sina.png" },
    { name: "박대리", hasUpdate: false, isAd: false, photo: "/profile-yerin.png" },
    { name: "태형", hasUpdate: false, isAd: false, photo: "/profile-taehyung.png" },
  ],
  shopping: [
    { name: "서은재", hasUpdate: true, isAd: false, photo: "/profile-emma.png" },
    { name: "박채원", hasUpdate: true, isAd: false, photo: "/profile-chaewon.png" },
    { name: "다니엘", hasUpdate: false, isAd: false, photo: "/profile-daniel.png" },
    { name: "ZARA", hasUpdate: true, isAd: true, photo: "/hermes.png?v=2" },
    { name: "시나", hasUpdate: false, isAd: false, photo: "/profile-sina.png" },
    { name: "김영지", hasUpdate: false, isAd: false, photo: "/profile-yerin.png" },
    { name: "태형", hasUpdate: false, isAd: false, photo: "/profile-taehyung.png" },
    { name: "Nike", hasUpdate: true, isAd: true, photo: "/profile-minsu.png" },
    { name: "이도현", hasUpdate: false, isAd: false, photo: "/profile-dohyun.png" },
    { name: "민수", hasUpdate: false, isAd: false, photo: "/profile-minsu.png" },
  ],
  appointment: [
    { name: "다니엘", hasUpdate: true, isAd: false, photo: "/profile-daniel.png" },
    { name: "마르코", hasUpdate: true, isAd: false, photo: "/profile-marco.png" },
    { name: "시나", hasUpdate: true, isAd: false, photo: "/profile-sina.png" },
    { name: "김민수", hasUpdate: false, isAd: false, photo: "/profile-kimminsu.png" },
    { name: "유나", hasUpdate: false, isAd: false, photo: "/profile-yuna.png" },
    { name: "배민1", hasUpdate: true, isAd: true, photo: "/hermes.png?v=2" },
    { name: "태형", hasUpdate: false, isAd: false, photo: "/profile-taehyung.png" },
    { name: "이현우", hasUpdate: false, isAd: false, photo: "/profile-hyunwoo.png" },
    { name: "고성현", hasUpdate: false, isAd: false, photo: "/profile-geonho.png" },
    { name: "강지훈", hasUpdate: false, isAd: false, photo: "/profile-junhyuk.png" },
  ],
};

interface UpdatedFriendsSectionProps {
  darkMode?: boolean;
  onFriendClick?: (name: string) => void;
}

export function UpdatedFriendsSection({ darkMode = false, onFriendClick }: UpdatedFriendsSectionProps) {
  const persona = usePersona();
  const friends = UPDATED_BY_PERSONA[persona.id];

  return (
    <section className="mb-5 pt-1">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-3">
        업데이트 친구 {friends.length}
      </h2>
      <div className="flex gap-3 overflow-x-auto px-4 pt-2 pb-1 scrollbar-hide">
        {friends.map((friend) => (
          <div
            key={friend.name}
            className="flex-shrink-0 flex flex-col items-center gap-1.5 cursor-pointer select-none"
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
                  className="w-[48px] h-[48px]"
                />
              ) : (
                <SquircleDiv className="w-[48px] h-[48px] bg-gray-800 flex items-center justify-center">
                  <span className="text-white font-bold text-[22px]">N</span>
                </SquircleDiv>
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
