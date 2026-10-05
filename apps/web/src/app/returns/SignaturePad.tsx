import { useEffect, useRef, useState } from 'react';
import styles from './ReturnForms.module.css';

interface Props {
  /** PNG en data URL ('' = sin firma). */
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Pad de firma por trazo (canvas). Alquiler solo simula la firma con una
 * casilla (Stage3ContractScreen) y no hay componente reutilizable en el repo,
 * por lo que este es el primero. Devuelve un PNG en data URL.
 */
export function SignaturePad({ value, onChange, label, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const [signed, setSigned] = useState(value !== '');

  useEffect(() => {
    if (value === '') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSigned(false);
    }
  }, [value]);

  useEffect(() => {
    // Repinta una firma ya capturada (borrador) al volver a la pantalla.
    if (!value || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const image = new Image();
    image.onload = () => {
      try {
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      } catch {
        // sin canvas disponible: la firma sigue guardada en el borrador
      }
    };
    image.src = value;
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function context2d() {
    try {
      return canvasRef.current?.getContext('2d') ?? null;
    } catch {
      return null;
    }
  }

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width ? event.currentTarget.width / rect.width : 1;
    const scaleY = rect.height ? event.currentTarget.height / rect.height : 1;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    drawing.current = true;
    dirty.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const ctx = context2d();
    const { x, y } = position(event);
    ctx?.beginPath();
    ctx?.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = context2d();
    if (!ctx) return;
    const { x, y } = position(event);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!dirty.current || !canvasRef.current) return;
    setSigned(true);
    onChange(canvasRef.current.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    context2d()?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0);
    dirty.current = false;
    setSigned(false);
    onChange('');
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={448}
        height={144}
        role="img"
        aria-label={`${label}${signed ? ' (firmado)' : ' (sin firma)'}`}
        className={`${styles.signatureCanvas} ${signed ? styles.signatureCanvas_signed : ''}`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={clear} disabled={disabled || !signed}>
          Borrar firma
        </button>
      </div>
    </div>
  );
}
