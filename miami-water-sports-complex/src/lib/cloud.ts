/**
 * Sincronización con Supabase — opcional y sin dependencias.
 *
 * Si `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están definidas, los
 * registros de clientes y los rain checks se guardan también en Supabase, y la
 * pantalla de Lightning hold lee de ahí. Eso es lo que hace que el QR de
 * auto-registro funcione de verdad: el cliente se registra desde SU teléfono y
 * aparece en el iPad del mostrador.
 *
 * Si no están definidas, todo sigue funcionando contra localStorage y la demo
 * no se rompe. Encender la nube es pegar dos claves, no reescribir la app.
 *
 * Se habla PostgREST directo con fetch en vez de traer el SDK: son cuatro
 * llamadas y así el bundle no crece ni hay una dependencia más que mantener.
 */

/**
 * Supabase muestra la URL de la API como `https://xxx.supabase.co/rest/v1/`,
 * y es muy fácil pegarla tal cual. Aquí se normaliza a la raíz del proyecto
 * para que ambas formas funcionen y nadie pierda una hora por una barra.
 */
function normalizeBase(raw?: string) {
  if (!raw) return undefined;
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
}

const URL_BASE = normalizeBase(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isCloudEnabled = () => Boolean(URL_BASE && ANON_KEY);

function headers(extra: Record<string, string> = {}) {
  return {
    apikey: ANON_KEY!,
    Authorization: `Bearer ${ANON_KEY!}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Fila tal como vive en Postgres — snake_case, que es la convención de SQL. */
export interface CloudSignup {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  photo_url: string | null;
  can_swim: boolean;
  pass_code: string;
  package_label: string;
  minutes_owed: number;
  reason: string;
  status: string;
  created_at?: string;
}

/**
 * Guarda un registro. Nunca lanza: si la red falla en el muelle, la persona ya
 * quedó guardada localmente y no queremos romperle el flujo a recepción.
 */
export async function cloudSaveSignup(row: CloudSignup): Promise<boolean> {
  if (!isCloudEnabled()) return false;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/signups`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trae los registros del día, más recientes primero. */
export async function cloudListSignups(): Promise<CloudSignup[]> {
  if (!isCloudEnabled()) return [];
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/signups?select=*&order=created_at.desc&limit=200`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    return (await res.json()) as CloudSignup[];
  } catch {
    return [];
  }
}

/** Marca un pase como canjeado. */
export async function cloudRedeem(passCode: string): Promise<boolean> {
  if (!isCloudEnabled()) return false;
  try {
    const res = await fetch(`${URL_BASE}/rest/v1/signups?pass_code=eq.${encodeURIComponent(passCode)}`, {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ status: 'redeemed' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
