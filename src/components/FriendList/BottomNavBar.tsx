/**
 * Apple Liquid Glass 스타일 플로팅 GNB
 *
 * ┌─ 구조 ────────────────────────────────────────────────────────────────────┐
 * │  position: absolute  →  콘텐츠 위에 오버레이 (backdrop-blur 실효)         │
 * │  inset-x-[30px] bottom-[4px]   →  좌우 30px, 하단 4px 여백               │
 * │  h-[62px] rounded-[80px]  →  높이 62px, 아이콘 25px·버튼 48px 상하 센터   │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ 재질 레이어 (아래 → 위) ─────────────────────────────────────────────────┐
 * │  1. backdrop-blur(30px)          블러된 배경 투영                         │
 * │  2. bg-white/[0.50]              반투명 White 50% 레이어                  │
 * │  3. bg-gradient (from-white/15)  상단 내부 반사 shimmer                   │
 * │  4. inset box-shadow             ─ 0.5px 전체 White stroke (유리 테두리)   │
 * │                                  ─ 1px 상단 White stroke (0.5pt 두께감)   │
 * └───────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ 그림자 ──────────────────────────────────────────────────────────────────┐
 * │  0 16px 48px rgba(0,0,0,0.09)  →  낮은 농도 + 넓은 반경 = soft spread    │
 * │  0 4px  16px rgba(0,0,0,0.06)  →  근거리 ambient                         │
 * └───────────────────────────────────────────────────────────────────────────┘
 */

const GLASS_SHADOW_LIGHT = [
  "0 16px 48px rgba(0,0,0,0.09)",
  "0 4px 16px rgba(0,0,0,0.06)",
  "inset 0 0 0 0.5px rgba(255,255,255,0.55)",
  "inset 0 1px 0 rgba(255,255,255,0.92)",
].join(", ");

const GLASS_SHADOW_DARK = [
  "0 16px 48px rgba(0,0,0,0.3)",
  "0 4px 16px rgba(0,0,0,0.2)",
  "inset 0 0 0 0.5px rgba(255,255,255,0.12)",
  "inset 0 1px 0 rgba(255,255,255,0.15)",
].join(", ");

const NAV_ITEMS = [
  { src: "/gnb-tab-1.png" },
  { src: "/gnb-tab-2.png", badgeIndex: 1 },
  { src: "/gnb-tab-3.png" },
  { src: "/gnb-tab-4.png" },
  { src: "/gnb-tab-5.png" },
];

export function BottomNavBar({ darkMode = false, activeTab = 0, onTabChange, unreadCount = 0, disabled = false }: { darkMode?: boolean; activeTab?: number; onTabChange?: (tab: number) => void; unreadCount?: number; disabled?: boolean }) {
  return (
    <nav
      className={[
        "fixed left-[30px] right-[30px] z-20",
        "h-[62px] rounded-[80px] overflow-hidden flex items-center",
        "backdrop-blur-[30px]",
        darkMode ? "bg-[#2c2c2e]/70" : "bg-white/[0.50]",
      ].join(" ")}
      style={{
        boxShadow: darkMode ? GLASS_SHADOW_DARK : GLASS_SHADOW_LIGHT,
        bottom: "calc(4px + env(safe-area-inset-bottom))",
        pointerEvents: disabled ? "none" : undefined,
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 40%, rgba(255,255,255,0) 100%)"
            : "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="relative flex flex-1 items-center" style={{ padding: "0 7px" }}>
        {NAV_ITEMS.map((item, i) => {
          const isActive = i === activeTab;
          return (
            <button
              key={i}
              className="flex-1 flex items-center justify-center h-12 relative"
              onClick={() => i < 2 && onTabChange?.(i)}
            >
              {isActive && (
                <span className={`absolute inset-0 rounded-[40px] ${darkMode ? "bg-white/[0.12]" : "bg-black/[0.12]"}`} />
              )}

              <div className="relative z-10 flex items-center justify-center w-[25px] h-[25px]" style={i >= 2 ? { opacity: 0.2 } : undefined}>
                <img
                  src={item.src}
                  alt=""
                  className={`w-[25px] h-[25px] object-contain ${darkMode ? "invert" : ""}`}
                />
                {item.badgeIndex === 1 && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-red-500 text-white text-[9.5px] font-bold rounded-full flex items-center justify-center px-[3px] leading-none shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
