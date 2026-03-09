import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { findFriendsByNames, type FriendProfile } from "../data/friends";

// ── 메시지 타입 ──
export interface ChatRoomMessage {
  id: string;
  sender: string; // "me" 또는 멤버 이름
  text: string;
  timestamp: number;
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
  sendMessage: (roomId: string, text: string) => void;
  /** 활성 채팅방 데이터 */
  activeChatRoom: ChatRoom | null;
}

const ChatRoomContext = createContext<ChatRoomContextType | null>(null);

let nextId = 1;
function genId() {
  return `room-${nextId++}-${Date.now()}`;
}

// ── 초기 채팅방 (데모) ──
const INITIAL_ROOMS: ChatRoom[] = [
  {
    id: "room-init-1",
    name: "이해수",
    members: [{ name: "이해수", photo: "/profile-jieun.png" }],
    lastMessage: "토요일에 봐요!",
    lastTimestamp: Date.now() - 1000 * 60 * 30,
    unreadCount: 3,
    messages: [
      { id: "m1", sender: "이해수", text: "이번 주 토요일에 시간 돼요?", timestamp: Date.now() - 1000 * 60 * 60 },
      { id: "m2", sender: "me", text: "네! 괜찮아요", timestamp: Date.now() - 1000 * 60 * 45 },
      { id: "m3", sender: "이해수", text: "토요일에 봐요!", timestamp: Date.now() - 1000 * 60 * 30 },
    ],
  },
  {
    id: "room-init-2",
    name: "김민수, 강지훈",
    members: [
      { name: "김민수", photo: "/profile-kimminsu.png" },
      { name: "강지훈", photo: "/profile-junhyuk.png" },
    ],
    lastMessage: "다음 주 회식 장소 정해야 해요",
    lastTimestamp: Date.now() - 1000 * 60 * 120,
    unreadCount: 12,
    messages: [
      { id: "m4", sender: "김민수", text: "다음 주 회식 어디로 할까요?", timestamp: Date.now() - 1000 * 60 * 180 },
      { id: "m5", sender: "강지훈", text: "판교 쪽 어때요?", timestamp: Date.now() - 1000 * 60 * 150 },
      { id: "m6", sender: "me", text: "좋아요 찾아볼게요", timestamp: Date.now() - 1000 * 60 * 130 },
      { id: "m7", sender: "김민수", text: "다음 주 회식 장소 정해야 해요", timestamp: Date.now() - 1000 * 60 * 120 },
    ],
  },
  {
    id: "room-init-3",
    name: "박채원",
    members: [{ name: "박채원", photo: "/profile-chaewon.png" }],
    lastMessage: "사진 보내줘~",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 3,
    unreadCount: 1,
    messages: [
      { id: "m8", sender: "박채원", text: "어제 찍은 사진 보내줘~", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
    ],
  },
  {
    id: "room-init-4",
    name: "서은재",
    members: [{ name: "서은재", photo: "/profile-emma.png" }],
    lastMessage: "여행 일정 공유해줄게!",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 5,
    unreadCount: 0,
    messages: [
      { id: "m9", sender: "서은재", text: "여행 일정 공유해줄게!", timestamp: Date.now() - 1000 * 60 * 60 * 5 },
    ],
  },
  {
    id: "room-init-5",
    name: "혜선, 유진, 나연",
    members: [
      { name: "혜선", photo: "/profile-sina.png" },
      { name: "유진", photo: "/profile-yerin.png" },
      { name: "나연", photo: "/profile-chaewon.png" },
    ],
    lastMessage: "다음 모임 일정",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: 2,
    messages: [],
  },
  {
    id: "room-init-6",
    name: "카카오 신입 동기 모임방",
    members: [
      { name: "김민수", photo: "/profile-kimminsu.png" },
      { name: "강지훈", photo: "/profile-junhyuk.png" },
      { name: "박채원", photo: "/profile-chaewon.png" },
      { name: "서은재", photo: "/profile-emma.png" },
    ],
    lastMessage: "회식 장소 투표해요",
    lastTimestamp: Date.now() - 1000 * 60 * 60,
    unreadCount: 1,
    messages: [],
  },
];

export function ChatRoomProvider({ children }: { children: ReactNode }) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);

  const openDirectChat = useCallback(
    (friendName: string): ChatRoom | null => {
      const friends = findFriendsByNames([friendName]);
      if (friends.length === 0) return null;

      const friend = friends[0];
      // 기존 1:1 방 검색
      const existing = chatRooms.find(
        (r) => r.members.length === 1 && r.members[0].name === friend.name,
      );
      if (existing) {
        setActiveChatRoomId(existing.id);
        return existing;
      }

      // 새 방 생성
      const newRoom: ChatRoom = {
        id: genId(),
        name: friend.name,
        members: [friend],
        lastMessage: "",
        lastTimestamp: Date.now(),
        unreadCount: 0,
        messages: [],
      };
      setChatRooms((prev) => [newRoom, ...prev]);
      setActiveChatRoomId(newRoom.id);
      return newRoom;
    },
    [chatRooms],
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

      const newRoom: ChatRoom = {
        id: genId(),
        name: members.map((m) => m.name).join(", "),
        members,
        lastMessage: "",
        lastTimestamp: Date.now(),
        unreadCount: 0,
        messages: [],
      };
      setChatRooms((prev) => [newRoom, ...prev]);
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
    setActiveChatRoomId(null);
  }, []);

  const sendMessage = useCallback((roomId: string, text: string) => {
    const msg: ChatRoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "me",
      text,
      timestamp: Date.now(),
    };
    setChatRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, messages: [...r.messages, msg], lastMessage: text, lastTimestamp: Date.now() }
          : r,
      ),
    );

    // 시뮬레이션: 1~2초 후 상대방 자동 응답
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
        const reply: ChatRoomMessage = {
          id: `msg-${Date.now()}-reply`,
          sender: responder.name,
          text: responses[Math.floor(Math.random() * responses.length)],
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

  const activeChatRoom = chatRooms.find((r) => r.id === activeChatRoomId) ?? null;

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
