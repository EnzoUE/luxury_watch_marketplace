'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import MarketplaceNav from '@/components/marketplace-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Calendar, Package } from 'lucide-react'

function App() {
  const params = useParams()
  const username = params?.username
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    fetch(`/api/users/${username}`)
      .then((r) => r.json())
      .then((d) => setData(d.ok ? d : null))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Loading…</div></main>
  }
  if (!data) {
    return (
      <main className="min-h-screen bg-background">
        <MarketplaceNav />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-3xl text-white mb-4">User not found</h1>
          <a href="/listings"><Button variant="outline" className="border-white/10 rounded-sm">Back to marketplace</Button></a>
        </div>
      </main>
    )
  }

  const { user, listings, stats } = data

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav />
      <section className="max-w-6xl mx-auto px-6 py-10">
        <Card className="bg-card border-white/10 p-8 mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#d4b896]/40 to-[#d4b896]/10 flex items-center justify-center overflow-hidden border border-[#d4b896]/30">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif text-3xl text-[#d4b896]">{user.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-3xl text-white">@{user.username}</h1>
              </div>
              {user.bio && <p className="text-muted-foreground mb-3">{user.bio}</p>}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {user.location && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.location}</span>)}
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {new Date(user.createdAt).toLocaleDateString('en', { month: 'short', year: 'numeric' })}</span>
                <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {stats.active} active • {stats.sold} sold</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-[#d4b896]" /> {stats.ratingCount > 0 ? `${stats.rating.toFixed(1)} · ${stats.ratingCount} reviews` : 'No reviews yet'}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-6">
          <h2 className="font-serif text-2xl text-white">Listings</h2>
        </div>
        {listings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-sm text-muted-foreground">No listings yet.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((l) => (
              <a key={l.id} href={`/listings/${l.id}`} className="group block">
                <div className="aspect-square bg-neutral-900 overflow-hidden rounded-sm relative">
                  {l.images?.[0] ? (
                    <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                </div>
                <div className="pt-3">
                  <div className="font-serif text-white text-base leading-tight line-clamp-1">{l.title}</div>
                  <div className="text-[#d4b896] mt-1">€{l.price?.toLocaleString()}</div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
