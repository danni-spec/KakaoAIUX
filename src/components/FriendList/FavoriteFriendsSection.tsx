import { SquircleAvatar } from "./SquircleAvatar";

const FAVORITE_FRIENDS = [
  { name: "이재연", statusMessage: "기분 좋은 하루 🌸", photo: "/profile-chaewon.png" },
  { name: "서은재", statusMessage: null, photo: "/profile-emma.png" },
];

export function FavoriteFriendsSection({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <section className="mb-1">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-1.5">
        즐겨찾는 친구 {FAVORITE_FRIENDS.length}
      </h2>
      <div>
        {FAVORITE_FRIENDS.map((friend) => (
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
