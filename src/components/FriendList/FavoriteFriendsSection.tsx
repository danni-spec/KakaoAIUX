import { SquircleAvatar } from "./SquircleAvatar";
import { usePersona, type PersonaId } from "../../App";

const FAVORITES_BY_PERSONA: Record<PersonaId, { name: string; statusMessage: string | null; photo: string }[]> = {
  golf: [
    { name: "와이프 해수 ❤️", statusMessage: "오늘 기대돼 😊", photo: "/profile-jieun.png" },
    { name: "딸지민", statusMessage: "아빠 기념일 축하! 🎉", photo: "/profile-chaewon.png" },
    { name: "준서", statusMessage: "체력 되시나요? ㅋㅋ", photo: "/profile-dohyun.png" },
  ],
  shopping: [
    { name: "서은재", statusMessage: "같이 쇼핑 가자! 🛍️", photo: "/profile-emma.png" },
    { name: "박채원", statusMessage: "위시리스트 공유 💕", photo: "/profile-chaewon.png" },
  ],
  appointment: [
    { name: "다니엘", statusMessage: "오늘 모임 기대돼! 🎉", photo: "/profile-daniel.png" },
    { name: "마르코", statusMessage: "장소 어디야? 📍", photo: "/profile-marco.png" },
    { name: "시나", statusMessage: "오랜만에 만나자 😊", photo: "/profile-sina.png" },
  ],
};

export function FavoriteFriendsSection({ darkMode = false }: { darkMode?: boolean }) {
  const persona = usePersona();
  const friends = FAVORITES_BY_PERSONA[persona.id];

  return (
    <section className="mb-1">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-1.5">
        즐겨찾는 친구 {friends.length}
      </h2>
      <div>
        {friends.map((friend) => (
          <div
            key={friend.name}
            className={`flex items-center gap-3 px-4 py-2 transition-colors cursor-pointer ${darkMode ? "hover:bg-white/5 active:bg-white/10" : "hover:bg-gray-50 active:bg-gray-100"}`}
          >
            <SquircleAvatar
              src={friend.photo}
              alt={friend.name}
              className="w-[40px] h-[40px]"
            />
            <div className="flex-1 min-w-0">
              <span className={`font-normal text-[16px] block leading-snug ${darkMode ? "text-white" : "text-[#191919]"}`}>
                {friend.name}
              </span>
              {friend.statusMessage && (
                <p className="text-[12.5px] text-[#767676] truncate leading-snug">
                  {friend.statusMessage}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
