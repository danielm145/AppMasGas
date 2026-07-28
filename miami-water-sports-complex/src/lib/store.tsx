import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as seed from '@/data/seed';
import { addDays, isoDate, pointsMultiplier, tierFor, uid } from './utils';
import { PACKAGE_META } from './types';
import type {
  Asset,
  AssetEvent,
  Campaign,
  CampActivity,
  CampAttendance,
  Camper,
  CampSession,
  Customer,
  Employee,
  QueueEntry,
  MaintenanceTicket,
  Notification,
  PointsLedgerEntry,
  PreventivePlan,
  RainCheck,
  Reservation,
  Reward,
  RideSession,
  Role,
  Shift,
  Supply,
  Waiver,
} from './types';

/* ────────────────────────────── Forma del estado ────────────────────────── */

export interface AppState {
  customers: Customer[];
  waivers: Waiver[];
  assets: Asset[];
  assetEvents: AssetEvent[];
  rideSessions: RideSession[];
  queue: QueueEntry[];
  reservations: Reservation[];
  employees: Employee[];
  shifts: Shift[];
  tickets: MaintenanceTicket[];
  preventivePlans: PreventivePlan[];
  supplies: Supply[];
  campSessions: CampSession[];
  campers: Camper[];
  campAttendance: CampAttendance[];
  campActivities: CampActivity[];
  rainChecks: RainCheck[];
  pointsLedger: PointsLedgerEntry[];
  rewards: Reward[];
  campaigns: Campaign[];
  notifications: Notification[];
  /** Empleado con la sesión iniciada — define qué módulos ve. */
  currentUserId: string;
  /** Modo simple: solo las ocho pantallas del día a día. Arranca encendido. */
  simpleMode: boolean;
}

const STORAGE_KEY = 'mwc.state.v1';

function initialState(): AppState {
  return {
    customers: seed.customers,
    waivers: seed.waivers,
    assets: seed.assets,
    assetEvents: seed.assetEvents,
    rideSessions: seed.rideSessions,
    queue: [],
    reservations: seed.reservations,
    employees: seed.employees,
    shifts: seed.shifts,
    tickets: seed.tickets,
    preventivePlans: seed.preventivePlans,
    supplies: seed.supplies,
    campSessions: seed.campSessions,
    campers: seed.campers,
    campAttendance: seed.campAttendance,
    campActivities: seed.campActivities,
    rainChecks: [],
    pointsLedger: seed.pointsLedger,
    rewards: seed.rewards,
    campaigns: seed.campaigns,
    notifications: buildNotifications(seed.tickets, seed.supplies, seed.waivers, seed.preventivePlans, seed.campers),
    currentUserId: 'emp_1',
    simpleMode: true,
  };
}

function buildNotifications(
  tickets: MaintenanceTicket[],
  supplies: Supply[],
  waivers: Waiver[],
  plans: PreventivePlan[],
  campers: Camper[],
): Notification[] {
  const out: Notification[] = [];

  tickets
    .filter((t) => (t.priority === 'critical' || t.priority === 'high') && !['resolved', 'closed'].includes(t.status))
    .forEach((t) =>
      out.push({
        id: uid('ntf'),
        kind: 'maintenance',
        title: `${t.code} · ${t.title}`,
        detail: `Priority ${t.priority === 'critical' ? 'crítica' : 'alta'} — ${t.area}`,
        at: t.createdAt,
        severity: t.priority === 'critical' ? 'critical' : 'warning',
        read: false,
        href: '/maintenance',
      }),
    );

  supplies
    .filter((s) => s.stock <= s.minStock)
    .slice(0, 5)
    .forEach((s) =>
      out.push({
        id: uid('ntf'),
        kind: 'stock',
        title: `Stock bajo: ${s.name}`,
        detail: `Quedan ${s.stock} ${s.unit} (mínimo ${s.minStock})`,
        at: new Date().toISOString(),
        severity: 'warning',
        read: false,
        href: '/supplies',
      }),
    );

  waivers
    .filter((w) => new Date(w.expiresAt).getTime() - Date.now() < 21 * 864e5)
    .slice(0, 4)
    .forEach((w) =>
      out.push({
        id: uid('ntf'),
        kind: 'waiver',
        title: `Waiver por vencer: ${w.signerName}`,
        detail: `Vence el ${new Date(w.expiresAt).toLocaleDateString(undefined)}`,
        at: w.signedAt,
        severity: 'info',
        read: false,
        href: '/waivers',
      }),
    );

  plans
    .filter((p) => new Date(p.nextDueAt).getTime() < Date.now())
    .forEach((p) =>
      out.push({
        id: uid('ntf'),
        kind: 'maintenance',
        title: `Preventivo vencido: ${p.name}`,
        detail: `Debía ejecutarse el ${new Date(p.nextDueAt).toLocaleDateString(undefined)}`,
        at: p.nextDueAt,
        severity: 'warning',
        read: false,
        href: '/maintenance',
      }),
    );

  const pending = campers.filter((c) => !c.waiverSigned).length;
  if (pending) {
    out.push({
      id: uid('ntf'),
      kind: 'camp',
      title: `${pending} campers sin waiver firmado`,
      detail: 'No pueden entrar al agua hasta completar la autorización.',
      at: new Date().toISOString(),
      severity: 'critical',
      read: false,
      href: '/summer-camp',
    });
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/* ───────────────────────────────── Contexto ────────────────────────────── */

type Toast = { id: string; message: string; tone: 'success' | 'error' | 'info' };

interface Store {
  state: AppState;
  currentUser: Employee;
  role: Role;
  setCurrentUser: (id: string) => void;
  setSimpleMode: (v: boolean) => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  resetDemo: () => void;

  // Customers / waivers
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'memberCode' | 'points' | 'lifetimePoints' | 'tier' | 'visits' | 'lifetimeSpend'>) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addWaiver: (w: Omit<Waiver, 'id'>) => Waiver;

  // Activos
  addAsset: (a: Omit<Asset, 'id'>) => Asset;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  addAssetEvent: (e: Omit<AssetEvent, 'id'>) => void;

  // Operación
  startSession: (input: { customerId: string; packageType: RideSession['packageType']; line: RideSession['line']; assetIds: string[] }) => RideSession;
  /**
   * Mete al rider en la fila de su línea a partir del código de su pulsera.
   * Devuelve la entrada creada, o null si el código no corresponde a una
   * sesión activa (o si ya está formado).
   */
  joinQueue: (code: string) => { entry: QueueEntry; position: number } | null;
  /** El operador despacha al primero de la fila: suma su turno y lo saca. */
  callNext: (line: RideSession['line']) => QueueEntry | null;
  removeFromQueue: (entryId: string) => void;
  /** Suma un turno sin pasar por la fila — para correcciones del operador. */
  addTurn: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
  updateReservation: (id: string, patch: Partial<Reservation>) => void;

  // Mantenimiento
  addTicket: (t: Omit<MaintenanceTicket, 'id' | 'code' | 'createdAt'>) => MaintenanceTicket;
  updateTicket: (id: string, patch: Partial<MaintenanceTicket>) => void;
  completePreventive: (planId: string) => void;
  updateSupply: (id: string, patch: Partial<Supply>) => void;

  // Personal
  addEmployee: (e: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  addShift: (s: Omit<Shift, 'id'>) => Shift;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  publishWeek: (weekStartIso: string) => number;

  // Summer camp
  addCamper: (c: Omit<Camper, 'id' | 'camperCode'>) => Camper;
  updateCamper: (id: string, patch: Partial<Camper>) => void;
  markAttendance: (camperId: string, kind: 'in' | 'out', by: string) => void;

  // Rain checks
  issueRainCheck: (input: { customerId: string; packageType: RainCheck['packageType']; minutesOwed: number; reason: string; notes?: string }) => RainCheck;
  redeemRainCheck: (id: string) => void;

  // Lealtad / marketing
  awardPoints: (customerId: string, points: number, reason: string, type?: PointsLedgerEntry['type']) => void;
  redeemReward: (customerId: string, rewardId: string) => boolean;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  addCampaign: (c: Omit<Campaign, 'id'>) => Campaign;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...initialState(), ...(JSON.parse(raw) as AppState) };
    } catch {
      /* si el guardado está corrupto simplemente arrancamos limpio */
    }
    return initialState();
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const saveTimer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* cuota llena — el prototipo sigue funcionando en memoria */
      }
    }, 400);
    return () => window.clearTimeout(saveTimer.current);
  }, [state]);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = uid('t');
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3600);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  /** Reemplaza una colección aplicando un updater sobre el arreglo anterior. */
  const mutate = useCallback(
    <K extends keyof AppState>(key: K, updater: (prev: AppState[K]) => AppState[K]) => {
      setState((prev) => ({ ...prev, [key]: updater(prev[key]) }));
    },
    [],
  );

  const patchIn = useCallback(
    <K extends keyof AppState>(key: K, id: string, patch: Record<string, unknown>) => {
      mutate(key, (prev) =>
        (prev as unknown as { id: string }[]).map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ) as AppState[K],
      );
    },
    [mutate],
  );

  const api = useMemo<Store>(() => {
    const currentUser = state.employees.find((e) => e.id === state.currentUserId) ?? state.employees[0];

    return {
      state,
      currentUser,
      role: currentUser.role,
      setCurrentUser: (id) => setState((p) => ({ ...p, currentUserId: id })),
      setSimpleMode: (v) => setState((p) => ({ ...p, simpleMode: v })),
      toasts,
      toast,
      dismissToast,
      resetDemo: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(initialState());
        toast('Demo data restored');
      },

      /* ── Customers ── */
      addCustomer: (input) => {
        const customer: Customer = {
          ...input,
          id: uid('cus'),
          createdAt: new Date().toISOString(),
          memberCode: `MWC-${1000 + state.customers.length}`,
          points: 100,
          lifetimePoints: 100,
          tier: 'splash',
          visits: 0,
          lifetimeSpend: 0,
        };
        mutate('customers', (prev) => [customer, ...prev]);
        mutate('pointsLedger', (prev) => [
          { id: uid('pl'), customerId: customer.id, date: new Date().toISOString(), points: 100, type: 'bonus', reason: 'Bono de bienvenida' },
          ...prev,
        ]);
        toast(`${customer.firstName} ${customer.lastName} registered`);
        return customer;
      },
      updateCustomer: (id, patch) => patchIn('customers', id, patch),
      addWaiver: (w) => {
        const waiver: Waiver = { ...w, id: uid('wv') };
        mutate('waivers', (prev) => [waiver, ...prev]);
        toast('Waiver signed and filed');
        return waiver;
      },

      /* ── Activos ── */
      addAsset: (a) => {
        const asset: Asset = { ...a, id: uid('ast') };
        mutate('assets', (prev) => [asset, ...prev]);
        mutate('assetEvents', (prev) => [
          {
            id: uid('aev'),
            assetId: asset.id,
            type: 'purchase',
            date: asset.purchaseDate,
            description: `Alta en inventario${asset.vendor ? ` — proveedor ${asset.vendor}` : ''}.`,
            cost: asset.purchasePrice,
            performedBy: currentUser.id,
            hoursAtEvent: 0,
          },
          ...prev,
        ]);
        toast(`Asset ${asset.code} added to inventory`);
        return asset;
      },
      updateAsset: (id, patch) => patchIn('assets', id, patch),
      addAssetEvent: (e) => {
        mutate('assetEvents', (prev) => [{ ...e, id: uid('aev') }, ...prev]);
        toast('Event added to the asset history');
      },

      /* ── Operación de rides ── */
      startSession: ({ customerId, packageType, line, assetIds }) => {
        // Duración y precio salen del catálogo, no de una tabla paralela: así
        // agregar un paquete nuevo (wakesurf, tubing, cumpleaños…) es un solo cambio.
        const meta = PACKAGE_META[packageType];
        const customer = state.customers.find((c) => c.id === customerId);
        const session: RideSession = {
          id: uid('ses'),
          customerId,
          wristbandCode: `WB-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          packageType,
          line,
          startAt: new Date().toISOString(),
          minutesPurchased: meta.minutes,
          turnsUsed: 0,
          assignedAssetIds: assetIds,
          operatorId: currentUser.id,
          status: 'active',
          amountPaid: meta.price,
          pointsEarned: Math.round(meta.price * pointsMultiplier(customer?.tier ?? 'splash')),
        };
        // Cada pieza entregada queda asentada en su propio historial: así se sabe
        // siempre qué tabla y qué casco tuvo cada cliente y en qué fecha.
        const handoverEvents = assetIds.map((assetId) => ({
          id: uid('aev'),
          assetId,
          type: 'assignment' as const,
          date: isoDate(new Date()),
          description: `Entregado a ${customer ? `${customer.firstName} ${customer.lastName}` : 'cliente'} · sesión ${session.wristbandCode}`,
          performedBy: currentUser.id,
        }));
        setState((prev) => ({
          ...prev,
          rideSessions: [session, ...prev.rideSessions],
          assets: prev.assets.map((a) => (assetIds.includes(a.id) ? { ...a, status: 'in-use', assignedTo: customerId } : a)),
          assetEvents: [...handoverEvents, ...prev.assetEvents],
        }));
        toast(`Session started · ${assetIds.length} items handed out`);
        return session;
      },
      joinQueue: (code) => {
        const value = code.trim().replace(/^mwc:\/\/(ride|member|asset)\//i, '').toUpperCase();

        // La pulsera lleva el código permanente del cliente; se acepta también
        // el de la sesión o el de una pieza de equipo por si acaso.
        const customer = state.customers.find((c) => c.memberCode === value);
        let session = customer
          ? state.rideSessions.find((s) => s.customerId === customer.id && s.status === 'active')
          : undefined;
        if (!session) session = state.rideSessions.find((s) => s.wristbandCode === value && s.status === 'active');
        if (!session) {
          const asset = state.assets.find((a) => a.code === value);
          if (asset) session = state.rideSessions.find((s) => s.status === 'active' && s.assignedAssetIds.includes(asset.id));
        }
        if (!session) return null;
        if (state.queue.some((q) => q.sessionId === session!.id)) return null;

        // ¿Le alcanza el tiempo para otro turno después de este? Si no, se le
        // avisa aquí y no cuando ya está en el agua.
        const minutesLeft = session.minutesPurchased - (Date.now() - new Date(session.startAt).getTime()) / 60000;
        const entry: QueueEntry = {
          id: uid('q'),
          customerId: session.customerId,
          sessionId: session.id,
          line: session.line,
          joinedAt: new Date().toISOString(),
          lastTurn: minutesLeft <= 12,
        };
        const position = state.queue.filter((q) => q.line === entry.line).length + 1;
        mutate('queue', (prev) => [...prev, entry]);
        return { entry, position };
      },

      callNext: (line) => {
        const next = state.queue.filter((q) => q.line === line).sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))[0];
        if (!next) return null;
        setState((prev) => ({
          ...prev,
          queue: prev.queue.filter((q) => q.id !== next.id),
          rideSessions: prev.rideSessions.map((s) => (s.id === next.sessionId ? { ...s, turnsUsed: s.turnsUsed + 1 } : s)),
        }));
        return next;
      },

      removeFromQueue: (entryId) => mutate('queue', (prev) => prev.filter((q) => q.id !== entryId)),

      addTurn: (sessionId) =>
        mutate('rideSessions', (prev) => prev.map((s) => (s.id === sessionId ? { ...s, turnsUsed: s.turnsUsed + 1 } : s))),
      endSession: (sessionId) => {
        const session = state.rideSessions.find((s) => s.id === sessionId);
        if (!session) return;
        const customer = state.customers.find((c) => c.id === session.customerId);
        const earned = session.pointsEarned;
        setState((prev) => ({
          ...prev,
          rideSessions: prev.rideSessions.map((s) => (s.id === sessionId ? { ...s, status: 'completed', endAt: new Date().toISOString() } : s)),
          queue: prev.queue.filter((q) => q.sessionId !== sessionId),
          assets: prev.assets.map((a) =>
            session.assignedAssetIds.includes(a.id) ? { ...a, status: 'available', assignedTo: undefined, usageHours: a.usageHours + session.minutesPurchased / 60 } : a,
          ),
          customers: prev.customers.map((c) => {
            if (c.id !== session.customerId) return c;
            const lifetimePoints = c.lifetimePoints + earned;
            return {
              ...c,
              points: c.points + earned,
              lifetimePoints,
              tier: tierFor(lifetimePoints),
              visits: c.visits + 1,
              lifetimeSpend: c.lifetimeSpend + session.amountPaid,
              lastVisitAt: new Date().toISOString(),
            };
          }),
          pointsLedger: [
            { id: uid('pl'), customerId: session.customerId, date: new Date().toISOString(), points: earned, type: 'earn', reason: 'Sesión de cable completada' },
            ...prev.pointsLedger,
          ],
          assetEvents: [
            ...session.assignedAssetIds.map((assetId) => ({
              id: uid('aev'),
              assetId,
              type: 'return' as const,
              date: isoDate(new Date()),
              description: `Devuelto tras sesión ${session.wristbandCode}`,
              performedBy: currentUser.id,
            })),
            ...prev.assetEvents,
          ],
        }));
        toast(`Session closed · ${customer?.firstName ?? 'Customer'} earned ${earned} pts`);
      },
      updateReservation: (id, patch) => patchIn('reservations', id, patch),

      /* ── Mantenimiento ── */
      addTicket: (t) => {
        const ticket: MaintenanceTicket = {
          ...t,
          id: uid('tkt'),
          code: `MT-${1040 + state.tickets.length}`,
          createdAt: new Date().toISOString(),
        };
        setState((prev) => ({
          ...prev,
          tickets: [ticket, ...prev.tickets],
          assets: ticket.blocksAsset && ticket.assetId ? prev.assets.map((a) => (a.id === ticket.assetId ? { ...a, status: 'maintenance' } : a)) : prev.assets,
          assetEvents: ticket.assetId
            ? [
                { id: uid('aev'), assetId: ticket.assetId, type: 'damage', date: isoDate(new Date()), description: `${ticket.code} — ${ticket.title}`, performedBy: currentUser.id, photoUrl: ticket.photoUrl },
                ...prev.assetEvents,
              ]
            : prev.assetEvents,
        }));
        toast(`Ticket ${ticket.code} created`);
        return ticket;
      },
      updateTicket: (id, patch) => {
        const ticket = state.tickets.find((t) => t.id === id);
        setState((prev) => ({
          ...prev,
          tickets: prev.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          assets:
            ticket?.assetId && (patch.status === 'resolved' || patch.status === 'closed')
              ? prev.assets.map((a) => (a.id === ticket.assetId ? { ...a, status: 'available', lastServiceAt: isoDate(new Date()) } : a))
              : prev.assets,
          assetEvents:
            ticket?.assetId && patch.status === 'resolved'
              ? [
                  { id: uid('aev'), assetId: ticket.assetId, type: 'maintenance' as const, date: isoDate(new Date()), description: patch.resolution ?? `${ticket.code} resuelto`, cost: patch.cost, performedBy: currentUser.id },
                  ...prev.assetEvents,
                ]
              : prev.assetEvents,
        }));
      },
      completePreventive: (planId) => {
        const plan = state.preventivePlans.find((p) => p.id === planId);
        if (!plan) return;
        const days = { hours: 1, days: 1, weeks: 7, months: 30 }[plan.frequencyUnit] * (plan.frequencyUnit === 'hours' ? 1 : plan.frequencyValue);
        patchIn('preventivePlans', planId, {
          lastDoneAt: isoDate(new Date()),
          nextDueAt: isoDate(addDays(new Date(), days)),
        });
        toast(`${plan.name} marked as done`);
      },
      updateSupply: (id, patch) => patchIn('supplies', id, patch),

      /* ── Personal ── */
      addEmployee: (e) => {
        const employee: Employee = { ...e, id: uid('emp') };
        mutate('employees', (prev) => [...prev, employee]);
        toast(`${employee.firstName} ${employee.lastName} added to the team`);
        return employee;
      },
      updateEmployee: (id, patch) => patchIn('employees', id, patch),
      addShift: (s) => {
        const shift: Shift = { ...s, id: uid('shf') };
        mutate('shifts', (prev) => [...prev, shift]);
        return shift;
      },
      updateShift: (id, patch) => patchIn('shifts', id, patch),
      removeShift: (id) => mutate('shifts', (prev) => prev.filter((s) => s.id !== id)),
      publishWeek: (weekStartIso) => {
        const end = isoDate(addDays(weekStartIso, 6));
        let count = 0;
        mutate('shifts', (prev) =>
          prev.map((s) => {
            if (s.date >= weekStartIso && s.date <= end && s.status === 'draft') {
              count += 1;
              return { ...s, status: 'published' };
            }
            return s;
          }),
        );
        return count;
      },

      /* ── Summer camp ── */
      addCamper: (c) => {
        const camper: Camper = { ...c, id: uid('cmp'), camperCode: `CMP-${500 + state.campers.length}` };
        mutate('campers', (prev) => [camper, ...prev]);
        toast(`${camper.firstName} enrolled in Summer Camp`);
        return camper;
      },
      updateCamper: (id, patch) => patchIn('campers', id, patch),
      markAttendance: (camperId, kind, by) => {
        const date = isoDate(new Date());
        const time = new Date().toTimeString().slice(0, 5);
        const existing = state.campAttendance.find((a) => a.camperId === camperId && a.date === date);
        if (existing) {
          patchIn('campAttendance', existing.id, kind === 'in' ? { checkIn: time, checkedInBy: by, status: 'present' } : { checkOut: time, checkedOutBy: by });
        } else {
          mutate('campAttendance', (prev) => [
            { id: uid('att'), camperId, date, ...(kind === 'in' ? { checkIn: time, checkedInBy: by } : { checkOut: time, checkedOutBy: by }), status: 'present' as const },
            ...prev,
          ]);
        }
        toast(kind === 'in' ? 'Check-in recorded' : 'Check-out recorded');
      },

      /* ── Rain checks ── */
      issueRainCheck: ({ customerId, packageType, minutesOwed, reason, notes }) => {
        const rc: RainCheck = {
          id: uid('rc'),
          code: `RC-${String(1001 + state.rainChecks.length)}`,
          customerId,
          issuedAt: new Date().toISOString(),
          // Un año de vigencia: el cierre por clima no es culpa del cliente y
          // una temporada completa es lo que hace que el pase se sienta justo.
          expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
          reason,
          packageType,
          minutesOwed,
          status: 'issued',
          issuedBy: currentUser.id,
          notes,
        };
        mutate('rainChecks', (prev) => [rc, ...prev]);
        toast(`Rain check ${rc.code} issued`);
        return rc;
      },
      redeemRainCheck: (id) => {
        patchIn('rainChecks', id, { status: 'redeemed', redeemedAt: new Date().toISOString() });
        toast('Pass redeemed — run their check-in');
      },

      /* ── Lealtad ── */
      awardPoints: (customerId, points, reason, type = 'bonus') => {
        setState((prev) => ({
          ...prev,
          customers: prev.customers.map((c) => {
            if (c.id !== customerId) return c;
            const lifetimePoints = c.lifetimePoints + Math.max(points, 0);
            return { ...c, points: c.points + points, lifetimePoints, tier: tierFor(lifetimePoints) };
          }),
          pointsLedger: [{ id: uid('pl'), customerId, date: new Date().toISOString(), points, type, reason }, ...prev.pointsLedger],
        }));
      },
      redeemReward: (customerId, rewardId) => {
        const customer = state.customers.find((c) => c.id === customerId);
        const reward = state.rewards.find((r) => r.id === rewardId);
        if (!customer || !reward) return false;
        if (customer.points < reward.cost) {
          toast(`Not enough points — ${reward.cost - customer.points} short`, 'error');
          return false;
        }
        setState((prev) => ({
          ...prev,
          customers: prev.customers.map((c) => (c.id === customerId ? { ...c, points: c.points - reward.cost } : c)),
          rewards: prev.rewards.map((r) => (r.id === rewardId ? { ...r, redeemed: r.redeemed + 1, stock: r.stock != null ? r.stock - 1 : undefined } : r)),
          pointsLedger: [
            { id: uid('pl'), customerId, date: new Date().toISOString(), points: -reward.cost, type: 'redeem', reason: `Canje: ${reward.name}` },
            ...prev.pointsLedger,
          ],
        }));
        toast(`${reward.name} redeemed by ${customer.firstName}`);
        return true;
      },
      updateCampaign: (id, patch) => patchIn('campaigns', id, patch),
      addCampaign: (c) => {
        const campaign: Campaign = { ...c, id: uid('cmpg') };
        mutate('campaigns', (prev) => [campaign, ...prev]);
        toast('Campaign created');
        return campaign;
      },

      markNotificationRead: (id) => patchIn('notifications', id, { read: true }),
      markAllNotificationsRead: () => mutate('notifications', (prev) => prev.map((n) => ({ ...n, read: true }))),
    };
  }, [state, toasts, toast, dismissToast, mutate, patchIn]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}

/* Atajos de lectura frecuentes ------------------------------------------- */

export function useCustomer(id?: string) {
  const { state } = useStore();
  return state.customers.find((c) => c.id === id);
}

export function useEmployeeName() {
  const { state } = useStore();
  return (id?: string) => {
    const e = state.employees.find((x) => x.id === id);
    return e ? `${e.firstName} ${e.lastName}` : '—';
  };
}
