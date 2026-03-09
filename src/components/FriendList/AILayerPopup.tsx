import { useState, useEffect, useRef, useCallback } from "react";
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
    return "안녕하세요! 카나나입니다. 무엇을 도와드릴까요?";
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
}

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
];

const B = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold">{children}</span>
);

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

const CHAT_SUMMARY: React.ReactNode[] = [
  <>토요일 저녁 7시에 판교역 근처에서 <B>같이 밥 먹기로 함</B></>,
  <>오기 전에 집에 들러서 <B>쿠폰 꼭 챙겨</B>오라고 함</>,
  <><B>맛집 후보</B>로 파스타집이랑 초밥집 중에 <B>고르는 중</B></>,
  <>가는 길에 해수 <B>사무실 들러서 픽업</B>하기로 함</>,
];

function matchCommand(text: string): string | null {
  const normalized = text.trim().toLowerCase();
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.keywords.some((kw) => normalized.includes(kw))) return cmd.action;
  }
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

export function AILayerPopup({ isOpen, onClose, inputRef, darkMode, onDarkModeToggle }: AILayerPopupProps) {
  const [textMode, setTextMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, _setInputText] = useState("");
  const [textSending, setTextSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<React.ReactNode[] | null>(null);
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
  const [wishlistView, setWishlistView] = useState(false);
  const [wishlistPhase, setWishlistPhase] = useState<"product" | "loading" | "complete">("product");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiTyping, setAiTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [nearDismiss, setNearDismiss] = useState(false);
  const nearDismissRef = useRef(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const replyModeRef = useRef(false);
  const inputTextRef = useRef("");
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

  // 채팅 메시지 전송 + AI 응답 시뮬레이션
  const sendChatMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text, timestamp: Date.now() };
    setChatMessages((prev) => [...prev, userMsg]);
    scrollToBottom();
    setAiTyping(true);

    try {
      const aiText = await getAIResponse(text, [...chatMessages, userMsg]);
      const aiMsg: ChatMessage = { id: `a-${Date.now()}`, role: "ai", text: aiText, timestamp: Date.now() };
      setChatMessages((prev) => [...prev, aiMsg]);
    } finally {
      setAiTyping(false);
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);

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
    const text = inputText.trim();
    if (!text) return;
    // replyMode일 때는 명령어 매칭 없이 바로 전송 플로우
    if (replyMode) {
      doSendMessage();
      return;
    }
    const action = matchCommand(text);
    updateInputText("");
    if (action === "chat-summary") {
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        setSummaryResult(CHAT_SUMMARY);
      }, 1500);
    } else if (action === "gift") {
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        const recipient = extractGiftRecipient(text);
        setGiftResult(recipient);
        setWishlistView(true);
        setTextMode(false);
        doStop();
        setTranscript("");
        setInterimText("");
        setStatusMessage(null);
      }, 1500);
    } else if (action === "darkmode") {
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        doStop();
        setDarkmodeView(true);
      }, 1500);
    } else if (action === "navigation") {
      const dest = extractDestination(text);
      setTextSending(true);
      inputRef.current?.blur();
      loadingTimerRef.current = setTimeout(() => {
        setTextSending(false);
        setTextMode(false);
        doStop();
        setDirectionMode(true);
        setDirectionDest(dest);
      }, 1500);
    } else {
      // 명령어 미매칭 → 채팅 모드로 AI 대화
      sendChatMessage(text);
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
          setSummaryResult(CHAT_SUMMARY);
        } else if (action === "gift") {
          const recipient = extractGiftRecipient(text);
          setGiftResult(recipient);
          setWishlistView(true);
          setTextMode(false);
          setTranscript("");
          setInterimText("");
          setStatusMessage(null);
        } else if (action === "message") {
          fillMessageDraft(text);
        } else if (action === "send" && (replyModeRef.current || inputTextRef.current.trim())) {
          doSendMessage();
        } else if (action === "darkmode") {
          setDarkmodeView(true);
        } else if (action === "navigation") {
          const dest = extractDestination(text);
          setDirectionMode(true);
          setDirectionDest(dest);
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
    longPressTimerRef.current = setTimeout(() => {
      setShowDismiss(true);
      wasDraggedRef.current = true;
    }, 400);
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!draggingRef.current) return;
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
    inputRef.current?.blur();
    doStop();
    onClose();
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-40"
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
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
          className={`absolute left-1/2 -translate-x-1/2 w-[40px] h-[40px] rounded-full flex items-center justify-center transition-all duration-200 ${nearDismiss ? "bg-red-500 scale-110" : "bg-black/70"}`}
          style={{ bottom: 104, opacity: dismissing ? 0 : 1, zIndex: 60 }}
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )}
      {/* ── 미니 플로팅 버튼 (항상 렌더, minimized일 때 표시) ── */}
      <div
        className={`w-[76px] h-[76px] rounded-full overflow-hidden cursor-pointer transition-all duration-400 ${dismissing ? "scale-0 opacity-0" : minimized ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}
        style={floatPos
          ? { position: "absolute", left: floatPos.x - 38, top: floatPos.y - 38, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,0.16)", transitionDelay: minimized ? "0.15s" : "0s" }
          : { position: "absolute", right: 16, bottom: 104, zIndex: 50, boxShadow: "0 4px 24px rgba(0,0,0,0.16)", transitionDelay: minimized ? "0.15s" : "0s" }
        }
        onClick={() => { if (wasDraggedRef.current) { wasDraggedRef.current = false; return; } if (!showDismiss && !draggingRef.current) { setMinimized(false); setFloatPos(null); } }}
        onTouchStart={handleFloatTouchStart}
        onTouchMove={handleFloatTouchMove}
        onTouchEnd={handleFloatTouchEnd}
        onMouseDown={handleFloatMouseDown}
      >
        <div className={`absolute inset-0 rounded-full backdrop-blur-[4px]`} style={{ backgroundColor: darkMode ? "rgba(44, 44, 46, 0.9)" : "rgba(255,255,255,0.74)" }} />
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
      {/* ── AI 레이어 카드 (키보드 바로 위) ── */}
      <div
        className="absolute left-4 right-4 transition-all duration-300"
        style={{
          top: (navActive || navArrived) ? 100 : undefined,
          bottom: isOpen ? 16 : -300,
          opacity: isOpen && !minimized ? 1 : 0,
          transform: minimized ? "scale(0.3) translateY(40px)" : "scale(1) translateY(0)",
          transformOrigin: "bottom right",
          pointerEvents: minimized ? "none" : "auto",
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
              {/* 카드 우상단 버튼 그룹 */}
              <div className="absolute z-10 flex items-center gap-2" style={{ top: 16, right: 16 }}>
                {summaryResult && !textMode && (
                  <button
                    className="p-2 rounded-full backdrop-blur-2xl backdrop-saturate-[1.8]"
                    style={{ background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)", boxShadow: darkMode ? "inset 0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.2)" : "inset 0 0 0 0.5px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.08)" }}
                    aria-label="메시지 보내기"
                    onClick={() => { setSummaryResult(null); updateReplyMode(true); doStart(); }}
                  >
                    <svg className={`w-[18px] h-[18px] ${darkMode ? "text-gray-200" : "text-[#3C1E1E]"}`} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.04 2 11c0 3.16 1.96 5.94 4.9 7.55L5.2 22.5l4.95-2.47C10.74 19.94 11.36 20 12 20c5.52 0 10-4.04 10-9s-4.48-9-10-9z" />
                    </svg>
                  </button>
                )}
                {!wishlistView && !textMode && (summaryResult || giftResult || (listening && !isLoading && !statusMessage)) && (
                  <button
                    className="p-2 rounded-full backdrop-blur-2xl backdrop-saturate-[1.8]"
                    style={{ background: darkMode ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)", boxShadow: darkMode ? "inset 0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.2)" : "inset 0 0 0 0.5px rgba(255,255,255,0.7), 0 1px 3px rgba(0,0,0,0.08)" }}
                    aria-label="접기"
                    onClick={() => setMinimized(true)}
                  >
                    <svg className={`w-5 h-5 ${darkMode ? "text-gray-200" : "text-black"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
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
              {/* 빈영역 센터: 요약 결과 / 보이스 이펙트 / 로딩 스피너 (음성 모드일 때만) */}
              <div
                className="absolute inset-x-0 top-0 bottom-[72px] flex flex-col items-center justify-center gap-3 pointer-events-none"
                style={{ opacity: (textMode || directionMode || darkmodeView || wishlistView) ? 0 : 1, visibility: (textMode || directionMode || darkmodeView || wishlistView) ? "hidden" : "visible" }}
              >
                {summaryResult ? (
                  /* ── 대화 요약 결과 ── */
                  <div className="w-full px-5 pt-1 overflow-y-auto max-h-full pointer-events-auto">
                    <div className="flex items-center gap-2.5 mb-6">
                      <SquircleAvatar src="/profile-jieun.png" alt="이해수" className="w-8 h-8" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[14px] font-bold leading-tight ${darkMode ? "text-gray-100" : "text-gray-900"}`}>이해수 ❤️</p>
                        <p className="text-[11px]" style={{ color: darkMode ? "rgba(255,255,255,0.5)" : "rgba(25,25,25,0.6)" }}>오늘 오후 2:34 · 메시지 12개</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {summaryResult.map((item, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[13px] text-gray-400 mt-0.5 flex-shrink-0">•</span>
                          <span className={`text-[14px] leading-snug ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : isLoading ? (
                  /* ── 로딩 스피너 ── */
                  <div className="relative w-[120px] h-[120px] flex items-center justify-center">
                    <div
                      className="w-[40px] h-[40px] rounded-full animate-spin-loader"
                      style={{
                        border: "4px solid rgba(0, 0, 0, 0.1)",
                        borderTopColor: "#000000",
                      }}
                    />
                  </div>
                ) : (
                  /* ── 보이스 오브 이펙트 ── */
                  <div className="relative w-[120px] h-[120px]">
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
                {!summaryResult && (listening || isLoading || statusMessage || transcript || interimText) && <p className="text-[17px] font-medium text-center px-6 max-w-full leading-relaxed"
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
                        onClick={() => { setDirectionMode(false); setDirectionDest(""); }}
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
                    onClick={() => setDarkmodeView(false)}
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
                          onClick={() => { setWishlistView(false); setGiftResult(null); setWishlistPhase("product"); doStart(); }}
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
                          onClick={() => { setWishlistView(false); setWishlistPhase("product"); setGiftResult(null); doStart(); }}
                        >
                          친구와 1:1 채팅
                        </button>
                        <button
                          type="button"
                          className={`flex-1 h-[40px] rounded-[40px] text-[14px] font-semibold active:bg-[#333] transition-colors ${darkMode ? "text-black bg-[#FEE500]" : "text-white bg-[#191919]"}`}
                          onClick={() => { setWishlistView(false); setWishlistPhase("product"); setGiftResult(null); doStart(); }}
                        >
                          확인
                        </button>
                      </div>
                  </div>
                </div>
              )}

              {/* ── 채팅 메시지 리스트 (textMode && 메시지 있을 때) ── */}
              {textMode && chatMessages.length > 0 && !directionMode && !darkmodeView && !wishlistView && (
                <div
                  ref={chatScrollRef}
                  className="overflow-y-auto scrollbar-hide px-4 pt-4 pb-2"
                  style={{ maxHeight: 260 }}
                >
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex mb-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "ai" && (
                        <div className="flex-shrink-0 mr-2 mt-1">
                          <SquircleAvatar src="/kanana-avatar.png" alt="AI" className="w-7 h-7" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-[#FEE500] text-[#191919] rounded-tr-md"
                            : darkMode
                              ? "bg-[#3a3a3c] text-gray-100 rounded-tl-md"
                              : "bg-white text-[#191919] rounded-tl-md shadow-sm"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {/* AI 타이핑 인디케이터 */}
                  {aiTyping && (
                    <div className="flex justify-start mb-3">
                      <div className="flex-shrink-0 mr-2 mt-1">
                        <SquircleAvatar src="/kanana-avatar.png" alt="AI" className="w-7 h-7" />
                      </div>
                      <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${darkMode ? "bg-[#3a3a3c]" : "bg-white shadow-sm"}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[13px] ${darkMode ? "text-gray-400" : "text-gray-500"}`}>카나나가 입력 중</span>
                          <span className="flex gap-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? "bg-gray-400" : "bg-gray-400"}`} style={{ animation: "typing-dot 1.2s infinite", animationDelay: "0s" }} />
                            <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? "bg-gray-400" : "bg-gray-400"}`} style={{ animation: "typing-dot 1.2s infinite", animationDelay: "0.2s" }} />
                            <span className={`w-1.5 h-1.5 rounded-full ${darkMode ? "bg-gray-400" : "bg-gray-400"}`} style={{ animation: "typing-dot 1.2s infinite", animationDelay: "0.4s" }} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div
                className="px-4 pb-4 transition-all duration-500"
                style={{ paddingTop: wishlistView ? 0 : directionMode ? 380 : darkmodeView ? 156 : giftResult && textMode ? 0 : textMode ? (chatMessages.length > 0 ? 4 : 16) : 200, height: wishlistView ? 0 : "auto", overflow: wishlistView ? "hidden" : undefined, opacity: (directionMode || darkmodeView || wishlistView) ? 0 : 1, pointerEvents: (directionMode || darkmodeView || wishlistView) ? "none" : "auto" }}
              >
                <div
                  className={`flex items-center gap-2 pl-4 pr-2 h-[42px] rounded-[40px] ${darkMode ? "bg-[#3a3a3c]" : "backdrop-blur-[20px] backdrop-saturate-[1.8]"}`}
                  style={{
                    ...(darkMode ? {
                      boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.08)",
                    } : {
                      background: "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0.60) 100%)",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 0 0 0.5px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -0.5px 0 rgba(0,0,0,0.04)",
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
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTextSend(); } }}
                    />
                  </label>
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
                      className="w-9 h-9 rounded-full flex-shrink-0 mr-[-4px] flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #FF538A, #E91E8A)" }}
                      aria-label={textMode ? "음성 입력" : "텍스트 입력"}
                      disabled={textSending || !!sendStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (textSending || sendStatus) return;
                        if (textMode) {
                          setTextMode(false);
                          inputRef.current?.blur();
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

    </div>
  );
}
