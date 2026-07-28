import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Filter, Mail, Phone, UserPlus, Users } from 'lucide-react';
import { PersonAvatar } from '@/components/CustomerQuickView';
import { useStore } from '@/lib/store';
import { segments as segmentDefs } from '@/data/seed';
import { TIER_META, type LoyaltyTier, type SkillLevel } from '@/lib/types';
import { age, cn, downloadCsv, formatDate, money, num, relativeTime } from '@/lib/utils';
import { Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui';

const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  pro: 'Pro',
};

export default function Customers() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'all' | LoyaltyTier>('all');
  const [segment, setSegment] = useState('all');
  const [sort, setSort] = useState<'recent' | 'visits' | 'spend' | 'name'>('recent');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seg = segmentDefs.find((s) => s.id === segment);
    let list = state.customers.filter((c) => {
      if (q && !`${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.memberCode} ${c.city}`.toLowerCase().includes(q)) return false;
      if (tier !== 'all' && c.tier !== tier) return false;
      if (seg && !seg.match(c)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'visits') return b.visits - a.visits;
      if (sort === 'spend') return b.lifetimeSpend - a.lifetimeSpend;
      if (sort === 'name') return a.lastName.localeCompare(b.lastName);
      return (b.lastVisitAt ?? '').localeCompare(a.lastVisitAt ?? '');
    });
    return list;
  }, [state.customers, query, tier, segment, sort]);

  const stats = useMemo(() => {
    const total = state.customers.length;
    const optIn = state.customers.filter((c) => c.marketingOptIn).length;
    const atRisk = state.customers.filter((c) => c.lastVisitAt && Date.now() - new Date(c.lastVisitAt).getTime() > 90 * 864e5).length;
    const avgSpend = total ? state.customers.reduce((a, c) => a + c.lifetimeSpend, 0) / total : 0;
    return { total, optIn, atRisk, avgSpend };
  }, [state.customers]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Customers"
        description="The database that powers post-sale, campaigns and the loyalty program."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  'customers-mwc.csv',
                  rows.map((c) => ({
                    Codigo: c.memberCode,
                    Nombre: `${c.firstName} ${c.lastName}`,
                    Email: c.email,
                    Telefono: c.phone,
                    City: c.city,
                    Nivel: TIER_META[c.tier].label,
                    Visitas: c.visits,
                    GastoTotal: c.lifetimeSpend,
                    Puntos: c.points,
                    UltimaVisita: c.lastVisitAt ? formatDate(c.lastVisitAt) : '',
                    MarketingOptIn: c.marketingOptIn ? 'Sí' : 'No',
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Link to="/check-in">
              <Button>
                <UserPlus className="h-4 w-4" /> New customer
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers registrados" value={num(stats.total)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Marketing opt-in" value={num(stats.optIn)} hint={`${Math.round((stats.optIn / stats.total) * 100)}% of the base`} icon={<Mail className="h-5 w-5" />} tone="green" />
        <StatCard label="At risk of churn" value={num(stats.atRisk)} hint="no visit in 90+ days" icon={<Phone className="h-5 w-5" />} tone="rose" />
        <StatCard label="Average spend" value={money(stats.avgSpend)} hint="per customer, lifetime" icon={<Filter className="h-5 w-5" />} tone="indigo" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Name, email, phone or code…" className="min-w-[240px] flex-1" />
          <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-auto min-w-[180px]">
            <option value="all">All segments</option>
            {segmentDefs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select value={tier} onChange={(e) => setTier(e.target.value as LoyaltyTier | 'all')} className="w-auto min-w-[140px]">
            <option value="all">All tiers</option>
            {(Object.keys(TIER_META) as LoyaltyTier[]).map((t) => (
              <option key={t} value={t}>
                {TIER_META[t].label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-auto min-w-[160px]">
            <option value="recent">Most recent visit</option>
            <option value="visits">Most visits</option>
            <option value="spend">Highest spend</option>
            <option value="name">Last name A–Z</option>
          </Select>
        </div>

        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th>Tier</Th>
                <Th className="text-right">Visits</Th>
                <Th className="text-right">Spend</Th>
                <Th className="text-right">Points</Th>
                <Th>Last visit</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 80).map((c) => (
                <Tr key={c.id}>
                  <Td>
                    <Link to={`/customers/${c.id}`} className="flex items-center gap-3 group">
                      <PersonAvatar customerId={c.id} name={`${c.firstName} ${c.lastName}`} src={c.photoUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-deep-900 group-hover:text-lagoon-700">
                          {c.firstName} {c.lastName}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {c.memberCode} · {age(c.dob)} años · {SKILL_LABELS[c.skillLevel]}
                          {c.isMinor && <span className="ml-1 font-semibold text-amber-600">· menor</span>}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="block truncate text-[12px] text-slate-600">{c.email}</span>
                    <span className="block text-[11px] text-slate-400">{c.phone}</span>
                  </Td>
                  <Td>
                    <Badge className={TIER_META[c.tier].color}>{TIER_META[c.tier].label}</Badge>
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{c.visits}</Td>
                  <Td className="text-right tabular-nums">{money(c.lifetimeSpend)}</Td>
                  <Td className="text-right font-semibold tabular-nums text-lagoon-700">{num(c.points)}</Td>
                  <Td>
                    <span className={cn('text-[12px]', c.lastVisitAt && Date.now() - new Date(c.lastVisitAt).getTime() > 90 * 864e5 ? 'font-semibold text-rose-600' : 'text-slate-600')}>
                      {relativeTime(c.lastVisitAt)}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No results" description="Adjust your search or filters." />
        )}
        {rows.length > 80 && <p className="px-5 py-3 text-center text-xs text-slate-400">Showing 80 of {rows.length} · refine the filters to see the rest</p>}
      </Card>
    </div>
  );
}
