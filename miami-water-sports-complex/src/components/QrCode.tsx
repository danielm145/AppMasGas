import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import { Button } from './ui';
import { cn } from '@/lib/utils';

/**
 * Genera el QR que se imprime en la pulsera o en la etiqueta adhesiva del casco.
 *
 * El payload es una URL corta del tipo `mwc://ride/WB-00123`; el lector del
 * operador solo necesita el código, pero usar un esquema con prefijo permite
 * que mañana una cámara genérica abra la app en el registro correcto.
 */
export function QrCode({
  value,
  size = 160,
  className,
  label,
  caption,
}: {
  value: string;
  size?: number;
  className?: string;
  label?: string;
  caption?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0d1f33', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {dataUrl ? (
          <img src={dataUrl} width={size} height={size} alt={`Código QR ${value}`} className="block" />
        ) : (
          <div style={{ width: size, height: size }} className="animate-pulse rounded bg-slate-100" />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      {label && <p className="font-mono text-xs font-bold tracking-widest text-deep-900">{label}</p>}
      {caption && <p className="max-w-[180px] text-center text-[11px] text-slate-500">{caption}</p>}
    </div>
  );
}

/** Tarjeta imprimible: QR + datos del rider. Es lo que se pega al casco. */
export function QrTag({
  code,
  title,
  subtitle,
  footnote,
}: {
  code: string;
  title: string;
  subtitle?: string;
  footnote?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string>();

  useEffect(() => {
    QRCode.toDataURL(`mwc://ride/${code}`, { width: 320, margin: 1, color: { dark: '#0d1f33', light: '#ffffff' } }).then(setDataUrl);
  }, [code]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${code}.png`;
    a.click();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-4">
        {dataUrl ? (
          <img src={dataUrl} width={110} height={110} alt="" className="rounded-lg" />
        ) : (
          <div className="h-[110px] w-[110px] animate-pulse rounded-lg bg-slate-100" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-lagoon-600">Miami Watersports</p>
          <p className="mt-0.5 truncate text-base font-extrabold text-deep-900">{title}</p>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          <p className="mt-1.5 font-mono text-sm font-bold tracking-widest text-deep-900">{code}</p>
          {footnote && <p className="mt-1 text-[10px] leading-tight text-slate-400">{footnote}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={download} className="flex-1">
          <Download className="h-3.5 w-3.5" /> Descargar
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="flex-1">
          <Printer className="h-3.5 w-3.5" /> Imprimir
        </Button>
      </div>
    </div>
  );
}
