import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  DollarSign,
  HelpCircle,
  Package,
  Repeat,
  Users,
  Waves,
  Wrench,
} from 'lucide-react';
import {
  congestion,
  dailySeries,
  fleetUtilization,
  headlineKpis,
  heatmap,
  lapsByHour,
  repeatDistribution,
  revenueByPackage,
  topRiders,
  WEEKDAY_LABELS,
} from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { LINE_LABELS, PACKAGE_META, TIER_META } from '@/lib/types';
import { cn, formatDate, money, num, pct, relativeTime } from '@/lib/utils';
import { Bars, ChartCard, Heatmap, RankedBars, TrendArea } from '@/components/charts';
import { openTour } from '@/components/GuidedTour';
import parkLake from '@/assets/park-lake.jpg';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, ProgressBar, StatCard } from '@/components/ui';

export default function Dashboard() {
  const { state, currentUser } = useStore();

  const kpis = useMemo(() => headlineKpis(state), [state]);
  const series = useMemo(() => dailySeries(state.rideSessions, 30), [state.rideSessions]);
  const hours = useMemo(() => lapsByHour(state.rideSessions), [state.rideSessions]);
  const heat = useMemo(() => heatmap(state.rideSessions), [state.rideSessions]);
  const lines = useMemo(() => congestion(state.rideSessions), [state.rideSessions]);
  const packages = useMemo(() => revenueByPackage(state.rideSessions), [state.rideSessions]);
  const riders = useMemo(() => topRiders(state, 30, 6), [state]);
  const repeats = useMemo(() => repeatDistribution(state), [state]);
  const fleet = useMemo(() => fleetUtilization(state), [state]);

  const peak = hours.reduce((a, b) => (b.laps > a.laps ? b : a), hours[0]);
  const urgentTickets = state.tickets
    .filter((t) => !['resolved', 'closed'].includes(t.status))
    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 })[a.priority] - ({ critical: 0, high: 1, medium: 2, low: 3 })[b.priority])
    .slice(0, 5);
  const lowStock = state.supplies.filter((s) => s.stock <= s.minStock).slice(0, 5);
  const todayShifts = state.shifts.filter((s) => s.date === new Date().toISOString().slice(0, 10));

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Encabezado con saludo */}
      <div className="relative mb-6 overflow-hidden rounded-2xl px-6 py-7 text-white shadow-pop">
        {/* La foto real del lago, con un velado azul para que el texto respire */}
        <img src={parkLake} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-deep-950/90 via-deep-950/70 to-deep-900/40" />
        <div className="relative">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lagoon-300">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Hi, {currentUser.firstName}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-slate-300">
              {kpis.activeNow > 0
                ? `${kpis.activeNow} riders are on the water right now. The historical peak hour is ${peak.label}.`
                : 'No active sessions right now. The park is ready for guests.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/check-in">
              <Button variant="accent">
                <Waves className="h-4 w-4" /> New check-in
              </Button>
            </Link>
            <Link to="/scanner">
              <Button variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
                Scan a lap
              </Button>
            </Link>
            <Button variant="outline" onClick={openTour} className="border-white/25 bg-white/10 text-white hover:bg-white/20">
              <HelpCircle className="h-4 w-4" /> How it works
            </Button>
          </div>
        </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Revenue · 30 days"
          value={money(kpis.revenue)}
          delta={{ value: pct(Math.abs(kpis.revenueDelta)), positive: kpis.revenueDelta >= 0 }}
          hint="vs. previous 30 days"
          icon={<DollarSign className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Sessions · 30 days"
          value={num(kpis.sessions)}
          delta={{ value: pct(Math.abs(kpis.sessionsDelta)), positive: kpis.sessionsDelta >= 0 }}
          hint={`Avg ticket ${money(kpis.avgTicket)}`}
          icon={<CalendarDays className="h-5 w-5" />}
          tone="lagoon"
        />
        <StatCard
          label="Laps recorded"
          value={num(kpis.laps)}
          delta={{ value: pct(Math.abs(kpis.lapsDelta)), positive: kpis.lapsDelta >= 0 }}
          hint="scanned by QR"
          icon={<Repeat className="h-5 w-5" />}
          tone="indigo"
        />
        <StatCard
          label="Unique customers"
          value={num(kpis.uniques)}
          delta={{ value: pct(Math.abs(kpis.uniquesDelta)), positive: kpis.uniquesDelta >= 0 }}
          hint={`${state.customers.length} in the database`}
          icon={<Users className="h-5 w-5" />}
          tone="sunset"
        />
      </div>

      {/* Congestión en vivo */}
      <Card className="mb-5">
        <CardHeader
          title="Live congestion by line"
          subtitle="Active sessions against each attraction’s safe capacity"
          icon={<Waves className="h-4 w-4" />}
          action={
            <Link to="/operations" className="flex items-center gap-1 text-xs font-semibold text-lagoon-600 hover:text-lagoon-700">
              View operations <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {lines.map((l) => {
            const tone = l.level === 'saturated' ? 'rose' : l.level === 'high' ? 'amber' : l.level === 'moderate' ? 'lagoon' : 'green';
            return (
              <div key={l.line} className="rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold leading-tight text-deep-900">{LINE_LABELS[l.line]}</p>
                  <Badge tone={tone} dot>
                    {l.level}
                  </Badge>
                </div>
                <p className="mt-2.5 text-2xl font-extrabold tabular-nums text-deep-900">
                  {l.current}
                  <span className="text-sm font-semibold text-slate-400">/{l.capacity}</span>
                </p>
                <ProgressBar value={l.current} max={l.capacity} tone={tone === 'rose' ? 'rose' : tone === 'amber' ? 'amber' : tone === 'green' ? 'green' : 'lagoon'} className="mt-2" />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Gráficos principales */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Daily revenue"
          subtitle="Last 30 days"
          className="lg:col-span-2"
          height={280}
          tableHeaders={['Date', 'Revenue', 'Sessions', 'Laps']}
          tableRows={series.map((d) => [d.label, money(d.revenue), d.visits, d.laps])}
        >
          <TrendArea data={series} dataKey="revenue" name="Revenue" currency />
        </ChartCard>

        <ChartCard
          title="Revenue by package"
          subtitle="Last 30 days"
          height={280}
          tableHeaders={['Package', 'Revenue', 'Sessions']}
          tableRows={packages.map((p) => [PACKAGE_META[p.pkg as keyof typeof PACKAGE_META].label, money(p.revenue), p.sessions])}
        >
          <RankedBars
            data={packages.map((p) => ({
              label: PACKAGE_META[p.pkg as keyof typeof PACKAGE_META].label,
              value: p.revenue,
              hint: `· ${p.sessions}`,
            }))}
            currency
          />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Laps by hour of day"
          subtitle={`Peak hour is ${peak.label} — the orange bar marks the maximum`}
          height={240}
          tableHeaders={['Hour', 'Laps totales', 'Daily average']}
          tableRows={hours.map((h) => [h.label, h.laps, h.dailyAverage])}
        >
          <Bars data={hours} dataKey="laps" name="Laps" highlightMax />
        </ChartCard>

        <ChartCard
          title="Heat map: day × hour"
          subtitle="Where to add staff — each cell is scanned laps"
          height={240}
          tableHeaders={['Day', ...heat.hours.map((h) => `${h}h`)]}
          tableRows={heat.grid.map((row, i) => [WEEKDAY_LABELS[i], ...row])}
        >
          <Heatmap grid={heat.grid} max={heat.max} hours={heat.hours} rowLabels={WEEKDAY_LABELS} />
        </ChartCard>
      </div>

      {/* Fila operativa */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Alertas de mantenimiento */}
        <Card>
          <CardHeader
            title="Needs attention"
            subtitle={`${kpis.openTickets} open tickets · ${kpis.assetsDown} assets out of service`}
            icon={<Wrench className="h-4 w-4" />}
            action={
              <Link to="/maintenance" className="text-xs font-semibold text-lagoon-600 hover:text-lagoon-700">
                View all
              </Link>
            }
          />
          {urgentTickets.length ? (
            <ul className="divide-y divide-slate-100">
              {urgentTickets.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                  <span
                    className={cn(
                      'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                      t.priority === 'critical' ? 'bg-rose-100 text-rose-600' : t.priority === 'high' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-deep-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {t.code} · {t.area} · {relativeTime(t.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="All clear" description="No critical tickets open." />
          )}
        </Card>

        {/* Stock bajo */}
        <Card>
          <CardHeader
            title="Supplies to restock"
            subtitle={`${kpis.lowStock} items at or below minimum`}
            icon={<Package className="h-4 w-4" />}
            action={
              <Link to="/supplies" className="text-xs font-semibold text-lagoon-600 hover:text-lagoon-700">
                View all
              </Link>
            }
          />
          {lowStock.length ? (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-deep-900">{s.name}</p>
                    <p className="shrink-0 text-[11px] font-bold tabular-nums text-rose-600">
                      {s.stock} / {s.minStock} {s.unit}
                    </p>
                  </div>
                  <ProgressBar value={s.stock} max={Math.max(s.minStock * 2, s.stock)} tone={s.stock === 0 ? 'rose' : 'amber'} className="mt-1.5" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Inventory healthy" description="No item below its minimum." />
          )}
        </Card>

        {/* Flota y turno */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Fleet utilization" subtitle="Boards, helmets and vests" icon={<Boxes className="h-4 w-4" />} />
            <div className="p-5">
              <p className="text-3xl font-extrabold tabular-nums text-deep-900">{pct(fleet.utilization)}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {fleet.inUse} in use of {fleet.total} rentable
              </p>
              <ProgressBar value={fleet.inUse} max={fleet.total} className="mt-3" />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Available', fleet.available, 'text-emerald-600'],
                  ['In use', fleet.inUse, 'text-lagoon-600'],
                  ['In shop', fleet.down, 'text-rose-600'],
                ].map(([label, value, color]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 py-2">
                    <p className={cn('text-lg font-extrabold tabular-nums', color as string)}>{value as number}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Today’s team" subtitle={`${todayShifts.length} shifts scheduled`} icon={<Users className="h-4 w-4" />} />
            <ul className="max-h-52 divide-y divide-slate-100 overflow-y-auto">
              {todayShifts.slice(0, 8).map((s) => {
                const e = state.employees.find((x) => x.id === s.employeeId);
                if (!e) return null;
                return (
                  <li key={s.id} className="flex items-center gap-2.5 px-5 py-2.5">
                    <Avatar name={`${e.firstName} ${e.lastName}`} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-deep-900">
                        {e.firstName} {e.lastName}
                      </p>
                      <p className="text-[10px] text-slate-500">{s.position}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-slate-600">
                      {s.start}–{s.end}
                    </span>
                  </li>
                );
              })}
              {!todayShifts.length && <EmptyState title="No shifts today" />}
            </ul>
          </Card>
        </div>
      </div>

      {/* Riders top y repetición */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Most active riders · 30 days"
            subtitle="The natural candidates for the loyalty and ambassador program"
            icon={<Repeat className="h-4 w-4" />}
            action={
              <Link to="/loyalty" className="text-xs font-semibold text-lagoon-600 hover:text-lagoon-700">
                Points program
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {riders.map((r, i) => (
              <li key={r.customer!.id}>
                <Link to={`/customers/${r.customer!.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-lagoon-50/40">
                  <span className="w-4 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <Avatar name={`${r.customer!.firstName} ${r.customer!.lastName}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-deep-900">
                      {r.customer!.firstName} {r.customer!.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {r.visitDays} {r.visitDays === 1 ? 'día' : 'días'} at the park · {pct(r.completionRate)} of laps completed
                    </p>
                  </div>
                  <Badge className={TIER_META[r.customer!.tier].color}>{TIER_META[r.customer!.tier].label}</Badge>
                  <span className="w-16 shrink-0 text-right text-sm font-extrabold tabular-nums text-deep-900">
                    {r.laps}
                    <span className="ml-1 text-[10px] font-semibold text-slate-400">laps</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <ChartCard
          title="Visit frequency"
          subtitle="How many customers come back within the month"
          height={220}
          tableHeaders={['Frequency', 'Customers']}
          tableRows={repeats.map((r) => [r.label, r.customers])}
        >
          <Bars data={repeats} dataKey="customers" name="Customers" xKey="label" />
        </ChartCard>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        Demo data generated on {formatDate(new Date().toISOString())} · Working prototype, no backend connected
      </p>
    </div>
  );
}
