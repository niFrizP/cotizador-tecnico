import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const DEFAULT_ISSUER = {
  name: '',
  title: '',
  email: '',
  phone: '',
  website: '',
  bank: '',
  accountName: '',
  accountNumber: '',
  accountType: '',
  logoDataUrl: null,
}

export const supabase = createClient(supabaseUrl, supabaseKey)

function createEphemeralAuthClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `cotizador-admin-create-user-${crypto.randomUUID()}`,
    },
  })
}

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

function summarizeNestedItems(items = []) {
  const sub = items.reduce(
    (sum, item) => sum + (Number(item.subtotal) || (Number(item.qty) || 0) * (Number(item.unit_price) || 0)),
    0,
  )
  const shp = items.reduce((sum, item) => sum + (Number(item.shipping) || 0), 0)

  return { sub, shp, total: sub + shp }
}

function mapIssuer(row) {
  if (!row) return { ...DEFAULT_ISSUER }

  return {
    name: row.name ?? '',
    title: row.title ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    website: row.website ?? '',
    bank: row.bank ?? '',
    accountName: row.account_name ?? '',
    accountNumber: row.account_number ?? '',
    accountType: row.account_type ?? '',
    logoDataUrl: row.logo_data_url ?? null,
  }
}

function issuerToDb(issuer) {
  return {
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
  }
}

function mapProfile(row) {
  if (!row) return null

  return {
    id: row.id,
    email: row.email ?? '',
    fullName: row.full_name ?? '',
    role: row.role,
    isActive: row.is_active ?? true,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
  }
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user?.id ?? null
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session ?? null
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null))
}

export async function fetchMyProfile() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return mapProfile(data)
}

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapProfile)
}

export async function updateProfile(id, updates) {
  const payload = {}

  if (Object.prototype.hasOwnProperty.call(updates, 'fullName')) payload.full_name = updates.fullName ?? ''
  if (Object.prototype.hasOwnProperty.call(updates, 'role')) payload.role = updates.role
  if (Object.prototype.hasOwnProperty.call(updates, 'isActive')) payload.is_active = Boolean(updates.isActive)

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return mapProfile(data)
}

export async function createManagedUser({ email, password, fullName, role }) {
  const ephemeralClient = createEphemeralAuthClient()
  const { data: signUpData, error: signUpError } = await ephemeralClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? '',
      },
    },
  })

  await ephemeralClient.auth.signOut().catch(() => { })

  if (signUpError) throw signUpError

  const createdUser = signUpData.user
  if (!createdUser?.id) {
    throw new Error('No se pudo crear el usuario en Auth. Revisa la configuración de registro por email en Supabase.')
  }

  const adminId = await getCurrentUserId()
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: createdUser.id,
      email,
      full_name: fullName ?? '',
      role,
      is_active: true,
      created_by: adminId,
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(`El usuario de Auth fue creado, pero falló la creación del perfil: ${error.message}`)
  }

  return mapProfile(data)
}

export function dbToQuote(row, items = []) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
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

export function quoteToDb(q) {
  return {
    ...(q.userId ? { user_id: q.userId } : {}),
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
    quote_id: quoteId,
    sort_order: index,
    description: item.description ?? '',
    link: item.link ?? '',
    qty: parseFloat(item.qty) || 1,
    unit_price: parseFloat(item.unitPrice) || 0,
    shipping: parseFloat(item.shipping) || 0,
  }
}

export async function getNextNumber() {
  const { data, error } = await supabase.rpc('next_quote_number')
  if (error) throw error
  return data
}

export async function fetchIssuer() {
  const { data, error } = await supabase
    .from('issuer')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return mapIssuer(data)
}

export async function saveIssuer(issuer) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('No hay una sesión activa para guardar los datos del emisor.')

  const { error } = await supabase
    .from('issuer')
    .upsert({
      user_id: userId,
      ...issuerToDb(issuer),
    }, { onConflict: 'user_id' })

  if (error) throw error
}

export async function fetchClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((client) => ({
    id: client.id,
    userId: client.user_id ?? null,
    name: client.name ?? '',
    contact: client.contact ?? '',
    rut: client.rut ?? '',
    website: client.website ?? '',
    client_phone: client.client_phone ?? '',
  }))
}

export async function upsertClient(client) {
  const userId = client.userId ?? await getCurrentUserId()
  if (!userId) throw new Error('No hay una sesión activa para asociar el cliente.')

  const { data: existing, error: existingError } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', client.name)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
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

export async function saveClient(client) {
  if (client.id) {
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
  }

  const userId = client.userId ?? await getCurrentUserId()
  if (!userId) throw new Error('No hay una sesión activa para asociar el cliente.')

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
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

export async function deleteClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function fetchQuotes() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_items(subtotal, qty, unit_price, shipping)')
    .order('number', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const quote = dbToQuote(row, [])
    quote.summary = summarizeNestedItems(row.quote_items)
    return quote
  })
}

export async function fetchQuote(id) {
  const [quoteRes, itemsRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', id).single(),
    supabase.from('quote_items').select('*').eq('quote_id', id).order('sort_order'),
  ])

  if (quoteRes.error) throw quoteRes.error
  if (itemsRes.error) throw itemsRes.error

  return dbToQuote(quoteRes.data, itemsRes.data)
}

export async function createQuote(q) {
  let number = q.number ?? await getNextNumber()
  const userId = q.userId ?? await getCurrentUserId()

  if (!userId) throw new Error('No hay una sesión activa para asociar la cotización.')

  let { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert({ ...quoteToDb({ ...q, userId }), number })
    .select('id, number, user_id')
    .single()

  if (qErr?.code === '23505' && q.number != null) {
    number = await getNextNumber()
    const retry = await supabase
      .from('quotes')
      .insert({ ...quoteToDb({ ...q, userId }), number })
      .select('id, number, user_id')
      .single()
    quote = retry.data
    qErr = retry.error
  }

  if (qErr) throw qErr

  if (q.items?.length > 0) {
    const { error: iErr } = await supabase
      .from('quote_items')
      .insert(q.items.map((item, index) => itemToDb(item, quote.id, index)))

    if (iErr) throw iErr
  }

  if (q.client?.name?.trim()) {
    await upsertClient({ ...q.client, userId }).catch(() => { })
  }

  return { ...q, id: quote.id, number: quote.number ?? number, userId: quote.user_id ?? userId }
}

export async function updateQuote(q) {
  const { error: qErr } = await supabase
    .from('quotes')
    .update(quoteToDb(q))
    .eq('id', q.id)

  if (qErr) throw qErr

  const { error: dErr } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', q.id)

  if (dErr) throw dErr

  if (q.items?.length > 0) {
    const { error: iErr } = await supabase
      .from('quote_items')
      .insert(q.items.map((item, index) => itemToDb(item, q.id, index)))

    if (iErr) throw iErr
  }

  if (q.client?.name?.trim()) {
    await upsertClient({ ...q.client, userId: q.userId }).catch(() => { })
  }

  return q
}

export async function saveQuote(q, isNew = false) {
  if (isNew) return createQuote(q)
  return updateQuote(q)
}

export async function deleteQuote(id) {
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function duplicateQuote(q) {
  const newQuote = {
    ...q,
    id: crypto.randomUUID(),
    number: null,
    status: 'draft',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: (() => {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + 30)
      return nextDate.toISOString().split('T')[0]
    })(),
    items: q.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
  }

  return createQuote(newQuote)
}