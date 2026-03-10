import { SquircleAvatar } from "./SquircleAvatar";
import { HeaderIconBar } from "./HeaderIconBar";
import type { HeaderIcon } from "./HeaderIconBar";

const FRIEND_HEADER_ICONS: HeaderIcon[] = [
  { src: "/header-search.png", label: "검색" },
  { src: "/header-add.png", label: "추가" },
  { src: "/header-gift.png", label: "선물" },
  { src: "/header-setting.png", label: "설정" },
];

export function Header({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <header className={`flex items-center justify-between px-4 h-[56px] transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
      {/* 내 프로필 */}
      <div className="flex items-center gap-2.5 cursor-pointer group">
        <SquircleAvatar
          src="/profile-dannion.png"
          alt="나"
          className="w-[40px] h-[40px] flex-shrink-0"
        />
        <div className="min-w-0">
          <p className={`font-bold text-[17px] leading-tight transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"}`}>Dannion.k</p>
        </div>
      </div>

      {/* 우측 아이콘들: 검색, 추가, 선물, 세팅 */}
      <HeaderIconBar icons={FRIEND_HEADER_ICONS} darkMode={darkMode} />
    </header>
  );
}
