/**
 * GNB 헤더 우측 아이콘 버튼 바 (공통 시스템)
 * - 아이콘 사이즈: 24×24
 * - 아이콘 간격: 20px
 * - 우측 여백: 20px (부모 px-4(16px) + marginRight 4px)
 * - 최대 4개까지 제공 가능
 */

export interface HeaderIcon {
  src: string;
  label: string;
  onClick?: () => void;
}

interface HeaderIconBarProps {
  icons: HeaderIcon[];
  darkMode?: boolean;
}

export function HeaderIconBar({ icons, darkMode = false }: HeaderIconBarProps) {
  return (
    <div className="flex items-center gap-[20px]" style={{ marginRight: 4 }}>
      {icons.map((icon) => (
        <button
          key={icon.label}
          type="button"
          aria-label={icon.label}
          onClick={icon.onClick}
        >
          <img
            src={icon.src}
            alt=""
            className={`w-[24px] h-[24px] ${darkMode ? "invert" : ""}`}
          />
        </button>
      ))}
    </div>
  );
}
