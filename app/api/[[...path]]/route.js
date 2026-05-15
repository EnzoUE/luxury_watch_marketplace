import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'tapisserie'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'swatch2026'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tapisserie-dev-secret-change-me-in-production-min-32-chars'
)
const COOKIE_NAME = 'tap_session'
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const SHIPPING_RATE_EUR_PER_100KM = 6
const SHIPPING_BASE_FEE = 15

let client = null
let db = null

async function getDb() {
  if (db) return db
  client = new MongoClient(MONGO_URL)
  await client.connect()
  db = client.db(DB_NAME)
  try {
    await db.collection('waitlist').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ username: 1 }, { unique: true })
    await db.collection('listings').createIndex({ createdAt: -1 })
    await db.collection('listings').createIndex({ userId: 1 })
    await db.collection('conversations').createIndex({ listingId: 1, buyerId: 1 }, { unique: true })
    await db.collection('conversations').createIndex({ participants: 1, updatedAt: -1 })
    await db.collection('messages').createIndex({ conversationId: 1, createdAt: 1 })
  } catch (e) {}
  return db
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function json(data, status = 200, extraHeaders = {}) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
      ...extraHeaders,
    },
  })
}

export async function OPTIONS() {
  return json({})
}

async function signSession(user) {
  return await new SignJWT({ uid: user.id, username: user.username, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

async function readSession(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
    if (!match) return null
    const token = decodeURIComponent(match[1])
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

function sanitizeUser(u) {
  if (!u) return null
  const { passwordHash, _id, ...rest } = u
  return rest
}

function setSessionCookie(res, token) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

// ---------- Geocoding (Nominatim, free, no key) ----------
const geoCache = new Map()
async function geocode(place) {
  if (!place || typeof place !== 'string') return null
  const key = place.trim().toLowerCase()
  if (!key) return null
  if (geoCache.has(key)) return geoCache.get(key)
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`
    const r = await fetch(url, { headers: { 'User-Agent': 'tapisserie/1.0 (marketplace)', 'Accept-Language': 'en' } })
    if (!r.ok) return null
    const data = await r.json()
    if (!data || !data.length) return null
    const out = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name }
    geoCache.set(key, out)
    return out
  } catch {
    return null
  }
}

function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function handler(request, { params }) {
  const path_ = params?.path || []
  const route = '/' + path_.join('/')
  const method = request.method

  try {
    if (route === '/' || route === '/health') {
      return json({ ok: true, service: 'tapisserie-api', time: new Date().toISOString() })
    }

    // ----- Waitlist -----
    if (route === '/waitlist' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').trim().toLowerCase()
      const referrer = body.referrer || null
      if (!isValidEmail(email)) return json({ error: 'Please enter a valid email address.' }, 400)
      const database = await getDb()
      const existing = await database.collection('waitlist').findOne({ email })
      if (existing) return json({ ok: true, duplicate: true, message: "You're already on the list." })
      const doc = { id: uuidv4(), email, referrer, createdAt: new Date().toISOString(), userAgent: request.headers.get('user-agent') || null }
      await database.collection('waitlist').insertOne(doc)
      const count = await database.collection('waitlist').countDocuments()
      return json({ ok: true, duplicate: false, position: count, message: "You're on the list. Welcome to TAPISSERIE." })
    }

    if (route === '/waitlist/stats' && method === 'GET') {
      const database = await getDb()
      const count = await database.collection('waitlist').countDocuments()
      return json({ ok: true, count })
    }

    // ----- Events -----
    if (route === '/events' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const database = await getDb()
      await database.collection('events').insertOne({
        id: uuidv4(),
        type: body.type || 'unknown',
        path: body.path || null,
        meta: body.meta || null,
        createdAt: new Date().toISOString(),
      })
      return json({ ok: true })
    }

    // ----- Admin -----
    if (route === '/admin/auth' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      if ((body.password || '') === ADMIN_PASSWORD) return json({ ok: true })
      return json({ ok: false, error: 'Invalid password' }, 401)
    }

    if (route === '/admin/waitlist' && method === 'GET') {
      const password = request.headers.get('x-admin-password') || ''
      if (password !== ADMIN_PASSWORD) return json({ error: 'Unauthorized' }, 401)
      const database = await getDb()
      const items = await database.collection('waitlist').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(1000).toArray()
      const pageviews = await database.collection('events').countDocuments({ type: 'pageview' })
      const users = await database.collection('users').countDocuments()
      const listings = await database.collection('listings').countDocuments()
      return json({ ok: true, count: items.length, items, pageviews, users, listings })
    }

    if (route === '/admin/waitlist/export' && method === 'GET') {
      const url = new URL(request.url)
      const password = url.searchParams.get('password') || request.headers.get('x-admin-password') || ''
      if (password !== ADMIN_PASSWORD) return new NextResponse('Unauthorized', { status: 401 })
      const database = await getDb()
      const items = await database.collection('waitlist').find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray()
      const rows = [['email', 'createdAt', 'referrer']]
      items.forEach((i) => rows.push([i.email, i.createdAt, i.referrer || '']))
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="tapisserie-waitlist.csv"' } })
    }

    // ----- Auth: Signup -----
    if (route === '/auth/signup' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').trim().toLowerCase()
      const password = body.password || ''
      const username = (body.username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (!isValidEmail(email)) return json({ error: 'Invalid email.' }, 400)
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
      if (username.length < 3) return json({ error: 'Username must be at least 3 characters (a-z, 0-9, _).' }, 400)
      const database = await getDb()
      if (await database.collection('users').findOne({ email })) return json({ error: 'An account with this email already exists.' }, 409)
      if (await database.collection('users').findOne({ username })) return json({ error: 'Username taken.' }, 409)
      const passwordHash = await bcrypt.hash(password, 10)
      const user = {
        id: uuidv4(), email, username, passwordHash,
        avatarUrl: null, bio: '', location: '', rating: 0, ratingCount: 0,
        createdAt: new Date().toISOString(),
      }
      await database.collection('users').insertOne(user)
      const token = await signSession(user)
      const res = json({ ok: true, user: sanitizeUser(user) })
      setSessionCookie(res, token)
      return res
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').trim().toLowerCase()
      const password = body.password || ''
      if (!isValidEmail(email) || !password) return json({ error: 'Email and password required.' }, 400)
      const database = await getDb()
      const user = await database.collection('users').findOne({ email })
      if (!user) return json({ error: 'Invalid credentials.' }, 401)
      const ok = await bcrypt.compare(password, user.passwordHash)
      if (!ok) return json({ error: 'Invalid credentials.' }, 401)
      const token = await signSession(user)
      const res = json({ ok: true, user: sanitizeUser(user) })
      setSessionCookie(res, token)
      return res
    }

    if (route === '/auth/logout' && method === 'POST') {
      const res = json({ ok: true })
      res.cookies.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 })
      return res
    }

    if (route === '/me' && method === 'GET') {
      const session = await readSession(request)
      if (!session) return json({ user: null })
      const database = await getDb()
      const user = await database.collection('users').findOne({ id: session.uid })
      return json({ user: sanitizeUser(user) })
    }

    if (route === '/me' && method === 'PUT') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Unauthorized' }, 401)
      const body = await request.json().catch(() => ({}))
      const database = await getDb()
      const update = {}
      if (typeof body.bio === 'string') update.bio = body.bio.slice(0, 500)
      if (typeof body.location === 'string') update.location = body.location.slice(0, 120)
      if (typeof body.avatarUrl === 'string' && body.avatarUrl.startsWith('http')) update.avatarUrl = body.avatarUrl
      if (Object.keys(update).length === 0) return json({ error: 'Nothing to update.' }, 400)
      await database.collection('users').updateOne({ id: session.uid }, { $set: update })
      const user = await database.collection('users').findOne({ id: session.uid })
      return json({ ok: true, user: sanitizeUser(user) })
    }

    // ----- Listings -----
    if (route === '/listings' && method === 'GET') {
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') || '').toLowerCase()
      const database = await getDb()
      const filter = q
        ? { $or: [{ title: { $regex: q, $options: 'i' } }, { brand: { $regex: q, $options: 'i' } }, { collection: { $regex: q, $options: 'i' } }] }
        : {}
      const items = await database.collection('listings').find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(60).toArray()
      return json({ ok: true, items })
    }

    if (route === '/listings' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Sign in to create a listing.' }, 401)
      const body = await request.json().catch(() => ({}))
      const title = (body.title || '').trim()
      const price = Number(body.price)
      if (!title || title.length < 3) return json({ error: 'Title required (min 3 chars).' }, 400)
      if (!Number.isFinite(price) || price <= 0) return json({ error: 'Valid price required.' }, 400)
      const images = Array.isArray(body.images) ? body.images.filter((u) => typeof u === 'string' && (u.startsWith('http') || u.startsWith('/uploads/'))).slice(0, 8) : []
      const verifiedPhotoUrl = typeof body.verifiedPhotoUrl === 'string' && (body.verifiedPhotoUrl.startsWith('http') || body.verifiedPhotoUrl.startsWith('/uploads/'))
        ? body.verifiedPhotoUrl
        : null
      if (!verifiedPhotoUrl) {
        return json({ error: 'Owner verification photo required. Upload one photo of the watch with a handwritten note showing your username and today\u2019s date.' }, 400)
      }
      const database = await getDb()
      const seller = await database.collection('users').findOne({ id: session.uid })
      const listing = {
        id: uuidv4(),
        userId: session.uid,
        sellerUsername: seller?.username || session.username,
        sellerAvatar: seller?.avatarUrl || null,
        title,
        description: (body.description || '').toString().slice(0, 4000),
        brand: (body.brand || 'AP × Swatch').toString().slice(0, 80),
        collection: (body.collection || '').toString().slice(0, 120),
        reference: (body.reference || '').toString().slice(0, 80),
        year: body.year ? Number(body.year) : null,
        condition: (body.condition || 'New').toString(),
        price,
        currency: (body.currency || 'EUR').toString().slice(0, 6),
        images,
        verifiedPhotoUrl,
        isVerifiedPhoto: true,
        boxIncluded: !!body.boxIncluded,
        papersIncluded: !!body.papersIncluded,
        location: (body.location || '').toString().slice(0, 120),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await database.collection('listings').insertOne(listing)
      try {
        await database.collection('activity').insertOne({
          id: uuidv4(),
          type: 'new_listing',
          username: listing.sellerUsername,
          listingId: listing.id,
          label: `listed “${listing.title}”`,
          price: listing.price,
          createdAt: new Date().toISOString(),
        })
      } catch {}
      const { _id, ...clean } = listing
      return json({ ok: true, listing: clean })
    }

    if (route.startsWith('/listings/') && method === 'GET') {
      const id = path_[1]
      const database = await getDb()
      const listing = await database.collection('listings').findOne({ id }, { projection: { _id: 0 } })
      if (!listing) return json({ error: 'Listing not found.' }, 404)
      return json({ ok: true, listing })
    }

    // ----- Upload (multipart) -----
    if (route === '/upload' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Sign in to upload images.' }, 401)
      const formData = await request.formData().catch(() => null)
      if (!formData) return json({ error: 'Invalid form data.' }, 400)
      const files = formData.getAll('files').filter((f) => f && typeof f === 'object' && 'arrayBuffer' in f)
      if (!files.length) return json({ error: 'No files uploaded.' }, 400)
      if (files.length > 8) return json({ error: 'Maximum 8 images at once.' }, 400)
      await mkdir(UPLOAD_DIR, { recursive: true })
      const urls = []
      const MAX = 8 * 1024 * 1024 // 8MB per file
      for (const f of files) {
        if (!String(f.type || '').startsWith('image/')) return json({ error: `"${f.name}" is not an image.` }, 400)
        if (f.size > MAX) return json({ error: `"${f.name}" exceeds 8MB.` }, 400)
        const ext = (String(f.type).split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg'
        const filename = `${uuidv4()}.${ext}`
        const buf = Buffer.from(await f.arrayBuffer())
        await writeFile(path.join(UPLOAD_DIR, filename), buf)
        urls.push(`/uploads/${filename}`)
      }
      return json({ ok: true, urls })
    }

    // ----- Shipping estimate (legacy, distance-based) -----
    if (route === '/shipping/estimate' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const from = (body.from || '').toString()
      const to = (body.to || '').toString()
      if (!from || !to) return json({ error: 'Both "from" and "to" locations are required.' }, 400)
      const [a, b] = await Promise.all([geocode(from), geocode(to)])
      if (!a || !b) return json({ error: 'Could not locate one of the addresses.' }, 422)
      const km = Math.round(haversineKm(a, b))
      const cost = Math.round(SHIPPING_BASE_FEE + (km / 100) * SHIPPING_RATE_EUR_PER_100KM)
      const days = km < 500 ? '1-2 business days' : km < 2000 ? '2-4 business days' : '4-7 business days'
      return json({ ok: true, distanceKm: km, costEUR: cost, eta: days, from: a.label, to: b.label })
    }

    // ----- Shipping: secure insured tiers -----
    if (route === '/shipping/calculate' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const declaredValue = Number(body.declaredValue) || 0
      const tiers = [
        {
          id: 'standard',
          name: 'Standard Secure Shipping',
          insuredUpTo: 1000,
          priceEUR: 19,
          eta: '4–6 business days',
          features: ['Tracked', 'Signature required', 'Insured up to €1,000'],
          eligible: declaredValue <= 1000 || declaredValue === 0,
        },
        {
          id: 'premium',
          name: 'Premium Secure Shipping',
          insuredUpTo: 5000,
          priceEUR: 39,
          eta: '2–4 business days',
          features: ['Tracked', 'Signature required', 'Insured up to €5,000', 'Priority handling'],
          eligible: declaredValue <= 5000 || declaredValue === 0,
        },
        {
          id: 'express',
          name: 'Express Secure Shipping',
          insuredUpTo: 25000,
          priceEUR: 89,
          eta: '1–2 business days',
          features: ['Tracked', 'Signature required', 'Insured up to €25,000', 'Express courier', 'Direct hand-off'],
          eligible: true,
        },
      ]
      const recommended = declaredValue >= 5001 ? 'express' : declaredValue >= 1001 ? 'premium' : 'standard'
      return json({ ok: true, tiers, recommended, declaredValue })
    }

    // ----- Activity (live ticker feed) -----
    if (route === '/activity' && method === 'GET') {
      const database = await getDb()
      let items = await database
        .collection('activity')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(25)
        .toArray()
      // Seed with demo events so the ticker is never empty on a fresh install
      if (items.length < 6) {
        const now = Date.now()
        const seeds = [
          { type: 'new_listing', username: 'enzo_genève', label: 'listed an AP × Swatch “Pop Blue”', price: 920, minutesAgo: 2 },
          { type: 'new_offer', username: 'mila_paris', label: 'offered on “Pop Black”', price: 750, minutesAgo: 7 },
          { type: 'sold', username: 'tobias_zurich', label: '“Pop Silver” just sold', price: 980, minutesAgo: 14 },
          { type: 'new_listing', username: 'jules_lyon', label: 'listed an AP × Swatch “Pop White”', price: 890, minutesAgo: 22 },
          { type: 'new_offer', username: 'sven_berlin', label: 'offered on “Pop Onyx”', price: 1100, minutesAgo: 35 },
          { type: 'sold', username: 'luca_milano', label: '“Pop Sahara” just sold', price: 1240, minutesAgo: 48 },
          { type: 'new_listing', username: 'noa_amsterdam', label: 'listed “Pop Forêt” mint condition', price: 950, minutesAgo: 71 },
          { type: 'new_offer', username: 'arthur_london', label: 'offered on “Pop Glacier”', price: 870, minutesAgo: 95 },
        ]
        const synthetic = seeds.map((s) => ({
          id: uuidv4(),
          type: s.type,
          username: s.username,
          label: s.label,
          price: s.price,
          createdAt: new Date(now - s.minutesAgo * 60000).toISOString(),
          synthetic: true,
        }))
        items = [...items, ...synthetic]
      }
      return json({ ok: true, items })
    }

    // ----- Waitlist live count (for landing scarcity copy) -----
    if (route === '/waitlist/social-proof' && method === 'GET') {
      const database = await getDb()
      const realCount = await database.collection('waitlist').countDocuments()
      // Always show "500+ collectors waiting" minimum for social proof,
      // then grow with real signups.
      const displayed = Math.max(500, realCount + 500)
      return json({ ok: true, displayed, real: realCount })
    }

    // ----- Users / Profiles -----
    if (route.startsWith('/users/') && method === 'GET') {
      const username = (path_[1] || '').toLowerCase()
      const database = await getDb()
      const user = await database.collection('users').findOne({ username }, { projection: { _id: 0, passwordHash: 0, email: 0 } })
      if (!user) return json({ error: 'User not found.' }, 404)
      const listings = await database.collection('listings').find({ userId: user.id }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(60).toArray()
      const activeCount = listings.filter((l) => l.status === 'active').length
      const soldCount = listings.filter((l) => l.status === 'sold').length
      return json({ ok: true, user, listings, stats: { active: activeCount, sold: soldCount, rating: user.rating, ratingCount: user.ratingCount } })
    }

    // ----- Conversations & Messages (chat + offers) -----
    if (route === '/conversations' && method === 'GET') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Unauthorized' }, 401)
      const database = await getDb()
      const items = await database.collection('conversations')
        .find({ participants: session.uid }, { projection: { _id: 0 } })
        .sort({ updatedAt: -1 })
        .limit(50)
        .toArray()
      return json({ ok: true, items })
    }

    if (route === '/conversations' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Sign in to start a conversation.' }, 401)
      const body = await request.json().catch(() => ({}))
      const listingId = body.listingId
      if (!listingId) return json({ error: 'listingId required.' }, 400)
      const database = await getDb()
      const listing = await database.collection('listings').findOne({ id: listingId })
      if (!listing) return json({ error: 'Listing not found.' }, 404)
      if (listing.userId === session.uid) return json({ error: "You can't start a conversation on your own listing." }, 400)
      let convo = await database.collection('conversations').findOne({ listingId, buyerId: session.uid })
      if (!convo) {
        const buyer = await database.collection('users').findOne({ id: session.uid })
        convo = {
          id: uuidv4(),
          listingId,
          listingTitle: listing.title,
          listingImage: listing.images?.[0] || null,
          listingPrice: listing.price,
          sellerId: listing.userId,
          sellerUsername: listing.sellerUsername,
          buyerId: session.uid,
          buyerUsername: buyer?.username || session.username,
          participants: [listing.userId, session.uid],
          lastMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        await database.collection('conversations').insertOne(convo)
      }
      const { _id, ...clean } = convo
      return json({ ok: true, conversation: clean })
    }

    if (route.startsWith('/conversations/') && path_.length === 2 && method === 'GET') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Unauthorized' }, 401)
      const id = path_[1]
      const database = await getDb()
      const convo = await database.collection('conversations').findOne({ id }, { projection: { _id: 0 } })
      if (!convo) return json({ error: 'Conversation not found.' }, 404)
      if (!convo.participants.includes(session.uid)) return json({ error: 'Forbidden' }, 403)
      const since = new URL(request.url).searchParams.get('since')
      const filter = { conversationId: id }
      if (since) filter.createdAt = { $gt: since }
      const messages = await database.collection('messages').find(filter, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray()
      return json({ ok: true, conversation: convo, messages })
    }

    if (route.startsWith('/conversations/') && path_[2] === 'messages' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Unauthorized' }, 401)
      const id = path_[1]
      const database = await getDb()
      const convo = await database.collection('conversations').findOne({ id })
      if (!convo) return json({ error: 'Conversation not found.' }, 404)
      if (!convo.participants.includes(session.uid)) return json({ error: 'Forbidden' }, 403)
      const body = await request.json().catch(() => ({}))
      const type = body.type === 'offer' ? 'offer' : 'text'
      const text = (body.text || '').toString().slice(0, 2000)
      const price = body.price ? Number(body.price) : null
      if (type === 'text' && !text) return json({ error: 'Message text required.' }, 400)
      if (type === 'offer' && (!Number.isFinite(price) || price <= 0)) return json({ error: 'Valid offer price required.' }, 400)
      const msg = {
        id: uuidv4(),
        conversationId: id,
        senderId: session.uid,
        senderUsername: session.username,
        type,
        text: text || (type === 'offer' ? `Offered €${price.toLocaleString()}` : ''),
        price,
        offerStatus: type === 'offer' ? 'pending' : null,
        createdAt: new Date().toISOString(),
      }
      await database.collection('messages').insertOne(msg)
      await database.collection('conversations').updateOne(
        { id },
        { $set: { lastMessage: { type, text: msg.text, price, senderId: session.uid, createdAt: msg.createdAt }, updatedAt: msg.createdAt } }
      )
      if (type === 'offer') {
        try {
          await database.collection('activity').insertOne({
            id: uuidv4(),
            type: 'new_offer',
            username: session.username,
            listingId: convo.listingId,
            label: `offered on “${convo.listingTitle}”`,
            price,
            createdAt: msg.createdAt,
          })
        } catch {}
      }
      const { _id, ...clean } = msg
      return json({ ok: true, message: clean })
    }

    if (route.startsWith('/messages/') && path_[2] === 'offer-action' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Unauthorized' }, 401)
      const id = path_[1]
      const body = await request.json().catch(() => ({}))
      const action = body.action // 'accept' | 'reject' | 'counter'
      const database = await getDb()
      const msg = await database.collection('messages').findOne({ id })
      if (!msg || msg.type !== 'offer') return json({ error: 'Offer not found.' }, 404)
      const convo = await database.collection('conversations').findOne({ id: msg.conversationId })
      if (!convo) return json({ error: 'Conversation not found.' }, 404)
      // Only the OTHER party can act on the offer
      if (msg.senderId === session.uid) return json({ error: "You can't respond to your own offer." }, 400)
      if (!convo.participants.includes(session.uid)) return json({ error: 'Forbidden' }, 403)
      if (!['accept', 'reject', 'counter'].includes(action)) return json({ error: 'Invalid action.' }, 400)
      const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered'
      await database.collection('messages').updateOne({ id }, { $set: { offerStatus: newStatus, respondedAt: new Date().toISOString() } })
      let counterMsg = null
      if (action === 'counter') {
        const counterPrice = Number(body.price)
        if (!Number.isFinite(counterPrice) || counterPrice <= 0) return json({ error: 'Valid counter price required.' }, 400)
        counterMsg = {
          id: uuidv4(),
          conversationId: convo.id,
          senderId: session.uid,
          senderUsername: session.username,
          type: 'offer',
          text: `Counter-offered €${counterPrice.toLocaleString()}`,
          price: counterPrice,
          offerStatus: 'pending',
          createdAt: new Date().toISOString(),
        }
        await database.collection('messages').insertOne(counterMsg)
        await database.collection('conversations').updateOne(
          { id: convo.id },
          { $set: { lastMessage: { type: 'offer', text: counterMsg.text, price: counterPrice, senderId: session.uid, createdAt: counterMsg.createdAt }, updatedAt: counterMsg.createdAt } }
        )
      } else {
        const summary = action === 'accept' ? `Offer accepted at €${msg.price.toLocaleString()}` : 'Offer declined'
        const sysMsg = {
          id: uuidv4(),
          conversationId: convo.id,
          senderId: session.uid,
          senderUsername: session.username,
          type: 'system',
          text: summary,
          price: msg.price,
          createdAt: new Date().toISOString(),
        }
        await database.collection('messages').insertOne(sysMsg)
        await database.collection('conversations').updateOne(
          { id: convo.id },
          { $set: { lastMessage: { type: 'system', text: summary, senderId: session.uid, createdAt: sysMsg.createdAt }, updatedAt: sysMsg.createdAt } }
        )
      }
      const { _id, ...cleanOffer } = msg
      return json({ ok: true, offer: { ...cleanOffer, offerStatus: newStatus }, counter: counterMsg && (({ _id, ...rest }) => rest)(counterMsg) })
    }

    return json({ error: 'Not found', route, method }, 404)
  } catch (err) {
    console.error('API error:', err)
    return json({ error: 'Internal server error', detail: String(err?.message || err) }, 500)
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const DELETE = handler
export const PATCH = handler
