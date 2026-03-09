/**
 * iPhone 16 Front Mockup — SVG Frame Overlay
 *
 * ┌─ 좌표계 ────────────────────────────────────────────────────────────────┐
 * │  viewBox: 0 0 421 880  (프레임 포함 전체 디바이스)                       │
 * │  Screen:  x=14 y=14  w=393 h=852  rx=44  (논리 해상도 = 393×852 pt)     │
 * │  Bezel:   14px (≈ 실기기 1.7mm 물리 베젤을 목업 비율로 환산)              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ 구성 요소 ─────────────────────────────────────────────────────────────┐
 * │  • 바디: 알루미늄 Black finish, 마스크로 스크린 영역 투명 처리             │
 * │  • Dynamic Island: 중앙 상단 pill (126×37 pt)                           │
 * │  • 좌측: Action button / Volume +  / Volume −                           │
 * │  • 우측: Power  / Camera Control  (iPhone 16 신규)                      │
 * │  • 하단: USB-C + 양측 스피커 그릴                                        │
 * │  • 엣지 하이라이트: 알루미늄 광택 시뮬레이션                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

export function IPhone16Mockup() {
  /* ── 스피커 그릴: USB-C 좌우에 각 5개 홀 ── */
  const speakerL = [100, 110, 120, 130, 140];
  const speakerR = [281, 291, 301, 311, 321];

  return (
    <svg
      viewBox="0 0 421 880"
      width="421"
      height="880"
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", top: 0, left: 0, zIndex: 10, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        {/*
          ── 스크린 컷아웃 마스크 ──
          white = 바디 표시 / black = 스크린 투명 (앱 콘텐츠 보임)
        */}
        <mask id="iphone16-mask">
          <rect width="421" height="880" rx="58" fill="white" />
          <rect x="14" y="14" width="393" height="852" rx="44" fill="black" />
        </mask>

        {/* ── 바디: 블랙 알루미늄 그라디언트 ── */}
        <linearGradient
          id="body-grad"
          x1="0" y1="440" x2="421" y2="440"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#3D3D3D" />
          <stop offset="7%"   stopColor="#272727" />
          <stop offset="22%"  stopColor="#1C1C1C" />
          <stop offset="50%"  stopColor="#161616" />
          <stop offset="78%"  stopColor="#1C1C1C" />
          <stop offset="93%"  stopColor="#272727" />
          <stop offset="100%" stopColor="#3D3D3D" />
        </linearGradient>

        {/* ── 좌측 버튼 그라디언트 (빛이 왼쪽에서 옴) ── */}
        <linearGradient id="btn-l" x1="0" y1="0" x2="6" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#484848" />
          <stop offset="100%" stopColor="#222222" />
        </linearGradient>

        {/* ── 우측 버튼 그라디언트 ── */}
        <linearGradient id="btn-r" x1="415" y1="0" x2="421" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#222222" />
          <stop offset="100%" stopColor="#484848" />
        </linearGradient>

        {/* ── 스크린 내부 엣지 글로우 (유리 안쪽 빛 확산) ── */}
        <linearGradient id="edge-glow" x1="0" y1="14" x2="0" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="white" stopOpacity="0.16" />
          <stop offset="100%" stopColor="white" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* ════════════════════════════════════════════════════════════════════
          바디 — 스크린 컷아웃
         ════════════════════════════════════════════════════════════════════ */}
      <rect
        width="421" height="880" rx="58"
        fill="url(#body-grad)"
        mask="url(#iphone16-mask)"
      />

      {/* 스크린 내부 엣지 글로우 */}
      <rect
        x="13.5" y="13.5" width="394" height="853" rx="44.5"
        fill="none"
        stroke="url(#edge-glow)"
        strokeWidth="1.5"
      />

      {/* ════════════════════════════════════════════════════════════════════
          Dynamic Island — 126×37 pt  (iPhone 14 Pro 이후 동일 스펙)
         ════════════════════════════════════════════════════════════════════ */}
      {/* 메인 pill */}
      <rect x="147.5" y="25" width="126" height="37" rx="18.5" fill="#080808" />
      {/* 상단 내부 하이라이트 (곡면 유리 반사) */}
      <rect
        x="149.5" y="26" width="122" height="12" rx="17"
        fill="rgba(255,255,255,0.055)"
      />

      {/* ════════════════════════════════════════════════════════════════════
          좌측 버튼 (위 → 아래: Action / Vol+ / Vol−)
         ════════════════════════════════════════════════════════════════════ */}
      {/* Action button */}
      <rect x="-3" y="168" width="6" height="34" rx="3" fill="url(#btn-l)" />
      <rect x="-3" y="168" width="6" height="5"  rx="2" fill="rgba(255,255,255,0.14)" />

      {/* Volume + */}
      <rect x="-3" y="218" width="6" height="66" rx="3" fill="url(#btn-l)" />
      <rect x="-3" y="218" width="6" height="5"  rx="2" fill="rgba(255,255,255,0.14)" />

      {/* Volume − */}
      <rect x="-3" y="296" width="6" height="66" rx="3" fill="url(#btn-l)" />
      <rect x="-3" y="296" width="6" height="5"  rx="2" fill="rgba(255,255,255,0.14)" />

      {/* ════════════════════════════════════════════════════════════════════
          우측 버튼 (위 → 아래: Power / Camera Control)
         ════════════════════════════════════════════════════════════════════ */}
      {/* Power / Sleep */}
      <rect x="418" y="196" width="6" height="92" rx="3" fill="url(#btn-r)" />
      <rect x="418" y="196" width="6" height="5"  rx="2" fill="rgba(255,255,255,0.10)" />

      {/* Camera Control — iPhone 16 전용 */}
      <rect x="418" y="368" width="6" height="70" rx="3" fill="url(#btn-r)" />
      <rect x="418" y="368" width="6" height="5"  rx="2" fill="rgba(255,255,255,0.10)" />

      {/* ════════════════════════════════════════════════════════════════════
          하단: USB-C + 스피커 그릴
         ════════════════════════════════════════════════════════════════════ */}
      {/* USB-C 외곽 */}
      <rect x="190" y="864" width="41" height="12" rx="6" fill="#090909" />
      {/* USB-C 내부 리세스 */}
      <rect
        x="192.5" y="866" width="36" height="8" rx="4.5"
        fill="#050505"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.5"
      />

      {/* 좌측 스피커 홀 */}
      {speakerL.map((cx, i) => (
        <circle key={`sl-${i}`} cx={cx} cy="873" r="2.2" fill="#0F0F0F" />
      ))}

      {/* 우측 스피커 홀 */}
      {speakerR.map((cx, i) => (
        <circle key={`sr-${i}`} cx={cx} cy="873" r="2.2" fill="#0F0F0F" />
      ))}

      {/* ════════════════════════════════════════════════════════════════════
          엣지 하이라이트 — 알루미늄 프레임 광택
          (빛이 위-왼쪽에서 비추는 기본 조명 가정)
         ════════════════════════════════════════════════════════════════════ */}
      {/* 상단: 가장 밝음 */}
      <path d="M 62 0.5 Q 210.5 -0.5 359 0.5"
        fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="0.5" />

      {/* 좌측 엣지 */}
      <path d="M 0.5 62 V 818"
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5" />

      {/* 우측 엣지 (역광) */}
      <path d="M 420.5 62 V 818"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

      {/* 하단 엣지 */}
      <path d="M 62 879.5 Q 210.5 880.5 359 879.5"
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" />

      {/* 상단 좌 코너 하이라이트 (가장 빛이 강하게 반사되는 포인트) */}
      <path d="M 3 60 Q 0 30 30 3"
        fill="none" stroke="rgba(255,255,255,0.30)" strokeWidth="0.6"
        strokeLinecap="round" />

      {/* 상단 우 코너 */}
      <path d="M 418 60 Q 421 30 391 3"
        fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.5"
        strokeLinecap="round" />
    </svg>
  );
}
