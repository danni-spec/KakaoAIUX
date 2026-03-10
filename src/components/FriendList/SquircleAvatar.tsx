/**
 * SquircleAvatar
 *
 * /squircle.svg 이미지를 CSS mask-image로 사용해
 * 어떤 크기에도 동일한 스퀘어클 곡률을 유지한다.
 * data URI 사용 시 로드 실패·Safari 호환성 개선.
 */

const SQUIRCLE_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="black" fill-rule="evenodd" clip-rule="evenodd" d="M48 24C48 41.8267 41.8267 48 24 48C6.17333 48 0 41.8267 0 24C0 6.17333 6.17333 0 24 0C41.8267 0 48 6.17333 48 24Z"/></svg>'
  );

const SQ_STYLE: React.CSSProperties = {
  maskImage: `url("${SQUIRCLE_SVG}")`,
  maskSize: "100% 100%",
  maskRepeat: "no-repeat",
  maskPosition: "center",
  WebkitMaskImage: `url("${SQUIRCLE_SVG}")`,
  WebkitMaskSize: "100% 100%",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
};

interface SquircleAvatarProps {
  src: string;
  alt: string;
  /** Tailwind width·height 클래스를 포함한 크기 지정 (예: "w-[50px] h-[50px]") */
  className?: string;
  /** true 시 프로필 아웃라인 미적용 (예: 카나나알림) */
  noOutline?: boolean;
}

const PROFILE_LINE_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "url(/Profileline.svg)",
  backgroundSize: "100% 100%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  pointerEvents: "none",
};

export function SquircleAvatar({ src, alt, className = "", noOutline = false }: SquircleAvatarProps) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <img
        src={src}
        alt={alt}
        style={SQ_STYLE}
        className="object-cover w-full h-full block"
      />
      {!noOutline && <div style={PROFILE_LINE_STYLE} aria-hidden />}
    </div>
  );
}

/** div 기반 플레이스홀더(글자·아이콘)에 스퀘어클을 적용할 때 사용. withProfileLine 시 프로필 라인 이미지 오버레이 */
export function SquircleDiv({
  children,
  className = "",
  withProfileLine = false,
}: {
  children: React.ReactNode;
  className?: string;
  withProfileLine?: boolean;
}) {
  if (!withProfileLine) {
    return (
      <div style={SQ_STYLE} className={`flex-shrink-0 ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div style={SQ_STYLE} className="overflow-hidden w-full h-full block">
        {children}
      </div>
      <div style={PROFILE_LINE_STYLE} aria-hidden />
    </div>
  );
}
