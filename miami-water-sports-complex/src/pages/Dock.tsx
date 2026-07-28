import { useMemo, useState } from 'react';
import { AlertTriangle, ScanLine, UserMinus, Users, Waves } from 'lucide-react';
import { QrScanner } from '@/components/QrScanner';
import { PersonAvatar } from '@/components/CustomerQuickView';
import { useStore } from '@/lib/store';
import { LINE_LABELS, type CableLine } from '@/lib/types';
import { avatarColor } from '@/lib/images';
import { cn, fullName, initials, relativeTime } from '@/lib/utils';
import { Button, Input } from '@/components/ui';

/**
 * La fila de una línea.
 *
 * El rider escanea su pulsera y entra a la fila. El operador ve la cara del que
 * sigue —grande, sin leer nada— y aprieta un botón cuando lo despacha. Eso suma
 * un turno a su sesión y adelanta la fila.
 *
 * No se guarda una fila por turno: la sesión lleva un contador. La fila misma es
 * efímera, solo existe la gente parada en el muelle en este momento.
 */
export default function Dock() {
  const { state, joinQueue, callNext, removeFromQueue, toast } = useStore();
  const [line, setLine] = useState<CableLine>('full-cable');
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');

  const queue = useMemo(
    () =>
      state.queue
        .filter((q) => q.line === line)
        .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
        .map((q) => ({ ...q, customer: state.customers.find((c) => c.id === q.customerId) })),
    [state.queue, state.customers, line],
  );

  const counts = useMemo(() => {
    const acc: Partial<Record<CableLine, number>> = {};
    state.queue.forEach((q) => (acc[q.line] = (acc[q.line] ?? 0) + 1));
    return acc;
  }, [state.queue]);

  const next = queue[0];
  const upcoming = queue.slice(1);

  const onScan = (raw: string) => {
    const result = joinQueue(raw);
    if (!result) {
      toast('That wristband is not checked in — or they are already in line', 'error');
      return;
    }
    const rider = state.customers.find((c) => c.id === result.entry.customerId);
    toast(
      result.entry.lastTurn
        ? `${rider?.firstName ?? 'Rider'} joined — this is their LAST turn`
        : `${rider?.firstName ?? 'Rider'} joined the line · #${result.position}`,
      result.entry.lastTurn ? 'info' : 'success',
    );
  };

  const send = () => {
    const called = callNext(line);
    if (!called) return;
    const rider = state.customers.find((c) => c.id === called.customerId);
    toast(`${rider?.firstName ?? 'Rider'} sent out`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Selector de línea — cada una lleva su propia fila */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(LINE_LABELS) as CableLine[]).map((l) => (
          <button
            key={l}
            onClick={() => setLine(l)}
            className={cn(
              'focus-ring flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition',
              line === l ? 'bg-deep-900 text-white shadow-pop' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-deep-900',
            )}
          >
            {LINE_LABELS[l].split(' (')[0]}
            {(counts[l] ?? 0) > 0 && (
              <span className={cn('rounded-full px-2 py-0.5 text-xs', line === l ? 'bg-lagoon-500 text-white' : 'bg-slate-100 text-slate-600')}>
                {counts[l]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Quien sigue — la cara ocupa la pantalla a propósito */}
      <div className="mb-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card">
        <p className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
          Next up · {LINE_LABELS[line]}
        </p>

        {next ? (
          <div className="p-5">
            <div className="flex items-center gap-5">
              {next.customer?.photoUrl ? (
                <img
                  src={next.customer.photoUrl}
                  alt=""
                  className="h-32 w-32 shrink-0 rounded-2xl object-cover ring-4 ring-lagoon-100"
                />
              ) : (
                <span
                  className="flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl text-4xl font-black text-white ring-4 ring-lagoon-100"
                  style={{ backgroundColor: avatarColor(next.customer ? fullName(next.customer) : 'Rider') }}
                  aria-hidden
                >
                  {initials(next.customer?.firstName ?? 'R', next.customer?.lastName ?? '')}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-extrabold leading-tight text-deep-900" style={{ textWrap: 'balance' } as never}>
                  {next.customer ? fullName(next.customer) : 'Rider'}
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-lagoon-700">{next.customer?.memberCode}</p>
                <p className="mt-0.5 text-sm text-slate-500">Waiting {relativeTime(next.joinedAt)}</p>
                {next.lastTurn && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-black uppercase text-amber-800">
                    <AlertTriangle className="h-4 w-4" /> Last turn
                  </p>
                )}
              </div>
            </div>

            <Button onClick={send} className="mt-5 h-20 w-full text-2xl">
              Send them out
            </Button>
            <button
              onClick={() => {
                removeFromQueue(next.id);
                toast('Removed from the line', 'info');
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-rose-600"
            >
              <UserMinus className="h-3.5 w-3.5" /> They left the line
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <Waves className="h-10 w-10 text-slate-300" />
            <p className="text-lg font-bold text-deep-900">Line is empty</p>
            <p className="max-w-xs text-sm text-slate-500">
              Scan a wristband to put someone in line for {LINE_LABELS[line]}.
            </p>
          </div>
        )}
      </div>

      {/* Escanear pulsera */}
      <button
        onClick={() => setScanning(true)}
        className="focus-ring mb-4 flex w-full items-center gap-4 rounded-2xl bg-sunset-500 px-6 py-6 text-left text-white shadow-pop transition hover:bg-sunset-600"
      >
        <ScanLine className="h-10 w-10 shrink-0" />
        <span>
          <span className="block text-2xl font-extrabold leading-tight">Scan a wristband</span>
          <span className="block text-sm text-white/85">Puts them at the back of this line</span>
        </span>
      </button>

      {/* Salida manual: una pulsera rayada no puede parar la fila */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!manual.trim()) return;
          onScan(manual);
          setManual('');
        }}
        className="mb-4 flex gap-2"
      >
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="MWC-1004"
          className="h-14 text-center font-mono text-base font-bold uppercase tracking-widest"
        />
        <Button type="submit" size="lg" variant="outline" className="h-14 shrink-0 px-5">
          Add
        </Button>
      </form>

      {/* El resto de la fila */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <p className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <Users className="h-3.5 w-3.5" /> In line after that — {upcoming.length}
        </p>
        {upcoming.length ? (
          <ul className="divide-y divide-slate-100">
            {upcoming.map((q, i) => (
              <li key={q.id} className="flex items-center gap-3 px-5 py-3">
                <span className="w-6 shrink-0 text-center text-lg font-black text-slate-300">{i + 2}</span>
                <PersonAvatar
                  customerId={q.customerId}
                  name={q.customer ? fullName(q.customer) : 'Rider'}
                  src={q.customer?.photoUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-deep-900">{q.customer ? fullName(q.customer) : 'Rider'}</p>
                  <p className="text-xs text-slate-500">Waiting {relativeTime(q.joinedAt)}</p>
                </div>
                {q.lastTurn && (
                  <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">Last</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Nobody else waiting</p>
        )}
      </div>

      <QrScanner open={scanning} onClose={() => setScanning(false)} onScan={onScan} />
    </div>
  );
}
