import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'tapisserie'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'swatch2026'

let client = null
let db = null

async function getDb() {
  if (db) return db
  client = new MongoClient(MONGO_URL)
  await client.connect()
  db = client.db(DB_NAME)
  return db
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Password',
    },
  })
}

export async function OPTIONS() {
  return json({})
}

async function handler(request, { params }) {
  const path = params?.path || []
  const route = '/' + path.join('/')
  const method = request.method

  try {
    // Health
    if (route === '/' || route === '/health') {
      return json({ ok: true, service: 'tapisserie-api', time: new Date().toISOString() })
    }

    // Waitlist signup
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

    // Public stats (count only)
    if (route === '/waitlist/stats' && method === 'GET') {
      const database = await getDb()
      const count = await database.collection('waitlist').countDocuments()
      return json({ ok: true, count })
    }

    // Admin auth check
    if (route === '/admin/auth' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const password = body.password || ''
      if (password === ADMIN_PASSWORD) {
        return json({ ok: true })
      }
      return json({ ok: false, error: 'Invalid password' }, 401)
    }

    // Admin: list emails
    if (route === '/admin/waitlist' && method === 'GET') {
      const password = request.headers.get('x-admin-password') || ''
      if (password !== ADMIN_PASSWORD) {
        return json({ error: 'Unauthorized' }, 401)
      }
      const database = await getDb()
      const items = await database
        .collection('waitlist')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(1000)
        .toArray()
      const count = items.length
      return json({ ok: true, count, items })
    }

    // Admin: export CSV
    if (route === '/admin/waitlist/export' && method === 'GET') {
      const url = new URL(request.url)
      const password = url.searchParams.get('password') || request.headers.get('x-admin-password') || ''
      if (password !== ADMIN_PASSWORD) {
        return new NextResponse('Unauthorized', { status: 401 })
      }
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
