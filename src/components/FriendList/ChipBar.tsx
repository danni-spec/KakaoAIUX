/**
 * 공통 칩 네비게이션 바
 * 친구탭(친구/소식), 채팅탭(전체/안읽음/ChatGPT/+) 등에서 사용
 */

export interface ChipItem {
  id: string;
  label: string;
  /** 아이콘 전용 칩 (+ 버튼 등) — label 무시, 항상 아이콘만 표시 */
  icon?: React.ReactNode;
  /** 비활성 시 아이콘만, 활성 시 아이콘+label 함께 표시 */
  inactiveIcon?: React.ReactNode;
}

interface ChipBarProps {
  chips: ChipItem[];
  activeId: string;
  onChange: (id: string) => void;
  darkMode?: boolean;
}

export function ChipBar({ chips, activeId, onChange, darkMode = false }: ChipBarProps) {
  return (
    <div className={`flex gap-2 px-4 pb-3 pt-0.5 overflow-x-auto scrollbar-hide transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
      {chips.map((chip) => {
        const isActive = chip.id === activeId;
        const activeStyle = darkMode
          ? "bg-white text-black outline-transparent"
          : "bg-black text-white outline-transparent";
        const inactiveStyle = darkMode
          ? "bg-[#2c2c2e] text-gray-300 outline-[#3a3a3c]"
          : "bg-white text-black outline-gray-200 hover:bg-gray-50";

        // 아이콘 전용 칩 (+ 버튼 등)
        if (chip.icon) {
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChange(chip.id)}
              className={`flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center outline outline-1 transition-colors duration-200 ${isActive ? activeStyle : inactiveStyle}`}
            >
              {chip.icon}
            </button>
          );
        }

        // 비활성=아이콘만, 활성=아이콘+레이블
        if (chip.inactiveIcon) {
          if (!isActive) {
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => onChange(chip.id)}
                className={`flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center outline outline-1 transition-colors duration-200 ${inactiveStyle}`}
              >
                {chip.inactiveIcon}
              </button>
            );
          }
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChange(chip.id)}
              className={`flex-shrink-0 px-[12px] h-[36px] rounded-full font-semibold text-[14px] outline outline-1 transition-colors duration-200 flex items-center gap-1.5 ${activeStyle}`}
            >
              <span className={darkMode ? "" : "invert"}>{chip.inactiveIcon}</span>
              {chip.label}
            </button>
          );
        }

        // 기본 텍스트 칩
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={`flex-shrink-0 px-[17px] h-[36px] rounded-full font-semibold text-[14px] outline outline-1 transition-colors duration-200 ${isActive ? activeStyle : inactiveStyle}`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
