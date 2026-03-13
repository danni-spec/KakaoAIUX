import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { findFriendsByNames, type FriendProfile } from "../data/friends";
import { usePersona } from "../App";

// ── 메시지 타입 ──
export interface ChatRoomMessage {
  id: string;
  sender: string; // "me" 또는 멤버 이름
  text: string;
  timestamp: number;
  image?: string; // 이미지 URL (옵션)
  voice?: { duration: number; sttText: string }; // 음성 메시지 (옵션)
}

// ── 채팅방 타입 ──
export interface ChatRoom {
  id: string;
  name: string; // 참여 멤버 이름 조합 (예: "김민수", "김민수, 이해수")
  members: FriendProfile[];
  lastMessage: string;
  lastTimestamp: number;
  unreadCount: number;
  messages: ChatRoomMessage[];
}

// ── Context 타입 ──
interface ChatRoomContextType {
  chatRooms: ChatRoom[];
  activeChatRoomId: string | null;
  /** 1:1 채팅 — 이미 있으면 기존 방 반환 */
  openDirectChat: (friendName: string) => ChatRoom | null;
  /** 그룹 채팅 생성 */
  createGroupChat: (memberNames: string[]) => ChatRoom | null;
  /** 채팅방 열기 */
  openChatRoom: (roomId: string) => void;
  /** 채팅방 닫기 (목록으로) */
  closeChatRoom: () => void;
  /** 메시지 전송 */
  sendMessage: (roomId: string, text: string, image?: string, voice?: { duration: number; sttText: string }) => void;
  /** 전체 읽음 처리 */
  markAllRead: () => void;
  /** 활성 채팅방 데이터 */
  activeChatRoom: ChatRoom | null;
}

const ChatRoomContext = createContext<ChatRoomContextType | null>(null);

let nextId = 1;
function genId() {
  return `room-${nextId++}-${Date.now()}`;
}

// ── 초기 채팅방 (페르소나별) ──
const GOLF_ROOMS: ChatRoom[] = [
  {
    id: "room-my",
    name: "나와의 채팅방",
    members: [{ name: "나", photo: "/profile-kimbujan.png" }],
    lastMessage: "기념일 선물 조말론 향수 주문 완료 ✅",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: 0,
    messages: [
      { id: "m0", sender: "me", text: "오늘 할 일: 새벽 골프 → 오후 미팅 → 저녁 기념일 디너", timestamp: Date.now() - 1000 * 60 * 60 * 10 },
      { id: "m0b", sender: "me", text: "기념일 선물 조말론 향수 주문 완료 ✅", timestamp: Date.now() - 1000 * 60 * 60 * 2 },
    ],
  },
  {
    id: "room-init-1",
    name: "와이프 해수 ❤️",
    members: [{ name: "와이프 해수", photo: "/profile-jieun.png" }],
    lastMessage: "자기야 오늘 늦지 말고 챙겨오라는거 잊지말고 챙겨와",
    lastTimestamp: Date.now() - 1000 * 60 * 5,
    unreadCount: 3,
    messages: [
      { id: "m1", sender: "와이프 해수", text: "자기야 오늘 무슨 날인지 알지? 😏", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m2", sender: "me", text: "ㅎㅎ 당연하지! 우리 결혼기념일!", timestamp: Date.now() - 1000 * 60 * 55 },
      { id: "m3", sender: "와이프 해수", text: "오 기억하고 있었네? 감동이야 ㅋㅋ 근데 오늘 새벽에 골프 간다며?", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m4a", sender: "me", text: "응 라비에벨 CC. 저녁 전에 꼭 돌아올게! 7시 판교 스시이도 어때?", timestamp: Date.now() - 1000 * 60 * 45 },
      { id: "m5a", sender: "와이프 해수", text: "자기야 오늘 늦지 말고 챙겨오라는거 잊지말고 챙겨와", timestamp: Date.now() - 1000 * 60 * 5 },
    ],
  },
  {
    id: "room-init-2",
    name: "골프패밀리 ⛳",
    members: [
      { name: "김민수", photo: "/profile-kimminsu.png" },
      { name: "강지훈", photo: "/profile-junhyuk.png" },
      { name: "고성현", photo: "/profile-geonho.png" },
    ],
    lastMessage: "김부장님 오늘 기념일이래 ㅋㅋ 일찍 보내드려야겠다",
    lastTimestamp: Date.now() - 1000 * 60 * 10,
    unreadCount: 8,
    messages: [
      { id: "m4", sender: "김민수", text: "내일 라비에벨 새벽 6시 맞죠?", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
      { id: "m5", sender: "강지훈", text: "네! 저 4시 출발할게요 분당에서 2시간 넘게 걸리더라고요", timestamp: Date.now() - 1000 * 60 * 60 * 2.8 },
      { id: "m6", sender: "고성현", text: "카트 예약은 제가 해뒀습니다", timestamp: Date.now() - 1000 * 60 * 60 * 2.5 },
      { id: "m7", sender: "me", text: "오늘 결혼기념일이라 저녁 전에 복귀해야 해서 18홀 끝나면 바로 빠질게", timestamp: Date.now() - 1000 * 60 * 60 * 2 },
      { id: "m8", sender: "김민수", text: "오 축하드려요 부장님! 몇 주년이에요?", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m9", sender: "me", text: "25주년 ㅎㅎ 은혼식이래", timestamp: Date.now() - 1000 * 60 * 25 },
      { id: "m10", sender: "강지훈", text: "와 대단하시다 축하합니다!", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m11", sender: "고성현", text: "김부장님 오늘 기념일이래 ㅋㅋ 일찍 보내드려야겠다", timestamp: Date.now() - 1000 * 60 * 10 },
    ],
  },
  {
    id: "room-init-3",
    name: "마케팅 1팀",
    members: [
      { name: "이과장", photo: "/profile-sina.png" },
      { name: "박대리", photo: "/profile-yerin.png" },
      { name: "김민수", photo: "/profile-kimminsu.png" },
      { name: "강지훈", photo: "/profile-junhyuk.png" },
      { name: "한소영", photo: "/profile-emma.png" },
      { name: "오재혁", photo: "/profile-junhyuk.png" },
    ],
    lastMessage: "오후 3시 회의실 12층 확인했습니다",
    lastTimestamp: Date.now() - 1000 * 60 * 25,
    unreadCount: 12,
    messages: [
      { id: "m10a", sender: "이과장", text: "오후 3시 AI 전략 리뷰 회의 리마인드입니다. 지난 회의록 다시 확인해주세요", timestamp: Date.now() - 1000 * 60 * 120 },
      { id: "m10b", sender: "박대리", text: "Q2 KPI 중간점검 자료 공유드렸어요. 슬랙에서 확인 부탁드립니다", timestamp: Date.now() - 1000 * 60 * 100 },
      { id: "m10c", sender: "강지훈", text: "신규 서비스 로드맵 초안 정리했습니다. 피드백 주시면 반영하겠습니다", timestamp: Date.now() - 1000 * 60 * 90 },
      { id: "m10d", sender: "한소영", text: "경쟁사 벤치마킹 보고서도 같이 논의하면 좋겠습니다", timestamp: Date.now() - 1000 * 60 * 80 },
      { id: "m10e", sender: "me", text: "좋아요 다 준비해주세요. 나는 골프 끝나고 바로 복귀합니다", timestamp: Date.now() - 1000 * 60 * 70 },
      { id: "m10f", sender: "이과장", text: "네 부장님 ㅎㅎ 좋은 스코어 기대하겠습니다", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m10g", sender: "오재혁", text: "오후 3시 회의실 12층 확인했습니다", timestamp: Date.now() - 1000 * 60 * 25 },
    ],
  },
  {
    id: "room-init-4",
    name: "딸 지민",
    members: [{ name: "딸지민", photo: "/profile-chaewon.png" }],
    lastMessage: "엄마랑 분좋카도 그래 엄마 그런데 좋아해!!",
    lastTimestamp: Date.now() - 1000 * 60 * 15,
    unreadCount: 2,
    messages: [
      { id: "m9a", sender: "딸지민", text: "아빠!! 오늘 엄마아빠 결혼기념일이지?", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m9b", sender: "me", text: "그렇지 ㅎㅎ 아빠가 저녁에 엄마랑 외식하기로 했어", timestamp: Date.now() - 1000 * 60 * 55 },
      { id: "m9c", sender: "딸지민", text: "오 어디가? 선물은?", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m9d", sender: "me", text: "판교 스시이도! 선물은 비밀 ㅎㅎ", timestamp: Date.now() - 1000 * 60 * 45 },
      { id: "m9e", sender: "딸지민", text: "ㅋㅋㅋ 아빠 센스 좋다~ 엄마 좋아하겠다", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m9f", sender: "딸지민", text: "아빠 엄마 기념일 축하해!! 🎉🎂", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m9g", sender: "딸지민", text: "엄마랑 분좋카도 그래 엄마 그런데 좋아해!!", timestamp: Date.now() - 1000 * 60 * 15 },
    ],
  },
  {
    id: "room-init-5",
    name: "아들 준서",
    members: [{ name: "준서", photo: "/profile-dohyun.png" }],
    lastMessage: "ㅋㅋ 아빠 오늘 골프치고 기념일이면 체력 되시나요?",
    lastTimestamp: Date.now() - 1000 * 60 * 8,
    unreadCount: 1,
    messages: [
      { id: "m15", sender: "준서", text: "아빠 오늘 결혼기념일 축하해요!", timestamp: Date.now() - 1000 * 60 * 40 },
      { id: "m16", sender: "me", text: "고맙다 아들! 엄마랑 저녁 먹으러 나갈 거야", timestamp: Date.now() - 1000 * 60 * 35 },
      { id: "m17", sender: "준서", text: "ㅋㅋ 아빠 오늘 골프치고 기념일이면 체력 되시나요?", timestamp: Date.now() - 1000 * 60 * 8 },
    ],
  },
];

const SHOPPING_ROOMS: ChatRoom[] = [
  {
    id: "room-my",
    name: "나와의 채팅방",
    members: [{ name: "나", photo: "/profile-yuna.png" }],
    lastMessage: "위시리스트 메모 📝",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: 0,
    messages: [
      { id: "m0", sender: "me", text: "위시리스트 메모 📝", timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    ],
  },
  {
    id: "room-init-1",
    name: "서은재",
    members: [{ name: "서은재", photo: "/profile-emma.png" }],
    lastMessage: "어디쯤이야? 나 거의 다 왔어!",
    lastTimestamp: Date.now() - 1000 * 60 * 3,
    unreadCount: 2,
    messages: [
      { id: "m1", sender: "서은재", text: "이번 주 토요일에 만날까?", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m2", sender: "me", text: "좋아! 어디서 볼까?", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m3", sender: "서은재", text: "성수동 뚜흐느솔로 가자! 요즘 거기 핫하더라", timestamp: Date.now() - 1000 * 60 * 10 },
      { id: "m4", sender: "me", text: "오 좋다! 성수동으로 하자", timestamp: Date.now() - 1000 * 60 * 5 },
      { id: "m5", sender: "서은재", text: "어디쯤이야? 나 거의 다 왔어!", timestamp: Date.now() - 1000 * 60 * 3 },
    ],
  },
  {
    id: "room-init-2",
    name: "박채원",
    members: [{ name: "박채원", photo: "/profile-chaewon.png" }],
    lastMessage: "에르메스 립밤 어때?",
    lastTimestamp: Date.now() - 1000 * 60 * 25,
    unreadCount: 1,
    messages: [
      { id: "m5", sender: "박채원", text: "루이비통 신상 가방 봤어?", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m6", sender: "me", text: "응! 가격이 좀 부담스러워 ㅠ", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m7", sender: "박채원", text: "에르메스 립밤 어때?", timestamp: Date.now() - 1000 * 60 * 25 },
    ],
  },
  {
    id: "room-init-3",
    name: "쇼핑메이트",
    members: [
      { name: "서은재", photo: "/profile-emma.png" },
      { name: "박채원", photo: "/profile-chaewon.png" },
      { name: "김영지", photo: "/profile-yerin.png" },
    ],
    lastMessage: "Charlotte 토요일 몇 시에 올 수 있어?",
    lastTimestamp: Date.now() - 1000 * 60 * 3,
    unreadCount: 20,
    messages: [
      { id: "m8", sender: "김영지", text: "여주 아울렛 세일 시작했대!", timestamp: Date.now() - 1000 * 60 * 120 },
      { id: "m8b", sender: "서은재", text: "대박! 나이키 팩토리 50%라던데", timestamp: Date.now() - 1000 * 60 * 115 },
      { id: "m8c", sender: "박채원", text: "이번 주 토요일 아울렛 갈 사람?", timestamp: Date.now() - 1000 * 60 * 110 },
      { id: "m8d", sender: "김영지", text: "나 갈래! 뉴발란스도 세일한대", timestamp: Date.now() - 1000 * 60 * 105 },
      { id: "m8e", sender: "서은재", text: "나도 가야지 ㅋㅋ 지갑 열릴 준비 완료", timestamp: Date.now() - 1000 * 60 * 100 },
      { id: "m8f", sender: "박채원", text: "근데 여주 말고 파주도 괜찮지 않아?", timestamp: Date.now() - 1000 * 60 * 90 },
      { id: "m8g", sender: "김영지", text: "파주는 저번에 갔잖아~ 여주가 브랜드 더 많아", timestamp: Date.now() - 1000 * 60 * 85 },
      { id: "m8h", sender: "서은재", text: "맞아 여주 가자! 코치랑 마이클코어스도 있잖아", timestamp: Date.now() - 1000 * 60 * 80 },
      { id: "m8i", sender: "박채원", text: "오키 여주로 확정~ 차는 누가 가져와?", timestamp: Date.now() - 1000 * 60 * 70 },
      { id: "m8j", sender: "김영지", text: "내가 운전할게! 10시에 강남역 출발 어때?", timestamp: Date.now() - 1000 * 60 * 65 },
      { id: "m8k", sender: "서은재", text: "좋아 근데 10시 너무 이르지 않아? ㅋㅋ", timestamp: Date.now() - 1000 * 60 * 55 },
      { id: "m8l", sender: "박채원", text: "일찍 가야 사람 없어~ 세일 첫날이라 줄 길 수도", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m8m", sender: "김영지", text: "ㅇㅇ 오픈런 각이지", timestamp: Date.now() - 1000 * 60 * 45 },
      { id: "m8n", sender: "서은재", text: "알겠어 10시 ㅋㅋ 근데 나 가방 하나 사야 하는데 추천 좀", timestamp: Date.now() - 1000 * 60 * 40 },
      { id: "m8o", sender: "박채원", text: "코치 태비 백 요즘 핫하던데? 아울렛이면 30만원대일 듯", timestamp: Date.now() - 1000 * 60 * 35 },
      { id: "m8p", sender: "김영지", text: "오 그거 예쁘더라! 나도 봐야지", timestamp: Date.now() - 1000 * 60 * 28 },
      { id: "m8q", sender: "서은재", text: "점심은 거기 근처 맛집 가자 저번에 갔던 파스타집!", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m8r", sender: "박채원", text: "아 그 트러플 파스타 맛있었지 ㅋㅋ 예약할까?", timestamp: Date.now() - 1000 * 60 * 15 },
      { id: "m8s", sender: "김영지", text: "ㅇㅇ 예약 ㄱㄱ 12시 반쯤?", timestamp: Date.now() - 1000 * 60 * 8 },
      { id: "m8t", sender: "서은재", text: "Charlotte 토요일 몇 시에 올 수 있어?", timestamp: Date.now() - 1000 * 60 * 3 },
    ],
  },
  {
    id: "room-init-4",
    name: "다니엘",
    members: [{ name: "다니엘", photo: "/profile-daniel.png" }],
    lastMessage: "고마워! 선물 잘 받았어 🎁",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: 0,
    messages: [
      { id: "m11", sender: "me", text: "생일 선물 보냈어!", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
      { id: "m12", sender: "다니엘", text: "고마워! 선물 잘 받았어 🎁", timestamp: Date.now() - 1000 * 60 * 60 * 2 },
    ],
  },
  {
    id: "room-init-5",
    name: "마케팅 1팀",
    members: [
      { name: "혜선", photo: "/profile-sina.png" },
      { name: "유진", photo: "/profile-yerin.png" },
      { name: "나연", photo: "/profile-chaewon.png" },
      { name: "김민수", photo: "/profile-kimminsu.png" },
    ],
    lastMessage: "Charlotte 님 수고했어요. 내일 오전까지 최종본 부탁합니다",
    lastTimestamp: Date.now() - 1000 * 60 * 8,
    unreadCount: 5,
    messages: [
      { id: "m13", sender: "혜선", text: "3월 신규 캠페인 브리프 공유드려요. 타겟은 2030 여성이고 SNS 중심으로 진행할 예정입니다", timestamp: Date.now() - 1000 * 60 * 120 },
      { id: "m14", sender: "김민수", text: "Charlotte 님 인플루언서 콜라보 건 예산안 정리 부탁드려요", timestamp: Date.now() - 1000 * 60 * 90 },
      { id: "m14b", sender: "me", text: "넵! 오늘 중으로 정리해서 공유드리겠습니다!", timestamp: Date.now() - 1000 * 60 * 85 },
      { id: "m14c", sender: "유진", text: "3월 캠페인 소재 시안 공유드립니다. A안은 감성 위주, B안은 할인 강조입니다", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m14d", sender: "김민수", text: "B안이 낫겠네요. 근데 카피 톤이 좀 딱딱해요. Charlotte 님이 좀 더 친근하게 다듬어볼 수 있을까요?", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m14e", sender: "me", text: "앗 넵 부장님! 제가 카피 수정해서 다시 올리겠습니다 ㅎㅎ", timestamp: Date.now() - 1000 * 60 * 45 },
      { id: "m14f", sender: "나연", text: "다음 주 팝업스토어 협업 브랜드 리스트 보내드렸어요. 확인 부탁드립니다!", timestamp: Date.now() - 1000 * 60 * 35 },
      { id: "m14g", sender: "me", text: "카피 수정안 올렸습니다! '이번 봄, 나만의 스타일을 찾아보세요' 이런 느낌 어떨까요?", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m14h", sender: "혜선", text: "오 좋다! 이 방향으로 가죠", timestamp: Date.now() - 1000 * 60 * 15 },
      { id: "m14i", sender: "김민수", text: "Charlotte 님 수고했어요. 내일 오전까지 최종본 부탁합니다", timestamp: Date.now() - 1000 * 60 * 8 },
    ],
  },
];

const APPOINTMENT_ROOMS: ChatRoom[] = [
  {
    id: "room-my",
    name: "나와의 채팅방",
    members: [{ name: "나", photo: "/profile-ieun.png" }],
    lastMessage: "오늘 저녁 약속 잊지 말기!",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 24,
    unreadCount: 0,
    messages: [
      { id: "m0", sender: "me", text: "오늘 저녁 약속 잊지 말기!", timestamp: Date.now() - 1000 * 60 * 60 * 24 },
    ],
  },
  {
    id: "room-init-1",
    name: "대학동기 모임",
    members: [
      { name: "다니엘", photo: "/profile-daniel.png" },
      { name: "마르코", photo: "/profile-marco.png" },
      { name: "시나", photo: "/profile-sina.png" },
      { name: "김민수", photo: "/profile-kimminsu.png" },
    ],
    lastMessage: "그래서 어디로 할까?",
    lastTimestamp: Date.now() - 1000 * 60 * 3,
    unreadCount: 15,
    messages: [
      { id: "m1", sender: "다니엘", text: "오늘 저녁 7시 다들 올 수 있지?", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m2", sender: "마르코", text: "당연하지! 장소 어디야?", timestamp: Date.now() - 1000 * 60 * 50 },
      { id: "m3", sender: "시나", text: "강남역 근처면 좋겠다", timestamp: Date.now() - 1000 * 60 * 40 },
      { id: "m4", sender: "김민수", text: "강남역 근처 맛집 몇 개 찾아봤어", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m5", sender: "다니엘", text: "그래서 어디로 할까?", timestamp: Date.now() - 1000 * 60 * 3 },
    ],
  },
  {
    id: "room-init-2",
    name: "다니엘",
    members: [{ name: "다니엘", photo: "/profile-daniel.png" }],
    lastMessage: "오늘 내가 한턱 쏠게!",
    lastTimestamp: Date.now() - 1000 * 60 * 10,
    unreadCount: 1,
    messages: [
      { id: "m6", sender: "다니엘", text: "해수야 오늘 모임 기대된다!", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m7", sender: "me", text: "나도! 오랜만이라 설레", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m8", sender: "다니엘", text: "오늘 내가 한턱 쏠게!", timestamp: Date.now() - 1000 * 60 * 10 },
    ],
  },
  {
    id: "room-init-3",
    name: "유나",
    members: [{ name: "유나", photo: "/profile-yuna.png" }],
    lastMessage: "나도 오늘 갈 수 있을 것 같아!",
    lastTimestamp: Date.now() - 1000 * 60 * 8,
    unreadCount: 3,
    messages: [
      { id: "m9", sender: "me", text: "오늘 동기 모임 오지?", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m10", sender: "유나", text: "아 오늘이었어? 일정 확인해볼게", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m11", sender: "유나", text: "나도 오늘 갈 수 있을 것 같아!", timestamp: Date.now() - 1000 * 60 * 8 },
    ],
  },
  {
    id: "room-init-4",
    name: "마르코",
    members: [{ name: "마르코", photo: "/profile-marco.png" }],
    lastMessage: "택시 같이 타고 갈까?",
    lastTimestamp: Date.now() - 1000 * 60 * 5,
    unreadCount: 2,
    messages: [
      { id: "m12", sender: "마르코", text: "해수야 오늘 어디서 출발해?", timestamp: Date.now() - 1000 * 60 * 15 },
      { id: "m13", sender: "me", text: "분당에서 출발해!", timestamp: Date.now() - 1000 * 60 * 10 },
      { id: "m14", sender: "마르코", text: "택시 같이 타고 갈까?", timestamp: Date.now() - 1000 * 60 * 5 },
    ],
  },
  {
    id: "room-init-5",
    name: "회사 팀방",
    members: [
      { name: "강지훈", photo: "/profile-junhyuk.png" },
      { name: "고성현", photo: "/profile-geonho.png" },
      { name: "이현우", photo: "/profile-hyunwoo.png" },
    ],
    lastMessage: "내일 오전 스탠드업 미팅 잊지 마세요",
    lastTimestamp: Date.now() - 1000 * 60 * 60,
    unreadCount: 5,
    messages: [
      { id: "m15", sender: "강지훈", text: "오늘 회의록 정리해서 올릴게요", timestamp: Date.now() - 1000 * 60 * 120 },
      { id: "m16", sender: "고성현", text: "내일 오전 스탠드업 미팅 잊지 마세요", timestamp: Date.now() - 1000 * 60 * 60 },
    ],
  },
];

function getRoomsByPersona(personaId: string): ChatRoom[] {
  if (personaId === "shopping") return SHOPPING_ROOMS;
  if (personaId === "appointment") return APPOINTMENT_ROOMS;
  return GOLF_ROOMS;
}

export function ChatRoomProvider({ children }: { children: ReactNode }) {
  const persona = usePersona();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(() => getRoomsByPersona(persona.id));
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  // 첫 메시지 전송 전까지 리스트에 표시되지 않는 대기 방
  const [pendingRoom, setPendingRoom] = useState<ChatRoom | null>(null);

  const openDirectChat = useCallback(
    (friendName: string): ChatRoom | null => {
      const nameClean = friendName.trim();

      // 이름 매칭 헬퍼
      const nameMatch = (memberName: string, roomName: string, target: string) =>
        memberName === target ||
        memberName.includes(target) ||
        target.includes(memberName) ||
        roomName.includes(target) ||
        target.includes(roomName.replace(/\s*[❤️⛳🎉💕]+\s*/g, "").trim());

      // 1) 원래 입력 이름으로 기존 방 먼저 검색 (별칭/닉네임 대응)
      const existingByInput = chatRooms.find(
        (r) => r.members.length === 1 && nameMatch(r.members[0].name, r.name, nameClean),
      );
      if (existingByInput) {
        setActiveChatRoomId(existingByInput.id);
        return existingByInput;
      }

      // 2) 프로필 DB에서 매칭
      const friends = findFriendsByNames([friendName]);
      if (friends.length === 0) return null;

      const friend = friends[0];
      // 프로필 이름으로 기존 방 검색
      const existing = chatRooms.find(
        (r) => r.members.length === 1 && nameMatch(r.members[0].name, r.name, friend.name),
      );
      if (existing) {
        setActiveChatRoomId(existing.id);
        return existing;
      }

      // 3) 이미 pending 방이 같은 멤버면 재사용
      if (pendingRoom && pendingRoom.members.length === 1 &&
          nameMatch(pendingRoom.members[0].name, pendingRoom.name, friend.name)) {
        setActiveChatRoomId(pendingRoom.id);
        return pendingRoom;
      }

      // 새 방 생성 (pending — 리스트에 아직 추가하지 않음)
      const newRoom: ChatRoom = {
        id: genId(),
        name: friend.name,
        members: [friend],
        lastMessage: "",
        lastTimestamp: Date.now(),
        unreadCount: 0,
        messages: [],
      };
      setPendingRoom(newRoom);
      setActiveChatRoomId(newRoom.id);
      return newRoom;
    },
    [chatRooms, pendingRoom],
  );

  const createGroupChat = useCallback(
    (memberNames: string[]): ChatRoom | null => {
      const members = findFriendsByNames(memberNames);
      if (members.length < 2) return null;

      const sortedNames = members.map((m) => m.name).sort();
      // 기존 그룹방 검색 (멤버 조합이 동일)
      const existing = chatRooms.find((r) => {
        if (r.members.length !== members.length) return false;
        const rNames = r.members.map((m) => m.name).sort();
        return rNames.every((n, i) => n === sortedNames[i]);
      });
      if (existing) {
        setActiveChatRoomId(existing.id);
        return existing;
      }

      // 새 방 생성 (pending — 리스트에 아직 추가하지 않음)
      const newRoom: ChatRoom = {
        id: genId(),
        name: members.map((m) => m.name).join(", "),
        members,
        lastMessage: "",
        lastTimestamp: Date.now(),
        unreadCount: 0,
        messages: [],
      };
      setPendingRoom(newRoom);
      setActiveChatRoomId(newRoom.id);
      return newRoom;
    },
    [chatRooms],
  );

  const openChatRoom = useCallback((roomId: string) => {
    setActiveChatRoomId(roomId);
    // 읽음 처리
    setChatRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)),
    );
  }, []);

  const closeChatRoom = useCallback(() => {
    // pending 방에서 메시지 없이 나가면 폐기
    setPendingRoom((prev) => {
      if (prev && prev.id === activeChatRoomId && prev.messages.length === 0) {
        return null;
      }
      return prev;
    });
    setActiveChatRoomId(null);
  }, [activeChatRoomId]);

  const sendMessage = useCallback((roomId: string, text: string, image?: string, voice?: { duration: number; sttText: string }) => {
    const msg: ChatRoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "me",
      text,
      timestamp: Date.now(),
      ...(image ? { image } : {}),
      ...(voice ? { voice } : {}),
    };

    // pending 방이면 첫 메시지와 함께 리스트에 추가
    setPendingRoom((prev) => {
      if (prev && prev.id === roomId) {
        const promoted = {
          ...prev,
          messages: [msg],
          lastMessage: text,
          lastTimestamp: Date.now(),
        };
        setChatRooms((rooms) => {
          // 중복 방지: 이미 같은 ID가 있으면 추가하지 않음
          if (rooms.some((r) => r.id === promoted.id)) return rooms;
          return [promoted, ...rooms];
        });
        return null;
      }
      return prev;
    });

    // 이미 리스트에 있는 방이면 기존 로직 (중복 메시지 방지)
    setChatRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        // pending에서 방금 승격된 방이면 이미 msg 포함됨 — 중복 추가 방지
        if (r.messages.some((m) => m.id === msg.id)) return r;
        return { ...r, messages: [...r.messages, msg], lastMessage: text, lastTimestamp: Date.now() };
      }),
    );

    // 시뮬레이션: 1~2초 후 상대방 자동 응답 (나와의 채팅방 제외)
    if (roomId === "room-my") return;

    setTimeout(() => {
      setChatRooms((prev) => {
        const room = prev.find((r) => r.id === roomId);
        if (!room || room.members.length === 0) return prev;
        const responder = room.members[Math.floor(Math.random() * room.members.length)];
        const responses = [
          "네 알겠어요!",
          "ㅋㅋㅋ 좋아요",
          "오 그래요?",
          "잠시만요~",
          "확인했어요 👍",
          "나중에 얘기해요!",
          "재밌겠다 ㅎㅎ",
          "헐 대박",
        ];
        const replyText = image ? "오키 이따봐~" : responses[Math.floor(Math.random() * responses.length)];
        const reply: ChatRoomMessage = {
          id: `msg-${Date.now()}-reply`,
          sender: responder.name,
          text: replyText,
          timestamp: Date.now(),
        };
        return prev.map((r) =>
          r.id === roomId
            ? { ...r, messages: [...r.messages, reply], lastMessage: reply.text, lastTimestamp: Date.now() }
            : r,
        );
      });
    }, 1000 + Math.random() * 1500);
  }, []);

  const markAllRead = useCallback(() => {
    setChatRooms((prev) => prev.map((r) => ({ ...r, unreadCount: 0 })));
  }, []);

  // activeChatRoom: 리스트 또는 pending 방에서 찾기
  const activeChatRoom =
    chatRooms.find((r) => r.id === activeChatRoomId)
    ?? (pendingRoom && pendingRoom.id === activeChatRoomId ? pendingRoom : null);

  return (
    <ChatRoomContext.Provider
      value={{
        chatRooms,
        activeChatRoomId,
        openDirectChat,
        createGroupChat,
        openChatRoom,
        closeChatRoom,
        sendMessage,
        markAllRead,
        activeChatRoom,
      }}
    >
      {children}
    </ChatRoomContext.Provider>
  );
}

export function useChatRooms() {
  const ctx = useContext(ChatRoomContext);
  if (!ctx) throw new Error("useChatRooms must be used within ChatRoomProvider");
  return ctx;
}
