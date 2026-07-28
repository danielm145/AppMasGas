import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Camera, Download, LayoutGrid, List, Plus, QrCode, Wrench } from 'lucide-react';
import { QrLabelSheet } from '@/components/QrLabelSheet';
import { assetPhoto, readImageFile } from '@/lib/images';
import { useStore } from '@/lib/store';
import {
  ASSET_CATEGORY_LABELS,
  type Asset,
  type AssetCategory,
  type AssetCondition,
  type AssetStatus,
} from '@/lib/types';
import { cn, downloadCsv, formatDate, isoDate, money, num, pct } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  ImageUpload,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  ProgressBar,
} from '@/components/ui';

const STATUS_META: Record<AssetStatus, { label: string; tone: 'green' | 'lagoon' | 'amber' | 'slate' | 'rose' }> = {
  available: { label: 'Available', tone: 'green' },
  'in-use': { label: 'In use', tone: 'lagoon' },
  maintenance: { label: 'In maintenance', tone: 'amber' },
  retired: { label: 'Retired', tone: 'slate' },
  lost: { label: 'Lost', tone: 'rose' },
};

const CONDITION_LABELS: Record<AssetCondition, string> = {
  new: 'New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  retired: 'Retired',
};

const EMPTY_DRAFT = {
  code: '',
  name: '',
  category: 'wakeboard' as AssetCategory,
  brand: '',
  model: '',
  size: '',
  serial: '',
  purchaseDate: isoDate(new Date()),
  purchasePrice: 0,
  vendor: '',
  location: 'Pro Shop',
  storageSlot: '',
  serviceIntervalHours: 300,
  photoUrl: undefined as string | undefined,
  notes: '',
};

/**
 * Inventario de activos: cada tabla, casco, chaleco, bote y obstáculo con su
 * foto, su costo, su estado y su historial. Es el corazón del control de bienes.
 */
export default function Assets() {
  const { state, addAsset } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | AssetCategory>('all');
  const [status, setStatus] = useState<'all' | AssetStatus>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [open, setOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.assets.filter((a) => {
      if (q && !`${a.code} ${a.name} ${a.brand} ${a.model} ${a.serial ?? ''} ${a.location}`.toLowerCase().includes(q)) return false;
      if (category !== 'all' && a.category !== category) return false;
      if (status !== 'all' && a.status !== status) return false;
      return true;
    });
  }, [state.assets, query, category, status]);

  const stats = useMemo(() => {
    const value = state.assets.filter((a) => a.status !== 'retired').reduce((acc, a) => acc + a.purchasePrice, 0);
    const dueService = state.assets.filter((a) => a.nextServiceAt && new Date(a.nextServiceAt) <= new Date() && a.status !== 'retired').length;
    const down = state.assets.filter((a) => a.status === 'maintenance').length;
    return { count: state.assets.length, value, dueService, down };
  }, [state.assets]);

  const byCategory = useMemo(() => {
    const acc: Partial<Record<AssetCategory, number>> = {};
    state.assets.forEach((a) => (acc[a.category] = (acc[a.category] ?? 0) + 1));
    return acc;
  }, [state.assets]);

  const submit = () => {
    if (!draft.code || !draft.name) return;
    addAsset({
      ...draft,
      storageSlot: draft.storageSlot || undefined,
      photoUrl: draft.photoUrl ?? assetPhoto(draft.code, draft.category),
      condition: 'new',
      status: 'available',
      usageHours: 0,
      lastServiceAt: isoDate(new Date()),
      nextServiceAt: undefined,
    });
    setDraft(EMPTY_DRAFT);
    setOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Assets & inventory"
        description="Every board, helmet, vest, boat and obstacle with its photo, cost, location and full history."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  'assets-mwc.csv',
                  rows.map((a) => ({
                    Codigo: a.code,
                    Nombre: a.name,
                    Categoria: ASSET_CATEGORY_LABELS[a.category],
                    Marca: a.brand,
                    Serie: a.serial ?? '',
                    Compra: a.purchaseDate,
                    Precio: a.purchasePrice,
                    Estado: STATUS_META[a.status].label,
                    Condicion: CONDITION_LABELS[a.condition],
                    Location: a.location,
                    Slot: a.storageSlot ?? '',
                    HoursUso: Math.round(a.usageHours),
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="outline" onClick={() => setLabelsOpen(true)}>
              <QrCode className="h-4 w-4" /> QR labels
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New asset
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Assets on file" value={num(stats.count)} icon={<Boxes className="h-5 w-5" />} />
        <StatCard label="Purchase value" value={money(stats.value)} hint="assets not retired" tone="green" />
        <StatCard label="Service overdue" value={num(stats.dueService)} hint="preventive pending" tone="amber" icon={<Wrench className="h-5 w-5" />} />
        <StatCard label="Out of service" value={num(stats.down)} hint={`${pct(stats.down / Math.max(1, stats.count))} of the fleet`} tone="rose" />
      </div>

      {/* Resumen por categoría */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory('all')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            category === 'all' ? 'border-lagoon-500 bg-lagoon-50 text-lagoon-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
          )}
        >
          All <span className="ml-1 text-slate-400">{state.assets.length}</span>
        </button>
        {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[])
          .filter((c) => byCategory[c])
          .map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                category === c ? 'border-lagoon-500 bg-lagoon-50 text-lagoon-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              {ASSET_CATEGORY_LABELS[c]} <span className="ml-1 text-slate-400">{byCategory[c]}</span>
            </button>
          ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Code, brand, serial or location…" className="min-w-[220px] flex-1" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as AssetStatus | 'all')} className="w-auto min-w-[170px]">
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_META) as AssetStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: <LayoutGrid className="h-3.5 w-3.5" /> },
              { value: 'table', label: <List className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>

        {!rows.length ? (
          <EmptyState icon={<Boxes className="h-6 w-6" />} title="No assets" description="Adjust the filters or register a new one." />
        ) : view === 'grid' ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.slice(0, 48).map((a) => (
              <AssetCard key={a.id} asset={a} />
            ))}
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Active</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th>Location</Th>
                <Th className="text-right">Hours</Th>
                <Th className="text-right">Purchase</Th>
                <Th>Next service</Th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <Link to={`/assets/${a.id}`} className="flex items-center gap-3 group">
                      <img src={a.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-deep-900 group-hover:text-lagoon-700">{a.name}</span>
                        <span className="block font-mono text-[11px] text-slate-500">{a.code}</span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="text-[12px] text-slate-600">{ASSET_CATEGORY_LABELS[a.category]}</Td>
                  <Td>
                    <Badge tone={STATUS_META[a.status].tone} dot>
                      {STATUS_META[a.status].label}
                    </Badge>
                  </Td>
                  <Td className="text-[12px] text-slate-600">
                    {a.location}
                    {a.storageSlot && <span className="ml-1.5 font-mono text-[11px] font-bold text-lagoon-700">{a.storageSlot}</span>}
                  </Td>
                  <Td className="text-right tabular-nums">{Math.round(a.usageHours)}</Td>
                  <Td className="text-right tabular-nums">{money(a.purchasePrice)}</Td>
                  <Td>
                    <span className={cn('text-[12px]', a.nextServiceAt && new Date(a.nextServiceAt) <= new Date() ? 'font-semibold text-rose-600' : 'text-slate-600')}>
                      {formatDate(a.nextServiceAt)}
                    </span>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {rows.length > 48 && view === 'grid' && <p className="px-5 py-3 text-center text-xs text-slate-400">Showing 48 of {rows.length}</p>}
      </Card>

      {/* Alta de activo */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Register asset"
        subtitle="Saving it automatically creates the first history event (purchase)"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!draft.code || !draft.name}>
              Save asset
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageUpload
            className="sm:col-span-2"
            value={draft.photoUrl}
            onChange={(v) => setDraft({ ...draft, photoUrl: v })}
            label="Asset photo"
            hint="If you do not upload a photo, a catalog image is generated automatically"
          />
          <Field label="Internal code" required hint="Ej. MWC-BRD-045">
            <Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="MWC-BRD-045" />
          </Field>
          <Field label="First name" required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ronix Vault 142cm" />
          </Field>
          <Field label="Categoría">
            <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as AssetCategory })}>
              {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map((c) => (
                <option key={c} value={c}>
                  {ASSET_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Marca">
            <Input value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
          </Field>
          <Field label="Size">
            <Input value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })} placeholder="142cm, L, 21ft…" />
          </Field>
          <Field label="Serial number">
            <Input value={draft.serial} onChange={(e) => setDraft({ ...draft, serial: e.target.value })} />
          </Field>
          <Field label="Proveedor">
            <Input value={draft.vendor} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} />
          </Field>
          <Field label="Date de compra">
            <Input type="date" value={draft.purchaseDate} onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })} />
          </Field>
          <Field label="Purchase price (USD)">
            <Input type="number" value={draft.purchasePrice} onChange={(e) => setDraft({ ...draft, purchasePrice: Number(e.target.value) })} />
          </Field>
          <Field label="Ubicación">
            <Select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })}>
              {['Pro Shop', 'Bodega principal', 'Muelle norte', 'Muelle sur', 'Taller', 'Aqua Park'].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </Select>
          </Field>
          <Field label="Storage slot" hint="Labeled shelf position in the pro shop (A1, B3…)">
            <Input value={draft.storageSlot} onChange={(e) => setDraft({ ...draft, storageSlot: e.target.value.toUpperCase() })} placeholder="B3" />
          </Field>
          <Field label="Service interval (hours)" hint="Triggers preventive maintenance">
            <Input type="number" value={draft.serviceIntervalHours} onChange={(e) => setDraft({ ...draft, serviceIntervalHours: Number(e.target.value) })} />
          </Field>
        </div>
      </Modal>

      {/* Hoja de etiquetas QR */}
      <Modal
        open={labelsOpen}
        onClose={() => setLabelsOpen(false)}
        title="QR labels permanentes"
        subtitle="Laminated waterproof vinyl — stuck to the helmet and the board, they last the asset’s whole service life"
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setLabelsOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <QrLabelSheet assets={rows.slice(0, 60)} />
      </Modal>
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const { updateAsset, toast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const serviceDue = asset.nextServiceAt && new Date(asset.nextServiceAt) <= new Date();
  const wear = asset.serviceIntervalHours ? (asset.usageHours % asset.serviceIntervalHours) / asset.serviceIntervalHours : 0;
  return (
    <Link
      to={`/assets/${asset.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-lagoon-300 hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        <img src={asset.photoUrl} alt={asset.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        <span className="absolute left-2 top-2">
          <Badge tone={STATUS_META[asset.status].tone} dot>
            {STATUS_META[asset.status].label}
          </Badge>
        </span>
        {serviceDue && (
          <span className="absolute right-2 top-2">
            <Badge tone="rose">Service overdue</Badge>
          </span>
        )}
        {/* Sube la foto real de esta tabla sin salir de la lista */}
        <button
          onClick={(e) => {
            e.preventDefault();
            fileRef.current?.click();
          }}
          className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-deep-900 shadow-card transition hover:bg-white"
          aria-label={`Upload a photo of ${asset.code}`}
        >
          <Camera className="h-5 w-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              updateAsset(asset.id, { photoUrl: await readImageFile(f) });
              toast(`Photo saved on ${asset.code}`);
            }
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <p className="font-mono text-[10px] font-bold tracking-wider text-slate-400">{asset.code}</p>
        <p className="mt-0.5 truncate text-sm font-bold text-deep-900">{asset.name}</p>
        <p className="text-[11px] text-slate-500">
          {ASSET_CATEGORY_LABELS[asset.category]} · {asset.location}
          {asset.storageSlot && <span className="ml-1 font-mono font-bold text-lagoon-700">{asset.storageSlot}</span>}
        </p>
        <div className="mt-auto pt-3">
          <div className="mb-1 flex items-baseline justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Wear until next service</span>
            <span className="font-bold tabular-nums text-slate-600">{Math.round(asset.usageHours)} h</span>
          </div>
          <ProgressBar value={wear * 100} tone={wear > 0.85 ? 'rose' : wear > 0.6 ? 'amber' : 'lagoon'} />
        </div>
      </div>
    </Link>
  );
}
