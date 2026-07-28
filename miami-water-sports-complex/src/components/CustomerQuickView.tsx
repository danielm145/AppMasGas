import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { readImageFile } from '@/lib/images';
import { useStore } from '@/lib/store';
import { TIER_META } from '@/lib/types';
import { age, cn, formatDate, fullName, num, relativeTime } from '@/lib/utils';
import { Avatar, Badge, Button, Modal } from './ui';

/**
 * Ficha rápida de una persona.
 *
 * Se abre tocando su foto en cualquier pantalla. Lo primero que muestra es el
 * contacto de emergencia, porque el momento en que alguien la abre en el muelle
 * suele ser el momento en que hace falta: alguien se golpeó, alguien no vuelve,
 * un menor está solo. Todo lo demás es secundario.
 */

const OPEN_EVENT = 'mwc:open-customer';

/** Abre la ficha desde cualquier componente sin pasar props por media app. */
export const openCustomer = (customerId: string) =>
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: customerId }));

/** Foto de una persona que abre su ficha al tocarla. */
export function PersonAvatar({
  customerId,
  name,
  src,
  size = 'md',
  className,
}: {
  customerId: string;
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openCustomer(customerId);
      }}
      className="focus-ring shrink-0 rounded-full transition hover:brightness-95"
      title={`Open ${name}`}
      aria-label={`Open the record for ${name}`}
    >
      <Avatar name={name} src={src} size={size} className={className} />
    </button>
  );
}

export function CustomerQuickView() {
  const { state, updateCustomer } = useStore();
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    const open = (e: Event) => setId((e as CustomEvent<string>).detail);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  const customer = state.customers.find((c) => c.id === id);
  if (!customer) return null;

  const waiver = state.waivers.find(
    (w) => w.customerId === customer.id && w.type !== 'photo-release' && new Date(w.expiresAt) > new Date(),
  );
  const session = state.rideSessions.find((s) => s.customerId === customer.id && s.status === 'active');
  const gear = session ? state.assets.filter((a) => session.assignedAssetIds.includes(a.id)) : [];
  const ec = customer.emergencyContact;
  const hasEc = Boolean(ec?.name || ec?.phone);

  return (
    <Modal open onClose={() => setId(null)} title={fullName(customer)} subtitle={`${customer.memberCode} · ${age(customer.dob)} years old`} size="sm">
      <div className="space-y-5">
        {/* Foto — grande, y se puede reemplazar aquí mismo */}
        <div className="flex items-center gap-4">
          <label className="focus-ring relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50">
            {customer.photoUrl ? (
              <img src={customer.photoUrl} alt={fullName(customer)} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                <Camera className="h-7 w-7" />
                <span className="text-[10px] font-bold">Add photo</span>
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) updateCustomer(customer.id, { photoUrl: await readImageFile(f) });
                e.target.value = '';
              }}
            />
          </label>

          <div className="min-w-0 flex-1 space-y-1.5">
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm font-semibold text-lagoon-700 hover:underline">
              <Phone className="h-4 w-4 shrink-0" /> {customer.phone || '—'}
            </a>
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-xs text-slate-500 hover:underline">
              <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{customer.email}</span>
            </a>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <Badge className={TIER_META[customer.tier].color}>{TIER_META[customer.tier].label}</Badge>
              {customer.isMinor && <Badge tone="amber">Minor</Badge>}
            </div>
          </div>
        </div>

        {/* Contacto de emergencia — lo primero que se busca cuando algo pasa */}
        <div className={cn('rounded-xl border-2 p-4', hasEc ? 'border-rose-200 bg-rose-50/60' : 'border-amber-300 bg-amber-50')}>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-rose-800">
            <AlertTriangle className="h-3.5 w-3.5" /> Emergency contact
          </p>
          {hasEc ? (
            <>
              <p className="text-base font-bold text-deep-900">{ec.name || '—'}</p>
              <p className="text-xs text-slate-600">{ec.relation}</p>
              {ec.phone && (
                <a
                  href={`tel:${ec.phone}`}
                  className="mt-2 inline-flex h-11 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700"
                >
                  <Phone className="h-4 w-4" /> Call {ec.phone}
                </a>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold text-amber-900">
              None on file. Ask for it at the counter before they get on the water.
            </p>
          )}
        </div>

        {/* Tutor legal, cuando aplica */}
        {customer.isMinor && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">Legal guardian</p>
            <p className="text-sm font-bold text-deep-900">{customer.guardianName || '—'}</p>
            {customer.guardianPhone && (
              <a href={`tel:${customer.guardianPhone}`} className="text-xs font-semibold text-lagoon-700 hover:underline">
                {customer.guardianPhone}
              </a>
            )}
          </div>
        )}

        {/* Condiciones para entrar al agua */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn('rounded-lg border p-3', customer.canSwim === 'declared' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Can swim</p>
            <p className={cn('text-sm font-bold', customer.canSwim === 'declared' ? 'text-emerald-700' : 'text-rose-700')}>
              {customer.canSwim === 'declared' ? 'Declared' : 'Not declared'}
            </p>
          </div>
          <div className={cn('rounded-lg border p-3', waiver ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50')}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Waiver</p>
            <p className={cn('flex items-center gap-1 text-sm font-bold', waiver ? 'text-emerald-700' : 'text-rose-700')}>
              {waiver ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              {waiver ? `To ${formatDate(waiver.expiresAt)}` : 'Missing'}
            </p>
          </div>
        </div>

        {/* Qué lleva puesto ahora mismo */}
        {session && (
          <div className="rounded-xl border border-lagoon-200 bg-lagoon-50/60 p-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-lagoon-800">
              <Waves className="h-3.5 w-3.5" /> On the water now
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs font-bold text-lagoon-800">
              {gear.map((a) => (
                <span key={a.id}>{a.code}</span>
              ))}
              {!gear.length && <span className="font-sans font-normal text-slate-500">No gear linked</span>}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">{session.turnsUsed} turns · started {relativeTime(session.startAt)}</p>
          </div>
        )}

        {/* Historial resumido */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ['Visits', num(customer.visits)],
            ['Points', num(customer.points)],
            ['Last visit', customer.lastVisitAt ? relativeTime(customer.lastVisitAt) : '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 py-2.5">
              <p className="truncate text-sm font-extrabold text-deep-900">{value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Link to={`/customers/${customer.id}`} onClick={() => setId(null)} className="flex-1">
            <Button variant="outline" className="w-full">
              Full profile
            </Button>
          </Link>
          <Link to="/check-in" onClick={() => setId(null)} className="flex-1">
            <Button className="w-full">Check them in</Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
