import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Minus, Package, Plus, ShoppingCart } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn, downloadCsv, formatDate, money, num } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  ProgressBar,
  SearchInput,
  Segmented,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from '@/components/ui';

/**
 * Consumibles: fijaciones, aceites, parches, camisetas, pulseras QR.
 * Distinto de "activos" — aquí importa el stock, no el historial individual.
 */
export default function Supplies() {
  const { state, updateSupply, toast } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [view, setView] = useState<'todos' | 'bajos'>('todos');

  const categories = useMemo(() => Array.from(new Set(state.supplies.map((s) => s.category))).sort(), [state.supplies]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.supplies
      .filter((s) => {
        if (q && !`${s.name} ${s.sku} ${s.supplier} ${s.location}`.toLowerCase().includes(q)) return false;
        if (category !== 'all' && s.category !== category) return false;
        if (view === 'bajos' && s.stock > s.minStock) return false;
        return true;
      })
      .sort((a, b) => a.stock / Math.max(1, a.minStock) - b.stock / Math.max(1, b.minStock));
  }, [state.supplies, query, category, view]);

  const stats = useMemo(() => {
    const low = state.supplies.filter((s) => s.stock <= s.minStock);
    const value = state.supplies.reduce((a, s) => a + s.stock * s.unitCost, 0);
    const reorderCost = low.reduce((a, s) => a + (s.minStock * 2 - s.stock) * s.unitCost, 0);
    return { total: state.supplies.length, low: low.length, value, reorderCost };
  }, [state.supplies]);

  const lowItems = state.supplies.filter((s) => s.stock <= s.minStock);

  const adjust = (id: string, delta: number) => {
    const s = state.supplies.find((x) => x.id === id);
    if (!s) return;
    updateSupply(id, { stock: Math.max(0, s.stock + delta) });
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Suministros"
        description="Park consumables: spare parts, shop supplies, merchandise and Summer Camp material."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  'suministros-mws.csv',
                  rows.map((s) => ({
                    SKU: s.sku,
                    Articulo: s.name,
                    Categoria: s.category,
                    Stock: s.stock,
                    Minimo: s.minStock,
                    Unidad: s.unit,
                    CostoUnitario: s.unitCost,
                    Proveedor: s.supplier,
                    Ubicacion: s.location,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button
              onClick={() => {
                lowItems.forEach((s) => updateSupply(s.id, { stock: s.minStock * 2, lastRestockAt: new Date().toISOString().slice(0, 10) }));
                toast(`Orden de compra generada para ${lowItems.length} artículos`);
              }}
              disabled={!lowItems.length}
            >
              <ShoppingCart className="h-4 w-4" /> Generate purchase order
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Artículos" value={num(stats.total)} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Below minimum" value={num(stats.low)} hint="need restocking" icon={<AlertTriangle className="h-5 w-5" />} tone="rose" />
        <StatCard label="Inventory value" value={money(stats.value)} tone="green" />
        <StatCard label="Restock cost" value={money(stats.reorderCost)} hint="to get back to twice the minimum" tone="amber" />
      </div>

      <Card>
        <CardHeader
          title="Consumables inventory"
          subtitle="Use +/− to adjust the count after a use or a delivery"
          action={
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'todos', label: `Todos (${state.supplies.length})` },
                { value: 'bajos', label: `Below minimum (${stats.low})` },
              ]}
            />
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Item, SKU or supplier…" className="min-w-[220px] max-w-sm flex-1" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-auto min-w-[170px]">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Category</Th>
                <Th className="w-52">Stock</Th>
                <Th className="text-center">Adjust</Th>
                <Th className="text-right">Unit cost</Th>
                <Th>Vendor</Th>
                <Th>Last purchase</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const ratio = s.stock / Math.max(1, s.minStock);
                const tone = ratio <= 0.5 ? 'rose' : ratio <= 1 ? 'amber' : 'green';
                return (
                  <Tr key={s.id}>
                    <Td>
                      <span className="block font-semibold text-deep-900">{s.name}</span>
                      <span className="block font-mono text-[11px] text-slate-400">
                        {s.sku} · {s.location}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone="slate">{s.category}</Badge>
                    </Td>
                    <Td>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className={cn('font-bold tabular-nums', tone === 'rose' ? 'text-rose-600' : tone === 'amber' ? 'text-amber-600' : 'text-deep-900')}>
                          {s.stock} {s.unit}
                        </span>
                        <span className="text-[11px] text-slate-400">mín. {s.minStock}</span>
                      </div>
                      <ProgressBar value={s.stock} max={Math.max(s.minStock * 2, s.stock)} tone={tone} className="mt-1" />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => adjust(s.id, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-deep-900"
                          aria-label={`Restar uno de ${s.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => adjust(s.id, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-deep-900"
                          aria-label={`Sumar uno a ${s.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{money(s.unitCost, 2)}</Td>
                    <Td className="text-[12px] text-slate-600">{s.supplier}</Td>
                    <Td className="text-[12px] text-slate-500">{formatDate(s.lastRestockAt)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState icon={<Package className="h-6 w-6" />} title="No items" description="Adjust your search or filters." />
        )}
      </Card>
    </div>
  );
}
