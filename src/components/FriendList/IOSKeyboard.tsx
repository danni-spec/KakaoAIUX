/**
 * iOS 26 Liquid Glass 키보드 — 실제 스크린샷 기반 재현
 *
 * - 모든 키: 흰색 라운드 사각형 배경 (문자/특수 동일)
 * - 키 사이 넓은 간격, borderRadius ~10px
 * - 하단: 123 | 😊 | 스페이스(EN) | . | 파란→버튼
 * - 최하단: 🌐(좌) 🎙(우)
 * - 키 영역이 둥근 밝은 패널로 감싸짐
 * - 한글 두벌식 배열
 */

const ROW1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"];
const ROW2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"];
const ROW3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"];

export function IOSKeyboard({
  visible,
  darkMode = false,
  onKey,
  onBackspace,
  onReturn,
}: {
  visible: boolean;
  darkMode?: boolean;
  onKey?: (key: string) => void;
  onBackspace?: () => void;
  onReturn?: () => void;
}) {
  if (!visible) return null;

  const textColor = darkMode ? "#f5f5f7" : "#000000";
  const keyBg = darkMode ? "rgba(255,255,255,0.14)" : "#ffffff";
  const panelBg = darkMode ? "rgba(58,58,60,0.80)" : "rgba(210,213,219,0.95)";
  const outerBg = darkMode ? "rgba(44,44,46,0.90)" : "rgba(200,203,210,0.92)";
  const iconColor = darkMode ? "#ffffff" : "#000000";

  const keyBase: React.CSSProperties = {
    background: keyBg,
    border: "none",
    borderRadius: 10,
    color: textColor,
    fontSize: 22,
    fontWeight: 400,
    fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    height: 44,
    WebkitTapHighlightColor: "transparent",
    boxShadow: darkMode
      ? "0 1px 1px rgba(0,0,0,0.3)"
      : "0 1px 2px rgba(0,0,0,0.08)",
  };

  return (
    <div
      style={{
        background: outerBg,
        width: "100%",
        flexShrink: 0,
        paddingBottom: 0,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* ── 키 패널 (둥근 밝은 영역) ── */}
      <div
        style={{
          background: panelBg,
          borderRadius: "18px 18px 0 0",
          padding: "14px 5px 8px",
          margin: "0",
        }}
      >
        {/* Row 1 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: "0 1px" }}>
          {ROW1.map((k) => (
            <button key={k} style={{ ...keyBase, flex: 1 }} onClick={() => onKey?.(k)}>
              {k}
            </button>
          ))}
        </div>

        {/* Row 2 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: "0 16px" }}>
          {ROW2.map((k) => (
            <button key={k} style={{ ...keyBase, flex: 1 }} onClick={() => onKey?.(k)}>
              {k}
            </button>
          ))}
        </div>

        {/* Row 3 — shift + letters + backspace */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10, padding: "0 1px", alignItems: "center" }}>
          {/* Shift */}
          <button style={{ ...keyBase, width: 44, flexShrink: 0, fontSize: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4L3 14h5v5h8v-5h5z" />
            </svg>
          </button>
          <div style={{ display: "flex", gap: 6, flex: 1 }}>
            {ROW3.map((k) => (
              <button key={k} style={{ ...keyBase, flex: 1 }} onClick={() => onKey?.(k)}>
                {k}
              </button>
            ))}
          </div>
          {/* Backspace */}
          <button style={{ ...keyBase, width: 44, flexShrink: 0, fontSize: 0 }} onClick={() => onBackspace?.()}>
            <svg width="24" height="18" viewBox="0 0 28 20" fill="none" stroke={iconColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M25 1H10L2 10l8 9h15a2 2 0 002-2V3a2 2 0 00-2-2z" />
              <line x1="15" y1="6.5" x2="21" y2="13.5" />
              <line x1="21" y1="6.5" x2="15" y2="13.5" />
            </svg>
          </button>
        </div>

        {/* Bottom row — 123 | 😊 | space(한) | . | blue→ */}
        <div style={{ display: "flex", gap: 6, padding: "0 1px", alignItems: "center" }}>
          {/* 123 */}
          <button style={{ ...keyBase, width: 50, flexShrink: 0, fontSize: 17, fontWeight: 500 }}>
            123
          </button>
          {/* 😊 */}
          <button style={{ ...keyBase, width: 44, flexShrink: 0, fontSize: 22 }}>
            😊
          </button>
          {/* Space */}
          <button
            style={{ ...keyBase, flex: 1, fontSize: 16, color: darkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", position: "relative" }}
            onClick={() => onKey?.(" ")}
          >
            <span style={{ position: "absolute", right: 12, bottom: 8, fontSize: 11, fontWeight: 500, opacity: 0.4 }}>한</span>
          </button>
          {/* . (마침표) */}
          <button style={{ ...keyBase, width: 44, flexShrink: 0, fontSize: 20, fontWeight: 600 }} onClick={() => onKey?.(".")}>
            .
          </button>
          {/* 파란 보내기 버튼 (→) */}
          <button
            style={{
              ...keyBase,
              width: 50,
              flexShrink: 0,
              background: "#007AFF",
              color: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,122,255,0.3)",
            }}
            onClick={() => onReturn?.()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── 최하단 바: 🌐(좌) + 🎙(우) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px 12px" }}>
        <button
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
          </svg>
        </button>
        <button
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="1" width="6" height="13" rx="3" />
            <path d="M5 10a7 7 0 0014 0" />
            <line x1="12" y1="17" x2="12" y2="22" />
          </svg>
        </button>
      </div>
    </div>
  );
}
