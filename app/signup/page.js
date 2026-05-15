'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

function App() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Signup failed.')
      } else {
        toast.success(`Welcome, ${data.user.username}.`)
        window.location.href = '/listings'
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-sm bg-card border-white/10 p-8">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2 text-center">TAPISSERIE</div>
        <h1 className="font-serif text-2xl text-white text-center mb-2">Create your account</h1>
        <p className="text-xs text-muted-foreground text-center mb-6">Join the marketplace. Free, no card required.</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-white/5 border-white/10 text-white rounded-sm h-11" />
          <Input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (a-z, 0-9, _)" className="bg-white/5 border-white/10 text-white rounded-sm h-11" />
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 chars)" minLength={8} className="bg-white/5 border-white/10 text-white rounded-sm h-11" />
          <Button type="submit" disabled={loading} className="w-full bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-11">
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-6">
          <a href="/" className="hover:text-white">← Home</a>
          <a href="/login" className="hover:text-white">Already a member? Sign in</a>
        </div>
      </Card>
    </main>
  )
}

export default App
