-- =============================================================================
-- Fase 1 · "Mi negocio" (multi-tenant)
-- Ejecutar en Supabase → SQL Editor DESPUÉS de 20261014_fase0_save_quote.sql.
-- Es idempotente: se puede volver a ejecutar sin duplicar datos.
--
-- Qué cambia
--  * organizations: el negocio que EMITE cotizaciones (un independiente o una
--    pyme con varios usuarios). Los clientes siguen siendo la agenda de cada negocio.
--  * organization_members: quién pertenece a cada negocio y con qué rol.
--  * quotes, clients e issuer pasan a pertenecer a un negocio (org_id).
--  * Numeración por negocio (antes era un contador global para todos).
--  * RLS por pertenencia al negocio; un usuario desactivado ya no puede leer
--    ni escribir por API. El admin de plataforma ya NO ve los datos de otros
--    negocios (sigue administrando usuarios en profiles).
--  * Datos existentes: cada usuario actual queda como dueño de su propio
--    negocio con sus cotizaciones, clientes y datos de emisor.
--
-- Compatibilidad: si una inserción llega sin org_id (versión anterior de la
-- app), un trigger asigna el negocio del usuario. save_quote también lo resuelve.
-- =============================================================================

-- ─── Tipos ───────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_tax_mode') then
    create type public.org_tax_mode as enum ('iva', 'exenta', 'honorarios');
  end if;
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('owner', 'editor', 'viewer');
  end if;
end $$;

-- ─── Tablas ──────────────────────────────────────────────────────────────────
create table if not exists public.organizations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  tax_mode          public.org_tax_mode not null default 'iva',
  quote_prefix      text not null default '',
  next_quote_number integer not null default 1 check (next_quote_number > 0),
  created_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.organization_members (
  org_id     uuid not null references public.organizations (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.org_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index if not exists organization_members_user_id_idx on public.organization_members (user_id);

alter table public.quotes  add column if not exists org_id uuid references public.organizations (id) on delete cascade;
alter table public.clients add column if not exists org_id uuid references public.organizations (id) on delete cascade;
alter table public.issuer  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

create index if not exists quotes_org_id_idx  on public.quotes (org_id);
create index if not exists clients_org_id_idx on public.clients (org_id);

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at
  before update on public.organizations
  for each row execute function public.update_updated_at();

-- ─── Funciones de permisos (SECURITY DEFINER para no recursar en RLS) ────────

-- Usuario con sesión, perfil activo y que no es "cliente".
create or replace function public.is_active_member_user()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true and p.role <> 'client'
  );
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_active_member_user() and exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_org(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_active_member_user() and exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role in ('owner', 'editor')
  );
$$;

create or replace function public.is_org_owner(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_active_member_user() and exists (
    select 1 from public.organization_members m
    where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- Negocio por defecto del usuario: el primero al que se unió.
create or replace function public.default_org_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select m.org_id from public.organization_members m
  where m.user_id = auth.uid()
  order by m.created_at, m.org_id
  limit 1;
$$;

grant execute on function public.is_active_member_user() to authenticated;
grant execute on function public.is_org_member(uuid)    to authenticated;
grant execute on function public.can_edit_org(uuid)     to authenticated;
grant execute on function public.is_org_owner(uuid)     to authenticated;
grant execute on function public.default_org_id()       to authenticated;

-- ─── Migración de datos existentes ───────────────────────────────────────────
do $$
declare
  r          record;
  v_org      uuid;
  v_fallback uuid;
begin
  -- Un negocio por cada usuario que aún no pertenece a ninguno.
  for r in
    select u.uid,
           coalesce(nullif(trim(i.name), ''), nullif(trim(p.full_name), ''), nullif(p.email, ''), 'Mi negocio') as nm
    from (
      select id as uid from public.profiles where role <> 'client'
      union select user_id from public.quotes  where user_id is not null
      union select user_id from public.clients where user_id is not null
      union select user_id from public.issuer  where user_id is not null
    ) u
    left join public.profiles p on p.id = u.uid
    left join lateral (
      select name from public.issuer where user_id = u.uid order by updated_at desc nulls last limit 1
    ) i on true
    where exists (select 1 from auth.users au where au.id = u.uid)
      and not exists (select 1 from public.organization_members m where m.user_id = u.uid)
  loop
    insert into public.organizations (name, created_by, next_quote_number)
    values (
      r.nm,
      r.uid,
      coalesce((select max(q.number) + 1 from public.quotes q where q.user_id = r.uid), 1)
    )
    returning id into v_org;

    insert into public.organization_members (org_id, user_id, role)
    values (v_org, r.uid, 'owner');
  end loop;

  -- Asignar cada fila al negocio de su usuario.
  update public.quotes  t set org_id = m.org_id from public.organization_members m
   where t.org_id is null and t.user_id = m.user_id and m.role = 'owner';
  update public.clients t set org_id = m.org_id from public.organization_members m
   where t.org_id is null and t.user_id = m.user_id and m.role = 'owner';
  update public.issuer  t set org_id = m.org_id from public.organization_members m
   where t.org_id is null and t.user_id = m.user_id and m.role = 'owner';

  -- Filas antiguas sin usuario (antes de la migración de roles): al negocio del
  -- admin activo más antiguo, que era quien las veía.
  select m.org_id into v_fallback
  from public.profiles p
  join public.organization_members m on m.user_id = p.id and m.role = 'owner'
  where p.role = 'admin' and p.is_active
  order by p.created_at
  limit 1;

  if v_fallback is not null then
    update public.quotes  set org_id = v_fallback where org_id is null;
    update public.clients set org_id = v_fallback where org_id is null;
    update public.issuer  set org_id = v_fallback where org_id is null;
    update public.organizations o
       set next_quote_number = greatest(o.next_quote_number, coalesce((select max(q.number) + 1 from public.quotes q where q.org_id = o.id), 1))
     where o.id = v_fallback;
  end if;
end $$;

-- Si un usuario tenía más de un registro de emisor, se deja solo el más reciente.
delete from public.issuer i
using public.issuer newer
where i.org_id is not null
  and i.org_id = newer.org_id
  and (coalesce(newer.updated_at, 'epoch'), newer.id) > (coalesce(i.updated_at, 'epoch'), i.id);

create unique index if not exists issuer_org_id_key on public.issuer (org_id);

-- Numeración: única por negocio (antes global).
alter table public.quotes drop constraint if exists quotes_number_key;
create unique index if not exists quotes_org_number_key on public.quotes (org_id, number);

-- ─── Org por defecto en inserciones sin org_id (compatibilidad) ──────────────
create or replace function public.set_default_org_id()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.org_id is null then
    new.org_id := public.default_org_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quotes_default_org on public.quotes;
create trigger trg_quotes_default_org before insert on public.quotes
  for each row execute function public.set_default_org_id();
drop trigger if exists trg_clients_default_org on public.clients;
create trigger trg_clients_default_org before insert on public.clients
  for each row execute function public.set_default_org_id();
drop trigger if exists trg_issuer_default_org on public.issuer;
create trigger trg_issuer_default_org before insert on public.issuer
  for each row execute function public.set_default_org_id();

-- ─── Número siguiente por negocio ────────────────────────────────────────────
create or replace function public.next_org_quote_number(p_org uuid)
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  if not public.can_edit_org(p_org) then
    raise exception 'Sin permiso para numerar cotizaciones de este negocio';
  end if;

  update public.organizations
     set next_quote_number = next_quote_number + 1
   where id = p_org
  returning next_quote_number - 1 into v_number;

  return v_number;
end;
$$;

revoke all on function public.next_org_quote_number(uuid) from public, anon;
grant execute on function public.next_org_quote_number(uuid) to authenticated;

-- ─── Crear negocio (onboarding) ──────────────────────────────────────────────
create or replace function public.create_organization(p_name text, p_tax_mode public.org_tax_mode default 'iva')
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if not public.is_active_member_user() then
    raise exception 'Tu usuario no puede crear un negocio';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre del negocio es obligatorio';
  end if;

  insert into public.organizations (name, tax_mode, created_by)
  values (trim(p_name), coalesce(p_tax_mode, 'iva'), auth.uid())
  returning id into v_org;

  insert into public.organization_members (org_id, user_id, role)
  values (v_org, auth.uid(), 'owner');

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, public.org_tax_mode) from public, anon;
grant execute on function public.create_organization(text, public.org_tax_mode) to authenticated;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member" on public.organizations
  for select to authenticated using (public.is_org_member(id));

drop policy if exists "organizations_update_owner" on public.organizations;
create policy "organizations_update_owner" on public.organizations
  for update to authenticated using (public.is_org_owner(id)) with check (public.is_org_owner(id));

drop policy if exists "organization_members_select_same_org" on public.organization_members;
create policy "organization_members_select_same_org" on public.organization_members
  for select to authenticated using (public.is_org_member(org_id));

-- Permisos de tabla: los usuarios solo pueden cambiar nombre, impuesto y prefijo.
-- El contador solo se modifica con next_org_quote_number(); altas y bajas, por RPC.
revoke all on table public.organizations from anon, authenticated;
grant select on table public.organizations to authenticated;
grant update (name, tax_mode, quote_prefix) on table public.organizations to authenticated;
revoke all on table public.organization_members from anon, authenticated;
grant select on table public.organization_members to authenticated;

-- quotes
drop policy if exists "quotes_select_own_or_admin" on public.quotes;
drop policy if exists "quotes_insert_own_or_admin" on public.quotes;
drop policy if exists "quotes_update_own_or_admin" on public.quotes;
drop policy if exists "quotes_delete_own_or_admin" on public.quotes;
drop policy if exists "quotes_select_org" on public.quotes;
drop policy if exists "quotes_insert_org" on public.quotes;
drop policy if exists "quotes_update_org" on public.quotes;
drop policy if exists "quotes_delete_org" on public.quotes;
create policy "quotes_select_org" on public.quotes for select to authenticated using (public.is_org_member(org_id));
create policy "quotes_insert_org" on public.quotes for insert to authenticated with check (public.can_edit_org(org_id));
create policy "quotes_update_org" on public.quotes for update to authenticated using (public.can_edit_org(org_id)) with check (public.can_edit_org(org_id));
create policy "quotes_delete_org" on public.quotes for delete to authenticated using (public.can_edit_org(org_id));

-- quote_items (a través de su cotización)
drop policy if exists "quote_items_select_parent_scope" on public.quote_items;
drop policy if exists "quote_items_insert_parent_scope" on public.quote_items;
drop policy if exists "quote_items_update_parent_scope" on public.quote_items;
drop policy if exists "quote_items_delete_parent_scope" on public.quote_items;
drop policy if exists "quote_items_select_org" on public.quote_items;
drop policy if exists "quote_items_write_org" on public.quote_items;
create policy "quote_items_select_org" on public.quote_items for select to authenticated using (
  exists (select 1 from public.quotes q where q.id = quote_items.quote_id and public.is_org_member(q.org_id))
);
create policy "quote_items_write_org" on public.quote_items for all to authenticated using (
  exists (select 1 from public.quotes q where q.id = quote_items.quote_id and public.can_edit_org(q.org_id))
) with check (
  exists (select 1 from public.quotes q where q.id = quote_items.quote_id and public.can_edit_org(q.org_id))
);

-- clients
drop policy if exists "clients_select_own_or_admin" on public.clients;
drop policy if exists "clients_insert_own_or_admin" on public.clients;
drop policy if exists "clients_update_own_or_admin" on public.clients;
drop policy if exists "clients_delete_own_or_admin" on public.clients;
drop policy if exists "clients_select_org" on public.clients;
drop policy if exists "clients_insert_org" on public.clients;
drop policy if exists "clients_update_org" on public.clients;
drop policy if exists "clients_delete_org" on public.clients;
create policy "clients_select_org" on public.clients for select to authenticated using (public.is_org_member(org_id));
create policy "clients_insert_org" on public.clients for insert to authenticated with check (public.can_edit_org(org_id));
create policy "clients_update_org" on public.clients for update to authenticated using (public.can_edit_org(org_id)) with check (public.can_edit_org(org_id));
create policy "clients_delete_org" on public.clients for delete to authenticated using (public.can_edit_org(org_id));

-- issuer (datos del emisor: uno por negocio; solo el dueño los cambia)
drop policy if exists "issuer_select_own_or_admin" on public.issuer;
drop policy if exists "issuer_insert_own_or_admin" on public.issuer;
drop policy if exists "issuer_update_own_or_admin" on public.issuer;
drop policy if exists "issuer_delete_own_or_admin" on public.issuer;
drop policy if exists "issuer_select_org" on public.issuer;
drop policy if exists "issuer_insert_org" on public.issuer;
drop policy if exists "issuer_update_org" on public.issuer;
create policy "issuer_select_org" on public.issuer for select to authenticated using (public.is_org_member(org_id));
create policy "issuer_insert_org" on public.issuer for insert to authenticated with check (public.is_org_owner(org_id));
create policy "issuer_update_org" on public.issuer for update to authenticated using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));

-- ─── save_quote con negocio y numeración por negocio ─────────────────────────
create or replace function public.save_quote(p_quote jsonb, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id     uuid := (p_quote->>'id')::uuid;
  v_org    uuid;
  v_number integer;
  v_user   uuid;
begin
  if v_id is null then
    raise exception 'save_quote: falta el id de la cotización';
  end if;

  if exists (select 1 from public.quotes q where q.id = v_id) then
    update public.quotes set
      status            = coalesce((p_quote->>'status')::quote_status, status),
      currency          = coalesce((p_quote->>'currency')::quote_currency, currency),
      issue_date        = coalesce((p_quote->>'issue_date')::date, issue_date),
      valid_until       = coalesce((p_quote->>'valid_until')::date, valid_until),
      notes             = coalesce(p_quote->>'notes', ''),
      issuer_snapshot   = coalesce(p_quote->'issuer_snapshot', '{}'::jsonb),
      client_name       = coalesce(p_quote->>'client_name', ''),
      client_contact    = coalesce(p_quote->>'client_contact', ''),
      client_rut        = coalesce(p_quote->>'client_rut', ''),
      client_phone      = coalesce(p_quote->>'client_phone', ''),
      client_website    = coalesce(p_quote->>'client_website', ''),
      equipment_enabled = coalesce((p_quote->>'equipment_enabled')::boolean, false),
      equipment_brand   = coalesce(p_quote->>'equipment_brand', ''),
      equipment_model   = coalesce(p_quote->>'equipment_model', ''),
      equipment_serial  = coalesce(p_quote->>'equipment_serial', ''),
      equipment_year    = coalesce(p_quote->>'equipment_year', ''),
      equipment_extra   = coalesce(p_quote->>'equipment_extra', '')
    where public.quotes.id = v_id
    returning public.quotes.number, public.quotes.user_id, public.quotes.org_id
      into v_number, v_user, v_org;

    if not found then
      raise exception 'save_quote: sin permiso para modificar esta cotización';
    end if;

    delete from public.quote_items where quote_id = v_id;
  else
    v_org := coalesce((p_quote->>'org_id')::uuid, public.default_org_id());
    if v_org is null then
      raise exception 'save_quote: tu usuario no pertenece a ningún negocio';
    end if;

    v_user   := auth.uid();
    v_number := public.next_org_quote_number(v_org);

    insert into public.quotes (
      id, org_id, number, user_id, status, currency, issue_date, valid_until, notes, issuer_snapshot,
      client_name, client_contact, client_rut, client_phone, client_website,
      equipment_enabled, equipment_brand, equipment_model, equipment_serial, equipment_year, equipment_extra
    ) values (
      v_id, v_org, v_number, v_user,
      coalesce((p_quote->>'status')::quote_status, 'draft'),
      coalesce((p_quote->>'currency')::quote_currency, 'CLP'),
      coalesce((p_quote->>'issue_date')::date, current_date),
      coalesce((p_quote->>'valid_until')::date, current_date + 30),
      coalesce(p_quote->>'notes', ''),
      coalesce(p_quote->'issuer_snapshot', '{}'::jsonb),
      coalesce(p_quote->>'client_name', ''),
      coalesce(p_quote->>'client_contact', ''),
      coalesce(p_quote->>'client_rut', ''),
      coalesce(p_quote->>'client_phone', ''),
      coalesce(p_quote->>'client_website', ''),
      coalesce((p_quote->>'equipment_enabled')::boolean, false),
      coalesce(p_quote->>'equipment_brand', ''),
      coalesce(p_quote->>'equipment_model', ''),
      coalesce(p_quote->>'equipment_serial', ''),
      coalesce(p_quote->>'equipment_year', ''),
      coalesce(p_quote->>'equipment_extra', '')
    );
  end if;

  insert into public.quote_items (quote_id, sort_order, description, link, qty, unit_price, shipping)
  select
    v_id,
    coalesce((x->>'sort_order')::integer, (t.ord - 1)::integer),
    coalesce(x->>'description', ''),
    coalesce(x->>'link', ''),
    coalesce((x->>'qty')::numeric, 1),
    coalesce((x->>'unit_price')::numeric, 0),
    coalesce((x->>'shipping')::numeric, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(x, ord);

  return jsonb_build_object('id', v_id, 'number', v_number, 'user_id', v_user, 'org_id', v_org);
end;
$$;

revoke all on function public.save_quote(jsonb, jsonb) from public, anon;
grant execute on function public.save_quote(jsonb, jsonb) to authenticated;

-- El contador global queda en desuso (se conserva por compatibilidad).
comment on table public.quote_counter is 'En desuso desde fase 1: la numeración vive en organizations.next_quote_number';
