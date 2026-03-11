import type { CSSProperties } from "react";

/** 채팅 말풍선 border-radius (전체 공통) */
export const CHAT_BUBBLE_RADIUS = 14;

/** AI 레이어 보낸 말풍선 스타일 */
export const AI_SENT_BUBBLE_STYLE: CSSProperties = {
  borderRadius: 30,
  backgroundColor: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,1)",
  marginTop: 12,
  marginRight: 8,
  minHeight: 44,
  paddingTop: 6,
  paddingBottom: 6,
};

export const AI_SENT_BUBBLE_CLASS = "max-w-[92%] px-3.5 flex items-center text-[16px] font-medium leading-snug text-black";

/** AI 레이어 받은 말풍선 스타일 */
export const AI_RECEIVED_BUBBLE_STYLE: CSSProperties = {
  paddingTop: 6,
  paddingBottom: 6,
};

export const AI_RECEIVED_BUBBLE_CLASS = "max-w-[85%] min-w-0 ml-[12px] text-[17px] font-normal";
