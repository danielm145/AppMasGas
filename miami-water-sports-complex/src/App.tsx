import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useStore } from './lib/store';
import { NAV } from './lib/nav';

import Dashboard from './pages/Dashboard';
import LiveOps from './pages/LiveOps';
import Scanner from './pages/Scanner';
import CheckIn from './pages/CheckIn';
import Dock from './pages/Dock';
import RainCheck from './pages/RainCheck';
import SelfRegister from './pages/SelfRegister';
import Reservations from './pages/Reservations';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Waivers from './pages/Waivers';
import Loyalty from './pages/Loyalty';
import Memberships from './pages/Memberships';
import Marketing from './pages/Marketing';
import SummerCamp from './pages/SummerCamp';
import CamperDetail from './pages/CamperDetail';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Maintenance from './pages/Maintenance';
import Supplies from './pages/Supplies';
import Employees from './pages/Employees';
import Schedule from './pages/Schedule';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { EmptyState } from './components/ui';
import { ShieldOff } from 'lucide-react';

/** Bloquea rutas que el rol activo no tiene permitidas. */
function Guard({ path, children }: { path: string; children: ReactElement }) {
  const { role } = useStore();
  const item = NAV.find((n) => n.to === path);
  if (item && !item.roles.includes(role)) {
    return (
      <EmptyState
        icon={<ShieldOff className="h-6 w-6" />}
        title="No access to this module"
        description="Your current role cannot view this section. Switch user in the top-right corner or ask an administrator for access."
      />
    );
  }
  return children;
}

/**
 * El personal de muelle no tiene nada que hacer en el dashboard, así que su
 * pantalla de inicio es el muelle.
 */
function Home() {
  const { role } = useStore();
  return role === 'dock' ? <Navigate to="/dock" replace /> : <Dashboard />;
}

export default function App() {
  return (
    <Routes>
      {/* Página pública del cliente — sin barra lateral ni sesión */}
      <Route path="register" element={<SelfRegister />} />
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="dock" element={<Guard path="/dock"><Dock /></Guard>} />

        <Route path="operations" element={<Guard path="/operations"><LiveOps /></Guard>} />
        <Route path="scanner" element={<Guard path="/scanner"><Scanner /></Guard>} />
        <Route path="check-in" element={<Guard path="/check-in"><CheckIn /></Guard>} />
        <Route path="rain-check" element={<Guard path="/rain-check"><RainCheck /></Guard>} />
        <Route path="reservations" element={<Guard path="/reservations"><Reservations /></Guard>} />

        <Route path="customers" element={<Guard path="/customers"><Customers /></Guard>} />
        <Route path="customers/:id" element={<Guard path="/customers"><CustomerDetail /></Guard>} />
        <Route path="memberships" element={<Guard path="/memberships"><Memberships /></Guard>} />
        <Route path="waivers" element={<Guard path="/waivers"><Waivers /></Guard>} />
        <Route path="loyalty" element={<Guard path="/loyalty"><Loyalty /></Guard>} />
        <Route path="marketing" element={<Guard path="/marketing"><Marketing /></Guard>} />

        <Route path="summer-camp" element={<Guard path="/summer-camp"><SummerCamp /></Guard>} />
        <Route path="summer-camp/:id" element={<Guard path="/summer-camp"><CamperDetail /></Guard>} />

        <Route path="assets" element={<Guard path="/assets"><Assets /></Guard>} />
        <Route path="assets/:id" element={<Guard path="/assets"><AssetDetail /></Guard>} />
        <Route path="maintenance" element={<Guard path="/maintenance"><Maintenance /></Guard>} />
        <Route path="supplies" element={<Guard path="/supplies"><Supplies /></Guard>} />

        <Route path="employees" element={<Guard path="/employees"><Employees /></Guard>} />
        <Route path="schedule" element={<Guard path="/schedule"><Schedule /></Guard>} />

        <Route path="reports" element={<Guard path="/reports"><Reports /></Guard>} />
        <Route path="settings" element={<Guard path="/settings"><Settings /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
