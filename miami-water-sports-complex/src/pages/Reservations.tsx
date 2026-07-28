import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PACKAGE_META, type Reservation, type ReservationStatus } from '@/lib/types';
import { addDays, cn, formatDate, isoDate, money, num, startOfWeek, sum, WEEKDAY_KEYS } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, PageHeader, Segmented, Select, StatCard, Table, Td, Th, Tr } from '@/components/ui';

const STATUS_META: Record<ReservationStatus, { label: string; tone: 'green' | 'lagoon' | 'amber' | 'rose' | 'slate' }> = {
  confirmed: { label: 'Confirmada', tone: 'green' },
  pending: { label: 'Pendiente', tone: 'amber' },
  'checked-in': { label: 'Registrado', tone: 'lagoon' },
  cancelled: { label: 'Cancelada', tone: 'rose' },
  'no-show': { label: 'No se presentó', tone: 'slate' },
};

const SOURCE_LABELS: Record<Reservation['source'], string> = {
  web: 'Sitio web',
  phone: 'Phone',
  'walk-in': 'Sin reserva',
  app: 'App móvil',
  groupon: 'Groupon',
};

export default function Reservations() {
  const { state, updateReservation } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'semana' | 'lista'>('semana');
  const [status, setStatus] = useState<'all' | ReservationStatus>('all');

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i))), [weekStart]);

  const filtered = useMemo(
    () => state.reservations.filter((r) => status === 'all' || r.status === status),
    [state.reservations, status],
  );

  const upcoming = useMemo(
    () => filtered.filter((r) => r.date >= isoDate(new Date())).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [filtered],
  );

  const stats = useMemo(() => {
    const next7 = state.reservations.filter((r) => r.date >= isoDate(new Date()) && r.date <= isoDate(addDays(new Date(), 7)) && r.status !== 'cancelled');
    return {
      count: next7.length,
      people: sum(next7, (r) => r.partySize),
      revenue: sum(next7, (r) => r.total),
      prepaid: next7.filter((r) => r.paid).length,
    };
  }, [state.reservations]);

  const bySource = useMemo(() => {
    const acc: Record<string, number> = {};
    state.reservations.forEach((r) => (acc[r.source] = (acc[r.source] ?? 0) + 1));
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [state.reservations]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Reservas"
        description="Agenda del parque. Lo que se reserva aquí se convierte en check-in con un clic."
        actions={
          <Link to="/check-in">
            <Button>New check-in</Button>
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Reservas · próx. 7 días" value={num(stats.count)} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Personas esperadas" value={num(stats.people)} icon={<Users className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Ingreso comprometido" value={money(stats.revenue)} icon={<DollarSign className="h-5 w-5" />} tone="green" />
        <StatCard label="Pagadas por adelantado" value={num(stats.prepaid)} hint={`de ${stats.count} reservas`} icon={<TrendingUp className="h-5 w-5" />} tone="lagoon" />
      </div>

      <Card>
        <CardHeader
          title={view === 'semana' ? `Semana del ${formatDate(days[0])}` : 'Próximas reservas'}
          subtitle="Los cupos se cuentan por persona para respetar la capacidad segura de cada línea"
          action={
            <div className="flex items-center gap-2">
              <Select value={status} onChange={(e) => setStatus(e.target.value as ReservationStatus | 'all')} className="w-auto min-w-[150px]">
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_META) as ReservationStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </Select>
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: 'semana', label: 'Semana' },
                  { value: 'lista', label: 'Lista' },
                ]}
              />
            </div>
          }
        />

        {view === 'semana' ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Esta semana
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {days.map((d, i) => {
                const dayRes = filtered.filter((r) => r.date === d).sort((a, b) => a.time.localeCompare(b.time));
                const isToday = d === isoDate(new Date());
                const people = sum(dayRes.filter((r) => r.status !== 'cancelled'), (r) => r.partySize);
                return (
                  <div key={d} className={cn('rounded-xl border p-2.5', isToday ? 'border-lagoon-400 bg-lagoon-50/40' : 'border-slate-200')}>
                    <div className="mb-2 flex items-baseline justify-between px-1">
                      <span className={cn('text-[11px] font-bold uppercase', isToday ? 'text-lagoon-700' : 'text-slate-500')}>
                        {WEEKDAY_KEYS[i]} {new Date(d).getDate()}
                      </span>
                      {people > 0 && <span className="text-[10px] font-bold text-slate-400">{people} pers.</span>}
                    </div>
                    <div className="space-y-1.5">
                      {dayRes.map((r) => {
                        const c = state.customers.find((x) => x.id === r.customerId);
                        return (
                          <div key={r.id} className={cn('rounded-lg border p-2', r.status === 'cancelled' ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white')}>
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-lagoon-700">{r.time}</span>
                              <span className="text-[9px] font-bold text-slate-400">{r.partySize}p</span>
                            </div>
                            <p className="truncate text-[11px] font-semibold text-deep-900">
                              {c?.firstName} {c?.lastName}
                            </p>
                            <p className="truncate text-[10px] text-slate-500">{PACKAGE_META[r.packageType].label}</p>
                            <Badge tone={STATUS_META[r.status].tone} className="mt-1 text-[9px]">
                              {STATUS_META[r.status].label}
                            </Badge>
                          </div>
                        );
                      })}
                      {!dayRes.length && <p className="py-4 text-center text-[10px] text-slate-300">Sin reservas</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : upcoming.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Date y hora</Th>
                <Th>Customer</Th>
                <Th>Package</Th>
                <Th className="text-right">Personas</Th>
                <Th>Origen</Th>
                <Th className="text-right">Total</Th>
                <Th>Status</Th>
                <Th className="text-right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {upcoming.slice(0, 60).map((r) => {
                const c = state.customers.find((x) => x.id === r.customerId);
                return (
                  <Tr key={r.id}>
                    <Td>
                      <span className="block text-[12px] font-semibold text-deep-900">{formatDate(r.date)}</span>
                      <span className="block font-mono text-[11px] text-slate-500">{r.time}</span>
                    </Td>
                    <Td>
                      {c && (
                        <Link to={`/customers/${c.id}`} className="flex items-center gap-2.5">
                          <Avatar name={`${c.firstName} ${c.lastName}`} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold text-deep-900">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="block truncate text-[10px] text-slate-500">{c.phone}</span>
                          </span>
                        </Link>
                      )}
                    </Td>
                    <Td className="text-[12px]">{PACKAGE_META[r.packageType].label}</Td>
                    <Td className="text-right tabular-nums">{r.partySize}</Td>
                    <Td>
                      <Badge tone="slate">{SOURCE_LABELS[r.source]}</Badge>
                    </Td>
                    <Td className="text-right">
                      <span className="tabular-nums">{money(r.total)}</span>
                      <span className={cn('block text-[10px] font-semibold', r.paid ? 'text-emerald-600' : 'text-amber-600')}>{r.paid ? 'Pagada' : 'Por cobrar'}</span>
                    </Td>
                    <Td>
                      <Badge tone={STATUS_META[r.status].tone} dot>
                        {STATUS_META[r.status].label}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      {r.status === 'confirmed' && (
                        <Button size="sm" variant="outline" onClick={() => updateReservation(r.id, { status: 'checked-in' })}>
                          Check-in
                        </Button>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="Sin reservas próximas" />
        )}
      </Card>

      <Card className="mt-5">
        <CardHeader title="Origen de las reservas" subtitle="Dónde vale la pena invertir en captación" />
        <ul className="grid gap-3 p-5 sm:grid-cols-3 lg:grid-cols-5">
          {bySource.map(([source, count]) => (
            <li key={source} className="rounded-xl border border-slate-200 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{SOURCE_LABELS[source as Reservation['source']]}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums text-deep-900">{count}</p>
              <p className="text-[11px] text-slate-400">{Math.round((count / state.reservations.length) * 100)}% del total</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
