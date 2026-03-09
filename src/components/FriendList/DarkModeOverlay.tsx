interface DarkModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  onToggle: (value: boolean) => void;
  onOpenAI?: () => void;
}

export function DarkModeOverlay({ isOpen, onClose, darkMode, onToggle, onOpenAI }: DarkModeOverlayProps) {

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50">
      {/* ── 배경 딤 ── */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        onTouchEnd={onClose}
        aria-hidden="true"
      />

      {/* ── 다크모드 설정 카드 (탑바/GNB 상단 끝 정렬) ── */}
      <div
        className="absolute right-4 left-4"
        style={{ top: 56 }}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* 카드 본체 */}
        <div
          className={`relative rounded-[24px] overflow-hidden backdrop-blur-[12px] px-5 py-4 transition-colors duration-500 ${darkMode ? "bg-[#2c2c2e]/90" : "bg-white/80"}`}
          style={{ boxShadow: darkMode ? "inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)" : "inset 0 0 0 1px rgba(255,255,255,0.8), 0 8px 32px rgba(0,0,0,0.12)" }}
        >
          {/* 아이콘 + 다크모드 + 디스크립션 가로 정렬 */}
          <div className="flex items-center gap-4 mb-3">
            {/* 아이콘 */}
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: "#1c1c1e" }}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
              </svg>
            </div>
            {/* 텍스트 */}
            <div className="flex-1 min-w-0">
              <h2 className={`text-[17px] font-bold leading-tight transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"}`}>
                다크 모드
              </h2>
              <p className={`text-[13px] mt-0.5 transition-colors duration-500 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                화면을 어둡게 전환합니다
              </p>
            </div>
          </div>

          {/* 토글 */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{ background: darkMode ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.5)" }}
          >
            <span className={`text-[16px] font-medium transition-colors duration-500 ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
              {darkMode ? "켜짐" : "꺼짐"}
            </span>
            <button
              type="button"
              className="relative w-[52px] h-[32px] rounded-full transition-colors duration-300"
              style={{
                background: darkMode
                  ? "#ffe500"
                  : "rgba(156,163,175,0.6)",
                boxShadow: "inset 0 0 0 1px rgba(25,25,25,0.04)",
              }}
              onClick={() => onToggle(!darkMode)}
            >
              <div
                className="absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white transition-transform duration-300 flex items-center justify-center"
                style={{
                  transform: darkMode ? "translateX(23px)" : "translateX(3px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(25,25,25,0.04)",
                }}
              >
                {darkMode ? (
                  <svg className="w-3.5 h-3.5 text-[#000000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

      </div>

      {/* ── 카나나에게 요청하기 버튼 (GNB 바로 위 정렬) ── */}
      <button
        type="button"
        className="absolute left-1/2 -translate-x-1/2 h-[52px] rounded-[40px] px-5 flex items-center justify-center gap-2 text-[15px] font-semibold text-white whitespace-nowrap active:opacity-80 outline-none border-none ring-0 shadow-none focus:outline-none focus:ring-0"
        style={{ bottom: 30 + (62 - 52) / 2, background: "linear-gradient(135deg, #FF538A, #E91E8A)", boxShadow: "none", outline: "none", border: "none" }}
        onClick={() => {
          onClose();
          onOpenAI?.();
        }}
      >
        <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
        </svg>
        Kanana에게 요청하기
      </button>
    </div>
  );
}
