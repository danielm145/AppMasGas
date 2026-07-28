import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import jsQR from 'jsqr';
import { CameraOff, X } from 'lucide-react';
import { Button } from './ui';

/**
 * Lector de QR con la cámara real del teléfono.
 *
 * Se decodifica en el navegador con jsQR sobre un canvas en vez de usar
 * `BarcodeDetector`, que Safari no implementa — y el muelle se opera con
 * iPhones. Cámara trasera, lectura continua, y un antirrebote por código para
 * que un mismo casco frente al lente no cuente diez vueltas seguidas.
 */
export function QrScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState(false);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });

        if (found?.data) {
          const now = Date.now();
          // Mismo código dentro de 2.5 s = el casco sigue frente al lente.
          if (found.data !== lastRef.current.code || now - lastRef.current.at > 2500) {
            lastRef.current = { code: found.data, at: now };
            navigator.vibrate?.(60);
            setFlash(true);
            window.setTimeout(() => setFlash(false), 320);
            onScan(found.data);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true'); // iOS no abre el reproductor a pantalla completa
        await video.play();
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) setError('Camera blocked. Allow camera access for this site and try again.');
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onScan, stop]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-black">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Marco de puntería */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`h-64 w-64 rounded-3xl border-4 transition-colors duration-150 ${
            flash ? 'border-emerald-400 bg-emerald-400/25' : 'border-white/80'
          }`}
        />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div>
          <p className="text-sm font-extrabold text-white">Point at the QR on the helmet</p>
          <p className="text-xs text-white/70">Each scan counts one lap</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/15 p-2.5 text-white backdrop-blur" aria-label="Close the scanner">
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="absolute inset-x-4 bottom-24 rounded-2xl bg-white p-5 text-center">
          <CameraOff className="mx-auto h-8 w-8 text-rose-500" />
          <p className="mt-2 text-sm font-semibold text-deep-900">{error}</p>
          <Button className="mt-3 w-full" onClick={onClose}>
            Type the code instead
          </Button>
        </div>
      )}
    </div>,
    document.body,
  );
}
