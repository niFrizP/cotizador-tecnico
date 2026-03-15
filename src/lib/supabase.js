// src/lib/supabase.js
// ─────────────────────────────────────────────────────────────────────
// Instala la dependencia: npm install @supabase/supabase-js
// Crea un archivo .env en la raíz del proyecto con:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=eyJ...
// ─────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

function pickNumber(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value != null) return Number(value) || 0
  }
  return null
}

function getQuoteSummary(row) {
  const sub = pickNumber(row, ['subtotal', 'sub_total', 'items_subtotal'])
  const shp = pickNumber(row, ['shipping_total', 'shipping', 'shipping_cost'])
  const total = pickNumber(row, ['total', 'grand_total', 'total_amount'])

  if (sub == null && shp == null && total == null) return null

  return {
    sub: sub ?? Math.max((total ?? 0) - (shp ?? 0), 0),
    shp: shp ?? 0,
    total: total ?? (sub ?? 0) + (shp ?? 0),
  }
}

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

// Convierte una fila de la DB (snake_case) al formato que usa la app (camelCase)
export function dbToQuote(row, items = []) {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    currency: row.currency,
    issueDate: row.issue_date,
    validUntil: row.valid_until,
    notes: row.notes ?? '',
    issuer: row.issuer_snapshot ?? {},
    client: {
      name: row.client_name ?? '',
      contact: row.client_contact ?? '',
      rut: row.client_rut ?? '',
      phone: row.client_phone ?? '',
      website: row.client_website ?? '',
    },
    equipment: {
      enabled: row.equipment_enabled ?? false,
      brand: row.equipment_brand ?? '',
      model: row.equipment_model ?? '',
      serial: row.equipment_serial ?? '',
      year: row.equipment_year ?? '',
      extra: row.equipment_extra ?? '',
    },
    items: items.map(dbToItem),
    summary: getQuoteSummary(row),
  }
}

export function dbToItem(row) {
  return {
    id: row.id,
    description: row.description ?? '',
    link: row.link ?? '',
    qty: row.qty ?? 1,
    unitPrice: row.unit_price ?? '',
    shipping: row.shipping ?? '',
  }
}

// Convierte la app (camelCase) → DB (snake_case)
export function quoteToDb(q) {
  return {
    status: q.status,
    currency: q.currency,
    issue_date: q.issueDate,
    valid_until: q.validUntil,
    notes: q.notes ?? '',
    issuer_snapshot: q.issuer ?? {},
    client_name: q.client?.name ?? '',
    client_contact: q.client?.contact ?? '',
    client_rut: q.client?.rut ?? '',
    client_phone: q.client?.phone ?? '',
    client_website: q.client?.website ?? '',
    equipment_enabled: q.equipment?.enabled ?? false,
    equipment_brand: q.equipment?.brand ?? '',
    equipment_model: q.equipment?.model ?? '',
    equipment_serial: q.equipment?.serial ?? '',
    equipment_year: q.equipment?.year ?? '',
    equipment_extra: q.equipment?.extra ?? '',
  }
}

export function itemToDb(item, quoteId, index) {
  return {
    // Sin id — Supabase lo genera automáticamente con gen_random_uuid()
    quote_id: quoteId,
    sort_order: index,
    description: item.description ?? '',
    link: item.link ?? '',
    qty: parseFloat(item.qty) || 1,
    unit_price: parseFloat(item.unitPrice) || 0,
    shipping: parseFloat(item.shipping) || 0,
  }
}

// ═══════════════════════════════════════════════════════════════════
// CORRELATIVO
// ═══════════════════════════════════════════════════════════════════

export async function getNextNumber() {
  const { data, error } = await supabase.rpc('next_quote_number')
  if (error) throw error
  return data
}

// ═══════════════════════════════════════════════════════════════════
// EMISOR
// ═══════════════════════════════════════════════════════════════════

export async function fetchIssuer() {
  const { data, error } = await supabase
    .from('issuer')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw error
  return {
    name: data.name ?? '',
    title: data.title ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    website: data.website ?? '',
    bank: data.bank ?? '',
    accountName: data.account_name ?? '',
    accountNumber: data.account_number ?? '',
    accountType: data.account_type ?? '',
    logoDataUrl: data.logo_data_url ?? null,
  }
}

export async function saveIssuer(issuer) {
  const { error } = await supabase
    .from('issuer')
    .update({
      name: issuer.name ?? '',
      title: issuer.title ?? '',
      email: issuer.email ?? '',
      phone: issuer.phone ?? '',
      website: issuer.website ?? '',
      bank: issuer.bank ?? '',
      account_name: issuer.accountName ?? '',
      account_number: issuer.accountNumber ?? '',
      account_type: issuer.accountType ?? '',
      logo_data_url: issuer.logoDataUrl ?? null,
    })
    .eq('id', 1)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
// CLIENTES
// ═══════════════════════════════════════════════════════════════════

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map(c => ({
    id: c.id,
    name: c.name ?? '',
    contact: c.contact ?? '',
    rut: c.rut ?? '',
    website: c.website ?? '',
    client_phone: c.client_phone ?? '',
  }))
}

export async function upsertClient(client) {
  // Busca si ya existe por nombre (case-insensitive)
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', client.name)
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: client.name ?? '',
      contact: client.contact ?? '',
      rut: client.rut ?? '',
      website: client.website ?? '',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function saveClient(client) {
  if (client.id) {
    // Actualizar cliente existente
    const { error } = await supabase
      .from('clients')
      .update({
        name: client.name ?? '',
        contact: client.contact ?? '',
        rut: client.rut ?? '',
        website: client.website ?? '',
        client_phone: client.client_phone ?? '',
      })
      .eq('id', client.id)
    if (error) throw error
    return client.id
  } else {
    // Crear nuevo cliente
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name ?? '',
        contact: client.contact ?? '',
        rut: client.rut ?? '',
        website: client.website ?? '',
        client_phone: client.client_phone ?? '',
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }
}

export async function deleteClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ═══════════════════════════════════════════════════════════════════
// COTIZACIONES
// ═══════════════════════════════════════════════════════════════════

// Traer todas las cotizaciones (sin ítems, para el listado)
export async function fetchQuotes() {
  const { data, error } = await supabase
    .from('quotes_summary')   // usa la vista con totales precalculados
    .select('*')
    .order('number', { ascending: false })
  if (error) throw error
  return data.map(row => dbToQuote(row, []))
}

// Traer una cotización con sus ítems (para editar/previsualizar)
export async function fetchQuote(id) {
  const [quoteRes, itemsRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', id).single(),
    supabase.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
  ])
  if (quoteRes.error) throw quoteRes.error
  if (itemsRes.error) throw itemsRes.error
  return dbToQuote(quoteRes.data, itemsRes.data)
}

// Crear nueva cotización
export async function createQuote(q) {
  // 1. Obtener número correlativo
  let number = q.number ?? await getNextNumber()

  // 2. Insertar cotización
  let { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert({ ...quoteToDb(q), number })
    .select('id, number')
    .single()

  if (qErr?.code === '23505' && q.number != null) {
    number = await getNextNumber()
    const retry = await supabase
      .from('quotes')
      .insert({ ...quoteToDb(q), number })
      .select('id, number')
      .single()
    quote = retry.data
    qErr = retry.error
  }

  if (qErr) throw qErr

  // 3. Insertar ítems
  if (q.items?.length > 0) {
    const { error: iErr } = await supabase
      .from('quote_items')
      .insert(q.items.map((item, i) => itemToDb(item, quote.id, i)))
    if (iErr) throw iErr
  }

  // 4. Upsert cliente en historial
  if (q.client?.name?.trim()) {
    await upsertClient(q.client).catch(() => { }) // no bloquea si falla
  }

  return { ...q, id: quote.id, number: quote.number ?? number }
}

// Actualizar cotización existente
export async function updateQuote(q) {
  // 1. Actualizar cabecera
  const { error: qErr } = await supabase
    .from('quotes')
    .update(quoteToDb(q))
    .eq('id', q.id)
  if (qErr) throw qErr

  // 2. Reemplazar ítems (borra todos y reinserta)
  const { error: dErr } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', q.id)
  if (dErr) throw dErr

  if (q.items?.length > 0) {
    const { error: iErr } = await supabase
      .from('quote_items')
      .insert(q.items.map((item, i) => itemToDb(item, q.id, i)))
    if (iErr) throw iErr
  }

  // 3. Upsert cliente
  if (q.client?.name?.trim()) {
    await upsertClient(q.client).catch(() => { })
  }

  return q
}

// Guardar (crea o actualiza según si tiene id en DB)
export async function saveQuote(q, isNew = false) {
  if (isNew) return createQuote(q)
  return updateQuote(q)
}

// Eliminar cotización (los ítems se borran solos por CASCADE)
export async function deleteQuote(id) {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Duplicar cotización
export async function duplicateQuote(q) {
  const newQ = {
    ...q,
    id: crypto.randomUUID(), // temporal, se reemplaza en createQuote
    number: null,
    status: 'draft',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })(),
    items: q.items.map(i => ({ ...i, id: crypto.randomUUID() })),
  }
  return createQuote(newQ)
}