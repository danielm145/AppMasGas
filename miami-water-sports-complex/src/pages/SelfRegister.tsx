import { useRef, useState } from 'react';
import { Camera, Check, ChevronRight, PartyPopper } from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { LogoLockup } from '@/components/Logo';
import { readImageFile } from '@/lib/images';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button, Checkbox, Field, Input } from '@/components/ui';

/**
 * Auto-registro del cliente — la página que abre el QR del mostrador.
 *
 * Pensada para el teléfono de la persona en la fila: una sola columna, botones
 * de pulgar, la cámara frontal para la foto y cero jerga. Al terminar ve su
 * pase con QR y su nombre ya está en la lista del mostrador.
 */
export default function SelfRegister() {
  const { addCustomer, issueRainCheck } = useStore();
  const [photo, setPhoto] = useState<string>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [canSwim, setCanSwim] = useState(false);
  const [done, setDone] = useState<{ code: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!firstName || !phone || !canSwim) return;
    const customer = addCustomer({
      firstName,
      lastName: lastName || '—',
      email: email || `${phone.replace(/\D/g, '')}@pending.mwc`,
      phone,
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
      tags: ['self-registered'],
    });
    const rc = issueRainCheck({ customerId: customer.id, packageType: 'hour-1', minutesOwed: 60, reason: 'Lightning closure — self registered' });
    setDone({ code: rc.code, name: firstName });
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Cabecera con la marca — esta página vive fuera del shell */}
      <header className="wave-bg px-5 pb-10 pt-6 text-white">
        <LogoLockup inverted className="h-9 w-auto" />
        <h1 className="mt-5 text-2xl font-extrabold leading-tight" style={{ textWrap: 'balance' } as never}>
          {done ? 'You are on the list' : 'The lake is closed for lightning'}
        </h1>
        <p className="mt-1.5 max-w-sm text-sm text-white/80">
          {done
            ? 'Show this pass at the front desk when you come back. It is valid for 60 days.'
            : 'Register here instead of waiting at the counter. You will get a pass to come back any day.'}
        </p>
      </header>

      <main className="-mt-5 px-4 pb-12">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-pop">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <PartyPopper className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xl font-extrabold text-deep-900">Thanks, {done.name}!</p>
                <p className="mt-1 text-sm text-slate-500">This is your pass — screenshot it.</p>
              </div>
              <QrCode value={`mwc://raincheck/${done.code}`} label={done.code} size={190} />
              <p className="text-xs text-slate-400">Miami Watersports Complex · (305) 476-9253</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Foto primero: es lo que hace reconocible a la persona al volver */}
              <button
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'focus-ring mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 transition',
                  photo ? 'border-emerald-400' : 'border-dashed border-slate-300 bg-slate-50 hover:border-lagoon-400',
                )}
                aria-label="Take your photo"
              >
                {photo ? (
                  <img src={photo} alt="Your photo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-slate-400">
                    <Camera className="h-8 w-8" />
                    <span className="text-[11px] font-bold">Your photo</span>
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
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
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-14 text-lg" autoComplete="given-name" />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-14 text-lg" autoComplete="family-name" />
              </Field>
              <Field label="Phone" required>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-14 text-lg" inputMode="tel" autoComplete="tel" placeholder="(305) 555-0100" />
              </Field>
              <Field label="Email" hint="Optional">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-14 text-lg" inputMode="email" autoComplete="email" />
              </Field>

              <div className="rounded-xl border-2 border-deep-900 bg-slate-50 p-4">
                <Checkbox label="I know how to swim" hint="Park rule — required to get on the water" checked={canSwim} onChange={setCanSwim} />
              </div>

              <Button size="lg" className="h-16 w-full text-lg" onClick={submit} disabled={!firstName || !phone || !canSwim}>
                Get my pass <ChevronRight className="h-5 w-5" />
              </Button>

              <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                Your info goes straight to the front desk — no paper, no line. Valid ID required when you ride.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
