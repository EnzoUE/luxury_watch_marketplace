'use client'

import { useEffect, useState } from 'react'
import MarketplaceNav from '@/components/marketplace-nav'
import { Card } from '@/components/ui/card'
import { Inbox } from 'lucide-react'

function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}d`
}

function App() {
  const [user, setUser] = useState(null)
  const [convos, setConvos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user)
        if (!d.user) {
          setLoading(false)
          setTimeout(() => (window.location.href = '/login'), 800)
        } else {
          fetch('/api/conversations')
            .then((r) => r.json())
            .then((dd) => setConvos(dd.items || []))
            .finally(() => setLoading(false))
        }
      })
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav />
      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">Messages</div>
        <h1 className="font-serif text-3xl text-white mb-8">Inbox</h1>

        {loading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : !user ? (
          <div className="text-muted-foreground">Redirecting to sign in…</div>
        ) : convos.length === 0 ? (
          <Card className="bg-card border-white/10 p-16 text-center">
            <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl text-white mb-2">No conversations yet</h3>
            <p className="text-muted-foreground text-sm">Make an offer or message a seller from any listing to start a thread.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {convos.map((c) => {
              const isSeller = c.sellerId === user.id
              const counterparty = isSeller ? c.buyerUsername : c.sellerUsername
              return (
                <a key={c.id} href={`/messages/${c.id}`} className="block">
                  <Card className="bg-card border-white/10 hover:border-white/20 transition p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-neutral-900 rounded-sm overflow-hidden flex-shrink-0">
                      {c.listingImage ? <img src={c.listingImage} alt="" className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-serif text-white truncate">{c.listingTitle}</div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(c.updatedAt)}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{isSeller ? `from @${counterparty}` : `to @${counterparty}`} — €{c.listingPrice?.toLocaleString()}</div>
                      {c.lastMessage && (
                        <div className="text-sm text-white/70 truncate">
                          {c.lastMessage.type === 'offer' && <span className="text-[#d4b896] mr-1">Offer:</span>}
                          {c.lastMessage.text}
                        </div>
                      )}
                    </div>
                  </Card>
                </a>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
