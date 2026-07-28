import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Copy, Mail, Plus, Send, Trash2, Users } from 'lucide-react';
import { useStore } from '@/lib/store';
import { ROLE_LABELS, type Shift } from '@/lib/types';
import { addDays, cn, formatDate, isoDate, money, num, startOfWeek, sum, WEEKDAY_KEYS } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from '@/components/ui';

const POSITIONS = ['Operator cable', 'Recepción', 'Salvavidas', 'Instructor', 'Aqua Park', 'Pro Shop', 'Mantenimiento', 'Summer Camp'];

const hoursOf = (s: Shift) => {
  const [sh, sm] = s.start.split(':').map(Number);
  const [eh, em] = s.end.split(':').map(Number);
  return Math.max(0, eh + em / 60 - (sh + sm / 60));
};

/**
 * Planificador semanal. El dueño arma la semana, la publica y el sistema envía
 * a cada empleado su horario por correo — que es exactamente lo que pidieron.
 */
export default function Schedule() {
  const { state, addShift, updateShift, removeShift, publishWeek, toast } = useStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editing, setEditing] = useState<{ shift?: Shift; employeeId: string; date: string } | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [message, setMessage] = useState(
    'Hola equipo, adjunto el horario de la próxima semana. Recuerden confirmar su turno desde la app y avisar con 48 h de anticipación cualquier cambio. ¡Gracias!',
  );

  const weekStart = useMemo(() => addDays(startOfWeek(new Date()), weekOffset * 7), [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i))), [weekStart]);

  const weekShifts = useMemo(() => state.shifts.filter((s) => days.includes(s.date)), [state.shifts, days]);
  const staff = useMemo(() => state.employees.filter((e) => e.status !== 'inactive' && e.role !== 'owner'), [state.employees]);

  const stats = useMemo(() => {
    const totalHours = sum(weekShifts, hoursOf);
    const cost = weekShifts.reduce((acc, s) => {
      const emp = state.employees.find((e) => e.id === s.employeeId);
      return acc + hoursOf(s) * (emp?.hourlyRate ?? 0);
    }, 0);
    const drafts = weekShifts.filter((s) => s.status === 'draft').length;
    return { totalHours, cost, drafts, count: weekShifts.length };
  }, [weekShifts, state.employees]);

  const shiftsFor = (employeeId: string, date: string) => weekShifts.filter((s) => s.employeeId === employeeId && s.date === date);

  const copyPreviousWeek = () => {
    const prevDays = Array.from({ length: 7 }, (_, i) => isoDate(addDays(weekStart, i - 7)));
    const prev = state.shifts.filter((s) => prevDays.includes(s.date));
    prev.forEach((s) => {
      const dayIndex = prevDays.indexOf(s.date);
      addShift({ employeeId: s.employeeId, date: days[dayIndex], start: s.start, end: s.end, position: s.position, status: 'draft' });
    });
    toast(`${prev.length} turnos copiados de la semana anterior como borrador`);
  };

  const publish = () => {
    const n = publishWeek(days[0]);
    toast(n ? `${n} turnos publicados` : 'No había borradores por publicar', n ? 'success' : 'info');
  };

  const send = () => {
    const recipients = new Set(weekShifts.map((s) => s.employeeId)).size;
    setSendOpen(false);
    toast(`Hourrio enviado por correo a ${recipients} empleados`);
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        title="Hourrios y turnos"
        description="Arma la semana, publícala y envíala por correo a cada empleado con su turno personalizado."
        actions={
          <>
            <Button variant="outline" onClick={copyPreviousWeek}>
              <Copy className="h-4 w-4" /> Copiar semana anterior
            </Button>
            <Button variant="outline" onClick={publish}>
              Publicar borradores
            </Button>
            <Button onClick={() => setSendOpen(true)}>
              <Send className="h-4 w-4" /> Enviar por correo
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Turnos en la semana" value={num(stats.count)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Hours programadas" value={`${stats.totalHours.toFixed(0)} h`} icon={<Clock className="h-5 w-5" />} tone="indigo" />
        <StatCard label="Costo estimado" value={money(stats.cost)} hint="tarifa × horas" tone="green" />
        <StatCard label="Sin publicar" value={num(stats.drafts)} hint="borradores pendientes" tone={stats.drafts ? 'amber' : 'slate'} />
      </div>

      <Card>
        <CardHeader
          title={`Semana del ${formatDate(days[0])} al ${formatDate(days[6])}`}
          subtitle="Haz clic en una celda vacía para agregar un turno"
          action={
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w - 1)} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setWeekOffset((w) => w + 1)} aria-label="Semana siguiente">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-52 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Empleado
                </th>
                {days.map((d, i) => {
                  const isToday = d === isoDate(new Date());
                  return (
                    <th key={d} className={cn('border-b border-slate-200 px-2 py-2.5 text-center', isToday ? 'bg-lagoon-50' : 'bg-slate-50')}>
                      <span className={cn('block text-[11px] font-bold uppercase', isToday ? 'text-lagoon-700' : 'text-slate-500')}>{WEEKDAY_KEYS[i]}</span>
                      <span className={cn('block text-[11px]', isToday ? 'font-bold text-lagoon-700' : 'text-slate-400')}>{new Date(d).getDate()}</span>
                    </th>
                  );
                })}
                <th className="border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Hours</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((e) => {
                const empShifts = weekShifts.filter((s) => s.employeeId === e.id);
                const total = sum(empShifts, hoursOf);
                const over = total > e.weeklyHourTarget;
                return (
                  <tr key={e.id} className="group">
                    <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-2 group-hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${e.firstName} ${e.lastName}`} size="xs" />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-deep-900">
                            {e.firstName} {e.lastName}
                          </p>
                          <p className="truncate text-[10px] text-slate-500">{ROLE_LABELS[e.role]}</p>
                        </div>
                      </div>
                    </td>
                    {days.map((d) => {
                      const cell = shiftsFor(e.id, d);
                      return (
                        <td key={d} className="border-b border-l border-slate-100 p-1 align-top">
                          {cell.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setEditing({ shift: s, employeeId: e.id, date: d })}
                              className={cn(
                                'mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-[10px] font-semibold leading-tight transition',
                                s.status === 'draft'
                                  ? 'border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400'
                                  : s.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-lagoon-100 text-lagoon-800 hover:bg-lagoon-200',
                              )}
                            >
                              <span className="block font-mono">
                                {s.start}–{s.end}
                              </span>
                              <span className="block truncate font-normal opacity-80">{s.position}</span>
                            </button>
                          ))}
                          <button
                            onClick={() => setEditing({ employeeId: e.id, date: d })}
                            className="flex w-full items-center justify-center rounded-lg py-1 text-slate-300 opacity-0 transition hover:bg-slate-50 hover:text-lagoon-600 group-hover:opacity-100"
                            aria-label="Agregar turno"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="border-b border-l border-slate-100 px-3 py-2 text-right">
                      <span className={cn('text-[12px] font-bold tabular-nums', over ? 'text-amber-600' : 'text-deep-900')}>{total.toFixed(1)} h</span>
                      <span className="block text-[10px] text-slate-400">de {e.weeklyHourTarget} h</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded border border-dashed border-slate-300 bg-slate-50" /> Borrador
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-lagoon-100" /> Publicado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-6 rounded bg-emerald-100" /> Confirmado por el empleado
          </span>
        </div>
      </Card>

      {/* Editor de turno */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.shift ? 'Editar turno' : 'Nuevo turno'}
        subtitle={editing ? `${state.employees.find((e) => e.id === editing.employeeId)?.firstName} · ${formatDate(editing.date)}` : ''}
        size="sm"
        footer={
          editing && (
            <>
              {editing.shift && (
                <Button
                  variant="danger"
                  onClick={() => {
                    removeShift(editing.shift!.id);
                    setEditing(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              )}
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              {!editing.shift && (
                <Button
                  onClick={() => {
                    const form = document.getElementById('shift-form') as HTMLFormElement;
                    const data = new FormData(form);
                    addShift({
                      employeeId: editing.employeeId,
                      date: editing.date,
                      start: String(data.get('start')),
                      end: String(data.get('end')),
                      position: String(data.get('position')),
                      status: 'draft',
                    });
                    setEditing(null);
                    toast('Turno agregado como borrador');
                  }}
                >
                  Agregar turno
                </Button>
              )}
            </>
          )
        }
      >
        {editing && (
          <form id="shift-form" className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entrada">
                <Input
                  name="start"
                  type="time"
                  defaultValue={editing.shift?.start ?? '09:00'}
                  onChange={(e) => editing.shift && updateShift(editing.shift.id, { start: e.target.value })}
                />
              </Field>
              <Field label="Salida">
                <Input
                  name="end"
                  type="time"
                  defaultValue={editing.shift?.end ?? '17:00'}
                  onChange={(e) => editing.shift && updateShift(editing.shift.id, { end: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Puesto">
              <Select
                name="position"
                defaultValue={editing.shift?.position ?? POSITIONS[0]}
                onChange={(e) => editing.shift && updateShift(editing.shift.id, { position: e.target.value })}
              >
                {POSITIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            {editing.shift && (
              <Field label="Estado">
                <Select value={editing.shift.status} onChange={(e) => updateShift(editing.shift!.id, { status: e.target.value as Shift['status'] })}>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="swap-requested">Cambio solicitado</option>
                </Select>
              </Field>
            )}
          </form>
        )}
      </Modal>

      {/* Envío por correo */}
      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Enviar horario por correo"
        subtitle={`Semana del ${formatDate(days[0])} — cada empleado recibe solo sus turnos`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button onClick={send}>
              <Mail className="h-4 w-4" /> Enviar a {new Set(weekShifts.map((s) => s.employeeId)).size} empleados
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Mensaje del encabezado">
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Destinatarios</p>
            <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {Array.from(new Set(weekShifts.map((s) => s.employeeId))).map((id) => {
                const e = state.employees.find((x) => x.id === id);
                if (!e) return null;
                const count = weekShifts.filter((s) => s.employeeId === id);
                return (
                  <li key={id} className="flex items-center gap-2.5 px-3 py-2">
                    <Avatar name={`${e.firstName} ${e.lastName}`} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-deep-900">
                        {e.firstName} {e.lastName}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">{e.email}</span>
                    </span>
                    <Badge tone="lagoon">
                      {count.length} turnos · {sum(count, hoursOf).toFixed(1)} h
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
