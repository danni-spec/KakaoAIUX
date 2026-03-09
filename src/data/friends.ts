// ── 모든 친구 프로필 데이터 (단일 소스) ──
export interface FriendProfile {
  name: string;
  photo: string;
  statusMessage?: string | null;
}

export const ALL_FRIEND_PROFILES: FriendProfile[] = [
  { name: "다니엘", photo: "/profile-daniel.png", statusMessage: "Let's have fun! 🎉" },
  { name: "김민수", photo: "/profile-kimminsu.png", statusMessage: "밥 먹었어요 🍜" },
  { name: "마르코", photo: "/profile-marco.png", statusMessage: "Marco Polo 🌊" },
  { name: "민수", photo: "/profile-minsu.png", statusMessage: "오늘도 파이팅 💪" },
  { name: "시나", photo: "/profile-sina.png", statusMessage: "행복한 하루 😊" },
  { name: "이현우", photo: "/profile-hyunwoo.png", statusMessage: "운동 중 🏃" },
  { name: "유나", photo: "/profile-yuna.png", statusMessage: null },
  { name: "태형", photo: "/profile-taehyung.png", statusMessage: "음악 듣는 중 🎵" },
  { name: "김영지", photo: "/profile-yerin.png", statusMessage: "오늘 날씨 좋다 ☀️" },
  { name: "이해수", photo: "/profile-jieun.png", statusMessage: "책 읽는 중 📚" },
  { name: "강지훈", photo: "/profile-junhyuk.png", statusMessage: "회의 중 🤝" },
  { name: "고성현", photo: "/profile-geonho.png", statusMessage: "주말 뭐하지?" },
  { name: "박채원", photo: "/profile-chaewon.png", statusMessage: "기분 좋은 하루 🌸" },
  { name: "이도현", photo: "/profile-dohyun.png", statusMessage: "맛집 탐방 중 🍽️" },
  { name: "서은재", photo: "/profile-emma.png", statusMessage: "여행 준비 중 ✈️" },
  { name: "Nayoung", photo: "/profile-ieun.png", statusMessage: "위시리스트 있어요 🎁" },
  { name: "이재연", photo: "/profile-chaewon.png", statusMessage: "기분 좋은 하루 🌸" },
  { name: "이나영", photo: "/profile-ieun.png", statusMessage: null },
  { name: "김지훈", photo: "/profile-dohyun.png", statusMessage: null },
];

/** 이름으로 프로필 검색 (부분 매칭) */
export function findFriendByName(name: string): FriendProfile | undefined {
  const normalized = name.trim();
  return ALL_FRIEND_PROFILES.find(
    (f) => f.name === normalized || f.name.includes(normalized) || normalized.includes(f.name),
  );
}

/** 여러 이름에서 프로필 매칭 */
export function findFriendsByNames(names: string[]): FriendProfile[] {
  return names
    .map((n) => findFriendByName(n))
    .filter((f): f is FriendProfile => f !== undefined);
}
