/**
 * Derivaciones analíticas sobre el estado. Todo se calcula en memoria a partir
 * de las vueltas escaneadas (`lapLogs`) y las sesiones, que es exactamente lo
 * que produciría la operación real con el escaneo de QR en el muelle.
 */

import { addDays, groupBy, isoDate, sum } from './utils';
import type { AppState } from './store';
import type { CableLine, RideSession } from './types';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Actividad por hora del día, contada desde las sesiones que arrancaron en cada
 * franja. Antes se calculaba sumando cada vuelta escaneada; la sesión da la
 * misma curva de horas pico sin guardar una fila por vuelta.
 */
export function lapsByHour(sessions: RideSession[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, label: `${hour}:00`, laps: 0, days: new Set<string>() }));
  sessions.forEach((s) => {
    const d = new Date(s.startAt);
    const b = buckets[d.getHours()];
    b.laps += Math.max(1, s.turnsUsed);
    b.days.add(isoDate(d));
  });
  return buckets
    .filter((b) => b.hour >= 8 && b.hour <= 20)
    .map((b) => ({
      hour: b.hour,
      label: `${b.hour > 12 ? b.hour - 12 : b.hour}${b.hour >= 12 ? 'pm' : 'am'}`,
      laps: b.laps,
      dailyAverage: b.days.size ? Math.round(b.laps / b.days.size) : 0,
    }));
}

/** Mapa de calor día × hora: el insumo para decidir staffing. */
export function heatmap(sessions: RideSession[]) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(13).fill(0));
  sessions.forEach((s) => {
    const d = new Date(s.startAt);
    const h = d.getHours();
    if (h < 8 || h > 20) return;
    grid[d.getDay()][h - 8] += Math.max(1, s.turnsUsed);
  });
  const max = Math.max(1, ...grid.flat());
  return { grid, max, hours: Array.from({ length: 13 }, (_, i) => i + 8) };
}

/** Sesiones activas por línea → nivel de congestión en vivo. */
export function congestion(sessions: RideSession[]) {
  const CAPACITY: Record<CableLine, number> = {
    'full-cable': 10,
    'system-2': 6,
    kicker: 4,
    'aqua-park': 40,
    wakesurf: 4,
    tubing: 6,
  };
  const active = sessions.filter((s) => s.status === 'active');
  const byLine = groupBy(active, (s) => s.line);
  return (Object.keys(CAPACITY) as CableLine[]).map((line) => {
    const current = byLine[line]?.length ?? 0;
    const capacity = CAPACITY[line];
    const load = current / capacity;
    return {
      line,
      current,
      capacity,
      load,
      level: load >= 0.9 ? ('saturated' as const) : load >= 0.6 ? ('high' as const) : load >= 0.3 ? ('moderate' as const) : ('open' as const),
    };
  });
}

/** Serie diaria de ingresos y visitas para los últimos `days` días. */
export function dailySeries(sessions: RideSession[], days = 30) {
  const start = addDays(new Date(), -(days - 1));
  const byDay = groupBy(
    sessions.filter((s) => new Date(s.startAt) >= start),
    (s) => isoDate(new Date(s.startAt)),
  );
  return Array.from({ length: days }, (_, i) => {
    const date = isoDate(addDays(start, i));
    const list = byDay[date] ?? [];
    return {
      date,
      label: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      revenue: sum(list, (s) => s.amountPaid),
      visits: list.length,
      laps: sum(list, (s) => s.turnsUsed),
    };
  });
}

/** Reparto de ingresos por paquete. */
export function revenueByPackage(sessions: RideSession[], days = 30) {
  const start = addDays(new Date(), -days);
  const recent = sessions.filter((s) => new Date(s.startAt) >= start);
  const byPkg = groupBy(recent, (s) => s.packageType);
  return Object.entries(byPkg)
    .map(([pkg, list]) => ({ pkg, revenue: sum(list, (s) => s.amountPaid), sessions: list.length }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Ranking de riders por turnos en la ventana dada — insumo de fidelización. */
export function topRiders(state: AppState, days = 30, limit = 8) {
  const start = addDays(new Date(), -days);
  const recent = state.rideSessions.filter((s) => new Date(s.startAt) >= start);
  const byCustomer = groupBy(recent, (s) => s.customerId);
  return Object.entries(byCustomer)
    .map(([customerId, sessions]) => {
      const customer = state.customers.find((c) => c.id === customerId);
      return {
        customer,
        laps: sum(sessions, (s) => s.turnsUsed),
        visitDays: new Set(sessions.map((s) => isoDate(new Date(s.startAt)))).size,
        completionRate: 1,
      };
    })
    .filter((r) => r.customer)
    .sort((a, b) => b.laps - a.laps)
    .slice(0, limit);
}

/** Frecuencia de repetición: cuántos clientes vienen 1, 2, 3–5, 6+ veces al mes. */
export function repeatDistribution(state: AppState, days = 30) {
  const start = addDays(new Date(), -days);
  const recent = state.rideSessions.filter((s) => new Date(s.startAt) >= start);
  const visitsPerCustomer = Object.values(groupBy(recent, (s) => s.customerId)).map(
    (list) => new Set(list.map((s) => isoDate(new Date(s.startAt)))).size,
  );
  const buckets = [
    { label: '1 visit', min: 1, max: 1 },
    { label: '2 visits', min: 2, max: 2 },
    { label: '3–5 visits', min: 3, max: 5 },
    { label: '6+ visits', min: 6, max: Infinity },
  ];
  return buckets.map((b) => ({
    label: b.label,
    customers: visitsPerCustomer.filter((v) => v >= b.min && v <= b.max).length,
  }));
}

/** KPIs de portada del dashboard, con comparación contra el período anterior. */
export function headlineKpis(state: AppState) {
  const now = Date.now();
  const in30 = state.rideSessions.filter((s) => now - new Date(s.startAt).getTime() < 30 * 864e5);
  const prev30 = state.rideSessions.filter((s) => {
    const t = now - new Date(s.startAt).getTime();
    return t >= 30 * 864e5 && t < 60 * 864e5;
  });

  const revenue = sum(in30, (s) => s.amountPaid);
  const prevRevenue = sum(prev30, (s) => s.amountPaid);
  const laps = sum(in30, (s) => s.turnsUsed);
  const prevLaps = sum(prev30, (s) => s.turnsUsed);
  const uniques = new Set(in30.map((s) => s.customerId)).size;
  const prevUniques = new Set(prev30.map((s) => s.customerId)).size;

  const delta = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b);

  return {
    revenue,
    revenueDelta: delta(revenue, prevRevenue),
    sessions: in30.length,
    sessionsDelta: delta(in30.length, prev30.length),
    laps,
    lapsDelta: delta(laps, prevLaps),
    uniques,
    uniquesDelta: delta(uniques, prevUniques),
    avgTicket: in30.length ? revenue / in30.length : 0,
    activeNow: state.rideSessions.filter((s) => s.status === 'active').length,
    openTickets: state.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length,
    lowStock: state.supplies.filter((s) => s.stock <= s.minStock).length,
    assetsDown: state.assets.filter((a) => a.status === 'maintenance').length,
  };
}

/** Utilización de la flota de tablas/cascos/chalecos. */
export function fleetUtilization(state: AppState) {
  const rentable = state.assets.filter((a) => ['wakeboard', 'wakeskate', 'kneeboard', 'helmet', 'vest'].includes(a.category));
  const inUse = rentable.filter((a) => a.status === 'in-use').length;
  const down = rentable.filter((a) => a.status === 'maintenance').length;
  return {
    total: rentable.length,
    inUse,
    down,
    available: rentable.length - inUse - down,
    utilization: rentable.length ? inUse / rentable.length : 0,
  };
}
