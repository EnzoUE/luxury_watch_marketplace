import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'tapisserie'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'swatch2026'
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tapisserie-dev-secret-change-me-in-production-min-32-chars'
)
const COOKIE_NAME = 'tap_session'

let client = null
let db = null

async function getDb() {
  if (db) return db
  client = new MongoClient(MONGO_URL)
  await client.connect()
  db = client.db(DB_NAME)
  // ensure indexes (best-effort)
  try {
    await db.collection('waitlist').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('users').createIndex({ username: 1 }, { unique: true })
    await db.collection('listings').createIndex({ createdAt: -1 })
    await db.collection('listings').createIndex({ userId: 1 })
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

async function handler(request, { params }) {
  const path = params?.path || []
  const route = '/' + path.join('/')
  const method = request.method

  try {
    // ----- Health -----
    if (route === '/' || route === '/health') {
      return json({ ok: true, service: 'tapisserie-api', time: new Date().toISOString() })
    }

    // ----- Waitlist -----
    if (route === '/waitlist' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').trim().toLowerCase()
      const referrer = body.referrer || null
      if (!isValidEmail(email)) {
        return json({ error: 'Please enter a valid email address.' }, 400)
      }
      const database = await getDb()
      const existing = await database.collection('waitlist').findOne({ email })
      if (existing) {
        return json({ ok: true, duplicate: true, message: "You're already on the list." })
      }
      const doc = {
        id: uuidv4(),
        email,
        referrer,
        createdAt: new Date().toISOString(),
        userAgent: request.headers.get('user-agent') || null,
      }
      await database.collection('waitlist').insertOne(doc)
      const count = await database.collection('waitlist').countDocuments()
      return json({ ok: true, duplicate: false, position: count, message: "You're on the list. Welcome to TAPISSERIE." })
    }

    if (route === '/waitlist/stats' && method === 'GET') {
      const database = await getDb()
      const count = await database.collection('waitlist').countDocuments()
      return json({ ok: true, count })
    }

    // ----- Events / Analytics -----
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
      const items = await database
        .collection('waitlist')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray()
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
      const items = await database
        .collection('waitlist')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray()
      const rows = [['email', 'createdAt', 'referrer']]
      items.forEach((i) => rows.push([i.email, i.createdAt, i.referrer || '']))
      const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="tapisserie-waitlist.csv"',
        },
      })
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
      const existsEmail = await database.collection('users').findOne({ email })
      if (existsEmail) return json({ error: 'An account with this email already exists.' }, 409)
      const existsUsername = await database.collection('users').findOne({ username })
      if (existsUsername) return json({ error: 'Username taken.' }, 409)

      const passwordHash = await bcrypt.hash(password, 10)
      const user = {
        id: uuidv4(),
        email,
        username,
        passwordHash,
        avatarUrl: null,
        bio: '',
        location: '',
        rating: 0,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
      }
      await database.collection('users').insertOne(user)
      const token = await signSession(user)
      const res = json({ ok: true, user: sanitizeUser(user) })
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }

    // ----- Auth: Login -----
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
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return res
    }

    // ----- Auth: Logout -----
    if (route === '/auth/logout' && method === 'POST') {
      const res = json({ ok: true })
      res.cookies.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 })
      return res
    }

    // ----- Auth: Me -----
    if (route === '/me' && method === 'GET') {
      const session = await readSession(request)
      if (!session) return json({ user: null })
      const database = await getDb()
      const user = await database.collection('users').findOne({ id: session.uid })
      return json({ user: sanitizeUser(user) })
    }

    // ----- Listings: list (public) -----
    if (route === '/listings' && method === 'GET') {
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') || '').toLowerCase()
      const database = await getDb()
      const filter = q
        ? { $or: [{ title: { $regex: q, $options: 'i' } }, { brand: { $regex: q, $options: 'i' } }, { collection: { $regex: q, $options: 'i' } }] }
        : {}
      const items = await database
        .collection('listings')
        .find(filter, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray()
      return json({ ok: true, items })
    }

    // ----- Listings: create (auth) -----
    if (route === '/listings' && method === 'POST') {
      const session = await readSession(request)
      if (!session) return json({ error: 'Sign in to create a listing.' }, 401)
      const body = await request.json().catch(() => ({}))
      const title = (body.title || '').trim()
      const price = Number(body.price)
      if (!title || title.length < 3) return json({ error: 'Title required (min 3 chars).' }, 400)
      if (!Number.isFinite(price) || price <= 0) return json({ error: 'Valid price required.' }, 400)
      const images = Array.isArray(body.images) ? body.images.filter((u) => typeof u === 'string' && u.startsWith('http')).slice(0, 8) : []
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
        boxIncluded: !!body.boxIncluded,
        papersIncluded: !!body.papersIncluded,
        location: (body.location || '').toString().slice(0, 120),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await database.collection('listings').insertOne(listing)
      const { _id, ...clean } = listing
      return json({ ok: true, listing: clean })
    }

    // ----- Listings: detail -----
    if (route.startsWith('/listings/') && method === 'GET') {
      const id = path[1]
      const database = await getDb()
      const listing = await database.collection('listings').findOne({ id }, { projection: { _id: 0 } })
      if (!listing) return json({ error: 'Listing not found.' }, 404)
      return json({ ok: true, listing })
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
