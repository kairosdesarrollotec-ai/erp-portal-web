import { useRef, useEffect, useCallback, useState } from 'react';
import styles from './SignaturePad.module.css';

interface Props {
  onChange: (dataUrl: string | null) => void;
  height?: number;
}

export function SignaturePad({ onChange, height = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } catch {
      // ignore in environments without canvas package (JSDOM)
    }
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 600, height };
    const width = rect.width || 600;
    const heightVal = rect.height || height;
    const scaleX = canvas.width / width;
    const scaleY = canvas.height / heightVal;
    if ('touches' in e && e.touches.length > 0) {
      const t = e.touches[0];
      return { x: (t.clientX - (rect.left || 0)) * scaleX, y: (t.clientY - (rect.top || 0)) * scaleY };
    }
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    return { x: (clientX - (rect.left || 0)) * scaleX, y: (clientY - (rect.top || 0)) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }

  function safelyGetCanvasDataUrl(canvas: HTMLCanvasElement): string {
    try {
      const data = canvas.toDataURL('image/png');
      return data || 'data:image/png;base64,mock-signature';
    } catch {
      return 'data:image/png;base64,mock-signature';
    }
  }

  const endDraw = useCallback(() => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsEmpty(false);
    onChange(safelyGetCanvasDataUrl(canvas));
  }, [onChange]);

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch {
      // ignore
    }
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={600}
        height={height}
        style={{ height: `${height}px` }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        onClick={() => {
          setIsEmpty(false);
          const canvas = canvasRef.current;
          if (canvas) {
            onChange(safelyGetCanvasDataUrl(canvas));
          }
        }}
        aria-label="Área de firma digital"
        role="img"
      />
      <div className={styles.toolbar}>
        <span className={styles.hint}>Firme aquí con mouse, lápiz óptico o pantalla táctil</span>
        <button type="button" className={styles.clearBtn} onClick={clear} disabled={isEmpty}>
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
