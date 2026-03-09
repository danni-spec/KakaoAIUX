import { useState, useEffect } from "react";

function useCurrentTime() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean; addEventListener: (type: string, fn: () => void) => void }> };
    if (!nav.getBattery) {
      setLevel(0.85);
      return;
    }
    nav.getBattery().then((battery) => {
      setLevel(battery.level);
      setCharging(battery.charging);
      battery.addEventListener("levelchange", () => setLevel(battery.level));
      battery.addEventListener("chargingchange", () => setCharging(battery.charging));
    });
  }, []);

  return { level: level ?? 0.85, charging };
}

export function StatusBar({ darkMode = false }: { darkMode?: boolean }) {
  const time = useCurrentTime();
  const { level } = useBattery();

  const batteryFillWidth = Math.max(0, Math.min(17, level * 17));

  return (
    <div className={`flex items-center justify-between px-6 pt-3.5 pb-1 transition-colors duration-500 ${darkMode ? "bg-[#1c1c1e]" : "bg-white"}`}>
      <span className={`text-[15px] font-semibold tracking-tight transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"}`}>{time}</span>
      <div className={`flex items-center gap-1.5 transition-colors duration-500 ${darkMode ? "text-white" : "text-gray-900"}`}>
        {/* Battery — iPhone 스타일 (몸체 + 우측 캡) */}
        <div className={`flex items-center ${darkMode ? "text-white" : "text-gray-900"}`}>
          <svg
            width="25"
            height="12"
            viewBox="0 0 25 12"
            fill="none"
            className="flex-shrink-0"
          >
            {/* 배터리 몸체 테두리 */}
            <rect
              x="0.5"
              y="1"
              width="20"
              height="10"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            {/* 우측 캡 (아이폰 양극) */}
            <rect
              x="21"
              y="3.5"
              width="2"
              height="5"
              rx="0.8"
              fill="currentColor"
            />
            {/* 배터리 충전량 */}
            <rect
              x="2"
              y="2.5"
              width={batteryFillWidth}
              height="7"
              rx="1.5"
              fill="currentColor"
              className="transition-all duration-300"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
