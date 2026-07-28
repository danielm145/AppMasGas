import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleStop, Plus, Radio, Timer, TrendingDown, Waves } from 'lucide-react';
import { congestion } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { LINE_LABELS, PACKAGE_META, type CableLine } from '@/lib/types';
import { cn, formatTime, num, pct, relativeTime } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, Segmented } from '@/components/ui';

/**
 * Tablero del supervisor de muelle: quién está en el agua, en qué línea, cuánto
 * tiempo le queda y qué tan cargada está cada atracción.
 */
export default function LiveOps() {
  const { state, logLap, endSession, toast } = useStore();
  const [filter, setFilter] = useState<'all' | CableLine>('all');

  const active = useMemo(
    () =>
      state.rideSessions
        .filter((s) => s.status === 'active')
        .filter((s) => filter === 'all' || s.line === filter)
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [state.rideSessions, filter],
  );

  const lines = useMemo(() => congestion(state.rideSessions), [state.rideSessions]);
  const totalActive = state.rideSessions.filter((s) => s.status === 'active').length;

  const lapsToday = state.lapLogs.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString());
  const fallRate = lapsToday.length ? lapsToday.filter((l) => !l.completed).length / lapsToday.length : 0;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Live operations"
        description="What is happening on the water right now. Every lap is recorded by scanning the QR on the helmet."
        actions={
          <>
            <Link to="/scanner">
              <Button variant="outline">
                <Radio className="h-4 w-4" /> Escáner
              </Button>
            </Link>
            <Link to="/check-in">
              <Button>
                <Plus className="h-4 w-4" /> Check-in
              </Button>
            </Link>
          </>
        }
      />

      {/* Barras de carga por línea */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {lines.map((l) => {
          const tone = l.level === 'saturated' ? 'rose' : l.level === 'high' ? 'amber' : l.level === 'moderate' ? 'lagoon' : 'green';
          return (
            <Card key={l.line} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold leading-tight text-deep-900">{LINE_LABELS[l.line]}</p>
                <Badge tone={tone} dot>
                  {l.level}
                </Badge>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="text-3xl font-extrabold leading-none tabular-nums text-deep-900">{l.current}</p>
                <p className="text-xs font-semibold text-slate-400">cap. {l.capacity}</p>
              </div>
              <ProgressBar value={l.current} max={l.capacity} tone={tone === 'rose' ? 'rose' : tone === 'amber' ? 'amber' : tone === 'green' ? 'green' : 'lagoon'} className="mt-2.5" />
              {l.level === 'saturated' && <p className="mt-2 text-[11px] font-semibold text-rose-600">Stop selling this line until a spot frees up</p>}
            </Card>
          );
        })}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lagoon-50 text-lagoon-600">
            <Waves className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold tabular-nums text-deep-900">{totalActive}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">riders on the water</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Timer className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold tabular-nums text-deep-900">{num(lapsToday.length)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">laps today</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xl font-extrabold tabular-nums text-deep-900">{pct(fallRate)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">caídas sobre laps</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Sessions activas"
          subtitle="Tap +1 lap as the rider passes the start tower"
          action={
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Todas' },
                ...(Object.keys(LINE_LABELS) as CableLine[]).map((l) => ({ value: l, label: LINE_LABELS[l].split(' ')[0] })),
              ]}
            />
          }
        />
        {active.length === 0 ? (
          <EmptyState
            icon={<Waves className="h-6 w-6" />}
            title="Nobody on the water"
            description="Once you check someone in, their session shows up here in real time."
            action={
              <Link to="/check-in">
                <Button size="sm">Register check-in</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((s) => {
              const c = state.customers.find((x) => x.id === s.customerId);
              const elapsed = Math.round((Date.now() - new Date(s.startAt).getTime()) / 60000);
              const remaining = s.minutesPurchased - elapsed;
              const operator = state.employees.find((e) => e.id === s.operatorId);
              const gear = state.assets.filter((a) => s.assignedAssetIds.includes(a.id));
              const helmet = gear.find((a) => a.category === 'helmet');
              const board = gear.find((a) => ['wakeboard', 'wakeskate', 'kneeboard'].includes(a.category));
              return (
                <div key={s.id} className={cn('rounded-xl border p-4 transition', remaining <= 5 ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200')}>
                  <div className="flex items-start gap-3">
                    <Avatar name={c ? `${c.firstName} ${c.lastName}` : 'Rider'} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/customers/${s.customerId}`} className="block truncate text-sm font-bold text-deep-900 hover:text-lagoon-700">
                        {c ? `${c.firstName} ${c.lastName}` : 'Rider'}
                      </Link>
                      <p className="truncate text-[11px] text-slate-500">
                        {PACKAGE_META[s.packageType].label} · {LINE_LABELS[s.line]}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] font-bold tracking-wider">
                        {helmet ? (
                          <Link to={`/assets/${helmet.id}`} className="text-lagoon-700 hover:underline">
                            🪖 {helmet.code}
                          </Link>
                        ) : (
                          <span className="text-slate-500">{s.wristbandCode}</span>
                        )}
                        {board && (
                          <Link to={`/assets/${board.id}`} className="text-indigo-600 hover:underline">
                            🛹 {board.code}
                          </Link>
                        )}
                      </p>
                    </div>
                    <Badge tone={remaining <= 5 ? 'amber' : 'green'} dot>
                      {remaining > 0 ? `${remaining} min` : 'expired'}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 py-2 text-center">
                    <div>
                      <p className="text-base font-extrabold tabular-nums text-deep-900">{s.lapsCompleted}</p>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">laps</p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold tabular-nums text-deep-900">{s.falls}</p>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">falls</p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold tabular-nums text-deep-900">{elapsed}′</p>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">on water</p>
                    </div>
                  </div>

                  <ProgressBar value={Math.min(elapsed, s.minutesPurchased)} max={s.minutesPurchased} tone={remaining <= 5 ? 'amber' : 'lagoon'} className="mt-2.5" />

                  <p className="mt-2 text-[10px] text-slate-400">
                    Started {formatTime(s.startAt)} ({relativeTime(s.startAt)}) · Operator {operator?.firstName ?? '—'}
                  </p>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        logLap(s.wristbandCode);
                        toast(`Lap ${s.lapsCompleted + 1} recorded · ${s.wristbandCode}`);
                      }}
                    >
                      +1 lap
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        logLap(s.wristbandCode, { completed: false });
                        toast('Fall recorded', 'info');
                      }}
                    >
                      Caída
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => endSession(s.id)} title="End session">
                      <CircleStop className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
