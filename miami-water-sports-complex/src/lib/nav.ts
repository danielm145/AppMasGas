import {
  Activity,
  Anchor,
  CloudLightning,
  BarChart3,
  Boxes,
  CalendarDays,
  CreditCard,
  FileSignature,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  Settings,
  Sun,
  Users,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from './types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  group: string;
  badgeKey?: 'openTickets' | 'lowStock' | 'activeSessions' | 'pendingWaivers';
  /** Visible in Simple mode — the eight screens the park uses every day. */
  simple?: boolean;
  /** One line explaining what the screen is for, shown in the guided tour. */
  purpose?: string;
}

const ALL: Role[] = ['owner', 'manager', 'supervisor', 'operator', 'instructor', 'frontdesk', 'maintenance'];
/** El muelle ve una sola pantalla; leadership la ve para poder revisarla. */
const DOCK: Role[] = ['dock', 'owner', 'manager'];
const LEADERSHIP: Role[] = ['owner', 'manager'];
const FLOOR: Role[] = ['owner', 'manager', 'supervisor', 'operator', 'frontdesk'];

export const NAV: NavItem[] = [
  { to: '/dock', label: 'Line queue', icon: Anchor, roles: [...DOCK, 'supervisor', 'operator', 'frontdesk'], group: 'Operations', simple: true, purpose: 'The queue for each line. Riders scan their wristband to get in; the operator sends out whoever is next.' },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL, group: 'General', simple: true, purpose: 'The whole park at a glance: money, how busy each line is, and anything that needs your attention today.' },

  { to: '/operations', label: 'Live operations', icon: Activity, roles: [...FLOOR, 'instructor'], group: 'Operations', badgeKey: 'activeSessions', simple: true, purpose: 'Who is on the water right now, how much time they have left, and their gear.' },
  { to: '/rain-check', label: 'Lightning hold', icon: CloudLightning, roles: FLOOR, group: 'Operations', simple: true, purpose: 'When the lake closes for weather, the waiting line registers here instead of on paper — passes, PDF list and a self-register QR.' },
  { to: '/check-in', label: 'Check-in & gear', icon: LifeBuoy, roles: FLOOR, group: 'Operations', simple: true, purpose: 'Everything the front desk does: find the customer, sign the waiver, charge, hand out the helmet and board.' },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays, roles: FLOOR, group: 'Operations' },

  { to: '/customers', label: 'Customers', icon: Users, roles: [...FLOOR, 'instructor'], group: 'Customers', simple: true, purpose: 'Every customer, how often they come and how much they spend. This is what marketing runs on.' },
  { to: '/memberships', label: 'Memberships', icon: CreditCard, roles: FLOOR, group: 'Customers', simple: true, purpose: 'Monthly and annual members — the money that comes in whether it rains or not, and who to call before their plan lapses.' },
  { to: '/waivers', label: 'Waivers', icon: FileSignature, roles: FLOOR, group: 'Customers', badgeKey: 'pendingWaivers' },
  { to: '/loyalty', label: 'Loyalty & points', icon: Gift, roles: FLOOR, group: 'Customers' },
  { to: '/marketing', label: 'Marketing & CRM', icon: Megaphone, roles: LEADERSHIP, group: 'Customers' },

  { to: '/summer-camp', label: 'Summer Camp', icon: Sun, roles: [...FLOOR, 'instructor'], group: 'Programs', purpose: 'Kids, their allergies, who is allowed to pick them up, and daily attendance.' },

  { to: '/assets', label: 'Assets & inventory', icon: Boxes, roles: [...LEADERSHIP, 'supervisor', 'maintenance', 'operator'], group: 'Resources', simple: true, purpose: 'Every board, helmet, vest and boat with its photo, its cost and its full history.' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ALL, group: 'Resources', badgeKey: 'openTickets', simple: true, purpose: 'Anyone reports damage from their phone; you see what is broken and what it cost to fix.' },
  { to: '/supplies', label: 'Supplies', icon: Package, roles: [...LEADERSHIP, 'supervisor', 'maintenance'], group: 'Resources', badgeKey: 'lowStock' },

  { to: '/employees', label: 'Employees', icon: Users, roles: LEADERSHIP, group: 'Team' },

  { to: '/reports', label: 'Reports', icon: BarChart3, roles: [...LEADERSHIP, 'supervisor'], group: 'Analytics' },
  { to: '/settings', label: 'Settings', icon: Settings, roles: LEADERSHIP, group: 'Analytics' },
];

export const GROUP_ORDER = ['General', 'Operations', 'Customers', 'Programs', 'Resources', 'Team', 'Analytics'];

export const BRAND_ICON = Waves;
