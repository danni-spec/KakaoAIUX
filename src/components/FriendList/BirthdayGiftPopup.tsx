import { useState, useEffect } from "react";

interface BirthdayGiftPopupProps {
  isOpen: boolean;
  onClose: () => void;
  friendName: string;
  friendPhoto: string;
}

type Phase = "wishlist" | "confirm" | "complete";

const PRODUCT = {
  name: "루즈 에르메스 립 케어 밤",
  option: "립 케어 밤 선물포장",
  reviewCount: 100,
  satisfactionPct: 94,
  originalPrice: 98000,
  salePrice: 97000,
  image: "/hermes.png",
  payMethod: "카카오페이 연결카드",
  discount: "현대카드 1천원 즉시 할인",
};

export function BirthdayGiftPopup({
  isOpen,
  onClose,
  friendName,
  friendPhoto,
}: BirthdayGiftPopupProps) {
  const [phase, setPhase] = useState<Phase>("wishlist");
  const [closing, setClosing] = useState(false);

  // Reset phase when popup closes
  useEffect(() => {
    if (!isOpen) {
      setPhase("wishlist");
      setClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => onClose(), 250);
  };

  const handlePayment = () => {
    setTimeout(() => setPhase("complete"), 500);
  };

  if (!isOpen && !closing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={`absolute left-4 right-4 top-[100px] z-50 overflow-hidden ${
          closing ? "animate-gift-card-exit" : "animate-gift-card-enter"
        }`}
      >
        <div className="relative">
          {/* Glow border — same pattern as AILayerPopup */}
          <div className="absolute inset-[-8px] rounded-[32px] overflow-hidden -z-10 pointer-events-none animate-glow-breathe">
            <div
              className="absolute inset-[-100%] animate-gradient-spin"
              style={{
                background:
                  "conic-gradient(from 0deg, #ec4899, rgba(255,255,255,0.5), #a855f7, #3b82f6, rgba(255,255,255,0.5), #06b6d4, #a855f7, #f97316, rgba(255,255,255,0.5), #ec4899)",
              }}
            />
          </div>

          {/* Card body */}
          <div className="bg-white rounded-[24px] shadow-xl overflow-hidden">
            <div key={phase} className="animate-phase-fade-in">
              {phase === "wishlist" && (
                <WishlistPhase
                  friendName={friendName}
                  onGift={() => setPhase("confirm")}
                  onAsk={handleClose}
                />
              )}
              {phase === "confirm" && (
                <ConfirmPhase
                  friendName={friendName}
                  friendPhoto={friendPhoto}
                  onPay={handlePayment}
                  onCancel={() => setPhase("wishlist")}
                />
              )}
              {phase === "complete" && (
                <CompletePhase
                  friendName={friendName}
                  onChat={handleClose}
                  onConfirm={handleClose}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Phase 1: 위시리스트 ── */
function WishlistPhase({
  friendName,
  onGift,
  onAsk,
}: {
  friendName: string;
  onGift: () => void;
  onAsk: () => void;
}) {
  return (
    <div className="p-5">
      <p className="text-[15px] text-[#191919] leading-relaxed">
        <span className="font-semibold">{friendName}</span>의 오늘 생일을
        축하해보세요.
        <br />
        카카오톡 선물하기에 친구의 위시리스트가 있어요.
      </p>
      <p className="text-[14px] text-[#191919] leading-relaxed mt-3">
        이 선물의 결제와 선물하기를 진행할까요?
        <br />
        <span className="text-[13px] text-[#999]">
          ...안심하세요! 결제 전 확인 단계가 있어요.
        </span>
      </p>

      {/* Product card */}
      <div className="mt-4 border border-gray-200 rounded-2xl p-3 flex gap-3">
        <img
          src={PRODUCT.image}
          alt={PRODUCT.name}
          className="w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#191919] leading-tight">
            {PRODUCT.name}
          </p>
          <p className="text-[12px] text-[#767676] mt-0.5">
            옵션: {PRODUCT.option}
          </p>
          <p className="text-[12px] text-[#2B7FF2] mt-1 font-medium">
            후기 {PRODUCT.reviewCount}건 중 매우만족 {PRODUCT.satisfactionPct}%
          </p>
        </div>
      </div>

      {/* Payment info */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[13px] text-[#767676]">
          {PRODUCT.payMethod}: {PRODUCT.discount}
        </p>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[13px] text-[#999] line-through">
          {PRODUCT.originalPrice.toLocaleString()}원
        </span>
        <span className="text-[16px] font-bold text-[#191919]">
          {PRODUCT.salePrice.toLocaleString()}원
        </span>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={onAsk}
          className="flex-1 py-3 rounded-xl bg-[#F0F0F0] text-[14px] font-semibold text-[#555] active:bg-[#E0E0E0] transition-colors"
        >
          질문하기
        </button>
        <button
          onClick={onGift}
          className="flex-1 py-3 rounded-xl bg-[#FEE500] text-[14px] font-semibold text-[#191919] active:bg-[#F6DD00] transition-colors"
        >
          선물하기
        </button>
      </div>
    </div>
  );
}

/* ── Phase 2: 확인 ── */
function ConfirmPhase({
  friendName,
  friendPhoto,
  onPay,
  onCancel,
}: {
  friendName: string;
  friendPhoto: string;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-5">
      <p className="text-[15px] text-[#191919] leading-relaxed">
        <span className="font-semibold">{friendName}</span>에게 선물을
        보내시겠어요?
      </p>
      <p className="text-[14px] text-[#191919] leading-relaxed mt-3">
        위시리스트의 '{PRODUCT.name}'은 할인가{" "}
        {PRODUCT.salePrice.toLocaleString()}원에 선물할 수 있어요. 결제하기
        선택하면 카카오페이와 연결된 카드로 선물하기를 완료할 수 있어요.
      </p>

      {/* Order summary card */}
      <div className="mt-4 border border-gray-200 rounded-2xl p-3 flex gap-3">
        <img
          src={PRODUCT.image}
          alt={PRODUCT.name}
          className="w-[72px] h-[72px] rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-[#191919] leading-tight">
            {PRODUCT.name}
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#999] w-[56px]">받는 친구</span>
              <div className="flex items-center gap-1.5">
                <img
                  src={friendPhoto}
                  alt={friendName}
                  className="w-[18px] h-[18px] rounded-full object-cover"
                />
                <span className="text-[13px] text-[#191919]">{friendName}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#999] w-[56px]">결제 수단</span>
              <span className="text-[13px] text-[#191919]">
                {PRODUCT.salePrice.toLocaleString()}원 카카오페이
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-[#F0F0F0] text-[14px] font-semibold text-[#555] active:bg-[#E0E0E0] transition-colors"
        >
          주문취소
        </button>
        <button
          onClick={onPay}
          className="flex-1 py-3 rounded-xl bg-[#FEE500] text-[14px] font-semibold text-[#191919] active:bg-[#F6DD00] transition-colors"
        >
          결제하기
        </button>
      </div>
    </div>
  );
}

/* ── Phase 3: 완료 ── */
function CompletePhase({
  friendName,
  onChat,
  onConfirm,
}: {
  friendName: string;
  onChat: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="p-5 flex flex-col items-center text-center">
      {/* Check circle */}
      <div className="w-[56px] h-[56px] rounded-full bg-[#FEE500] flex items-center justify-center mb-4">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#191919"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <p className="text-[16px] font-semibold text-[#191919]">
        {friendName}에게 선물하기를 완료했어요
      </p>
      <p className="text-[14px] text-[#767676] mt-2 leading-relaxed">
        결제 정보는 카카오페이 알림톡으로
        <br />
        알려드릴게요.
      </p>

      {/* Buttons */}
      <div className="mt-6 flex gap-2 w-full">
        <button
          onClick={onChat}
          className="flex-1 py-3 rounded-xl border border-gray-300 text-[14px] font-semibold text-[#191919] active:bg-gray-50 transition-colors"
        >
          친구와 1:1 채팅
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-[#191919] text-[14px] font-semibold text-white active:bg-[#333] transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
}
