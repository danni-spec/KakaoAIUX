import { SquircleAvatar } from "./SquircleAvatar";

export function Header({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <header className={`flex items-center justify-between px-4 pt-1 pb-3 transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
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
      <div className="flex items-center gap-0.5">
        <button className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"}`} aria-label="검색">
          <img src="/header-search.png" alt="" className={`w-[22px] h-[22px] object-contain ${darkMode ? "invert" : ""}`} />
        </button>
        <button className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"}`} aria-label="추가">
          <img src="/header-add.png" alt="" className={`w-[22px] h-[22px] object-contain ${darkMode ? "invert" : ""}`} />
        </button>
        <button className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"}`} aria-label="선물">
          <img src="/header-gift.png" alt="" className={`w-[22px] h-[22px] object-contain ${darkMode ? "invert" : ""}`} />
        </button>
        <button className={`p-2 rounded-full transition-colors ${darkMode ? "hover:bg-white/10 active:bg-white/20" : "hover:bg-gray-100 active:bg-gray-200"}`} aria-label="설정">
          <img src="/header-setting.png" alt="" className={`w-[22px] h-[22px] object-contain ${darkMode ? "invert" : ""}`} />
        </button>
      </div>
    </header>
  );
}
