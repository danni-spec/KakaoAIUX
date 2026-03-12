import { SquircleAvatar } from "./SquircleAvatar";

interface AIFriendsSectionProps {
  darkMode?: boolean;
  onOpenAI?: () => void;
  onJournalClick?: () => void;
}

const AI_FRIENDS = [
  { name: "카나나 어시스턴트", subtitle: "카카오 어시스턴트를 만나보세요", photo: "/voice-effect.png", opensAILayer: true },
  { name: "카나나", subtitle: "대화를 통해 브링핑 받아보세요", photo: "/kananalogo.png", opensAILayer: false },
  { name: "ChatGPT for Kakao", subtitle: "AI 대화", photo: "/chatgpt.png", opensAILayer: false },
];

export function AIFriendsSection({ darkMode = false, onOpenAI, onJournalClick }: AIFriendsSectionProps) {
  return (
    <section className="mb-5">
      <h2 className="text-[13px] font-medium text-gray-400 px-4 mb-3">
        AI 친구 {AI_FRIENDS.length}
      </h2>
      <div>
        {AI_FRIENDS.map((friend) => (
          <div
            key={friend.name}
            role="button"
            tabIndex={0}
            onClick={() => friend.opensAILayer && onOpenAI?.()}
            onKeyDown={(e) => {
              if (friend.opensAILayer && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onOpenAI?.();
              }
            }}
            className={`flex items-center gap-3 px-5 py-2 cursor-pointer ${darkMode ? "active:bg-white/10" : "active:bg-gray-50"}`}
          >
            <SquircleAvatar
              src={friend.photo}
              alt={friend.name}
              className="w-[40px] h-[40px]"
              noOutline={friend.name === "카나나 어시스턴트"}
            />
            <div className="flex-1 min-w-0">
              <span className={`font-normal text-[16px] leading-tight block ${darkMode ? "text-white" : "text-[#191919]"}`}>
                {friend.name}
              </span>
              <p className={`text-[12px] truncate mt-0.5 leading-tight ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>
                {friend.subtitle}
              </p>
            </div>
            {friend.name === "카나나 어시스턴트" && (
              <button
                type="button"
                className="flex-shrink-0 p-2 rounded-full active:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  onJournalClick?.();
                }}
                aria-label="저널"
              >
                <svg className={`w-6 h-6 ${darkMode ? "text-gray-300" : "text-[#767676]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
