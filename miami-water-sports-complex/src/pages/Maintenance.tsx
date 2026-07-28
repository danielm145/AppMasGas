import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Plus, Wrench } from 'lucide-react';
import { useStore, useEmployeeName } from '@/lib/store';
import {
  PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type MaintenanceTicket,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/types';
import { cn, daysUntil, formatDate, money, num, relativeTime, sum } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  ImageUpload,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
} from '@/components/ui';

const priorityTone = (p: TicketPriority) => ({ critical: 'rose', high: 'amber', medium: 'lagoon', low: 'slate' } as const)[p];
const statusTone = (s: TicketStatus) =>
  ({ open: 'rose', 'in-progress': 'amber', 'waiting-parts': 'indigo', resolved: 'green', closed: 'slate' } as const)[s];

const COLUMNS: TicketStatus[] = ['open', 'in-progress', 'waiting-parts', 'resolved'];

const AREAS = ['Cable park', 'Obstáculos', 'Muelle norte', 'Muelle sur', 'Aqua Park', 'Pro Shop', 'Instalaciones', 'Estacionamiento', 'Operaciones', 'Taller'];

/**
 * Tablero de mantenimiento: tickets correctivos en kanban + plan preventivo.
 * Cualquier empleado puede levantar un ticket; mantenimiento lo mueve de columna.
 */
export default function Maintenance() {
  const { state, addTicket, updateTicket, completePreventive } = useStore();
  const employeeName = useEmployeeName();
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<'all' | TicketPriority>('all');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<MaintenanceTicket | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    area: AREAS[0],
    assetId: '',
    priority: 'medium' as TicketPriority,
    blocksAsset: false,
    photoUrl: undefined as string | undefined,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.tickets.filter((t) => {
      if (q && !`${t.code} ${t.title} ${t.area} ${t.description}`.toLowerCase().includes(q)) return false;
      if (priority !== 'all' && t.priority !== priority) return false;
      return true;
    });
  }, [state.tickets, query, priority]);

  const stats = useMemo(() => {
    const openTickets = state.tickets.filter((t) => !['resolved', 'closed'].includes(t.status));
    const overdue = openTickets.filter((t) => t.dueAt && new Date(t.dueAt) < new Date());
    const resolved30 = state.tickets.filter((t) => t.resolvedAt && Date.now() - new Date(t.resolvedAt).getTime() < 30 * 864e5);
    const avgHours = resolved30.length ? sum(resolved30, (t) => t.laborHours ?? 0) / resolved30.length : 0;
    return {
      open: openTickets.length,
      overdue: overdue.length,
      cost30: sum(resolved30, (t) => t.cost ?? 0),
      avgHours,
    };
  }, [state.tickets]);

  const duePreventive = state.preventivePlans.filter((p) => daysUntil(p.nextDueAt) <= 3);

  const submit = () => {
    if (!draft.title) return;
    addTicket({
      title: draft.title,
      description: draft.description,
      area: draft.area,
      assetId: draft.assetId || undefined,
      priority: draft.priority,
      status: 'open',
      reportedBy: state.currentUserId,
      blocksAsset: draft.blocksAsset,
      photoUrl: draft.photoUrl,
      dueAt: new Date(Date.now() + { critical: 1, high: 3, medium: 10, low: 21 }[draft.priority] * 864e5).toISOString(),
    });
    setDraft({ title: '', description: '', area: AREAS[0], assetId: '', priority: 'medium', blocksAsset: false, photoUrl: undefined });
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Mantenimiento"
        description="Corrective tickets and the preventive plan. Anyone on the team can report damage from their phone."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open tickets" value={num(stats.open)} icon={<Wrench className="h-5 w-5" />} tone="amber" />
        <StatCard label="Vencidos" value={num(stats.overdue)} hint="past their target date" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Cost · 30 days" value={money(stats.cost30)} hint="parts and labor" tone="green" />
        <StatCard label="Hours promedio" value={stats.avgHours.toFixed(1)} hint="per resolved ticket" icon={<Clock className="h-5 w-5" />} tone="indigo" />
      </div>

      {duePreventive.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <CalendarClock className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="flex-1 text-sm font-semibold text-amber-900">
              {duePreventive.length} {duePreventive.length === 1 ? 'preventive task is due' : 'preventive tasks are due'} in the next 3 days
            </p>
            <div className="flex flex-wrap gap-1.5">
              {duePreventive.slice(0, 3).map((p) => (
                <Badge key={p.id} tone={daysUntil(p.nextDueAt) < 0 ? 'rose' : 'amber'}>
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="tickets">
        <TabList className="mb-4">
          <Tab value="tickets" count={filtered.length}>
            Tickets
          </Tab>
          <Tab value="preventivo" count={state.preventivePlans.length}>
            Preventive plan
          </Tab>
        </TabList>

        <TabPanel value="tickets">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search by code, title or area…" className="min-w-[240px] max-w-sm flex-1" />
            <Select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | 'all')} className="w-auto min-w-[150px]">
              <option value="all">All priorities</option>
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const items = filtered.filter((t) => t.status === col);
              return (
                <div key={col} className="rounded-2xl bg-slate-100/70 p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{TICKET_STATUS_LABELS[col]}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600">{items.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((t) => {
                      const asset = state.assets.find((a) => a.id === t.assetId);
                      const overdue = t.dueAt && new Date(t.dueAt) < new Date() && !['resolved', 'closed'].includes(t.status);
                      return (
                        <button
                          key={t.id}
                          onClick={() => setDetail(t)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-lagoon-300 hover:shadow-card"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-400">{t.code}</span>
                            <Badge tone={priorityTone(t.priority)} dot>
                              {PRIORITY_LABELS[t.priority]}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-[13px] font-bold leading-snug text-deep-900">{t.title}</p>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{t.description}</p>
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">{t.area}</span>
                            {asset && <span className="rounded bg-lagoon-50 px-1.5 py-0.5 font-mono font-semibold text-lagoon-700">{asset.code}</span>}
                            {t.blocksAsset && <span className="rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">Blocks asset</span>}
                          </div>
                          <p className={cn('mt-2 text-[10px]', overdue ? 'font-bold text-rose-600' : 'text-slate-400')}>
                            {overdue ? `Overdue ${relativeTime(t.dueAt)}` : `Created ${relativeTime(t.createdAt)}`}
                          </p>
                        </button>
                      );
                    })}
                    {!items.length && <p className="py-6 text-center text-[11px] text-slate-400">No tickets</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel value="preventivo">
          <div className="grid gap-4 lg:grid-cols-2">
            {state.preventivePlans.map((p) => {
              const days = daysUntil(p.nextDueAt);
              return (
                <Card key={p.id}>
                  <CardHeader
                    title={p.name}
                    subtitle={`Cada ${p.frequencyValue} ${{ hours: 'horas de uso', days: 'días', weeks: 'semanas', months: 'meses' }[p.frequencyUnit]} · ~${p.estimatedMinutes} min`}
                    icon={<CalendarClock className="h-4 w-4" />}
                    action={
                      <Badge tone={days < 0 ? 'rose' : days <= 3 ? 'amber' : 'green'} dot>
                        {days < 0 ? `Overdue hace ${-days} d` : days === 0 ? 'Hoy' : `En ${days} d`}
                      </Badge>
                    }
                  />
                  <div className="p-5">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Checklist</p>
                    <ul className="space-y-1.5">
                      {p.checklist.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-[13px] text-slate-600">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                          {c}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <p className="text-[11px] text-slate-500">
                        Last: {formatDate(p.lastDoneAt)} · Owner: {p.assignedRole}
                      </p>
                      <Button size="sm" variant="outline" onClick={() => completePreventive(p.id)}>
                        Mark done
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabPanel>
      </Tabs>

      {/* New ticket */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report an issue"
        subtitle="Maintenance is notified and, if it blocks the asset, the asset is pulled from rental automatically"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!draft.title}>
              Create ticket
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Título" required className="sm:col-span-2">
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="El motor del System 2.0 se sobrecalienta" />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="What happened, when, under what conditions…" />
          </Field>
          <Field label="Área">
            <Select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })}>
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Prioridad">
            <Select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as TicketPriority })}>
              {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Related asset" className="sm:col-span-2" hint="Optional — links the ticket to the asset’s history">
            <Select value={draft.assetId} onChange={(e) => setDraft({ ...draft, assetId: e.target.value })}>
              <option value="">None</option>
              {state.assets.slice(0, 120).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} — {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              label="Block the asset until resolved"
              hint="It is marked as ‘in maintenance’ and no longer shows as available at check-in"
              checked={draft.blocksAsset}
              onChange={(v) => setDraft({ ...draft, blocksAsset: v })}
            />
          </div>
          <ImageUpload className="sm:col-span-2" value={draft.photoUrl} onChange={(v) => setDraft({ ...draft, photoUrl: v })} label="Photo of the problem" />
        </div>
      </Modal>

      {/* Detalle de ticket */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.code} · ${detail.title}` : ''}
        subtitle={detail ? `${detail.area} · reported by ${employeeName(detail.reportedBy)} ${relativeTime(detail.createdAt)}` : ''}
        footer={
          detail && (
            <>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                Cerrar
              </Button>
              {!['resolved', 'closed'].includes(detail.status) && (
                <Button
                  onClick={() => {
                    updateTicket(detail.id, { status: 'resolved', resolvedAt: new Date().toISOString(), resolution: 'Work completed and validated in operation.' });
                    setDetail(null);
                  }}
                >
                  Mark resolved
                </Button>
              )}
            </>
          )
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={priorityTone(detail.priority)} dot>
                Priority {PRIORITY_LABELS[detail.priority]}
              </Badge>
              <Badge tone={statusTone(detail.status)}>{TICKET_STATUS_LABELS[detail.status]}</Badge>
              {detail.blocksAsset && <Badge tone="rose">Blocks the asset</Badge>}
            </div>

            <p className="text-sm leading-relaxed text-slate-600">{detail.description}</p>

            {detail.photoUrl && <img src={detail.photoUrl} alt="" className="max-h-56 rounded-xl border border-slate-200 object-cover" />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estado">
                <Select value={detail.status} onChange={(e) => updateTicket(detail.id, { status: e.target.value as TicketStatus })}>
                  {(Object.keys(TICKET_STATUS_LABELS) as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Assigned to">
                <Select value={detail.assignedTo ?? ''} onChange={(e) => updateTicket(detail.id, { assignedTo: e.target.value || undefined })}>
                  <option value="">Unassigned</option>
                  {state.employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hours de trabajo">
                <Input type="number" value={detail.laborHours ?? 0} onChange={(e) => updateTicket(detail.id, { laborHours: Number(e.target.value) })} />
              </Field>
              <Field label="Cost (USD)">
                <Input type="number" value={detail.cost ?? 0} onChange={(e) => updateTicket(detail.id, { cost: Number(e.target.value) })} />
              </Field>
              <Field label="Resolución" className="sm:col-span-2">
                <Textarea value={detail.resolution ?? ''} onChange={(e) => updateTicket(detail.id, { resolution: e.target.value })} placeholder="What was done to resolve it…" />
              </Field>
            </div>

            {detail.assetId && (
              <Link to={`/assets/${detail.assetId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-lagoon-600 hover:text-lagoon-700">
                View the related asset →
              </Link>
            )}
          </div>
        )}
      </Modal>

      {!state.tickets.length && <EmptyState icon={<Wrench className="h-6 w-6" />} title="No tickets" />}
    </div>
  );
}
