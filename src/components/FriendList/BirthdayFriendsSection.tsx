import { SquircleAvatar } from "./SquircleAvatar";
import { usePersona, type PersonaId } from "../../App";

interface BirthdayFriendsSectionProps {
  darkMode?: boolean;
}

const BIRTHDAY_BY_PERSONA: Record<PersonaId, { name: string; subtitle: string; birthdayIcon: boolean; photo: string }[]> = {
  golf: [
    { name: "다니엘", subtitle: "오늘 · 이 친구의 위시리스트가 있어요", birthdayIcon: true, photo: "/profile-daniel.png" },
    { name: "마르코", subtitle: "어제 · 내게 생일 선물 준 친구", birthdayIcon: true, photo: "/profile-marco.png" },
  ],
  shopping: [
    { name: "김영지", subtitle: "오늘 · 선물 위시리스트를 확인해 보세요", birthdayIcon: true, photo: "/profile-yerin.png" },
    { name: "민수", subtitle: "내일 · 생일 선물 준비하셨나요?", birthdayIcon: true, photo: "/profile-minsu.png" },
  ],
  appointment: [
    { name: "태형", subtitle: "오늘 · 모임에서 축하해 주세요 🎂", birthdayIcon: true, photo: "/profile-taehyung.png" },
    { name: "김민수", subtitle: "어제 · 생일 축하 메시지를 보내보세요", birthdayIcon: true, photo: "/profile-kimminsu.png" },
  ],
};

export function BirthdayFriendsSection({ darkMode = false }: BirthdayFriendsSectionProps) {
  const persona = usePersona();
  const friends = BIRTHDAY_BY_PERSONA[persona.id];

  return (
    <section className="mb-5">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-3">
        생일인 친구 {friends.length}
      </h2>
      <div>
        {friends.map((friend) => (
          <div
            key={friend.name}
            className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${darkMode ? "active:bg-white/10" : "active:bg-gray-50"}`}
          >
            <SquircleAvatar
              src={friend.photo}
              alt={friend.name}
              className="w-[40px] h-[40px]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-0.5">
                <span className={`font-normal text-[16px] leading-tight ${darkMode ? "text-white" : "text-[#191919]"}`}>
                  {friend.name}
                </span>
                {friend.birthdayIcon && (
                  <img
                    src="/birthday-cake.png"
                    alt="생일"
                    className="w-[18px] h-[18px] object-contain"
                  />
                )}
              </div>
              <p className="text-[12px] text-[#767676] truncate mt-0.5 leading-tight">
                {friend.subtitle}
              </p>
            </div>
            <div className={`flex-shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-semibold ${darkMode ? "border-white/30 text-white" : "border-gray-200 text-gray-600"}`}>
              선물하기
            </div>
          </div>
        ))}

        {/* 더보기 카드 */}
        <div className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${darkMode ? "hover:bg-white/5 active:bg-white/10" : "hover:bg-gray-50 active:bg-gray-100"}`}>
          <img
            src="/giftSquircle.png"
            alt="생일 선물"
            className="w-[40px] h-[40px] object-contain flex-shrink-0"
          />
          <p className="flex-1 text-[13px] font-medium" style={{ color: darkMode ? "#ffffff" : "rgba(0,0,0,0.6)" }}>
            친구의 생일을 확인해 보세요
          </p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <span className={`text-[14px] font-bold ${darkMode ? "text-white" : "text-gray-700"}`}>6</span>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
