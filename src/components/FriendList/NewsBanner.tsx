export function NewsBanner() {
  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl bg-gray-100 flex items-center justify-between">
      <div>
        <p className="font-semibold text-gray-900 text-base">오늘의 카카오가 궁금하다면?</p>
        <p className="text-sm text-gray-600 mt-0.5">카카오소식 보러가기</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-800" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1 rounded">NEW</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-red-600 font-bold text-sm">31</span>
        </div>
      </div>
    </div>
  );
}
