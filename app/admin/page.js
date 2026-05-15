'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, LogOut, RefreshCw, Users } from 'lucide-react'

function App() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [items, setItems] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('admin_pw') : null
    if (saved) {
      setPassword(saved)
      verify(saved)
    }
  }, [])

  const verify = async (pw) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.ok) {
        setAuthed(true)
        window.localStorage.setItem('admin_pw', pw)
        load(pw)
      } else {
        setAuthed(false)
        window.localStorage.removeItem('admin_pw')
      }
    } catch {
      setAuthed(false)
    }
  }

  const onLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    await verify(password)
    setLoading(false)
    if (!password) toast.error('Enter a password.')
  }

  const load = async (pw) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/waitlist', { headers: { 'x-admin-password': pw } })
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
        setCount(data.count || 0)
      } else {
        toast.error(data.error || 'Failed to load')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    window.localStorage.removeItem('admin_pw')
    setAuthed(false)
    setPassword('')
    setItems([])
  }

  const exportCsv = () => {
    window.location.href = `/api/admin/waitlist/export?password=${encodeURIComponent(password)}`
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-sm bg-card border-white/10 p-8">
          <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2 text-center">TAPISSERIE</div>
          <h1 className="font-serif text-2xl text-white text-center mb-6">Admin access</h1>
          <form onSubmit={onLogin} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-white/5 border-white/10 text-white rounded-sm h-11"
            />
            <Button type="submit" disabled={loading} className="w-full bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-11">
              {loading ? 'Checking…' : 'Sign in'}
            </Button>
          </form>
          <a href="/" className="block text-center text-xs text-muted-foreground mt-6 hover:text-white">← Back to site</a>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background p-6 sm:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">TAPISSERIE / ADMIN</div>
            <h1 className="font-serif text-3xl text-white">Waitlist</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load(password)} className="border-white/10 rounded-sm">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} className="border-white/10 rounded-sm">
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="rounded-sm">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="bg-card border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Total signups</div>
                <div className="font-serif text-4xl text-white">{count.toLocaleString()}</div>
              </div>
              <Users className="w-8 h-8 text-[#d4b896]/60" />
            </div>
          </Card>
          <Card className="bg-card border-white/10 p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Today</div>
            <div className="font-serif text-4xl text-white">
              {items.filter((i) => new Date(i.createdAt).toDateString() === new Date().toDateString()).length}
            </div>
          </Card>
          <Card className="bg-card border-white/10 p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Last 7 days</div>
            <div className="font-serif text-4xl text-white">
              {items.filter((i) => Date.now() - new Date(i.createdAt).getTime() < 7 * 86400 * 1000).length}
            </div>
          </Card>
        </div>

        <Card className="bg-card border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-muted-foreground">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Email</th>
                  <th className="text-left px-6 py-3 font-medium">Source</th>
                  <th className="text-left px-6 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={3} className="text-center py-16 text-muted-foreground">No signups yet.</td>
                  </tr>
                )}
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-4 text-white">{i.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{i.referrer || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(i.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </main>
  )
}

export default App
