import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, CalendarDays, Mail, Phone, Plus, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ROLE_LABELS, type Employee, type Role } from '@/lib/types';
import { cn, daysUntil, formatDate, money, num } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
} from '@/components/ui';

const EMPTY = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'operator' as Role,
  hireDate: new Date().toISOString().slice(0, 10),
  hourlyRate: 18,
  weeklyHourTarget: 30,
  ecName: '',
  ecPhone: '',
  ecRelation: 'Madre',
};

export default function Employees() {
  const { state, addEmployee, updateEmployee, toast } = useStore();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Employee | null>(null);
  const [draft, setDraft] = useState(EMPTY);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.employees.filter((e) => {
      if (q && !`${e.firstName} ${e.lastName} ${e.email} ${e.phone}`.toLowerCase().includes(q)) return false;
      if (role !== 'all' && e.role !== role) return false;
      return true;
    });
  }, [state.employees, query, role]);

  const expiringCerts = useMemo(
    () =>
      state.employees.flatMap((e) =>
        e.certifications.filter((c) => daysUntil(c.expiresAt) <= 60).map((c) => ({ employee: e, cert: c })),
      ),
    [state.employees],
  );

  const payroll = state.employees
    .filter((e) => e.status !== 'inactive')
    .reduce((a, e) => a + e.hourlyRate * e.weeklyHourTarget, 0);

  const submit = () => {
    if (!draft.firstName || !draft.lastName || !draft.email) {
      toast('First name, last name and email are required', 'error');
      return;
    }
    addEmployee({
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      role: draft.role,
      hireDate: draft.hireDate,
      status: 'active',
      hourlyRate: draft.hourlyRate,
      weeklyHourTarget: draft.weeklyHourTarget,
      certifications: [],
      emergencyContact: { name: draft.ecName, relation: draft.ecRelation, phone: draft.ecPhone },
    });
    setDraft(EMPTY);
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Empleados"
        description="Equipo del parque, certificaciones vigentes y datos de contacto para emergencias."
        actions={
          <>
            <Link to="/schedule">
              <Button variant="outline">
                <CalendarDays className="h-4 w-4" /> Ver horarios
              </Button>
            </Link>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Nuevo empleado
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Equipo activo" value={num(state.employees.filter((e) => e.status !== 'inactive').length)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Temporada" value={num(state.employees.filter((e) => e.status === 'seasonal').length)} hint="contratación estacional" tone="indigo" />
        <StatCard label="Nómina semanal estimada" value={money(payroll)} hint="según horas objetivo" tone="green" />
        <StatCard
          label="Certificaciones por vencer"
          value={num(expiringCerts.length)}
          hint="en los próximos 60 días"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone={expiringCerts.length ? 'rose' : 'slate'}
        />
      </div>

      {expiringCerts.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900">Certificaciones que requieren renovación</p>
              <ul className="mt-1.5 space-y-1">
                {expiringCerts.slice(0, 4).map(({ employee, cert }, i) => (
                  <li key={i} className="text-xs text-amber-800">
                    <span className="font-semibold">
                      {employee.firstName} {employee.lastName}
                    </span>{' '}
                    — {cert.name}{' '}
                    <span className={cn('font-semibold', daysUntil(cert.expiresAt) < 0 ? 'text-rose-700' : '')}>
                      {daysUntil(cert.expiresAt) < 0 ? `expired hace ${-daysUntil(cert.expiresAt)} días` : `vence en ${daysUntil(cert.expiresAt)} días`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Nombre, correo o teléfono…" className="min-w-[240px] max-w-sm flex-1" />
        <Select value={role} onChange={(e) => setRole(e.target.value as Role | 'all')} className="w-auto min-w-[180px]">
          <option value="all">All roles</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      {rows.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((e) => (
            <Card key={e.id} className="flex flex-col p-5 transition hover:border-lagoon-300 hover:shadow-pop">
              <div className="flex items-start gap-3">
                <Avatar name={`${e.firstName} ${e.lastName}`} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-deep-900">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[e.role]}</p>
                  <Badge tone={e.status === 'active' ? 'green' : e.status === 'seasonal' ? 'indigo' : 'slate'} className="mt-1.5">
                    {e.status === 'active' ? 'Activo' : e.status === 'seasonal' ? 'Temporada' : 'Inactivo'}
                  </Badge>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs">
                <li className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{e.email}</span>
                </li>
                <li className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {e.phone}
                </li>
              </ul>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-center">
                <div>
                  <p className="text-sm font-extrabold tabular-nums text-deep-900">{money(e.hourlyRate)}</p>
                  <p className="text-[10px] font-semibold uppercase text-slate-500">por hora</p>
                </div>
                <div>
                  <p className="text-sm font-extrabold tabular-nums text-deep-900">{e.weeklyHourTarget} h</p>
                  <p className="text-[10px] font-semibold uppercase text-slate-500">objetivo/sem</p>
                </div>
              </div>

              {e.certifications.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Certificaciones</p>
                  <ul className="space-y-1">
                    {e.certifications.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px]">
                        <BadgeCheck className={cn('mt-0.5 h-3 w-3 shrink-0', daysUntil(c.expiresAt) < 60 ? 'text-amber-500' : 'text-emerald-500')} />
                        <span className="min-w-0 flex-1 truncate text-slate-600">{c.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setDetail(e)}>
                Ver / editar
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Users className="h-6 w-6" />} title="Sin empleados" description="Ajusta la búsqueda o agrega uno nuevo." />
      )}

      {/* Alta */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo empleado"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Agregar al equipo</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" required>
            <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          </Field>
          <Field label="Last name" required>
            <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          </Field>
          <Field label="Email" required hint="A esta dirección llegan los horarios publicados">
            <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </Field>
          <Field label="Rol">
            <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date de ingreso">
            <Input type="date" value={draft.hireDate} onChange={(e) => setDraft({ ...draft, hireDate: e.target.value })} />
          </Field>
          <Field label="Tarifa por hora (USD)">
            <Input type="number" value={draft.hourlyRate} onChange={(e) => setDraft({ ...draft, hourlyRate: Number(e.target.value) })} />
          </Field>
          <Field label="Hours objetivo per week">
            <Input type="number" value={draft.weeklyHourTarget} onChange={(e) => setDraft({ ...draft, weeklyHourTarget: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Emergency contact</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="First name">
                <Input value={draft.ecName} onChange={(e) => setDraft({ ...draft, ecName: e.target.value })} />
              </Field>
              <Field label="Relationship">
                <Input value={draft.ecRelation} onChange={(e) => setDraft({ ...draft, ecRelation: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={draft.ecPhone} onChange={(e) => setDraft({ ...draft, ecPhone: e.target.value })} />
              </Field>
            </div>
          </div>
        </div>
      </Modal>

      {/* Detalle */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.firstName} ${detail.lastName}` : ''}
        subtitle={detail ? `${ROLE_LABELS[detail.role]} · desde ${formatDate(detail.hireDate)}` : ''}
        footer={
          <Button variant="ghost" onClick={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rol">
              <Select value={detail.role} onChange={(e) => updateEmployee(detail.id, { role: e.target.value as Role })}>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={detail.status} onChange={(e) => updateEmployee(detail.id, { status: e.target.value as Employee['status'] })}>
                <option value="active">Active</option>
                <option value="seasonal">Temporada</option>
                <option value="inactive">Inactivo</option>
              </Select>
            </Field>
            <Field label="Email">
              <Input value={detail.email} onChange={(e) => updateEmployee(detail.id, { email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={detail.phone} onChange={(e) => updateEmployee(detail.id, { phone: e.target.value })} />
            </Field>
            <Field label="Tarifa por hora">
              <Input type="number" value={detail.hourlyRate} onChange={(e) => updateEmployee(detail.id, { hourlyRate: Number(e.target.value) })} />
            </Field>
            <Field label="Hours objetivo / semana">
              <Input type="number" value={detail.weeklyHourTarget} onChange={(e) => updateEmployee(detail.id, { weeklyHourTarget: Number(e.target.value) })} />
            </Field>

            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Certificaciones</p>
              {detail.certifications.length ? (
                <ul className="space-y-2">
                  {detail.certifications.map((c, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-sm text-deep-900">{c.name}</span>
                      <Badge tone={daysUntil(c.expiresAt) < 0 ? 'rose' : daysUntil(c.expiresAt) < 60 ? 'amber' : 'green'}>
                        vence {formatDate(c.expiresAt)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Sin certificaciones registradas.</p>
              )}
            </div>

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">Emergency contact</p>
              <p className="text-sm font-semibold text-deep-900">{detail.emergencyContact.name || '—'}</p>
              <p className="text-xs text-slate-500">
                {detail.emergencyContact.relation} · {detail.emergencyContact.phone}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
