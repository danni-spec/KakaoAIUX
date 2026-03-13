import { useRef, useState, useCallback, useEffect } from "react";

interface CircleAction {
  x: number;
  y: number;
  text: string;
}

interface Props {
  bubbleRef: React.RefObject<HTMLDivElement | null>;
  darkMode: boolean;
  onAction: (text: string, action: string) => void;
  onDismiss: () => void;
}

// 텍스트에서 키워드 기반으로 액션 추천 순서 결정
function suggestActions(text: string): { label: string; action: string; icon: string }[] {
  const t = text.toLowerCase();
  const actions: { label: string; action: string; icon: string }[] = [];

  // 금액/돈 관련 → 송금
  if (/\d+.*원|만\s*원|천\s*원|송금|보내|입금|정산/.test(t)) {
    actions.push({ label: "송금", action: "transfer", icon: "💸" });
  }
  // 장소/시간/예약 관련
  if (/예약|레스토랑|식당|카페|호텔|시\s|오후|오전|내일|모레|CC|골프장|회의실/.test(t)) {
    actions.push({ label: "예약", action: "reserve", icon: "📅" });
  }
  // 상품/브랜드 관련
  if (/반클리프|샤넬|디올|에르메스|루이비통|나이키|아디다스|애플|쇼핑|구매|주문|상품|가격/.test(t)) {
    actions.push({ label: "상품검색", action: "shop", icon: "🛍️" });
  }
  // 항상 해석 추가
  actions.push({ label: "해석", action: "interpret", icon: "💬" });

  return actions;
}

export default function CircleToSearchOverlay({ bubbleRef, darkMode, onAction, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);
  const drawingRef = useRef(false);
  const [actionPopup, setActionPopup] = useState<CircleAction | null>(null);

  // 캔버스 크기 동기화
  useEffect(() => {
    const canvas = canvasRef.current;
    const bubble = bubbleRef.current;
    if (!canvas || !bubble) return;
    const rect = bubble.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [bubbleRef]);

  // 동그라미 내부 텍스트 추출
  const extractTextInCircle = useCallback((minX: number, minY: number, maxX: number, maxY: number) => {
    const bubble = bubbleRef.current;
    if (!bubble) return "";

    const bubbleRect = bubble.getBoundingClientRect();
    // 캔버스 좌표 → 페이지 좌표
    const absMinX = bubbleRect.left + minX;
    const absMinY = bubbleRect.top + minY;
    const absMaxX = bubbleRect.left + maxX;
    const absMaxY = bubbleRect.top + maxY;

    // span[data-ctext] 요소들에서 겹치는 텍스트 추출
    const spans = bubble.querySelectorAll("span[data-ctext]");
    const texts: string[] = [];
    spans.forEach((span) => {
      const sr = span.getBoundingClientRect();
      // 겹침 판정
      if (sr.right > absMinX && sr.left < absMaxX && sr.bottom > absMinY && sr.top < absMaxY) {
        texts.push((span as HTMLElement).innerText);
      }
    });

    if (texts.length > 0) return texts.join(" ");

    // fallback: 전체 텍스트에서 추출 시도
    const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT);
    const fallbackTexts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const nr = range.getBoundingClientRect();
      if (nr.right > absMinX && nr.left < absMaxX && nr.bottom > absMinY && nr.top < absMaxY) {
        fallbackTexts.push(node.textContent || "");
      }
    }
    return fallbackTexts.join(" ").trim();
  }, [bubbleRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    drawingRef.current = true;
    pointsRef.current = [{ x, y }];
    setActionPopup(null);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "rgba(254, 229, 0, 0.8)";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointsRef.current.push({ x, y });

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const points = pointsRef.current;
    if (points.length < 15) {
      // 포인트 부족 → 리셋
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // 닫힌 원 판정: 시작-끝 거리
    const start = points[0];
    const end = points[points.length - 1];
    const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

    if (dist > 80) {
      // 열린 도형 → 리셋
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // 바운딩 박스
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    // 하이라이트 그리기
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.closePath();
      ctx.fillStyle = "rgba(254, 229, 0, 0.15)";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
    }

    // 텍스트 추출
    const extracted = extractTextInCircle(minX, minY, maxX, maxY);
    if (extracted) {
      const centerX = (minX + maxX) / 2;
      const centerY = maxY + 8;
      setActionPopup({ x: centerX, y: centerY, text: extracted });
    } else {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [extractTextInCircle]);

  // 팝업 외부 클릭 시 닫기
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (actionPopup && !(e.target as HTMLElement).closest("[data-circle-popup]")) {
      setActionPopup(null);
        const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      onDismiss();
    }
  }, [actionPopup, onDismiss]);

  const actions = actionPopup ? suggestActions(actionPopup.text) : [];

  return (
    <>
      {/* 투명 캔버스 오버레이 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ touchAction: "none", cursor: "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleOverlayClick}
      />

      {/* 액션 팝업 */}
      {actionPopup && (
        <div
          data-circle-popup
          className="absolute z-20 flex items-center gap-1.5 px-2 py-1.5 rounded-full"
          style={{
            left: Math.max(8, Math.min(actionPopup.x - 80, (canvasRef.current?.width || 300) - 170)),
            top: actionPopup.y + 4,
            background: darkMode ? "rgba(40,40,40,0.95)" : "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
            animation: "noti-fade-in 0.15s ease-out",
          }}
        >
          {actions.map((a) => (
            <button
              key={a.action}
              type="button"
              className={`flex items-center gap-1 px-3 h-[34px] rounded-full text-[12px] font-semibold active:scale-95 transition-transform ${
                darkMode ? "text-white hover:bg-white/10" : "text-[#191919] hover:bg-black/5"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onAction(actionPopup.text, a.action);
                setActionPopup(null);
                            const ctx = canvasRef.current?.getContext("2d");
                if (ctx && canvasRef.current) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              }}
            >
              <span className="text-[14px]">{a.icon}</span>
              {a.label}
            </button>
          ))}
          {/* 추출된 텍스트 미리보기 */}
          <div
            className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] whitespace-nowrap max-w-[200px] truncate ${
              darkMode ? "bg-black/70 text-gray-300" : "bg-black/70 text-white"
            }`}
          >
            "{actionPopup.text}"
          </div>
        </div>
      )}
    </>
  );
}
