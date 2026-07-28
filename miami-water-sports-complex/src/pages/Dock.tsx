import { useMemo, useRef, useState } from 'react';
import { Camera, Check, ScanLine, UserPlus, Waves, X } from 'lucide-react';
import { QrScanner } from '@/components/QrScanner';
import { PersonAvatar } from '@/components/CustomerQuickView';
import { LogoMark } from '@/components/Logo';
import { readImageFile } from '@/lib/images';
import { useStore } from '@/lib/store';
import { cn, formatTime, fullName } from '@/lib/utils';
import { Button, Field, Input, Modal } from '@/components/ui';

/**
 * Modo muelle.
 *
 * Una sola pantalla para quien está de pie junto al agua, con el teléfono en
 * una mano y una cuerda en la otra. Dos cosas: registrar a alguien nuevo y
 * contar vueltas. Nada más — ni menús, ni reportes, ni configuración.
 *
 * Todo está dimensionado para el pulgar mojado: nada por debajo de 56 px de
 * alto, y el resultado de cada acción se ve sin leer.
 */
export default function Dock() {
  const { state, currentUser, addCustomer, logLap, toast } = useStore();
  const [scanning, setScanning] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [feed, setFeed] = useState<{ id: string; ok: boolean; text: string; sub: string; at: string }[]>([]);

  const [photo, setPhoto] = useState<string>();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', canSwim: false });
  const photoRef = useRef<HTMLInputElement>(null);

  const active = useMemo(() => state.rideSessions.filter((s) => s.status === 'active'), [state.rideSessions]);
  const lapsToday = state.lapLogs.filter((l) => new Date(l.timestamp).toDateString() === new Date().toDateString()).length;

  const onScan = (raw: string) => {
    const value = raw.trim().replace(/^mwc:\/\/(ride|asset)\//i, '').toUpperCase();
    const lap = logLap(value);
    const session = lap ? state.rideSessions.find((s) => s.id === lap.sessionId) : undefined;
    const rider = state.customers.find((c) => c.id === session?.customerId);

    setFeed((prev) =>
      [
        {
          id: `${value}-${Date.now()}`,
          ok: !!lap,
          text: lap && rider ? fullName(rider) : `Not recognized: ${value}`,
          sub: lap ? `Lap ${session!.lapsCompleted + 1} · ${value}` : 'That tag is not checked out to anyone',
          at: new Date().toISOString(),
        },
        ...prev,
      ].slice(0, 12),
    );
  };

  const saveCustomer = () => {
    if (!form.firstName || !form.phone) {
      toast('Name and phone are required', 'error');
      return;
    }
    if (!form.canSwim) {
      toast('They must say they can swim', 'error');
      return;
    }
    addCustomer({
      firstName: form.firstName,
      lastName: form.lastName || '—',
      email: `${form.phone.replace(/\D/g, '')}@pending.mwc`,
      phone: form.phone,
      dob: '2000-01-01',
      city: 'Miami',
      state: 'FL',
      zip: '',
      photoUrl: photo,
      skillLevel: 'beginner',
      emergencyContact: { name: '', relation: '', phone: '' },
      isMinor: false,
      canSwim: 'declared',
      idVerified: false,
      marketingOptIn: true,
      smsOptIn: true,
      tags: ['dock'],
    });
    setForm({ firstName: '', lastName: '', phone: '', canSwim: false });
    setPhoto(undefined);
    setRegistering(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Cabecera: quién eres y cómo va el día */}
      <div className="wave-bg mb-5 flex items-center gap-4 rounded-2xl px-5 py-5 text-white">
        <LogoMark className="h-9 w-14 shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold">Hi, {currentUser.firstName}</p>
          <p className="text-sm text-white/75">
            {active.length} on the water · {lapsToday} laps today
          </p>
        </div>
      </div>

      {/* Las dos únicas cosas que se hacen aquí */}
      <div className="mb-5 grid gap-3">
        <button
          onClick={() => setScanning(true)}
          className="focus-ring flex items-center gap-4 rounded-2xl bg-sunset-500 px-6 py-7 text-left text-white shadow-pop transition hover:bg-sunset-600"
        >
          <ScanLine className="h-10 w-10 shrink-0" />
          <span>
            <span className="block text-2xl font-extrabold leading-tight">Count a lap</span>
            <span className="block text-sm text-white/85">Point the camera at the helmet</span>
          </span>
        </button>

        <button
          onClick={() => setRegistering(true)}
          className="focus-ring flex items-center gap-4 rounded-2xl bg-lagoon-600 px-6 py-7 text-left text-white shadow-pop transition hover:bg-lagoon-700"
        >
          <UserPlus className="h-10 w-10 shrink-0" />
          <span>
            <span className="block text-2xl font-extrabold leading-tight">New customer</span>
            <span className="block text-sm text-white/85">Name, phone and photo — that is it</span>
          </span>
        </button>
      </div>

      {/* Lo que acaba de pasar */}
      {feed.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Just now
          </p>
          <ul className="divide-y divide-slate-100">
            {feed.map((f) => (
              <li key={f.id} className={cn('flex items-center gap-3 px-5 py-3.5', !f.ok && 'bg-rose-50')}>
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    f.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                  )}
                >
                  {f.ok ? <Check className="h-5 w-5" strokeWidth={3} /> : <X className="h-5 w-5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-deep-900">{f.text}</span>
                  <span className="block truncate text-xs text-slate-500">{f.sub}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] text-slate-400">{formatTime(f.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quién está en el agua — tocar la foto abre su contacto de emergencia */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          On the water — {active.length}
        </p>
        {active.length ? (
          <ul className="divide-y divide-slate-100">
            {active.map((s) => {
              const rider = state.customers.find((c) => c.id === s.customerId);
              const helmet = state.assets.find((a) => s.assignedAssetIds.includes(a.id) && a.category === 'helmet');
              return (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <PersonAvatar
                    customerId={s.customerId}
                    name={rider ? fullName(rider) : 'Rider'}
                    src={rider?.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-deep-900">{rider ? fullName(rider) : 'Rider'}</p>
                    <p className="truncate font-mono text-xs font-bold text-lagoon-700">{helmet?.code ?? s.wristbandCode}</p>
                  </div>
                  <Button
                    size="lg"
                    className="h-14 shrink-0 px-5 text-base"
                    onClick={() => {
                      logLap(helmet?.code ?? s.wristbandCode);
                      toast(`Lap ${s.lapsCompleted + 1} · ${rider?.firstName ?? 'rider'}`);
                    }}
                  >
                    +1 lap
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Waves className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-deep-900">Nobody on the water</p>
            <p className="text-xs text-slate-500">Riders show up here once the front desk checks them in.</p>
          </div>
        )}
      </div>

      <QrScanner open={scanning} onClose={() => setScanning(false)} onScan={onScan} />

      {/* Alta de cliente — cuatro campos, nada más */}
      <Modal
        open={registering}
        onClose={() => setRegistering(false)}
        title="New customer"
        subtitle="Just enough to get them on the water. The desk can fill in the rest later."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="lg" onClick={() => setRegistering(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={saveCustomer}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <button
            onClick={() => photoRef.current?.click()}
            className={cn(
              'focus-ring mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 transition',
              photo ? 'border-emerald-400' : 'border-dashed border-slate-300 bg-slate-50 hover:border-lagoon-400',
            )}
            aria-label="Take their photo"
          >
            {photo ? (
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-slate-400">
                <Camera className="h-8 w-8" />
                <span className="text-[11px] font-bold">Photo</span>
              </span>
            )}
          </button>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await readImageFile(f));
              e.target.value = '';
            }}
          />

          <Field label="First name" required>
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-14 text-lg" />
          </Field>
          <Field label="Last name">
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-14 text-lg" />
          </Field>
          <Field label="Phone" required>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-14 text-lg" inputMode="tel" />
          </Field>

          <button
            onClick={() => setForm({ ...form, canSwim: !form.canSwim })}
            className={cn(
              'focus-ring flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition',
              form.canSwim ? 'border-emerald-500 bg-emerald-50' : 'border-deep-900 bg-slate-50',
            )}
          >
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                form.canSwim ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 bg-white',
              )}
            >
              {form.canSwim && <Check className="h-5 w-5" strokeWidth={3} />}
            </span>
            <span>
              <span className="block text-base font-bold text-deep-900">They know how to swim</span>
              <span className="block text-xs text-slate-500">Park rule — required before the water</span>
            </span>
          </button>
        </div>
      </Modal>
    </div>
  );
}
