import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { useStore } from '@/lib/store';
import { LINE_LABELS, PACKAGE_META, TIER_META, WAIVER_LABELS } from '@/lib/types';
import { age, cn, daysUntil, formatDate, formatDateTime, money, nextTier, num, relativeTime } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  ProgressBar,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Td,
  Th,
  Timeline,
  TimelineItem,
  Tr,
} from '@/components/ui';

export default function CustomerDetail() {
  const { id } = useParams();
  const { state, updateCustomer, awardPoints, redeemReward } = useStore();
  const [editing, setEditing] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [bonus, setBonus] = useState({ points: 100, reason: 'Cortesía del gerente' });

  const customer = state.customers.find((c) => c.id === id);

  const sessions = useMemo(
    () => state.rideSessions.filter((s) => s.customerId === id).sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [state.rideSessions, id],
  );
  const laps = useMemo(() => state.lapLogs.filter((l) => l.customerId === id), [state.lapLogs, id]);
  const waivers = useMemo(() => state.waivers.filter((w) => w.customerId === id), [state.waivers, id]);
  const ledger = useMemo(
    () => state.pointsLedger.filter((p) => p.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [state.pointsLedger, id],
  );

  if (!customer) {
    return <EmptyState title="Customer not found" description="It may have been deleted, or the link is invalid." action={<Link to="/customers"><Button size="sm">Back to customers</Button></Link>} />;
  }

  const activeWaiver = waivers.find((w) => w.type !== 'photo-release' && new Date(w.expiresAt) > new Date());
  const nt = nextTier(customer.tier);
  const toNext = nt ? TIER_META[nt].min - customer.lifetimePoints : 0;
  const completedLaps = laps.filter((l) => l.completed).length;

  const favoriteLine = Object.entries(
    laps.reduce<Record<string, number>>((acc, l) => {
      acc[l.line] = (acc[l.line] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link to="/customers" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-deep-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to customers
      </Link>

      {/* Ficha */}
      <Card className="mb-5 overflow-hidden">
        <div className="wave-bg h-24" />
        <div className="px-6 pb-5">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar name={`${customer.firstName} ${customer.lastName}`} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-deep-900">
                  {customer.firstName} {customer.lastName}
                </h1>
                <p className="text-sm text-slate-500">
                  {customer.memberCode} · {age(customer.dob)} años · Cliente desde {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Button variant="outline" onClick={() => setEditing(true)}>
                Editar datos
              </Button>
              <Button variant="outline" onClick={() => setRewardOpen(true)}>
                <Gift className="h-4 w-4" /> Canjear premio
              </Button>
              <Link to="/check-in">
                <Button>
                  <Waves className="h-4 w-4" /> Check-in
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className={TIER_META[customer.tier].color}>{TIER_META[customer.tier].label}</Badge>
            {activeWaiver ? (
              <Badge tone="green" dot>
                Waiver vigente · vence en {daysUntil(activeWaiver.expiresAt)} días
              </Badge>
            ) : (
              <Badge tone="rose" dot>
                No waiver vigente
              </Badge>
            )}
            {customer.isMinor && <Badge tone="amber">Minor</Badge>}
            {customer.marketingOptIn && <Badge tone="lagoon">Acepta email</Badge>}
            {customer.smsOptIn && <Badge tone="lagoon">Acepta SMS</Badge>}
            {customer.tags.map((t) => (
              <Badge key={t} tone="slate">
                {t}
              </Badge>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Visitas', num(customer.visits), 'histórico'],
              ['Gasto total', money(customer.lifetimeSpend), `prom. ${money(customer.visits ? customer.lifetimeSpend / customer.visits : 0)} por visita`],
              ['Laps', num(completedLaps), favoriteLine ? `favorita: ${LINE_LABELS[favoriteLine[0] as keyof typeof LINE_LABELS]}` : ''],
              ['Puntos disponibles', num(customer.points), `${num(customer.lifetimePoints)} de por vida`],
            ].map(([label, value, hint]) => (
              <div key={label} className="rounded-xl border border-slate-200 p-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-deep-900">{value}</p>
                {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
              </div>
            ))}
          </div>

          {nt && (
            <div className="mt-4 rounded-xl border border-lagoon-200 bg-lagoon-50/60 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold text-lagoon-900">
                  <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                  Le faltan {num(Math.max(0, toNext))} puntos para {TIER_META[nt].label}
                </p>
                <p className="text-[11px] text-lagoon-700">{TIER_META[nt].perks[0]}</p>
              </div>
              <ProgressBar value={customer.lifetimePoints - TIER_META[customer.tier].min} max={TIER_META[nt].min - TIER_META[customer.tier].min} className="mt-2" />
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="visits">
            <TabList className="mb-4">
              <Tab value="visits" count={sessions.length}>
                Historial de visits
              </Tab>
              <Tab value="waivers" count={waivers.length}>
                Waivers
              </Tab>
              <Tab value="puntos" count={ledger.length}>
                Movimientos de puntos
              </Tab>
            </TabList>

            <TabPanel value="visits">
              <Card>
                {sessions.length ? (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Package</Th>
                        <Th>Attraction</Th>
                        <Th className="text-right">Laps</Th>
                        <Th className="text-right">Caídas</Th>
                        <Th className="text-right">Pagado</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.slice(0, 25).map((s) => (
                        <Tr key={s.id}>
                          <Td>
                            <span className="block text-[12px] font-semibold text-deep-900">{formatDate(s.startAt)}</span>
                            <span className="block text-[11px] text-slate-400">{relativeTime(s.startAt)}</span>
                          </Td>
                          <Td className="text-[12px]">{PACKAGE_META[s.packageType].label}</Td>
                          <Td className="text-[12px] text-slate-600">{LINE_LABELS[s.line]}</Td>
                          <Td className="text-right font-semibold tabular-nums">{s.lapsCompleted}</Td>
                          <Td className="text-right tabular-nums text-slate-500">{s.falls}</Td>
                          <Td className="text-right tabular-nums">{money(s.amountPaid)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <EmptyState title="Sin visits registradas" description="Cuando haga su primer check-in aparecerá aquí." />
                )}
              </Card>
            </TabPanel>

            <TabPanel value="waivers">
              <Card>
                {waivers.length ? (
                  <ul className="divide-y divide-slate-100">
                    {waivers.map((w) => {
                      const vigente = new Date(w.expiresAt) > new Date();
                      return (
                        <li key={w.id} className="flex items-start gap-3 px-5 py-4">
                          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', vigente ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600')}>
                            {vigente ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-deep-900">{WAIVER_LABELS[w.type]}</p>
                            <p className="text-[11px] text-slate-500">
                              Firmado por {w.signerName} el {formatDate(w.signedAt)} · versión {w.version}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {vigente ? `Vigente hasta ${formatDate(w.expiresAt)}` : `Venció el ${formatDate(w.expiresAt)}`} · IP {w.ipAddress}
                            </p>
                          </div>
                          {w.signatureDataUrl && <img src={w.signatureDataUrl} alt="Firma" className="h-12 w-28 shrink-0 rounded border border-slate-200 bg-white object-contain" />}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState title="No waivers" description="Debe firmar antes de entrar al agua." />
                )}
              </Card>
            </TabPanel>

            <TabPanel value="puntos">
              <Card className="p-5">
                {ledger.length ? (
                  <Timeline>
                    {ledger.slice(0, 20).map((p) => (
                      <TimelineItem
                        key={p.id}
                        title={p.reason}
                        meta={formatDateTime(p.date)}
                        tone={p.points >= 0 ? 'green' : 'amber'}
                        icon={<span className="text-[9px] font-black">{p.points >= 0 ? '+' : '−'}</span>}
                      >
                        <span className={cn('font-semibold tabular-nums', p.points >= 0 ? 'text-emerald-700' : 'text-amber-700')}>
                          {p.points >= 0 ? '+' : ''}
                          {num(p.points)} pts
                        </span>
                      </TimelineItem>
                    ))}
                  </Timeline>
                ) : (
                  <EmptyState title="Sin movimientos" />
                )}
              </Card>
            </TabPanel>
          </Tabs>
        </div>

        {/* Columna lateral */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Contacto" />
            <ul className="space-y-3 p-5 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <a href={`mailto:${customer.email}`} className="truncate text-lagoon-700 hover:underline">
                  {customer.email}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="text-slate-700">{customer.phone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="text-slate-700">
                  {customer.city}, {customer.state} {customer.zip}
                </span>
              </li>
            </ul>
            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Emergency contact</p>
              <p className="text-sm font-semibold text-deep-900">{customer.emergencyContact.name || '—'}</p>
              <p className="text-xs text-slate-500">
                {customer.emergencyContact.relation} · {customer.emergencyContact.phone}
              </p>
            </div>
            {customer.isMinor && (
              <div className="border-t border-slate-100 bg-amber-50/60 px-5 py-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">Legal guardian</p>
                <p className="text-sm font-semibold text-deep-900">{customer.guardianName}</p>
                <p className="text-xs text-slate-500">{customer.guardianPhone}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Credencial digital" subtitle="Escaneable en recepción" />
            <div className="flex justify-center p-5">
              <QrCode value={`mws://member/${customer.memberCode}`} label={customer.memberCode} caption="Identifica al cliente sin buscarlo por nombre" size={140} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Ajuste manual de puntos" subtitle="Cortesías, correcciones o bonos de campaña" />
            <div className="space-y-3 p-5">
              <Field label="Puntos">
                <Input type="number" value={bonus.points} onChange={(e) => setBonus({ ...bonus, points: Number(e.target.value) })} />
              </Field>
              <Field label="Motivo">
                <Input value={bonus.reason} onChange={(e) => setBonus({ ...bonus, reason: e.target.value })} />
              </Field>
              <Button
                className="w-full"
                onClick={() => {
                  awardPoints(customer.id, bonus.points, bonus.reason);
                }}
              >
                Aplicar ajuste
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal editar */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar cliente"
        subtitle={`${customer.firstName} ${customer.lastName} · ${customer.memberCode}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button onClick={() => setEditing(false)}>Listo</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name">
            <Input value={customer.firstName} onChange={(e) => updateCustomer(customer.id, { firstName: e.target.value })} />
          </Field>
          <Field label="Last name">
            <Input value={customer.lastName} onChange={(e) => updateCustomer(customer.id, { lastName: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={customer.email} onChange={(e) => updateCustomer(customer.id, { email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={customer.phone} onChange={(e) => updateCustomer(customer.id, { phone: e.target.value })} />
          </Field>
          <Field label="Skill level">
            <Select value={customer.skillLevel} onChange={(e) => updateCustomer(customer.id, { skillLevel: e.target.value as typeof customer.skillLevel })}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="pro">Pro</option>
            </Select>
          </Field>
          <Field label="City">
            <Input value={customer.city} onChange={(e) => updateCustomer(customer.id, { city: e.target.value })} />
          </Field>
          <Field label="Internal notes" className="sm:col-span-2">
            <Input value={customer.notes ?? ''} onChange={(e) => updateCustomer(customer.id, { notes: e.target.value })} placeholder="Preferencias, incidentes, observaciones…" />
          </Field>
        </div>
      </Modal>

      {/* Modal canje */}
      <Modal open={rewardOpen} onClose={() => setRewardOpen(false)} title="Canjear premio" subtitle={`${num(customer.points)} puntos disponibles`}>
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
                    if (redeemReward(customer.id, r.id)) setRewardOpen(false);
                  }}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition',
                    afford ? 'border-slate-200 hover:border-lagoon-400 hover:bg-lagoon-50/40' : 'border-slate-100 opacity-50',
                  )}
                >
                  <p className="text-sm font-bold text-deep-900">{r.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>
                  <p className="mt-2 text-sm font-extrabold text-lagoon-700">{num(r.cost)} pts</p>
                </button>
              );
            })}
        </div>
      </Modal>
    </div>
  );
}
