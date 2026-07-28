import {
  Activity,
  BarChart3,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Package,
  ScanLine,
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
}

const ALL: Role[] = ['owner', 'manager', 'supervisor', 'operator', 'instructor', 'frontdesk', 'maintenance'];
const LEADERSHIP: Role[] = ['owner', 'manager'];
const FLOOR: Role[] = ['owner', 'manager', 'supervisor', 'operator', 'frontdesk'];

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL, group: 'General' },

  { to: '/operations', label: 'Live operations', icon: Activity, roles: [...FLOOR, 'instructor'], group: 'Operations', badgeKey: 'activeSessions' },
  { to: '/scanner', label: 'Lap scanner', icon: ScanLine, roles: [...FLOOR, 'instructor'], group: 'Operations' },
  { to: '/check-in', label: 'Check-in & gear', icon: LifeBuoy, roles: FLOOR, group: 'Operations' },
  { to: '/reservations', label: 'Reservations', icon: CalendarDays, roles: FLOOR, group: 'Operations' },

  { to: '/customers', label: 'Customers', icon: Users, roles: [...FLOOR, 'instructor'], group: 'Customers' },
  { to: '/waivers', label: 'Waivers', icon: FileSignature, roles: FLOOR, group: 'Customers', badgeKey: 'pendingWaivers' },
  { to: '/loyalty', label: 'Loyalty & points', icon: Gift, roles: FLOOR, group: 'Customers' },
  { to: '/marketing', label: 'Marketing & CRM', icon: Megaphone, roles: LEADERSHIP, group: 'Customers' },

  { to: '/summer-camp', label: 'Summer Camp', icon: Sun, roles: [...FLOOR, 'instructor'], group: 'Programs' },

  { to: '/assets', label: 'Assets & inventory', icon: Boxes, roles: [...LEADERSHIP, 'supervisor', 'maintenance', 'operator'], group: 'Resources' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ALL, group: 'Resources', badgeKey: 'openTickets' },
  { to: '/supplies', label: 'Supplies', icon: Package, roles: [...LEADERSHIP, 'supervisor', 'maintenance'], group: 'Resources', badgeKey: 'lowStock' },

  { to: '/employees', label: 'Employees', icon: Users, roles: LEADERSHIP, group: 'Team' },
  { to: '/schedule', label: 'Scheduling', icon: ClipboardCheck, roles: [...LEADERSHIP, 'supervisor'], group: 'Team' },

  { to: '/reports', label: 'Reports', icon: BarChart3, roles: [...LEADERSHIP, 'supervisor'], group: 'Analytics' },
  { to: '/settings', label: 'Settings', icon: Settings, roles: LEADERSHIP, group: 'Analytics' },
];

export const GROUP_ORDER = ['General', 'Operations', 'Customers', 'Programs', 'Resources', 'Team', 'Analytics'];

export const BRAND_ICON = Waves;
