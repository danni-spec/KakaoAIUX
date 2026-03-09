/**
 * iOS 26 Liquid Glass 한글 2벌식 가상 키보드
 *
 * ┌─ Liquid Glass 재질 ───────────────────────────────────────┐
 * │  • backdrop-filter: blur(40px) — 배경 콘텐츠 프로스트      │
 * │  • 반투명 배경 rgba(230,232,238,0.72) — 빛 투과            │
 * │  • 키: 반투명 흰색 오버레이 + 미세 border (그림자 X)       │
 * │  • 상단 라운드 코너 (rounded-t-[14px])                     │
 * │  • inset 하이라이트로 유리 두께감 표현                      │
 * └───────────────────────────────────────────────────────────┘
 */

/* ── 자모 배열 ── */
const ROW_1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"];
const ROW_2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"];
const ROW_3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"];

/* ── Liquid Glass 키 스타일 ── */
const KEY_STYLE_LIGHT: React.CSSProperties = {
  background: "rgba(255,255,255,0.45)",
  border: "0.5px solid rgba(255,255,255,0.55)",
  borderRadius: 7,
  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.7)",
};

const SPECIAL_STYLE_LIGHT: React.CSSProperties = {
  background: "rgba(255,255,255,0.2)",
  border: "0.5px solid rgba(255,255,255,0.35)",
  borderRadius: 7,
  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5)",
};

const KEY_STYLE_DARK: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
  border: "0.5px solid rgba(255,255,255,0.2)",
  borderRadius: 7,
  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.15)",
};

const SPECIAL_STYLE_DARK: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "0.5px solid rgba(255,255,255,0.15)",
  borderRadius: 7,
  boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.1)",
};

/** strip(44) + pt(3) + 4×43 + 3×11 + pb(34) = 286 */
export const VIRTUAL_KEYBOARD_HEIGHT = 286;

/* ── 아이콘 ── */
function ShiftIcon({ dark }: { dark?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 2.5L2.5 11h4.5v6h6v-6h4.5L10 2.5z"
        stroke={dark ? "#ffffff" : "#1C1C1E"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DeleteIcon({ dark }: { dark?: boolean }) {
  return (
    <svg width="22" height="16" viewBox="0 0 26 18" fill="none">
      <path
        d="M8.5 1.5h14a2 2 0 012 2v11a2 2 0 01-2 2h-14l-6.5-7.5 6.5-7.5z"
        stroke={dark ? "#ffffff" : "#1C1C1E"}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M13 6l5 6M18 6l-5 6" stroke={dark ? "#ffffff" : "#1C1C1E"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon({ dark }: { dark?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke={dark ? "#ffffff" : "#1C1C1E"} strokeWidth="1.3">
      <circle cx="11" cy="11" r="9.5" />
      <ellipse cx="11" cy="11" rx="4.5" ry="9.5" />
      <path d="M2 8.5h18M2 13.5h18" />
    </svg>
  );
}

function MicIcon({ dark }: { dark?: boolean }) {
  return (
    <svg width="13" height="18" viewBox="0 0 13 18" fill="none">
      <rect x="3.5" y="0.5" width="6" height="11" rx="3" stroke={dark ? "#ffffff" : "#1C1C1E"} strokeWidth="1.3" />
      <path d="M0.5 9a6 6 0 0012 0" stroke={dark ? "#ffffff" : "#1C1C1E"} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.5 15v2.5" stroke={dark ? "#ffffff" : "#1C1C1E"} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/* ── 컴포넌트 ── */
export function VirtualKeyboard({ darkMode = false }: { darkMode?: boolean }) {
  const keyStyle = darkMode ? KEY_STYLE_DARK : KEY_STYLE_LIGHT;
  const specialStyle = darkMode ? SPECIAL_STYLE_DARK : SPECIAL_STYLE_LIGHT;
  const textClass = darkMode ? "text-white" : "text-[#1C1C1E]";
  const secondaryTextClass = darkMode ? "text-white/60" : "text-[#8A8A8E]";
  const autoCompleteClass = darkMode ? "text-white/50" : "text-[#3C3C43]/50";
  const activeClass = darkMode ? "active:bg-white/20" : "active:bg-white/60";
  const activeSpecialClass = darkMode ? "active:bg-white/15" : "active:bg-white/30";

  return (
    <div
      className="w-full select-none rounded-t-[14px] overflow-hidden"
      style={{
        background: darkMode ? "rgba(44,44,46,0.95)" : "rgba(230,232,238,0.72)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        boxShadow: darkMode ? "inset 0 0.5px 0 rgba(255,255,255,0.1)" : "inset 0 0.5px 0 rgba(255,255,255,0.6)",
        fontFamily: "-apple-system, 'SF Pro Text', sans-serif",
      }}
      onClick={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {/* ── 자동완성 스트립 ── */}
      <div
        className="h-[44px] flex items-stretch"
        style={{ borderBottom: darkMode ? "0.5px solid rgba(255,255,255,0.1)" : "0.5px solid rgba(0,0,0,0.08)" }}
      >
        <div className={`flex-1 flex items-center justify-center text-[16px] ${autoCompleteClass}`}>
          "나"
        </div>
        <div className="w-px self-stretch my-2.5" style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }} />
        <div className={`flex-1 flex items-center justify-center text-[16px] ${autoCompleteClass}`}>
          "이"
        </div>
        <div className="w-px self-stretch my-2.5" style={{ background: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }} />
        <div className={`flex-1 flex items-center justify-center text-[16px] ${autoCompleteClass}`}>
          "그"
        </div>
      </div>

      {/* ── 키 영역 ── */}
      <div className="px-[3px] pt-[3px] pb-[34px] flex flex-col gap-[11px]">
        {/* Row 1 — 10자모 */}
        <div className="flex gap-[5px]">
          {ROW_1.map((k) => (
            <button
              key={k}
              className={`flex-1 h-[43px] flex items-center justify-center text-[22px] ${textClass} ${activeClass}`}
              style={keyStyle}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Row 2 — 9자모 */}
        <div className="flex gap-[5px] px-[16px]">
          {ROW_2.map((k) => (
            <button
              key={k}
              className={`flex-1 h-[43px] flex items-center justify-center text-[22px] ${textClass} ${activeClass}`}
              style={keyStyle}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Row 3 — ⇧ + 7자모 + ⌫ */}
        <div className="flex gap-[5px]">
          <button
            className={`w-[44px] h-[43px] flex items-center justify-center ${activeSpecialClass}`}
            style={specialStyle}
          >
            <ShiftIcon dark={darkMode} />
          </button>
          <div className="flex-1 flex gap-[5px]">
            {ROW_3.map((k) => (
              <button
                key={k}
                className={`flex-1 h-[43px] flex items-center justify-center text-[22px] ${textClass} ${activeClass}`}
                style={keyStyle}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            className={`w-[44px] h-[43px] flex items-center justify-center ${activeSpecialClass}`}
            style={specialStyle}
          >
            <DeleteIcon dark={darkMode} />
          </button>
        </div>

        {/* Row 4 — 123 · 🌐 · 🎤 · 스페이스 · 리턴 */}
        <div className="flex gap-[5px]">
          <button
            className={`w-[44px] h-[43px] flex items-center justify-center text-[15px] font-medium ${textClass} ${activeSpecialClass}`}
            style={specialStyle}
          >
            123
          </button>
          <button
            className={`w-[40px] h-[43px] flex items-center justify-center ${activeSpecialClass}`}
            style={specialStyle}
          >
            <GlobeIcon dark={darkMode} />
          </button>
          <button
            className={`w-[40px] h-[43px] flex items-center justify-center ${activeSpecialClass}`}
            style={specialStyle}
          >
            <MicIcon dark={darkMode} />
          </button>
          <button
            className={`flex-1 h-[43px] flex items-center justify-center text-[16px] ${secondaryTextClass} ${activeClass}`}
            style={keyStyle}
          >
            스페이스
          </button>
          <button
            className={`w-[88px] h-[43px] flex items-center justify-center text-[16px] ${textClass} ${activeSpecialClass}`}
            style={specialStyle}
          >
            리턴
          </button>
        </div>
      </div>
    </div>
  );
}
