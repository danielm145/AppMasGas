import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  HeartPulse,
  Mail,
  Phone,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { useStore } from '@/lib/store';
import { SWIM_LEVEL_LABELS } from '@/lib/types';
import { age, cn, formatDate, money, num } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Table, Td, Th, Tr } from '@/components/ui';

export default function CamperDetail() {
  const { id } = useParams();
  const { state, updateCamper } = useStore();

  const camper = state.campers.find((c) => c.id === id);
  const attendance = useMemo(
    () => state.campAttendance.filter((a) => a.camperId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [state.campAttendance, id],
  );

  if (!camper) {
    return (
      <EmptyState
        title="Camper not found"
        action={
          <Link to="/summer-camp">
            <Button size="sm">Back to Summer Camp</Button>
          </Link>
        }
      />
    );
  }

  const sessions = state.campSessions.filter((s) => camper.sessionIds.includes(s.id));
  const hasMedicalAlert = camper.medical.epipen || camper.medical.allergies !== 'Ninguna' || camper.medical.conditions !== 'Ninguna';

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link to="/summer-camp" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-deep-900">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Summer Camp
      </Link>

      <Card className="mb-5 overflow-hidden">
        <div className="wave-bg h-20" />
        <div className="px-6 pb-5">
          <div className="-mt-9 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar name={`${camper.firstName} ${camper.lastName}`} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-deep-900">
                  {camper.firstName} {camper.lastName}
                </h1>
                <p className="text-sm text-slate-500">
                  {camper.camperCode} · {age(camper.dob)} años · Grupo {camper.groupName} · Talla {camper.tShirtSize}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {!camper.waiverSigned && (
                <Button onClick={() => updateCamper(camper.id, { waiverSigned: true })}>
                  <ShieldCheck className="h-4 w-4" /> Marcar waiver firmado
                </Button>
              )}
              {camper.balanceDue > 0 && (
                <Button variant="outline" onClick={() => updateCamper(camper.id, { balanceDue: 0 })}>
                  Registrar pago de {money(camper.balanceDue)}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {camper.waiverSigned ? (
              <Badge tone="green" dot>
                Waiver firmado
              </Badge>
            ) : (
              <Badge tone="rose" dot>
                No waiver — no puede entrar al agua
              </Badge>
            )}
            <Badge tone={camper.medical.swimLevel === 'none' ? 'rose' : camper.medical.swimLevel === 'strong' ? 'green' : 'slate'}>
              Natación: {SWIM_LEVEL_LABELS[camper.medical.swimLevel]}
            </Badge>
            {camper.medical.epipen && <Badge tone="rose">Carries EpiPen</Badge>}
            <Badge tone={camper.photoRelease ? 'lagoon' : 'slate'}>
              {camper.photoRelease ? 'Autoriza fotos' : 'No autoriza fotos'}
            </Badge>
            {camper.balanceDue > 0 && <Badge tone="amber">Saldo {money(camper.balanceDue)}</Badge>}
          </div>
        </div>
      </Card>

      {/* Alerta médica destacada — lo primero que ve el instructor */}
      {hasMedicalAlert && (
        <Card className="mb-5 border-rose-200 bg-rose-50/50">
          <div className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-bold text-rose-900">Atención médica</p>
              <ul className="mt-1.5 space-y-1 text-xs text-rose-800">
                {camper.medical.allergies !== 'Ninguna' && (
                  <li>
                    <strong>Alergias:</strong> {camper.medical.allergies}
                    {camper.medical.epipen && ' — porta EpiPen, el supervisor debe conocer su ubicación'}
                  </li>
                )}
                {camper.medical.conditions !== 'Ninguna' && (
                  <li>
                    <strong>Condiciones:</strong> {camper.medical.conditions}
                  </li>
                )}
                {camper.medical.medications !== 'Ninguno' && (
                  <li>
                    <strong>Medicamentos:</strong> {camper.medical.medications}
                  </li>
                )}
                {camper.medical.swimLevel === 'none' && (
                  <li>
                    <strong>No sabe nadar</strong> — chaleco obligatorio en todo momento y supervisión 1:1 en el agua.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Tutores y contactos" icon={<Phone className="h-4 w-4" />} />
            <div className="divide-y divide-slate-100">
              {camper.guardians.map((g, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <Avatar name={g.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-deep-900">
                      {g.name} {g.isPrimary && <Badge tone="lagoon" className="ml-1">Principal</Badge>}
                    </p>
                    <p className="text-[11px] text-slate-500">{g.relation}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> {g.phone}
                      </span>
                      {g.email && (
                        <a href={`mailto:${g.email}`} className="flex items-center gap-1 text-lagoon-700 hover:underline">
                          <Mail className="h-3 w-3" /> {g.email}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {camper.emergencyContacts.map((e, i) => (
                <div key={`ec-${i}`} className="flex items-start gap-3 bg-amber-50/40 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-bold text-deep-900">{e.name}</p>
                    <p className="text-[11px] text-slate-500">
                      Emergencia · {e.relation} · {e.phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Autorizados para recoger"
              subtitle="Solo estas personas pueden llevarse al camper. Se verifica documento en la salida."
              icon={<UserCheck className="h-4 w-4" />}
            />
            <ul className="divide-y divide-slate-100">
              {camper.authorizedPickup.map((p, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-deep-900">{p.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {p.relation} · {p.phone}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">{p.idNumber}</span>
                </li>
              ))}
              {!camper.authorizedPickup.length && (
                <li className="px-5 py-6 text-center text-xs text-slate-400">
                  Sin personas autorizadas registradas — solo los tutores pueden recogerlo.
                </li>
              )}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Asistencia" subtitle={`${attendance.filter((a) => a.status === 'present').length} días presente`} />
            {attendance.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Check-in</Th>
                    <Th>Check-out</Th>
                    <Th>Picked up by</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <Tr key={a.id}>
                      <Td className="text-[12px]">{formatDate(a.date)}</Td>
                      <Td className="font-mono text-[12px]">{a.checkIn ?? '—'}</Td>
                      <Td className="font-mono text-[12px]">{a.checkOut ?? '—'}</Td>
                      <Td className="text-[12px] text-slate-600">{a.checkedOutBy ?? '—'}</Td>
                      <Td>
                        <Badge tone={a.status === 'present' ? 'green' : a.status === 'absent' ? 'rose' : 'amber'}>
                          {{ present: 'Presente', absent: 'Ausente', late: 'Tarde', 'early-pickup': 'Salida temprana' }[a.status]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState title="Sin registros de asistencia" />
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Credencial del camper" subtitle="Escaneable en entrada y salida" />
            <div className="flex justify-center p-5">
              <QrCode value={`mwc://camper/${camper.camperCode}`} label={camper.camperCode} size={140} caption="Agiliza el check-in matutino sin buscar por nombre." />
            </div>
          </Card>

          <Card>
            <CardHeader title="Ficha médica" icon={<HeartPulse className="h-4 w-4" />} />
            <dl className="divide-y divide-slate-100 text-sm">
              {[
                ['Alergias', camper.medical.allergies],
                ['Condiciones', camper.medical.conditions],
                ['Medicamentos', camper.medical.medications],
                ['Swim level', SWIM_LEVEL_LABELS[camper.medical.swimLevel]],
                ['Médico', camper.medical.doctorName],
                ['Phone médico', camper.medical.doctorPhone],
                ['Seguro', camper.medical.insurance],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 px-5 py-2.5">
                  <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                  <dd className="min-w-0 truncate text-right text-[13px] text-deep-900">{value || '—'}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-2.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EpiPen</dt>
                <dd>
                  {camper.medical.epipen ? (
                    <span className="flex items-center gap-1 text-[13px] font-bold text-rose-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Sí
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[13px] text-slate-400">
                      <XCircle className="h-3.5 w-3.5" /> No
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Semanas inscritas" subtitle={`${num(sessions.length)} semanas`} />
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <p className="text-[13px] font-semibold text-deep-900">{s.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(s.weekStart)} — {formatDate(s.weekEnd)} · {money(s.price)}
                  </p>
                </li>
              ))}
              {!sessions.length && <li className="px-5 py-6 text-center text-xs text-slate-400">Sin semanas asignadas</li>}
            </ul>
          </Card>

          {camper.notes && (
            <Card>
              <CardHeader title="Notas" />
              <p className={cn('px-5 py-4 text-sm leading-relaxed text-slate-600')}>{camper.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
