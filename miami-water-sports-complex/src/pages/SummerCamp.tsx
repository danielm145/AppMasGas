import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Download,
  HeartPulse,
  LogIn,
  LogOut,
  Plus,
  Sun,
  Users,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { SWIM_LEVEL_LABELS, type Camper, type SwimLevel } from '@/lib/types';
import { age, cn, downloadCsv, formatDate, isoDate, money, num, pct } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  ProgressBar,
  SearchInput,
  Select,
  StatCard,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Td,
  Th,
  Textarea,
  Tr,
} from '@/components/ui';

const EMPTY: {
  firstName: string;
  lastName: string;
  dob: string;
  sessionId: string;
  groupName: string;
  tShirtSize: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
  ecName: string;
  ecRelation: string;
  ecPhone: string;
  pickupName: string;
  pickupRelation: string;
  pickupPhone: string;
  pickupId: string;
  allergies: string;
  conditions: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
  insurance: string;
  swimLevel: SwimLevel;
  epipen: boolean;
  photoRelease: boolean;
  notes: string;
} = {
  firstName: '',
  lastName: '',
  dob: '',
  sessionId: '',
  groupName: 'Dolphins',
  tShirtSize: 'YM',
  guardianName: '',
  guardianRelation: 'Madre',
  guardianPhone: '',
  guardianEmail: '',
  ecName: '',
  ecRelation: 'Abuela',
  ecPhone: '',
  pickupName: '',
  pickupRelation: 'Tía',
  pickupPhone: '',
  pickupId: '',
  allergies: 'Ninguna',
  conditions: 'Ninguna',
  medications: 'Ninguno',
  doctorName: '',
  doctorPhone: '',
  insurance: '',
  swimLevel: 'beginner',
  epipen: false,
  photoRelease: true,
  notes: '',
};

/**
 * Summer Camp: inscripción de niños con toda la información médica, de contacto
 * y de recogida autorizada, más el control diario de asistencia y actividades.
 */
export default function SummerCamp() {
  const { state, addCamper, markAttendance, toast } = useStore();
  const [query, setQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [pickupFor, setPickupFor] = useState<Camper | null>(null);
  const [draft, setDraft] = useState(EMPTY);

  const today = isoDate(new Date());
  const todayAttendance = useMemo(() => state.campAttendance.filter((a) => a.date === today), [state.campAttendance, today]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.campers.filter((c) => {
      if (q && !`${c.firstName} ${c.lastName} ${c.camperCode} ${c.groupName}`.toLowerCase().includes(q)) return false;
      if (sessionFilter !== 'all' && !c.sessionIds.includes(sessionFilter)) return false;
      return true;
    });
  }, [state.campers, query, sessionFilter]);

  const stats = useMemo(() => {
    const present = todayAttendance.filter((a) => a.checkIn && !a.checkOut).length;
    const pendingWaiver = state.campers.filter((c) => !c.waiverSigned).length;
    const balance = state.campers.reduce((a, c) => a + c.balanceDue, 0);
    const medical = state.campers.filter((c) => c.medical.epipen || (c.medical.allergies !== 'Ninguna' && c.medical.allergies)).length;
    return { total: state.campers.length, present, pendingWaiver, balance, medical };
  }, [state.campers, todayAttendance]);

  const alerts = useMemo(
    () => ({
      noWaiver: state.campers.filter((c) => !c.waiverSigned),
      epipen: state.campers.filter((c) => c.medical.epipen),
      nonSwimmers: state.campers.filter((c) => c.medical.swimLevel === 'none'),
    }),
    [state.campers],
  );

  const submit = () => {
    if (!draft.firstName || !draft.lastName || !draft.guardianName || !draft.guardianPhone) {
      toast('Child name and primary guardian details are required', 'error');
      return;
    }
    addCamper({
      firstName: draft.firstName,
      lastName: draft.lastName,
      dob: draft.dob || '2015-01-01',
      sessionIds: draft.sessionId ? [draft.sessionId] : [],
      groupName: draft.groupName,
      tShirtSize: draft.tShirtSize,
      guardians: [
        { name: draft.guardianName, relation: draft.guardianRelation, phone: draft.guardianPhone, email: draft.guardianEmail, isPrimary: true },
      ],
      emergencyContacts: draft.ecName ? [{ name: draft.ecName, relation: draft.ecRelation, phone: draft.ecPhone }] : [],
      authorizedPickup: draft.pickupName ? [{ name: draft.pickupName, relation: draft.pickupRelation, phone: draft.pickupPhone, idNumber: draft.pickupId }] : [],
      medical: {
        allergies: draft.allergies,
        conditions: draft.conditions,
        medications: draft.medications,
        doctorName: draft.doctorName,
        doctorPhone: draft.doctorPhone,
        insurance: draft.insurance,
        swimLevel: draft.swimLevel,
        epipen: draft.epipen,
      },
      photoRelease: draft.photoRelease,
      waiverSigned: false,
      balanceDue: 0,
      notes: draft.notes,
    });
    setDraft(EMPTY);
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Summer Camp"
        description="Enrollment, medical information, emergency contacts, authorized pickup list and daily attendance."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  'campers-mws.csv',
                  rows.map((c) => ({
                    Codigo: c.camperCode,
                    Nombre: `${c.firstName} ${c.lastName}`,
                    Edad: age(c.dob),
                    Grupo: c.groupName,
                    Talla: c.tShirtSize,
                    Tutor: c.guardians[0]?.name ?? '',
                    TelefonoTutor: c.guardians[0]?.phone ?? '',
                    EmailTutor: c.guardians[0]?.email ?? '',
                    Alergias: c.medical.allergies,
                    Condiciones: c.medical.conditions,
                    NivelNatacion: SWIM_LEVEL_LABELS[c.medical.swimLevel],
                    EpiPen: c.medical.epipen ? 'Sí' : 'No',
                    WaiverFirmado: c.waiverSigned ? 'Sí' : 'No',
                    Saldo: c.balanceDue,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export roster
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Enroll camper
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Campers enrolled" value={num(stats.total)} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Present today" value={num(stats.present)} hint={`${pct(stats.present / Math.max(1, stats.total))} of the roster`} icon={<CheckCircle2 className="h-5 w-5" />} tone="green" />
        <StatCard label="No waiver" value={num(stats.pendingWaiver)} hint="cannot enter the water" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Medical alerts" value={num(stats.medical)} hint="allergies or EpiPen" icon={<HeartPulse className="h-5 w-5" />} tone="amber" />
        <StatCard label="Balance due" value={money(stats.balance)} tone="indigo" />
      </div>

      {/* Panel de seguridad — lo que el instructor debe saber antes de entrar al agua */}
      <Card className="mb-5 border-rose-200 bg-rose-50/40">
        <CardHeader
          title="Before entering the water"
          subtitle="Mandatory check by the supervisor on duty"
          icon={<AlertTriangle className="h-4 w-4" />}
          className="border-rose-100"
        />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {[
            ['No waiver firmado', alerts.noWaiver, 'rose' as const],
            ['Carries EpiPen', alerts.epipen, 'amber' as const],
            ['Non-swimmers', alerts.nonSwimmers, 'indigo' as const],
          ].map(([label, list, tone]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold text-deep-900">{label as string}</p>
                <Badge tone={tone as 'rose'}>{(list as Camper[]).length}</Badge>
              </div>
              <ul className="mt-2 space-y-1">
                {(list as Camper[]).slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link to={`/summer-camp/${c.id}`} className="block truncate text-[11px] text-slate-600 hover:text-lagoon-700">
                      {c.firstName} {c.lastName} · {c.groupName}
                    </Link>
                  </li>
                ))}
                {(list as Camper[]).length > 4 && <li className="text-[11px] text-slate-400">+{(list as Camper[]).length - 4} more</li>}
                {!(list as Camper[]).length && <li className="text-[11px] text-emerald-600">None · all clear</li>}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="roster">
        <TabList className="mb-4">
          <Tab value="roster" count={rows.length}>
            Roster
          </Tab>
          <Tab value="asistencia" count={todayAttendance.length}>
            Today’s attendance
          </Tab>
          <Tab value="semanas" count={state.campSessions.length}>
            Semanas
          </Tab>
          <Tab value="actividades">Activities</Tab>
        </TabList>

        <TabPanel value="roster">
          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              <SearchInput value={query} onChange={setQuery} placeholder="Name, code or group…" className="min-w-[220px] max-w-sm flex-1" />
              <Select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} className="w-auto min-w-[220px]">
                <option value="all">All weeks</option>
                {state.campSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            {rows.length ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Camper</Th>
                    <Th>Group</Th>
                    <Th>Primary guardian</Th>
                    <Th>Health</Th>
                    <Th>Swimming</Th>
                    <Th>Waiver</Th>
                    <Th className="text-right">Balance</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 60).map((c) => (
                    <Tr key={c.id}>
                      <Td>
                        <Link to={`/summer-camp/${c.id}`} className="flex items-center gap-3 group">
                          <Avatar name={`${c.firstName} ${c.lastName}`} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-deep-900 group-hover:text-lagoon-700">
                              {c.firstName} {c.lastName}
                            </span>
                            <span className="block text-[11px] text-slate-500">
                              {c.camperCode} · {age(c.dob)} años · talla {c.tShirtSize}
                            </span>
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone="lagoon">{c.groupName}</Badge>
                      </Td>
                      <Td>
                        <span className="block text-[12px] font-medium text-deep-900">{c.guardians[0]?.name}</span>
                        <span className="block text-[11px] text-slate-500">{c.guardians[0]?.phone}</span>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {c.medical.allergies !== 'Ninguna' && <Badge tone="amber">{c.medical.allergies}</Badge>}
                          {c.medical.epipen && <Badge tone="rose">EpiPen</Badge>}
                          {c.medical.conditions !== 'Ninguna' && <Badge tone="slate">{c.medical.conditions}</Badge>}
                          {c.medical.allergies === 'Ninguna' && !c.medical.epipen && c.medical.conditions === 'Ninguna' && (
                            <span className="text-[11px] text-slate-400">Nothing to note</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={c.medical.swimLevel === 'none' ? 'rose' : c.medical.swimLevel === 'strong' ? 'green' : 'slate'}>
                          {SWIM_LEVEL_LABELS[c.medical.swimLevel]}
                        </Badge>
                      </Td>
                      <Td>
                        {c.waiverSigned ? (
                          <Badge tone="green" dot>
                            Firmado
                          </Badge>
                        ) : (
                          <Badge tone="rose" dot>
                            Pendiente
                          </Badge>
                        )}
                      </Td>
                      <Td className={cn('text-right tabular-nums', c.balanceDue > 0 && 'font-bold text-amber-600')}>
                        {c.balanceDue > 0 ? money(c.balanceDue) : '—'}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <EmptyState icon={<Sun className="h-6 w-6" />} title="No campers" description="Adjust your search or enroll a new one." />
            )}
          </Card>
        </TabPanel>

        <TabPanel value="asistencia">
          <Card>
            <CardHeader
              title={`Asistencia · ${formatDate(today)}`}
              subtitle="Check-out is only allowed for people on the authorized pickup list"
              icon={<CalendarDays className="h-4 w-4" />}
            />
            <Table>
              <thead>
                <tr>
                  <Th>Camper</Th>
                  <Th>Group</Th>
                  <Th>Check-in</Th>
                  <Th>Check-out</Th>
                  <Th>Picked up by</Th>
                  <Th className="text-right">Acción</Th>
                </tr>
              </thead>
              <tbody>
                {state.campers.slice(0, 40).map((c) => {
                  const att = todayAttendance.find((a) => a.camperId === c.id);
                  return (
                    <Tr key={c.id}>
                      <Td>
                        <Link to={`/summer-camp/${c.id}`} className="flex items-center gap-2.5">
                          <Avatar name={`${c.firstName} ${c.lastName}`} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-semibold text-deep-900">
                              {c.firstName} {c.lastName}
                            </span>
                            {!c.waiverSigned && <span className="block text-[10px] font-bold text-rose-600">No waiver</span>}
                          </span>
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone="lagoon">{c.groupName}</Badge>
                      </Td>
                      <Td className="font-mono text-[12px]">{att?.checkIn ?? '—'}</Td>
                      <Td className="font-mono text-[12px]">{att?.checkOut ?? '—'}</Td>
                      <Td className="text-[12px] text-slate-600">{att?.checkedOutBy ?? '—'}</Td>
                      <Td className="text-right">
                        {!att?.checkIn ? (
                          <Button size="sm" variant="outline" onClick={() => markAttendance(c.id, 'in', c.guardians[0]?.name ?? 'Tutor')}>
                            <LogIn className="h-3.5 w-3.5" /> Entrada
                          </Button>
                        ) : !att.checkOut ? (
                          <Button size="sm" variant="outline" onClick={() => setPickupFor(c)}>
                            <LogOut className="h-3.5 w-3.5" /> Salida
                          </Button>
                        ) : (
                          <Badge tone="slate">Complete</Badge>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </TabPanel>

        <TabPanel value="semanas">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.campSessions.map((s) => {
              const enrolled = state.campers.filter((c) => c.sessionIds.includes(s.id)).length;
              return (
                <Card key={s.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-deep-900">{s.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatDate(s.weekStart)} — {formatDate(s.weekEnd)}
                      </p>
                    </div>
                    <Badge tone={enrolled >= s.capacity ? 'rose' : enrolled >= s.capacity * 0.8 ? 'amber' : 'green'}>
                      {enrolled}/{s.capacity}
                    </Badge>
                  </div>
                  <ProgressBar value={enrolled} max={s.capacity} tone={enrolled >= s.capacity ? 'rose' : 'lagoon'} className="mt-3" showLabel />
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-sm font-extrabold text-deep-900">{money(s.price)}</p>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">per week</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <p className="text-sm font-extrabold text-deep-900">
                        {s.ageMin}–{s.ageMax}
                      </p>
                      <p className="text-[10px] font-semibold uppercase text-slate-500">years</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">
                    Projected revenue: <span className="font-bold text-deep-900">{money(enrolled * s.price)}</span>
                  </p>
                </Card>
              );
            })}
          </div>
        </TabPanel>

        <TabPanel value="actividades">
          <Card>
            <CardHeader title="Activity schedule" subtitle={state.campSessions[1]?.name ?? ''} icon={<CalendarDays className="h-4 w-4" />} />
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Hour</Th>
                  <Th>Activity</Th>
                  <Th>Place</Th>
                  <Th>Group</Th>
                  <Th>Instructor</Th>
                </tr>
              </thead>
              <tbody>
                {state.campActivities.slice(0, 40).map((a) => {
                  const inst = state.employees.find((e) => e.id === a.instructorId);
                  return (
                    <Tr key={a.id}>
                      <Td className="text-[12px] text-slate-600">{formatDate(a.date)}</Td>
                      <Td className="font-mono text-[12px] font-semibold text-lagoon-700">{a.time}</Td>
                      <Td className="text-[13px] font-medium text-deep-900">{a.name}</Td>
                      <Td className="text-[12px] text-slate-600">{a.location}</Td>
                      <Td>
                        <Badge tone="lagoon">{a.groupName}</Badge>
                      </Td>
                      <Td className="text-[12px] text-slate-600">
                        {inst?.firstName} {inst?.lastName}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Inscripción */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Enroll camper"
        subtitle="All of this is available to instructors and supervisors from their phone"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Enroll</Button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-lagoon-600">Child details</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
              </Field>
              <Field label="Last name" required>
                <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
              </Field>
              <Field label="Date of birth">
                <Input type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
              </Field>
              <Field label="Camp week">
                <Select value={draft.sessionId} onChange={(e) => setDraft({ ...draft, sessionId: e.target.value })}>
                  <option value="">Select…</option>
                  {state.campSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Grupo">
                <Select value={draft.groupName} onChange={(e) => setDraft({ ...draft, groupName: e.target.value })}>
                  {['Dolphins', 'Sharks', 'Barracudas', 'Manatees'].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label="T-shirt size">
                <Select value={draft.tShirtSize} onChange={(e) => setDraft({ ...draft, tShirtSize: e.target.value })}>
                  {['YS', 'YM', 'YL', 'AS', 'AM'].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-lagoon-600">Primary guardian</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required>
                <Input value={draft.guardianName} onChange={(e) => setDraft({ ...draft, guardianName: e.target.value })} />
              </Field>
              <Field label="Relationship">
                <Select value={draft.guardianRelation} onChange={(e) => setDraft({ ...draft, guardianRelation: e.target.value })}>
                  {['Madre', 'Padre', 'Legal guardian', 'Abuelo/a'].map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone" required>
                <Input value={draft.guardianPhone} onChange={(e) => setDraft({ ...draft, guardianPhone: e.target.value })} />
              </Field>
              <Field label="Email" hint="Receives the week’s photos and next week’s offers">
                <Input type="email" value={draft.guardianEmail} onChange={(e) => setDraft({ ...draft, guardianEmail: e.target.value })} />
              </Field>
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-lagoon-600">Emergency contact</p>
            <div className="grid gap-4 sm:grid-cols-3">
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
          </section>

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-lagoon-600">Authorized pickup person</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input value={draft.pickupName} onChange={(e) => setDraft({ ...draft, pickupName: e.target.value })} />
              </Field>
              <Field label="Relationship">
                <Input value={draft.pickupRelation} onChange={(e) => setDraft({ ...draft, pickupRelation: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={draft.pickupPhone} onChange={(e) => setDraft({ ...draft, pickupPhone: e.target.value })} />
              </Field>
              <Field label="ID document" hint="Verified at pickup time">
                <Input value={draft.pickupId} onChange={(e) => setDraft({ ...draft, pickupId: e.target.value })} placeholder="FL-123456" />
              </Field>
            </div>
          </section>

          <section>
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-lagoon-600">Medical information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Alergias">
                <Input value={draft.allergies} onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} />
              </Field>
              <Field label="Medical conditions">
                <Input value={draft.conditions} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} />
              </Field>
              <Field label="Medicamentos">
                <Input value={draft.medications} onChange={(e) => setDraft({ ...draft, medications: e.target.value })} />
              </Field>
              <Field label="Swim level" hint="Determines whether they can enter deep water">
                <Select value={draft.swimLevel} onChange={(e) => setDraft({ ...draft, swimLevel: e.target.value as SwimLevel })}>
                  {(Object.keys(SWIM_LEVEL_LABELS) as SwimLevel[]).map((s) => (
                    <option key={s} value={s}>
                      {SWIM_LEVEL_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Primary physician">
                <Input value={draft.doctorName} onChange={(e) => setDraft({ ...draft, doctorName: e.target.value })} />
              </Field>
              <Field label="Physician phone">
                <Input value={draft.doctorPhone} onChange={(e) => setDraft({ ...draft, doctorPhone: e.target.value })} />
              </Field>
              <Field label="Health insurance" className="sm:col-span-2">
                <Input value={draft.insurance} onChange={(e) => setDraft({ ...draft, insurance: e.target.value })} />
              </Field>
            </div>
            <div className="mt-3 space-y-2">
              <Checkbox label="Carries EpiPen" hint="Flagged on the daily safety panel" checked={draft.epipen} onChange={(v) => setDraft({ ...draft, epipen: v })} />
              <Checkbox label="I authorize the use of photos on the park’s social media" checked={draft.photoRelease} onChange={(v) => setDraft({ ...draft, photoRelease: v })} />
            </div>
          </section>

          <Field label="Additional notes">
            <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Behavior, preferences, siblings at camp…" />
          </Field>
        </div>
      </Modal>

      {/* Check-out con verificación */}
      <Modal
        open={!!pickupFor}
        onClose={() => setPickupFor(null)}
        title="Record check-out"
        subtitle={pickupFor ? `${pickupFor.firstName} ${pickupFor.lastName} — verify identity before releasing` : ''}
        size="sm"
      >
        {pickupFor && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Select who is picking up the camper:</p>
            {[...pickupFor.guardians.map((g) => ({ name: g.name, relation: g.relation, phone: g.phone, idNumber: 'Registered guardian' })), ...pickupFor.authorizedPickup].map(
              (p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    markAttendance(pickupFor.id, 'out', p.name);
                    setPickupFor(null);
                  }}
                  className="w-full rounded-xl border-2 border-slate-200 p-3.5 text-left transition hover:border-lagoon-400 hover:bg-lagoon-50/40"
                >
                  <p className="text-sm font-bold text-deep-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.relation} · {p.phone}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-slate-400">{p.idNumber}</p>
                </button>
              ),
            )}
            <p className="rounded-lg bg-amber-50 p-3 text-[11px] text-amber-800">
              If the person is not on this list, <strong>do not release the child</strong>. Call the primary guardian to authorize them in writing.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
