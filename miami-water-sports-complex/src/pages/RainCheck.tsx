import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudLightning, FileDown, Printer, QrCode as QrIcon, UserPlus, Zap } from 'lucide-react';
import { QrCode } from '@/components/QrCode';
import { LogoLockup } from '@/components/Logo';
import { readImageFile } from '@/lib/images';
import { cloudListSignups, cloudRedeem, cloudSaveSignup, isCloudEnabled } from '@/lib/cloud';
import { useStore } from '@/lib/store';
import { PACKAGE_META, type PackageType } from '@/lib/types';
import { cn, formatDate, formatTime, fullName } from '@/lib/utils';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, Input, Modal, PageHeader, Select } from '@/components/ui';

/**
 * Cierre por rayos.
 *
 * El lago se cierra, hay gente que ya pagó y una fila anotándose en papel.
 * Esta pantalla reemplaza el papel: se registra a cada persona en segundos
 * (o se registran solas escaneando el QR), reciben un pase con código para
 * volver otro día y la lista completa sale en PDF con un botón.
 *
 * Todo aquí es deliberadamente grande: se usa de pie, con prisa y bajo lluvia.
 */
export default function RainCheck() {
  const { state, addCustomer, issueRainCheck, redeemRainCheck } = useStore();
  const [qrOpen, setQrOpen] = useState(false);
  const [photo, setPhoto] = useState<string>();
  const [draft, setDraft] = useState({ firstName: '', lastName: '', phone: '', email: '', packageType: 'hour-1' as PackageType, minutesOwed: 60 });
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [cloudRows, setCloudRows] = useState<Awaited<ReturnType<typeof cloudListSignups>>>([]);

  // Con la nube encendida, la gente que se registra desde su propio teléfono
  // aparece aquí sola. Cinco segundos es suficiente para el ritmo del mostrador.
  useEffect(() => {
    if (!isCloudEnabled()) return;
    let alive = true;
    const pull = async () => {
      const rows = await cloudListSignups();
      if (alive) setCloudRows(rows);
    };
    pull();
    const timer = window.setInterval(pull, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const holds = useMemo(
    () =>
      state.rainChecks
        .map((rc) => ({ ...rc, customer: state.customers.find((c) => c.id === rc.customerId) }))
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    [state.rainChecks, state.customers],
  );
  const today = holds.filter((h) => new Date(h.issuedAt).toDateString() === new Date().toDateString());

  /** URL pública del formulario de auto-registro — es lo que codifica el QR. */
  const registerUrl = `${location.origin}${location.pathname}#/register`;

  const submit = () => {
    if (!draft.firstName || !draft.phone) return;
    const customer = addCustomer({
      firstName: draft.firstName,
      lastName: draft.lastName || '—',
      email: draft.email || `${draft.phone.replace(/\D/g, '')}@pending.mwc`,
      phone: draft.phone,
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
      tags: ['rain-check'],
    });
    const rc = issueRainCheck({ customerId: customer.id, packageType: draft.packageType, minutesOwed: draft.minutesOwed, reason: 'Lightning closure' });
    void cloudSaveSignup({
      first_name: draft.firstName,
      last_name: draft.lastName || '',
      phone: draft.phone,
      email: draft.email || null,
      photo_url: photo ?? null,
      can_swim: true,
      pass_code: rc.code,
      package_label: PACKAGE_META[draft.packageType].label,
      minutes_owed: draft.minutesOwed,
      reason: 'Lightning closure',
      status: 'issued',
    });
    setDraft({ firstName: '', lastName: '', phone: '', email: '', packageType: draft.packageType, minutesOwed: draft.minutesOwed });
    setPhoto(undefined);
    nameRef.current?.focus();
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Lightning hold"
        description="The lake is closed. Register everyone who was waiting — no paper. Each person gets a pass to come back, and the whole list exports as a PDF."
        actions={
          <>
            <Button size="lg" variant="outline" onClick={() => window.print()}>
              <FileDown className="h-5 w-5" /> Export PDF
            </Button>
            <Button size="lg" variant="accent" onClick={() => setQrOpen(true)}>
              <QrIcon className="h-5 w-5" /> Let them register themselves
            </Button>
          </>
        }
      />

      <div
        className={cn(
          'mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs font-semibold print:hidden',
          isCloudEnabled() ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800',
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', isCloudEnabled() ? 'bg-emerald-500' : 'bg-amber-500')} />
        {isCloudEnabled()
          ? `Connected — ${cloudRows.length} sign-ups synced across every device.`
          : 'Demo mode — this device only. Add the Supabase keys to sync phones and the front desk.'}
      </div>

      {/* Registro rápido — una persona cada pocos segundos */}
      <Card className="mb-5 border-lagoon-300 print:hidden">
        <CardHeader
          title="Add a person from the line"
          subtitle="Name and phone are enough. Photo helps recognize them when they come back."
          icon={<CloudLightning className="h-4 w-4" />}
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="flex items-center gap-4 sm:col-span-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="focus-ring relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-lagoon-400"
              aria-label="Take a photo"
            >
              {photo ? (
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
                  <UserPlus className="h-6 w-6" />
                  <span className="text-[10px] font-bold">Photo</span>
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
            <p className="text-sm text-slate-500">
              On a phone this opens the camera directly. On a computer it opens the file picker.
            </p>
          </div>

          <Field label="First name" required>
            <Input ref={nameRef} value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} className="h-14 text-lg" placeholder="Maria" />
          </Field>
          <Field label="Last name">
            <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} className="h-14 text-lg" placeholder="Rodriguez" />
          </Field>
          <Field label="Phone" required>
            <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} className="h-14 text-lg" placeholder="(305) 555-0100" inputMode="tel" />
          </Field>
          <Field label="Email" hint="Optional — for the confirmation and offers">
            <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} className="h-14 text-lg" inputMode="email" />
          </Field>
          <Field label="What they had paid">
            <Select value={draft.packageType} onChange={(e) => setDraft({ ...draft, packageType: e.target.value as PackageType })} className="h-14 text-lg">
              {(Object.keys(PACKAGE_META) as PackageType[]).map((p) => (
                <option key={p} value={p}>
                  {PACKAGE_META[p].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Minutes they are owed">
            <Select value={draft.minutesOwed} onChange={(e) => setDraft({ ...draft, minutesOwed: Number(e.target.value) })} className="h-14 text-lg">
              {[30, 60, 90, 120, 240].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </Select>
          </Field>

          <Button size="lg" className="h-16 text-lg sm:col-span-2" onClick={submit} disabled={!draft.firstName || !draft.phone}>
            <Zap className="h-5 w-5" /> Register and issue the pass
          </Button>
        </div>
      </Card>

      {/* La lista — esto es lo que antes era el papel */}
      <Card>
        <CardHeader
          title={`Waiting list — ${today.length} today`}
          subtitle="Each pass is valid for 60 days. When they come back, tap Redeem and run their check-in."
          action={
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer className="h-4 w-4" /> Print / PDF
            </Button>
          }
        />
        {holds.length ? (
          <ul className="divide-y divide-slate-100">
            {holds.map((h) => (
              <li key={h.id} className={cn('flex flex-wrap items-center gap-4 px-5 py-4', h.status === 'redeemed' && 'opacity-50')}>
                <Avatar name={h.customer ? fullName(h.customer) : '—'} src={h.customer?.photoUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-deep-900">{h.customer ? fullName(h.customer) : '—'}</p>
                  <p className="text-sm text-slate-500">
                    {h.customer?.phone} · {PACKAGE_META[h.packageType].label} · {h.minutesOwed} min owed
                  </p>
                  <p className="text-xs text-slate-400">
                    Issued {formatTime(h.issuedAt)} · valid through {formatDate(h.expiresAt)}
                  </p>
                </div>
                <span className="font-mono text-lg font-black tracking-wider text-lagoon-700">{h.code}</span>
                {h.status === 'issued' ? (
                  <Button
                    size="lg"
                    onClick={() => {
                      redeemRainCheck(h.id);
                      void cloudRedeem(h.code);
                    }}
                    className="print:hidden"
                  >
                    Redeem
                  </Button>
                ) : (
                  <Badge tone="green" dot>
                    Redeemed
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CloudLightning className="h-6 w-6" />}
            title="Nobody on the list yet"
            description="Add the first person above, or put the QR on the counter so they register themselves."
          />
        )}
      </Card>

      {/* QR gigante para que la fila se registre sola */}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Show this to the line" subtitle="They scan it with their phone camera and register themselves — with their photo" size="sm">
        <div className="flex flex-col items-center gap-4 py-2">
          <QrCode value={registerUrl} size={260} caption="Each person fills their name, phone and photo. They land on this list instantly." />
          <p className="text-center text-xs text-slate-500">
            Works with the iPhone camera — no app to install. You can also print it and tape it to the counter.
          </p>
          <Button variant="outline" onClick={() => window.print()} className="w-full">
            <Printer className="h-4 w-4" /> Print the QR poster
          </Button>
        </div>
      </Modal>

      {/* ── Versión imprimible: la lista como documento con membrete ── */}
      <div className="hidden print:block">
        <div className="mb-6 flex items-center justify-between border-b-2 border-deep-900 pb-4">
          <LogoLockup className="h-10 w-auto" />
          <div className="text-right">
            <p className="text-sm font-black uppercase tracking-wide">Lightning hold — waiting list</p>
            <p className="text-xs text-slate-600">
              {formatDate(new Date().toISOString())} · {holds.length} passes · valid 60 days
            </p>
          </div>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-400 text-left text-[11px] font-bold uppercase">
              <th className="py-2">Pass</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Package owed</th>
              <th>Minutes</th>
              <th>Issued</th>
              <th>Valid through</th>
            </tr>
          </thead>
          <tbody>
            {holds.map((h) => (
              <tr key={h.id} className="border-b border-slate-200">
                <td className="py-2 font-mono font-bold">{h.code}</td>
                <td>{h.customer ? fullName(h.customer) : '—'}</td>
                <td>{h.customer?.phone}</td>
                <td>{PACKAGE_META[h.packageType].label}</td>
                <td>{h.minutesOwed}</td>
                <td>{formatDate(h.issuedAt)}</td>
                <td>{formatDate(h.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[10px] text-slate-500">
          Miami Watersports Complex · (305) 476-9253 · miamiwatersportscomplex.com — Passes are issued for weather closures and are valid for 60 days from issue.
        </p>
      </div>
    </div>
  );
}
