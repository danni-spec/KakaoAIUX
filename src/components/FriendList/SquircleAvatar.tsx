/**
 * SquircleAvatar
 *
 * /squircle.svg 이미지를 CSS mask-image로 사용해
 * 어떤 크기에도 동일한 스퀘어클 곡률을 유지한다.
 */

const SQ_STYLE: React.CSSProperties = {
  maskImage: "url(/squircle.svg)",
  maskSize: "100% 100%",
  WebkitMaskImage: "url(/squircle.svg)",
  WebkitMaskSize: "100% 100%",
};

interface SquircleAvatarProps {
  src: string;
  alt: string;
  /** Tailwind width·height 클래스를 포함한 크기 지정 (예: "w-[50px] h-[50px]") */
  className?: string;
}

export function SquircleAvatar({ src, alt, className = "" }: SquircleAvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      style={SQ_STYLE}
      className={`object-cover flex-shrink-0 ${className}`}
    />
  );
}

/** div 기반 플레이스홀더(글자·아이콘)에 스퀘어클을 적용할 때 사용 */
export function SquircleDiv({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div style={SQ_STYLE} className={`flex-shrink-0 ${className}`}>
      {children}
    </div>
  );
}
