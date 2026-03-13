import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { SquircleAvatar } from "./SquircleAvatar";
import { IOSKeyboard } from "./IOSKeyboard";
import { usePersona, type PersonaId } from "../../App";
import CircleToSearchOverlay from "./CircleToSearchOverlay";
import {
  AI_SENT_BUBBLE_CLASS,
  AI_SENT_BUBBLE_STYLE,
  AI_RECEIVED_BUBBLE_CLASS,
  AI_RECEIVED_BUBBLE_STYLE,
} from "../../constants/chat";

// ── 채팅 메시지 타입 ──
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
  image?: string;
}

// ── AI 응답 함수 (나중에 OpenAI API로 교체 가능) ──
// API 연동 시 이 함수만 교체하면 됩니다:
//   const OPENAI_API_KEY = "sk-...";
//   async function getAIResponse(userMessage: string, _history: ChatMessage[]): Promise<string> {
//     const res = await fetch("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
//       body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: userMessage }] }),
//     });
//     const data = await res.json();
//     return data.choices[0].message.content;
//   }
// ── Intent Classification ──
type Intent = "briefing" | "fact-check" | "summary" | "next-reply" | "general";

function classifyIntent(message: string): Intent {
  const m = message.toLowerCase();
  // 다음 답장 추천
  if (/뭐라고\s*할까|뭐라\s*할까|다음에\s*뭐|뭐라고할까|뭐라할까/.test(m)) return "next-reply";
  // 브리핑/저널 요청
  if (/브리핑|저널|오늘\s*하루|모닝|일정\s*정리|일정\s*알려|오늘\s*뭐\s*해|오늘\s*뭐\s*있|하루\s*요약/.test(m)) return "briefing";
  // 사실 확인 (누가/뭐/언제/어디 + "~가 뭐야" 패턴)
  if (/누가.+했|누가.+보냈|마지막\s*대화|마지막\s*메시지|언제.+했|뭐라고\s*했|뭐라\s*했|어디서|몇\s*시에|결혼기념일|생일이?\s*언제|약속이?\s*언제|회의\s*언제|.+(?:가|이)\s*뭐야|.+(?:가|이)\s*뭐예요|.+(?:가|이)\s*뭔가요/.test(m)) return "fact-check";
  // 요약 요청
  if (/요약|정리해|알려줘.*내용|뭐라고.*했|무슨\s*얘기|무슨\s*대화|대화\s*내용/.test(m)) return "summary";
  return "general";
}

// ── 브리핑/저널 데이터를 텍스트로 추출 (persona별) ──
function getBriefingText(personaId: string): string {
  if (personaId === "golf") return [
    "골프 라운딩 일정: 오늘 아침 6시 춘천 라비에벨 CC 골프 약속. 분당에서 약 2시간 소요, 4시 출발 필요.",
    "날씨: 춘천 현재 16도, 최고 16도, 최저 4도. 바람막이 필수.",
    "복장 추천: 기능성 바람막이 + 얇은 기모 이너 조합. 라운딩 후 기온 상승하니 레이어드 추천.",
    "오후 미팅: 오후 3시 AI 전략 리뷰 미팅, 본관 12층 대회의실, 참석자 7명.",
    "결혼기념일: 오늘 25주년 결혼기념일. 오후 5시까지 복귀 필요. 판교 스시이도 7시 예약 가능.",
    "기념일 선물: 해수님이 조말론 우드 세이지 앤 씨 솔트 향수 자주 언급. 카카오쇼핑 최저가 152,000원.",
  ].join("\n");
  if (personaId === "shopping") return [
    "쇼핑 추천: 관심 등록한 나이키 에어맥스 97이 15% 할인 중, 오늘 자정까지 한정 세일.",
    "날씨: 서울 22도, 최고 22도, 최저 13도. 가벼운 외투면 충분.",
    "스타일 추천: 오늘 날씨에 맞는 봄 데일리룩 코디 준비됨.",
    "선물 리마인더: 다음 주 친구 생일. 위시리스트 아이템으로 선물 준비 가능.",
    "배송 현황: 어제 주문한 무신사 패키지 배송 중, 오후 3시 도착 예정.",
  ].join("\n");
  return [
    "저녁 약속: 오늘 저녁 7시 강남역 근처 대학 동기 모임. 장소 미정.",
    "날씨: 서울 19도, 최고 19도, 최저 11도. 저녁엔 쌀쌀하니 겉옷 필요.",
    "약속 준비: 모임 장소 후보 3곳을 대학동기 단톡방에 투표로 공유 가능.",
    "교통 안내: 분당에서 강남역까지 약 40분 소요, 6시 20분 출발 추천.",
    "모임 알림: 대학동기 단톡방에 확인 메시지 전송 가능.",
  ].join("\n");
}

function getJournalText(personaId: string): string {
  if (personaId === "golf") return [
    "라운딩 스코어 기록: 라비에벨 CC 라운딩 스코어 기록 가능. 지난달 대비 퍼팅 성공률 상승 중.",
    "함께한 멤버: 골프패밀리 멤버들과 라운딩 사진 앨범 정리 가능.",
    "기념일 저녁 준비: 판교 스시이도 7시 예약 확정, 조말론 향수 선물 포장 완료.",
    "다음 라운딩: 골프패밀리 멤버들 다음 주말 라운딩 희망. 일정 투표 가능.",
    "하루 요약: 새벽 라운딩 → 오후 미팅 → 저녁 결혼기념일 디너.",
  ].join("\n");
  if (personaId === "shopping") return [
    "오늘의 쇼핑 리뷰: 오늘 구경한 아이템들 정리, 관심 목록 추가 가능.",
    "가격 변동 알림: 찜해둔 상품 3개 가격 변동됨.",
    "스타일 기록: 마음에 든 코디 저장, 스타일북 생성 가능.",
    "포인트 현황: 카카오페이 포인트 2,350원 보유.",
  ].join("\n");
  return [
    "모임 후기: 대학 동기 모임 후기 작성 가능.",
    "사진 정리: 모임 사진 앨범 정리 후 단톡방 공유 가능.",
    "감사 인사: 모임 준비한 친구에게 감사 인사 전달 가능.",
    "다음 약속: 다음 모임 일정 투표 생성 가능.",
    "맛집 기록: 방문한 식당 카카오맵 리뷰 남기기 가능.",
  ].join("\n");
}

// ── Intent별 시스템 프롬프트 생성 ──
function buildSystemPrompt(intent: Intent, chatContext: string, briefingText: string, journalText: string): string {
  const base = `[기본 규칙]
너는 카카오톡 AI 어시스턴트다. 친절한 존댓말로 답변해.
- 카카오톡 메시지처럼 짧고 명확한 구어체(존댓말).
- TTS용: 특수문자, 이모지, 기호 사용 금지. 문장을 짧게 끊어.`;

  if (intent === "briefing") {
    return `${base}

[역할] 오늘의 브리핑을 아래 순서대로 구어체로 전달해.
1. 반드시 "좋은 아침입니다 부장님!"으로 시작
2. 가장 중요한 일정을 한 문장으로
3. 나머지 일정을 시간순으로 짧게 나열
- 데이터에 있는 제목과 핵심 내용만 리스트업.

[오늘의 브리핑 데이터]
${briefingText}

[오늘의 저널 데이터]
${journalText}
${chatContext}`;
  }

  if (intent === "fact-check") {
    return `${base}

[역할] 질문에 해당하는 사실을 아래 데이터에서 찾아 답변해.
- 데이터에 관련 내용이 있으면: 해당 정보를 바탕으로 친절하게 답변.
- 데이터에 관련 내용이 없으면: 절대 "기록이 없습니다"라고 하지 말고, 너의 기본 지식을 활용하여 답변해.
- 채팅 내역 참조 시: 해당 키워드 포함된 메시지를 발췌하여 전달.

[오늘의 브리핑 데이터]
${briefingText}

[오늘의 저널 데이터]
${journalText}
${chatContext}`;
  }

  if (intent === "next-reply") {
    return `${base}

[역할] 현재 열린 채팅방의 대화 흐름을 분석하여, 사용자가 다음에 보내면 좋을 자연스러운 답장 메시지 1개를 추천해.
- 대화 맥락(주제, 분위기, 상대방의 마지막 메시지)을 고려해서 자연스러운 답장을 만들어.
- 반드시 이 포맷으로 추천 메시지를 포함해: 💬 "추천 메시지 내용"
- 추천 메시지 앞에 왜 이 답장이 좋은지 한 줄로 간단히 설명해.
- 추천 메시지는 실제 카톡 대화처럼 자연스러운 반말/존댓말(대화 분위기에 맞게).
${chatContext}`;
  }

  if (intent === "summary") {
    return `${base}

[역할] 요청된 대화/상황을 데이터에서 발췌하여 친절한 형식으로 요약해.
- 2~3문장 이내로 압축. 전체 나열 금지.
- 누가 무엇을 했는지 주체를 명확히.
- 일정/약속/장소/시간은 데이터 원문 그대로 추출.

[오늘의 브리핑 데이터]
${briefingText}

[오늘의 저널 데이터]
${journalText}
${chatContext}`;
  }

  // general — 채팅 기록에 없어도 LLM 지식으로 답변
  return `${base}

[역할] 질문에 친절하게 답변해.
- 아래 데이터에 관련 내용이 있으면 데이터를 바탕으로 답변.
- 데이터에 관련 내용이 없으면: 절대 "기록이 없습니다"라고 하지 말고, 너의 기본 지식을 활용하여 자연스럽게 답변해.
- 일반 상식, 날씨, 요리법, 검색성 질문 등 자유롭게 답변 가능.

[오늘의 브리핑 데이터]
${briefingText}

[오늘의 저널 데이터]
${journalText}
${chatContext}`;
}

async function getAIResponse(
  userMessage: string,
  _history: ChatMessage[],
  chatRoomMessages?: { sender: string; text: string }[],
  allChatRooms?: { name: string; unreadCount: number; lastMessage: string; messages?: { sender: string; text: string }[] }[],
  personaId: string = "golf",
): Promise<string> {

  const lower = userMessage.toLowerCase();

  // ── 브리핑 프리셋 (고정 텍스트 — 환각 방지) ──
  if (personaId === "golf" && /브리핑/.test(lower)) {
    return `오늘 브리핑 드리겠습니다.\n먼저 오전 일정입니다. 오늘 오전 6시 춘천 라비에벨 CC에서 골프 라운딩 예정입니다. 정자동 댁에서 이동 시 약 한 시간 반 정도 소요되어 새벽 4시쯤 출발하시면 무리 없을 것 같습니다. 현재 춘천 기온은 6도에 약한 바람이 있어 라운딩 시 바람막이와 가벼운 이너 착장을 추천드립니다.\n다음 오후 일정입니다. 오후 3시 아지트 A동 9층 라이언 회의실에서 AI 전략 리뷰 미팅이 예정되어 있습니다. 회의 자료는 카카오 캔버스에 미리 정리해 두었습니다.\n이상입니다, 안전하게 다녀오시기 바랍니다.`;
  }

  // ── 기능 실행용 프리셋 (UI 안내만 필요한 것) ──
  if (lower.includes("읽음처리") || lower.includes("읽음 처리")) {
    const unreadRooms = (allChatRooms || []).filter(r => r.unreadCount > 0);
    const totalUnread = unreadRooms.reduce((sum, r) => sum + r.unreadCount, 0);
    if (unreadRooms.length > 0) {
      return `${unreadRooms.length}개 채팅방의 안읽은 메시지 ${totalUnread}건을 모두 읽음 처리했어요!\n${unreadRooms.map(r => `${r.name} ${r.unreadCount}건`).join(", ")}`;
    }
    return "안읽은 메시지가 없어요! 모두 확인된 상태입니다.";
  }
  if (lower.includes("채팅방 만들") || lower.includes("채팅방만들") || lower.includes("톡방 만들") || lower.includes("대화방 만들")) {
    return "누구랑 만들지 알려줘! 예: 민수랑 채팅방 만들어줘";
  }
  if (/결혼\s*기념일|결혼/.test(lower)) {
    return `결혼기념일 준비는 평소 자주 가시는 판교 스시이도 예약 가능 여부를 확인 중입니다.\n선물 관련해서는 사모님께서 대화에서 종종 언급하신 반클리프 브레이슬릿 플럼 블로썸이 확인되는데, 현재 약 사백육십육만 원 정도이며 카카오 선물하기에서도 주문 가능합니다.\n[btn:예약 확인][btn:주문하기]`;
  }
  if (/분조카|분좋카/.test(lower)) {
    return `분좋카는 '분위기 좋은 카페'의 줄임말이에요. 딸 지민이가 대화에서 사용한 신조어입니다!`;
  }
  if (/챙겨\s*오|챙겨\s*가|챙겨오래|뭐\s*챙겨|챙기래|챙겨갈\s*게/.test(lower)) {
    return `오늘 오전 10시 15분 대화 기억하시죠? 사모님이 '서재 책상 위에 있는 스시이도 20% 할인 쿠폰 꼭 챙겨와'라고 하셨어요. 오늘 결혼 25주년 기념일이라 예약하신 곳이잖아요!\n예약하신 식당 바로 옆에 '블루보틀' 있는 거 아시죠? 지금 부장님 톡채널 확인해 보니까 블루보틀 10% 할인 쿠폰이 들어있네요. 식사 후에 '당신 좋아하는 커피 쿠폰 챙겨왔어, 잠깐 들르자'라고 하시면 센스 대폭발이죠!\n쿠폰은 지금 바로 블루보틀 톡채널로 보내드릴게요.`;
  }
  if (/오후\s*미팅|미팅\s*준비/.test(lower)) {
    return `오후 3시에 아지트 A동 12층 라이언 회의실에서 AI 전략 리뷰 미팅이 예정되어 있습니다. 회의록과 KPI 자료는 카카오 캔버스에 미리 정리해 두었습니다.`;
  }

  // ── Intent 분류 → 맞춤 프롬프트로 OpenAI API 호출 ──
  const intent = classifyIntent(userMessage);
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (apiKey) {
    // 채팅 컨텍스트 구성
    let chatContext = "";
    if (intent === "next-reply" && chatRoomMessages && chatRoomMessages.length > 0) {
      // next-reply: 현재 열린 채팅방 대화를 우선 참조
      chatContext = "\n\n[현재 열린 채팅방 대화]\n" + chatRoomMessages.slice(-20).map(m =>
        `${m.sender === "me" ? "나" : m.sender}: ${m.text}`
      ).join("\n");
    } else if (allChatRooms && allChatRooms.length > 0) {
      if (intent === "fact-check" || intent === "summary") {
        // 키워드 관련 메시지만 발췌 (최대 20개)
        const keywords = userMessage.replace(/[?？은는이가을를에서의도]+/g, "").split(/\s+/).filter(w => w.length >= 2);
        const relevant: string[] = [];
        for (const room of allChatRooms) {
          const matched = (room.messages || []).filter(m =>
            keywords.some(kw => m.text.includes(kw) || m.sender.includes(kw))
          );
          if (matched.length > 0) {
            relevant.push(`[${room.name}]\n` + matched.slice(-10).map(m =>
              `  ${m.sender === "me" ? "나(김부장)" : m.sender}: ${m.text}`
            ).join("\n"));
          }
        }
        if (relevant.length > 0) {
          chatContext = "\n\n[관련 채팅 내역]\n" + relevant.join("\n\n");
        } else {
          // 키워드 매칭 실패 시 최근 대화로 폴백
          chatContext = "\n\n[최근 채팅 데이터]\n" + allChatRooms.slice(0, 5).map(room => {
            const msgs = room.messages?.slice(-5).map(m =>
              `  ${m.sender === "me" ? "나(김부장)" : m.sender}: ${m.text}`
            ).join("\n") || "";
            return `[${room.name}] (안읽은 ${room.unreadCount}건)\n${msgs}`;
          }).join("\n\n");
        }
      } else {
        // briefing / general → 채팅방별 최근 메시지 5개로 제한 (속도 향상)
        chatContext = "\n\n[카카오톡 채팅방 데이터]\n" + allChatRooms.map(room => {
          const msgs = room.messages?.slice(-5).map(m =>
            `  ${m.sender === "me" ? "나(김부장)" : m.sender}: ${m.text}`
          ).join("\n") || "";
          return `[${room.name}] (안읽은 ${room.unreadCount}건)\n${msgs}`;
        }).join("\n\n");
      }
    } else if (chatRoomMessages && chatRoomMessages.length > 0) {
      chatContext = "\n\n[현재 열린 채팅방 대화]\n" + chatRoomMessages.slice(-15).map(m =>
        `${m.sender === "me" ? "나(김부장)" : m.sender}: ${m.text}`
      ).join("\n");
    }

    const briefingText = getBriefingText(personaId);
    const journalText = getJournalText(personaId);
    const systemPrompt = buildSystemPrompt(intent, chatContext, briefingText, journalText);

    // intent별 토큰/온도 조정 (낮은 temperature로 환각 억제, 짧은 토큰으로 빠른 응답)
    const maxTokens = intent === "briefing" ? 250 : intent === "next-reply" ? 150 : intent === "summary" ? 200 : intent === "fact-check" ? 200 : 200;
    const temperature = intent === "next-reply" ? 0.7 : 0.15;

    try {
      console.log("[GPT] calling API, intent:", intent, "msg:", userMessage.slice(0, 50));
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature,
        }),
      });
      console.log("[GPT] response status:", res.status);
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        console.log("[GPT] content:", content?.slice(0, 80));
        if (content) return content;
      } else {
        const errText = await res.text();
        console.error("[GPT] API error response:", res.status, errText.slice(0, 200));
      }
    } catch (err) {
      console.error("[GPT API error]", err);
    }
  }

  return "좋은 질문이에요! 조금 더 자세히 말씀해주시면 더 잘 도와드릴 수 있어요.";
}


// Web Speech API 타입
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event & { error: string }) => void) | null;
};

function createRecognition(): SpeechRecognitionInstance | null {
  const SR = (window as never as Record<string, new () => SpeechRecognitionInstance>).SpeechRecognition
    ?? (window as never as Record<string, new () => SpeechRecognitionInstance>).webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "ko-KR";
  r.continuous = true;
  r.interimResults = true;
  return r;
}

export type SuggestContext = "friend" | "chat-list" | "chat-room" | "chat-room-new";

interface AILayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  darkMode: boolean;
  onDarkModeToggle: (value: boolean) => void;
  onCreateChatRoom?: (memberNames: string[], initialMessage?: string) => void;
  suggestContext?: SuggestContext;
  chatPartnerName?: string; // 1:1 채팅방 상대 이름 (서제스트 개인화용)
  chatProductSuggestions?: string[]; // 채팅방 내 추천 상품 (서제스트 칩 3번째부터 삽입)
  chatRoomMessages?: { sender: string; text: string }[]; // 현재 채팅방 메시지 (대화 요약용)
  onSendReply?: (text: string) => void; // 추천 답장을 채팅방에 전송
  onSendToMyChat?: (text: string, voice?: { duration: number; sttText: string }) => void; // 나와의 채팅방에 메시지 전송
  allChatRooms?: { name: string; unreadCount: number; lastMessage: string; messages?: { sender: string; text: string }[] }[]; // 전체 채팅방
  onMarkAllRead?: () => void; // 전체 읽음처리
  showNotificationList?: boolean; // 알림 아이콘 클릭 시 알림 리스트 뷰 표시
  onNotificationListClose?: () => void; // 알림 리스트 닫을 때 호출
  onChipPlaceClick?: () => void; // "성수동 뚜흐느솔로" 칩 클릭 시 장소 레이어로 연결
  onMinimizedChange?: (minimized: boolean) => void; // 플로팅 최소화 상태 변경 콜백
}

// 맥락별 추천 칩 (페르소나별 분기 포함)
const GOLF_FRIEND_SUGGESTIONS = [
  "오늘의 브리핑",
  "오후 미팅 준비",
  "결혼기념일 준비 상황",
  "반클리프 주문해줘",
  "라비에벨 CC 가는 길",
];

// OpenAI API로 김부장 시나리오에 맞는 추천 칩 생성 (대화방 내용 참조)
async function generateGolfSuggestions(
  allChatRooms?: { name: string; unreadCount: number; lastMessage: string; messages?: { sender: string; text: string }[] }[],
): Promise<string[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return GOLF_FRIEND_SUGGESTIONS;

  // 대화방 요약 생성
  let chatSummary = "";
  if (allChatRooms && allChatRooms.length > 0) {
    chatSummary = "\n\n[카카오톡 대화방 내용]\n" + allChatRooms.map(room => {
      const msgs = room.messages?.slice(-6).map(m => `  ${m.sender === "me" ? "김부장" : m.sender}: ${m.text}`).join("\n") || "";
      return `📌 ${room.name} (안읽은 메시지 ${room.unreadCount}건)\n${msgs}`;
    }).join("\n\n");
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `너는 카카오톡 AI 어시스턴트 '카나나'야. 사용자 '김부장'의 대화방 내용을 분석해서, 지금 당장 필요하거나 도움이 될 추천 질문 5개를 만들어줘.

대화 내용에서 파악한 맥락을 기반으로 실질적으로 유용한 제안을 해야 해. 예를 들어:
- 안읽은 메시지가 많은 대화방 → 요약이나 답장 제안
- 약속이 언급됐으면 → 장소/시간/준비물 관련 제안
- 누군가 질문을 했으면 → 답장 도움 제안
- 할 일이 언급됐으면 → 리마인더/체크리스트 제안
${chatSummary}

규칙:
- 대화 내용에 근거한 구체적인 제안 (일반적인 질문 X)
- 반말/존댓말 자연스럽게 (예: "~해줘", "~알려줘", "~어때?")
- 각 18자 이내로 짧게
- AI가 먼저 센스있게 제안하는 느낌
- JSON string 배열로만 응답 (다른 텍스트 없이)`,
          },
          { role: "user", content: "지금 김부장에게 필요한 추천 질문 5개" },
        ],
        max_tokens: 250,
        temperature: 0.8,
      }),
    });
    if (!res.ok) return GOLF_FRIEND_SUGGESTIONS;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return GOLF_FRIEND_SUGGESTIONS;
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length >= 3) return parsed.slice(0, 5);
    return GOLF_FRIEND_SUGGESTIONS;
  } catch {
    return GOLF_FRIEND_SUGGESTIONS;
  }
}

const SUGGESTIONS_BY_CONTEXT: Record<SuggestContext, string[]> = {
  friend: [
    "다크모드 켜줘",
    "오후 미팅 준비",
    "생일 친구 선물 추천",
    "판교역 가는 길",
  ],
  "chat-list": [
    "새 채팅방 만들어줘",
    "안읽은 대화 전체 요약해줘",
    "안읽은 메시지 읽음처리하기",
    "다크모드 켜줘",
  ],
  "chat-room": [
    "대화 요약해줘",
    "다음에 뭐라고할까?",
    "우리 둘 궁합은??",
    "판교역 맛집 추천",
  ],
  "chat-room-new": [
    "첫 인사말 추천해줘",
    "분위기 맞는 이모티콘 추천",
    "오늘 일정 공유해줘",
  ],
};

function getSuggestionsForContext(ctx: SuggestContext, chatPartnerName?: string, chatProductSuggestions?: string[], personaId?: PersonaId, aiGenerated?: string[] | null): string[] {
  // 김부장 페르소나: AI 생성 칩 우선, 없으면 기본 칩
  if (personaId === "golf" && ctx === "friend") return aiGenerated ?? GOLF_FRIEND_SUGGESTIONS;
  const base = SUGGESTIONS_BY_CONTEXT[ctx];
  // chatProductSuggestions 우선 적용 (채팅방 맥락별 맞춤 칩) — 두 버튼을 칩 제일 앞으로
  if (chatProductSuggestions && chatProductSuggestions.length > 0 && (ctx === "chat-room" || ctx === "chat-room-new")) {
    const rest = base.filter((s) => !s.includes("궁합")).slice(0, chatPartnerName ? 2 : 1);
    return [...chatProductSuggestions, ...rest];
  }
  if (ctx === "chat-room-new" && !chatPartnerName) {
    return base;
  }
  if (ctx === "chat-room" && !chatPartnerName) {
    return base.filter((s) => !s.includes("궁합")).map((s) => (s.includes("이해수에게") ? "답장해줘" : s));
  }
  return base;
}

// ── 자동완성 후보 (입력 텍스트 기반 알약 추천) ──
const AUTOCOMPLETE_CANDIDATES = [
  "오늘의 브리핑",
  "오후 미팅 준비",
  "결혼기념일 준비 상황",
  "반클리프 주문해줘",
  "라비에벨 CC 가는 길",
  "챙겨갈 게 뭐야",
  "분좋카가 뭐야",
  "읽음처리 해줘",
  "다크모드 켜줘",
  "해수에게 메시지 보내줘",
  "딸지민에게 메시지 보내줘",
  "채팅방 만들어줘",
  "대화 요약해줘",
  "오늘 날씨 어때",
  "근처 맛집 추천해줘",
];

function getAutocompleteSuggestions(input: string): string[] {
  if (!input || input.length < 1) return [];
  const lower = input.toLowerCase();
  return AUTOCOMPLETE_CANDIDATES
    .filter(c => c.toLowerCase().includes(lower) && c.toLowerCase() !== lower)
    .slice(0, 6);
}

// 음성 명령어 → 액션 매핑
const VOICE_COMMANDS: { keywords: string[]; action: string }[] = [
  { keywords: ["다크모드", "다크 모드", "어두운 모드"], action: "darkmode" },
  { keywords: ["대화 요약", "메시지 요약", "요약해"], action: "chat-summary" },
  { keywords: ["메시지 보내", "문자 보내", "메시지 전송"], action: "message" },
  { keywords: ["전화 걸어", "전화해", "통화"], action: "call" },
  { keywords: ["프로필", "프로필 보여"], action: "profile" },
  { keywords: ["검색", "찾아"], action: "search" },
  { keywords: ["선물", "선물하기", "선물 보내", "선물 추천", "생일 선물", "주문해", "주문 해", "주문하기"], action: "gift" },
  { keywords: ["가는 길", "어떻게 가", "길 찾기", "지도", "네비", "경로"], action: "navigation" },
  { keywords: ["전송", "보내", "보내줘"], action: "send" },
  { keywords: ["강아지 놀이터"], action: "choonsik-card" },
  { keywords: ["채팅방 만들어", "채팅방 생성", "채팅방 만들기", "톡방 만들어", "단톡방 만들어", "대화방 만들어", "대화방 생성", "대화방 만들기"], action: "create-chatroom" },
  { keywords: ["읽음처리", "읽음 처리"], action: "mark-read" },
  { keywords: ["뭐라고", "뭐라 할", "뭐라 말", "다음에 뭐"], action: "next-reply" },
];

// ── 알려진 친구 이름 목록 (자연어 의도 파악용) ──
const KNOWN_FRIEND_NAMES = [
  "다니엘", "김민수", "마르코", "민수", "시나", "이현우", "유나", "태형",
  "김영지", "이해수", "강지훈", "고성현", "박채원", "이도현", "서은재",
  "혜선", "유진", "나연", "해수", "채원", "은재", "지훈", "영지", "현우", "도현", "성현",
  "딸지민", "지민", "준서",
];

// STT 음성 인식 오류 보정: 발음 유사어 → 정규 이름 매핑
const VOICE_NAME_ALIASES: Record<string, string> = {
  "와이프": "와이프 해수",
  "와이퍼": "와이프 해수",
  "해수": "와이프 해수",
  "혜수": "와이프 해수",
  "횟수": "와이프 해수",
  "회수": "와이프 해수",
  "헤수": "와이프 해수",
  "해쑤": "와이프 해수",
  "지민": "딸지민",
  "딸 지민": "딸지민",
};

// ── 자연어 '채팅방 만들기' 의도 감지 ──
// "민수랑 톡하고 싶어", "채원이한테 연락해줘", "해수랑 대화하자" 등
const CHAT_INTENT_PATTERNS = [
  /(.+?)(?:이랑|랑|하고|과|와)\s*(?:톡|채팅|대화|얘기|이야기)\s*(?:하고\s*싶|하자|할래|해줘|하고싶|좀)/,
  /(.+?)(?:한테|에게)\s*(?:연락|톡|메시지|채팅)\s*(?:해줘|해|하자|좀|할래)/,
  /(.+?)(?:이랑|랑|하고|과|와)\s*(?:연락|톡)\s*(?:해|하자|해줘|좀)/,
  /(.+?)(?:이랑|랑)\s*(?:방|톡방|채팅방)\s*(?:만들|열|파)/,
];

function detectChatIntentFromNL(text: string): { members: string[]; message: string } | null {
  const normalized = text.trim();
  for (const pattern of CHAT_INTENT_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      const rawNames = match[1].trim();
      // 구분자 분리: "민수랑 채원이랑" → 이미 첫 매칭에서 "민수" 캡처됨
      const names = rawNames
        .split(/[,，]\s*|\s+(?:이랑|랑|하고|과|와)\s+|\s+/)
        .map(n => n.replace(/이$/, "").trim())
        .filter(n => n.length > 0);
      // 음성 별칭 보정 후 알려진 친구 이름 매칭
      const matched = names
        .map(n => VOICE_NAME_ALIASES[n] ?? n)
        .filter(n => KNOWN_FRIEND_NAMES.some(fn => fn.includes(n) || n.includes(fn)) || Object.values(VOICE_NAME_ALIASES).includes(n));
      if (matched.length > 0) {
        return { members: matched, message: "" };
      }
    }
  }
  // 패턴 미매칭이어도, 텍스트에 친구 이름 + 대화 의도 키워드가 모두 있으면 매칭
  const intentKeywords = ["톡", "채팅", "대화", "얘기", "이야기", "연락"];
  const hasIntent = intentKeywords.some(kw => normalized.includes(kw));
  if (hasIntent) {
    const foundNames = KNOWN_FRIEND_NAMES.filter(fn => normalized.includes(fn));
    if (foundNames.length > 0) {
      return { members: foundNames, message: "" };
    }
  }
  return null;
}

interface NavStep {
  instruction: string;
  road: string;
  distance: number;
  duration: number;
  icon: "straight" | "left" | "right" | "arrive";
  markerX: number;
  markerY: number;
}

const NAV_STEPS: NavStep[] = [
  { instruction: "출발합니다", road: "현재 위치", distance: 300, duration: 3000, icon: "straight", markerX: 16, markerY: 80 },
  { instruction: "300m 앞에서 좌회전", road: "분당내곡로", distance: 800, duration: 4000, icon: "left", markerX: 30, markerY: 62 },
  { instruction: "800m 직진", road: "판교역로", distance: 500, duration: 3500, icon: "straight", markerX: 48, markerY: 45 },
  { instruction: "500m 앞에서 우회전", road: "판교역 방면", distance: 400, duration: 3000, icon: "right", markerX: 65, markerY: 32 },
  { instruction: "목적지 도착", road: "", distance: 0, duration: 2500, icon: "arrive", markerX: 83, markerY: 15 },
];
const TOTAL_NAV_DISTANCE = 2000;

const WISHLIST_ITEMS = [
  { name: "반클리프 플럼 블로썸", price: "4,660,000원", emoji: "💎", color: "#FFF1F2" },
  { name: "샤넬 클래식 플랩백", price: "12,800,000원", emoji: "👜", color: "#F3E8FF" },
  { name: "까르띠에 탱크 워치", price: "8,950,000원", emoji: "⌚", color: "#EFF6FF" },
  { name: "디올 프레스티지 세럼", price: "520,000원", emoji: "🧴", color: "#ECFDF5" },
];

const GIFT_PRODUCT = {
  name: "반클리프 아펠 브레이슬릿 '플럼 블로썸'",
  option: "로즈골드 / 선물포장",
  reviewCount: 87,
  satisfactionPct: 98,
  originalPrice: 4960000,
  salePrice: 4660000,
  image: "/vancleef.png",
  payMethod: "카카오페이 연결카드",
  discount: "현대카드 5만원 즉시 할인",
};

function extractGiftRecipient(text: string): string {
  if (text.includes("나영")) return "이나영";
  const m = text.match(/(.+?)에게\s*(?:선물|기프트)/);
  if (m) return m[1].trim();
  const m2 = text.match(/(.+?)(?:이|의)\s*(?:생일\s*)?선물/);
  if (m2) return m2[1].trim();
  return "친구";
}

const CHAT_BOLD_PARTS = [
  "대화 요약, 선물 추천, 길 찾기, 다크 모드 전환",
  "판교 스시이도 할인 쿠폰이 오늘까지라 집에 들러서 꼭 챙겨가야 함",
];

function renderChatWithBold(display: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  let text = display;
  let keyIdx = 0;
  while (true) {
    let first = { index: -1, length: 0, text: "" };
    for (const part of CHAT_BOLD_PARTS) {
      const idx = text.indexOf(part);
      if (idx !== -1 && (first.index === -1 || idx < first.index)) {
        first = { index: idx, length: part.length, text: part };
      }
    }
    if (first.index === -1) {
      if (text) result.push(<span key={`t${keyIdx}`} data-ctext="true">{text}</span>);
      break;
    }
    if (first.index > 0) {
      result.push(<span key={`t${keyIdx++}`} data-ctext="true">{text.slice(0, first.index)}</span>);
    }
    result.push(<span key={`b${keyIdx++}`} data-ctext="true" className="font-semibold">{first.text}</span>);
    text = text.slice(first.index + first.length);
  }
  return <>{result}</>;
}

function matchCommand(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.keywords.some((kw) => normalized.includes(kw))) return cmd.action;
  }
  // 키워드 미매칭 → 자연어 의도 감지 (친구 이름 + 대화 의도)
  if (detectChatIntentFromNL(text)) return "create-chatroom";
  return null;
}

function parseDarkModeIntent(text: string): boolean | null {
  const t = text.trim();
  if (/켜|실행|켜줘|켜줘요|켜주세요/.test(t)) return true;
  if (/꺼|꺼줘|꺼줘요|꺼주세요/.test(t)) return false;
  return null;
}

function extractDestination(text: string): string {
  // "X까지" 패턴
  const m1 = text.match(/(.+?)까지/);
  if (m1) return m1[1].trim();
  // "X로 가는" 패턴
  const m2 = text.match(/(.+?)로\s*(?:가는|가자|가)/);
  if (m2) return m2[1].trim();
  // "X 가는 길" 패턴
  const m3 = text.match(/(.+?)\s*가는\s*길/);
  if (m3) return m3[1].trim();
  return "목적지";
}

const LOADING_MSGS = ["카카오페이와 연결 중입니다.", "결제 처리 중..."];
const MEETING_LOADING_MSGS = ["음성을 텍스트로 변환 중...", "요약 정리 중...", "나챗방으로 보내는 중..."];

function LoadingMessages({ dark, messages, title }: { dark?: boolean; messages?: string[]; title?: string }) {
  const msgs = messages || LOADING_MSGS;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev + 1) % msgs.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [msgs.length]);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <img src="/voice-effect.png" alt="로딩" className="w-14 h-14 rounded-full animate-flip-y flex-shrink-0" />
      {title && (
        <p className={`text-[17px] font-semibold mt-6 mb-1 ${dark ? "text-white" : "text-[#191919]"}`}>
          {title}
        </p>
      )}
      <p className={`text-[15px] font-medium ${title ? "" : "mt-4"} ${dark ? "text-gray-300" : "text-[#767676]"}`}>
        {msgs[idx]}
      </p>
    </div>
  );
}

function MeetingLoadingText({ dark }: { dark?: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx(prev => (prev + 1) % MEETING_LOADING_MSGS.length), 1000);
    return () => clearInterval(timer);
  }, []);
  return <p className={`text-[15px] font-medium ${dark ? "text-gray-300" : "text-[#767676]"}`}>{MEETING_LOADING_MSGS[idx]}</p>;
}

/** 채팅방 생성 요청에서 멤버 이름 + 초기 메시지 추출 */
function extractChatRequest(text: string): { members: string[]; message: string } {
  // 1) 자연어 의도 감지 우선 시도 ("민수랑 톡하고 싶어" 등)
  const nlResult = detectChatIntentFromNL(text);
  if (nlResult && nlResult.members.length > 0) {
    return nlResult;
  }

  // 2) 기존 키워드 기반 추출 ("이해수랑 채팅방 만들어줘" 등)
  // 메시지 분리: "... 만들어줘 안녕하세요" → message = "안녕하세요"
  const msgMatch = text.match(/(?:만들어줘|만들어|생성해줘|생성|만들기)\s+(.+)$/);
  const message = msgMatch ? msgMatch[1].trim() : "";

  // 멤버 이름 추출
  const cleaned = text
    .replace(/새\s*|채팅방|톡방|단톡방|대화방|만들어줘|만들어|생성해줘|생성|만들기|해줘/g, "")
    .replace(message, "")
    .trim();
  // 구분자: 와, 과, 이랑, 하고, 랑, 쉼표, 공백+
  const names = cleaned
    .split(/[,，]\s*|\s+(?:와|과|이랑|하고|랑)\s+|\s+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  return { members: names, message };
}

export function AILayerPopup({ isOpen, onClose, inputRef, darkMode, onDarkModeToggle, onCreateChatRoom, suggestContext = "friend", chatPartnerName, chatProductSuggestions, chatRoomMessages, onSendReply, onSendToMyChat, allChatRooms, onMarkAllRead, showNotificationList: showNotiProp = false, onNotificationListClose: onNotiClose, onChipPlaceClick, onMinimizedChange }: AILayerPopupProps) {
  const [textMode, setTextMode] = useState(false);
  const [voiceStandby, setVoiceStandby] = useState(true); // 음성 대기 모드: 탭해야 마이크 시작
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, _setInputText] = useState("");
  // AI 생성 추천 칩
  const [aiSuggestions, setAiSuggestions] = useState<string[] | null>(null);

  const [textSending, setTextSending] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null); // 사원증 등 액션별 로딩 텍스트
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<ChatMessage[] | null>(null);
  const [giftResult, setGiftResult] = useState<string | null>(null);
  const [replyMode, _setReplyMode] = useState(false);
  const [minimized, setMinimized] = useState(false);
  useEffect(() => { onMinimizedChange?.(minimized); }, [minimized, onMinimizedChange]);
  const [showDismiss, setShowDismiss] = useState(false);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const persona = usePersona();
  const [naviMinutes, setNaviMinutes] = useState(120);
  useEffect(() => {
    const id = setInterval(() => {
      setNaviMinutes(m => {
        const delta = Math.floor(Math.random() * 11) - 5; // -5 ~ +5
        return Math.max(110, Math.min(135, m + delta));
      });
    }, 3000);
    return () => clearInterval(id);
  }, []);
  const [meetingMode, setMeetingMode] = useState(false);
  const [meetingRecording, setMeetingRecording] = useState(false);
  const [meetingPaused, setMeetingPaused] = useState(false);
  const [meetingSaved, setMeetingSaved] = useState(false);
  const [meetingSending, setMeetingSending] = useState(false);
  const [meetingElapsed, setMeetingElapsed] = useState(0);
  const meetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Circle to Search — 말풍선 롱프레스 시 활성화
  const [circleActiveId, setCircleActiveId] = useState<string | null>(null);
  const circleBubbleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // TTS (OpenAI TTS — AI 답변 읽어주기)
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceSentRef = useRef(false); // 음성으로 보낸 메시지인지 추적
  const pendingVoiceMsgsRef = useRef<ChatMessage[] | null>(null); // 음성 TTS 중 대기 메시지
  async function toggleTts(directText?: string) {
    if (ttsSpeaking) {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
        ttsAudioRef.current = null;
      }
      setTtsSpeaking(false);
      setStatusMessage(null);
      if (pendingVoiceMsgsRef.current) {
        setChatMessages(pendingVoiceMsgsRef.current);
        pendingVoiceMsgsRef.current = null;
      }
      return;
    }
    // directText가 있으면 바로 사용, 없으면 chatMessages에서 찾기
    const ttsText = directText ?? [...chatMessages].reverse().find(m => m.role === "ai")?.text;
    if (!ttsText) return;
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      // fallback: 브라우저 TTS
      const utt = new SpeechSynthesisUtterance(ttsText);
      utt.lang = "ko-KR";
      utt.rate = 1.05;
      utt.onend = () => {
        setTtsSpeaking(false);
        setStatusMessage(null);
        setVoiceStandby(true);
      };
      setTtsSpeaking(true);
      window.speechSynthesis.speak(utt);
      return;
    }
    setTtsSpeaking(true);
    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: ttsText.slice(0, 4096),
          voice: "nova",
          response_format: "mp3",
          speed: 1.05,
        }),
      });
      if (!res.ok) throw new Error("TTS API error");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        setTtsSpeaking(false);
        setStatusMessage(null);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setVoiceStandby(true);
      };
      audio.onerror = () => {
        setTtsSpeaking(false);
        setStatusMessage(null);
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setVoiceStandby(true);
      };
      audio.play();
    } catch {
      setTtsSpeaking(false);
      setStatusMessage(null);
      setVoiceStandby(true);
      if (pendingVoiceMsgsRef.current) {
        setChatMessages(pendingVoiceMsgsRef.current);
        pendingVoiceMsgsRef.current = null;
      }
    }
  }

  const [directionMode, setDirectionMode] = useState(false);
  const [directionDest, setDirectionDest] = useState("");
  const [navActive, setNavActive] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [navProgress, setNavProgress] = useState(0);
  const [navArrived, setNavArrived] = useState(false);
  const [darkmodeView, setDarkmodeView] = useState(false);
  const [choonsikCardView, setChoonsikCardView] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [wishlistView, setWishlistView] = useState(false);
  const [notificationListView, setNotificationListView] = useState(false);
  const [journalTab, setJournalTab] = useState<"briefing" | "journal">("briefing");
  const [aiKbVisible, setAiKbVisible] = useState(false);
  const keyboardOffset = aiKbVisible ? 290 : 0;
  const [wishlistPhase, setWishlistPhase] = useState<"product" | "loading" | "complete">("product");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingDisplayedLength, setTypingDisplayedLength] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const popupBodyRef = useRef<HTMLDivElement>(null);
  const [popupLockedHeight, setPopupLockedHeight] = useState<number | null>(null);
  const [nearDismiss, setNearDismiss] = useState(false);
  const nearDismissRef = useRef(false);
  const chatRequestIdRef = useRef(0); // stale API 응답 무시용
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const replyModeRef = useRef(false);
  const messageTargetRef = useRef<string | null>(null); // 음성 메시지 전송 대상
  const inputTextRef = useRef("");
  const textSendLockRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ref를 state와 동기화하는 래퍼
  function updateReplyMode(val: boolean) {
    replyModeRef.current = val;
    _setReplyMode(val);
  }
  function updateInputText(val: string) {
    inputTextRef.current = val;
    _setInputText(val);
  }

  // 팝업 닫힐 때 전체 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      chatRequestIdRef.current++; // stale API 응답 무시
      setAiKbVisible(false);
      setTextMode(false);
      setChatMessages([]);
      setTypingMessageId(null);
      setTypingDisplayedLength(0);
      setAiTyping(false);
      setPopupLockedHeight(null);
      setCircleActiveId(null);
      setVoiceStandby(true);
      updateInputText("");
    }
  }, [isOpen]);

  // 김부장 페르소나: 팝업 열릴 때 AI 추천 칩 생성
  useEffect(() => {
    if (isOpen && persona.id === "golf" && suggestContext === "friend") {
      generateGolfSuggestions(allChatRooms).then(setAiSuggestions);
    }
    if (!isOpen) setAiSuggestions(null);
  }, [isOpen, persona.id, suggestContext]);

  // 채팅 메시지 추가 시 자동 스크롤 — 넘칠 때만 스크롤
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = chatScrollRef.current;
      if (!el) return;
      // 콘텐츠가 컨테이너를 넘칠 때만 스크롤 (유저 메시지 안 밀림)
      if (el.scrollHeight > el.clientHeight) {
        el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      }
    });
  }, []);

  // 텍스트 모드 전환 시 음성 pending 메시지 커밋
  useEffect(() => {
    if (textMode && pendingVoiceMsgsRef.current) {
      setChatMessages(pendingVoiceMsgsRef.current);
      pendingVoiceMsgsRef.current = null;
    }
  }, [textMode]);

  // 채팅 메시지 전송 + AI 응답 시뮬레이션 (질문마다 이전 대화 리셋)
  const sendChatMessage = useCallback(async (text: string) => {
    // ── 텍스트 입력에서도 기능 실행 커맨드 감지 (UI 액션만 가로챔) ──
    const textAction = matchCommand(text);
    if (textAction === "create-chatroom") {
      const { members, message } = extractChatRequest(text);
      if (members.length > 0 && onCreateChatRoom) {
        onCreateChatRoom(members, message || undefined);
        onClose();
        return;
      }
      // 멤버 미지정 → "누구랑?" 안내를 AI 응답으로 표시
    } else if (textAction === "gift") {
      const recipient = extractGiftRecipient(text);
      // 로딩 phase → 결제 페이지 전환
      setGiftResult(recipient);
      setWishlistView(true);
      setWishlistPhase("loading");
      setTextMode(false);
      setTimeout(() => {
        setWishlistPhase("product");
      }, 1800);
      return;
    } else if (textAction === "darkmode") {
      const darkIntent = parseDarkModeIntent(text);
      if (darkIntent !== null) {
        onDarkModeToggle(darkIntent);
        return;
      }
    } else if (textAction === "mark-read") {
      onMarkAllRead?.();
      // 읽음처리는 AI 응답도 함께 표시 (기존 프리셋)
    }
    // ── 위에서 return되지 않은 모든 텍스트는 API로 전달 ──

    const isVoice = voiceSentRef.current;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text, timestamp: Date.now() };

    if (isVoice) {
      // ── 음성 모드: 화면 전환 없이 센터 그래픽 유지, AI 응답 후 TTS ──
      setIsLoading(true);
      try {
        const aiText = await getAIResponse(text, [userMsg], chatRoomMessages, allChatRooms, persona.id);
        // AI 응답은 TTS 끝난 뒤 텍스트 모드 전환 시 볼 수 있도록 ref에 보관
        const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: aiText, timestamp: Date.now() };
        pendingVoiceMsgsRef.current = [userMsg, aiMsg];
        setIsLoading(false);
        setStatusMessage("브리핑을 읽어드리고 있어요");
        voiceSentRef.current = false;
        // 바로 TTS 재생 — aiText를 직접 전달
        toggleTts(aiText);
      } catch {
        setIsLoading(false);
        setStatusMessage(null);
        voiceSentRef.current = false;
      }
    } else {
      // ── 텍스트 모드: 기존 채팅 UI ──
      // 0) 텍스트 모드 활성화 (서제스트 칩 → 대화형 전환 보장)
      setTextMode(true);
      // 1) 유저 메시지 표시 + 스켈레톤 동시 세팅
      const reqId = ++chatRequestIdRef.current;
      setChatMessages([userMsg]);
      setTypingMessageId(null);
      setAiTyping(true);

      // 2) DOM 렌더 완료 후 스크롤 (2프레임 대기 — 트랜지션 시작 후)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToBottom());
      });

      try {
        console.log("[Chat] calling getAIResponse:", text.slice(0, 50));
        const [aiText] = await Promise.all([
          getAIResponse(text, [userMsg], chatRoomMessages, allChatRooms, persona.id),
          new Promise<void>((r) => setTimeout(r, 2500)),
        ]);
        // stale 응답 무시 (X로 닫은 뒤 돌아온 응답)
        if (reqId !== chatRequestIdRef.current) return;
        console.log("[Chat] AI response:", aiText?.slice(0, 80));
        // 3) 스켈레톤 → AI 메시지 추가
        const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: aiText, timestamp: Date.now() };
        setChatMessages((prev) => [...prev, aiMsg]);
        // 텍스트 입력: 기존 타이핑 애니메이션
        setTypingDisplayedLength(0);
        setTypingMessageId(aiMsg.id);
        setTimeout(() => setAiTyping(false), 80);
      } catch (err) {
        if (reqId !== chatRequestIdRef.current) return;
        console.error("[sendChatMessage error]", err);
        setAiTyping(false);
      }
    }
  }, [scrollToBottom, chatRoomMessages, allChatRooms, onCreateChatRoom, onClose, onDarkModeToggle, onMarkAllRead]);

  // AI 응답 타이핑 효과 (서로게이트 페어/이모지 안전)
  useEffect(() => {
    if (!typingMessageId || typingDisplayedLength < 0) return;
    const msg = chatMessages.find((m) => m.id === typingMessageId && m.role === "ai");
    if (!msg) return;
    const chars = Array.from(msg.text);
    const fullLen = chars.length;
    // 타이핑 중에는 항상 최하단 고정 (instant)
    scrollToBottom();
    if (typingDisplayedLength >= fullLen) {
      setTypingMessageId(null);
      return;
    }
    // 자연스러운 타이핑: 25~45ms 랜덤 간격
    const delay = 25 + Math.random() * 20;
    const t = setTimeout(() => {
      setTypingDisplayedLength((prev) => Math.min(prev + 1, fullLen));
    }, delay);
    return () => clearTimeout(t);
  }, [typingMessageId, typingDisplayedLength, chatMessages, scrollToBottom]);

  function clearSilenceTimer() {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }

  function clearLoadingTimer() {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }

  function clearMeetingTimer() {
    if (meetingTimerRef.current) {
      clearInterval(meetingTimerRef.current);
      meetingTimerRef.current = null;
    }
  }

  function startMeetingRecording() {
    setMeetingRecording(true);
    if (!meetingPaused) setMeetingElapsed(0);
    setMeetingPaused(false);
    clearMeetingTimer();
    meetingTimerRef.current = setInterval(() => {
      setMeetingElapsed((prev) => prev + 1);
    }, 1000);
  }

  function stopMeetingRecording() {
    clearMeetingTimer();
    setMeetingRecording(false);
    setMeetingPaused(true);
  }

  function completeMeetingRecording() {
    stopMeetingRecording();
    setMeetingSaved(true);
  }

  function exitMeetingMode() {
    stopMeetingRecording();
    setMeetingMode(false);
    setMeetingElapsed(0);
    setMeetingPaused(false);
    setMeetingSaved(false);
  }

  function formatElapsed(sec: number): string {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function clearNavTimer() {
    if (navTimerRef.current) {
      clearInterval(navTimerRef.current);
      navTimerRef.current = null;
    }
  }

  function advanceNav(stepIdx: number) {
    clearNavTimer();
    const step = NAV_STEPS[stepIdx];
    if (!step) return;
    setNavStep(stepIdx);
    setNavProgress(0);
    const interval = 50;
    const increments = step.duration / interval;
    let tick = 0;
    navTimerRef.current = setInterval(() => {
      tick++;
      const p = Math.min(tick / increments, 1);
      setNavProgress(p);
      if (p >= 1) {
        clearNavTimer();
        if (stepIdx < NAV_STEPS.length - 1) {
          setTimeout(() => advanceNav(stepIdx + 1), 200);
        } else {
          setNavArrived(true);
        }
      }
    }, interval);
  }

  function startNavigation() {
    setNavActive(true);
    setNavArrived(false);
    setNavStep(0);
    setNavProgress(0);
    setTimeout(() => advanceNav(0), 300);
  }

  function finishNavigation() {
    clearNavTimer();
    setNavActive(false);
    setNavStep(0);
    setNavProgress(0);
    setNavArrived(false);
    setDirectionMode(false);
    setDirectionDest("");
    resetToDefaultView();
  }

  // 모든 모드별 상태를 초기 음성 모드로 되돌림
  function resetToDefaultView() {
    setChatMessages([]);
    setTextMode(false);
    setSummaryResult(null);
    setGiftResult(null);
    setChoonsikCardView(false);
    setNotificationListView(false);
    updateInputText("");
    setTypingMessageId(null);
    setAiTyping(false);
    inputRef.current?.blur();
  }

  function doSendMessage() {
    // 1) 진행 중인 음성 인식·타이머 모두 즉시 중단
    doStop();
    clearSilenceTimer();
    clearLoadingTimer();

    // 2) 모든 텍스트 상태 즉시 클리어
    updateInputText("");
    inputRef.current?.blur();
    setTranscript("");
    setInterimText("");
    setStatusMessage(null);
    setIsLoading(false);
    setSummaryResult(null);
    setGiftResult(null);

    // 3) 텍스트 모드 유지한 채 전송 로딩 표시
    setTextSending(true);
    setSendStatus("전송중...");

    setTimeout(() => {
      setTextSending(false);
      setSendStatus("전송완료");
      setTimeout(() => {
        setSendStatus(null);
        updateReplyMode(false);
        setTextMode(false);
      }, 1000);
    }, 1200);
  }

  // ── 액션 타입 분류 ──
  // Conversational Type: 사용자 말풍선 → 스켈레톤 로딩 → AI 타이핑 응답
  //   (chat-summary, next-reply, create-chatroom(멤버없음), mark-read, message(본문없음), 일반 텍스트)
  // Direct Action Type: 즉시 시스템 동작 (UI 전환), 채팅 없음
  //   (gift, darkmode, navigation, choonsik-card, create-chatroom(멤버있음))

  function handleTextSend() {
    if (textSendLockRef.current) return;
    const text = (inputTextRef.current || inputText).trim();
    if (!text) return;
    textSendLockRef.current = true;
    // replyMode: messageTarget이 있으면 해당 대상에게 전송 후 팝업 닫기
    if (replyMode) {
      if (messageTargetRef.current) {
        const target = messageTargetRef.current;
        if (onCreateChatRoom) {
          onCreateChatRoom([target], text);
        }
        messageTargetRef.current = null;
        updateReplyMode(false);
        updateInputText("");
        voiceSentRef.current = false;
        textSendLockRef.current = false;
        onClose();
        return;
      }
      doSendMessage();
      setTimeout(() => { textSendLockRef.current = false; }, 1500);
      return;
    }
    const action = matchCommand(text);
    updateInputText("");

    // ── Direct Action Type: 즉시 시스템 동작 ──
    if (action === "gift") {
      inputRef.current?.blur();
      doStop();
      setTranscript("");
      setInterimText("");
      const recipient = extractGiftRecipient(text);
      setGiftResult(recipient);
      setWishlistView(true);
      setWishlistPhase("loading");
      setTextMode(false);
      setChoonsikCardView(false);
      loadingTimerRef.current = setTimeout(() => {
        setWishlistPhase("product");
        setStatusMessage(null);
        textSendLockRef.current = false;
      }, 1500);
    } else if (action === "darkmode") {
      const darkIntent = parseDarkModeIntent(text);
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        setChoonsikCardView(false);
        doStop();
        setDarkmodeView(true);
        textSendLockRef.current = false;
        if (darkIntent !== null) {
          setTimeout(() => onDarkModeToggle(darkIntent), 350);
        }
      }, 1500);
    } else if (action === "navigation") {
      const dest = extractDestination(text);
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        setChoonsikCardView(false);
        doStop();
        setDirectionMode(true);
        setDirectionDest(dest);
        textSendLockRef.current = false;
      }, 1500);
    } else if (action === "choonsik-card") {
      inputRef.current?.blur();
      setLoadingMessage("강아지 놀이터를 찾는 중");
      setTextSending(true);
      loadingTimerRef.current = setTimeout(() => {
        setLoadingMessage(null);
        setTextSending(false);
        setTextMode(false);
        doStop();
        setSummaryResult(null);
        setChoonsikCardView(true);
        textSendLockRef.current = false;
      }, 1500);
    } else if (action === "create-chatroom") {
      const { members, message } = extractChatRequest(text);
      if (members.length > 0 && onCreateChatRoom) {
        // Direct Action: 멤버 지정됨 → 바로 채팅방 생성
        inputRef.current?.blur();
        setTextSending(true);
        loadingTimerRef.current = setTimeout(() => {
          setTextSending(false);
          setTextMode(false);
          doStop();
          onCreateChatRoom(members, message || undefined);
          onClose();
          textSendLockRef.current = false;
        }, 1500);
      } else {
        // Conversational: 멤버 미지정 → AI 안내
        sendChatMessage(text).finally(() => { textSendLockRef.current = false; });
      }
    } else if (action === "message") {
      handleVoiceMessage(text);
      textSendLockRef.current = false;

    // ── Conversational Type: 사용자 말풍선 → 스켈레톤 → AI 타이핑 ──
    } else if (action === "mark-read") {
      // 읽음처리 전에 sendChatMessage 호출 (allChatRooms 스냅샷이 getAIResponse로 전달됨)
      sendChatMessage(text).then(() => {
        onMarkAllRead?.();
      }).finally(() => { textSendLockRef.current = false; });
    } else {
      // chat-summary, next-reply, 일반 텍스트 → 모두 동일한 대화형 플로우
      sendChatMessage(text).finally(() => { textSendLockRef.current = false; });
    }
  }

  // ── Voice-to-Action Message Handler ──
  // 음성 입력에서 대상과 메시지 내용을 파악하여 자동 처리
  function handleVoiceMessage(voiceText: string) {
    // 1) NLP 파싱: 이름 + 메시지 내용 추출
    // 인용 조사 제거 — "곧 간다고" → "곧 간다", "사랑해라고" → "사랑해"
    // "이라고" > "라고" > "고" 순서로 매칭 (다고X — "다"는 어미이므로 보존)
    const stripQuote = (s: string) => s.replace(/(?:이라고|라고|고)$/, "");

    // 패턴1: "혜수에게 곧 간다고 메시지 보내줘" → 이름: 혜수, 내용: 곧 간다
    const matchWithBody = voiceText.match(/(.+?)에게\s+(.+?)\s*(?:메시지|문자|톡)\s*(?:보내|전송)/);
    // 패턴2: "혜수에게 메시지 보내줘" → 이름: 혜수, 내용: 없음
    const matchNoBody = !matchWithBody ? voiceText.match(/(.+?)에게\s*(?:메시지|문자|톡)\s*(?:보내|전송)/) : null;
    // 패턴3: "혜수한테 곧 간다고 보내줘"
    const matchHante = !matchWithBody && !matchNoBody ? voiceText.match(/(.+?)(?:한테|께)\s+(.+?)\s*(?:보내|전송)/) : null;
    // 패턴4: "혜수한테 보내줘"
    const matchHanteNoBody = !matchWithBody && !matchNoBody && !matchHante ? voiceText.match(/(.+?)(?:한테|께)\s*(?:메시지|문자|톡)?\s*(?:보내|전송)/) : null;

    const recipient = (matchWithBody?.[1] ?? matchNoBody?.[1] ?? matchHante?.[1] ?? matchHanteNoBody?.[1])?.trim() ?? "";
    const rawBody = (matchWithBody?.[2] ?? matchHante?.[2])?.trim() ?? "";
    const body = rawBody ? stripQuote(rawBody) : "";

    // 수신자 파싱 실패 → 일반 대화형 플로우로 폴백
    if (!recipient) {
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      sendChatMessage(voiceText);
      return;
    }

    // 알려진 이름 매칭 (퍼지 매칭)
    // 음성 인식 오류 보정 → 정규 이름 매핑
    const aliasResolved = VOICE_NAME_ALIASES[recipient] ?? recipient;
    const resolvedName = aliasResolved !== recipient
      ? aliasResolved
      : KNOWN_FRIEND_NAMES.find(fn => fn.includes(recipient) || recipient.includes(fn)) || recipient;

    if (body) {
      // 2a) 내용 있음 → 채팅방 열고 메시지 즉시 전송, 팝업 닫기
      doStop();
      setTranscript("");
      setInterimText("");
      setStatusMessage(`${resolvedName}님에게 전송 중...`);
      setIsLoading(true);

      setTimeout(() => {
        setIsLoading(false);
        setStatusMessage(null);
        // 채팅방 열기 + 메시지 전송
        if (onCreateChatRoom) {
          onCreateChatRoom([resolvedName], body);
        }
        // 모든 상태 리셋 + 팝업 닫기
        messageTargetRef.current = null;
        updateReplyMode(false);
        updateInputText("");
        voiceSentRef.current = false;
        onClose();
      }, 800);
    } else {
      // 2b) 내용 없음 → TTS로 물어보고 입력 대기 모드 진입
      doStop();
      setTranscript("");
      setInterimText("");
      messageTargetRef.current = resolvedName;

      // TTS로 안내 음성 재생
      const guideText = `${resolvedName}님에게 보낼 메시지 내용을 말씀해 주세요.`;
      setStatusMessage(guideText);

      // TTS 재생 후 마이크 자동 시작 (toggleTts의 onended에서 doStart 호출됨)
      toggleTts(guideText);

      // replyMode 진입 — 다음 음성 입력이 메시지 본문으로 처리됨
      updateReplyMode(true);
    }
  }

  function handleVoiceSend(text: string) {
    doStop();
    clearSilenceTimer();
    voiceSentRef.current = true;
    // reply 모드: 메시지 대상이 있으면 본문으로 즉시 전송
    if (replyModeRef.current) {
      if (messageTargetRef.current) {
        // Voice-to-Action: 대상이 지정된 상태에서 본문 입력됨 → 즉시 전송
        const target = messageTargetRef.current;
        doStop();
        setTranscript("");
        setInterimText("");
        setStatusMessage(`${target}님에게 전송 중...`);
        setIsLoading(true);

        setTimeout(() => {
          setIsLoading(false);
          setStatusMessage(null);
          if (onCreateChatRoom) {
            onCreateChatRoom([target], text);
          }
          messageTargetRef.current = null;
          updateReplyMode(false);
          updateInputText("");
          voiceSentRef.current = false;
          onClose();
        }, 800);
        return;
      }
      const sendAction = matchCommand(text);
      if (sendAction === "send" && inputTextRef.current.trim()) {
        doSendMessage();
        return;
      }
      updateInputText(text);
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      setIsLoading(false);
      setVoiceStandby(true);
      return;
    }
    const action = matchCommand(text);

    // ── Direct Action Type: 즉시 시스템 동작 (음성 응답 없이 기능 실행) ──
    if (action === "gift") {
      voiceSentRef.current = false;
      setTranscript("");
      setInterimText("");
      doStop();
      const recipient = extractGiftRecipient(text);
      setGiftResult(recipient);
      setWishlistView(true);
      setWishlistPhase("loading");
      setTextMode(false);
      setChoonsikCardView(false);
      loadingTimerRef.current = setTimeout(() => {
        setWishlistPhase("product");
      }, 1800);
    } else if (action === "darkmode") {
      const darkIntent = parseDarkModeIntent(text);
      // 음성: 다크모드 즉시 실행 (중간 UI 없이)
      setTranscript("");
      setInterimText("");
      if (darkIntent !== null) {
        onDarkModeToggle(darkIntent);
      } else {
        // "다크모드" 만 말한 경우 토글
        onDarkModeToggle(!darkMode);
      }
      voiceSentRef.current = false;
      setVoiceStandby(true);
    } else if (action === "navigation") {
      voiceSentRef.current = false;
      setTranscript("");
      setInterimText("");
      doStop();
      const dest = extractDestination(text);
      setChoonsikCardView(false);
      setTextMode(false);
      setDirectionMode(true);
      setDirectionDest(dest);
    } else if (action === "choonsik-card") {
      voiceSentRef.current = false;
      setTranscript("");
      setInterimText("");
      doStop();
      setTextMode(false);
      setSummaryResult(null);
      setChoonsikCardView(true);
    } else if (action === "create-chatroom") {
      const { members, message } = extractChatRequest(text);
      if (members.length > 0 && onCreateChatRoom) {
        // 멤버 지정됨 → 즉시 채팅방 생성 (음성 응답 없이)
        voiceSentRef.current = false;
        setTranscript("");
        setInterimText("");
        doStop();
        onCreateChatRoom(members, message || undefined);
        onClose();
      } else {
        // 멤버 미지정 → TTS 없이 안내 (텍스트 대화형)
        voiceSentRef.current = false;
        setTranscript("");
        setInterimText("");
        setStatusMessage(null);
        sendChatMessage(text);
      }
    } else if (action === "message") {
      handleVoiceMessage(text);
    } else if (action === "send" && (replyModeRef.current || inputTextRef.current.trim())) {
      doSendMessage();
    } else if (action === "mark-read") {
      // 읽음처리 → 즉시 기능 실행 (음성 응답 없이)
      voiceSentRef.current = false;
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      onMarkAllRead?.();
      setVoiceStandby(true);

    // ── Conversational Type: AI 대화 플로우 ──
    } else {
      // chat-summary, next-reply, 일반 텍스트 → 대화형 플로우
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      sendChatMessage(text);
    }
  }

  // 음성 인식 중단 — 모든 이벤트 핸들러 해제 후 abort
  function doStop() {
    activeRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      try { rec.abort(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
  }

  // 음성 인식 시작 — 기존 세션 중단 후 새 인식기 생성 및 이벤트 바인딩
  function doStart() {
    doStop();
    const rec = createRecognition();
    if (!rec) return;
    recognitionRef.current = rec;
    activeRef.current = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(final);
      setInterimText(interim);

      // 2초 무음 타이머: final 텍스트가 있고 interim이 없으면 카운트 시작
      clearSilenceTimer();
      if (final && !interim) {
        silenceTimerRef.current = setTimeout(() => {
          handleVoiceSend(final);
        }, 2000);
      }
    };

    rec.onend = () => {
      if (activeRef.current) {
        // 자동 재시작
        setTimeout(() => {
          if (activeRef.current && recognitionRef.current === rec) {
            try { rec.start(); } catch { /* noop */ }
          }
        }, 100);
        return;
      }
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
      }
    };

    try {
      rec.start();
    } catch { /* noop */ }
  }

  // 팝업 열릴 때 음성 인식 시작 (100ms 딜레이로 StrictMode 대응)
  useEffect(() => {
    if (!isOpen) {
      doStop();
      clearSilenceTimer();
      clearLoadingTimer();
      window.speechSynthesis.cancel();
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      setTtsSpeaking(false);
      setTextMode(false);
      setVoiceStandby(true);
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      setIsLoading(false);
      updateInputText("");
      setTextSending(false);
      setSummaryResult(null);
      setGiftResult(null);
      updateReplyMode(false);
      messageTargetRef.current = null;
      setSendStatus(null);
      setChatMessages([]);
      pendingVoiceMsgsRef.current = null;
      setAiTyping(false);
      setMinimized(false);
      setShowDismiss(false);
      setFloatPos(null);
      setDismissing(false);
      setNearDismiss(false);
      nearDismissRef.current = false;
      wasDraggedRef.current = false;
      setDirectionMode(false);
      setDirectionDest("");
      clearNavTimer();
      setNavActive(false);
      setNavStep(0);
      setNavProgress(0);
      setNavArrived(false);
      setDarkmodeView(false);
      setChoonsikCardView(false);
      setWishlistView(false);
      setWishlistPhase("product");
      exitMeetingMode();
      updateInputText("");
      setPopupLockedHeight(null);
      setNotificationListView(false);
      return;
    }
    if (textMode || directionMode || darkmodeView || wishlistView || meetingMode || notificationListView) {
      doStop();
      return;
    }
    // 음성 대기 모드: 팝업 열려도 마이크 바로 시작하지 않음
    setVoiceStandby(true);
    return () => {
      doStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, textMode, directionMode, darkmodeView, wishlistView, meetingMode, notificationListView]);

  // 팝업 초기 높이 고정 320px
  useEffect(() => {
    if (isOpen && !popupLockedHeight) {
      setPopupLockedHeight(320);
    }
  }, [isOpen, popupLockedHeight]);

  // 종 아이콘(알림) 클릭 → 알림 리스트 뷰 활성화
  useEffect(() => {
    if (showNotiProp && isOpen) {
      setNotificationListView(true);
    }
  }, [showNotiProp, isOpen]);

  // 페르소나별 프리셋 응답 (음성/텍스트 입력 시 getAIResponse 대신 사용)
  // — 프리로드하지 않고, 사용자가 직접 질문하면 매칭되는 답변을 반환

  // 미니 플로팅 버튼 드래그 관련 상태
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasDraggedRef = useRef(false);

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function getScale() {
    const el = containerRef.current;
    if (!el) return 1;
    const cr = el.getBoundingClientRect();
    return cr.width / el.offsetWidth || 1;
  }

  function startLongPress(clientX: number, clientY: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const cr = containerRef.current?.getBoundingClientRect();
    if (!cr) return;
    const s = getScale();
    const elCenterX = (rect.left + rect.width / 2 - cr.left) / s;
    const elCenterY = (rect.top + rect.height / 2 - cr.top) / s;
    const mouseRelX = (clientX - cr.left) / s;
    const mouseRelY = (clientY - cr.top) / s;
    dragOffsetRef.current = { dx: mouseRelX - elCenterX, dy: mouseRelY - elCenterY };
    draggingRef.current = true;
    wasDraggedRef.current = false;
    setFloatPos({ x: mouseRelX - dragOffsetRef.current.dx, y: mouseRelY - dragOffsetRef.current.dy });
    setIsDragging(true);
    setShowDismiss(true);
    longPressTimerRef.current = setTimeout(() => {
      wasDraggedRef.current = true;
    }, 400);
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!draggingRef.current) return;
    setIsDragging(true);
    const cr = containerRef.current?.getBoundingClientRect();
    if (!cr) return;
    const s = getScale();
    const relX = (clientX - cr.left) / s - dragOffsetRef.current.dx;
    const relY = (clientY - cr.top) / s - dragOffsetRef.current.dy;
    setFloatPos({ x: relX, y: relY });
    wasDraggedRef.current = true;
    // X 버튼 근접 감지 (컨테이너 상대 좌표, 스케일 보정)
    const xCenter = cr.width / s / 2;
    const yTarget = cr.height / s - 104 - 20;
    const dist = Math.sqrt((relX - xCenter) ** 2 + (relY - yTarget) ** 2);
    const isNear = dist < 50;
    nearDismissRef.current = isNear;
    setNearDismiss(isNear);
  }

  function endDrag() {
    cancelLongPress();
    if (!draggingRef.current) { return; }
    draggingRef.current = false;
    setIsDragging(false);
    if (nearDismissRef.current) {
      setDismissing(true);
      setNearDismiss(false);
      nearDismissRef.current = false;
      setTimeout(() => {
        doStop();
        setShowDismiss(false);
        setFloatPos(null);
        setDismissing(false);
        // onClose로 isOpen=false 먼저 → useEffect가 minimized 포함 전체 리셋
        onClose();
      }, 300);
      return;
    }
    setShowDismiss(false);
    setNearDismiss(false);
    nearDismissRef.current = false;
    // floatPos 유지 → 드래그한 위치에 고정
  }

  // Touch handlers
  function handleFloatTouchStart(e: React.TouchEvent) {
    startLongPress(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget as HTMLElement);
  }
  function handleFloatTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }
  function handleFloatTouchEnd() { endDrag(); }

  // Mouse handlers
  function handleFloatMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    startLongPress(e.clientX, e.clientY, e.currentTarget as HTMLElement);
    const onMouseMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      endDrag();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  const handleClose = () => {
    if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
    if (minimized) return; // 플로팅 모드에서는 배경 탭으로 닫히지 않음
    inputRef.current?.blur();
    doStop();
    onClose();
  };

  // 하단 입력/칩 영역의 paddingTop 계산 (모드별 분기)
  function getBottomPaddingTop(): number {
    if (wishlistView || meetingMode || notificationListView) return 0;
    if (directionMode) return 380;
    if (darkmodeView) return 156;
    if (giftResult && textMode) return 0;
    if (textMode) return chatMessages.length > 0 ? 4 : 16;
    if (choonsikCardView) return 8;
    return 0;
  }

  // 하단 입력/칩 영역의 paddingBottom 계산 (모드별 분기)
  function getBottomPaddingBottom(): number {
    if (wishlistView || meetingMode || notificationListView) return 0;
    if (textMode) return chatMessages.length > 0 ? 8 : 16;
    return 16;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[60]"
      style={{ pointerEvents: "none" }}
    >
      {/* ── 배경 (딤 없음, 닫기 영역, minimized/닫힘 시 클릭 패스스루) ── */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: isOpen && !minimized ? "auto" : "none" }}
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleClose(); }}
        onTouchStart={(e) => { if (isOpen && !minimized) e.stopPropagation(); }}
        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleClose(); }}
        aria-hidden="true"
      />

      {/* ── X 닫기 버튼 (센터 하단) ── */}
      {showDismiss && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-200 ${nearDismiss ? "bg-red-500 scale-110" : darkMode ? "bg-white/70" : "bg-black/70"}`}
          style={{ bottom: 104, opacity: dismissing ? 0 : 1, zIndex: 60, pointerEvents: "auto" }}
        >
          <svg className={`w-5 h-5 ${nearDismiss || !darkMode ? "text-white" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      {/* ── 미니 플로팅 버튼 (항상 렌더, minimized일 때 표시) ── */}
      <div
        className={`w-[64px] h-[64px] rounded-full cursor-pointer select-none touch-none ${isDragging || dismissing ? "" : "transition-all duration-400"} ${dismissing ? "scale-0 opacity-0" : minimized ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}
        style={floatPos
          ? { position: "absolute", left: floatPos.x - 32, top: floatPos.y - 32, zIndex: 50, transitionDelay: isDragging ? "0s" : (minimized ? "0.15s" : "0s"), touchAction: "none", pointerEvents: minimized ? "auto" : undefined }
          : { position: "absolute", right: 16, bottom: 104, zIndex: 50, transitionDelay: minimized ? "0.15s" : "0s", touchAction: "none", pointerEvents: minimized ? "auto" : undefined }
        }
        onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return; } if (!showDismiss && !draggingRef.current) { setMinimized(false); setFloatPos(null); } }}
        onTouchStart={handleFloatTouchStart}
        onTouchMove={handleFloatTouchMove}
        onTouchEnd={handleFloatTouchEnd}
        onMouseDown={handleFloatMouseDown}
      >
        {/* 글로우 이펙트: 컬러 그라디언트 */}
        <div className="absolute inset-[-3px] rounded-full overflow-hidden pointer-events-none animate-glow-breathe">
          <div
            className="absolute inset-[-100%] animate-gradient-spin"
            style={{
              background:
                "conic-gradient(from 0deg, #e01080, rgba(255,255,255,0.4), #9010e0, #1a50e0, rgba(255,255,255,0.4), #00b8e0, #9010e0, #e05000, rgba(255,255,255,0.4), #e01080)",
            }}
          />
        </div>
        <div className={`absolute inset-0 rounded-full overflow-hidden backdrop-blur-[4px]`} style={{ backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.74)", boxShadow: darkMode ? "inset 0 0 0 1px rgba(255,255,255,0.15)" : "none" }} />
        {/* 녹음 중일 때만 우측 상단 빨간 점 표시 (플로팅 모드 + 녹음 중) */}
        {minimized && meetingRecording && (
          <div
            className="absolute top-[2px] right-[2px] w-2.5 h-2.5 rounded-full bg-red-500 animate-recording-dot-blink pointer-events-none z-10"
            aria-hidden
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[60px] h-[60px]">
            <img
              src="/voice-effect.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain animate-voice-breathe"
            />
          </div>
        </div>
      </div>

      <>
      {/* ── AI 레이어 카드 (외부 여백 좌우하 16px, p-4 제거로 중복 여백 해소) ── */}
      <motion.div
        className="absolute"
        animate={{
          bottom: isOpen ? (keyboardOffset > 0 ? 4 + keyboardOffset : 26) : -300,
          opacity: isOpen && !minimized ? 1 : 0,
          scale: minimized ? 0.3 : 1,
          y: minimized ? 40 : 0,
        }}
        transition={{
          bottom: { type: "tween", duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
          opacity: { duration: 0.2 },
          scale: { duration: 0.3 },
          y: { duration: 0.3 },
        }}
        style={{
          left: 12,
          right: 12,
          top: (navActive || navArrived) ? 100 : undefined,
          transformOrigin: "bottom right",
          pointerEvents: isOpen && !minimized ? "auto" : "none",
        }}
      >
        <div className={`relative ${navActive || navArrived ? "h-full" : ""}`}>
          {/* ── 외곽 글로우: 블러된 회전 그라디언트 ── */}
          <div
            className="absolute inset-[-8px] rounded-[32px] overflow-hidden -z-10 pointer-events-none animate-glow-breathe"
          >
            <div
              className="absolute inset-[-100%] animate-gradient-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, #e01080, rgba(255,255,255,0.4), #9010e0, #1a50e0, rgba(255,255,255,0.4), #00b8e0, #9010e0, #e05000, rgba(255,255,255,0.4), #e01080)",
              }}
            />
          </div>

          {/* ── 카드 본체 ── */}
          <div
            ref={popupBodyRef}
            className={`relative rounded-[30px] overflow-hidden transition-[background-color,box-shadow] duration-500 backdrop-blur-[4px] ${navActive || navArrived ? "h-full" : ""}`}
            style={{
              backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.74)",
              boxShadow: darkMode ? "inset 0 0 0 1px rgba(255,255,255,0.12)" : "inset 0 0 0 1px #ffffff, 0 0 24px rgba(0,0,0,0.12), 0 0 48px rgba(0,0,0,0.06)",
              // 키보드가 올라오면 카드 최대 높이 제한 (가용 화면 - bottom 여백 - 상단 여백)
              ...(keyboardOffset > 0 ? { maxHeight: `calc(100dvh - ${keyboardOffset + 32}px)` } : {}),
              // 대화 중일 때만 높이 고정 (채팅 영역 안정), 그 외에는 auto
              ...(popupLockedHeight && chatMessages.length > 0 && !navActive && !navArrived && !meetingMode && !wishlistView && !choonsikCardView ? {
                height: 320,
                display: "flex",
                flexDirection: "column" as const,
              } : {}),
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
              {/* ── 우상단 내리기 버튼 ── */}
              {!meetingMode && !minimized && !textMode && !wishlistView && (
                <button
                  type="button"
                  className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center active:opacity-70 backdrop-blur-[20px] ${darkMode ? "bg-white/20" : "bg-white/60"}`}
                  style={{ boxShadow: darkMode ? "inset 0 0 0 0.5px rgba(255,255,255,0.15)" : "inset 0 0 0 0.5px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.06)" }}
                  onClick={() => { setAiKbVisible(false); setMinimized(true); }}
                >
                  <svg className={`w-4 h-4 ${darkMode ? "text-gray-300" : "text-[#000000]"}`} style={{ marginTop: 1 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {/* ── 회의 모드 UI ── */}
              {meetingMode && (
                <div className="relative flex flex-col items-center justify-between px-5 pt-8 pb-5 pointer-events-auto" style={{ height: 240 }}>
                  {/* 우상단 접기 버튼 */}
                  {!meetingSaved && (
                    <button
                      type="button"
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center active:opacity-70 ${darkMode ? "bg-white/20" : "bg-white"}`}
                      onClick={() => setMinimized(true)}
                    >
                      <svg className={`w-4 h-4 ${darkMode ? "text-gray-300" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                  {meetingSending ? (
                    <div className="flex flex-col items-center justify-center flex-1 w-full px-6">
                      <img src="/voice-effect.png" alt="로딩" className="w-14 h-14 rounded-full animate-flip-y flex-shrink-0" />
                      <p className={`text-[17px] font-semibold mt-5 mb-1 ${darkMode ? "text-white" : "text-[#191919]"}`}>나챗방으로 전송 중</p>
                      <MeetingLoadingText dark={darkMode} />
                    </div>
                  ) : meetingSaved ? (
                    <>
                      <div className="flex flex-col items-center">
                        {/* 저장 완료 아이콘 */}
                        <div className="w-14 h-14 rounded-full bg-[#FEE500] mb-5 flex items-center justify-center">
                          <svg className="w-7 h-7 text-[#191919]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {/* 저장 안내 문구 */}
                        <p className={`text-[17px] font-semibold mb-1 ${darkMode ? "text-white" : "text-[#191919]"}`}>
                          녹음이 저장되었습니다
                        </p>
                        <p className={`text-[14px] text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          톡클라우드에서 확인이 가능합니다
                        </p>
                      </div>
                      {/* 확인 + 채팅방으로 보내기 버튼 */}
                      <div className="flex gap-3 w-full">
                        <button
                          type="button"
                          className={`flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                          style={{ background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }}
                          onClick={() => { exitMeetingMode(); onClose(); }}
                        >
                          확인
                        </button>
                        <button
                          type="button"
                          className={`flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 ${darkMode ? "text-black" : "text-white"}`}
                          style={{ background: darkMode ? "#FEE500" : "#191919" }}
                          onClick={() => {
                            setMeetingSending(true);
                            const elapsed = meetingElapsed;
                            setTimeout(() => {
                              const sttText = "오늘 회의에서 논의된 주요 안건은 다음과 같습니다.\n\n1. 2분기 프로젝트 일정 확인 — 4월 초 킥오프 목표, 각 팀별 마일스톤 3월 말까지 확정 필요\n2. 디자인 리뷰 피드백 반영 — 메인 화면 카드 UI 간격 조정, 다크모드 컬러 톤 재검토. 채원님이 금요일까지 수정본 공유 예정\n3. 다음 주 목요일 중간 발표 준비 — 발표 자료는 민수님이 초안 작성, 슬라이드 15장 이내로. 리허설은 수요일 오후 3시\n4. QA 일정 조율 — 3월 넷째 주부터 내부 QA 시작, 외부 베타 테스트는 4월 둘째 주 예정. 지훈님이 테스트 케이스 정리 중\n5. 인프라 비용 최적화 — 현재 월 620만원 수준, 미사용 인스턴스 정리하면 15% 절감 가능. 은재님이 다음 주까지 리포트 작성\n6. 기타 — 신규 입사자 온보딩 가이드 업데이트 필요, 팀 워크숍 4월 셋째 주 금요일 오후로 잠정 확정";
                              if (onSendToMyChat) {
                                onSendToMyChat("음성 메시지", { duration: elapsed, sttText });
                              }
                              setMeetingSending(false);
                              exitMeetingMode();
                              onClose();
                            }, 3000);
                          }}
                        >
                          나챗방으로 보내기
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center">
                        {/* 녹음 표시 */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className={`w-3 h-3 rounded-full ${meetingRecording ? "bg-red-500 animate-pulse" : darkMode ? "bg-gray-500" : "bg-gray-400"}`} />
                          <p className={`text-[14px] font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                            {meetingRecording ? "녹음 중" : "대기 중"}
                          </p>
                        </div>
                        {/* 경과 시간 */}
                        <p className={`text-[48px] font-bold tabular-nums tracking-tight ${darkMode ? "text-white" : "text-[#191919]"}`}>
                          {formatElapsed(meetingElapsed)}
                        </p>
                      </div>
                      {/* 버튼들 */}
                      <div className="flex gap-3 w-full">
                        {!meetingRecording ? (
                          <>
                            <button
                              type="button"
                              className={`flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                              style={{ background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }}
                              onClick={() => exitMeetingMode()}
                            >
                              나가기
                            </button>
                            <button
                              type="button"
                              className="flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold text-white active:opacity-80"
                              style={{ background: "#FF3B30" }}
                              onClick={() => startMeetingRecording()}
                            >
                              {meetingPaused ? "녹음 재개" : "녹음 시작"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                              style={{ background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }}
                              onClick={() => stopMeetingRecording()}
                            >
                              중단
                            </button>
                            <button
                              type="button"
                              className="flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold text-white active:opacity-80"
                              style={{ background: "#34C759" }}
                              onClick={() => completeMeetingRecording()}
                            >
                              완료
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* ── 위시리스트 캐로셀 (giftResult, textMode에서 카드 상단에 표시) ── */}
              {giftResult && textMode && (
                <div className="w-full px-4 pt-4 pb-2 pointer-events-auto" style={{ flexShrink: 0 }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <SquircleAvatar src="/profile-haesu.png" alt="와이프 해수" className="w-8 h-8" />
                    <p className={`text-[14px] font-bold leading-tight ${darkMode ? "text-gray-100" : "text-gray-900"}`}>와이프의 위시리스트 🎁</p>
                  </div>
                  <div className="flex overflow-x-auto scrollbar-hide gap-3 pb-1">
                    {WISHLIST_ITEMS.map((item, i) => (
                      <div key={i} className="flex-shrink-0 w-[100px]">
                        <div
                          className="w-[80px] h-[80px] rounded-2xl mx-auto flex items-center justify-center text-[32px]"
                          style={{ background: item.color }}
                        >
                          {item.emoji}
                        </div>
                        <p className={`text-[12px] font-medium mt-1.5 leading-tight text-center truncate ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{item.name}</p>
                        <p className={`text-[11px] text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* ── 강아지 놀이터 카드 (normal flow, 레이어 높이 유연 확장) ── */}
              {choonsikCardView && !textMode && (
                <div className="flex items-center justify-center w-full pointer-events-auto px-4" style={{ paddingTop: 72, paddingBottom: 48 }}>
                  <img
                    src="/card-choonsik.png"
                    alt="춘식이"
                    style={{
                      width: 220,
                      height: 304,
                      objectFit: "cover",
                      borderRadius: 16,
                    }}
                  />
                </div>
              )}

              {/* ── 알림 & 일기 리스트 뷰 ── */}
              {notificationListView && !textMode && (
                <div className="w-full px-4 pt-10 pb-4 pointer-events-auto overflow-y-auto scrollbar-hide" style={{ maxHeight: keyboardOffset > 0 ? 660 - keyboardOffset : 660 }}>
                  {/* 로고 */}
                  <p className={`mb-3 ${darkMode ? "text-white" : "text-[#191919]"}`} style={{ marginLeft: 4, marginTop: -12 }}><img src="/voice-effect.png" alt="" className="inline-block w-[40px] h-[40px]" /></p>

                  {/* ── 탭 바: 오늘의 브리핑 / 오늘의 저널 ── */}
                  <div className="flex gap-3 mt-2 mb-3" style={{ marginLeft: 4 }}>
                    {(["briefing", "journal"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        className="text-[17px] pb-1 transition-colors duration-200"
                        style={{
                          fontWeight: journalTab === tab ? 800 : 700,
                          color: journalTab === tab ? (darkMode ? "#fff" : "#191919") : (darkMode ? "rgba(255,255,255,0.35)" : "#C0C0C0"),
                          borderBottom: "none",
                        }}
                        onClick={() => setJournalTab(tab)}
                      >
                        {tab === "briefing" ? "오늘의 브리핑" : "오늘의 저널"}
                      </button>
                    ))}
                  </div>

                  {/* ── 오늘의 브리핑 섹션 ── */}
                  {journalTab === "briefing" && (persona.id === "golf" ? [
                    { title: "골프 라운딩 일정", desc: <>오늘 아침 6시 춘천 라비에벨 CC에서 골프 약속이 있어요. 분당에서 약 2시간 소요되니 <span style={{ color: "#000000", fontWeight: 600 }}>4시에는 출발</span>하셔야 해요!</>, buttons: ["카카오 네비  소요시간 120분"], img: "/golf-cc.png" },
                    { title: "16°C", desc: "춘천 현재 기온 · 최고 16°C · 최저 4°C · 바람막이를 챙기세요.", buttons: [], icon: "wind" as const },
                    { title: "오늘의 복장 추천", desc: <>새벽 기온이 낮고 바람이 있어요. <span style={{ color: "#000000", fontWeight: 600 }}>기능성 바람막이 + 얇은 기모 이너 조합을 추천</span>드려요. 라운딩 후엔 기온이 올라가니 레이어드가 좋아요.</>, buttons: [], carousel: ["/golf-outfit-1.png", "/golf-outfit-2.png", "/golf-outfit-3.png"], shopIcon: true },
                    { title: "오후 미팅 안내", desc: <>돌아오시면 <span style={{ color: "#000000", fontWeight: 600 }}>오후 3시에 AI 전략 리뷰 미팅</span>이 있어요. 본관 12층 대회의실, 참석자 7명. 지난 회의록과 Q2 KPI 자료를 캔버스에 정리해 두었어요.</>, buttons: ["미팅 일정 2026년 AI 전략 리뷰"] },
                    { title: "💍 결혼기념일 리마인더", desc: <>오늘은 <span style={{ color: "#000000", fontWeight: 600 }}>25주년 결혼기념일</span>이에요! 라운딩 후 저녁 약속에 늦지 않도록 <span style={{ color: "#000000", fontWeight: 600 }}>오후 5시까지</span>는 돌아오셔야 해요. 해수님이 좋아하는 판교 스시이도 7시 예약을 잡아드릴까요?</>, buttons: ["레스토랑 예약하기", "선물 추천 보기"] },
                    { title: "기념일 선물 준비", desc: <>해수님의 최근 카톡 대화와 위시리스트를 분석했어요. <span style={{ color: "#000000", fontWeight: 600 }}>조말론 우드 세이지 앤 씨 솔트 향수</span>를 가장 많이 언급하셨어요. 카카오쇼핑 최저가 152,000원이에요.</>, buttons: ["카카오쇼핑 바로가기"] },
                  ] : persona.id === "shopping" ? [
                    { title: "오늘의 쇼핑 추천", desc: <>관심 등록한 <span style={{ color: "#000000", fontWeight: 600 }}>나이키 에어맥스 97이 15% 할인</span> 중이에요. 오늘 자정까지 한정 세일이에요!</>, buttons: ["카카오쇼핑 바로가기"], img: "/diary-photo-1.png" },
                    { title: "22°C", desc: "서울 현재 기온 · 최고 22°C · 최저 13°C · 가벼운 외투면 충분해요.", buttons: [], icon: "wind" as const },
                    { title: "스타일 추천", desc: <>오늘 날씨에 맞는 <span style={{ color: "#000000", fontWeight: 600 }}>봄 데일리룩 코디</span>를 준비했어요. 트렌디한 조합을 확인해 보세요!</>, buttons: [], carousel: ["/diary-photo-1.png", "/diary-photo-2.png", "/diary-photo-3.png"], shopIcon: true },
                    { title: "선물 리마인더", desc: <>다음 주 <span style={{ color: "#000000", fontWeight: 600 }}>친구 생일</span>이에요. 위시리스트에 담아둔 아이템으로 선물을 준비해 볼까요?</>, buttons: ["위시리스트 확인"] },
                    { title: "배송 현황", desc: <>어제 주문한 <span style={{ color: "#000000", fontWeight: 600 }}>무신사 패키지가 배송 중</span>이에요. 오후 3시쯤 도착 예정이에요.</>, buttons: ["배송 조회하기"] },
                  ] : [
                    { title: "저녁 약속", desc: <>오늘 <span style={{ color: "#000000", fontWeight: 600 }}>저녁 7시 강남역 근처</span>에서 대학 동기 모임이 있어요. 장소가 아직 미정이에요!</>, buttons: ["카카오맵 맛집 추천"], img: "/diary-photo-6.png" },
                    { title: "19°C", desc: "서울 현재 기온 · 최고 19°C · 최저 11°C · 저녁엔 쌀쌀해요, 겉옷 챙기세요.", buttons: [], icon: "wind" as const },
                    { title: "약속 준비", desc: <>모임 장소 후보 3곳을 <span style={{ color: "#000000", fontWeight: 600 }}>대학동기 단톡방</span>에 공유해 드릴까요? 투표로 정하면 편해요.</>, buttons: ["맛집 투표 만들기"] },
                    { title: "교통 안내", desc: <>분당에서 강남역까지 <span style={{ color: "#000000", fontWeight: 600 }}>약 40분 소요</span>돼요. 6시 20분에는 출발하세요!</>, buttons: ["카카오 네비  소요시간 40분"] },
                    { title: "모임 알림", desc: <><span style={{ color: "#000000", fontWeight: 600 }}>대학동기 단톡방</span>에 "오늘 저녁 7시 다들 올 수 있지?" 메시지를 보내드릴까요?</>, buttons: ["대학동기 단톡방에 메시지 보내기"] },
                  ]).map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-[16px] p-4 mb-2 ${darkMode ? "bg-white/8" : "bg-white/80"}`}
                      style={{ boxShadow: "0 0 3px rgba(0,0,0,0.06)", animation: `noti-fade-in 0.3s ease-out ${i * 0.06}s both` }}
                    >
                      {item.title && <p className={`mb-0.5 ${darkMode ? "text-white" : "text-[#191919]"}`} style={{ fontWeight: 700, fontSize: item.title.includes("°C") ? 24 : 14 }}>{item.title}</p>}
                      <div className="flex gap-3">
                        <p className={`flex-1 min-w-0 text-[13px] ${darkMode ? "text-gray-300" : "text-[#555555]"}`} style={{ lineHeight: 1.5 }}>{item.desc}</p>
                        {(item as { icon?: string }).icon === "wind" ? (
                          <div className="w-[42px] h-[42px] rounded-[8px] flex-shrink-0 flex items-center justify-center" style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "#EDF3F8" }}>
                            <svg className={darkMode ? "text-gray-300" : "text-[#5B9BD5]"} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17.7 7.7A2.5 2.5 0 1 1 19 12H2" />
                              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
                              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
                            </svg>
                          </div>
                        ) : item.img ? <img src={item.img} alt="" className="w-[42px] h-[42px] rounded-[8px] object-cover flex-shrink-0" /> : null}
                      </div>
                      {(item as { carousel?: string[] }).carousel && (
                        <div className="mt-2 -mx-1 overflow-x-auto scrollbar-hide">
                          <div className="flex gap-1.5 px-1" style={{ width: "max-content" }}>
                            {(item as { carousel?: string[] }).carousel!.map((src, ci) => (
                              <div key={ci} className="w-[104px] h-[104px] flex-shrink-0 rounded-[10px] overflow-hidden relative">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                                {(item as { shopIcon?: boolean }).shopIcon && (
                                  <div className="absolute bottom-[5px] right-[5px] w-[32px] h-[32px] rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                                    <svg width="20" height="20" viewBox="0 0 24 28" style={{ marginTop: -1 }} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="6" width="18" height="18" rx="2" />
                                      <path d="M16 12a4 4 0 0 1-8 0" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.buttons.length > 0 && (
                        <div className="flex gap-2 flex-wrap mt-2">
                          {item.buttons.map((label) => {
                            const naviMatch = label.match(/^(카카오 네비)\s+(.+)$/) || label.match(/^(미팅 일정)\s+(.+)$/) || label.match(/^(골프패밀리 단톡방에)\s+(.+)$/);
                            return (
                            <button
                              key={label}
                              type="button"
                              className={`px-3 h-[36px] rounded-full text-[13px] font-medium border ${darkMode ? "border-white/20 text-gray-200 bg-transparent" : "border-white bg-white"}`}
                              style={{ boxShadow: "0 0 3px rgba(0,0,0,0.06)" }}
                              onClick={() => {
                                setNotificationListView(false);
                                onNotiClose?.();
                                updateInputText(label);
                                setTextMode(true);
                                setTimeout(() => handleTextSend(), 50);
                              }}
                            >
                              {naviMatch ? (<><span style={{ color: "#000000", fontWeight: 600 }}>{naviMatch[1]}</span>{naviMatch[1] === "카카오 네비" ? <span style={{ color: "#4A8DF6", fontWeight: 700 }}> 소요시간 {naviMinutes}분</span> : <span style={{ color: "#4A8DF6", fontWeight: 600 }}> {naviMatch[2]}</span>}</>) : <span style={{ color: "#4A8DF6" }}>{label}</span>}
                            </button>
                          );})}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* ── 오늘의 저널 섹션 ── */}
                  {journalTab === "journal" && (persona.id === "golf" ? [
                    { title: "라운딩 스코어 기록", desc: "오늘 라비에벨 CC에서의 라운딩 스코어를 기록해 보세요. 지난달 평균 대비 퍼팅 성공률이 올라가고 있어요!", buttons: ["스코어 기록하기"], img: "/journal-golf.png" },
                    { title: "함께한 멤버 태그", desc: "오늘 골프패밀리 멤버들과 함께한 라운딩 사진을 정리해 드릴까요? 단톡방에 공유하기 좋게 앨범으로 만들어 드려요.", buttons: ["앨범 만들기"], carousel: ["/journal-cake.png", "/journal-birthday.jpg", "/journal-kids.jpg"] },
                    { title: "💍 기념일 저녁 준비 완료", desc: "판교 스시이도 7시 예약 확정, 조말론 향수 선물 포장 완료! 해수님에게 \"오늘 저녁 기대해도 좋아 😊\" 메시지를 보내드릴까요?", buttons: ["해수님에게 메시지 보내기"] },
                    { title: "다음 라운딩 예약", desc: "골프패밀리 멤버들이 다음 주말 라운딩을 원하고 있어요. 일정 투표를 만들어 볼까요?", buttons: ["일정 투표 만들기"], icon: "clock" as const },
                    { title: "오늘 하루 요약", desc: "새벽 라운딩 → 오후 미팅 → 저녁 결혼기념일 디너. 바쁘지만 알찬 하루였어요! 내일은 여유롭게 보내세요.", buttons: [], img: "/diary-photo-2.png" },
                  ] : persona.id === "shopping" ? [
                    { title: "오늘의 쇼핑 리뷰", desc: "오늘 구경한 아이템들을 정리했어요. 관심 목록에 추가해 둘까요?", buttons: ["위시리스트 정리"], img: "/diary-photo-4.png" },
                    { title: "가격 변동 알림", desc: "찜해둔 상품 3개의 가격이 변동됐어요. 최저가를 놓치지 마세요!", buttons: ["가격 비교 보기"], img: "/diary-photo-5.png" },
                    { title: "스타일 기록", desc: "오늘 마음에 들었던 코디를 저장해 두세요. 나만의 스타일북을 만들어 드릴게요.", buttons: ["스타일북 저장"], carousel: ["/diary-photo-1.png", "/diary-photo-2.png", "/diary-photo-3.png"] },
                    { title: "친구 추천 공유", desc: "관심 아이템을 친구들에게 공유해 보세요. 함께 쇼핑하면 더 즐거워요!", buttons: ["친구에게 추천하기"], profiles: ["/profile-dannion.png", "/profile-ieun.png"] },
                    { title: "포인트 현황", desc: "카카오페이 포인트 2,350원이 있어요. 다음 쇼핑에 활용하세요!", buttons: [], icon: "clock" as const },
                  ] : [
                    { title: "모임 후기 기록", desc: "오늘 대학 동기 모임은 어땠나요? 간단한 후기를 남겨보세요.", buttons: ["후기 작성하기"], img: "/diary-photo-4.png" },
                    { title: "사진 정리", desc: "오늘 모임에서 찍은 사진을 정리해 드릴까요? 단톡방에 공유하기 좋게 앨범을 만들어 드려요.", buttons: ["앨범 만들기"], carousel: ["/diary-photo-1.png", "/diary-photo-2.png", "/diary-photo-3.png", "/diary-photo-5.png"] },
                    { title: "감사 인사 전달", desc: "오늘 모임을 준비해준 친구에게 감사 인사를 보내보세요.", buttons: ["감사 메시지 보내기"], profiles: ["/profile-dannion.png", "/profile-yuna.png"] },
                    { title: "다음 약속 잡기", desc: "다음 모임 일정을 정해볼까요? 투표를 만들어 단톡방에 공유해 드릴게요.", buttons: ["일정 투표 만들기"], icon: "clock" as const },
                    { title: "맛집 기록", desc: "오늘 방문한 식당이 마음에 들었다면 카카오맵에 리뷰를 남겨보세요!", buttons: ["리뷰 남기기"], img: "/diary-photo-6.png" },
                  ]).map((item, i) => (
                    <div
                      key={i}
                      className={`rounded-[16px] p-4 mb-2 ${darkMode ? "bg-white/8" : "bg-white/80"}`}
                      style={{ boxShadow: "0 0 3px rgba(0,0,0,0.06)", animation: `noti-fade-in 0.3s ease-out ${i * 0.06}s both` }}
                    >
                      <p className={`text-[14px] mb-0.5 ${darkMode ? "text-white" : "text-[#191919]"}`} style={{ fontWeight: 700 }}>{item.title}</p>
                      <div className="flex gap-3">
                        <p className={`flex-1 min-w-0 text-[13px] leading-relaxed ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>{item.desc}</p>
                        {(item as { icon?: string }).icon === "clock" ? (
                          <div className="w-[42px] h-[42px] rounded-[8px] flex-shrink-0 flex items-center justify-center" style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "#EDF3F8" }}>
                            <svg className={darkMode ? "text-gray-300" : "text-[#5B9BD5]"} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                        ) : (item as { profiles?: string[] }).profiles ? (
                          <div className="flex -space-x-2 flex-shrink-0">
                            {(item as { profiles?: string[] }).profiles!.map((src, pi) => (
                              <div key={pi} className="w-[36px] h-[36px] p-[2px]" style={{ WebkitMaskImage: "url(/squircle.svg)", WebkitMaskSize: "cover", maskImage: "url(/squircle.svg)", maskSize: "cover", background: "white" }}>
                                <div className="w-full h-full" style={{ WebkitMaskImage: "url(/squircle.svg)", WebkitMaskSize: "cover", maskImage: "url(/squircle.svg)", maskSize: "cover" }}>
                                  <img src={src} alt="" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : item.img ? (
                          <img src={item.img} alt="" className="w-[42px] h-[42px] rounded-[8px] object-cover flex-shrink-0" />
                        ) : null}
                      </div>
                      {(item as { carousel?: string[] }).carousel && (
                        <div className="mt-2 -mx-1 overflow-x-auto scrollbar-hide">
                          <div className="flex gap-1.5 px-1" style={{ width: "max-content" }}>
                            {(item as { carousel?: string[] }).carousel!.map((src, ci) => (
                              <div key={ci} className="w-[104px] h-[104px] flex-shrink-0 rounded-[10px] overflow-hidden">
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap mt-2">
                        {item.buttons.map((label) => (
                          <button
                            key={label}
                            type="button"
                            className={`px-3 h-[36px] rounded-full text-[13px] font-medium border ${darkMode ? "border-white/20 text-gray-200 bg-transparent" : "border-white text-[#4A8DF6] bg-white"}`} style={{ boxShadow: "0 0 3px rgba(0,0,0,0.06)" }}
                            onClick={() => {
                              setNotificationListView(false);
                              onNotiClose?.();
                              updateInputText(label);
                              setTextMode(true);
                              setTimeout(() => handleTextSend(), 50);
                            }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}


                </div>
              )}

              {/* 빈영역 센터: 요약 결과 / 보이스 이펙트 / 로딩 스피너 (음성 모드일 때만) */}
              {(() => {
                const centerHidden = textMode || choonsikCardView || directionMode || darkmodeView || wishlistView || meetingMode || notificationListView;
                return (
              <div
                className={`flex flex-col items-center justify-center gap-1 overflow-hidden ${centerHidden ? "pointer-events-none" : "pointer-events-auto cursor-pointer"}`}
                style={{
                  // 대화 중 flex 레이아웃: 센터 0 → 채팅이 flex:1 차지
                  ...(popupLockedHeight && chatMessages.length > 0 ? { flex: 0, minHeight: 0 } : {}),
                  opacity: centerHidden ? 0 : 1,
                  maxHeight: centerHidden ? 0 : 400,
                  paddingTop: centerHidden ? 0 : 24,
                  paddingBottom: centerHidden ? 0 : 16,
                  transform: centerHidden ? "scale(0.96)" : "scale(1)",
                  transition: `opacity 0.2s ease-out, max-height 0.28s ease-out, padding 0.28s ease-out, transform 0.2s ease-out`,
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (centerHidden || ttsSpeaking || isLoading) return;
                  if (voiceStandby) {
                    setVoiceStandby(false);
                    doStart();
                  } else {
                    doStop();
                    setVoiceStandby(true);
                    setTranscript("");
                    setInterimText("");
                  }
                }}
              >
                {summaryResult ? (
                  /* ── 대화 요약 결과 (보낸/받은 메시지 형식) ── */
                  <div className="w-full pl-4 pr-3 pt-4 pb-2 overflow-y-auto max-h-full pointer-events-auto">
                    {summaryResult.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "user" ? (
                          <div className={AI_SENT_BUBBLE_CLASS} style={AI_SENT_BUBBLE_STYLE}>
                            {msg.text}
                          </div>
                        ) : (
                          <div className={`${AI_RECEIVED_BUBBLE_CLASS} ${darkMode ? "text-gray-100" : "text-[#191919]"}`} style={{ ...AI_RECEIVED_BUBBLE_STYLE, lineHeight: 1.65, wordBreak: "keep-all", whiteSpace: "pre-line" }}>
                            {msg.id === "sum-a-1" ? (
                              <>오늘 저녁 7시에 판교에서 만나기로 함. <span className="font-semibold">판교 스시이도 할인 쿠폰이 오늘까지라 집에 들러서 꼭 챙겨가야 함</span>. 해수가 회사 일이 늦게 끝나서 판교역 대신 사무실 앞으로 픽업하기로 함.</>
                            ) : (
                              msg.text
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : isLoading ? (
                  /* ── 로딩: 어시스턴트 로고 회전 ── */
                  <div className="relative w-[104px] h-[104px] flex items-center justify-center">
                    <img src="/voice-effect.png" alt="로딩" className="w-10 h-10 rounded-full animate-flip-y" />
                  </div>
                ) : (
                  /* ── 보이스 오브 이펙트 ── */
                  <div className={`relative ${ttsSpeaking ? "w-[120px] h-[120px]" : "w-[96px] h-[96px]"} transition-all duration-500`}>
                    <img
                      src="/voice-effect.png"
                      alt=""
                      className={`absolute inset-0 w-full h-full object-contain ${ttsSpeaking ? "animate-gradient-spin" : "animate-voice-breathe"}`}
                    />
                    {ttsSpeaking && (
                      <div className="absolute inset-0 rounded-full animate-glow-breathe" style={{ background: "radial-gradient(circle, rgba(255,83,138,0.3) 0%, transparent 70%)" }} />
                    )}
                  </div>
                )}
                {!summaryResult && !choonsikCardView && !ttsSpeaking && !isLoading && <p className="text-[17px] font-medium text-center px-6 max-w-full leading-relaxed"
                  style={{ color: isLoading ? (darkMode ? "#e5e5e5" : "#000000") : ttsSpeaking ? (darkMode ? "#ffffff" : "#000000") : statusMessage ? (statusMessage.includes("인식하지 못했어요") ? "#3b82f6" : "#FF538A") : (transcript || interimText) ? (darkMode ? "#ffffff" : "#000000") : (darkMode ? "#ffffff" : "#000000") }}
                >
                  {isLoading
                    ? (statusMessage || "처리 중...")
                    : ttsSpeaking
                      ? "브리핑을 읽어드리고 있어요"
                      : statusMessage
                        ? statusMessage
                        : transcript || interimText
                          ? <><span>{transcript}</span><span>{interimText}</span></>
                          : messageTargetRef.current ? `${messageTargetRef.current}님에게 보낼 메시지를 말씀해 주세요` : replyMode ? "와이프 해수에게 답장" : "듣고 있어요! 편하게 말씀해 주세요."}
                </p>}
              </div>
                );
              })()}
              {/* ── Direction 모드: 지도 UI (cross-fade) ── */}
              <div
                className="absolute inset-x-0 top-0 bottom-0 flex flex-col transition-opacity duration-500 z-20"
                style={{ opacity: directionMode ? 1 : 0, pointerEvents: directionMode ? "auto" : "none" }}
              >
                {!navActive && !navArrived && (
                  /* ── Phase 1: 경로 미리보기 ── */
                  <>
                    <div className="px-5 pt-5 pb-3">
                      <p className={`text-[17px] font-bold leading-snug ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{directionDest}으로 가는 길을 찾았습니다</p>
                      <p className={`text-[14px] mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>예상 소요 시간: 약 23분 · 12.4km</p>
                    </div>
                    <div className="mx-4 flex-1 rounded-2xl overflow-hidden relative" style={{ minHeight: 160 }}>
                      <img src="/map-pangyo.png" alt="판교역 지도" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                    <div className="px-4 pt-3 pb-4 flex gap-3">
                      <button
                        type="button"
                        className="flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold text-gray-700 active:opacity-80"
                        style={{ background: "rgba(0,0,0,0.14)" }}
                        onClick={() => { setDirectionMode(false); setDirectionDest(""); onClose(); }}
                      >
                        카카오맵
                      </button>
                      <button
                        type="button"
                        className="flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold text-black active:opacity-80"
                        style={{ background: "#fee500" }}
                        onClick={startNavigation}
                      >
                        길찾기
                      </button>
                    </div>
                  </>
                )}

                {navActive && !navArrived && (() => {
                  const step = NAV_STEPS[navStep];
                  const nextStep = NAV_STEPS[navStep + 1];
                  const currentX = nextStep
                    ? step.markerX + (nextStep.markerX - step.markerX) * navProgress
                    : step.markerX;
                  const currentY = nextStep
                    ? step.markerY + (nextStep.markerY - step.markerY) * navProgress
                    : step.markerY;
                  const remaining = NAV_STEPS.slice(navStep).reduce((s, st) => s + st.distance, 0) - step.distance * navProgress;
                  const remainingKm = (Math.max(0, remaining) / 1000).toFixed(1);
                  const remainingMin = Math.max(1, Math.ceil((Math.max(0, remaining) / TOTAL_NAV_DISTANCE) * 23));
                  const iconMap: Record<string, React.ReactNode> = {
                    straight: (
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-4 4m4-4l4 4" />
                      </svg>
                    ),
                    left: (
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19V10.5a2.5 2.5 0 012.5-2.5H19m-9 0l-4-4m4 4L6 12" />
                      </svg>
                    ),
                    right: (
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 19V10.5a2.5 2.5 0 00-2.5-2.5H5m9 0l4-4m-4 4l4 4" />
                      </svg>
                    ),
                    arrive: (
                      <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    ),
                  };
                  return (
                    /* ── Phase 2: 턴바이턴 주행 ── */
                    <>
                      {/* 안내 카드 */}
                      <div className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "#3478F6" }}>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                          {iconMap[step.icon]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[16px] font-bold text-white leading-snug">{step.instruction}</p>
                          {step.road && <p className="text-[13px] text-white/70 mt-0.5">{step.road}</p>}
                        </div>
                      </div>
                      {/* 지도 + 마커 */}
                      <div className="mx-4 mt-3 flex-1 rounded-2xl overflow-hidden relative" style={{ minHeight: 140 }}>
                        <img src="/map-pangyo.png" alt="판교역 지도" className="absolute inset-0 w-full h-full object-cover" />
                        {/* 펄스 링 */}
                        <div
                          className="absolute w-5 h-5 rounded-full bg-[#3478F6]/30 animate-nav-pulse"
                          style={{
                            left: `${currentX}%`,
                            top: `${currentY}%`,
                            transform: "translate(-50%, -50%)",
                            pointerEvents: "none",
                          }}
                        />
                        {/* 위치 마커 */}
                        <div
                          className="absolute w-4 h-4 rounded-full bg-[#3478F6] border-2 border-white"
                          style={{
                            left: `${currentX}%`,
                            top: `${currentY}%`,
                            transform: "translate(-50%, -50%)",
                            transition: `left ${step.duration}ms linear, top ${step.duration}ms linear`,
                            boxShadow: "0 2px 6px rgba(52,120,246,0.4)",
                            pointerEvents: "none",
                          }}
                        />
                      </div>
                      {/* 남은 거리/시간 */}
                      <div className="mx-4 mt-3 flex items-center justify-center gap-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span className="text-[14px] font-semibold text-gray-800">남은 거리 {remainingKm}km</span>
                        </div>
                        <div className="w-px h-3 bg-gray-300" />
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[14px] font-semibold text-gray-800">도착 예정 {remainingMin}분</span>
                        </div>
                      </div>
                      {/* 안내 종료 */}
                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          className="w-full h-[44px] rounded-[40px] text-[15px] font-semibold text-gray-700 active:opacity-80"
                          style={{ background: "rgba(0,0,0,0.14)" }}
                          onClick={finishNavigation}
                        >
                          안내 종료
                        </button>
                      </div>
                    </>
                  );
                })()}

                {navArrived && (
                  /* ── Phase 3: 도착 ── */
                  <>
                    {/* 도착 카드 */}
                    <div className="mx-4 mt-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(0,0,0,0.04)" }}>
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold text-gray-900 leading-snug">목적지에 도착했습니다</p>
                        {directionDest && <p className="text-[13px] text-gray-500 mt-0.5">{directionDest}</p>}
                      </div>
                    </div>
                    {/* 지도 + 도착 마커 고정 */}
                    <div className="mx-4 mt-3 flex-1 rounded-2xl overflow-hidden relative" style={{ minHeight: 140 }}>
                      <img src="/map-pangyo.png" alt="판교역 지도" className="absolute inset-0 w-full h-full object-cover" />
                      {/* 도착 마커 */}
                      <div
                        className="absolute w-6 h-6 rounded-full bg-[#34C759] border-2 border-white flex items-center justify-center"
                        style={{
                          left: `${NAV_STEPS[NAV_STEPS.length - 1].markerX}%`,
                          top: `${NAV_STEPS[NAV_STEPS.length - 1].markerY}%`,
                          transform: "translate(-50%, -50%)",
                          boxShadow: "0 2px 6px rgba(52,199,89,0.4)",
                        }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    {/* 총 소요 정보 */}
                    <div className="mx-4 mt-3 flex items-center justify-center py-2">
                      <span className="text-[14px] text-gray-500">총 12.4km · 23분 소요</span>
                    </div>
                    {/* 완료 버튼 */}
                    <div className="px-4 pb-4">
                      <button
                        type="button"
                        className="w-full h-[44px] rounded-[40px] text-[15px] font-semibold text-gray-700 active:opacity-80"
                        style={{ background: "rgba(0,0,0,0.14)" }}
                        onClick={finishNavigation}
                      >
                        완료
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ── Darkmode 모드: 토글 UI (cross-fade) ── */}
              <div
                className="absolute inset-x-0 top-0 bottom-0 flex flex-col z-20"
                style={{ opacity: darkmodeView ? 1 : 0, pointerEvents: darkmodeView ? "auto" : "none", transition: darkmodeView ? "opacity 0.35s ease" : "opacity 0.3s ease" }}
              >
                <div className="flex flex-col gap-3 px-5 pt-5">
                  {/* 아이콘 + 타이틀 가로 정렬 */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-colors duration-500"
                      style={{ background: darkMode ? "#ffe500" : "#1c1c1e" }}
                    >
                      {darkMode ? (
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-[17px] font-bold leading-tight transition-colors duration-500 ${darkMode ? "text-gray-100" : "text-gray-900"}`}>다크 모드</p>
                      <p className={`text-[13px] mt-0.5 transition-colors duration-500 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>화면을 어둡게 전환합니다</p>
                    </div>
                  </div>
                  {/* 토글 — button role="switch", onClick만 사용 (onTouchEnd 제거로 double-fire 방지) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={darkMode}
                    aria-label={`다크 모드 ${darkMode ? "끄기" : "켜기"}`}
                    className="flex items-center justify-between w-full px-4 py-3 rounded-2xl cursor-pointer select-none relative transition-colors duration-500"
                    style={{ background: darkMode ? "rgba(0,0,0,0.16)" : "rgba(0,0,0,0.04)", zIndex: 30 }}
                    onClick={() => onDarkModeToggle(!darkMode)}
                  >
                    <span className={`text-[16px] font-medium transition-colors duration-500 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                      {darkMode ? "켜짐" : "꺼짐"}
                    </span>
                    <div
                      className="relative w-[52px] h-[32px] rounded-full transition-colors duration-300"
                      style={{ background: darkMode ? "#ffe500" : "rgba(156,163,175,0.6)", boxShadow: "inset 0 0 0 1px rgba(25,25,25,0.04)" }}
                    >
                      <div
                        className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-transform duration-300 flex items-center justify-center"
                        style={{ transform: darkMode ? "translateX(23px)" : "translateX(3px)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                      >
                        {darkMode ? (
                          <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
                {/* 완료 버튼 */}
                <div style={{ padding: "16px 16px 16px 16px" }}>
                  <button
                    type="button"
                    className={`w-full h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 transition-colors duration-500 ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                    style={{ background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }}
                    onClick={() => { setDarkmodeView(false); onClose(); }}
                  >
                    완료
                  </button>
                </div>
              </div>

              {/* ── Wishlist 모드: 위시리스트 뷰 (모든 phase 동시 렌더, opacity+position 전환) ── */}
              {wishlistView && (
                <div className="relative overflow-hidden">
                  {/* Phase: product */}
                  <div
                    style={{
                      opacity: wishlistPhase === "product" ? 1 : 0,
                      position: wishlistPhase === "product" ? "relative" : "absolute",
                      top: 0, left: 0, right: 0,
                      transition: "opacity 0.3s ease",
                      pointerEvents: wishlistPhase === "product" ? "auto" : "none",
                    }}
                  >
                      {/* Header: 프로필 + 위시리스트 */}
                      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
                        <SquircleAvatar src="/profile-haesu.png" alt="와이프 해수" className="w-9 h-9" />
                        <p className={`text-[15px] font-bold leading-tight ${darkMode ? "text-gray-100" : "text-gray-900"}`}>와이프의 위시리스트</p>
                      </div>

                      {/* Product card */}
                      <div className={`mx-4 border rounded-2xl p-3.5 flex gap-3.5 backdrop-blur-sm ${darkMode ? "border-white/10 bg-white/10" : "border-white/40 bg-white/40"}`}>
                        <img
                          src={GIFT_PRODUCT.image}
                          alt={GIFT_PRODUCT.name}
                          className="w-[88px] h-[88px] rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[14px] font-semibold leading-tight ${darkMode ? "text-gray-100" : "text-[#191919]"}`}>
                            {GIFT_PRODUCT.name}
                          </p>
                          <p className={`text-[12px] mt-1 ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>
                            옵션: {GIFT_PRODUCT.option}
                          </p>
                          <p className="text-[12px] text-[#2B7FF2] mt-1.5 font-medium">
                            후기 {GIFT_PRODUCT.reviewCount}건 중 매우만족 {GIFT_PRODUCT.satisfactionPct}%
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`text-[12px] line-through ${darkMode ? "text-gray-500" : "text-[#999]"}`}>
                              {GIFT_PRODUCT.originalPrice.toLocaleString()}원
                            </span>
                            <span className={`text-[15px] font-bold ${darkMode ? "text-gray-100" : "text-[#191919]"}`}>
                              {GIFT_PRODUCT.salePrice.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Recommendation reason */}
                      <p className={`mx-4 mt-3 text-[15px] leading-relaxed ${darkMode ? "text-gray-200" : "text-[#000000]"}`}>
                        사모님께서 카톡 대화에서 자주 언급하신 상품이에요. 결혼 25주년 기념일 선물로 만족도가 높을 거예요!
                      </p>

                      {/* Buttons */}
                      <div className="px-4 pt-4 pb-4 flex gap-3">
                        <button
                          type="button"
                          className={`flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold active:opacity-80 transition-colors ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                          style={{ background: darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)" }}
                          onClick={() => { setWishlistView(false); setGiftResult(null); setWishlistPhase("product"); onClose(); }}
                        >
                          선물하기 홈
                        </button>
                        <button
                          type="button"
                          className="flex-1 h-[44px] rounded-[40px] text-[15px] font-semibold text-black active:opacity-80 transition-colors"
                          style={{ background: "#FEE500" }}
                          onClick={() => {
                            setWishlistPhase("loading");
                            setTimeout(() => setWishlistPhase("complete"), 3000);
                          }}
                        >
                          결제하기
                        </button>
                      </div>
                  </div>

                  {/* Phase: loading */}
                  <div
                    style={{
                      opacity: wishlistPhase === "loading" ? 1 : 0,
                      position: wishlistPhase === "loading" ? "relative" : "absolute",
                      top: 0, left: 0, right: 0,
                      transition: "opacity 0.3s ease",
                      pointerEvents: wishlistPhase === "loading" ? "auto" : "none",
                    }}
                  >
                    <LoadingMessages dark={darkMode} />
                  </div>

                  {/* Phase: complete */}
                  <div
                    className="flex flex-col items-center text-center px-5 pt-8 pb-4"
                    style={{
                      opacity: wishlistPhase === "complete" ? 1 : 0,
                      position: wishlistPhase === "complete" ? "relative" : "absolute",
                      top: 0, left: 0, right: 0,
                      transition: "opacity 0.3s ease",
                      pointerEvents: wishlistPhase === "complete" ? "auto" : "none",
                    }}
                  >
                      <div className="w-[56px] h-[56px] rounded-full bg-[#FEE500] flex items-center justify-center mb-4">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#191919" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <p className={`text-[16px] font-semibold ${darkMode ? "text-gray-100" : "text-[#191919]"}`}>
                        선물하기를 완료했어요
                      </p>
                      <p className={`text-[14px] mt-2 leading-relaxed ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>
                        결제 정보는 카카오페이 알림톡으로<br />알려드릴게요.
                      </p>
                      <div className="mt-6 flex gap-3 w-full">
                        <button
                          type="button"
                          className={`flex-1 h-[44px] rounded-[40px] text-[14px] font-semibold active:bg-[#333] transition-colors ${darkMode ? "text-black bg-[#FEE500]" : "text-white bg-[#191919]"}`}
                          onClick={() => { setWishlistView(false); setWishlistPhase("product"); setGiftResult(null); onClose(); }}
                        >
                          확인
                        </button>
                      </div>
                  </div>
                </div>
              )}

              {/* ── 채팅 메시지 리스트 (textMode 시 항상 마운트, 센터 접힘과 동기화) ── */}
              {textMode && !directionMode && !darkmodeView && !wishlistView && (
                <div
                  className="overflow-hidden"
                  style={{
                    flex: chatMessages.length > 0 ? 1 : 0, minHeight: 0, maxHeight: chatMessages.length > 0 ? "none" : 0, transition: "flex 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
                  }}
                >
                  <div
                    ref={chatScrollRef}
                    className="overflow-y-auto scrollbar-hide pl-4 pr-3 pt-4 pb-2"
                    style={{ height: "100%" }}
                  >
                  {/* 상단부터 시작: 유저 메시지 → 스켈레톤 → AI 응답 순서로 위에서 아래로 쌓임 */}
                  <div className="flex flex-col justify-start">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex mb-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "user" ? (
                        <div className="flex flex-col items-end gap-2">
                          {msg.image && (
                            <img src={msg.image} alt="" className="w-[160px] h-[160px] rounded-[16px] object-cover" />
                          )}
                          <div className={AI_SENT_BUBBLE_CLASS} style={AI_SENT_BUBBLE_STYLE}>
                            {msg.text}
                          </div>
                        </div>
                      ) : (() => {
                        const isTyping = msg.id === typingMessageId;
                        const fullChars = Array.from(msg.text);
                        const typedCount = isTyping ? typingDisplayedLength : fullChars.length;
                        const quoteMatch = msg.text.match(/💬\s*"([^"]+)"/);
                        const isTypingDone = !isTyping;
                        // [btn:라벨] 마커 추출
                        const btnMatches = msg.text.match(/\[btn:([^\]]+)\]/g);
                        const btnLabels = btnMatches?.map(b => b.replace(/\[btn:|\]/g, "")) || [];
                        const cleanText = msg.text.replace(/\n?\[btn:[^\]]+\]/g, "");
                        const cleanChars = Array.from(cleanText);
                        const cleanDisplayText = cleanChars.slice(0, typedCount).join("");
                        const isCircleActive = circleActiveId === msg.id;
                        return (
                          <div className="flex flex-col items-start gap-2">
                            <div
                              ref={(el) => { if (el) circleBubbleRefs.current.set(msg.id, el); }}
                              className={`${AI_RECEIVED_BUBBLE_CLASS} ${darkMode ? "text-gray-100" : "text-[#191919]"}`}
                              style={{
                                ...AI_RECEIVED_BUBBLE_STYLE,
                                position: "relative",
                                lineHeight: 1.65,
                                wordBreak: isTyping ? "normal" : "keep-all",
                                overflowWrap: isTyping ? "anywhere" : "normal",
                                whiteSpace: isTyping ? "normal" : "pre-line",
                              }}
                              onPointerDown={(ev) => {
                                if (isTyping || isCircleActive) return;
                                longPressTimerRef.current = setTimeout(() => {
                                  ev.preventDefault();
                                  setCircleActiveId(msg.id);
                                }, 500);
                              }}
                              onPointerUp={() => {
                                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                              }}
                              onPointerCancel={() => {
                                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
                              }}
                            >
                              {isTyping ? cleanDisplayText : renderChatWithBold(cleanText)}
                              {isCircleActive && (
                                <CircleToSearchOverlay
                                  bubbleRef={{ current: circleBubbleRefs.current.get(msg.id) || null }}
                                  darkMode={darkMode}
                                  onAction={(text, action) => {
                                    setCircleActiveId(null);
                                    if (action === "interpret") {
                                      sendChatMessage(`"${text}" 해석해줘`);
                                    } else if (action === "shop") {
                                      sendChatMessage(`${text} 검색해줘`);
                                    } else if (action === "reserve") {
                                      sendChatMessage(`${text} 예약해줘`);
                                    } else if (action === "transfer") {
                                      sendChatMessage(`${text} 송금해줘`);
                                    }
                                  }}
                                  onDismiss={() => setCircleActiveId(null)}
                                />
                              )}
                            </div>
                            {btnLabels.length > 0 && isTypingDone && (
                              <div className="flex gap-2 ml-[14px] flex-wrap">
                                {btnLabels.map((label) => (
                                  <button
                                    key={label}
                                    type="button"
                                    className={`px-4 h-[40px] rounded-full text-[13px] font-semibold active:opacity-70 ${darkMode ? "bg-white/15 text-gray-200" : "bg-[#F0F0F0] text-[#191919]"}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sendChatMessage(label);
                                    }}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            )}
                            {quoteMatch && isTypingDone && onSendReply && (
                              <div className="flex items-center gap-2 ml-[14px]">
                                <button
                                  type="button"
                                  className={`flex items-center gap-1.5 px-4 h-[40px] rounded-full text-[13px] font-semibold active:opacity-70 ${darkMode ? "bg-[#FEE500] text-[#191919]" : "bg-[#FEE500] text-[#191919]"}`}
                                  style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSendReply(quoteMatch[1]);
                                    onClose();
                                  }}
                                >
                                  이 메시지 보내기
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  className={`w-[40px] h-[40px] rounded-full flex items-center justify-center active:opacity-70 ${darkMode ? "bg-white/50" : "bg-white/50"}`}
                                  style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    sendChatMessage("다음에 뭐라고할까?");
                                  }}
                                >
                                  <svg className={`w-[18px] h-[18px] ${darkMode ? "text-white" : "text-[#191919]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  {/* AI 응답 로딩 스켈레톤 — 사용자 메시지 바로 아래 */}
                  {aiTyping && (
                    <div className="flex justify-start mb-3">
                      <div className="py-2 ml-[12px]">
                        <img src="/voice-effect.png" alt="로딩" className="w-[32px] h-[32px] rounded-full animate-flip-y flex-shrink-0" />
                      </div>
                    </div>
                  )}
                  </div>
                  </div>
                </div>
              )}

              <div
                className="px-4 transition-all duration-[280ms] relative"
                style={{ flexShrink: 0, paddingTop: getBottomPaddingTop(), paddingBottom: getBottomPaddingBottom(), height: (wishlistView || meetingMode || notificationListView) ? 0 : "auto", overflow: (wishlistView || meetingMode || notificationListView) ? "hidden" : "visible", opacity: (directionMode || darkmodeView || wishlistView || meetingMode || notificationListView) ? 0 : 1, pointerEvents: (directionMode || darkmodeView || wishlistView || meetingMode || notificationListView) ? "none" : "auto", transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
              >
                {/* ── 자동완성 알약 (입력창 위에 플로팅) ── */}
                {(() => {
                  const suggestions = textMode && inputText.trim().length >= 1 && !textSending && !sendStatus && !aiTyping && chatMessages.length === 0
                    ? getAutocompleteSuggestions(inputText.trim())
                    : [];
                  if (suggestions.length === 0) return null;
                  return (
                    <div
                      className="absolute left-0 right-0 px-4 z-10"
                      style={{ bottom: "100%", paddingBottom: 8, animation: "noti-fade-in 0.15s ease-out" }}
                    >
                      <div className="flex gap-[6px] overflow-x-auto scrollbar-hide">
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`flex-shrink-0 h-[34px] rounded-full text-[13px] font-medium whitespace-nowrap px-[14px] active:scale-95 transition-transform backdrop-blur-[20px] ${
                              darkMode
                                ? "text-gray-200 bg-white/15 border border-white/10"
                                : "text-[#191919] bg-white/80 border border-white/60"
                            }`}
                            style={{ boxShadow: darkMode ? "none" : "0 2px 8px rgba(0,0,0,0.08)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateInputText("");
                              sendChatMessage(s);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                {/* ── 추천 칩 (초기 음성 모드에서만 표시) ── */}
                {!directionMode && !darkmodeView && !wishlistView && (() => {
                  const chipsVisible = !textMode && !choonsikCardView && !summaryResult && !giftResult && !isLoading && !statusMessage && !transcript && !interimText;
                  return (
                  <div
                    className="overflow-hidden"
                    style={{
                      opacity: chipsVisible ? 1 : 0,
                      maxHeight: chipsVisible ? 80 : 0,
                      transition: "opacity 0.2s ease-out, max-height 0.28s ease-out",
                    }}
                  >
                  <div className="flex gap-[6px] overflow-x-auto scrollbar-hide pt-1 pb-3">
                    {getSuggestionsForContext(suggestContext, chatPartnerName, chatProductSuggestions, persona.id, aiSuggestions).map((t) => {
                      let text = t === "다크모드 켜줘" ? (darkMode ? "다크모드 꺼줘" : "다크모드 켜줘") : t;
                      if ((suggestContext === "chat-room" || suggestContext === "chat-room-new") && text.includes("이해수") && chatPartnerName) {
                        text = text.replace("이해수", chatPartnerName);
                      }
                      return text;
                    }).map((text, i) => (
                      <button
                        key={`${text}-${i}`}
                        type="button"
                        className={`flex-shrink-0 relative overflow-hidden h-[40px] rounded-full text-[14px] font-medium whitespace-nowrap transition-colors backdrop-blur-[30px] flex items-center px-[14px] ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                        style={darkMode
                          ? {
                              background: "rgba(255,255,255,0.12)",
                              border: "1px solid rgba(255,255,255,0.12)",
                            }
                          : {
                              background: "radial-gradient(ellipse 100% 80% at 0% 0%, rgba(255,255,255,0.7) 0%, transparent 55%), rgba(255,255,255,0.5)",
                              border: "1px solid rgba(255,255,255,0.6)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                            }
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (text === "성수동 뚜흐느솔로" && onChipPlaceClick) {
                            setTextSending(true);
                            setLoadingMessage("장소 불러오는 중");
                            setTimeout(() => {
                              onChipPlaceClick();
                            }, 800);
                            return;
                          }
                          updateInputText(text);
                          setTextMode(true);
                          handleTextSend();
                        }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                  </div>
                  );
                })()}
                <div
                  className={`flex items-center gap-2 px-2 h-[44px] rounded-[40px] ${darkMode ? "bg-[#3a3a3c]" : ""}`}
                  style={darkMode ? { boxShadow: "0 0 6px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.2)" } : { backgroundColor: "rgba(255,255,255,0.96)", boxShadow: "0 0 6px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(255,255,255,1)" }}
                  onClick={() => {
                    if (!textSending && !sendStatus) {
                      setTextMode(true);
                      inputRef.current?.focus({ preventScroll: true });
                    }
                  }}
                >
                  <button
                    type="button"
                    className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)", marginLeft: -4 }}
                    aria-label={ttsSpeaking || isLoading || (textMode && chatMessages.length > 0) ? "닫기" : "더보기"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ttsSpeaking || isLoading) {
                        // TTS/응답 중단 → 음성 모드 복귀 (마이크 켜짐)
                        if (ttsAudioRef.current) {
                          ttsAudioRef.current.pause();
                          ttsAudioRef.current.currentTime = 0;
                          ttsAudioRef.current = null;
                        }
                        setTtsSpeaking(false);
                        setIsLoading(false);
                        setStatusMessage(null);
                        pendingVoiceMsgsRef.current = null;
                        messageTargetRef.current = null;
                        setChatMessages([]);
                        setVoiceStandby(true); // 마이크 OFF로 복귀
                      } else if (textMode && (chatMessages.length > 0 || aiTyping)) {
                        chatRequestIdRef.current++; // stale API 응답 무시
                        setChatMessages([]);
                        setTextMode(false);
                        setChoonsikCardView(false);
                        updateInputText("");
                        setTypingMessageId(null);
                        setTypingDisplayedLength(0);
                        setAiTyping(false);
                        setCircleActiveId(null);
                        inputRef.current?.blur();
                      } else {
                        setPlusMenuOpen((prev) => !prev);
                      }
                    }}
                  >
                    <svg className={`w-5 h-5 transition-transform duration-300 ${darkMode ? "text-white" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ transform: ttsSpeaking || isLoading || (textMode && chatMessages.length > 0) || plusMenuOpen ? "rotate(45deg)" : "rotate(0deg)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {textSending && (
                    <img src="/voice-effect.png" alt="로딩" className="w-[24px] h-[24px] rounded-full animate-flip-y flex-shrink-0" />
                  )}
                  <label className="flex-1 min-w-0 cursor-text">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="none"
                      enterKeyHint="send"
                      name="aimsg"
                      role="presentation"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      aria-autocomplete="none"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      value={inputText}
                      placeholder={sendStatus ? sendStatus : textSending ? (loadingMessage || "처리 중...") : giftResult ? `${giftResult}에게 선물 메시지 보내기` : messageTargetRef.current ? `${messageTargetRef.current}님에게 보낼 메시지 입력...` : replyMode ? "이해수에게 답장" : "카나나에게 요청하기"}
                      className={`w-full text-base outline-none bg-transparent ${darkMode ? "text-gray-100" : "text-gray-900"} ${sendStatus ? (darkMode ? "placeholder:text-white" : "placeholder:text-black") : textSending ? (darkMode ? "placeholder:text-white" : "placeholder:text-black") : (darkMode ? "placeholder:text-gray-400" : "placeholder:text-gray-900/40")}`}
                      style={{ fontSize: "16px" }}
                      disabled={textSending || !!sendStatus}
                      onFocus={() => { setTextMode(true); setAiKbVisible(true); }}
                      onChange={(e) => updateInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.nativeEvent.isComposing) {
                            const input = e.currentTarget;
                            const sendAfterComposition = () => {
                              input.removeEventListener("compositionend", sendAfterComposition);
                              handleTextSend();
                            };
                            input.addEventListener("compositionend", sendAfterComposition, { once: true });
                          } else {
                            handleTextSend();
                          }
                        }
                      }}
                    />
                  </label>
                  {/* TTS 온오프 버튼 — AI 답변이 있을 때만 표시 */}
                  {chatMessages.some(m => m.role === "ai") && (
                    <button
                      type="button"
                      className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-colors active:scale-95 ${ttsSpeaking ? "bg-[#FEE500]" : (darkMode ? "bg-white/15" : "bg-black/5")}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTts();
                      }}
                      aria-label={ttsSpeaking ? "읽기 중지" : "읽어주기"}
                    >
                      {ttsSpeaking ? (
                        <svg className="w-[15px] h-[15px] text-[#191919]" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="5" width="4" height="14" rx="1" />
                          <rect x="14" y="5" width="4" height="14" rx="1" />
                        </svg>
                      ) : (
                        <svg className={`w-[15px] h-[15px] ${darkMode ? "text-white" : "text-[#555]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H2v6h4l5 4V5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.54 8.46a5 5 0 010 7.07" />
                        </svg>
                      )}
                    </button>
                  )}
                  {(textMode || replyMode) && inputText.trim() ? (
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full flex-shrink-0 mr-[-4px] flex items-center justify-center bg-black"
                      aria-label="보내기"
                      disabled={textSending || !!sendStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (textSending || sendStatus) return;
                        handleTextSend();
                      }}
                    >
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full flex-shrink-0 mr-[-4px] flex items-center justify-center transition-transform duration-200 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #FF538A, #E91E8A)" }}
                      aria-label={textMode ? "음성 입력" : "텍스트 입력"}
                      disabled={textSending || !!sendStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (textSending || sendStatus) return;
                        if (textMode) {
                          setChatMessages([]);
                          setTextMode(false);
                          setChoonsikCardView(false);
                          updateInputText("");
                          setTypingMessageId(null);
                          setAiTyping(false);
                          setTranscript("");
                          setInterimText("");
                          setStatusMessage(null);
                          inputRef.current?.blur();
                          setVoiceStandby(true);
                        } else {
                          setTextMode(true);
                          inputRef.current?.focus({ preventScroll: true });
                        }
                      }}
                    >
                      <span className="relative inline-flex items-center justify-center w-5 h-5">
                        <svg
                          className={`absolute w-5 h-5 text-white transition-opacity duration-300 ${textMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                        </svg>
                        <span
                          className={`absolute text-white text-[16px] font-bold leading-none transition-opacity duration-300 ${!textMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                          aria-hidden
                        >
                          T
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* /카드 본체 */}
        </div>
        {/* /relative */}
      </motion.div>

      </>

      {/* 강아지 놀이터 풀스크린 오버레이 제거됨 — 카드 본체 안에서 표시 */}

      {/* ── 플러스 메뉴 팝업 (팝업 위에 뜨는 별도 레이어) ── */}
      {plusMenuOpen && (
        <>
          <div
            className="absolute inset-0"
            style={{ zIndex: 70, pointerEvents: "auto" }}
            onClick={(e) => { e.stopPropagation(); setPlusMenuOpen(false); }}
          />
          <div
            className="absolute"
            style={{ left: 28, bottom: 80 + keyboardOffset, zIndex: 71, pointerEvents: "auto" }}
          >
            <div
              className={`rounded-[20px] overflow-hidden ai-layer-blur ${darkMode ? "dark" : ""}`}
              style={{
                boxShadow: darkMode
                  ? "0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.12)"
                  : "0 8px 32px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.8)",
                animation: "gift-card-enter 0.2s cubic-bezier(0.32, 0.72, 0, 1) forwards",
              }}
            >
              <div className="py-2">
                {[
                  { label: "음성녹음", action: () => { setPlusMenuOpen(false); setMeetingMode(true); }, icon: (<svg className={`w-[22px] h-[22px] ${darkMode ? "text-gray-200" : "text-[#191919]"}`} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.5" fill="currentColor" /><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth={1.6} /></svg>) },
                  { label: "번역", action: () => { setPlusMenuOpen(false); }, icon: (<svg className={`w-[22px] h-[22px] ${darkMode ? "text-gray-200" : "text-[#191919]"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" /></svg>) },
                  { label: "파일첨부", action: () => { setPlusMenuOpen(false); }, icon: (<svg className={`w-[22px] h-[22px] ${darkMode ? "text-gray-200" : "text-[#191919]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a5.64 5.64 0 01-7.98-7.98l9.19-9.19a3.76 3.76 0 015.32 5.32l-9.2 9.19a1.88 1.88 0 01-2.66-2.66l8.49-8.48" /></svg>) },
                ].map((item, i, arr) => (
                  <div key={i}>
                    <button
                      type="button"
                      className={`w-full flex items-center gap-3 px-5 py-3 active:opacity-70 ${darkMode ? "text-white" : "text-[#191919]"}`}
                      onClick={(e) => { e.stopPropagation(); item.action(); }}
                    >
                      {item.icon}
                      <span className="text-[15px] font-medium">{item.label}</span>
                    </button>
                    {i < arr.length - 1 && (
                      <div className={`mx-5 h-px ${darkMode ? "bg-white/10" : "bg-black/[0.06]"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* iOS 26 가상 키보드 */}
      <div className="absolute bottom-0 left-0 right-0 z-[80]">
        <IOSKeyboard
          visible={aiKbVisible}
          darkMode={darkMode}

          onKey={(k) => updateInputText(inputText + k)}
          onBackspace={() => updateInputText(inputText.slice(0, -1))}
          onReturn={() => { handleTextSend(); setAiKbVisible(false); }}
        />
      </div>
    </div>
  );
}
