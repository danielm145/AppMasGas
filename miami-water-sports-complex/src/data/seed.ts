/**
 * Datos demo del parque. Todo se genera con un PRNG semilla fija, así que la
 * demo se ve idéntica en cada recarga y las cifras del dashboard son estables.
 *
 * Al conectar el backend real, este archivo se borra y el store consume la API.
 */

import { assetPhoto } from '@/lib/images';
import {
  addDays,
  between,
  isoDate,
  makeRng,
  pick,
  startOfWeek,
  tierFor,
  uid,
} from '@/lib/utils';
import type {
  Asset,
  AssetCategory,
  AssetEvent,
  Campaign,
  CampActivity,
  CampAttendance,
  Camper,
  CampSession,
  Customer,
  Employee,
  LapLog,
  MaintenanceTicket,
  PackageType,
  PointsLedgerEntry,
  PreventivePlan,
  Reservation,
  Reward,
  RideSession,
  Segment,
  Shift,
  Supply,
  Waiver,
} from '@/lib/types';

const rng = makeRng(20240617);
const NOW = new Date();
const today = isoDate(NOW);

const FIRST = [
  'Carlos', 'María', 'Luis', 'Ana', 'José', 'Sofía', 'Miguel', 'Valentina', 'Diego', 'Camila',
  'Andrés', 'Isabella', 'Javier', 'Lucía', 'Ricardo', 'Gabriela', 'Fernando', 'Daniela', 'Tyler',
  'Ashley', 'Brandon', 'Jessica', 'Kevin', 'Amanda', 'Ryan', 'Nicole', 'Jorge', 'Paola', 'Emilio',
  'Renata', 'Sebastián', 'Mariana', 'Alejandro', 'Natalia', 'Rafael', 'Carolina',
];
const LAST = [
  'Rodríguez', 'Martínez', 'García', 'Pérez', 'González', 'Hernández', 'López', 'Díaz', 'Torres',
  'Ramírez', 'Flores', 'Rivera', 'Gómez', 'Cruz', 'Ortiz', 'Morales', 'Smith', 'Johnson',
  'Williams', 'Brown', 'Miller', 'Davis', 'Castillo', 'Vargas', 'Mendoza', 'Silva',
];
const CITIES = ['Hialeah', 'Miami', 'Miami Lakes', 'Doral', 'Miami Springs', 'Hialeah Gardens', 'Opa-locka', 'Miramar'];

const name = () => ({ firstName: pick(rng, FIRST), lastName: pick(rng, LAST) });
const emailFor = (f: string, l: string, i: number) =>
  `${f.toLowerCase().replace(/[^a-z]/g, '')}.${l.toLowerCase().replace(/[^a-z]/g, '')}${i}@example.com`;
const phone = () => `(305) ${between(rng, 200, 999)}-${String(between(rng, 0, 9999)).padStart(4, '0')}`;

/* ─────────────────────────────── Empleados ─────────────────────────────── */

const EMPLOYEE_SEED: Array<[string, string, Employee['role'], number, string]> = [
  ['Daniel', 'Ortega', 'owner', 0, '2016-03-01'],
  ['Verónica', 'Salas', 'manager', 32, '2018-05-14'],
  ['Marcos', 'Peña', 'supervisor', 26, '2019-06-03'],
  ['Kayla', 'Brooks', 'supervisor', 25, '2021-04-12'],
  ['Iván', 'Delgado', 'operator', 19, '2021-05-20'],
  ['Tomás', 'Rueda', 'operator', 18, '2022-03-15'],
  ['Priya', 'Nair', 'operator', 18, '2023-05-02'],
  ['Jonathan', 'Reyes', 'instructor', 28, '2020-02-10'],
  ['Melissa', 'Cordero', 'instructor', 27, '2022-06-01'],
  ['Alexa', 'Ferrer', 'frontdesk', 17, '2023-01-09'],
  ['Bryan', 'Solís', 'frontdesk', 16, '2024-05-06'],
  ['Héctor', 'Villalobos', 'maintenance', 24, '2019-09-23'],
];

const CERTS = [
  'CPR/AED — American Red Cross',
  'Lifeguard Certification',
  'WSIA Cable Operator Level 1',
  'First Aid',
  'Boater Safety Card FL',
];

export const employees: Employee[] = EMPLOYEE_SEED.map(([firstName, lastName, role, rate, hireDate], i) => ({
  id: `emp_${i + 1}`,
  firstName,
  lastName,
  email: emailFor(firstName, lastName, i).replace('example.com', 'miamiwatersportscomplex.com'),
  phone: phone(),
  role,
  hireDate,
  status: i > 9 ? 'seasonal' : 'active',
  hourlyRate: rate,
  certifications: Array.from({ length: between(rng, 1, 3) }, () => {
    const issued = addDays(NOW, -between(rng, 60, 700));
    return {
      name: pick(rng, CERTS),
      issuedAt: isoDate(issued),
      expiresAt: isoDate(addDays(issued, 730)),
    };
  }),
  emergencyContact: { name: `${pick(rng, FIRST)} ${lastName}`, relation: pick(rng, ['Cónyuge', 'Madre', 'Padre', 'Hermano/a']), phone: phone() },
  weeklyHourTarget: role === 'owner' ? 45 : between(rng, 20, 40),
}));

const operatorIds = employees.filter((e) => ['operator', 'supervisor', 'instructor'].includes(e.role)).map((e) => e.id);

/* ─────────────────────────────── Clientes ──────────────────────────────── */

const TAGS = ['local', 'frecuente', 'cumpleaños', 'grupo corporativo', 'referido', 'escuela', 'turista', 'competidor'];

export const customers: Customer[] = Array.from({ length: 64 }, (_, i) => {
  const { firstName, lastName } = name();
  const minor = rng() < 0.18;
  const birthYear = minor ? between(rng, 2009, 2015) : between(rng, 1972, 2006);
  const visits = between(rng, 1, 74);
  const lifetimeSpend = visits * between(rng, 38, 130);
  const lifetimePoints = Math.round(lifetimeSpend * (1 + rng() * 0.5));
  const created = addDays(NOW, -between(rng, 20, 1300));
  const lastVisit = addDays(NOW, -between(rng, 0, 160));
  return {
    id: `cus_${i + 1}`,
    firstName,
    lastName,
    email: emailFor(firstName, lastName, i),
    phone: phone(),
    dob: `${birthYear}-${String(between(rng, 1, 12)).padStart(2, '0')}-${String(between(rng, 1, 28)).padStart(2, '0')}`,
    city: pick(rng, CITIES),
    state: 'FL',
    zip: String(between(rng, 33010, 33199)),
    createdAt: created.toISOString(),
    skillLevel: pick(rng, ['beginner', 'beginner', 'intermediate', 'intermediate', 'advanced', 'pro'] as const),
    emergencyContact: { name: `${pick(rng, FIRST)} ${lastName}`, relation: pick(rng, ['Madre', 'Padre', 'Cónyuge', 'Amigo/a']), phone: phone() },
    isMinor: minor,
    guardianName: minor ? `${pick(rng, FIRST)} ${lastName}` : undefined,
    guardianPhone: minor ? phone() : undefined,
    canSwim: rng() < 0.94 ? ('declared' as const) : ('pending' as const),
    idVerified: rng() < 0.9,
    marketingOptIn: rng() < 0.78,
    smsOptIn: rng() < 0.55,
    points: Math.round(lifetimePoints * (0.2 + rng() * 0.6)),
    lifetimePoints,
    tier: tierFor(lifetimePoints),
    visits,
    lifetimeSpend,
    lastVisitAt: lastVisit.toISOString(),
    tags: Array.from(new Set(Array.from({ length: between(rng, 0, 2) }, () => pick(rng, TAGS)))),
    memberCode: `MWC-${String(1000 + i)}`,
  };
});

/* ──────────────────────────────── Waivers ──────────────────────────────── */

export const waivers: Waiver[] = customers.slice(0, 52).map((c, i) => {
  const signed = addDays(NOW, -between(rng, 1, 420));
  return {
    id: `wv_${i + 1}`,
    customerId: c.id,
    type: c.isMinor ? 'minor-consent' : 'liability',
    version: 'v3.2 (2025-01)',
    signedAt: signed.toISOString(),
    expiresAt: addDays(signed, 365).toISOString(),
    signerName: c.isMinor ? c.guardianName! : `${c.firstName} ${c.lastName}`,
    ipAddress: `172.58.${between(rng, 1, 250)}.${between(rng, 1, 250)}`,
    witnessedBy: pick(rng, employees.filter((e) => e.role === 'frontdesk')).id,
    minor: c.isMinor,
    guardianName: c.guardianName,
  };
});

/* ──────────────────────────────── Activos ──────────────────────────────── */

const ASSET_BLUEPRINT: Array<[AssetCategory, string, string, string[], number, number]> = [
  // categoría, marca, prefijo de código, tallas, precio, cantidad
  ['wakeboard', 'Hyperlite', 'BRD', ['134cm', '138cm', '142cm', '146cm'], 520, 22],
  ['wakeboard', 'Liquid Force', 'BRD', ['136cm', '140cm', '144cm'], 480, 10],
  ['wakeskate', 'Hyperlite', 'SKT', ['41"', '43"'], 340, 6],
  ['kneeboard', 'O’Brien', 'KNB', ['Único'], 260, 6],
  ['helmet', 'Slam', 'HLM', ['S', 'M', 'L', 'XL'], 65, 26],
  ['vest', 'Follow', 'VST', ['XS', 'S', 'M', 'L', 'XL'], 90, 30],
  ['boat', 'Nautique', 'BOT', ['G23', 'GS22'], 62000, 2],
  ['boat', 'Nautique', 'BOT', ['Sport 200'], 38000, 1],
  ['obstacle', 'Unit Parktech', 'OBS', ['Kicker', 'Rail 30ft', 'A-Frame', 'Double-up kicker'], 7800, 5],
  ['cable-system', 'Sesitec', 'CBL', ['System 2.0', 'Full Cable'], 145000, 2],
  ['inflatable', 'Wibit', 'INF', ['Module'], 4200, 9],
  ['safety', 'Zoll', 'AED', ['AED Plus'], 2100, 2],
  ['safety', 'Cintas', 'FAK', ['First aid cabinet'], 380, 3],
];

const LOCATIONS = ['Pro Shop', 'Main storage', 'Cable dock', 'Boat dock', 'Workshop', 'Aqua park'];

let assetSeq = 0;
export const assets: Asset[] = ASSET_BLUEPRINT.flatMap(([category, brand, prefix, sizes, price, count]) =>
  Array.from({ length: count }, () => {
    assetSeq += 1;
    const code = `MWC-${prefix}-${String(assetSeq).padStart(3, '0')}`;
    const purchase = addDays(NOW, -between(rng, 30, 1500));
    const usageHours = between(rng, 5, 900);
    const interval = category === 'boat' ? 100 : category === 'cable-system' ? 250 : 300;
    const lastService = addDays(NOW, -between(rng, 5, 200));
    const statusRoll = rng();
    const status: Asset['status'] =
      statusRoll < 0.06 ? 'maintenance' : statusRoll < 0.14 ? 'in-use' : statusRoll < 0.16 ? 'retired' : 'available';
    return {
      id: `ast_${assetSeq}`,
      code,
      name: `${brand} ${pick(rng, sizes)}`,
      category,
      brand,
      model: pick(rng, ['Vault', 'District', 'One', 'Trip', 'Signature', 'Classic', 'Pro Series']),
      size: pick(rng, sizes),
      serial: `SN${between(rng, 100000, 999999)}`,
      photoUrl: assetPhoto(code, category),
      purchaseDate: isoDate(purchase),
      purchasePrice: Math.round(price * (0.9 + rng() * 0.25)),
      vendor: pick(rng, ['Wakeboard Warehouse', 'Buywake', 'Distribuidor local FL', 'Compra directa fábrica']),
      condition: status === 'retired' ? 'retired' : pick(rng, ['new', 'good', 'good', 'good', 'fair', 'poor'] as const),
      status,
      location: pick(rng, LOCATIONS),
      storageSlot: ['wakeboard', 'wakeskate', 'kneeboard', 'vest', 'helmet'].includes(category)
        ? `${'ABCDEF'[between(rng, 0, 5)]}${between(rng, 1, 6)}`
        : undefined,
      usageHours,
      serviceIntervalHours: interval,
      lastServiceAt: isoDate(lastService),
      nextServiceAt: isoDate(addDays(lastService, between(rng, -10, 120))),
    };
  }),
);

const EVENT_TEMPLATES: Array<[AssetEvent['type'], string[], [number, number]]> = [
  ['inspection', ['Inspección visual semanal — sin novedad', 'Revisión de fijaciones y tornillería', 'Chequeo de hebillas y costuras'], [0, 0]],
  ['damage', ['Delaminación en el canto derecho', 'Fisura en la aleta trasera', 'Correa de fijación rota', 'Golpe contra el rail — raspón profundo'], [0, 0]],
  ['maintenance', ['Cambio de fijaciones', 'Resane de fibra y sellado', 'Lubricación y ajuste de herrajes', 'Cambio de aleta y tornillos'], [25, 180]],
  ['assignment', ['Asignado a sesión de cable', 'Entregado en recepción para clase'], [0, 0]],
  ['return', ['Devuelto en buen estado', 'Devuelto — se reporta desgaste normal'], [0, 0]],
  ['transfer', ['Trasladado a bodega principal', 'Movido al muelle norte para temporada alta'], [0, 0]],
];

export const assetEvents: AssetEvent[] = assets.flatMap((a) => {
  const events: AssetEvent[] = [
    {
      id: uid('aev'),
      assetId: a.id,
      type: 'purchase',
      date: a.purchaseDate,
      description: `Compra a ${a.vendor}. Ingreso al inventario como ${a.code}.`,
      cost: a.purchasePrice,
      performedBy: 'emp_2',
      hoursAtEvent: 0,
    },
  ];
  const extra = between(rng, 1, 5);
  for (let i = 0; i < extra; i++) {
    const [type, descs, [minCost, maxCost]] = pick(rng, EVENT_TEMPLATES);
    events.push({
      id: uid('aev'),
      assetId: a.id,
      type,
      date: isoDate(addDays(NOW, -between(rng, 1, 400))),
      description: pick(rng, descs),
      cost: maxCost ? between(rng, minCost, maxCost) : undefined,
      performedBy: pick(rng, employees).id,
      hoursAtEvent: between(rng, 0, a.usageHours),
    });
  }
  return events.sort((x, y) => y.date.localeCompare(x.date));
});

/* ──────────────────── Sesiones de ride, vueltas, reservas ───────────────── */

const PACKAGES: PackageType[] = ['hour-1', 'hour-1', 'hour-2', 'half-day', 'full-day', 'lesson', 'aqua-park', 'wakesurf', 'tubing'];
const LINES = ['full-cable', 'full-cable', 'system-2', 'kicker', 'aqua-park', 'wakesurf', 'tubing'] as const;

/** Curva de afluencia: sábado/domingo pesados, pico 14–17 h. */
function trafficWeight(date: Date, hour: number) {
  const dow = date.getDay();
  const dayW = [0.55, 0.5, 0.6, 0.7, 0.95, 1.45, 1.6][dow];
  const hourW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 0.75, 0.9, 1.0, 1.15, 1.5, 1.6, 1.45, 1.1, 0.7, 0.25, 0, 0, 0, 0][hour];
  return dayW * hourW;
}

export const rideSessions: RideSession[] = [];
export const lapLogs: LapLog[] = [];

let sessionSeq = 0;
for (let d = 59; d >= 0; d--) {
  const day = addDays(NOW, -d);
  for (let hour = 9; hour <= 19; hour++) {
    const w = trafficWeight(day, hour);
    const starts = Math.round(w * between(rng, 1, 5));
    for (let s = 0; s < starts; s++) {
      sessionSeq += 1;
      const customer = pick(rng, customers);
      const packageType = pick(rng, PACKAGES);
      const line = pick(rng, LINES);
      const start = new Date(day);
      start.setHours(hour, between(rng, 0, 55), 0, 0);
      const minutes = packageType === 'hour-1' ? 60 : packageType === 'hour-2' ? 120 : packageType === 'lesson' ? 60 : 240;
      const isLive = d === 0 && hour >= NOW.getHours() - 1 && hour <= NOW.getHours();
      const laps = between(rng, 4, Math.max(6, Math.round(minutes / 4)));
      const price = { 'hour-1': 45, 'hour-2': 75, 'half-day': 110, 'full-day': 150, lesson: 95, 'aqua-park': 30, wakesurf: 220, tubing: 180, birthday: 650, corporate: 1800, 'season-pass': 899, camp: 85 }[packageType];
      const sessionId = `ses_${sessionSeq}`;
      rideSessions.push({
        id: sessionId,
        customerId: customer.id,
        wristbandCode: `WB-${String(sessionSeq).padStart(5, '0')}`,
        packageType,
        line,
        startAt: start.toISOString(),
        endAt: isLive ? undefined : new Date(start.getTime() + minutes * 60000).toISOString(),
        minutesPurchased: minutes,
        lapsCompleted: laps,
        falls: between(rng, 0, Math.round(laps / 2)),
        assignedAssetIds: [],
        operatorId: pick(rng, operatorIds),
        status: isLive ? 'active' : 'completed',
        amountPaid: price,
        pointsEarned: Math.round(price * 1.2),
      });

      // Solo guardamos el detalle vuelta a vuelta de las últimas 3 semanas.
      if (d <= 21) {
        for (let l = 0; l < laps; l++) {
          const ts = new Date(start.getTime() + l * between(rng, 90, 260) * 1000);
          lapLogs.push({
            id: uid('lap'),
            sessionId,
            customerId: customer.id,
            wristbandCode: `WB-${String(sessionSeq).padStart(5, '0')}`,
            timestamp: ts.toISOString(),
            line,
            durationSec: between(rng, 55, 190),
            completed: rng() > 0.18,
            operatorId: pick(rng, operatorIds),
          });
        }
      }
    }
  }
}

// Aseguramos algunas sesiones activas para que la vista de operación tenga vida.
// A cada una se le entrega casco + chaleco + tabla, que es como opera el muelle:
// el QR del casco identifica al rider y el de la tabla deja la trazabilidad.
const availableHelmets = assets.filter((a) => a.category === 'helmet' && a.status === 'available');
const availableVests = assets.filter((a) => a.category === 'vest' && a.status === 'available');
const availableBoards = assets.filter((a) => a.category === 'wakeboard' && a.status === 'available');

const liveCustomers = customers.slice(0, 7);
liveCustomers.forEach((c, i) => {
  sessionSeq += 1;
  const start = new Date(NOW.getTime() - between(rng, 8, 52) * 60000);
  const sessionId = `ses_live_${i + 1}`;
  const line = pick(rng, LINES);
  const laps = between(rng, 2, 14);
  rideSessions.push({
    id: sessionId,
    customerId: c.id,
    wristbandCode: `WB-${String(90000 + i).padStart(5, '0')}`,
    packageType: pick(rng, PACKAGES),
    line,
    startAt: start.toISOString(),
    minutesPurchased: 120,
    lapsCompleted: laps,
    falls: between(rng, 0, 4),
    assignedAssetIds: [availableHelmets[i], availableVests[i], availableBoards[i]].filter(Boolean).map((a) => a.id),
    operatorId: pick(rng, operatorIds),
    status: 'active',
    amountPaid: 75,
    pointsEarned: 90,
  });
  for (let l = 0; l < laps; l++) {
    lapLogs.push({
      id: uid('lap'),
      sessionId,
      customerId: c.id,
      wristbandCode: `WB-${String(90000 + i).padStart(5, '0')}`,
      timestamp: new Date(start.getTime() + l * 150000).toISOString(),
      line,
      durationSec: between(rng, 60, 180),
      completed: rng() > 0.2,
      operatorId: pick(rng, operatorIds),
    });
  }
});

// El equipo entregado queda marcado como "en uso" y con su portador actual.
rideSessions
  .filter((s) => s.status === 'active')
  .forEach((s) => {
    s.assignedAssetIds.forEach((assetId) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;
      asset.status = 'in-use';
      asset.assignedTo = s.customerId;
      const customer = customers.find((c) => c.id === s.customerId);
      assetEvents.unshift({
        id: uid('aev'),
        assetId,
        type: 'assignment',
        date: isoDate(NOW),
        description: `Entregado a ${customer ? `${customer.firstName} ${customer.lastName}` : 'cliente'} · sesión ${s.wristbandCode}`,
        performedBy: s.operatorId,
      });
    });
  });

export const reservations: Reservation[] = Array.from({ length: 34 }, (_, i) => {
  const c = pick(rng, customers);
  const date = addDays(NOW, between(rng, 0, 21));
  const pkg = pick(rng, PACKAGES);
  const size = between(rng, 1, 8);
  return {
    id: `res_${i + 1}`,
    customerId: c.id,
    date: isoDate(date),
    time: `${String(between(rng, 10, 18)).padStart(2, '0')}:${pick(rng, ['00', '30'])}`,
    packageType: pkg,
    partySize: size,
    status: pick(rng, ['confirmed', 'confirmed', 'confirmed', 'pending', 'checked-in', 'cancelled'] as const),
    source: pick(rng, ['web', 'web', 'phone', 'walk-in', 'app', 'groupon'] as const),
    total: size * between(rng, 30, 120),
    paid: rng() < 0.7,
  };
});

/* ───────────────────────────── Turnos / horarios ────────────────────────── */

const POSITIONS = ['Operador cable', 'Recepción', 'Salvavidas', 'Instructor', 'Aqua Park', 'Pro Shop', 'Mantenimiento'];

export const shifts: Shift[] = (() => {
  const out: Shift[] = [];
  const weekStart = startOfWeek(NOW);
  for (let w = -1; w <= 1; w++) {
    for (let d = 0; d < 7; d++) {
      const date = isoDate(addDays(weekStart, w * 7 + d));
      const staffing = d >= 5 ? 7 : 4;
      const pool = employees.filter((e) => e.role !== 'owner');
      for (let s = 0; s < staffing; s++) {
        // `w` es -1 en la semana pasada: normalizamos para no indexar en negativo.
        const emp = pool[(((d * 3 + s + w) % pool.length) + pool.length) % pool.length];
        const startHour = pick(rng, [8, 9, 10, 12, 13]);
        out.push({
          id: uid('shf'),
          employeeId: emp.id,
          date,
          start: `${String(startHour).padStart(2, '0')}:00`,
          end: `${String(startHour + between(rng, 5, 8)).padStart(2, '0')}:00`,
          position: pick(rng, POSITIONS),
          status: w < 0 ? 'confirmed' : w === 0 ? 'published' : 'draft',
        });
      }
    }
  }
  return out;
})();

/* ───────────────────────── Mantenimiento y suministros ──────────────────── */

const TICKET_SEED: Array<[string, string, string, MaintenanceTicket['priority'], MaintenanceTicket['status']]> = [
  ['Cable principal hace ruido en torre 3', 'Se escucha un chirrido metálico intermitente al pasar el carro por la torre 3. Se sospecha rodamiento.', 'Cable park', 'critical', 'in-progress'],
  ['Motor del System 2.0 se sobrecalienta', 'Después de 3 h continuas el motor llega a temperatura de alarma y corta.', 'Cable park', 'high', 'waiting-parts'],
  ['Rail de 30ft con tornillería suelta', 'Dos pernos del anclaje central están flojos. Riesgo de desplazamiento.', 'Obstáculos', 'high', 'open'],
  ['Nautique boat — fuel filter service', 'Mantenimiento programado de 100 h: cambio de filtro y bujías.', 'Muelle sur', 'medium', 'open'],
  ['Fuga en tubería de la ducha exterior', 'Goteo constante en la ducha 2 del área de vestidores.', 'Instalaciones', 'low', 'open'],
  ['Inflable Wibit módulo 4 pierde aire', 'Pierde presión en ~6 h. Posible pinchazo en la costura inferior.', 'Aqua Park', 'medium', 'in-progress'],
  ['Cambio de cuerdas y manijas', 'Rotación trimestral de líneas de tracción del cable completo.', 'Cable park', 'medium', 'resolved'],
  ['Luminaria del estacionamiento fundida', 'Poste 6 sin luz — afecta salida nocturna de clientes.', 'Estacionamiento', 'low', 'resolved'],
  ['Compresor del pro shop no enciende', 'No arranca. Se usa para inflar chalecos y limpiar equipo.', 'Pro Shop', 'medium', 'closed'],
  ['Baranda del muelle norte oxidada', 'Corrosión avanzada en 2 m de baranda. Lijar y repintar.', 'Muelle norte', 'medium', 'open'],
  ['Radio Motorola #3 sin batería', 'La batería ya no retiene carga, dura menos de 1 h.', 'Operaciones', 'low', 'open'],
  ['Torre 5 — revisión de tensores', 'Inspección trimestral de tensores y poleas de la torre 5.', 'Cable park', 'high', 'in-progress'],
];

export const tickets: MaintenanceTicket[] = TICKET_SEED.map(([title, description, area, priority, status], i) => {
  const created = addDays(NOW, -between(rng, 0, 45));
  const resolved = status === 'resolved' || status === 'closed' ? addDays(created, between(rng, 1, 12)) : undefined;
  return {
    id: `tkt_${i + 1}`,
    code: `MT-${String(1040 + i)}`,
    title,
    description,
    assetId: rng() < 0.6 ? pick(rng, assets).id : undefined,
    area,
    priority,
    status,
    reportedBy: pick(rng, employees).id,
    assignedTo: status === 'open' && rng() < 0.4 ? undefined : 'emp_12',
    createdAt: created.toISOString(),
    dueAt: addDays(created, priority === 'critical' ? 1 : priority === 'high' ? 3 : 10).toISOString(),
    resolvedAt: resolved?.toISOString(),
    resolution: resolved ? 'Se ejecutó el trabajo y se validó en operación. Sin novedades.' : undefined,
    laborHours: resolved ? between(rng, 1, 8) : undefined,
    cost: resolved ? between(rng, 40, 900) : undefined,
    blocksAsset: priority === 'critical' || priority === 'high',
  };
});

/** Reglas fijas que recepción repite todo el día — viven en Configuración. */
export const parkPolicies = {
  mustKnowHowToSwim: true,
  creditCardOnly: true,
  noRefundsOrRainchecks: true,
  photoIdRequired: true,
  paidParkingNotice: 'Paid parking Fri–Sun and holidays (county park lot).',
  reviewIncentive: 'Free sticker for a Google review or a follow on TikTok / Instagram / Facebook.',
};

export const preventivePlans: PreventivePlan[] = [
  {
    id: 'pp_1',
    name: 'Inspección diaria de cable y torres',
    target: { kind: 'category', category: 'cable-system' },
    frequencyValue: 1,
    frequencyUnit: 'days',
    lastDoneAt: today,
    nextDueAt: isoDate(addDays(NOW, 1)),
    assignedRole: 'supervisor',
    checklist: ['Tensión de cable', 'Estado de poleas', 'Paro de emergencia', 'Bitácora firmada'],
    estimatedMinutes: 30,
  },
  {
    id: 'pp_2',
    name: 'Servicio 100 h motor fuera de borda',
    target: { kind: 'category', category: 'boat' },
    frequencyValue: 100,
    frequencyUnit: 'hours',
    lastDoneAt: isoDate(addDays(NOW, -70)),
    nextDueAt: isoDate(addDays(NOW, 4)),
    assignedRole: 'maintenance',
    checklist: ['Cambio de aceite', 'Filtro de combustible', 'Bujías', 'Ánodos de sacrificio', 'Prueba en agua'],
    estimatedMinutes: 180,
  },
  {
    id: 'pp_3',
    name: 'Revisión semanal de chalecos y cascos',
    target: { kind: 'category', category: 'vest' },
    frequencyValue: 1,
    frequencyUnit: 'weeks',
    lastDoneAt: isoDate(addDays(NOW, -6)),
    nextDueAt: isoDate(addDays(NOW, 1)),
    assignedRole: 'supervisor',
    checklist: ['Hebillas y cierres', 'Costuras', 'Flotabilidad', 'Higienizado'],
    estimatedMinutes: 60,
  },
  {
    id: 'pp_4',
    name: 'Rotación y encerado de tablas de renta',
    target: { kind: 'category', category: 'wakeboard' },
    frequencyValue: 1,
    frequencyUnit: 'months',
    lastDoneAt: isoDate(addDays(NOW, -34)),
    nextDueAt: isoDate(addDays(NOW, -3)),
    assignedRole: 'maintenance',
    checklist: ['Revisar cantos', 'Apretar tornillería de fijaciones', 'Encerado de base', 'Actualizar horas de uso'],
    estimatedMinutes: 120,
  },
  {
    id: 'pp_5',
    name: 'Inspección de anclajes del Aqua Park',
    target: { kind: 'category', category: 'inflatable' },
    frequencyValue: 2,
    frequencyUnit: 'weeks',
    lastDoneAt: isoDate(addDays(NOW, -9)),
    nextDueAt: isoDate(addDays(NOW, 5)),
    assignedRole: 'supervisor',
    checklist: ['Presión de módulos', 'Anclajes al fondo', 'Uniones entre módulos', 'Red perimetral'],
    estimatedMinutes: 90,
  },
  {
    id: 'pp_6',
    name: 'AED and first-aid cabinet check',
    target: { kind: 'category', category: 'safety' },
    frequencyValue: 1,
    frequencyUnit: 'months',
    lastDoneAt: isoDate(addDays(NOW, -28)),
    nextDueAt: isoDate(addDays(NOW, 2)),
    assignedRole: 'manager',
    checklist: ['Supplies complete', 'Expiry dates', 'AED battery and pads', 'Signage visible', 'Cintas service log signed'],
    estimatedMinutes: 25,
  },
];

const SUPPLY_SEED: Array<[string, string, string, number, number, number]> = [
  ['Fijaciones de wakeboard (par)', 'Equipo', 'par', 14, 8, 129],
  ['Aletas de repuesto', 'Equipo', 'unidad', 26, 12, 18],
  ['Cuerda de tracción 70ft', 'Equipo', 'unidad', 6, 4, 89],
  ['Manija de wake', 'Equipo', 'unidad', 9, 6, 45],
  ['Cera para base de tabla', 'Equipo', 'lata', 3, 6, 22],
  ['Kit de reparación de fibra', 'Taller', 'kit', 4, 3, 65],
  ['Aceite motor 2T fuera de borda', 'Taller', 'galón', 5, 4, 42],
  ['Nautique fuel filter', 'Taller', 'unidad', 2, 3, 34],
  ['Grasa marina', 'Taller', 'tubo', 7, 4, 12],
  ['Parche PVC para inflables', 'Aqua Park', 'kit', 5, 3, 38],
  ['Cloro / tratamiento de agua', 'Instalaciones', 'galón', 11, 8, 27],
  ['Bloqueador solar SPF50 (venta)', 'Pro Shop', 'unidad', 32, 20, 9],
  ['Pulseras QR desechables', 'Recepción', 'caja x500', 4, 3, 78],
  ['Etiquetas QR resistentes al agua', 'Recepción', 'rollo x1000', 2, 2, 96],
  ['Toallas de cortesía', 'Pro Shop', 'unidad', 48, 30, 6],
  ['Botiquín — vendas y gasas', 'Instalaciones', 'kit', 6, 4, 31],
  ['Baterías radio Motorola', 'Operaciones', 'unidad', 3, 4, 55],
  ['Camisetas Summer Camp', 'Summer Camp', 'unidad', 64, 40, 11],
  ['Bloqueador en spray para camp', 'Summer Camp', 'unidad', 18, 12, 14],
  ['Agua embotellada (caja)', 'Concesión', 'caja x24', 22, 15, 8],
];

export const supplies: Supply[] = SUPPLY_SEED.map(([name_, category, unit, stock, minStock, unitCost], i) => ({
  id: `sup_${i + 1}`,
  name: name_,
  sku: `SKU-${String(2000 + i)}`,
  category,
  unit,
  stock,
  minStock,
  unitCost,
  supplier: pick(rng, ['Buywake', 'West Marine', 'Amazon Business', 'Proveedor local FL', 'Wibit USA']),
  location: pick(rng, LOCATIONS),
  lastRestockAt: isoDate(addDays(NOW, -between(rng, 3, 90))),
}));

/* ───────────────────────────── Summer Camp ─────────────────────────────── */

export const campSessions: CampSession[] = Array.from({ length: 6 }, (_, i) => {
  const weekStart = addDays(startOfWeek(NOW), (i - 1) * 7);
  return {
    id: `cse_${i + 1}`,
    name: `Semana ${i + 1} — ${['Intro al Wake', 'Aqua Adventure', 'Trick Week', 'Aloha Week', 'Rail Jam Jr.', 'Champion Week'][i]}`,
    weekStart: isoDate(weekStart),
    weekEnd: isoDate(addDays(weekStart, 4)),
    capacity: 30,
    price: 385,
    ageMin: 6,
    ageMax: 14,
    counselorIds: employees.filter((e) => e.role === 'instructor' || e.role === 'operator').slice(0, 3).map((e) => e.id),
  };
});

const GROUPS = ['Dolphins', 'Sharks', 'Barracudas', 'Manatees'];
const ALLERGIES = ['Ninguna', 'Ninguna', 'Ninguna', 'Maní', 'Mariscos', 'Polen', 'Lácteos', 'Picadura de abeja'];
const CONDITIONS = ['Ninguna', 'Ninguna', 'Ninguna', 'Asma leve', 'TDAH', 'Otitis recurrente'];

export const campers: Camper[] = Array.from({ length: 42 }, (_, i) => {
  const { firstName, lastName } = name();
  const allergy = pick(rng, ALLERGIES);
  const sessionCount = between(rng, 1, 3);
  const guardianFirst = pick(rng, FIRST);
  return {
    id: `cmp_${i + 1}`,
    firstName,
    lastName,
    dob: `${between(rng, 2011, 2019)}-${String(between(rng, 1, 12)).padStart(2, '0')}-${String(between(rng, 1, 28)).padStart(2, '0')}`,
    sessionIds: Array.from(new Set(Array.from({ length: sessionCount }, () => pick(rng, campSessions).id))),
    groupName: pick(rng, GROUPS),
    tShirtSize: pick(rng, ['YS', 'YM', 'YL', 'AS']),
    guardians: [
      { name: `${guardianFirst} ${lastName}`, relation: pick(rng, ['Madre', 'Padre']), phone: phone(), email: emailFor(guardianFirst, lastName, i), isPrimary: true },
      ...(rng() < 0.6
        ? [{ name: `${pick(rng, FIRST)} ${lastName}`, relation: pick(rng, ['Padre', 'Madre', 'Padrastro']), phone: phone(), email: emailFor(pick(rng, FIRST), lastName, i + 100), isPrimary: false }]
        : []),
    ],
    emergencyContacts: [
      { name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`, relation: pick(rng, ['Abuela', 'Abuelo', 'Tía', 'Tío', 'Vecina']), phone: phone() },
    ],
    authorizedPickup: Array.from({ length: between(rng, 1, 3) }, () => ({
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      relation: pick(rng, ['Abuela', 'Tía', 'Niñera', 'Tío', 'Vecino']),
      phone: phone(),
      idNumber: `FL-${between(rng, 100000, 999999)}`,
    })),
    medical: {
      allergies: allergy,
      conditions: pick(rng, CONDITIONS),
      medications: rng() < 0.2 ? 'Inhalador de rescate según necesidad' : 'Ninguno',
      doctorName: `Dr. ${pick(rng, LAST)}`,
      doctorPhone: phone(),
      insurance: pick(rng, ['Florida Blue', 'Aetna', 'Cigna', 'Ambetter', 'Sin seguro']),
      swimLevel: pick(rng, ['none', 'beginner', 'beginner', 'intermediate', 'strong'] as const),
      epipen: allergy === 'Maní' || allergy === 'Picadura de abeja' ? rng() < 0.7 : false,
    },
    photoRelease: rng() < 0.85,
    waiverSigned: rng() < 0.88,
    balanceDue: rng() < 0.25 ? between(rng, 50, 385) : 0,
    camperCode: `CMP-${String(500 + i)}`,
  };
});

export const campAttendance: CampAttendance[] = (() => {
  const out: CampAttendance[] = [];
  for (let d = 4; d >= 0; d--) {
    const date = isoDate(addDays(NOW, -d));
    for (const c of campers.slice(0, 28)) {
      const roll = rng();
      out.push({
        id: uid('att'),
        camperId: c.id,
        date,
        checkIn: roll < 0.92 ? `0${between(rng, 8, 9)}:${String(between(rng, 0, 59)).padStart(2, '0')}` : undefined,
        checkOut: roll < 0.9 && d > 0 ? `1${between(rng, 5, 7)}:${String(between(rng, 0, 59)).padStart(2, '0')}` : undefined,
        checkedInBy: c.guardians[0].name,
        checkedOutBy: roll < 0.9 && d > 0 ? pick(rng, c.authorizedPickup).name : undefined,
        status: roll < 0.86 ? 'present' : roll < 0.93 ? 'late' : roll < 0.97 ? 'early-pickup' : 'absent',
      });
    }
  }
  return out;
})();

const ACTIVITY_NAMES = [
  ['Calentamiento y charla de seguridad', 'Muelle norte'],
  ['Rotación de cable — System 2.0', 'System 2.0'],
  ['Aqua Park libre', 'Aqua Park'],
  ['Almuerzo y descanso', 'Cabaña central'],
  ['Clínica de trucos', 'Zona de obstáculos'],
  ['Juegos de agua en equipo', 'Playa'],
  ['Taller de cuidado del equipo', 'Pro Shop'],
  ['Cierre del día y premiación', 'Cabaña central'],
];

export const campActivities: CampActivity[] = (() => {
  const out: CampActivity[] = [];
  const session = campSessions[1];
  for (let d = 0; d < 5; d++) {
    const date = isoDate(addDays(session.weekStart, d));
    ACTIVITY_NAMES.forEach(([activityName, location], idx) => {
      out.push({
        id: uid('act'),
        sessionId: session.id,
        date,
        time: `${String(8 + idx).padStart(2, '0')}:30`,
        name: activityName,
        location,
        instructorId: pick(rng, employees.filter((e) => e.role === 'instructor')).id,
        groupName: pick(rng, GROUPS),
        capacity: 12,
      });
    });
  }
  return out;
})();

/* ────────────────────────── Lealtad y marketing ─────────────────────────── */

export const rewards: Reward[] = [
  { id: 'rw_1', name: 'Hora de cable gratis', description: '60 minutos en cable completo, cualquier día.', cost: 900, category: 'ride', active: true, redeemed: 84 },
  { id: 'rw_2', name: 'Entrada al Aqua Park', description: '1 hora de acceso al parque inflable.', cost: 550, category: 'ride', active: true, redeemed: 132 },
  { id: 'rw_3', name: 'Clase privada 1:1', description: '60 min con instructor certificado.', cost: 1800, category: 'experience', active: true, redeemed: 21 },
  { id: 'rw_4', name: 'Camiseta MWS', description: 'Camiseta oficial del complejo.', cost: 700, category: 'retail', active: true, redeemed: 66, stock: 40 },
  { id: 'rw_5', name: 'Gorra + sticker pack', description: 'Gorra bordada y set de calcomanías.', cost: 450, category: 'retail', active: true, redeemed: 98, stock: 25 },
  { id: 'rw_6', name: 'Combo bebida + snack', description: 'Cualquier bebida y snack de la concesión.', cost: 200, category: 'food', active: true, redeemed: 310 },
  { id: 'rw_7', name: 'Trae un amigo gratis', description: 'Pase de 1 hora para un acompañante.', cost: 1200, category: 'ride', active: true, redeemed: 45 },
  { id: 'rw_8', name: 'Cumpleaños: pastel + reservado', description: 'Mesa reservada y pastel para 10 personas.', cost: 2500, category: 'experience', active: false, redeemed: 7 },
];

export const pointsLedger: PointsLedgerEntry[] = customers.flatMap((c) =>
  Array.from({ length: between(rng, 2, 8) }, () => {
    const isRedeem = rng() < 0.22;
    const reward = pick(rng, rewards);
    return {
      id: uid('pl'),
      customerId: c.id,
      date: addDays(NOW, -between(rng, 1, 300)).toISOString(),
      points: isRedeem ? -reward.cost : between(rng, 30, 190),
      type: isRedeem ? ('redeem' as const) : rng() < 0.15 ? ('bonus' as const) : ('earn' as const),
      reason: isRedeem ? `Canje: ${reward.name}` : pick(rng, ['Sesión de cable', 'Compra en pro shop', 'Reseña en Google', 'Referido de amigo', 'Aqua Park', 'Clase con instructor']),
    };
  }),
);

export const segments: Segment[] = [
  { id: 'seg_1', name: 'Riders frecuentes', description: '10 o más visitas de por vida', match: (c) => c.visits >= 10, color: 'bg-lagoon-100 text-lagoon-800' },
  { id: 'seg_2', name: 'En riesgo de fuga', description: 'Sin visitar hace más de 90 días', match: (c) => !!c.lastVisitAt && Date.now() - new Date(c.lastVisitAt).getTime() > 90 * 864e5, color: 'bg-rose-100 text-rose-800' },
  { id: 'seg_3', name: 'Nuevos del mes', description: 'Registrados en los últimos 30 días', match: (c) => Date.now() - new Date(c.createdAt).getTime() < 30 * 864e5, color: 'bg-emerald-100 text-emerald-800' },
  { id: 'seg_4', name: 'Familias con menores', description: 'Clientes menores de edad o con tutor', match: (c) => c.isMinor, color: 'bg-amber-100 text-amber-800' },
  { id: 'seg_5', name: 'Alto valor', description: 'Más de $2,000 gastados', match: (c) => c.lifetimeSpend > 2000, color: 'bg-indigo-100 text-indigo-800' },
  { id: 'seg_6', name: 'Principiantes', description: 'Nivel principiante — candidatos a clase', match: (c) => c.skillLevel === 'beginner', color: 'bg-slate-100 text-slate-800' },
];

export const campaigns: Campaign[] = [
  { id: 'cmp_1', name: 'Vuelve al agua — 20% off', channel: 'email', segmentId: 'seg_2', status: 'sent', subject: 'Te extrañamos en el cable 🌊', preview: 'Tu tabla te espera. 20% en tu próxima hora.', sentAt: addDays(NOW, -12).toISOString(), recipients: 214, opened: 118, clicked: 41, revenue: 2870 },
  { id: 'cmp_2', name: 'Inscripciones Summer Camp', channel: 'email', segmentId: 'seg_4', status: 'sent', subject: 'Cupos abiertos: Summer Camp 2026', preview: 'Semanas temáticas, instructores certificados, cupo limitado.', sentAt: addDays(NOW, -26).toISOString(), recipients: 96, opened: 71, clicked: 34, revenue: 11550 },
  { id: 'cmp_3', name: 'Rider del mes + puntos dobles', channel: 'email', segmentId: 'seg_1', status: 'scheduled', subject: 'Puntos dobles todo el fin de semana', preview: 'Solo para nuestros riders frecuentes.', scheduledAt: addDays(NOW, 3).toISOString(), recipients: 187, opened: 0, clicked: 0, revenue: 0 },
  { id: 'cmp_4', name: 'Clase de iniciación 2x1', channel: 'sms', segmentId: 'seg_6', status: 'draft', subject: '', preview: 'MWS: Trae un amigo a tu primera clase, 2x1 este mes. Responde STOP para salir.', recipients: 0, opened: 0, clicked: 0, revenue: 0 },
  { id: 'cmp_5', name: 'Bienvenida automatizada', channel: 'email', segmentId: 'seg_3', status: 'sending', subject: 'Bienvenido a Miami Water Sports 🤙', preview: 'Cómo funciona el cable, tips y tu primer bono de puntos.', sentAt: addDays(NOW, -1).toISOString(), recipients: 38, opened: 22, clicked: 9, revenue: 410 },
];
