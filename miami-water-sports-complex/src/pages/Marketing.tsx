import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Mail, MessageSquare, MousePointerClick, Plus, Send, Users } from 'lucide-react';
import { RankedBars, ChartCard } from '@/components/charts';
import { useStore } from '@/lib/store';
import { segments as segmentDefs } from '@/data/seed';
import type { Campaign, CampaignChannel } from '@/lib/types';
import { cn, formatDate, money, num, pct, relativeTime } from '@/lib/utils';
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
  PageHeader,
  Select,
  StatCard,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
} from '@/components/ui';

const STATUS_META: Record<Campaign['status'], { label: string; tone: 'green' | 'lagoon' | 'amber' | 'slate' }> = {
  sent: { label: 'Enviada', tone: 'green' },
  sending: { label: 'Enviando', tone: 'lagoon' },
  scheduled: { label: 'Programada', tone: 'amber' },
  draft: { label: 'Borrador', tone: 'slate' },
  paused: { label: 'Pausada', tone: 'slate' },
};

/**
 * CRM y postventa. Los segmentos se calculan sobre los datos reales de visita y
 * gasto — no hay listas manuales que se desactualicen.
 */
export default function Marketing() {
  const { state, addCampaign, updateCampaign, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Campaign | null>(null);
  const [draft, setDraft] = useState({
    name: '',
    channel: 'email' as CampaignChannel,
    segmentId: segmentDefs[0].id,
    subject: '',
    body: '',
  });

  const segmentSizes = useMemo(
    () => segmentDefs.map((s) => ({ ...s, count: state.customers.filter((c) => s.match(c) && (c.marketingOptIn || c.smsOptIn)).length })),
    [state.customers],
  );

  const stats = useMemo(() => {
    const sent = state.campaigns.filter((c) => c.status === 'sent' || c.status === 'sending');
    const recipients = sent.reduce((a, c) => a + c.recipients, 0);
    const opened = sent.reduce((a, c) => a + c.opened, 0);
    const clicked = sent.reduce((a, c) => a + c.clicked, 0);
    const revenue = sent.reduce((a, c) => a + c.revenue, 0);
    return {
      recipients,
      openRate: recipients ? opened / recipients : 0,
      clickRate: opened ? clicked / opened : 0,
      revenue,
      reachable: state.customers.filter((c) => c.marketingOptIn).length,
    };
  }, [state.campaigns, state.customers]);

  const revenueByCampaign = useMemo(
    () =>
      [...state.campaigns]
        .filter((c) => c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .map((c) => ({ label: c.name, value: c.revenue })),
    [state.campaigns],
  );

  const submit = () => {
    if (!draft.name) return;
    const segment = segmentSizes.find((s) => s.id === draft.segmentId);
    addCampaign({
      name: draft.name,
      channel: draft.channel,
      segmentId: draft.segmentId,
      status: 'draft',
      subject: draft.subject,
      preview: draft.body.slice(0, 120),
      recipients: segment?.count ?? 0,
      opened: 0,
      clicked: 0,
      revenue: 0,
    });
    setDraft({ name: '', channel: 'email', segmentId: segmentDefs[0].id, subject: '', body: '' });
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Marketing y postventa"
        description="Los datos que se capturan en el check-in y en el Summer Camp se convierten aquí en campañas segmentadas."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva campaña
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Base contactable" value={num(stats.reachable)} hint="con opt-in de correo" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Tasa de apertura" value={pct(stats.openRate)} hint={`${num(stats.recipients)} envíos`} icon={<Mail className="h-5 w-5" />} tone="lagoon" />
        <StatCard label="Clics sobre aperturas" value={pct(stats.clickRate)} icon={<MousePointerClick className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Ingreso atribuido" value={money(stats.revenue)} hint="ventas desde campañas" icon={<DollarSign className="h-5 w-5" />} tone="green" />
      </div>

      <Tabs defaultValue="campanas">
        <TabList className="mb-4">
          <Tab value="campanas" count={state.campaigns.length}>
            Campañas
          </Tab>
          <Tab value="segmentos" count={segmentDefs.length}>
            Segmentos
          </Tab>
          <Tab value="automatizaciones">Automatizaciones</Tab>
        </TabList>

        <TabPanel value="campanas">
          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <ChartCard
              title="Ingreso por campaña"
              subtitle="Atribución directa a los 30 días del envío"
              className="lg:col-span-1"
              height={220}
              tableHeaders={['Campaña', 'Ingreso']}
              tableRows={revenueByCampaign.map((r) => [r.label, money(r.value)])}
            >
              <RankedBars data={revenueByCampaign} currency />
            </ChartCard>

            <Card className="lg:col-span-2">
              <CardHeader title="Historial de campañas" subtitle="Haz clic en una para ver el contenido y sus métricas" />
              <ul className="divide-y divide-slate-100">
                {state.campaigns.map((c) => {
                  const segment = segmentDefs.find((s) => s.id === c.segmentId);
                  return (
                    <li key={c.id}>
                      <button onClick={() => setPreview(c)} className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-lagoon-50/40">
                        <span
                          className={cn(
                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                            c.channel === 'email' ? 'bg-lagoon-50 text-lagoon-600' : 'bg-indigo-50 text-indigo-600',
                          )}
                        >
                          {c.channel === 'email' ? <Mail className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[13px] font-bold text-deep-900">{c.name}</p>
                            <Badge tone={STATUS_META[c.status].tone} dot>
                              {STATUS_META[c.status].label}
                            </Badge>
                          </div>
                          <p className="truncate text-[11px] text-slate-500">
                            {segment?.name} · {num(c.recipients)} destinatarios
                            {c.sentAt && ` · enviada ${relativeTime(c.sentAt)}`}
                            {c.scheduledAt && ` · programada para ${formatDate(c.scheduledAt)}`}
                          </p>
                        </div>
                        {c.recipients > 0 && (
                          <div className="hidden shrink-0 gap-4 text-right sm:flex">
                            <div>
                              <p className="text-[13px] font-bold tabular-nums text-deep-900">{pct(c.opened / Math.max(1, c.recipients))}</p>
                              <p className="text-[10px] text-slate-400">apertura</p>
                            </div>
                            <div>
                              <p className="text-[13px] font-bold tabular-nums text-emerald-600">{money(c.revenue)}</p>
                              <p className="text-[10px] text-slate-400">ingreso</p>
                            </div>
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="segmentos">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {segmentSizes.map((s) => {
              const sample = state.customers.filter((c) => s.match(c)).slice(0, 5);
              return (
                <Card key={s.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge className={s.color}>{s.name}</Badge>
                      <p className="mt-2 text-3xl font-extrabold tabular-nums text-deep-900">{num(s.count)}</p>
                      <p className="text-[11px] text-slate-500">{s.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex -space-x-2">
                    {sample.map((c) => (
                      <Link key={c.id} to={`/customers/${c.id}`} title={`${c.firstName} ${c.lastName}`}>
                        <Avatar name={`${c.firstName} ${c.lastName}`} size="xs" />
                      </Link>
                    ))}
                    {s.count > 5 && (
                      <span className="flex h-6 items-center rounded-full bg-slate-100 px-2 text-[10px] font-bold text-slate-500 ring-2 ring-white">
                        +{s.count - 5}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => {
                      setDraft({ ...draft, segmentId: s.id, name: `Campaña — ${s.name}` });
                      setOpen(true);
                    }}
                  >
                    Crear campaña para este segmento
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel value="automatizaciones">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Bienvenida', 'Se dispara 1 hora después del primer check-in', 'Tips de primera vez, cómo funciona el cable y bono de 100 pts.', true],
              ['Reactivación 60 días', 'Cliente sin visitar hace 60 días', 'Descuento del 20% con vigencia de 2 semanas.', true],
              ['Cumpleaños', '7 días antes del cumpleaños', 'Hour de cable gratis en el mes de cumpleaños.', true],
              ['Post-visita / NPS', '3 horas después de cerrar la sesión', '“¿Cómo estuvo tu día?” + enlace a reseña de Google.', true],
              ['Renovación de waiver', '30 días antes del vencimiento', 'Enlace para firmar desde el teléfono antes de llegar.', true],
              ['Fin de Summer Camp', 'Último día de la semana de camp', 'Fotos de la semana + oferta de la siguiente semana.', false],
              ['Carrito de reserva abandonado', 'Reserva iniciada sin pagar en 24 h', 'Recordatorio con enlace directo al pago.', false],
              ['Alerta de nivel alcanzado', 'Al subir de nivel de lealtad', 'Felicitación + beneficios desbloqueados.', true],
            ].map(([name, trigger, content, active]) => (
              <Card key={String(name)} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-deep-900">{name as string}</p>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-lagoon-600">{trigger as string}</p>
                    <p className="mt-1.5 text-xs text-slate-500">{content as string}</p>
                  </div>
                  <Badge tone={active ? 'green' : 'slate'} dot>
                    {active ? 'Activa' : 'Sugerida'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </TabPanel>
      </Tabs>

      {/* Nueva campaña */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva campaña"
        subtitle="Se guarda como borrador; puedes programarla o enviarla después"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!draft.name}>
              Crear campaña
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Nombre interno" required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Reactivación de verano" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Canal">
              <Select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as CampaignChannel })}>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Notificación push</option>
              </Select>
            </Field>
            <Field label="Segmento" hint={`${segmentSizes.find((s) => s.id === draft.segmentId)?.count ?? 0} destinatarios con opt-in`}>
              <Select value={draft.segmentId} onChange={(e) => setDraft({ ...draft, segmentId: e.target.value })}>
                {segmentSizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.count})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {draft.channel === 'email' && (
            <Field label="Asunto">
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Te extrañamos en el cable 🌊" />
            </Field>
          )}
          <Field label="Contenido">
            <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Escribe el mensaje…" />
          </Field>
        </div>
      </Modal>

      {/* Vista previa */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ''}
        subtitle={preview ? `${preview.channel === 'email' ? 'Email' : 'SMS'} · ${segmentDefs.find((s) => s.id === preview.segmentId)?.name}` : ''}
        footer={
          preview && (
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>
                Cerrar
              </Button>
              {(preview.status === 'draft' || preview.status === 'scheduled') && (
                <Button
                  onClick={() => {
                    updateCampaign(preview.id, { status: 'sending', sentAt: new Date().toISOString() });
                    toast(`Campaña "${preview.name}" en envío a ${num(preview.recipients)} destinatarios`);
                    setPreview(null);
                  }}
                >
                  <Send className="h-4 w-4" /> Enviar ahora
                </Button>
              )}
            </>
          )
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Destinatarios', num(preview.recipients)],
                ['Aperturas', `${num(preview.opened)} (${pct(preview.opened / Math.max(1, preview.recipients))})`],
                ['Clics', `${num(preview.clicked)} (${pct(preview.clicked / Math.max(1, preview.opened))})`],
                ['Ingreso', money(preview.revenue)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-0.5 text-sm font-extrabold tabular-nums text-deep-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-lagoon-600">Miami Water Sports Complex</p>
              {preview.subject && <p className="mt-1 text-lg font-extrabold text-deep-900">{preview.subject}</p>}
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{preview.preview}</p>
              <Button size="sm" className="mt-4">
                Reservar mi hora
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {!state.campaigns.length && <EmptyState title="Sin campañas" description="Crea la primera desde el botón superior." />}
    </div>
  );
}
