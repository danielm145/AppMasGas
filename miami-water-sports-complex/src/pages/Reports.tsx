import { useMemo, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
import {
  congestion,
  dailySeries,
  heatmap,
  lapsByHour,
  repeatDistribution,
  revenueByPackage,
  topRiders,
  WEEKDAY_LABELS,
} from '@/lib/analytics';
import { Bars, ChartCard, Heatmap, MultiLine, RankedBars, TrendArea } from '@/components/charts';
import { useStore } from '@/lib/store';
import { LINE_LABELS, PACKAGE_META, type CableLine } from '@/lib/types';
import { addDays, downloadCsv, groupBy, isoDate, money, num, pct, sum } from '@/lib/utils';
import { Card, CardHeader, PageHeader, Segmented, StatCard, Table, Td, Th, Tr } from '@/components/ui';

type Range = 7 | 30 | 90;

/**
 * Reportes del dueño: dónde está el dinero, cuándo se llena el parque y quién
 * repite. Todo sale de las vueltas escaneadas y las sesiones cobradas.
 */
export default function Reports() {
  const { state } = useStore();
  const [range, setRange] = useState<Range>(30);

  const since = useMemo(() => addDays(new Date(), -range), [range]);
  const sessions = useMemo(() => state.rideSessions.filter((s) => new Date(s.startAt) >= since), [state.rideSessions, since]);
  

  const series = useMemo(() => dailySeries(state.rideSessions, range), [state.rideSessions, range]);
  const hours = useMemo(() => lapsByHour(sessions), [sessions]);
  const heat = useMemo(() => heatmap(sessions), [sessions]);
  const packages = useMemo(() => revenueByPackage(state.rideSessions, range), [state.rideSessions, range]);
  const riders = useMemo(() => topRiders(state, range, 10), [state, range]);
  const repeats = useMemo(() => repeatDistribution(state, range), [state, range]);
  const lines = useMemo(() => congestion(state.rideSessions), [state.rideSessions]);

  const revenue = sum(sessions, (s) => s.amountPaid);
  const uniques = new Set(sessions.map((s) => s.customerId)).size;
  const totalLaps = sum(sessions, (s) => s.turnsUsed);
  

  /** Turnos por línea y día — para ver qué atracción sostiene la operación. */
  const byLineDaily = useMemo(() => {
    const byDay = groupBy(sessions, (ses) => isoDate(new Date(ses.startAt)));
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, list]) => {
        const row: Record<string, string | number> = {
          label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        };
        (Object.keys(LINE_LABELS) as CableLine[]).forEach((line) => {
          row[line] = list.filter((ses) => ses.line === line).reduce((a, ses) => a + ses.turnsUsed, 0);
        });
        return row;
      });
  }, [sessions]);

  const peak = hours.reduce((a, b) => (b.laps > a.laps ? b : a), hours[0] ?? { label: '—', laps: 0, hour: 0, dailyAverage: 0 });
  const busiestDay = heat.grid
    .map((row, i) => ({ day: WEEKDAY_LABELS[i], total: row.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)[0];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Reportes"
        description="Revenue, ocupación, horas pico y comportamiento de los clientes."
        actions={
          <>
            <Segmented
              value={range}
              onChange={setRange}
              options={[
                { value: 7 as Range, label: '7 días' },
                { value: 30 as Range, label: '30 días' },
                { value: 90 as Range, label: '90 días' },
              ]}
            />
            <button
              onClick={() =>
                downloadCsv(
                  `reporte-diario-${range}d.csv`,
                  series.map((d) => ({ Date: d.date, Revenue: d.revenue, Sessions: d.visits, Laps: d.laps })),
                )
              }
              className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-deep-900 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={`Revenue · ${range} días`} value={money(revenue)} tone="green" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Sessions" value={num(sessions.length)} hint={`ticket prom. ${money(sessions.length ? revenue / sessions.length : 0)}`} />
        <StatCard label="Unique customers" value={num(uniques)} hint={`${(sessions.length / Math.max(1, uniques)).toFixed(1)} visits por cliente`} tone="indigo" />
        <StatCard label="Laps completadas" value={num(totalLaps)} tone="lagoon" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Daily revenue"
          subtitle={`Últimos ${range} días`}
          className="lg:col-span-2"
          height={280}
          tableHeaders={['Date', 'Revenue', 'Sessions', 'Laps']}
          tableRows={series.map((d) => [d.label, money(d.revenue), d.visits, d.laps])}
        >
          <TrendArea data={series} dataKey="revenue" name="Revenue" currency />
        </ChartCard>

        <ChartCard
          title="Revenue by package"
          subtitle="Qué producto sostiene el negocio"
          height={280}
          tableHeaders={['Package', 'Revenue', 'Sessions']}
          tableRows={packages.map((p) => [PACKAGE_META[p.pkg as keyof typeof PACKAGE_META].label, money(p.revenue), p.sessions])}
        >
          <RankedBars
            data={packages.map((p) => ({ label: PACKAGE_META[p.pkg as keyof typeof PACKAGE_META].label, value: p.revenue, hint: `· ${p.sessions}` }))}
            currency
          />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Hours pico"
          subtitle={`El máximo está a las ${peak.label} — programa más personal en esa franja`}
          height={250}
          tableHeaders={['Hour', 'Laps', 'Promedio diario']}
          tableRows={hours.map((h) => [h.label, h.laps, h.dailyAverage])}
        >
          <Bars data={hours} dataKey="laps" name="Laps" highlightMax />
        </ChartCard>

        <ChartCard
          title="Mapa de calor semanal"
          subtitle={busiestDay ? `El día más cargado es ${busiestDay.day}` : ''}
          height={250}
          tableHeaders={['Day', ...heat.hours.map((h) => `${h}h`)]}
          tableRows={heat.grid.map((row, i) => [WEEKDAY_LABELS[i], ...row])}
        >
          <Heatmap grid={heat.grid} max={heat.max} hours={heat.hours} rowLabels={WEEKDAY_LABELS} />
        </ChartCard>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Laps por atracción"
          subtitle="Evolución diaria de cada línea"
          className="lg:col-span-2"
          height={260}
          tableHeaders={['Date', ...(Object.keys(LINE_LABELS) as CableLine[]).map((l) => LINE_LABELS[l])]}
          tableRows={byLineDaily.map((r) => [
            String(r.label),
            ...(Object.keys(LINE_LABELS) as CableLine[]).map((l) => Number(r[l] ?? 0)),
          ])}
        >
          <MultiLine
            data={byLineDaily}
            series={(Object.keys(LINE_LABELS) as CableLine[]).map((l) => ({ key: l, name: LINE_LABELS[l].split(' (')[0] }))}
          />
        </ChartCard>

        <ChartCard
          title="Visit frequency"
          subtitle="Cuántos clientes repiten en el período"
          height={260}
          tableHeaders={['Frequency', 'Customers']}
          tableRows={repeats.map((r) => [r.label, r.customers])}
        >
          <Bars data={repeats} dataKey="customers" name="Customers" />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Riders más frecuentes" subtitle={`Top 10 por vueltas en ${range} días`} />
          <Table>
            <thead>
              <tr>
                <Th className="w-10">#</Th>
                <Th>Customer</Th>
                <Th className="text-right">Laps</Th>
                <Th className="text-right">Days</Th>
                <Th className="text-right">Completadas</Th>
              </tr>
            </thead>
            <tbody>
              {riders.map((r, i) => (
                <Tr key={r.customer!.id}>
                  <Td className="text-center text-xs font-bold text-slate-400">{i + 1}</Td>
                  <Td className="font-semibold">
                    {r.customer!.firstName} {r.customer!.lastName}
                  </Td>
                  <Td className="text-right font-bold tabular-nums">{r.laps}</Td>
                  <Td className="text-right tabular-nums text-slate-500">{r.visitDays}</Td>
                  <Td className="text-right tabular-nums">{pct(r.completionRate)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Ocupación actual por atracción" subtitle="Foto del momento — útil para decidir aperturas y cierres" />
          <Table>
            <thead>
              <tr>
                <Th>Attraction</Th>
                <Th className="text-right">In use</Th>
                <Th className="text-right">Capacidad</Th>
                <Th className="text-right">Carga</Th>
                <Th>Tier</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <Tr key={l.line}>
                  <Td className="text-[13px] font-medium">{LINE_LABELS[l.line]}</Td>
                  <Td className="text-right font-bold tabular-nums">{l.current}</Td>
                  <Td className="text-right tabular-nums text-slate-500">{l.capacity}</Td>
                  <Td className="text-right tabular-nums">{pct(l.load)}</Td>
                  <Td className="text-[12px] capitalize text-slate-600">{l.level}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-slate-100 p-5">
            <p className="text-xs leading-relaxed text-slate-500">
              Las vueltas escaneadas alimentan estas cifras en tiempo real. Con dos o tres temporadas de historial, el mismo dato sirve para proyectar la
              demanda per week y ajustar precios dinámicos en las franjas más saturadas.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
