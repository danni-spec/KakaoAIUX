import { useState, useEffect } from "react";

interface MapLayerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
}

export function MapLayerOverlay({ isOpen, onClose, destination }: MapLayerOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen, visible]);

  if (!visible) return null;

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50">
      {/* ── 배경 딤 ── */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${closing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
        onTouchEnd={(e) => { e.preventDefault(); handleClose(); }}
        aria-hidden="true"
      />

      {/* ── 지도 카드 ── */}
      <div
        className={`absolute left-4 right-4 rounded-[24px] overflow-hidden ${closing ? "animate-map-slide-up" : "animate-map-slide-down"}`}
        style={{ top: 56, WebkitBackdropFilter: "blur(10px)", backdropFilter: "blur(10px)", backgroundColor: "rgba(255,255,255,0.80)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.8), 0 8px 32px rgba(0,0,0,0.12)" }}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
          {/* ── 헤더: 핀 아이콘 + 목적지명 + X 닫기 ── */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-blue-500">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-gray-900 leading-tight">{destination}</h2>
                <p className="text-[13px] text-gray-500 mt-0.5">경로 안내</p>
              </div>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.06)" }}
              onClick={handleClose}
              aria-label="닫기"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ── 가상 지도 (CSS-only) ── */}
          <div className="mx-4 rounded-2xl overflow-hidden relative" style={{ height: 200 }}>
            {/* 배경 그라디언트 */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, #e8f4f8 0%, #d1ecf1 30%, #e2f0e8 60%, #f0f4e8 100%)" }}
            />
            {/* 도로 그리드선 */}
            <div className="absolute inset-0" style={{ opacity: 0.3 }}>
              {/* 가로선 */}
              <div className="absolute left-0 right-0 h-[2px] bg-white/80" style={{ top: "25%" }} />
              <div className="absolute left-0 right-0 h-[2px] bg-white/80" style={{ top: "50%" }} />
              <div className="absolute left-0 right-0 h-[2px] bg-white/80" style={{ top: "75%" }} />
              {/* 세로선 */}
              <div className="absolute top-0 bottom-0 w-[2px] bg-white/80" style={{ left: "20%" }} />
              <div className="absolute top-0 bottom-0 w-[2px] bg-white/80" style={{ left: "45%" }} />
              <div className="absolute top-0 bottom-0 w-[2px] bg-white/80" style={{ left: "70%" }} />
            </div>
            {/* 주요 도로 */}
            <div className="absolute h-[6px] rounded-full bg-white/70" style={{ top: "40%", left: "5%", right: "10%" }} />
            <div className="absolute w-[6px] rounded-full bg-white/70" style={{ left: "55%", top: "10%", bottom: "15%" }} />

            {/* 파란 점선 경로 */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 200" fill="none">
              <path
                d="M60 160 C60 140, 80 120, 120 110 C160 100, 180 80, 200 70 C220 60, 260 50, 300 45"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray="8 4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* 출발 마커 */}
            <div className="absolute flex flex-col items-center" style={{ left: 44, top: 140 }}>
              <div className="w-[28px] h-[28px] rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                <div className="w-[10px] h-[10px] rounded-full bg-white" />
              </div>
              <span className="text-[10px] font-bold text-green-700 mt-1 bg-white/80 px-1.5 py-0.5 rounded">출발</span>
            </div>

            {/* 도착 마커 */}
            <div className="absolute flex flex-col items-center" style={{ right: 36, top: 20 }}>
              <div className="w-[28px] h-[28px] rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-blue-700 mt-1 bg-white/80 px-1.5 py-0.5 rounded">{destination}</span>
            </div>
          </div>

          {/* ── 경로 정보 ── */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[24px] font-bold text-gray-900">23분</span>
              <span className="text-[15px] text-gray-500">· 12.4km</span>
            </div>
          </div>

          {/* ── 교통수단 3칸 ── */}
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              {/* 지하철 */}
              <div className="flex-1 rounded-2xl px-3 py-3 flex flex-col items-center gap-1.5 bg-blue-50">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-6H6V6h5v5zm2 0V6h5v5h-5zm3.5 6c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
                <span className="text-[13px] font-semibold text-blue-700">지하철</span>
                <span className="text-[12px] text-blue-600/70">23분</span>
              </div>
              {/* 버스 */}
              <div className="flex-1 rounded-2xl px-3 py-3 flex flex-col items-center gap-1.5 bg-green-50">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
                </svg>
                <span className="text-[13px] font-semibold text-green-700">버스</span>
                <span className="text-[12px] text-green-600/70">35분</span>
              </div>
              {/* 자동차 */}
              <div className="flex-1 rounded-2xl px-3 py-3 flex flex-col items-center gap-1.5 bg-orange-50">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                </svg>
                <span className="text-[13px] font-semibold text-orange-700">자동차</span>
                <span className="text-[12px] text-orange-600/70">18분</span>
              </div>
            </div>
          </div>

          {/* ── CTA 버튼 ── */}
          <div className="px-4 pb-4">
            <button
              type="button"
              className="w-full h-[48px] rounded-[40px] flex items-center justify-center gap-2 text-[15px] font-semibold text-white active:opacity-80"
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}
            >
              카카오맵에서 열기
            </button>
          </div>
      </div>
    </div>
  );
}
