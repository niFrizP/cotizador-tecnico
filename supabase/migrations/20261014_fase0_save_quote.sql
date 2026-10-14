-- =============================================================================
-- Fase 0 · Guardado transaccional de cotizaciones
-- Ejecutar en Supabase → SQL Editor (una vez). Es idempotente.
--
-- Antes: updateQuote borraba todos los ítems y luego los insertaba en llamadas
-- separadas; si la segunda fallaba, la cotización quedaba sin ítems.
-- Ahora: save_quote() hace todo dentro de una sola transacción y asigna el
-- número SOLO al crear (ya no se consume un número al pulsar "Nueva").
--
-- security invoker: se ejecuta con los permisos del usuario, así que las
-- políticas RLS existentes siguen aplicando.
-- =============================================================================

create or replace function public.save_quote(p_quote jsonb, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id     uuid := (p_quote->>'id')::uuid;
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
      equipment_extra   = coalesce(p_quote->>'equipment_extra', ''),
      updated_at        = now()
    where public.quotes.id = v_id
    returning public.quotes.number, public.quotes.user_id into v_number, v_user;

    if not found then
      raise exception 'save_quote: sin permiso para modificar esta cotización';
    end if;

    delete from public.quote_items where quote_id = v_id;
  else
    v_user   := coalesce((p_quote->>'user_id')::uuid, auth.uid());
    v_number := public.next_quote_number();

    insert into public.quotes (
      id, number, user_id, status, currency, issue_date, valid_until, notes, issuer_snapshot,
      client_name, client_contact, client_rut, client_phone, client_website,
      equipment_enabled, equipment_brand, equipment_model, equipment_serial, equipment_year, equipment_extra
    ) values (
      v_id, v_number, v_user,
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

  return jsonb_build_object('id', v_id, 'number', v_number, 'user_id', v_user);
end;
$$;

revoke all on function public.save_quote(jsonb, jsonb) from public, anon;
grant execute on function public.save_quote(jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- quote_counter tenía RLS desactivado: con la anon key cualquiera podía leer o
-- reiniciar el contador vía REST (y provocar números duplicados al guardar).
-- Solo next_quote_number() (SECURITY DEFINER) necesita tocarlo.
-- -----------------------------------------------------------------------------
alter table public.quote_counter enable row level security;
revoke all on table public.quote_counter from anon, authenticated;
