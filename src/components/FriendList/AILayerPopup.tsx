import { useState, useEffect, useRef, useCallback } from "react";
import { CHAT_BUBBLE_RADIUS } from "../../constants/chat";
import { SquircleAvatar } from "./SquircleAvatar";

// ── 채팅 메시지 타입 ──
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
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
const AI_RESPONSES = [
  "안녕하세요! 무엇이든 물어보세요 :)",
  "좋은 질문이에요! 조금 더 자세히 말씀해주시면 더 잘 도와드릴 수 있어요.",
  "네, 알겠습니다. 도와드릴게요!",
  "흥미로운 질문이네요. 제가 알기로는...",
  "카카오톡에서 다양한 기능을 활용해보세요!",
  "더 궁금한 점이 있으시면 편하게 물어보세요.",
  "확인해 볼게요. 잠시만 기다려주세요!",
  "맞아요, 그렇게 하시면 됩니다.",
];

async function getAIResponse(userMessage: string, _history: ChatMessage[]): Promise<string> {
  // 시뮬레이션: 1초 딜레이 후 랜덤 응답
  await new Promise((r) => setTimeout(r, 1000));

  // 간단한 키워드 매칭 응답
  const lower = userMessage.toLowerCase();
  if (lower.includes("안녕") || lower.includes("하이") || lower.includes("hello")) {
    return "안녕하세요! 카나나예요 😊 저는 카카오톡 안에서 여러분의 일상을 더 편하고 재미있게 만들어 드리는 AI 어시스턴트예요. 대화 요약, 선물 추천, 길 찾기, 다크 모드 전환 같은 것들을 도와드릴 수 있어요. 무엇이든 편하게 물어보세요!";
  }
  if (lower.includes("날씨")) {
    return "오늘 서울 날씨는 맑음, 기온 12°C예요. 외출할 때 가벼운 겉옷을 챙기세요!";
  }
  if (lower.includes("추천")) {
    return "어떤 종류의 추천을 원하시나요? 맛집, 선물, 영화 등 구체적으로 말씀해주세요!";
  }
  if (lower.includes("고마워") || lower.includes("감사")) {
    return "천만에요! 또 필요한 게 있으면 언제든 말씀해주세요 :)";
  }
  if (lower.includes("대화 요약") || lower.includes("메시지 요약") || lower.includes("요약해")) {
    return "토요일 저녁 7시에 판교역 근처에서 같이 밥 먹기로 함. 오기 전에 집에 들러서 쿠폰 꼭 챙겨오라고 함. 맛집 후보로 파스타집이랑 초밥집 중에 고르는 중. 가는 길에 해수 사무실 들러서 픽업하기로 함.";
  }

  return AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
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

interface AILayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  darkMode: boolean;
  onDarkModeToggle: (value: boolean) => void;
  onCreateChatRoom?: (memberNames: string[], initialMessage?: string) => void;
  fromChatRoom?: boolean;
}

// 탭별 추천 칩
const FRIEND_TAB_SUGGESTIONS = [
  "다크모드 켜줘",
  "이해수에게 메시지 보내",
  "생일 친구 선물 추천",
  "판교역 가는 길",
];
const CHAT_TAB_SUGGESTIONS = [
  "대화 요약해줘",
  "새 채팅방 만들어",
  "안읽은 메시지 알려줘",
  "다크모드 켜줘",
];

// 음성 명령어 → 액션 매핑
const VOICE_COMMANDS: { keywords: string[]; action: string }[] = [
  { keywords: ["다크모드", "다크 모드", "어두운 모드"], action: "darkmode" },
  { keywords: ["대화 요약", "메시지 요약", "요약해"], action: "chat-summary" },
  { keywords: ["메시지 보내", "문자 보내", "메시지 전송"], action: "message" },
  { keywords: ["전화 걸어", "전화해", "통화"], action: "call" },
  { keywords: ["프로필", "프로필 보여"], action: "profile" },
  { keywords: ["검색", "찾아"], action: "search" },
  { keywords: ["선물", "선물하기", "선물 보내", "선물 추천", "생일 선물"], action: "gift" },
  { keywords: ["가는 길", "어떻게 가", "길 찾기", "지도", "네비", "경로"], action: "navigation" },
  { keywords: ["전송", "보내", "보내줘"], action: "send" },
  { keywords: ["사원증"], action: "choonsik-card" },
  { keywords: ["채팅방 만들어", "채팅방 생성", "채팅방 만들기", "톡방 만들어", "단톡방 만들어", "대화방 만들어", "대화방 생성", "대화방 만들기"], action: "create-chatroom" },
];

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
  { name: "르 라보 상탈 33", price: "357,000원", emoji: "🧴", color: "#F3E8FF" },
  { name: "이솝 핸드크림 세트", price: "89,000원", emoji: "🧴", color: "#ECFDF5" },
  { name: "애플 에어팟 맥스", price: "769,000원", emoji: "🎧", color: "#EFF6FF" },
  { name: "디올 립 글로우", price: "48,000원", emoji: "💄", color: "#FFF1F2" },
];

const GIFT_PRODUCT = {
  name: "루즈 에르메스 립 케어 밤",
  option: "립 케어 밤 선물포장",
  reviewCount: 100,
  satisfactionPct: 94,
  originalPrice: 98000,
  salePrice: 97000,
  image: "/hermes.png",
  payMethod: "카카오페이 연결카드",
  discount: "현대카드 1천원 즉시 할인",
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
  "집에 들러서 쿠폰 꼭 챙겨오라고 함",
];

function renderChatWithBold(display: string): React.ReactNode {
  const result: React.ReactNode[] = [];
  let text = display;
  while (true) {
    let first = { index: -1, length: 0, text: "" };
    for (const part of CHAT_BOLD_PARTS) {
      const idx = text.indexOf(part);
      if (idx !== -1 && (first.index === -1 || idx < first.index)) {
        first = { index: idx, length: part.length, text: part };
      }
    }
    if (first.index === -1) {
      result.push(text);
      break;
    }
    result.push(text.slice(0, first.index));
    result.push(<span key={`${first.index}-${result.length}`} className="font-semibold">{first.text}</span>);
    text = text.slice(first.index + first.length);
  }
  return <>{result}</>;
}

function matchCommand(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.keywords.some((kw) => normalized.includes(kw))) return cmd.action;
  }
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

function LoadingMessages({ dark }: { dark?: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => (prev === 0 ? 1 : 0));
    }, 1200);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div
        className="w-[40px] h-[40px] rounded-full animate-spin-loader"
        style={{ border: `4px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderTopColor: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
      />
      <p className={`text-[15px] font-medium mt-4 ${dark ? "text-gray-200" : "text-[#191919]"}`}>
        {LOADING_MSGS[idx]}
      </p>
    </div>
  );
}

/** 채팅방 생성 요청에서 멤버 이름 + 초기 메시지 추출 */
function extractChatRequest(text: string): { members: string[]; message: string } {
  // 메시지 분리: "... 만들어줘 안녕하세요" → message = "안녕하세요"
  const msgMatch = text.match(/(?:만들어줘|만들어|생성해줘|생성|만들기)\s+(.+)$/);
  const message = msgMatch ? msgMatch[1].trim() : "";

  // 멤버 이름 추출
  const cleaned = text
    .replace(/채팅방|톡방|단톡방|대화방|만들어줘|만들어|생성해줘|생성|만들기|해줘/g, "")
    .replace(message, "")
    .trim();
  // 구분자: 와, 과, 이랑, 하고, 랑, 쉼표, 공백+
  const names = cleaned
    .split(/[,，]\s*|\s+(?:와|과|이랑|하고|랑)\s+|\s+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  return { members: names, message };
}

export function AILayerPopup({ isOpen, onClose, inputRef, darkMode, onDarkModeToggle, onCreateChatRoom, fromChatRoom }: AILayerPopupProps) {
  const [textMode, setTextMode] = useState(false);
  const [, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, _setInputText] = useState("");
  const [textSending, setTextSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<ChatMessage[] | null>(null);
  const [giftResult, setGiftResult] = useState<string | null>(null);
  const [replyMode, _setReplyMode] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showDismiss, setShowDismiss] = useState(false);
  const [floatPos, setFloatPos] = useState<{ x: number; y: number } | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [directionMode, setDirectionMode] = useState(false);
  const [directionDest, setDirectionDest] = useState("");
  const [navActive, setNavActive] = useState(false);
  const [navStep, setNavStep] = useState(0);
  const [navProgress, setNavProgress] = useState(0);
  const [navArrived, setNavArrived] = useState(false);
  const [darkmodeView, setDarkmodeView] = useState(false);
  const [choonsikCardView, setChoonsikCardView] = useState(false);
  const [, setChoonsikFullscreen] = useState(false);
  const [wishlistView, setWishlistView] = useState(false);
  const [wishlistPhase, setWishlistPhase] = useState<"product" | "loading" | "complete">("product");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [typingDisplayedLength, setTypingDisplayedLength] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [nearDismiss, setNearDismiss] = useState(false);
  const nearDismissRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const replyModeRef = useRef(false);
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

  // 채팅 메시지 추가 시 자동 스크롤
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // 채팅 메시지 전송 + AI 응답 시뮬레이션 (질문마다 이전 대화 리셋)
  const sendChatMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text, timestamp: Date.now() };
    setChatMessages([userMsg]);
    setTypingMessageId(null);
    scrollToBottom();
    setAiTyping(true);

    try {
      const [aiText] = await Promise.all([
        getAIResponse(text, [userMsg]),
        new Promise<void>((r) => setTimeout(r, 3000)),
      ]);
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: aiText, timestamp: Date.now() };
      setChatMessages((prev) => [...prev, aiMsg]);
      setAiTyping(false);
      setTypingMessageId(aiMsg.id);
      setTypingDisplayedLength(0);
    } catch {
      setAiTyping(false);
    }
  }, [scrollToBottom]);

  // AI 응답 타이핑 효과
  useEffect(() => {
    if (!typingMessageId || typingDisplayedLength < 0) return;
    const msg = chatMessages.find((m) => m.id === typingMessageId && m.role === "ai");
    if (!msg) return;
    const fullLen = msg.text.length;
    scrollToBottom();
    if (typingDisplayedLength >= fullLen) {
      setTypingMessageId(null);
      return;
    }
    const t = setTimeout(() => {
      setTypingDisplayedLength((prev) => Math.min(prev + 1, fullLen));
    }, 35);
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

  function resetToDefaultView() {
    setChatMessages([]);
    setTextMode(false);
    setSummaryResult(null);
    setGiftResult(null);
    setChoonsikCardView(false);
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

  function handleTextSend() {
    if (textSendLockRef.current) return;
    const text = (inputTextRef.current || inputText).trim();
    if (!text) return;
    textSendLockRef.current = true;
    // replyMode일 때는 명령어 매칭 없이 바로 전송 플로우
    if (replyMode) {
      doSendMessage();
      setTimeout(() => { textSendLockRef.current = false; }, 1500);
      return;
    }
    const action = matchCommand(text);
    updateInputText("");
    if (action === "chat-summary") {
      sendChatMessage(text).finally(() => { textSendLockRef.current = false; });
    } else if (action === "gift") {
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        const recipient = extractGiftRecipient(text);
        setGiftResult(recipient);
        setWishlistView(true);
        setTextMode(false);
        setChoonsikCardView(false);
        doStop();
        setTranscript("");
        setInterimText("");
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
      setTextSending(true);
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        doStop();
        setSummaryResult(null);
        setChoonsikCardView(true);
        // choonsikFullscreen 제거됨
        textSendLockRef.current = false;
      }, 1500);
    } else if (action === "create-chatroom") {
      const { members, message } = extractChatRequest(text);
      inputRef.current?.blur();
      setTextSending(true);
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        doStop();
        if (members.length > 0 && onCreateChatRoom) {
          onCreateChatRoom(members, message || undefined);
          onClose();
        }
        textSendLockRef.current = false;
      }, 1500);
    } else {
      // 명령어 미매칭 → 채팅 모드로 AI 대화
      sendChatMessage(text).finally(() => { textSendLockRef.current = false; });
    }
  }

  function fillMessageDraft(voiceText: string) {
    // 패턴1: "~에게 ~라고 메시지 보내" (내용 포함)
    const matchWithBody = voiceText.match(/(.+?)에게\s+(.+?)(?:라고|이라고|다고)\s*(?:메시지|문자)/);
    // 패턴2: "~에게 메시지 보내줘" (내용 없이)
    const matchNoBody = !matchWithBody ? voiceText.match(/(.+?)에게\s*(?:메시지|문자)\s*(?:보내|전송)/) : null;
    const recipient = matchWithBody ? matchWithBody[1]?.trim() : matchNoBody ? matchNoBody[1]?.trim() : "";

    // 수신자 파싱 실패 → 일반 전송 플로우로 폴백
    if (!recipient) {
      doSendMessage();
      return;
    }

    const body = matchWithBody ? matchWithBody[2] : "";
    const draft = body ? `${recipient}에게 ${body}` : "";
    updateInputText(draft);
    setTextMode(false);
    updateReplyMode(true);
    setTranscript("");
    setInterimText("");
    setStatusMessage(null);
    doStart();
  }

  function handleVoiceSend(text: string) {
    doStop();
    clearSilenceTimer();
    // reply 모드: "전송" 명령이면 보내기, 아니면 입력창에 텍스트 채우기
    if (replyModeRef.current) {
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
      doStart();
      return;
    }
    const action = matchCommand(text);
    if (action) {
      // 명령 매칭 → 로딩 스피너 전환
      setIsLoading(true);
      setStatusMessage("처리 중...");
      // 1.5초 후 → 액션 처리
      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
        if (action === "chat-summary") {
          doStop();
          setTranscript("");
          setInterimText("");
          setStatusMessage(null);
          setChoonsikCardView(false);
          setTextMode(true);
          sendChatMessage(text);
        } else if (action === "gift") {
          const recipient = extractGiftRecipient(text);
          setGiftResult(recipient);
          setWishlistView(true);
          setTextMode(false);
          setChoonsikCardView(false);
          setTranscript("");
          setInterimText("");
          setStatusMessage(null);
        } else if (action === "message") {
          fillMessageDraft(text);
        } else if (action === "send" && (replyModeRef.current || inputTextRef.current.trim())) {
          doSendMessage();
        } else if (action === "darkmode") {
          const darkIntent = parseDarkModeIntent(text);
          setChoonsikCardView(false);
          setDarkmodeView(true);
          if (darkIntent !== null) {
            setTimeout(() => onDarkModeToggle(darkIntent), 350);
          }
        } else if (action === "navigation") {
          const dest = extractDestination(text);
          setChoonsikCardView(false);
          setDirectionMode(true);
          setDirectionDest(dest);
        } else if (action === "choonsik-card") {
          doStop();
          inputRef.current?.blur();
          setTranscript("");
          setInterimText("");
          setStatusMessage(null);
          setChoonsikCardView(true);
          // choonsikFullscreen 제거됨
        } else if (action === "create-chatroom") {
          const { members, message } = extractChatRequest(text);
          doStop();
          setTranscript("");
          setInterimText("");
          setStatusMessage(null);
          if (members.length > 0 && onCreateChatRoom) {
            onCreateChatRoom(members, message || undefined);
            onClose();
          }
        } else {
          // 미처리 액션 → 보이스 리스닝 복귀
          setStatusMessage(null);
          doStart();
        }
      }, 1500);
    } else {
      setStatusMessage("음성을 인식하지 못했어요");
      // 3초 후 상태 리셋 → 다시 듣기
      setTimeout(() => {
        setStatusMessage(null);
        setTranscript("");
        setInterimText("");
        doStart();
      }, 3000);
    }
  }

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
    setListening(false);
  }

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
      setListening(false);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setListening(false);
      }
    };

    try {
      rec.start();
      setListening(true);
    } catch { /* noop */ }
  }

  // 팝업 열릴 때 음성 인식 시작 (100ms 딜레이로 StrictMode 대응)
  useEffect(() => {
    if (!isOpen) {
      doStop();
      clearSilenceTimer();
      clearLoadingTimer();
      setTextMode(false);
      setTranscript("");
      setInterimText("");
      setStatusMessage(null);
      setIsLoading(false);
      updateInputText("");
      setTextSending(false);
      setSummaryResult(null);
      setGiftResult(null);
      updateReplyMode(false);
      setSendStatus(null);
      setChatMessages([]);
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
      setChoonsikFullscreen(false);
      setWishlistView(false);
      setWishlistPhase("product");
      updateInputText("");
      return;
    }
    if (textMode || directionMode || darkmodeView || wishlistView) {
      doStop();
      return;
    }
    const timer = setTimeout(() => doStart(), 150);
    return () => {
      clearTimeout(timer);
      doStop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, textMode, directionMode, darkmodeView, wishlistView]);

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

  function startLongPress(clientX: number, clientY: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const cr = containerRef.current?.getBoundingClientRect();
    if (!cr) return;
    const elCenterX = rect.left + rect.width / 2 - cr.left;
    const elCenterY = rect.top + rect.height / 2 - cr.top;
    const mouseRelX = clientX - cr.left;
    const mouseRelY = clientY - cr.top;
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
    const relX = clientX - cr.left - dragOffsetRef.current.dx;
    const relY = clientY - cr.top - dragOffsetRef.current.dy;
    setFloatPos({ x: relX, y: relY });
    wasDraggedRef.current = true;
    // X 버튼 근접 감지 (컨테이너 상대 좌표)
    const xCenter = cr.width / 2;
    const yTarget = cr.height - 104 - 20;
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

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[60]"
      style={{ pointerEvents: isOpen && !minimized ? "auto" : "none" }}
    >
      {/* ── 배경 (딤 없음, 닫기 영역) ── */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        onTouchEnd={handleClose}
        aria-hidden="true"
      />

      {/* ── X 닫기 버튼 (센터 하단) ── */}
      {showDismiss && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-200 ${nearDismiss ? "bg-red-500 scale-110" : darkMode ? "bg-white/70" : "bg-black/70"}`}
          style={{ bottom: 104, opacity: dismissing ? 0 : 1, zIndex: 60 }}
        >
          <svg className={`w-5 h-5 ${nearDismiss || !darkMode ? "text-white" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      {/* ── 미니 플로팅 버튼 (항상 렌더, minimized일 때 표시) ── */}
      <div
        className={`w-[76px] h-[76px] rounded-full overflow-hidden cursor-pointer select-none touch-none ${isDragging || dismissing ? "" : "transition-all duration-400"} ${dismissing ? "scale-0 opacity-0" : minimized ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}
        style={floatPos
          ? { position: "absolute", left: floatPos.x - 38, top: floatPos.y - 38, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,0.16)", transitionDelay: isDragging ? "0s" : (minimized ? "0.15s" : "0s"), touchAction: "none", pointerEvents: minimized ? "auto" : "none" }
          : { position: "absolute", right: 16, bottom: 104, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,0.16)", transitionDelay: minimized ? "0.15s" : "0s", touchAction: "none", pointerEvents: minimized ? "auto" : "none" }
        }
        onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return; } if (!showDismiss && !draggingRef.current) { setMinimized(false); setFloatPos(null); } }}
        onTouchStart={handleFloatTouchStart}
        onTouchMove={handleFloatTouchMove}
        onTouchEnd={handleFloatTouchEnd}
        onMouseDown={handleFloatMouseDown}
      >
        <div className={`absolute inset-0 rounded-full backdrop-blur-[4px]`} style={{ backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.74)", boxShadow: darkMode ? "inset 0 0 0 1px rgba(255,255,255,0.15)" : "none" }} />
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
      {/* ── AI 레이어 카드 (상하 여백 60px) ── */}
      <div
        className="absolute left-4 right-4 overflow-visible transition-all duration-300"
        style={{
          top: (navActive || navArrived) ? 100 : undefined,
          bottom: isOpen ? (fromChatRoom ? 96 : 16) : -300,
          opacity: isOpen && !minimized ? 1 : 0,
          transform: minimized ? "scale(0.3) translateY(40px)" : "scale(1) translateY(0)",
          transformOrigin: "bottom right",
          pointerEvents: minimized ? "none" : "auto",
        }}
      >
        <div className={`relative ${navActive || navArrived ? "h-full" : ""}`}>
          {/* ── 외곽 글로우: 블러된 회전 그라디언트 ── */}
          <div
            className="absolute inset-[-2px] rounded-[28px] overflow-hidden -z-10 pointer-events-none animate-glow-breathe"
          >
            <div
              className="absolute inset-[-100%] animate-gradient-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, #ff1493, rgba(255,255,255,0.5), #b026ff, #2563ff, rgba(255,255,255,0.5), #00d4ff, #b026ff, #ff6600, rgba(255,255,255,0.5), #ff1493)",
              }}
            />
          </div>

          {/* ── 카드 본체 ── */}
          <div
            className={`relative rounded-[30px] overflow-hidden transition-[background-color,box-shadow] duration-500 backdrop-blur-[4px] ${navActive || navArrived ? "h-full" : ""}`}
            style={{ backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.74)", boxShadow: darkMode ? "inset 0 0 0 1px rgba(255,255,255,0.12)" : "inset 0 0 0 1px #ffffff, 0 0 24px rgba(0,0,0,0.12), 0 0 48px rgba(0,0,0,0.06)" }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
              {/* ── 우상단 내리기 버튼 (텍스트 모드에서는 숨김) ── */}
              {!textMode && (
                <div className="absolute z-30 flex items-center gap-2" style={{ top: 16, right: 16 }}>
                  <button
                    type="button"
                    className="p-2 rounded-full backdrop-blur-2xl backdrop-saturate-[1.8] transition-opacity active:opacity-80"
                    style={{ background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)", boxShadow: darkMode ? "inset 0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.2)" : "inset 0 0 0 0.5px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.08)" }}
                    aria-label="접기"
                    onClick={(e) => { e.stopPropagation(); setMinimized(true); }}
                  >
                    <svg className={`w-5 h-5 ${darkMode ? "text-gray-200" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
              {/* ── 위시리스트 캐로셀 (giftResult, textMode에서 카드 상단에 표시) ── */}
              {giftResult && textMode && (
                <div className="w-full px-4 pt-4 pb-2 pointer-events-auto">
                  <div className="flex items-center gap-2.5 mb-3">
                    <SquircleAvatar src="/profile-ieun.png" alt={giftResult} className="w-8 h-8" />
                    <p className={`text-[14px] font-bold leading-tight ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{giftResult}의 위시리스트 🎁</p>
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
              {/* ── 춘식이 사원증 카드 (normal flow, 레이어 높이 유연 확장) ── */}
              {choonsikCardView && !textMode && (
                <div className="flex items-center justify-center w-full pointer-events-auto px-4" style={{ paddingTop: 56, paddingBottom: 48 }}>
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

              {/* 빈영역 센터: 요약 결과 / 보이스 이펙트 / 로딩 스피너 (음성 모드일 때만) */}
              <div
                className="flex flex-col items-center justify-center gap-1 pointer-events-none"
                style={{ opacity: (textMode || choonsikCardView || directionMode || darkmodeView || wishlistView) ? 0 : 1, visibility: (textMode || choonsikCardView || directionMode || darkmodeView || wishlistView) ? "hidden" : "visible", height: (textMode || choonsikCardView || directionMode || darkmodeView || wishlistView) ? 0 : "auto", paddingTop: (textMode || choonsikCardView || directionMode || darkmodeView || wishlistView) ? 0 : 32, paddingBottom: (textMode || choonsikCardView || directionMode || darkmodeView || wishlistView) ? 0 : 16 }}
              >
                {summaryResult ? (
                  /* ── 대화 요약 결과 (보낸/받은 메시지 형식) ── */
                  <div className="w-full pl-6 pr-4 pt-4 pb-2 overflow-y-auto max-h-full pointer-events-auto">
                    {summaryResult.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "user" ? (
                          <div className="max-w-[75%] px-3.5 py-2.5 text-[16px] font-medium leading-relaxed bg-[#FEE500] text-[#191919]" style={{ borderRadius: CHAT_BUBBLE_RADIUS }}>
                            {msg.text}
                          </div>
                        ) : (
                          <div className={`max-w-[90%] text-[17px] font-normal leading-relaxed ${darkMode ? "text-gray-100" : "text-[#191919]"}`}>
                            {msg.id === "sum-a-1" ? (
                              <>토요일 저녁 7시에 판교역 근처에서 같이 밥 먹기로 함. 오기 전에 <span className="font-semibold">집에 들러서 쿠폰 꼭 챙겨오라고 함</span>. 맛집 후보로 파스타집이랑 초밥집 중에 고르는 중. 가는 길에 해수 사무실 들러서 픽업하기로 함.</>
                            ) : (
                              msg.text
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : isLoading ? (
                  /* ── 로딩 스피너 ── */
                  <div className="relative w-[104px] h-[104px] flex items-center justify-center">
                    <div
                      className="w-[40px] h-[40px] rounded-full animate-spin-loader"
                      style={{
                        border: `4px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`,
                        borderTopColor: darkMode ? "#ffffff" : "#000000",
                      }}
                    />
                  </div>
                ) : (
                  /* ── 보이스 오브 이펙트 ── */
                  <div className="relative w-[104px] h-[104px]">
                    <img
                      src="/voice-effect.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain animate-voice-breathe"
                    />
                    <div
                      className="absolute inset-0 m-auto w-[70px] h-[70px] rounded-full animate-orb-1"
                      style={{ background: "radial-gradient(circle, rgba(236,72,153,0.4), rgba(236,72,153,0) 70%)", mixBlendMode: "screen" }}
                    />
                    <div
                      className="absolute inset-0 m-auto w-[60px] h-[60px] rounded-full animate-orb-2"
                      style={{ background: "radial-gradient(circle, rgba(168,85,247,0.35), rgba(168,85,247,0) 70%)", mixBlendMode: "screen" }}
                    />
                    <div
                      className="absolute inset-0 m-auto w-[55px] h-[55px] rounded-full animate-orb-3"
                      style={{ background: "radial-gradient(circle, rgba(59,130,246,0.35), rgba(59,130,246,0) 70%)", mixBlendMode: "screen" }}
                    />
                  </div>
                )}
                {!summaryResult && !choonsikCardView && <p className="text-[17px] font-medium text-center px-6 max-w-full leading-relaxed"
                  style={{ color: isLoading ? (darkMode ? "#e5e5e5" : "#1C1C1E") : statusMessage ? (statusMessage.includes("인식하지 못했어요") ? "#3b82f6" : "#FF538A") : (transcript || interimText) ? (darkMode ? "#ffffff" : "#000000") : (darkMode ? "#a1a1aa" : "#374151") }}
                >
                  {isLoading
                    ? "처리 중..."
                    : statusMessage
                      ? statusMessage
                      : transcript || interimText
                        ? <><span>{transcript}</span><span>{interimText}</span></>
                        : replyMode ? "이해수에게 답장" : "듣고 있어요! 편하게 말씀해 주세요."}
                </p>}
              </div>
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
                        style={{ background: "rgba(0,0,0,0.06)" }}
                        onClick={() => { resetToDefaultView(); setDirectionMode(false); setDirectionDest(""); doStart(); }}
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
                        {/* SVG 경로선 */}
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
                          <polyline
                            points={NAV_STEPS.map(s => `${s.markerX},${s.markerY}`).join(" ")}
                            fill="none"
                            stroke="#3478F6"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray="2 2"
                            opacity="0.6"
                          />
                        </svg>
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
                          style={{ background: "rgba(0,0,0,0.06)" }}
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
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ pointerEvents: "none" }}>
                        <polyline
                          points={NAV_STEPS.map(s => `${s.markerX},${s.markerY}`).join(" ")}
                          fill="none"
                          stroke="#34C759"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.6"
                        />
                      </svg>
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
                        style={{ background: "rgba(0,0,0,0.06)" }}
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
                className="absolute inset-x-0 top-0 bottom-0 flex flex-col transition-opacity duration-500 z-20"
                style={{ opacity: darkmodeView ? 1 : 0, pointerEvents: darkmodeView ? "auto" : "none" }}
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
                    style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
                    onClick={() => { resetToDefaultView(); setDarkmodeView(false); doStart(); }}
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
                        <SquircleAvatar src="/profile-ieun.png" alt={giftResult || "친구"} className="w-9 h-9" />
                        <p className={`text-[15px] font-bold leading-tight ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{giftResult || "친구"}님의 위시리스트</p>
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
                        나영님이 평소 뷰티 제품에 관심이 많고, 위시리스트에 직접 담아둔 상품이에요. 선물 만족도가 높을 거예요!
                      </p>

                      {/* Buttons */}
                      <div className="px-4 pt-4 pb-1 flex gap-3">
                        <button
                          type="button"
                          className={`flex-1 h-[40px] rounded-[40px] text-[15px] font-semibold active:opacity-80 transition-colors ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                          style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
                          onClick={() => { resetToDefaultView(); setWishlistView(false); setGiftResult(null); setWishlistPhase("product"); doStart(); }}
                        >
                          선물하기 홈
                        </button>
                        <button
                          type="button"
                          className="flex-1 h-[40px] rounded-[40px] text-[15px] font-semibold text-black active:opacity-80 transition-colors"
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
                        {giftResult || "친구"}에게 선물하기를 완료했어요
                      </p>
                      <p className={`text-[14px] mt-2 leading-relaxed ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>
                        결제 정보는 카카오페이 알림톡으로<br />알려드릴게요.
                      </p>
                      <div className="mt-6 flex gap-3 w-full">
                        <button
                          type="button"
                          className={`flex-1 h-[40px] rounded-[40px] text-[14px] font-semibold active:opacity-80 transition-colors ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                          style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }}
                          onClick={() => { resetToDefaultView(); setWishlistView(false); setWishlistPhase("product"); setGiftResult(null); doStart(); }}
                        >
                          친구와 1:1 채팅
                        </button>
                        <button
                          type="button"
                          className={`flex-1 h-[40px] rounded-[40px] text-[14px] font-semibold active:bg-[#333] transition-colors ${darkMode ? "text-black bg-[#FEE500]" : "text-white bg-[#191919]"}`}
                          onClick={() => { resetToDefaultView(); setWishlistView(false); setWishlistPhase("product"); setGiftResult(null); doStart(); }}
                        >
                          확인
                        </button>
                      </div>
                  </div>
                </div>
              )}

              {/* ── 채팅 메시지 리스트 (textMode && 메시지 있을 때) ── */}
              {textMode && !directionMode && !darkmodeView && !wishlistView && (
                <div
                  className="overflow-hidden transition-all duration-400"
                  style={{
                    maxHeight: chatMessages.length > 0 ? 240 : 0,
                    transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
                  }}
                >
                  <div
                    ref={chatScrollRef}
                    className="overflow-y-auto scrollbar-hide pl-6 pr-4 pt-4 pb-2"
                    style={{ height: 240 }}
                  >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "user" ? (
                        <div className="max-w-[75%] px-3.5 py-2.5 text-[16px] font-medium leading-relaxed bg-[#FEE500] text-[#191919]" style={{ borderRadius: CHAT_BUBBLE_RADIUS }}>
                          {msg.text}
                        </div>
                      ) : (
                        <div className={`max-w-[90%] text-[17px] font-normal leading-relaxed ${darkMode ? "text-gray-100" : "text-[#191919]"}`}>
                          {renderChatWithBold(msg.id === typingMessageId ? msg.text.slice(0, typingDisplayedLength) : msg.text)}
                        </div>
                      )}
                    </div>
                  ))}
                  {/* AI 응답 로딩 (점 3개 애니메이션) */}
                  {aiTyping && (
                    <div className="flex justify-start mb-3">
                      <div className={`flex items-center gap-1.5 py-2`}>
                        <span
                          className="w-2 h-2 rounded-full bg-pink-500"
                          style={{ animation: "typing-dot 1.2s ease-in-out infinite" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-pink-500"
                          style={{ animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: "0.15s" }}
                        />
                        <span
                          className="w-2 h-2 rounded-full bg-pink-500"
                          style={{ animation: "typing-dot 1.2s ease-in-out infinite", animationDelay: "0.3s" }}
                        />
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              )}

              <div
                className="px-4 pb-4 transition-all duration-[400ms]"
                style={{ paddingTop: wishlistView ? 0 : directionMode ? 380 : darkmodeView ? 156 : giftResult && textMode ? 0 : textMode ? (chatMessages.length > 0 ? 4 : 16) : choonsikCardView ? 8 : 0, height: wishlistView ? 0 : "auto", overflow: wishlistView ? "hidden" : undefined, opacity: (directionMode || darkmodeView || wishlistView) ? 0 : 1, pointerEvents: (directionMode || darkmodeView || wishlistView) ? "none" : "auto", transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)" }}
              >
                {/* ── 추천 칩 (초기 음성 모드에서만 표시) ── */}
                {!textMode && !choonsikCardView && !directionMode && !darkmodeView && !wishlistView && !summaryResult && !giftResult && !isLoading && !statusMessage && !transcript && !interimText && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pt-4 pb-4">
                    {(fromChatRoom ? CHAT_TAB_SUGGESTIONS : FRIEND_TAB_SUGGESTIONS).map((t) => t === "다크모드 켜줘" ? (darkMode ? "다크모드 꺼줘" : "다크모드 켜줘") : t).map((text) => (
                      <button
                        key={text}
                        type="button"
                        className={`flex-shrink-0 px-[14px] h-[40px] rounded-full text-[13px] font-medium whitespace-nowrap transition-colors backdrop-blur-[16px] backdrop-saturate-[1.6] ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                        style={darkMode ? {
                          background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(200,180,255,0.13) 50%, rgba(255,255,255,0.10) 100%)",
                          boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.40)",
                        } : {
                          background: "linear-gradient(135deg, rgba(255,245,200,0.25) 0%, rgba(255,255,255,0.30) 20%, rgba(220,200,255,0.30) 45%, rgba(200,235,210,0.18) 72%, rgba(255,255,255,0.40) 100%)",
                          boxShadow: "0 1px 6px rgba(0,0,0,0.06), inset 0 0 0 0.5px rgba(255,255,255,1.0), inset 0 1px 0 rgba(255,255,255,1.0)",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateInputText(text);
                          setTextMode(true);
                          handleTextSend();
                        }}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className={`flex items-center gap-2 pl-4 pr-2 h-[52px] rounded-[40px] ${darkMode ? "bg-[#3a3a3c]" : "backdrop-blur-[20px] backdrop-saturate-[1.8]"}`}
                  style={{
                    ...(darkMode ? {
                      boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
                    } : {
                      background: "linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.50) 100%)",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)",
                    }),
                  }}
                  onClick={() => {
                    if (!textSending && !sendStatus) {
                      setTextMode(true);
                      inputRef.current?.focus({ preventScroll: true });
                    }
                  }}
                >
                  {textSending && (
                    <div
                      className="w-4 h-4 rounded-full animate-spin-loader flex-shrink-0"
                      style={{ border: `2px solid ${darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}`, borderTopColor: darkMode ? "#fff" : "#000" }}
                    />
                  )}
                  <label className="flex-1 min-w-0 cursor-text">
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="text"
                      enterKeyHint="send"
                      autoComplete="off"
                      autoCapitalize="off"
                      value={inputText}
                      placeholder={sendStatus ? sendStatus : textSending ? "처리 중..." : giftResult ? `${giftResult}에게 선물 메시지 보내기` : replyMode ? "이해수에게 답장" : "카나나에게 요청하기"}
                      className={`w-full text-base outline-none bg-transparent ${darkMode ? "text-gray-100" : "text-gray-900"} ${sendStatus ? (darkMode ? "placeholder:text-white" : "placeholder:text-black") : (darkMode ? "placeholder:text-gray-400" : "placeholder:text-gray-900/40")}`}
                      style={{ fontSize: "16px" }}
                      disabled={textSending || !!sendStatus}
                      onFocus={() => setTextMode(true)}
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
                  {(textMode || replyMode) && inputText.trim() ? (
                    <button
                      type="button"
                      className="w-11 h-11 rounded-full flex-shrink-0 mr-[-4px] flex items-center justify-center bg-black"
                      aria-label="보내기"
                      disabled={textSending || !!sendStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (textSending || sendStatus) return;
                        handleTextSend();
                      }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-11 h-11 rounded-full flex-shrink-0 mr-[-4px] flex items-center justify-center"
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
                          doStart();
                        } else {
                          setTextMode(true);
                          inputRef.current?.focus({ preventScroll: true });
                        }
                      }}
                    >
                      {textMode ? (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
                        </svg>
                      ) : (
                        <span className="text-white text-[16px] font-bold leading-none">T</span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            {/* /카드 본체 */}
        </div>
        {/* /relative */}
      </div>

      </>

      {/* 사원증 풀스크린 오버레이 제거됨 — 카드 본체 안에서 표시 */}

    </div>
  );
}
