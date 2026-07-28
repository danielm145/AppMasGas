import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  DollarSign,
  Hammer,
  MapPin,
  Package,
  ShoppingCart,
  Truck,
  Wrench,
} from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { useStore, useEmployeeName } from '@/lib/store';
import {
  ASSET_CATEGORY_LABELS,
  ASSET_EVENT_LABELS,
  type AssetCondition,
  type AssetEventType,
  type AssetStatus,
  type TicketPriority,
} from '@/lib/types';
import { cn, formatDate, isoDate, money, num, relativeTime, sum } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  ImageUpload,
  Input,
  Modal,
  ProgressBar,
  Select,
  Textarea,
  Timeline,
  TimelineItem,
} from '@/components/ui';

const STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Disponible',
  'in-use': 'In use',
  maintenance: 'En mantenimiento',
  retired: 'Dado de baja',
  lost: 'Extraviado',
};

const CONDITION_LABELS: Record<AssetCondition, string> = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  retired: 'Retired',
};

const EVENT_ICONS: Record<AssetEventType, typeof Wrench> = {
  purchase: ShoppingCart,
  assignment: Package,
  return: Package,
  damage: AlertTriangle,
  maintenance: Wrench,
  inspection: ClipboardList,
  transfer: Truck,
  retire: Hammer,
  note: ClipboardList,
};

const EVENT_TONES: Record<AssetEventType, 'lagoon' | 'green' | 'amber' | 'rose' | 'slate'> = {
  purchase: 'green',
  assignment: 'lagoon',
  return: 'lagoon',
  damage: 'rose',
  maintenance: 'amber',
  inspection: 'slate',
  transfer: 'slate',
  retire: 'slate',
  note: 'slate',
};

/**
 * Ficha completa del activo con su línea de tiempo: compra, asignaciones,
 * daños, mantenimientos y bajas. Es la hoja de vida de cada tabla.
 */
export default function AssetDetail() {
  const { id } = useParams();
  const { state, updateAsset, addAssetEvent, addTicket } = useStore();
  const employeeName = useEmployeeName();
  const [eventOpen, setEventOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [event, setEvent] = useState({ type: 'inspection' as AssetEventType, description: '', cost: 0, photoUrl: undefined as string | undefined });
  const [ticket, setTicket] = useState({ title: '', description: '', priority: 'medium' as TicketPriority, blocksAsset: false });

  const asset = state.assets.find((a) => a.id === id);
  const events = useMemo(
    () => state.assetEvents.filter((e) => e.assetId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [state.assetEvents, id],
  );
  const relatedTickets = useMemo(() => state.tickets.filter((t) => t.assetId === id), [state.tickets, id]);

  if (!asset) {
    return (
      <EmptyState
        title="Asset not found"
        action={
          <Link to="/assets">
            <Button size="sm">Back to inventory</Button>
          </Link>
        }
      />
    );
  }

  const maintenanceCost = sum(events.filter((e) => e.type === 'maintenance'), (e) => e.cost ?? 0);
  const totalCost = asset.purchasePrice + maintenanceCost;
  const wear = asset.serviceIntervalHours ? (asset.usageHours % asset.serviceIntervalHours) / asset.serviceIntervalHours : 0;
  const assignedTo = state.customers.find((c) => c.id === asset.assignedTo);
  const ageYears = (Date.now() - new Date(asset.purchaseDate).getTime()) / (365 * 864e5);

  const saveEvent = () => {
    if (!event.description) return;
    addAssetEvent({
      assetId: asset.id,
      type: event.type,
      date: isoDate(new Date()),
      description: event.description,
      cost: event.cost || undefined,
      performedBy: state.currentUserId,
      hoursAtEvent: Math.round(asset.usageHours),
      photoUrl: event.photoUrl,
    });
    if (event.type === 'maintenance') updateAsset(asset.id, { lastServiceAt: isoDate(new Date()) });
    if (event.type === 'retire') updateAsset(asset.id, { status: 'retired', condition: 'retired' });
    setEvent({ type: 'inspection', description: '', cost: 0, photoUrl: undefined });
    setEventOpen(false);
  };

  const saveTicket = () => {
    if (!ticket.title) return;
    addTicket({
      title: ticket.title,
      description: ticket.description,
      assetId: asset.id,
      area: asset.location,
      priority: ticket.priority,
      status: 'open',
      reportedBy: state.currentUserId,
      blocksAsset: ticket.blocksAsset,
    });
    setTicket({ title: '', description: '', priority: 'medium', blocksAsset: false });
    setTicketOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link to="/assets" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-deep-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to inventory
      </Link>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="mb-5 overflow-hidden">
            <div className="grid sm:grid-cols-[240px_1fr]">
              <div className="aspect-[4/3] bg-slate-100 sm:aspect-auto">
                <img src={asset.photoUrl} alt={asset.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] font-bold tracking-widest text-lagoon-600">{asset.code}</p>
                    <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-deep-900">{asset.name}</h1>
                    <p className="text-sm text-slate-500">
                      {ASSET_CATEGORY_LABELS[asset.category]} · {asset.brand} {asset.model}
                      {asset.size && ` · ${asset.size}`}
                    </p>
                  </div>
                  <Select
                    value={asset.status}
                    onChange={(e) => updateAsset(asset.id, { status: e.target.value as AssetStatus })}
                    className="w-auto min-w-[160px]"
                  >
                    {(Object.keys(STATUS_LABELS) as AssetStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone={asset.condition === 'poor' ? 'rose' : asset.condition === 'fair' ? 'amber' : 'green'}>
                    Condición: {CONDITION_LABELS[asset.condition]}
                  </Badge>
                  <Badge tone="slate">
                    <MapPin className="h-3 w-3" /> {asset.location}
                  </Badge>
                  {asset.serial && <Badge tone="slate">S/N {asset.serial}</Badge>}
                  {assignedTo && (
                    <Link to={`/customers/${assignedTo.id}`}>
                      <Badge tone="lagoon">In use por {assignedTo.firstName} {assignedTo.lastName}</Badge>
                    </Link>
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-slate-600">Hours hasta próximo servicio</span>
                    <span className="font-bold tabular-nums text-deep-900">
                      {Math.round(asset.usageHours)} h de {asset.serviceIntervalHours ?? '—'} h
                    </span>
                  </div>
                  <ProgressBar value={wear * 100} tone={wear > 0.85 ? 'rose' : wear > 0.6 ? 'amber' : 'lagoon'} showLabel />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setEventOpen(true)}>
                    <ClipboardList className="h-3.5 w-3.5" /> Registrar evento
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setTicketOpen(true)}>
                    <Wrench className="h-3.5 w-3.5" /> Reportar daño
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Historial del activo"
              subtitle={`${events.length} eventos desde la compra — compras, asignaciones, daños y mantenimientos`}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <div className="p-5">
              {events.length ? (
                <Timeline>
                  {events.map((e) => {
                    const Icon = EVENT_ICONS[e.type];
                    return (
                      <TimelineItem
                        key={e.id}
                        tone={EVENT_TONES[e.type]}
                        icon={<Icon className="h-3 w-3" />}
                        title={ASSET_EVENT_LABELS[e.type]}
                        meta={`${formatDate(e.date)} · ${relativeTime(e.date)}`}
                      >
                        <p>{e.description}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Por {employeeName(e.performedBy)}
                          {e.hoursAtEvent != null && ` · ${e.hoursAtEvent} h de uso`}
                          {e.cost != null && ` · ${money(e.cost)}`}
                        </p>
                        {e.photoUrl && <img src={e.photoUrl} alt="" className="mt-2 h-24 rounded-lg border border-slate-200 object-cover" />}
                      </TimelineItem>
                    );
                  })}
                </Timeline>
              ) : (
                <EmptyState title="Sin eventos registrados" />
              )}
            </div>
          </Card>
        </div>

        {/* Lateral */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Costo total de propiedad" icon={<DollarSign className="h-4 w-4" />} />
            <div className="p-5">
              <p className="text-3xl font-extrabold tabular-nums text-deep-900">{money(totalCost)}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="flex justify-between">
                  <span className="text-slate-500">Purchase</span>
                  <span className="font-semibold tabular-nums">{money(asset.purchasePrice)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Mantenimientos</span>
                  <span className="font-semibold tabular-nums">{money(maintenanceCost)}</span>
                </li>
                <li className="flex justify-between border-t border-slate-100 pt-2.5">
                  <span className="text-slate-500">Costo por hora de uso</span>
                  <span className="font-semibold tabular-nums">{asset.usageHours > 0 ? money(totalCost / asset.usageHours, 2) : '—'}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Antigüedad</span>
                  <span className="font-semibold tabular-nums">{ageYears.toFixed(1)} años</span>
                </li>
              </ul>
              <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                Comprado el {formatDate(asset.purchaseDate)}
                {asset.vendor && ` a ${asset.vendor}`}. Último servicio {formatDate(asset.lastServiceAt)}.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Etiqueta QR" subtitle="Pégala al activo para escanearlo" />
            <div className="flex justify-center p-5">
              <QrCode value={`mws://asset/${asset.code}`} label={asset.code} size={140} caption="Escanea para abrir la ficha, reportar un daño o registrar una inspección." />
            </div>
          </Card>

          <Card>
            <CardHeader title="Tickets relacionados" subtitle={`${relatedTickets.length} en total`} icon={<Wrench className="h-4 w-4" />} />
            {relatedTickets.length ? (
              <ul className="divide-y divide-slate-100">
                {relatedTickets.slice(0, 6).map((t) => (
                  <li key={t.id} className="px-5 py-3">
                    <p className="text-[13px] font-semibold text-deep-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {t.code} · {relativeTime(t.createdAt)}
                    </p>
                    <span className={cn('mt-1 inline-block text-[11px] font-bold', ['resolved', 'closed'].includes(t.status) ? 'text-emerald-600' : 'text-amber-600')}>
                      {['resolved', 'closed'].includes(t.status) ? 'Resuelto' : 'Abierto'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Sin incidencias" description="Este activo nunca ha generado un ticket." />
            )}
          </Card>
        </div>
      </div>

      {/* Modal evento */}
      <Modal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title="Registrar evento en el historial"
        subtitle={`${asset.code} · ${asset.name}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEventOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvent} disabled={!event.description}>
              Guardar evento
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Tipo de evento">
            <Select value={event.type} onChange={(e) => setEvent({ ...event, type: e.target.value as AssetEventType })}>
              {(Object.keys(ASSET_EVENT_LABELS) as AssetEventType[]).map((t) => (
                <option key={t} value={t}>
                  {ASSET_EVENT_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción" required>
            <Textarea value={event.description} onChange={(e) => setEvent({ ...event, description: e.target.value })} placeholder="Qué se hizo, qué se encontró, qué se reemplazó…" />
          </Field>
          <Field label="Cost (USD)" hint="Déjalo en 0 si no aplica">
            <Input type="number" value={event.cost} onChange={(e) => setEvent({ ...event, cost: Number(e.target.value) })} />
          </Field>
          <ImageUpload value={event.photoUrl} onChange={(v) => setEvent({ ...event, photoUrl: v })} label="Foto de evidencia" hint="Opcional — útil para daños y reparaciones" />
        </div>
      </Modal>

      {/* Modal ticket */}
      <Modal
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        title="Reportar daño"
        subtitle={`Se creará un ticket de mantenimiento asociado a ${asset.code}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTicketOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveTicket} disabled={!ticket.title}>
              Create ticket
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Título" required>
            <Input value={ticket.title} onChange={(e) => setTicket({ ...ticket, title: e.target.value })} placeholder="Delaminación en el canto derecho" />
          </Field>
          <Field label="Descripción">
            <Textarea value={ticket.description} onChange={(e) => setTicket({ ...ticket, description: e.target.value })} />
          </Field>
          <Field label="Prioridad">
            <Select value={ticket.priority} onChange={(e) => setTicket({ ...ticket, priority: e.target.value as TicketPriority })}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ticket.blocksAsset} onChange={(e) => setTicket({ ...ticket, blocksAsset: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-lagoon-600" />
            Bloquear el activo (no se puede rentar hasta resolver)
          </label>
        </div>
      </Modal>

      <p className="sr-only">{num(events.length)} eventos</p>
    </div>
  );
}
