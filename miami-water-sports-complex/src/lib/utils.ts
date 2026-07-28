import { clsx, type ClassValue } from 'clsx';
import { LoyaltyTier, TIER_META } from './types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/* ── PRNG determinista: los datos demo se ven iguales en cada recarga ───── */

export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function between(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/* ─────────────────────────────── Formato ───────────────────────────────── */

/**
 * Locale activo para fechas y números. Lo fija el proveedor de i18n al cambiar
 * de idioma; vive aquí como módulo para que los formateadores sigan siendo
 * funciones puras y utilizables fuera de React.
 */
let currentLocale = 'en-US';

export function setFormatLocale(locale: string) {
  currentLocale = locale;
}

export const money = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

export const num = (n: number) => new Intl.NumberFormat(currentLocale).format(n);

export const pct = (n: number, decimals = 0) => `${(n * 100).toFixed(decimals)}%`;

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(currentLocale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  });
}

export function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(currentLocale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(currentLocale, { hour: 'numeric', minute: '2-digit' });
}

/** "3 h ago", "in 2 days" — para timelines y alertas. */
export function relativeTime(iso?: string) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(currentLocale, { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536e6],
    ['month', 2592e6],
    ['day', 864e5],
    ['hour', 36e5],
    ['minute', 6e4],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(0, 'second');
}

export function age(dob: string) {
  const d = new Date(dob);
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export function daysUntil(iso?: string) {
  if (!iso) return Infinity;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

/* ───────────────────────────────── Fechas ──────────────────────────────── */

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(d: Date | string, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

/** Lunes de la semana que contiene `d`. */
export function startOfWeek(d: Date | string) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = lunes
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Lunes primero — así se leen los calendarios de turnos del parque. */
export const WEEKDAY_KEYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Domingo primero — coincide con `Date.getDay()`, que usan los mapas de calor. */
export const WEEKDAY_KEYS_SUN_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/* ─────────────────────────────── Lealtad ───────────────────────────────── */

export function tierFor(lifetimePoints: number): LoyaltyTier {
  const order: LoyaltyTier[] = ['legend', 'pro', 'rider', 'splash'];
  return order.find((t) => lifetimePoints >= TIER_META[t].min) ?? 'splash';
}

export function nextTier(tier: LoyaltyTier): LoyaltyTier | null {
  const order: LoyaltyTier[] = ['splash', 'rider', 'pro', 'legend'];
  const i = order.indexOf(tier);
  return i < order.length - 1 ? order[i + 1] : null;
}

/** Multiplicador de puntos por dólar según nivel. */
export function pointsMultiplier(tier: LoyaltyTier) {
  return { splash: 1, rider: 1.25, pro: 1.5, legend: 2 }[tier];
}

/* ────────────────────────────────  Misc  ───────────────────────────────── */

let idCounter = 0;
export function uid(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function groupBy<T, K extends string | number>(arr: T[], key: (t: T) => K) {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

export function sum<T>(arr: T[], get: (t: T) => number) {
  return arr.reduce((a, b) => a + get(b), 0);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
