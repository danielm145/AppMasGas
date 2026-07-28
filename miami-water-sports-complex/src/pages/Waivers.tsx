import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FileSignature, Mail, QrCode as QrIcon, ShieldCheck } from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { useStore } from '@/lib/store';
import { WAIVER_LABELS, type WaiverType } from '@/lib/types';
import { cn, daysUntil, downloadCsv, formatDate, num } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui';

type View = 'vigentes' | 'por-vencer' | 'vencidos' | 'faltantes';

/**
 * Control de exoneraciones. Lo crítico aquí no es archivar: es saber, en el
 * momento del check-in, quién NO puede entrar al agua.
 */
export default function Waivers() {
  const { state, toast } = useStore();
  const [view, setView] = useState<View>('vigentes');
  const [query, setQuery] = useState('');
  const [kioskOpen, setKioskOpen] = useState(false);

  const enriched = useMemo(
    () =>
      state.waivers.map((w) => {
        const customer = state.customers.find((c) => c.id === w.customerId);
        return { ...w, customer, days: daysUntil(w.expiresAt) };
      }),
    [state.waivers, state.customers],
  );

  const withoutWaiver = useMemo(() => {
    const covered = new Set(
      state.waivers.filter((w) => w.type !== 'photo-release' && new Date(w.expiresAt) > new Date()).map((w) => w.customerId),
    );
    return state.customers.filter((c) => !covered.has(c.id));
  }, [state.waivers, state.customers]);

  const buckets = useMemo(
    () => ({
      vigentes: enriched.filter((w) => w.days > 30),
      'por-vencer': enriched.filter((w) => w.days > 0 && w.days <= 30),
      vencidos: enriched.filter((w) => w.days <= 0),
    }),
    [enriched],
  );

  const q = query.trim().toLowerCase();
  const rows = view === 'faltantes' ? [] : buckets[view].filter((w) => !q || `${w.signerName} ${w.customer?.email ?? ''}`.toLowerCase().includes(q));
  const missing = withoutWaiver.filter((c) => !q || `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q));

  const byType = useMemo(() => {
    const acc: Record<string, number> = {};
    state.waivers.forEach((w) => (acc[w.type] = (acc[w.type] ?? 0) + 1));
    return acc;
  }, [state.waivers]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Waivers y exoneraciones"
        description="Cada persona que entra al agua necesita un waiver vigente. Aquí se controla quién lo tiene, quién está por vencer y quién no puede entrar."
        actions={
          <>
            <Button variant="outline" onClick={() => setKioskOpen(true)}>
              <QrIcon className="h-4 w-4" /> Kiosco de firma
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  'waivers-mws.csv',
                  enriched.map((w) => ({
                    Firmante: w.signerName,
                    Tipo: WAIVER_LABELS[w.type],
                    Version: w.version,
                    Firmado: formatDate(w.signedAt),
                    Vence: formatDate(w.expiresAt),
                    DiasRestantes: w.days,
                    Menor: w.minor ? 'Sí' : 'No',
                    Tutor: w.guardianName ?? '',
                  })),
                )
              }
            >
              Export log
            </Button>
            <Link to="/check-in">
              <Button>
                <FileSignature className="h-4 w-4" /> Firmar nuevo
              </Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waivers vigentes" value={num(buckets.vigentes.length)} icon={<ShieldCheck className="h-5 w-5" />} tone="green" />
        <StatCard label="Vencen en 30 días" value={num(buckets['por-vencer'].length)} hint="enviar recordatorio" icon={<Mail className="h-5 w-5" />} tone="amber" />
        <StatCard label="Vencidos" value={num(buckets.vencidos.length)} hint="requieren nueva firma" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Customers sin waiver" value={num(withoutWaiver.length)} hint="cannot enter the water" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-4">
        {(Object.keys(WAIVER_LABELS) as WaiverType[]).map((t) => (
          <Card key={t} className="p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{WAIVER_LABELS[t]}</p>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-deep-900">{num(byType[t] ?? 0)}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Registro de firmas"
          subtitle="Todo waiver queda archivado con firma, fecha, versión del documento e IP"
          action={
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'vigentes', label: `Vigentes (${buckets.vigentes.length})` },
                { value: 'por-vencer', label: `Por vencer (${buckets['por-vencer'].length})` },
                { value: 'vencidos', label: `Vencidos (${buckets.vencidos.length})` },
                { value: 'faltantes', label: `No waiver (${withoutWaiver.length})` },
              ]}
            />
          }
        />
        <div className="border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre o correo…" className="max-w-sm" />
        </div>

        {view === 'faltantes' ? (
          missing.length ? (
            <Table>
              <thead>
                <tr>
                  <Th>Customer</Th>
                  <Th>Contact</Th>
                  <Th>Visits</Th>
                  <Th className="text-right">Acción</Th>
                </tr>
              </thead>
              <tbody>
                {missing.slice(0, 60).map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <Link to={`/customers/${c.id}`} className="flex items-center gap-3">
                        <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                        <span>
                          <span className="block font-semibold text-deep-900">
                            {c.firstName} {c.lastName}
                          </span>
                          <span className="block text-[11px] text-slate-500">{c.memberCode}</span>
                        </span>
                      </Link>
                    </Td>
                    <Td className="text-[12px] text-slate-600">{c.email}</Td>
                    <Td className="tabular-nums">{c.visits}</Td>
                    <Td className="text-right">
                      <Button size="sm" variant="outline" onClick={() => toast(`Enlace de firma enviado a ${c.email}`)}>
                        <Mail className="h-3.5 w-3.5" /> Enviar enlace
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Todos cubiertos" description="Cada cliente registrado tiene un waiver vigente." />
          )
        ) : rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Firmante</Th>
                <Th>Documento</Th>
                <Th>Signed</Th>
                <Th>Vence</Th>
                <Th>Firma</Th>
                <Th className="text-right">Acción</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 60).map((w) => (
                <Tr key={w.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={w.signerName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-deep-900">{w.signerName}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {w.customer?.email ?? '—'}
                          {w.minor && <span className="ml-1 font-semibold text-amber-600">· menor</span>}
                        </span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="block text-[12px] font-medium text-deep-900">{WAIVER_LABELS[w.type]}</span>
                    <span className="block text-[11px] text-slate-400">{w.version}</span>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{formatDate(w.signedAt)}</Td>
                  <Td>
                    <span className={cn('text-[12px] font-semibold', w.days <= 0 ? 'text-rose-600' : w.days <= 30 ? 'text-amber-600' : 'text-slate-600')}>
                      {formatDate(w.expiresAt)}
                    </span>
                    <span className="block text-[11px] text-slate-400">{w.days > 0 ? `en ${w.days} días` : `hace ${-w.days} días`}</span>
                  </Td>
                  <Td>
                    {w.signatureDataUrl ? (
                      <img src={w.signatureDataUrl} alt="Firma" className="h-8 w-20 rounded border border-slate-200 bg-white object-contain" />
                    ) : (
                      <Badge tone="slate">Firma digital</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    {w.days <= 30 && (
                      <Button size="sm" variant="outline" onClick={() => toast(`Recordatorio de renovación enviado a ${w.customer?.email ?? w.signerName}`)}>
                        Recordar
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Sin registros en esta vista" />
        )}
      </Card>

      <Modal open={kioskOpen} onClose={() => setKioskOpen(false)} title="Kiosco de firma digital" subtitle="Pega este QR en recepción — el cliente firma desde su propio teléfono" size="sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <QrCode value="https://waiver.miamiwatersports.com/firmar" size={200} caption="El waiver firmado entra directo al sistema y queda listo antes de que lleguen al mostrador." />
          <ul className="w-full space-y-2 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="font-bold text-lagoon-600">1.</span> El cliente escanea el QR con la cámara del teléfono.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-lagoon-600">2.</span> Llena sus datos, contacto de emergencia y firma en pantalla.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-lagoon-600">3.</span> Recepción solo confirma identidad y cobra: el waiver ya está.
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
