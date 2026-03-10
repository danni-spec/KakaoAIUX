import { useEffect, useState, useCallback, useRef } from "react";
import { SquircleAvatar } from "./SquircleAvatar";

interface NotificationBannerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationBanner({ isOpen, onClose }: NotificationBannerProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      closingRef.current = false;
      onClose();
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
      closingRef.current = false;
      const timer = setTimeout(dismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-x-0 z-40 ${closing ? "animate-slide-up" : "animate-slide-down"}`}
      style={{ top: 46 }}
      onClick={dismiss}
    >
      <div className="flex items-center gap-3 px-4 py-3 rounded-b-2xl bg-white backdrop-blur-xl shadow-lg border-b border-black/5 cursor-pointer">
        <SquircleAvatar
          src="/profile-jieun.png"
          alt="이해수"
          className="w-[48px] h-[48px] flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#191919] leading-tight">이해수 ❤️</p>
          <p className="text-[12.5px] text-[#555] leading-snug truncate">
            오빠 오늘 늦지말고, 챙겨오라는 거 챙겨와
          </p>
        </div>
        <span className="text-[11px] text-gray-400 flex-shrink-0">지금</span>
      </div>
    </div>
  );
}
