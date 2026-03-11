import { SquircleAvatar } from "./SquircleAvatar";

interface AIFriendsSectionProps {
  darkMode?: boolean;
  onOpenAI?: () => void;
}

const AI_FRIENDS = [
  { name: "카나나 어시스턴트", subtitle: "카카오 어시스턴트를 만나보세요", photo: "/voice-effect.png", opensAILayer: true },
  { name: "카나나", subtitle: "대화를 통해 브링핑 받아보세요", photo: "/kananalogo.png", opensAILayer: false },
  { name: "ChatGPT for Kakao", subtitle: "AI 대화", photo: "/chatgpt.png", opensAILayer: false },
];

export function AIFriendsSection({ darkMode = false, onOpenAI }: AIFriendsSectionProps) {
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
            />
            <div className="flex-1 min-w-0">
              <span className={`font-normal text-[16px] leading-tight block ${darkMode ? "text-white" : "text-[#191919]"}`}>
                {friend.name}
              </span>
              <p className={`text-[12px] truncate mt-0.5 leading-tight ${darkMode ? "text-gray-400" : "text-[#767676]"}`}>
                {friend.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
