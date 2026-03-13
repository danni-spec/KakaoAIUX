import { SquircleAvatar } from "./SquircleAvatar";
import { usePersona, type PersonaId } from "../../App";

const FRIENDS_BY_PERSONA: Record<PersonaId, { name: string; statusMessage: string | null; photo: string }[]> = {
  golf: [
    { name: "와이프 해수 ❤️", statusMessage: "오늘 기대돼 😊",     photo: "/profile-jieun.png"    },
    { name: "딸지민",     statusMessage: "아빠 기념일 축하! 🎉",   photo: "/profile-chaewon.png"  },
    { name: "준서",     statusMessage: "체력 되시나요? ㅋㅋ",     photo: "/profile-dohyun.png"   },
    { name: "김민수",   statusMessage: "내일 라운딩 기대됩니다 ⛳", photo: "/profile-kimminsu.png" },
    { name: "강지훈",   statusMessage: "분당에서 2시간이면 괜찮죠", photo: "/profile-junhyuk.png"  },
    { name: "고성현",   statusMessage: "카트 예약 완료 🏌️",     photo: "/profile-geonho.png"   },
    { name: "이과장",   statusMessage: "회의 준비 중 📋",        photo: "/profile-sina.png"     },
    { name: "박대리",   statusMessage: "Q2 KPI 정리 완료!",      photo: "/profile-yerin.png"    },
    { name: "다니엘",   statusMessage: "Let's have fun! 🎉",    photo: "/profile-daniel.png"   },
    { name: "마르코",   statusMessage: "Marco Polo 🌊",          photo: "/profile-marco.png"    },
    { name: "한소영",   statusMessage: "경쟁사 분석 중 📊",      photo: "/profile-emma.png"     },
    { name: "오재혁",   statusMessage: "회의실 12층 확인!",       photo: "/profile-junhyuk.png"  },
    { name: "태형",     statusMessage: "음악 듣는 중 🎵",        photo: "/profile-taehyung.png" },
    { name: "김영지",   statusMessage: "오늘 날씨 좋다 ☀️",      photo: "/profile-yerin.png"    },
    { name: "유나",     statusMessage: null,                     photo: "/profile-yuna.png"     },
    { name: "이현우",   statusMessage: "운동 중 🏃",              photo: "/profile-hyunwoo.png"  },
  ],
  shopping: [
    { name: "다니엘",   statusMessage: "신상 체크 중 👀",       photo: "/profile-daniel.png"   },
    { name: "서은재",   statusMessage: "오늘 뭐 살까? 🛍️",     photo: "/profile-emma.png"     },
    { name: "박채원",   statusMessage: "위시리스트 업데이트 💕", photo: "/profile-chaewon.png"  },
    { name: "이현우",   statusMessage: "운동복 세일 중 🏃",     photo: "/profile-hyunwoo.png"  },
    { name: "마르코",   statusMessage: "해외 직구 도착! 📦",    photo: "/profile-marco.png"    },
    { name: "시나",     statusMessage: "코디 추천해줘 😊",      photo: "/profile-sina.png"     },
    { name: "김민수",   statusMessage: "생일 선물 뭐가 좋을까", photo: "/profile-kimminsu.png" },
    { name: "태형",     statusMessage: "한정판 스니커즈 🔥",    photo: "/profile-taehyung.png" },
    { name: "이도현",   statusMessage: "맛집 탐방 중 🍽️",      photo: "/profile-dohyun.png"   },
    { name: "김영지",   statusMessage: "봄 옷 쇼핑 갈 사람? 🌸", photo: "/profile-yerin.png"  },
    { name: "민수",     statusMessage: "포인트 적립 완료 ✅",   photo: "/profile-minsu.png"    },
    { name: "강지훈",   statusMessage: "회의 중 🤝",            photo: "/profile-junhyuk.png"  },
    { name: "Nayoung",  statusMessage: "위시리스트 있어요 🎁",  photo: "/profile-ieun.png"     },
  ],
  appointment: [
    { name: "다니엘",   statusMessage: "오늘 모임 기대돼! 🎉",  photo: "/profile-daniel.png"   },
    { name: "마르코",   statusMessage: "장소 어디야? 📍",       photo: "/profile-marco.png"    },
    { name: "시나",     statusMessage: "오랜만에 만나자 😊",    photo: "/profile-sina.png"     },
    { name: "김민수",   statusMessage: "강남 맛집 추천 🍜",     photo: "/profile-kimminsu.png" },
    { name: "유나",     statusMessage: "오늘 저녁 갈 수 있어!",  photo: "/profile-yuna.png"     },
    { name: "태형",     statusMessage: "늦을 수도 있어 😅",     photo: "/profile-taehyung.png" },
    { name: "이현우",   statusMessage: "운동하고 갈게 🏃",      photo: "/profile-hyunwoo.png"  },
    { name: "박채원",   statusMessage: "2차 카페 가자 ☕",      photo: "/profile-chaewon.png"  },
    { name: "김영지",   statusMessage: "사진 많이 찍자 📸",     photo: "/profile-yerin.png"    },
    { name: "서은재",   statusMessage: "선약이 있어서 늦어 😢",  photo: "/profile-emma.png"     },
    { name: "민수",     statusMessage: "택시 같이 타자 🚕",     photo: "/profile-minsu.png"    },
    { name: "고성현",   statusMessage: "주말 뭐하지?",          photo: "/profile-geonho.png"   },
    { name: "이도현",   statusMessage: "맛집 리스트 보내줘 🍽️", photo: "/profile-dohyun.png"   },
    { name: "강지훈",   statusMessage: "나도 갈게! 🙋‍♂️",       photo: "/profile-junhyuk.png"  },
    { name: "Nayoung",  statusMessage: "다음에 꼭 같이 가자",   photo: "/profile-ieun.png"     },
  ],
};

export function AllFriendsSection({ darkMode = false }: { darkMode?: boolean }) {
  const persona = usePersona();
  const friends = FRIENDS_BY_PERSONA[persona.id];

  return (
    <section className="mb-2 mt-3">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-1.5">
        친구 {friends.length}
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
