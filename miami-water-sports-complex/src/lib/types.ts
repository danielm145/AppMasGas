/**
 * Modelo de dominio — Miami Watersports Complex (Hialeah, FL)
 *
 * Un solo lugar donde vive la forma de los datos. El prototipo trabaja contra
 * datos en memoria (ver `data/seed.ts`), pero estos tipos son los mismos que
 * espera consumir la futura API, así que el salto a backend real no cambia la UI.
 */

/* ─────────────────────────── Personas y accesos ─────────────────────────── */

export type Role =
  | 'owner'
  | 'manager'
  | 'supervisor'
  | 'operator'
  | 'instructor'
  | 'frontdesk'
  | 'maintenance';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  supervisor: 'Supervisor',
  operator: 'Cable operator',
  instructor: 'Instructor',
  frontdesk: 'Front desk',
  maintenance: 'Maintenance',
};

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

/* ──────────────────────────────── Clientes ──────────────────────────────── */

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

/**
 * El cartel del mostrador es explícito: "MUST KNOW HOW TO SWIM." No es un dato
 * de perfil, es una condición de entrada al agua que recepción debe confirmar.
 */
export type SwimDeclaration = 'declared' | 'refused' | 'pending';
export type LoyaltyTier = 'splash' | 'rider' | 'pro' | 'legend';

export const TIER_META: Record<
  LoyaltyTier,
  { label: string; min: number; color: string; perks: string[] }
> = {
  splash: {
    label: 'Splash',
    min: 0,
    color: 'bg-slate-100 text-slate-700 ring-slate-200',
    perks: ['1 pt per $1 spent', 'Newsletter and offers'],
  },
  rider: {
    label: 'Rider',
    min: 500,
    color: 'bg-lagoon-100 text-lagoon-800 ring-lagoon-200',
    perks: ['1.25 pts per $1', '10% off pro shop', 'Free helmet rental'],
  },
  pro: {
    label: 'Pro',
    min: 1500,
    color: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
    perks: ['1.5 pts per $1', '15% off pro shop', 'Priority booking'],
  },
  legend: {
    label: 'Legend',
    min: 4000,
    color: 'bg-amber-100 text-amber-800 ring-amber-200',
    perks: ['2 pts per $1', '20% off pro shop', 'One free guest per month', 'Early-bird access'],
  },
};

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string; // ISO date
  city: string;
  state: string;
  zip: string;
  photoUrl?: string;
  createdAt: string;
  skillLevel: SkillLevel;
  emergencyContact: EmergencyContact;
  isMinor: boolean;
  guardianName?: string;
  guardianPhone?: string;
  /** Declaración de que sabe nadar — obligatoria para entrar al agua. */
  canSwim: SwimDeclaration;
  /** Recepción verificó una identificación con foto ("PLEASE HAVE YOUR ID READY"). */
  idVerified: boolean;
  marketingOptIn: boolean;
  smsOptIn: boolean;
  points: number;
  lifetimePoints: number;
  tier: LoyaltyTier;
  visits: number;
  lifetimeSpend: number;
  lastVisitAt?: string;
  tags: string[];
  notes?: string;
  /** Código permanente del cliente; es lo que codifica su pulsera/QR. */
  memberCode: string;
}

/* ───────────────────────── Waivers (responsabilidad) ────────────────────── */

export type WaiverType = 'liability' | 'summer-camp' | 'photo-release' | 'minor-consent';

export const WAIVER_LABELS: Record<WaiverType, string> = {
  liability: 'Liability waiver',
  'summer-camp': 'Summer Camp authorization',
  'photo-release': 'Photo release',
  'minor-consent': 'Minor consent',
};

export interface Waiver {
  id: string;
  customerId?: string;
  camperId?: string;
  type: WaiverType;
  version: string;
  signedAt: string;
  expiresAt: string;
  signerName: string;
  /** Firma capturada en canvas, guardada como data URL. */
  signatureDataUrl?: string;
  ipAddress: string;
  witnessedBy?: string;
  minor: boolean;
  guardianName?: string;
}

/* ──────────────────────── Activos e inventario duro ─────────────────────── */

export type AssetCategory =
  | 'wakeboard'
  | 'wakeskate'
  | 'kneeboard'
  | 'helmet'
  | 'vest'
  | 'boat'
  | 'obstacle'
  | 'cable-system'
  | 'inflatable'
  | 'safety'
  | 'other';

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  wakeboard: 'Wakeboard',
  wakeskate: 'Wakeskate',
  kneeboard: 'Kneeboard',
  helmet: 'Helmet',
  vest: 'Life vest',
  boat: 'Boat',
  obstacle: 'Obstacle / kicker',
  'cable-system': 'Cable system',
  inflatable: 'Inflatable (aqua park)',
  safety: 'Safety equipment',
  other: 'Other',
};

export type AssetStatus = 'available' | 'in-use' | 'maintenance' | 'retired' | 'lost';
export type AssetCondition = 'new' | 'good' | 'fair' | 'poor' | 'retired';

export interface Asset {
  id: string;
  code: string; // MWC-BRD-014
  name: string;
  category: AssetCategory;
  brand: string;
  model: string;
  size?: string;
  serial?: string;
  photoUrl?: string;
  purchaseDate: string;
  purchasePrice: number;
  vendor?: string;
  condition: AssetCondition;
  status: AssetStatus;
  location: string;
  /** Casillero rotulado del pro shop (A1, B3, C2…) donde vive la pieza. */
  storageSlot?: string;
  /** Horas de uso acumuladas — dispara el mantenimiento preventivo. */
  usageHours: number;
  serviceIntervalHours?: number;
  lastServiceAt?: string;
  nextServiceAt?: string;
  assignedTo?: string; // customerId mientras está en uso
  notes?: string;
}

export type AssetEventType =
  | 'purchase'
  | 'assignment'
  | 'return'
  | 'damage'
  | 'maintenance'
  | 'inspection'
  | 'transfer'
  | 'retire'
  | 'note';

export const ASSET_EVENT_LABELS: Record<AssetEventType, string> = {
  purchase: 'Purchase',
  assignment: 'Checked out',
  return: 'Returned',
  damage: 'Damage reported',
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  transfer: 'Transfer',
  retire: 'Retired',
  note: 'Note',
};

export interface AssetEvent {
  id: string;
  assetId: string;
  type: AssetEventType;
  date: string;
  description: string;
  cost?: number;
  performedBy: string;
  hoursAtEvent?: number;
  photoUrl?: string;
}

/* ───────────────────────────── Operación / rides ────────────────────────── */

export type CableLine = 'full-cable' | 'system-2' | 'kicker' | 'aqua-park' | 'wakesurf' | 'tubing';

export const LINE_LABELS: Record<CableLine, string> = {
  'full-cable': 'Full cable (5 towers)',
  'system-2': 'System 2.0 (beginners)',
  kicker: 'Obstacle zone',
  'aqua-park': 'Aqua park',
  wakesurf: 'Wakesurf (boat)',
  tubing: 'Tubing (boat)',
};

export type PackageType =
  | 'hour-1'
  | 'hour-2'
  | 'half-day'
  | 'full-day'
  | 'season-pass'
  | 'lesson'
  | 'aqua-park'
  | 'wakesurf'
  | 'tubing'
  | 'birthday'
  | 'corporate'
  | 'camp';

export const PACKAGE_META: Record<PackageType, { label: string; minutes: number; price: number }> = {
  'hour-1': { label: '1-hour cable pass', minutes: 60, price: 45 },
  'hour-2': { label: '2-hour cable pass', minutes: 120, price: 75 },
  'half-day': { label: 'Half day', minutes: 240, price: 110 },
  'full-day': { label: 'Full day', minutes: 480, price: 150 },
  'season-pass': { label: 'Season pass', minutes: 480, price: 899 },
  lesson: { label: 'Private lesson', minutes: 60, price: 95 },
  'aqua-park': { label: 'Aqua park (1h)', minutes: 60, price: 30 },
  wakesurf: { label: 'Wakesurf session (boat)', minutes: 60, price: 220 },
  tubing: { label: 'Tubing session (boat)', minutes: 60, price: 180 },
  birthday: { label: 'Birthday party', minutes: 180, price: 650 },
  corporate: { label: 'Corporate event', minutes: 240, price: 1800 },
  camp: { label: 'Summer Camp (day)', minutes: 480, price: 85 },
};

export type SessionStatus = 'active' | 'completed' | 'no-show' | 'paused';

export interface RideSession {
  id: string;
  customerId: string;
  /** Código impreso en la pulsera / pegado al casco. Es el que se escanea. */
  wristbandCode: string;
  packageType: PackageType;
  line: CableLine;
  startAt: string;
  endAt?: string;
  minutesPurchased: number;
  lapsCompleted: number;
  falls: number;
  assignedAssetIds: string[];
  operatorId: string;
  status: SessionStatus;
  amountPaid: number;
  pointsEarned: number;
}

export interface LapLog {
  id: string;
  sessionId: string;
  customerId: string;
  wristbandCode: string;
  timestamp: string;
  line: CableLine;
  durationSec: number;
  completed: boolean; // false = se cayó antes de terminar la vuelta
  operatorId: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'checked-in' | 'cancelled' | 'no-show';

export interface Reservation {
  id: string;
  customerId: string;
  date: string;
  time: string;
  packageType: PackageType;
  partySize: number;
  status: ReservationStatus;
  source: 'web' | 'phone' | 'walk-in' | 'app' | 'groupon';
  total: number;
  paid: boolean;
  notes?: string;
}

/* ─────────────────────────────── Empleados ──────────────────────────────── */

export interface Certification {
  name: string;
  issuedAt: string;
  expiresAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  hireDate: string;
  status: 'active' | 'inactive' | 'seasonal';
  hourlyRate: number;
  photoUrl?: string;
  certifications: Certification[];
  emergencyContact: EmergencyContact;
  weeklyHourTarget: number;
}

export type ShiftStatus = 'draft' | 'published' | 'confirmed' | 'swap-requested';

export interface Shift {
  id: string;
  employeeId: string;
  date: string; // ISO date
  start: string; // '09:00'
  end: string; // '17:00'
  position: string;
  status: ShiftStatus;
  notes?: string;
}

/* ──────────────────────── Mantenimiento y suministros ───────────────────── */

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'open' | 'in-progress' | 'waiting-parts' | 'resolved' | 'closed';

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  'in-progress': 'In progress',
  'waiting-parts': 'Waiting for parts',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export interface MaintenanceTicket {
  id: string;
  code: string; // MT-0142
  title: string;
  description: string;
  assetId?: string;
  area: string;
  priority: TicketPriority;
  status: TicketStatus;
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  dueAt?: string;
  resolvedAt?: string;
  resolution?: string;
  laborHours?: number;
  cost?: number;
  photoUrl?: string;
  /** Bloquea el activo: si es true no se puede rentar mientras esté abierto. */
  blocksAsset: boolean;
}

export type FrequencyUnit = 'hours' | 'days' | 'weeks' | 'months';

export interface PreventivePlan {
  id: string;
  name: string;
  target: { kind: 'asset'; assetId: string } | { kind: 'category'; category: AssetCategory } | { kind: 'area'; area: string };
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
  lastDoneAt: string;
  nextDueAt: string;
  assignedRole: Role;
  checklist: string[];
  estimatedMinutes: number;
}

export interface Supply {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  unitCost: number;
  supplier: string;
  location: string;
  lastRestockAt: string;
}

/* ───────────────────────────── Summer Camp ──────────────────────────────── */

export type SwimLevel = 'none' | 'beginner' | 'intermediate' | 'strong';

export const SWIM_LEVEL_LABELS: Record<SwimLevel, string> = {
  none: 'Non-swimmer',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  strong: 'Strong swimmer',
};

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface AuthorizedPickup {
  name: string;
  relation: string;
  phone: string;
  idNumber: string;
}

export interface CamperMedical {
  allergies: string;
  conditions: string;
  medications: string;
  doctorName: string;
  doctorPhone: string;
  insurance: string;
  swimLevel: SwimLevel;
  epipen: boolean;
}

export interface CampSession {
  id: string;
  name: string;
  weekStart: string;
  weekEnd: string;
  capacity: number;
  price: number;
  ageMin: number;
  ageMax: number;
  counselorIds: string[];
}

export interface Camper {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  photoUrl?: string;
  sessionIds: string[];
  groupName: string;
  tShirtSize: string;
  guardians: Guardian[];
  emergencyContacts: EmergencyContact[];
  authorizedPickup: AuthorizedPickup[];
  medical: CamperMedical;
  photoRelease: boolean;
  waiverSigned: boolean;
  balanceDue: number;
  notes?: string;
  /** Código QR del camper — mismo mecanismo que la pulsera de riders. */
  camperCode: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early-pickup';

export interface CampAttendance {
  id: string;
  camperId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  status: AttendanceStatus;
}

export interface CampActivity {
  id: string;
  sessionId: string;
  date: string;
  time: string;
  name: string;
  location: string;
  instructorId: string;
  groupName: string;
  capacity: number;
}

/* ───────────────────────────── Rain checks ──────────────────────────────── */

/**
 * Cuando cae un rayo el lago se cierra y la gente que ya pagó o estaba en fila
 * queda esperando. En vez de apuntarlos en papel, se registran aquí: quedan en
 * la base de clientes, reciben un pase con QR para volver otro día y la lista
 * completa se exporta en PDF.
 */
export type RainCheckStatus = 'issued' | 'redeemed' | 'expired';

export interface RainCheck {
  id: string;
  code: string; // RC-0001
  customerId: string;
  issuedAt: string;
  expiresAt: string;
  reason: string;
  packageType: PackageType;
  /** Minutos que le quedaban sin usar cuando se cerró el lago. */
  minutesOwed: number;
  status: RainCheckStatus;
  redeemedAt?: string;
  issuedBy: string;
  notes?: string;
}

/* ───────────────────────── Lealtad, marketing, CRM ──────────────────────── */

export type LedgerType = 'earn' | 'redeem' | 'bonus' | 'expire' | 'adjust';

export interface PointsLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  points: number; // negativo al canjear
  type: LedgerType;
  reason: string;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'ride' | 'retail' | 'food' | 'experience';
  active: boolean;
  redeemed: number;
  stock?: number;
}

export type CampaignChannel = 'email' | 'sms' | 'push';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';

export interface Segment {
  id: string;
  name: string;
  description: string;
  /** Predicado evaluado sobre el listado de clientes. */
  match: (c: Customer) => boolean;
  color: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  segmentId: string;
  status: CampaignStatus;
  subject: string;
  preview: string;
  scheduledAt?: string;
  sentAt?: string;
  recipients: number;
  opened: number;
  clicked: number;
  revenue: number;
}

/* ─────────────────────────────── Utilidades ─────────────────────────────── */

export interface Notification {
  id: string;
  kind: 'maintenance' | 'stock' | 'waiver' | 'schedule' | 'camp' | 'safety';
  title: string;
  detail: string;
  at: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  href?: string;
}
