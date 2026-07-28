import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Gift, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Bars, ChartCard, RankedBars } from '@/components/charts';
import { useStore } from '@/lib/store';
import { TIER_META, type LoyaltyTier } from '@/lib/types';
import { cn, money, num, pct, relativeTime } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui';

/**
 * Programa de lealtad: cuatro niveles, puntos por dólar y catálogo de premios.
 * La idea es que las visits se acumulen solas — cada sesión cerrada suma.
 */
export default function Loyalty() {
  const { state, redeemReward } = useStore();
  const [query, setQuery] = useState('');
  const [redeemFor, setRedeemFor] = useState<string | null>(null);

  const tierDistribution = useMemo(() => {
    const acc: Record<LoyaltyTier, number> = { splash: 0, rider: 0, pro: 0, legend: 0 };
    state.customers.forEach((c) => (acc[c.tier] += 1));
    return (Object.keys(acc) as LoyaltyTier[]).map((t) => ({ label: TIER_META[t].label, customers: acc[t], tier: t }));
  }, [state.customers]);

  const stats = useMemo(() => {
    const outstanding = state.customers.reduce((a, c) => a + c.points, 0);
    const redeemed = state.pointsLedger.filter((p) => p.type === 'redeem');
    const issued = state.pointsLedger.filter((p) => p.points > 0).reduce((a, p) => a + p.points, 0);
    return {
      outstanding,
      liability: outstanding * 0.05, // ~$0.05 de costo estimado por punto
      redemptions: redeemed.length,
      redemptionRate: issued ? Math.abs(redeemed.reduce((a, p) => a + p.points, 0)) / issued : 0,
    };
  }, [state.customers, state.pointsLedger]);

  const topRewards = useMemo(
    () => [...state.rewards].sort((a, b) => b.redeemed - a.redeemed).map((r) => ({ label: r.name, value: r.redeemed })),
    [state.rewards],
  );

  const leaderboard = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...state.customers]
      .filter((c) => !q || `${c.firstName} ${c.lastName} ${c.memberCode}`.toLowerCase().includes(q))
      .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
      .slice(0, 25);
  }, [state.customers, query]);

  const recentActivity = useMemo(
    () => [...state.pointsLedger].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    [state.pointsLedger],
  );

  const customer = state.customers.find((c) => c.id === redeemFor);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Lealtad y puntos"
        description="Cada dólar gastado suma puntos, cada nivel desbloquea beneficios y cada canje da un motivo para volver."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Puntos en circulación" value={num(stats.outstanding)} icon={<Sparkles className="h-5 w-5" />} tone="lagoon" />
        <StatCard label="Pasivo estimado" value={money(stats.liability)} hint="a $0.05 por punto" tone="amber" />
        <StatCard label="Canjes realizados" value={num(stats.redemptions)} icon={<Gift className="h-5 w-5" />} tone="green" />
        <StatCard label="Tasa de canje" value={pct(stats.redemptionRate)} hint="puntos canjeados / emitidos" icon={<TrendingUp className="h-5 w-5" />} tone="indigo" />
      </div>

      {/* Niveles */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(TIER_META) as LoyaltyTier[]).map((t) => {
          const count = tierDistribution.find((d) => d.tier === t)?.customers ?? 0;
          return (
            <Card key={t} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className={TIER_META[t].color}>{TIER_META[t].label}</Badge>
                  <p className="mt-2 text-2xl font-extrabold tabular-nums text-deep-900">{num(count)}</p>
                  <p className="text-[11px] text-slate-500">
                    clientes · desde {num(TIER_META[t].min)} pts de por vida
                  </p>
                </div>
                <Award className="h-5 w-5 shrink-0 text-slate-300" />
              </div>
              <ul className="mt-3 space-y-1">
                {TIER_META[t].perks.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-lagoon-400" />
                    {p}
                  </li>
                ))}
              </ul>
              <ProgressBar value={count} max={state.customers.length} className="mt-3" />
            </Card>
          );
        })}
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Distribución por nivel"
          subtitle="Cuánta gente hay en cada escalón del programa"
          height={230}
          tableHeaders={['Nivel', 'Customers']}
          tableRows={tierDistribution.map((d) => [d.label, d.customers])}
        >
          <Bars data={tierDistribution} dataKey="customers" name="Customers" />
        </ChartCard>

        <ChartCard
          title="Premios más canjeados"
          subtitle="Qué mueve realmente a los clientes"
          height={230}
          tableHeaders={['Premio', 'Canjes']}
          tableRows={topRewards.map((r) => [r.label, r.value])}
        >
          <RankedBars data={topRewards} />
        </ChartCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Ranking de clientes"
            subtitle="Ordenado por puntos acumulados de por vida"
            icon={<Users className="h-4 w-4" />}
            action={<SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente…" className="w-52" />}
          />
          {leaderboard.length ? (
            <Table>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>Customer</Th>
                  <Th>Tier</Th>
                  <Th className="text-right">Available</Th>
                  <Th className="text-right">De por vida</Th>
                  <Th className="text-right">Acción</Th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((c, i) => (
                  <Tr key={c.id}>
                    <Td className="text-center text-xs font-bold text-slate-400">{i + 1}</Td>
                    <Td>
                      <Link to={`/customers/${c.id}`} className="flex items-center gap-2.5 group">
                        <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-deep-900 group-hover:text-lagoon-700">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="block text-[11px] text-slate-500">
                            {c.memberCode} · {c.visits} visits
                          </span>
                        </span>
                      </Link>
                    </Td>
                    <Td>
                      <Badge className={TIER_META[c.tier].color}>{TIER_META[c.tier].label}</Badge>
                    </Td>
                    <Td className="text-right font-bold tabular-nums text-lagoon-700">{num(c.points)}</Td>
                    <Td className="text-right tabular-nums text-slate-500">{num(c.lifetimePoints)}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setRedeemFor(c.id)}>
                        Canjear
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState title="No results" />
          )}
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Catálogo de premios" subtitle={`${state.rewards.filter((r) => r.active).length} activos`} icon={<Gift className="h-4 w-4" />} />
            <ul className="divide-y divide-slate-100">
              {state.rewards.map((r) => (
                <li key={r.id} className={cn('px-5 py-3.5', !r.active && 'opacity-50')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-deep-900">{r.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{r.description}</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-lagoon-700">{num(r.cost)}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {r.redeemed} canjes {r.stock != null && `· quedan ${r.stock}`} {!r.active && '· inactivo'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Movimientos recientes" />
            <ul className="divide-y divide-slate-100">
              {recentActivity.map((p) => {
                const c = state.customers.find((x) => x.id === p.customerId);
                return (
                  <li key={p.id} className="flex items-center gap-2.5 px-5 py-2.5">
                    <Avatar name={c ? `${c.firstName} ${c.lastName}` : '—'} size="xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-deep-900">
                        {c?.firstName} {c?.lastName}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{p.reason}</p>
                    </div>
                    <span className={cn('shrink-0 text-[12px] font-bold tabular-nums', p.points >= 0 ? 'text-emerald-600' : 'text-amber-600')}>
                      {p.points >= 0 ? '+' : ''}
                      {num(p.points)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400">
              Último movimiento {relativeTime(recentActivity[0]?.date)}
            </p>
          </Card>
        </div>
      </div>

      <Modal open={!!customer} onClose={() => setRedeemFor(null)} title="Canjear premio" subtitle={customer ? `${customer.firstName} ${customer.lastName} · ${num(customer.points)} pts` : ''}>
        {customer && (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.rewards
              .filter((r) => r.active)
              .map((r) => {
                const afford = customer.points >= r.cost;
                return (
                  <button
                    key={r.id}
                    disabled={!afford}
                    onClick={() => {
                      if (redeemReward(customer.id, r.id)) setRedeemFor(null);
                    }}
                    className={cn('rounded-xl border-2 p-4 text-left transition', afford ? 'border-slate-200 hover:border-lagoon-400 hover:bg-lagoon-50/40' : 'border-slate-100 opacity-50')}
                  >
                    <p className="text-sm font-bold text-deep-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>
                    <p className="mt-2 text-sm font-extrabold text-lagoon-700">{num(r.cost)} pts</p>
                  </button>
                );
              })}
          </div>
        )}
      </Modal>
    </div>
  );
}
