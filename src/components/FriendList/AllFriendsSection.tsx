import { SquircleAvatar } from "./SquircleAvatar";

const ALL_FRIENDS = [
  { name: "다니엘",   statusMessage: "Let's have fun! 🎉",  photo: "/profile-daniel.png"   },
  { name: "김민수",   statusMessage: "밥 먹었어요 🍜",        photo: "/profile-kimminsu.png" },
  { name: "마르코",   statusMessage: "Marco Polo 🌊",        photo: "/profile-marco.png"    },
  { name: "민수",     statusMessage: "오늘도 파이팅 💪",      photo: "/profile-minsu.png"    },
  { name: "시나",     statusMessage: "행복한 하루 😊",        photo: "/profile-sina.png"     },
  { name: "이현우",   statusMessage: "운동 중 🏃",            photo: "/profile-hyunwoo.png"  },
  { name: "유나",     statusMessage: null,                   photo: "/profile-yuna.png"     },
  { name: "태형",     statusMessage: "음악 듣는 중 🎵",      photo: "/profile-taehyung.png" },
  { name: "김영지",   statusMessage: "오늘 날씨 좋다 ☀️",    photo: "/profile-yerin.png"    },
  { name: "이해수",   statusMessage: "책 읽는 중 📚",        photo: "/profile-jieun.png"    },
  { name: "강지훈",   statusMessage: "회의 중 🤝",            photo: "/profile-junhyuk.png"  },
  { name: "고성현",   statusMessage: "주말 뭐하지?",         photo: "/profile-geonho.png"  },
  { name: "박채원",   statusMessage: "기분 좋은 하루 🌸",     photo: "/profile-chaewon.png" },
  { name: "이도현",   statusMessage: "맛집 탐방 중 🍽️",      photo: "/profile-dohyun.png"   },
  { name: "서은재",   statusMessage: "여행 준비 중 ✈️",      photo: "/profile-emma.png"    },
  { name: "Nayoung",   statusMessage: "위시리스트 있어요 🎁",  photo: "/profile-ieun.png"     },
];

export function AllFriendsSection({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <section className="mb-2 mt-3">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-1.5">
        친구 {ALL_FRIENDS.length}
      </h2>
      <div>
        {ALL_FRIENDS.map((friend) => (
          <div
            key={friend.name}
            className={`flex items-center gap-3 px-5 py-2 transition-colors cursor-pointer ${darkMode ? "hover:bg-white/5 active:bg-white/10" : "hover:bg-gray-50 active:bg-gray-100"}`}
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
                <p className="text-[12.5px] text-gray-400 truncate leading-snug">
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
