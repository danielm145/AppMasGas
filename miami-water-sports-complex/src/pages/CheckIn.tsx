import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, FileSignature, ShieldCheck, UserPlus, X } from 'lucide-react';
import { QrTag } from '@/components/QrCode';
import { QrScanner } from '@/components/QrScanner';
import { SignaturePad } from '@/components/SignaturePad';
import { useStore } from '@/lib/store';
import {
  ASSET_CATEGORY_LABELS,
  LINE_LABELS,
  PACKAGE_META,
  TIER_META,
  type AssetCategory,
  type CableLine,
  type PackageType,
} from '@/lib/types';
import { age, cn, formatDate, money } from '@/lib/utils';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  PageHeader,
  SearchInput,
  Select,
} from '@/components/ui';

type Step = 'customer' | 'waiver' | 'package' | 'gear' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'customer', label: 'Customer' },
  { key: 'waiver', label: 'Waiver' },
  { key: 'package', label: 'Package' },
  { key: 'gear', label: 'Gear' },
  { key: 'done', label: 'Done' },
];

const GEAR_CATEGORIES: AssetCategory[] = ['helmet', 'vest', 'wakeboard', 'kneeboard', 'wakeskate'];

/**
 * Flujo completo de recepción: identificar al cliente (o crearlo), verificar el
 * waiver vigente, cobrar el paquete, entregar el equipo y emitir la pulsera QR.
 */
export default function CheckIn() {
  const { state, addCustomer, updateCustomer, addWaiver, startSession, toast } = useStore();
  const [step, setStep] = useState<Step>('customer');
  const [query, setQuery] = useState('');
  const [customerId, setCustomerId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [signature, setSignature] = useState<string>();
  const [acceptRules, setAcceptRules] = useState(false);
  const [acceptPhoto, setAcceptPhoto] = useState(true);
  const [packageType, setPackageType] = useState<PackageType>('hour-1');
  const [line, setLine] = useState<CableLine>('full-cable');
  const [gear, setGear] = useState<string[]>([]);
  const [wristband, setWristband] = useState<string>();
  const [gearScanner, setGearScanner] = useState(false);

  const [draft, setDraft] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    city: 'Hialeah',
    zip: '',
    ecName: '',
    ecPhone: '',
    ecRelation: 'Madre',
    guardianName: '',
    guardianPhone: '',
    canSwim: false,
    idVerified: false,
    marketingOptIn: true,
    smsOptIn: true,
  });

  const customer = state.customers.find((c) => c.id === customerId);
  const activeWaiver = state.waivers.find((w) => w.customerId === customerId && new Date(w.expiresAt) > new Date());
  const isMinor = customer ? age(customer.dob) < 18 : draft.dob ? age(draft.dob) < 18 : false;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return state.customers.slice(0, 6);
    return state.customers
      .filter((c) => `${c.firstName} ${c.lastName} ${c.email} ${c.phone} ${c.memberCode}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, state.customers]);

  const availableGear = useMemo(
    () => state.assets.filter((a) => a.status === 'available' && GEAR_CATEGORIES.includes(a.category)),
    [state.assets],
  );

  const assignedGear = useMemo(() => state.assets.filter((a) => gear.includes(a.id)), [state.assets, gear]);
  const assignedHelmet = assignedGear.find((a) => a.category === 'helmet');

  /**
   * Un escaneo en el mostrador equivale a tocar la pieza en la lista.
   *
   * Se rechaza lo que no se puede entregar —bloqueado por mantenimiento, ya en
   * manos de otro rider— porque descubrirlo en el muelle cuesta mucho más caro
   * que descubrirlo aquí.
   */
  const handleGearScan = (raw: string) => {
    const code = raw.trim().replace(/^mwc:\/\/(asset|ride)\//i, '').toUpperCase();
    const asset = state.assets.find((a) => a.code === code);

    if (!asset) {
      toast(`No asset with code ${code}`, 'error');
      return;
    }
    if (!GEAR_CATEGORIES.includes(asset.category)) {
      toast(`${asset.code} is a ${ASSET_CATEGORY_LABELS[asset.category].toLowerCase()}, not rider gear`, 'error');
      return;
    }
    if (gear.includes(asset.id)) {
      toast(`${asset.code} is already on this check-in`, 'info');
      return;
    }
    if (asset.status === 'maintenance') {
      toast(`${asset.code} is blocked for maintenance — pick another one`, 'error');
      return;
    }
    if (asset.status === 'in-use') {
      toast(`${asset.code} is already out with another rider`, 'error');
      return;
    }
    if (asset.status !== 'available') {
      toast(`${asset.code} is not available`, 'error');
      return;
    }

    setGear((g) => [...g, asset.id]);
    toast(`${ASSET_CATEGORY_LABELS[asset.category]} ${asset.code} added`);
  };

  const reset = () => {
    setStep('customer');
    setCustomerId(undefined);
    setQuery('');
    setSignature(undefined);
    setAcceptRules(false);
    setGear([]);
    setWristband(undefined);
    setCreating(false);
  };

  const createCustomer = () => {
    if (!draft.firstName || !draft.lastName || !draft.email) {
      toast('First name, last name and email are required', 'error');
      return;
    }
    if (!draft.canSwim) {
      toast('The customer must declare they know how to swim', 'error');
      return;
    }
    const minor = draft.dob ? age(draft.dob) < 18 : false;
    const c = addCustomer({
      firstName: draft.firstName,
      lastName: draft.lastName,
      email: draft.email,
      phone: draft.phone,
      dob: draft.dob || '2000-01-01',
      city: draft.city,
      state: 'FL',
      zip: draft.zip,
      skillLevel: 'beginner',
      emergencyContact: { name: draft.ecName, relation: draft.ecRelation, phone: draft.ecPhone },
      isMinor: minor,
      guardianName: minor ? draft.guardianName : undefined,
      guardianPhone: minor ? draft.guardianPhone : undefined,
      canSwim: draft.canSwim ? 'declared' : 'pending',
      idVerified: draft.idVerified,
      marketingOptIn: draft.marketingOptIn,
      smsOptIn: draft.smsOptIn,
      tags: [],
    });
    setCustomerId(c.id);
    setCreating(false);
    setStep('waiver');
  };

  const signWaiver = () => {
    if (!customer) return;
    if (!signature || !acceptRules) {
      toast('Signature or rules acceptance is missing', 'error');
      return;
    }
    addWaiver({
      customerId: customer.id,
      type: isMinor ? 'minor-consent' : 'liability',
      version: 'v3.2 (2025-01)',
      signedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
      signerName: isMinor ? customer.guardianName ?? `${customer.firstName} ${customer.lastName}` : `${customer.firstName} ${customer.lastName}`,
      signatureDataUrl: signature,
      ipAddress: '— (front desk kiosk)',
      minor: isMinor,
      guardianName: customer.guardianName,
    });
    if (acceptPhoto) {
      addWaiver({
        customerId: customer.id,
        type: 'photo-release',
        version: 'v1.4',
        signedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 864e5).toISOString(),
        signerName: `${customer.firstName} ${customer.lastName}`,
        signatureDataUrl: signature,
        ipAddress: '— (front desk kiosk)',
        minor: isMinor,
      });
    }
    setStep('package');
  };

  const finish = () => {
    if (!customerId) return;
    const session = startSession({ customerId, packageType, line, assetIds: gear });
    setWristband(session.wristbandCode);
    setStep('done');
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Rider check-in"
        description="Registration, waiver, payment and gear handout in one flow. The helmet handed out — with its permanent QR — is the rider’s identity."
        actions={
          step !== 'customer' && (
            <Button variant="ghost" onClick={reset}>
              Start over
            </Button>
          )
        }
      />

      {/* Indicador de pasos */}
      <ol className="mb-6 flex items-center gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex flex-1 items-center gap-1">
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition',
                i < stepIndex ? 'bg-emerald-500 text-white' : i === stepIndex ? 'bg-lagoon-600 text-white' : 'bg-slate-200 text-slate-500',
              )}
            >
              {i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('hidden whitespace-nowrap text-xs font-semibold sm:block', i === stepIndex ? 'text-deep-900' : 'text-slate-400')}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className={cn('h-px flex-1', i < stepIndex ? 'bg-emerald-400' : 'bg-slate-200')} />}
          </li>
        ))}
      </ol>

      {/* Paso 1 — cliente */}
      {step === 'customer' && (
        <Card>
          <CardHeader
            title="Who is riding today?"
            subtitle="Search by name, phone, email or member number"
            action={
              <Button variant="outline" size="sm" onClick={() => setCreating((v) => !v)}>
                <UserPlus className="h-3.5 w-3.5" /> {creating ? 'Search existing' : 'New customer'}
              </Button>
            }
          />
          <div className="p-5">
            {!creating ? (
              <>
                <SearchInput value={query} onChange={setQuery} placeholder="María Rodríguez, (305) 555-0100, MWC-1004…" />
                <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {results.map((c) => {
                    const waiver = state.waivers.find((w) => w.customerId === c.id && new Date(w.expiresAt) > new Date());
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => {
                            setCustomerId(c.id);
                            setStep(waiver ? 'package' : 'waiver');
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-lagoon-50/50"
                        >
                          <Avatar name={`${c.firstName} ${c.lastName}`} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-deep-900">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {c.memberCode} · {c.visits} visits · {c.email}
                            </p>
                          </div>
                          <Badge className={TIER_META[c.tier].color}>{TIER_META[c.tier].label}</Badge>
                          {waiver ? (
                            <Badge tone="green" dot>
                              Waiver OK
                            </Badge>
                          ) : (
                            <Badge tone="rose" dot>
                              No waiver
                            </Badge>
                          )}
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </button>
                      </li>
                    );
                  })}
                  {!results.length && <li className="px-4 py-8 text-center text-sm text-slate-400">No matches. Create a new customer.</li>}
                </ul>
              </>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <Input value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} placeholder="María" />
                </Field>
                <Field label="Last name" required>
                  <Input value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} placeholder="Rodríguez" />
                </Field>
                <Field label="Email" required hint="Used for the waiver, the receipt and campaigns">
                  <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="maria@email.com" />
                </Field>
                <Field label="Phone">
                  <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="(305) 555-0100" />
                </Field>
                <Field label="Date of birth" hint="Determines whether guardian consent is required">
                  <Input type="date" value={draft.dob} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
                </Field>
                <Field label="City">
                  <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                </Field>

                <div className="sm:col-span-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Emergency contact</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="First name">
                      <Input value={draft.ecName} onChange={(e) => setDraft({ ...draft, ecName: e.target.value })} />
                    </Field>
                    <Field label="Relationship">
                      <Select value={draft.ecRelation} onChange={(e) => setDraft({ ...draft, ecRelation: e.target.value })}>
                        {['Madre', 'Padre', 'Spouse', 'Hermano/a', 'Amigo/a', 'Otro'].map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Phone">
                      <Input value={draft.ecPhone} onChange={(e) => setDraft({ ...draft, ecPhone: e.target.value })} />
                    </Field>
                  </div>
                </div>

                {draft.dob && age(draft.dob) < 18 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:col-span-2">
                    <p className="mb-3 flex items-center gap-2 text-xs font-bold text-amber-800">
                      <AlertTriangle className="h-4 w-4" /> Minor — se requiere tutor
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Guardian name" required>
                        <Input value={draft.guardianName} onChange={(e) => setDraft({ ...draft, guardianName: e.target.value })} />
                      </Field>
                      <Field label="Phone del tutor" required>
                        <Input value={draft.guardianPhone} onChange={(e) => setDraft({ ...draft, guardianPhone: e.target.value })} />
                      </Field>
                    </div>
                  </div>
                )}

                <div className="rounded-xl border-2 border-deep-900 bg-slate-50 p-4 sm:col-span-2">
                  <p className="mb-2.5 text-xs font-black uppercase tracking-wide text-deep-900">Must know how to swim</p>
                  <div className="space-y-2">
                    <Checkbox
                      label="The customer declares they know how to swim"
                      hint="Park rule — nobody enters the water without this declaration"
                      checked={draft.canSwim}
                      onChange={(v) => setDraft({ ...draft, canSwim: v })}
                    />
                    <Checkbox
                      label="Photo ID checked at the counter"
                      hint="“Please have your ID ready” — required for the waiver to hold up"
                      checked={draft.idVerified}
                      onChange={(v) => setDraft({ ...draft, idVerified: v })}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Checkbox
                    label="I agree to receive promotions by email"
                    hint="Basis for post-sale and win-back campaigns"
                    checked={draft.marketingOptIn}
                    onChange={(v) => setDraft({ ...draft, marketingOptIn: v })}
                  />
                  <Checkbox label="I agree to receive text messages" checked={draft.smsOptIn} onChange={(v) => setDraft({ ...draft, smsOptIn: v })} />
                </div>

                <div className="sm:col-span-2">
                  <Button onClick={createCustomer} className="w-full" size="lg">
                    Create customer and continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Paso 2 — waiver */}
      {step === 'waiver' && customer && (
        <Card>
          <CardHeader
            title="Exoneración de responsabilidad"
            subtitle={`${customer.firstName} ${customer.lastName} · ${isMinor ? 'Minor — firma el tutor' : `${age(customer.dob)} years old`}`}
            icon={<FileSignature className="h-4 w-4" />}
          />
          <div className="p-5">
            {activeWaiver && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-4 w-4" /> Already has a valid waiver through {formatDate(activeWaiver.expiresAt)}.
              </div>
            )}

            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600">
              <p className="mb-2 font-bold text-deep-900">MIAMI WATERSPORTS COMPLEX — ASSUMPTION OF RISK AND RELEASE</p>
              <p className="mb-2">
                I acknowledge that cable wakeboarding, the use of obstacles, the inflatable aqua park and boat activities carry inherent risks of serious
                injury or death, including collisions, falls, drowning and adverse weather.
              </p>
              <p className="mb-2">
                I declare that I am in adequate physical condition, that I know how to swim or accept the mandatory use of a life vest, and that I will wear
                a helmet and vest for the entire activity and follow staff instructions at all times.
              </p>
              <p className="mb-2">
                I release Miami Watersports Complex, its owners, employees and insurers from all liability for any harm arising from my participation,
                except in cases of proven gross negligence.
              </p>
              <p>
                I authorize emergency medical care if needed and accept responsibility for the associated costs. This release is valid for 12 months from
                the date of signature.
              </p>
            </div>

            <div className="mt-4 space-y-2.5">
              <Checkbox label="I have read and accept the waiver and park rules" checked={acceptRules} onChange={setAcceptRules} />
              <Checkbox
                label="I authorize the use of my image on the park’s social media"
                hint="Optional — filed as a separate photo release"
                checked={acceptPhoto}
                onChange={setAcceptPhoto}
              />
            </div>

            <div className="mt-5">
              <SignaturePad onChange={setSignature} label={isMinor ? `Firma del tutor (${customer.guardianName ?? 'tutor'})` : 'Customer signature'} />
            </div>

            <div className="mt-5 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep('customer')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={signWaiver} disabled={!signature || !acceptRules}>
                Sign and continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Bloqueo de seguridad: ningún cliente entra al agua sin declarar que sabe nadar */}
      {step === 'package' && customer && customer.canSwim !== 'declared' && (
        <Card className="mb-4 border-rose-300 bg-rose-50">
          <div className="flex flex-wrap items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="flex-1 text-sm font-semibold text-rose-900">
              {customer.firstName} has not declared they know how to swim. Park rule: they cannot enter the water.
            </p>
            <Button size="sm" onClick={() => updateCustomer(customer.id, { canSwim: 'declared' })}>
              They declare it now
            </Button>
          </div>
        </Card>
      )}

      {/* Paso 3 — paquete */}
      {step === 'package' && customer && (
        <Card>
          <CardHeader title="Package y atracción" subtitle={`${customer.firstName} ${customer.lastName} · ${TIER_META[customer.tier].label} · ${customer.points} pts available`} />
          <div className="p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Package</p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(PACKAGE_META) as PackageType[])
                .filter((p) => p !== 'camp')
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setPackageType(p)}
                    className={cn(
                      'rounded-xl border-2 p-3.5 text-left transition',
                      packageType === p ? 'border-lagoon-500 bg-lagoon-50/60' : 'border-slate-200 hover:border-slate-300',
                    )}
                  >
                    <p className="text-sm font-bold text-deep-900">{PACKAGE_META[p].label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{PACKAGE_META[p].minutes} minutos</p>
                    <p className="mt-1.5 text-lg font-extrabold text-lagoon-700">{money(PACKAGE_META[p].price)}</p>
                  </button>
                ))}
            </div>

            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Attraction</p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(LINE_LABELS) as CableLine[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLine(l)}
                  className={cn(
                    'rounded-xl border-2 px-3.5 py-3 text-left text-sm font-semibold transition',
                    line === l ? 'border-lagoon-500 bg-lagoon-50/60 text-deep-900' : 'border-slate-200 text-slate-600 hover:border-slate-300',
                  )}
                >
                  {LINE_LABELS[l]}
                </button>
              ))}
            </div>

            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Credit card only · No refunds or rainchecks
            </p>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Total to charge</p>
                <p className="text-2xl font-extrabold text-deep-900">{money(PACKAGE_META[packageType].price)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Points they will earn</p>
                <p className="text-lg font-bold text-lagoon-700">
                  +{Math.round(PACKAGE_META[packageType].price * { splash: 1, rider: 1.25, pro: 1.5, legend: 2 }[customer.tier])} pts
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep('waiver')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep('gear')}>
                Assign gear <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Paso 4 — equipo */}
      {step === 'gear' && (
        <Card>
          <CardHeader
            title="Gear handout"
            subtitle="Scan the tag on each item, or tap it in the list below. The helmet identifies the rider on the dock; the board traces who took it."
          />
          <div className="p-5">
            <Button size="lg" variant="accent" className="mb-4 h-16 w-full text-lg" onClick={() => setGearScanner(true)}>
              <Camera className="h-6 w-6" /> Scan the gear
            </Button>

            {assignedGear.length > 0 && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  On this check-in — {assignedGear.length} {assignedGear.length === 1 ? 'item' : 'items'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {assignedGear.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-2 rounded-lg border border-lagoon-300 bg-white py-1.5 pl-2.5 pr-1.5">
                      <span className="font-mono text-xs font-bold text-lagoon-700">{a.code}</span>
                      <span className="text-[11px] text-slate-500">{ASSET_CATEGORY_LABELS[a.category]}</span>
                      <button
                        onClick={() => setGear((g) => g.filter((x) => x !== a.id))}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                        aria-label={`Remove ${a.code}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!assignedHelmet ? (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  El <strong>casco es obligatorio</strong>. Su etiqueta QR de vinilo ya viene pegada de fábrica y es la identidad del rider: no se imprime nada
                  por sesión.
                </span>
              </p>
            ) : (
              <p className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[12px] text-emerald-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Casco <span className="font-mono font-bold">{assignedHelmet.code}</span> ligado a {customer?.firstName ?? 'el rider'} hasta que lo devuelva.
                  El operador escanea ese QR en cada vuelta.
                </span>
              </p>
            )}
            {GEAR_CATEGORIES.map((cat) => {
              const items = availableGear.filter((a) => a.category === cat).slice(0, 10);
              if (!items.length) return null;
              return (
                <div key={cat} className="mb-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{ASSET_CATEGORY_LABELS[cat]}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((a) => {
                      const selected = gear.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => setGear((g) => (selected ? g.filter((x) => x !== a.id) : [...g, a.id]))}
                          className={cn(
                            'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition',
                            selected ? 'border-lagoon-500 bg-lagoon-50' : 'border-slate-200 hover:border-slate-300',
                          )}
                        >
                          {a.photoUrl && <img src={a.photoUrl} alt="" className="h-8 w-8 rounded object-cover" />}
                          <span>
                            <span className="block font-mono text-[10px] font-bold text-slate-500">{a.code}</span>
                            <span className="block text-xs font-semibold text-deep-900">{a.size ?? a.name}</span>
                          </span>
                          {selected && <Check className="h-4 w-4 text-lagoon-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div className="mt-5 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep('package')}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={finish} size="lg" disabled={!assignedHelmet}>
                {assignedHelmet ? 'Link the gear and open the session' : 'Assign a helmet to continue'} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      <QrScanner open={gearScanner} onClose={() => setGearScanner(false)} onScan={handleGearScan} />

      {/* Paso 5 — pulsera */}
      {step === 'done' && wristband && customer && (
        <Card>
          <CardHeader
            title="Done — gear handed out and linked to the rider"
            subtitle="The helmet QR is the rider’s identity during the session; the board QR traces the handout"
          />
          <div className="grid gap-6 p-6 lg:grid-cols-2">
            <div>
              <QrTag
                code={assignedHelmet ? assignedHelmet.code : wristband}
                title={`${customer.firstName} ${customer.lastName}`}
                subtitle={
                  assignedHelmet
                    ? `Casco ${assignedHelmet.size ?? assignedHelmet.name} · ${PACKAGE_META[packageType].label}`
                    : `${PACKAGE_META[packageType].label} · ${LINE_LABELS[line]}`
                }
                footnote="This QR already lives on the helmet. Shown here for reference only — nothing needs printing."
              />
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                Las etiquetas son de vinilo laminado resistente al agua y se imprimen una sola vez, cuando el activo se da de alta. Si una se despega o se
                raya, se reimprime esa etiqueta desde <span className="font-semibold">Activos → QR labels</span> sin cambiar el código.
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Gear linked to this session</p>
              {assignedGear.length ? (
                <ul className="mb-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {assignedGear.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                      {a.photoUrl && <img src={a.photoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />}
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[11px] font-bold text-lagoon-700">{a.code}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {ASSET_CATEGORY_LABELS[a.category]} · {a.size ?? a.name}
                        </span>
                      </span>
                      <Link to={`/assets/${a.id}`} className="shrink-0 text-[11px] font-semibold text-lagoon-600 hover:underline">
                        Historial
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-5 text-sm text-slate-400">No gear assigned.</p>
              )}

              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4" /> Valid waiver on file
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4" /> Payment recorded: {money(PACKAGE_META[packageType].price)}
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4" /> Handout recorded in each asset’s history
                </li>
                <li className="flex items-center gap-2 text-emerald-700">
                  <Check className="h-4 w-4" /> Session visible in live operations
                </li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/operations">
                  <Button>Go to operations</Button>
                </Link>
                <Button variant="outline" onClick={reset}>
                  Another check-in
                </Button>
                <Link to={`/customers/${customer.id}`}>
                  <Button variant="ghost">View customer profile</Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
