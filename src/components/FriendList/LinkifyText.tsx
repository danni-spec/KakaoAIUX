import { useState } from "react";

/** 링키파이 대상 키워드 (서은재 채팅방·팝업 서제스트 공통) */
export const LINKIFY_KEYWORDS = ["에르메스 립밤", "성수동 뚜흐느솔로", "어디쯤이야?"] as const;

export function parseLinkifyText(text: string): { type: "text" | "link"; value: string }[] {
  const segments: { type: "text" | "link"; value: string }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let earliestMatch: { keyword: string; index: number } | null = null;

    for (const kw of LINKIFY_KEYWORDS) {
      const idx = remaining.indexOf(kw);
      if (idx !== -1 && (earliestMatch === null || idx < earliestMatch.index)) {
        earliestMatch = { keyword: kw, index: idx };
      }
    }

    if (earliestMatch === null) {
      remaining && segments.push({ type: "text", value: remaining });
      break;
    }

    if (earliestMatch.index > 0) {
      segments.push({ type: "text", value: remaining.slice(0, earliestMatch.index) });
    }
    segments.push({ type: "link", value: earliestMatch.keyword });
    remaining = remaining.slice(earliestMatch.index + earliestMatch.keyword.length);
  }

  return segments;
}

const LINK_STYLE: React.CSSProperties = {
  background: "linear-gradient(90deg, #E83070, #E83070 40%, #FFD700 48%, #FFD700 52%, #E83070 60%, #E83070)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

interface LinkifyTextProps {
  text: string;
  onLinkClick?: (keyword: string) => void;
}

export function LinkifyText({ text, onLinkClick }: LinkifyTextProps) {
  const segments = parseLinkifyText(text);
  const [tapped, setTapped] = useState<Set<number>>(() => new Set());
  if (segments.length === 1 && segments[0].type === "text") return <>{text}</>;
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === "link" ? (
          tapped.has(i) ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <span
              key={i}
              role="button"
              tabIndex={0}
              className="cursor-pointer active:opacity-80 animate-pink-flow"
              style={LINK_STYLE}
              onClick={(e) => {
                e.stopPropagation();
                setTapped((prev) => new Set(prev).add(i));
                onLinkClick?.(seg.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setTapped((prev) => new Set(prev).add(i));
                  onLinkClick?.(seg.value);
                }
              }}
            >
              {seg.value}
            </span>
          )
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </>
  );
}
