import { useState } from "react";

export function TabNavigation({ darkMode = false }: { darkMode?: boolean }) {
  const [activeTab, setActiveTab] = useState<"friends" | "news">("friends");

  return (
    <div className={`flex gap-2 px-4 pb-3 pt-0.5 transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
      <button
        onClick={() => setActiveTab("friends")}
        className={`px-[17px] h-[36px] rounded-full font-semibold text-[14px] outline outline-1 transition-colors duration-200 ${
          activeTab === "friends"
            ? darkMode ? "bg-white text-black outline-transparent" : "bg-black text-white outline-transparent"
            : darkMode ? "bg-[#2c2c2e] text-gray-300 outline-[#3a3a3c]" : "bg-white text-black outline-gray-200 hover:bg-gray-50"
        }`}
      >
        친구
      </button>
      <button
        onClick={() => setActiveTab("news")}
        className={`px-[17px] h-[36px] rounded-full font-semibold text-[14px] outline outline-1 transition-colors duration-200 ${
          activeTab === "news"
            ? darkMode ? "bg-white text-black outline-transparent" : "bg-black text-white outline-transparent"
            : darkMode ? "bg-[#2c2c2e] text-gray-300 outline-[#3a3a3c]" : "bg-white text-black outline-gray-200 hover:bg-gray-50"
        }`}
      >
        소식
      </button>
    </div>
  );
}
