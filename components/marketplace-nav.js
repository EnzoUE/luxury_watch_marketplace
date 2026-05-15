'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function MarketplaceNav({ active }) {
  const [user, setUser] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user || null))
      .finally(() => setLoaded(true))
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    toast.success('Signed out')
    window.location.href = '/'
  }

  const linkCls = (key) =>
    `text-sm transition ${active === key ? 'text-white' : 'text-muted-foreground hover:text-white'}`

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-[#d4b896]/60 flex items-center justify-center">
            <span className="text-[#d4b896] text-xs font-bold">T</span>
          </div>
          <span className="font-serif text-lg tracking-[0.25em] text-white hidden sm:inline">TAPISSERIE</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="/listings" className={linkCls('browse')}>Browse</a>
          {user && <a href="/sell" className={linkCls('sell')}>Sell</a>}
          {user && <a href="/messages" className={linkCls('messages')}>Messages</a>}
          {loaded && !user && (
            <>
              <a href="/login" className={linkCls('login')}>Sign in</a>
              <a href="/signup">
                <Button size="sm" className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm">Sign up</Button>
              </a>
            </>
          )}
          {user && (
            <div className="flex items-center gap-3">
              <a href={`/u/${user.username}`} className="text-sm text-white hover:text-[#d4b896] transition hidden sm:inline">@{user.username}</a>
              <Button size="sm" variant="outline" onClick={logout} className="border-white/10 rounded-sm">Sign out</Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
