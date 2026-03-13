import { useState, useEffect, createContext, useContext } from "react";
import { FriendList } from "./components/FriendList";
import { ChatRoomProvider } from "./contexts/ChatRoomContext";
const FRAME_H = 852;

export type PersonaId = "golf" | "shopping" | "appointment";

export interface Persona {
  id: PersonaId;
  name: string;
  avatar: string;
  color: string;
  scenario: string;
}

const PERSONAS: Persona[] = [
  { id: "golf", name: "서울사는 김부장", avatar: "/profile-kimbujan.png", color: "#4A8DF6", scenario: "골프" },
  { id: "shopping", name: "Charlotte", avatar: "/profile-yuna.png", color: "#F06292", scenario: "쇼핑" },
  { id: "appointment", name: "이해수", avatar: "/profile-ieun.png", color: "#66BB6A", scenario: "약속" },
];

const PERSONA_DESC: Record<PersonaId, { title: string; subtitle: string; desc: string }> = {
  golf: {
    title: "서울사는 김부장",
    subtitle: "",
    desc: "",
  },
  shopping: {
    title: "Charlotte",
    subtitle: "",
    desc: "",
  },
  appointment: {
    title: "이해수",
    subtitle: "",
    desc: "",
  },
};

const PersonaContext = createContext<Persona>(PERSONAS[0]);
export const usePersona = () => useContext(PersonaContext);

function App() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const [scale, setScale] = useState(1);
  const [activePersona, setActivePersona] = useState<PersonaId>("golf");
  const [deviceKey, setDeviceKey] = useState(0);

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      // 상하 여백 200px(상100+하100), 좌우 여백 200px 고정
      const s = Math.min((vh - 200) / FRAME_H, (vw - 200) / 393);
      setScale(Math.max(s, 0.3));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const currentPersona = PERSONAS.find(p => p.id === activePersona) || PERSONAS[0];

  const handlePersonaChange = (id: PersonaId) => {
    if (id === activePersona) return;
    setActivePersona(id);
    setDeviceKey(k => k + 1);
    setShowWalkthrough(false);
  };

  return (
    <PersonaContext.Provider value={currentPersona}>
      <ChatRoomProvider key={deviceKey}>
        {/* 브라우저 전체 배경 */}
        <div className="w-full h-[100dvh] flex items-center justify-center bg-[#D7DFE8] overflow-hidden relative">

          {/* 좌측 페르소나 버튼 + 소개글 */}
          <div
            className="absolute flex flex-col gap-6 z-50"
            style={{ left: 32, top: "50%", transform: "translateY(-50%)" }}
          >
            {PERSONAS.filter((p) => p.id !== "appointment").map((p) => {
              const desc = PERSONA_DESC[p.id];
              const isActive = activePersona === p.id;
              return (
                <div key={p.id} className="relative flex items-start">
                  <button
                    type="button"
                    className="relative flex flex-col items-center gap-1.5 group"
                    onClick={() => handlePersonaChange(p.id)}
                  >
                    <div
                      className="w-[72px] h-[72px] rounded-full overflow-hidden transition-all duration-200"
                      style={{
                        outline: "3px solid transparent",
                        outlineOffset: 2,
                        opacity: isActive ? 1 : 0.5,
                        filter: isActive ? "none" : "grayscale(100%)",
                      }}
                    >
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  </button>
                  {isActive && desc.desc && (
                    <div
                      className="absolute left-[112px] w-[340px] transition-opacity duration-300"
                      style={{ opacity: 1 }}
                    >
                      <p className="text-[22px] font-bold text-[#191919] mb-1">{desc.title}</p>
                      <p className="text-[15px] font-semibold text-[#F06292] leading-tight mb-2">{desc.subtitle}</p>
                      <p className="text-[15px] text-[#191919] leading-[1.6] whitespace-pre-line">{desc.desc}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 디바이스 프레임 (라인 보더) */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              width: 393,
              height: FRAME_H,
              borderRadius: 48,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
              outline: "12px solid #000000",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            <div className="w-full h-full overflow-hidden relative">
              <FriendList key={deviceKey} />
              {showWalkthrough && (
                <div
                  className="absolute inset-0 z-[100] flex flex-col items-center justify-center cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.55)" }}
                  onClick={() => setShowWalkthrough(false)}
                >
                  <img
                    src="/walkthrough.png"
                    alt="톡 어디에서든 원을 그려 Kanana를 만나보세요"
                    className="w-[76%] max-h-[73%] object-contain"
                    style={{ pointerEvents: "none" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </ChatRoomProvider>
    </PersonaContext.Provider>
  );
}

export default App;
