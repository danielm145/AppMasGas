-- Miami Watersports Complex — esquema mínimo para arrancar hoy.
--
-- Pega TODO este archivo en Supabase → SQL Editor → Run.
-- Crea una sola tabla: la lista de gente que se registra cuando el lago cierra
-- por rayos, ya sea que la anote recepción o que la persona se registre sola
-- escaneando el QR desde su teléfono.

create table if not exists public.signups (
  id            uuid primary key default gen_random_uuid(),
  first_name    text        not null,
  last_name     text        not null default '',
  phone         text        not null,
  email         text,
  photo_url     text,                      -- data URL de la selfie
  can_swim      boolean     not null default false,
  pass_code     text        not null unique,
  package_label text        not null default '1-hour cable pass',
  minutes_owed  integer     not null default 60,
  reason        text        not null default 'Lightning closure',
  status        text        not null default 'issued',   -- issued | redeemed | expired
  created_at    timestamptz not null default now()
);

-- Búsquedas del mostrador: por código de pase y por teléfono.
create index if not exists signups_pass_code_idx on public.signups (pass_code);
create index if not exists signups_phone_idx     on public.signups (phone);
create index if not exists signups_created_idx   on public.signups (created_at desc);

alter table public.signups enable row level security;

-- El cliente se registra desde su propio teléfono con la clave anónima, así que
-- esa clave necesita poder insertar y leer. No expone nada más: esta tabla solo
-- contiene los registros del día de cierre por clima.
--
-- Al pasar a producción, lo correcto es mover esto detrás de una Edge Function
-- con rate limiting y dejar la tabla sin acceso anónimo directo.
drop policy if exists "anon can insert signups" on public.signups;
create policy "anon can insert signups"
  on public.signups for insert to anon with check (true);

drop policy if exists "anon can read signups" on public.signups;
create policy "anon can read signups"
  on public.signups for select to anon using (true);

drop policy if exists "anon can redeem signups" on public.signups;
create policy "anon can redeem signups"
  on public.signups for update to anon using (true) with check (true);
