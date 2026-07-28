import { useMemo, useState } from 'react';
import { CalendarClock, Check, CreditCard, RefreshCw, Repeat, Search, TrendingUp, Users } from 'lucide-react';
import { PersonAvatar } from '@/components/CustomerQuickView';
import { useStore } from '@/lib/store';
import { MEMBERSHIP_PLANS, type MembershipPlan } from '@/lib/types';
import { cn, daysUntil, formatDate, fullName, money, num } from '@/lib/utils';
import { Badge, Button, Card, CardHeader, EmptyState, Modal, PageHeader, SearchInput } from '@/components/ui';

/**
 * Membresías.
 *
 * Dos preguntas y nada más: cuánto ingreso recurrente hay vivo, y a quién hay
 * que llamar esta semana porque se le vence. Todo lo demás sobra en una
 * pantalla que se usa de pie en el mostrador.
 */
export default function Memberships() {
  const { state, addMembership, renewMembership, cancelMembership } = useStore();
  const [selling, setSelling] = useState<MembershipPlan | null>(null);
  const [query, setQuery] = useState('');
  const [pickQuery, setPickQuery] = useState('');

  const members = useMemo(
    () =>
      state.memberships
        .filter((m) => m.status === 'active')
        .map((m) => ({
          ...m,
          customer: state.customers.find((c) => c.id === m.customerId),
          plan: MEMBERSHIP_PLANS.find((p) => p.id === m.planId)!,
          daysLeft: daysUntil(m.endsAt),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [state.memberships, state.customers],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => `${m.customer ? fullName(m.customer) : ''} ${m.customer?.phone ?? ''}`.toLowerCase().includes(q));
  }, [members, query]);

  const expiring = members.filter((m) => m.daysLeft <= 7 && m.daysLeft >= 0);

  /** Ingreso recurrente mensual: lo anual se prorratea para poder sumarlo. */
  const mrr = members.reduce((a, m) => a + (m.plan.period === 'annual' ? m.plan.price / 12 : m.plan.price), 0);

  const candidates = useMemo(() => {
    const q = pickQuery.trim().toLowerCase();
    const alreadyMembers = new Set(members.map((m) => m.customerId));
    return state.customers
      .filter((c) => !alreadyMembers.has(c.id))
      .filter((c) => !q || `${fullName(c)} ${c.phone} ${c.memberCode}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [state.customers, members, pickQuery]);

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title="Memberships"
        description="The money that comes in whether it rains or not. Sell one in three taps, and see who to call this week."
      />

      {/* Las dos cifras que importan */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Monthly recurring</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-deep-900">{money(mrr)}</p>
          <p className="mt-1 text-xs text-slate-500">annual plans counted per month</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Active members</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums text-deep-900">{num(members.length)}</p>
          <p className="mt-1 text-xs text-slate-500">{members.filter((m) => m.autoRenew).length} on auto-renew</p>
        </Card>
        <Card className={cn('p-5', expiring.length && 'border-amber-300 bg-amber-50/60')}>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Expiring this week</p>
          <p className={cn('mt-1 text-4xl font-extrabold tabular-nums', expiring.length ? 'text-amber-700' : 'text-deep-900')}>
            {num(expiring.length)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{expiring.length ? 'call them before they lapse' : 'nothing to chase'}</p>
        </Card>
      </div>

      {/* Vender: los planes como tarjetas grandes */}
      <h2 className="mb-3 text-lg font-extrabold tracking-tight text-deep-900">Sell a membership</h2>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MEMBERSHIP_PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelling(plan)}
            className="focus-ring group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:border-lagoon-400 hover:shadow-pop"
          >
            <div className={cn('px-5 py-4 text-white', plan.color)}>
              <p className="text-sm font-bold leading-tight">{plan.name}</p>
              <p className="mt-2 text-3xl font-extrabold">
                {money(plan.price)}
                <span className="text-sm font-semibold opacity-80">/{plan.period === 'annual' ? 'yr' : 'mo'}</span>
              </p>
            </div>
            <ul className="flex-1 space-y-1.5 p-4">
              {plan.includes.map((i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  {i}
                </li>
              ))}
            </ul>
            <span className="m-4 mt-0 rounded-lg bg-slate-100 py-2.5 text-center text-sm font-bold text-deep-900 transition group-hover:bg-lagoon-600 group-hover:text-white">
              Sell this plan
            </span>
          </button>
        ))}
      </div>

      {/* Por vencer — la lista de llamadas de la semana */}
      {expiring.length > 0 && (
        <Card className="mb-5 border-amber-300">
          <CardHeader
            title={`Call these ${expiring.length} this week`}
            subtitle="Their membership lapses within seven days"
            icon={<CalendarClock className="h-4 w-4" />}
          />
          <ul className="divide-y divide-slate-100">
            {expiring.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <PersonAvatar customerId={m.customerId} name={m.customer ? fullName(m.customer) : '—'} src={m.customer?.photoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-deep-900">{m.customer ? fullName(m.customer) : '—'}</p>
                  <p className="text-sm text-slate-500">
                    {m.plan.name} · {m.customer?.phone}
                  </p>
                </div>
                <Badge tone={m.daysLeft <= 2 ? 'rose' : 'amber'}>
                  {m.daysLeft === 0 ? 'Ends today' : `${m.daysLeft} days left`}
                </Badge>
                <Button size="lg" onClick={() => renewMembership(m.id)}>
                  <RefreshCw className="h-4 w-4" /> Renew
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Todos los socios */}
      <Card>
        <CardHeader
          title={`Members — ${members.length}`}
          subtitle="Tap a photo to see their record and emergency contact"
          icon={<Users className="h-4 w-4" />}
          action={<SearchInput value={query} onChange={setQuery} placeholder="Name or phone…" className="w-52" />}
        />
        {filtered.length ? (
          <ul className="divide-y divide-slate-100">
            {filtered.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <PersonAvatar customerId={m.customerId} name={m.customer ? fullName(m.customer) : '—'} src={m.customer?.photoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-deep-900">{m.customer ? fullName(m.customer) : '—'}</p>
                  <p className="truncate text-sm text-slate-500">{m.plan.name}</p>
                  <p className="text-xs text-slate-400">
                    Through {formatDate(m.endsAt)}
                    {m.autoRenew && ' · auto-renews'}
                  </p>
                </div>
                <span className="text-right">
                  <span className="block text-base font-extrabold tabular-nums text-deep-900">{money(m.plan.price)}</span>
                  <span className="block text-[11px] text-slate-400">/{m.plan.period === 'annual' ? 'yr' : 'mo'}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={() => cancelMembership(m.id)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CreditCard className="h-6 w-6" />} title="No members yet" description="Sell the first one from the plans above." />
        )}
      </Card>

      {/* Vender: elegir a quién */}
      <Modal
        open={!!selling}
        onClose={() => setSelling(null)}
        title={selling ? `Sell ${selling.name}` : ''}
        subtitle={selling ? `${money(selling.price)} per ${selling.period === 'annual' ? 'year' : 'month'} · pick who it is for` : ''}
        size="sm"
      >
        {selling && (
          <div className="space-y-4">
            <SearchInput value={pickQuery} onChange={setPickQuery} placeholder="Search the customer…" />
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      addMembership({ customerId: c.id, planId: selling.id, pricePaid: selling.price, autoRenew: true });
                      setSelling(null);
                      setPickQuery('');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-lagoon-50/60"
                  >
                    <PersonAvatar customerId={c.id} name={fullName(c)} src={c.photoUrl} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold text-deep-900">{fullName(c)}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {c.memberCode} · {c.phone}
                      </span>
                    </span>
                    <Repeat className="h-4 w-4 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
              {!candidates.length && (
                <li className="px-4 py-8 text-center text-sm text-slate-400">
                  <Search className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                  No match. Everyone shown here is not a member yet.
                </li>
              )}
            </ul>
            <p className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lagoon-500" />
              Starts today and auto-renews. From now on their check-in shows as covered and the desk charges nothing.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
