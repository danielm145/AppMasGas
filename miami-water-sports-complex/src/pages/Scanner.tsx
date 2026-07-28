import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, CheckCircle2, HardHat, Monitor, RectangleHorizontal, ScanLine, Smartphone, XCircle, Zap } from 'lucide-react';
import { QrScanner } from '@/components/QrScanner';
import { QrCode } from '@/components/QrCode';
import { PersonAvatar } from '@/components/CustomerQuickView';
import { useStore } from '@/lib/store';
import { ASSET_CATEGORY_LABELS, LINE_LABELS } from '@/lib/types';
import { cn, formatTime, relativeTime } from '@/lib/utils';
import { Badge, Button, Card, CardHeader, EmptyState, Input, PageHeader } from '@/components/ui';

/**
 * Estación de registro de vueltas.
 *
 * El operador anda con el teléfono en el muelle y apunta la cámara al QR pegado
 * al casco del rider (o a la tabla). No hace falta buscar a nadie por nombre:
 * el código del activo resuelve solo a qué sesión activa pertenece.
 *
 * El input queda siempre enfocado porque los lectores físicos se comportan como
 * teclado, así que el mismo flujo sirve con lector Bluetooth o con la cámara.
 */
export default function Scanner() {
  const { state, logLap, currentUser } = useStore();
  const [code, setCode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [feed, setFeed] = useState<{ id: string; ok: boolean; text: string; sub: string; at: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeSessions = useMemo(() => state.rideSessions.filter((s) => s.status === 'active'), [state.rideSessions]);

  const submit = (raw: string, completed = true) => {
    const value = raw.trim().replace(/^mws:\/\/(ride|asset)\//i, '').toUpperCase();
    if (!value) return;

    const lap = logLap(value, { completed });
    const session = lap ? state.rideSessions.find((s) => s.id === lap.sessionId) : undefined;
    const customer = state.customers.find((c) => c.id === session?.customerId);
    const scannedAsset = state.assets.find((a) => a.code === value);

    setFeed((prev) =>
      [
        {
          id: `${value}-${Date.now()}`,
          ok: !!lap,
          text: lap ? `${customer?.firstName ?? 'Rider'} ${customer?.lastName ?? ''}` : `Code with no active session: ${value}`,
          sub: lap
            ? [
                completed ? 'Lap recorded' : 'Fall recorded',
                scannedAsset ? `${ASSET_CATEGORY_LABELS[scannedAsset.category].toLowerCase()} ${scannedAsset.code}` : `pulsera ${value}`,
                LINE_LABELS[session!.line],
                `total ${session!.lapsCompleted + (completed ? 1 : 0)}`,
                `scanned by ${currentUser.firstName}`,
              ].join(' · ')
            : scannedAsset
              ? `${scannedAsset.name} no está entregado a ningún rider ahora mismo.`
              : 'It does not match any wristband, helmet or board in use.',
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 25),
    );
    setCode('');
    inputRef.current?.focus();
  };

  const lastOk = feed.find((f) => f.ok);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Lap scanner"
        description="Point your phone camera at the QR on the helmet or the board. The system identifies the rider and adds the lap."
        actions={
          <Link to="/operations">
            <Button variant="outline">View operations</Button>
          </Link>
        }
      />

      <Card className="mb-5 overflow-hidden">
        <div className="wave-bg px-6 py-8 text-center text-white">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
            <span className="absolute inset-0 animate-ripple rounded-full bg-lagoon-400/40" />
            <ScanLine className="relative h-10 w-10 text-lagoon-300" />
          </div>
          <p className="mt-3 text-sm font-semibold text-lagoon-200">Waiting for a helmet scan…</p>

          <Button size="lg" variant="accent" className="mx-auto mt-4 h-16 w-full max-w-md text-lg" onClick={() => setCameraOpen(true)}>
            <Camera className="h-6 w-6" /> Scan with the camera
          </Button>
          <p className="mt-2 text-[11px] text-white/50">or type the code below</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(code);
            }}
            className="mx-auto mt-4 flex max-w-md gap-2"
          >
            <Input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="MWC-HLM-062"
              className="h-12 border-white/20 bg-white/10 text-center font-mono text-lg font-bold uppercase tracking-[0.2em] text-white placeholder:text-white/40 focus:border-lagoon-300"
            />
            <Button type="submit" variant="accent" size="lg" className="shrink-0">
              <Zap className="h-4 w-4" /> Vuelta
            </Button>
          </form>
          <button onClick={() => submit(code, false)} className="mt-3 text-xs font-semibold text-white/60 underline-offset-2 hover:text-white hover:underline">
            Record as a fall (lap not completed)
          </button>
          <p className="mx-auto mt-4 max-w-md text-[11px] leading-relaxed text-white/50">
            Helmets and boards carry a permanent vinyl label: use the helmet code (<span className="font-mono">MWC-HLM-…</span>) or the board code (<span className="font-mono">MWC-BRD-…</span>) — both resolve to the same session. Every scan is signed by the employee who made it — right now, <span className="font-semibold text-white/80">{currentUser.firstName} {currentUser.lastName}</span>.
          </p>
        </div>
      </Card>

      <QrScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(value) => submit(value)}
      />

      {/* Para el demo: estos QR se muestran en el portátil y se escanean con el teléfono */}
      {activeSessions.length > 0 && (
        <Card className="mb-4">
          <CardHeader
            title="Helmet tags on the water right now"
            subtitle="Open this on a laptop and scan these with the phone — that is exactly what happens on the dock"
            icon={<Monitor className="h-4 w-4" />}
          />
          <div className="flex gap-5 overflow-x-auto p-5">
            {activeSessions.slice(0, 6).map((s2) => {
              const gear = state.assets.filter((a) => s2.assignedAssetIds.includes(a.id));
              const helmet = gear.find((a) => a.category === 'helmet');
              const rider = state.customers.find((c) => c.id === s2.customerId);
              if (!helmet) return null;
              return (
                <div key={s2.id} className="shrink-0 text-center">
                  <QrCode value={`mwc://asset/${helmet.code}`} size={120} label={helmet.code} />
                  <p className="mt-1 max-w-[140px] truncate text-[11px] font-semibold text-slate-600">
                    {rider?.firstName} {rider?.lastName}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Riders on the water"
            subtitle="Tap a rider’s helmet to add a lap without scanning"
            icon={<HardHat className="h-4 w-4" />}
          />
          {activeSessions.length ? (
            <ul className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
              {activeSessions.map((s) => {
                const c = state.customers.find((x) => x.id === s.customerId);
                const gear = state.assets.filter((a) => s.assignedAssetIds.includes(a.id));
                const helmet = gear.find((a) => a.category === 'helmet');
                const board = gear.find((a) => ['wakeboard', 'wakeskate', 'kneeboard'].includes(a.category));
                return (
                  <li key={s.id}>
                    <button onClick={() => submit(helmet?.code ?? s.wristbandCode)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-lagoon-50/50">
                      <PersonAvatar customerId={s.customerId} name={c ? `${c.firstName} ${c.lastName}` : 'Rider'} src={c?.photoUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-deep-900">
                          {c?.firstName} {c?.lastName}
                        </p>
                        <p className="flex flex-wrap gap-x-2 text-[11px]">
                          {helmet && (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-lagoon-700">
                              <HardHat className="h-3 w-3" /> {helmet.code}
                            </span>
                          )}
                          {board && (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600">
                              <RectangleHorizontal className="h-3 w-3" /> {board.code}
                            </span>
                          )}
                          {!helmet && !board && <span className="font-mono font-bold text-slate-500">{s.wristbandCode}</span>}
                        </p>
                      </div>
                      <Badge tone="lagoon">{s.lapsCompleted} laps</Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Sin riders on the water" description="Check someone in to hand out a helmet and board." />
          )}
        </Card>

        <Card>
          <CardHeader
            title="Scan log"
            subtitle={lastOk ? `Last: ${lastOk.text} · ${relativeTime(lastOk.at)}` : 'No scans yet in this session'}
            icon={<Smartphone className="h-4 w-4" />}
          />
          {feed.length ? (
            <ul className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
              {feed.map((f) => (
                <li key={f.id} className={cn('flex items-start gap-3 px-5 py-3', !f.ok && 'bg-rose-50/50')}>
                  {f.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-deep-900">{f.text}</p>
                    <p className="text-[11px] text-slate-500">{f.sub}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-400">{formatTime(f.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<ScanLine className="h-6 w-6" />}
              title="Ready to scan"
              description="Every valid scan adds a lap, feeds the peak-hour analytics and records which gear the rider had."
            />
          )}
        </Card>
      </div>
    </div>
  );
}
