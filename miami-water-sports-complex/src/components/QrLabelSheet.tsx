import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import type { Asset } from '@/lib/types';
import { ASSET_CATEGORY_LABELS } from '@/lib/types';
import { Button } from './ui';

/**
 * Hoja de etiquetas QR lista para imprimir en papel adhesivo resistente al agua.
 *
 * Una etiqueta por activo: se pega al casco y a cada tabla. El QR codifica
 * `mwc://asset/<código>`, así que escanearlo desde el teléfono del operador
 * resuelve tanto la vuelta del rider como la trazabilidad del equipo entregado.
 */
export function QrLabelSheet({ assets }: { assets: Asset[] }) {
  const [codes, setCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      assets.map(async (a) => [a.id, await QRCode.toDataURL(`mwc://asset/${a.code}`, { width: 240, margin: 0, color: { dark: '#0d1f33', light: '#ffffff' } })] as const),
    ).then((pairs) => {
      if (!cancelled) setCodes(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [assets]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-xl text-xs leading-relaxed text-slate-500">
          {assets.length} etiquetas · se imprimen <strong>una sola vez</strong>, al dar de alta el activo, en vinilo laminado resistente al agua y al cloro. Van
          pegadas de forma permanente al casco y a cada tabla. Solo se reimprime una etiqueta puntual si se despega o se raya — el código nunca cambia.
        </p>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> Imprimir hoja
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {assets.map((a) => (
          <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white p-2.5">
            {codes[a.id] ? (
              <img src={codes[a.id]} alt="" className="h-16 w-16 shrink-0" />
            ) : (
              <div className="h-16 w-16 shrink-0 animate-pulse rounded bg-slate-100" />
            )}
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-widest text-lagoon-600">Miami Watersports</p>
              <p className="truncate font-mono text-[11px] font-black tracking-tight text-deep-900">{a.code}</p>
              <p className="truncate text-[9px] leading-tight text-slate-500">{ASSET_CATEGORY_LABELS[a.category]}</p>
              <p className="truncate text-[9px] leading-tight text-slate-400">{a.size ?? a.brand}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
