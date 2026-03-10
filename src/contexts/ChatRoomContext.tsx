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
    lastMessage: "꺄! 조심히 와야 해~",
    lastTimestamp: Date.now() - 1000 * 60 * 5,
    unreadCount: 3,
    messages: [
      { id: "m1", sender: "이해수", text: "자기야! 오늘 저녁 7시 판교인 거 안 잊었지?", timestamp: Date.now() - 1000 * 60 * 30 },
      { id: "m2", sender: "me", text: "당연히 안 잊었지! 지금 출발하려고. 이따가 봐.", timestamp: Date.now() - 1000 * 60 * 25 },
      { id: "m3", sender: "이해수", text: "히히! 아, 근데 부탁 하나만 해도 돼? 0_0 내 방 책상 위에 그 판교 스테이크 집 할인 쿠폰 있거든? 그거 오늘까지라 꼭 챙겨와야 해!", timestamp: Date.now() - 1000 * 60 * 20 },
      { id: "m4a", sender: "me", text: "ㅋㅋㅋ 거봐, 너 또 까먹었지? 알았어. 쿠폰 챙겨갈게.", timestamp: Date.now() - 1000 * 60 * 15 },
      { id: "m5a", sender: "이해수", text: "웅 역시 👍 아, 그리고 나 오늘 회사 일이 조금 늦게 끝나서... 판교역 말고 나 우리 사무실 앞으로 데리러 오면 안 될까?", timestamp: Date.now() - 1000 * 60 * 10 },
      { id: "m6a", sender: "me", text: "에구, ㅋㅋㅋ 알았어. 쿠폰 챙기고, 사무실 앞으로 픽업 갈 게!", timestamp: Date.now() - 1000 * 60 * 7 },
      { id: "m7a", sender: "이해수", text: "꺄! 조심히 와야 해~", timestamp: Date.now() - 1000 * 60 * 5 },
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
    lastMessage: "다음 모임 일정 잡자!",
    lastTimestamp: Date.now() - 1000 * 60 * 60 * 2,
    unreadCount: 2,
    messages: [
      { id: "m10", sender: "혜선", text: "다음 주에 다 같이 만날까?", timestamp: Date.now() - 1000 * 60 * 60 * 3 },
      { id: "m11", sender: "유진", text: "좋아! 토요일 어때?", timestamp: Date.now() - 1000 * 60 * 60 * 2.5 },
      { id: "m12", sender: "나연", text: "나도 토요일 괜찮아~", timestamp: Date.now() - 1000 * 60 * 60 * 2.2 },
      { id: "m13", sender: "me", text: "저도요! 장소는 어디로?", timestamp: Date.now() - 1000 * 60 * 60 * 2.1 },
      { id: "m14", sender: "혜선", text: "다음 모임 일정 잡자!", timestamp: Date.now() - 1000 * 60 * 60 * 2 },
    ],
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
    lastMessage: "고마워 바로 송금 할게!",
    lastTimestamp: Date.now() - 1000 * 60 * 60,
    unreadCount: 1,
    messages: [
      { id: "m15", sender: "김민수", text: "어제 회식 비용 정산할게요", timestamp: Date.now() - 1000 * 60 * 90 },
      { id: "m16", sender: "강지훈", text: "1인당 25,000원이에요", timestamp: Date.now() - 1000 * 60 * 85 },
      { id: "m17", sender: "박채원", text: "넵 확인했어요!", timestamp: Date.now() - 1000 * 60 * 80 },
      { id: "m18", sender: "me", text: "고마워 바로 송금 할게!", timestamp: Date.now() - 1000 * 60 * 75 },
      { id: "m19", sender: "서은재", text: "저도 보냈어요~", timestamp: Date.now() - 1000 * 60 * 60 },
    ],
  },
];

export function ChatRoomProvider({ children }: { children: ReactNode }) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  // 첫 메시지 전송 전까지 리스트에 표시되지 않는 대기 방
  const [pendingRoom, setPendingRoom] = useState<ChatRoom | null>(null);

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

  const sendMessage = useCallback((roomId: string, text: string) => {
    const msg: ChatRoomMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sender: "me",
      text,
      timestamp: Date.now(),
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
        setChatRooms((rooms) => [promoted, ...rooms]);
        return null;
      }
      return prev;
    });

    // 이미 리스트에 있는 방이면 기존 로직
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
