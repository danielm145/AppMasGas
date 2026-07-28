/**
 * Capa de gráficos.
 *
 * Paleta categórica validada para daltonismo (deutan/protan/tritan) sobre
 * superficie blanca: peor par adyacente ΔE 16.3 CVD / 19.6 visión normal.
 * Los slots 4 y 5 quedan por debajo de 3:1 de contraste, así que cuando se usan
 * siempre van con etiqueta directa o vista de tabla — nunca color solo.
 *
 * Reglas que se respetan aquí:
 *  · un solo eje Y por gráfico (nunca doble escala);
 *  · el color sigue a la entidad, no a su posición en el ranking;
 *  · leyenda siempre que haya ≥ 2 series; ninguna cuando hay una sola;
 *  · toda serie tiene su vista de tabla accesible desde el encabezado.
 */

import { useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Table2, TrendingUp } from 'lucide-react';
import { cn, money, num } from '@/lib/utils';
import { Card, Table, Td, Th, Tr } from './ui';

/* ─────────────────────────────── Tokens ────────────────────────────────── */

export const SERIES = [
  '#0891b2', // 1 · lagoon (marca)
  '#eb6834', // 2 · naranja
  '#4a3aa7', // 3 · violeta
  '#eda100', // 4 · amarillo — requiere etiqueta directa
  '#e87ba4', // 5 · magenta — requiere etiqueta directa
  '#008300', // 6 · verde
  '#2a78d6', // 7 · azul
  '#e34948', // 8 · rojo
];

/** Rampa secuencial de un solo tono, claro → oscuro (magnitud continua). */
export const SEQUENTIAL = ['#ecfeff', '#cffafe', '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'];

export const INK = {
  primary: '#0d1f33',
  secondary: '#475569',
  muted: '#94a3b8',
  grid: '#e2e8f0',
  axis: '#cbd5e1',
  surface: '#ffffff',
};

const axisProps = {
  tick: { fill: INK.muted, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: INK.axis },
} as const;

/* ─────────────────────────── Contenedor de gráfico ─────────────────────── */

export function ChartCard({
  title,
  subtitle,
  children,
  tableRows,
  tableHeaders,
  action,
  className,
  height = 260,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Vista de tabla equivalente — requisito de accesibilidad, no un extra. */
  tableRows?: (string | number)[][];
  tableHeaders?: string[];
  action?: ReactNode;
  className?: string;
  height?: number;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold tracking-tight text-deep-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {tableRows && (
            <button
              onClick={() => setShowTable((v) => !v)}
              className={cn(
                'rounded-lg p-1.5 transition',
                showTable ? 'bg-lagoon-50 text-lagoon-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
              )}
              title={showTable ? 'Ver gráfico' : 'Ver datos en tabla'}
              aria-label={showTable ? 'Ver gráfico' : 'Ver datos en tabla'}
            >
              {showTable ? <TrendingUp className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {showTable && tableRows ? (
        <div className="max-h-[300px] overflow-y-auto px-1 pb-3">
          <Table className="min-w-full">
            <thead>
              <tr>{tableHeaders?.map((h) => <Th key={h}>{h}</Th>)}</tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <Tr key={i}>
                  {row.map((cell, j) => (
                    <Td key={j} className={j > 0 ? 'tabular-nums' : ''}>
                      {cell}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <div style={{ height }} className="px-2 pb-3">
          {children}
        </div>
      )}
    </Card>
  );
}

/* ──────────────────────────────── Tooltip ──────────────────────────────── */

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
  label?: string;
  formatter?: (v: number, key: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[13px]">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}</span>
          <span className="ml-auto font-bold tabular-nums text-deep-900">
            {formatter ? formatter(p.value, p.dataKey) : num(p.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ───────────────────────────── Área de tendencia ───────────────────────── */

export function TrendArea({
  data,
  dataKey,
  xKey = 'label',
  name,
  color = SERIES[0],
  currency,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  name: string;
  color?: string;
  currency?: boolean;
}) {
  const gradId = `grad-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...axisProps} width={48} tickFormatter={(v) => (currency ? `$${v >= 1000 ? `${v / 1000}k` : v}` : num(v))} />
        <Tooltip
          cursor={{ stroke: INK.axis, strokeWidth: 1 }}
          content={<ChartTooltip formatter={(v) => (currency ? money(v) : num(v))} />}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradId})`}
          activeDot={{ r: 4, strokeWidth: 2, stroke: INK.surface }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ────────────────────────── Barras verticales (1 serie) ────────────────── */

export function Bars({
  data,
  dataKey,
  xKey = 'label',
  name,
  color = SERIES[0],
  /** Resalta el máximo — útil para "hora pico". */
  highlightMax,
  currency,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  name: string;
  color?: string;
  highlightMax?: boolean;
  currency?: boolean;
}) {
  const max = Math.max(...data.map((d) => Number(d[dataKey]) || 0));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} width={44} tickFormatter={(v) => (currency ? `$${v}` : num(v))} />
        <Tooltip cursor={{ fill: 'rgba(8,145,178,0.06)' }} content={<ChartTooltip formatter={(v) => (currency ? money(v) : num(v))} />} />
        <Bar dataKey={dataKey} name={name} radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell key={i} fill={highlightMax && Number(d[dataKey]) === max ? SERIES[1] : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────────────────── Barras horizontales rankeadas ─────────────────── */

export function RankedBars({
  data,
  currency,
  color = SERIES[0],
}: {
  data: { label: string; value: number; hint?: string }[];
  currency?: boolean;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex h-full flex-col justify-center gap-2.5 overflow-y-auto px-3 py-1">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-xs font-medium text-slate-600">{d.label}</span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-deep-900">
              {currency ? money(d.value) : num(d.value)}
              {d.hint && <span className="ml-1.5 font-normal text-slate-400">{d.hint}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-r-[4px] bg-slate-100">
            <div
              className="h-full rounded-r-[4px] transition-all duration-500 group-hover:brightness-110"
              style={{ width: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────── Líneas múltiples (categórico) ────────────────── */

export function MultiLine({
  data,
  series,
  xKey = 'label',
}: {
  data: Record<string, unknown>[];
  series: { key: string; name: string }[];
  xKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={INK.grid} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} width={44} tickFormatter={(v) => num(v)} />
        <Tooltip cursor={{ stroke: INK.axis, strokeWidth: 1 }} content={<ChartTooltip />} />
        <Legend
          verticalAlign="top"
          align="left"
          height={28}
          iconType="plainline"
          iconSize={14}
          wrapperStyle={{ fontSize: 11, color: INK.secondary, paddingLeft: 8 }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={SERIES[i % SERIES.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: INK.surface }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ────────────────────────────── Mapa de calor ──────────────────────────── */

export function Heatmap({
  grid,
  max,
  hours,
  rowLabels,
}: {
  grid: number[][];
  max: number;
  hours: number[];
  rowLabels: string[];
}) {
  const stepFor = (v: number) => {
    if (v === 0) return '#f8fafc';
    const idx = Math.min(SEQUENTIAL.length - 1, Math.floor((v / max) * (SEQUENTIAL.length - 1)) + 1);
    return SEQUENTIAL[idx];
  };
  return (
    <div className="overflow-x-auto px-3 pb-2">
      <div className="min-w-[560px]">
        <div className="mb-1 flex pl-9">
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[10px] font-medium text-slate-400">
              {h > 12 ? h - 12 : h}
              {h >= 12 ? 'p' : 'a'}
            </div>
          ))}
        </div>
        {grid.map((row, r) => (
          <div key={r} className="mb-[2px] flex items-center">
            <div className="w-9 pr-2 text-right text-[10px] font-semibold text-slate-500">{rowLabels[r]}</div>
            {row.map((v, c) => (
              <div key={c} className="flex-1 px-[1px]">
                <div
                  className="group relative h-6 rounded-[3px] transition hover:ring-2 hover:ring-lagoon-500"
                  style={{ background: stepFor(v) }}
                  title={`${rowLabels[r]} ${hours[c]}:00 — ${v} vueltas`}
                >
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-deep-900 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    {v} vueltas
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-2 pr-1">
          <span className="text-[10px] text-slate-400">Menos</span>
          {SEQUENTIAL.map((c) => (
            <span key={c} className="h-3 w-5 rounded-[2px]" style={{ background: c }} />
          ))}
          <span className="text-[10px] text-slate-400">Más</span>
        </div>
      </div>
    </div>
  );
}
