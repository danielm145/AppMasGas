import { useState } from 'react';
import { Building2, CreditCard, Plug, QrCode, Save, ShieldCheck, Sliders, Waves } from 'lucide-react';
import { useStore } from '@/lib/store';
import { LINE_LABELS, PACKAGE_META, ROLE_LABELS, TIER_META, type CableLine, type LoyaltyTier, type PackageType, type Role } from '@/lib/types';
import { money, num } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  PageHeader,
  Select,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Table,
  Td,
  Th,
  Textarea,
  Tr,
} from '@/components/ui';
import { NAV } from '@/lib/nav';

const CAPACITY: Record<CableLine, number> = { 'full-cable': 10, 'system-2': 6, kicker: 4, 'aqua-park': 40, wakesurf: 4, tubing: 6 };

export default function Settings() {
  const { toast } = useStore();
  const [park, setPark] = useState({
    name: 'Miami Watersports Complex',
    address: '5151 NW 79th Ave, Hialeah, FL 33166',
    phone: '(305) 476-9253',
    email: 'info@miamiwatersportscomplex.com',
    open: '10:00',
    close: '19:00',
    waiverMonths: 12,
    taxRate: 7,
  });

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader title="Settings" description="Park parameters, pricing, loyalty rules, permissions and integrations." />

      <Tabs defaultValue="parque">
        <TabList className="mb-5">
          <Tab value="parque">Park</Tab>
          <Tab value="precios">Pricing & capacity</Tab>
          <Tab value="lealtad">Loyalty</Tab>
          <Tab value="permisos">Permissions</Tab>
          <Tab value="qr">QR codes</Tab>
          <Tab value="integraciones">Integrations</Tab>
        </TabList>

        <TabPanel value="parque">
          <Card>
            <CardHeader title="Business details" subtitle="Shown on waivers, receipts and emails" icon={<Building2 className="h-4 w-4" />} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Business name">
                <Input value={park.name} onChange={(e) => setPark({ ...park, name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={park.phone} onChange={(e) => setPark({ ...park, phone: e.target.value })} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={park.address} onChange={(e) => setPark({ ...park, address: e.target.value })} />
              </Field>
              <Field label="Contact email">
                <Input value={park.email} onChange={(e) => setPark({ ...park, email: e.target.value })} />
              </Field>
              <Field label="Sales tax (%)">
                <Input type="number" value={park.taxRate} onChange={(e) => setPark({ ...park, taxRate: Number(e.target.value) })} />
              </Field>
              <Field label="Opening time">
                <Input type="time" value={park.open} onChange={(e) => setPark({ ...park, open: e.target.value })} />
              </Field>
              <Field label="Closing time">
                <Input type="time" value={park.close} onChange={(e) => setPark({ ...park, close: e.target.value })} />
              </Field>
              <Field label="Waiver validity (months)" hint="After that the customer must sign again" className="sm:col-span-2">
                <Input type="number" value={park.waiverMonths} onChange={(e) => setPark({ ...park, waiverMonths: Number(e.target.value) })} />
              </Field>
              <div className="sm:col-span-2">
                <Button onClick={() => toast('Park settings saved')}>
                  <Save className="h-4 w-4" /> Save changes
                </Button>
              </div>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="precios">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Price list" subtitle="Applied at check-in and on reservations" icon={<CreditCard className="h-4 w-4" />} />
              <Table>
                <thead>
                  <tr>
                    <Th>Package</Th>
                    <Th className="text-right">Duration</Th>
                    <Th className="text-right">Price</Th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PACKAGE_META) as PackageType[]).map((p) => (
                    <Tr key={p}>
                      <Td className="font-medium">{PACKAGE_META[p].label}</Td>
                      <Td className="text-right tabular-nums text-slate-500">{PACKAGE_META[p].minutes} min</Td>
                      <Td className="text-right font-bold tabular-nums">{money(PACKAGE_META[p].price)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            <Card>
              <CardHeader title="Safe capacity per attraction" subtitle="Defines when the system flags a line as saturated" icon={<Waves className="h-4 w-4" />} />
              <div className="space-y-4 p-5">
                {(Object.keys(LINE_LABELS) as CableLine[]).map((l) => (
                  <Field key={l} label={LINE_LABELS[l]}>
                    <Input type="number" defaultValue={CAPACITY[l]} />
                  </Field>
                ))}
                <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
                  The congestion indicator uses these numbers: green below 30%, amber at 60%, red at 90%. The front desk stops selling that line once it turns red.
                </p>
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="lealtad">
          <Card>
            <CardHeader title="Program rules" subtitle="Tiers recalculate automatically from lifetime points" icon={<Sliders className="h-4 w-4" />} />
            <Table>
              <thead>
                <tr>
                  <Th>Tier</Th>
                  <Th className="text-right">Points required</Th>
                  <Th className="text-right">Points per dollar</Th>
                  <Th>Perks</Th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(TIER_META) as LoyaltyTier[]).map((t) => (
                  <Tr key={t}>
                    <Td>
                      <Badge className={TIER_META[t].color}>{TIER_META[t].label}</Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{num(TIER_META[t].min)}</Td>
                    <Td className="text-right font-bold tabular-nums">{{ splash: 1, rider: 1.25, pro: 1.5, legend: 2 }[t]}×</Td>
                    <Td className="text-[12px] text-slate-600">{TIER_META[t].perks.join(' · ')}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-3">
              <Field label="Welcome bonus (pts)">
                <Input type="number" defaultValue={100} />
              </Field>
              <Field label="Referral bonus (pts)">
                <Input type="number" defaultValue={250} />
              </Field>
              <Field label="Point expiry (months)" hint="0 = never expire">
                <Input type="number" defaultValue={24} />
              </Field>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="permisos">
          <Card>
            <CardHeader title="Access matrix" subtitle="Which module each role sees — switch the active user in the top right to try it" icon={<ShieldCheck className="h-4 w-4" />} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr>
                    <Th className="sticky left-0 bg-slate-50">Module</Th>
                    {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                      <Th key={r} className="text-center">
                        {ROLE_LABELS[r]}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {NAV.map((item) => (
                    <Tr key={item.to}>
                      <Td className="sticky left-0 bg-white font-medium">{item.label}</Td>
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <Td key={r} className="text-center">
                          {item.roles.includes(r) ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-label="Has access" />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-slate-200" aria-label="No access" />
                          )}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="qr">
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Gear labels" subtitle="How identification works on the dock" icon={<QrCode className="h-4 w-4" />} />
              <div className="space-y-4 p-5 text-sm text-slate-600">
                <p>
                  Cada <strong>casco</strong> y cada <strong>tabla</strong> lleva pegada una etiqueta QR permanente con su código de activo
                  (<span className="font-mono text-xs">MWC-HLM-062</span>, <span className="font-mono text-xs">MWC-BRD-014</span>). Se imprime una sola vez, al
                  dar de alta el activo.
                </p>
                <ul className="space-y-2">
                  {[
                    'En el check-in se liga el casco y la tabla al cliente. Esa entrega queda asentada en el historial de cada activo.',
                    'En la torre de salida el operador apunta el teléfono al QR del casco: el sistema resuelve la sesión y suma la vuelta.',
                    'Cada escaneo queda firmado con el empleado que lo hizo, la hora y la línea — de ahí salen las horas pico.',
                    'Al devolver el equipo el activo vuelve a “disponible”, suma horas de uso y avanza hacia su próximo mantenimiento.',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lagoon-500" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card>
              <CardHeader title="Material specification" subtitle="To order from the print supplier" />
              <div className="space-y-4 p-5">
                <dl className="divide-y divide-slate-100 text-sm">
                  {[
                    ['Material', 'Vinilo blanco laminado mate'],
                    ['Tamaño', '30 × 30 mm (casco) · 40 × 40 mm (tabla)'],
                    ['Adhesivo', 'Permanente, resistente al agua y al cloro'],
                    ['Corrección de errores', 'Nivel M (recupera hasta 15% dañado)'],
                    ['Contenido', 'mwc://asset/<código> + código legible'],
                    ['Reemplazo', 'Solo si se despega o se raya; el código no cambia'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 py-2.5">
                      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                      <dd className="text-right text-[13px] text-deep-900">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="rounded-lg bg-lagoon-50 p-3 text-[11px] leading-relaxed text-lagoon-900">
                  El nivel de corrección M permite que el código siga leyéndose aunque la etiqueta se raye con el uso, que es lo que pasa en el muelle. Para
                  cascos conviene además una capa de laminado extra en la zona de impacto.
                </p>
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="integraciones">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['Stripe', 'Cobros con tarjeta en recepción y reservas online', true],
              ['Mailchimp / Brevo', 'Envío de campañas y automatizaciones de correo', true],
              ['Twilio', 'SMS de recordatorio y confirmación de turnos', false],
              ['Google Calendar', 'Sincroniza turnos publicados con el calendario del empleado', false],
              ['QuickBooks', 'Exporta ventas y nómina a contabilidad', false],
              ['Google Reviews', 'Solicita reseña automática tras cada visita', true],
            ].map(([name, desc, active]) => (
              <Card key={String(name)} className="flex items-start gap-3 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Plug className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-deep-900">{name as string}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{desc as string}</p>
                </div>
                <Checkbox label="" checked={active as boolean} onChange={() => toast('Integration still to be connected in production', 'info')} />
              </Card>
            ))}
          </div>

          <Card className="mt-5">
            <CardHeader title="Implementation notes" subtitle="For the engineering team" />
            <div className="p-5">
              <Textarea
                defaultValue={`Este prototipo corre 100% en el navegador con datos de demostración persistidos en localStorage.

Para producción:
· API REST o GraphQL con Postgres — los tipos de src/lib/types.ts son el contrato.
· Autenticación con roles (el guard de rutas ya está en src/App.tsx).
· Almacenamiento de fotos y firmas en S3 o Cloudflare R2 en lugar de data URLs.
· Cola de correos para el envío de horarios y campañas.
· PWA con caché offline para el escáner del muelle: la conexión ahí no siempre es estable.`}
                className="min-h-[220px] font-mono text-xs"
              />
              <Button className="mt-3" onClick={() => toast('Notes saved')}>
                <Save className="h-4 w-4" /> Save notes
              </Button>
            </div>
          </Card>
        </TabPanel>
      </Tabs>

      <div className="mt-6 flex justify-center">
        <Select className="w-auto" defaultValue="es">
          <option value="es">Español</option>
          <option value="en">English</option>
        </Select>
      </div>
    </div>
  );
}
