'use client'

import { useEffect, useState } from 'react'
import MarketplaceNav from '@/components/marketplace-nav'
import VerifiedBadge from '@/components/verified-badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'

function App() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const load = async (query = '') => {
    setLoading(true)
    try {
      const res = await fetch('/api/listings' + (query ? `?q=${encodeURIComponent(query)}` : ''))
      const data = await res.json()
      setItems(data.items || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav active="browse" />
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">Marketplace</div>
            <h1 className="font-serif text-3xl sm:text-4xl text-white">All listings</h1>
          </div>
          <a href="/sell">
            <Button className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm">
              <Plus className="w-4 h-4 mr-2" /> List a watch
            </Button>
          </a>
        </div>
        <div className="flex gap-2 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(q)}
              placeholder="Search by title, brand, or collection…"
              className="bg-white/5 border-white/10 text-white pl-10 rounded-sm h-11"
            />
          </div>
          <Button variant="outline" onClick={() => load(q)} className="border-white/10 rounded-sm h-11">Search</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/[0.03] rounded-sm aspect-[3/4] animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-sm">
            <p className="font-serif text-2xl text-white mb-2">No listings yet.</p>
            <p className="text-muted-foreground mb-6">Be the first to list an AP × Swatch reference.</p>
            <a href="/sell">
              <Button className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm">
                <Plus className="w-4 h-4 mr-2" /> Create listing
              </Button>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((l) => (
              <a key={l.id} href={`/listings/${l.id}`} className="group block">
                <div className="aspect-square bg-neutral-900 overflow-hidden rounded-sm relative">
                  {l.images?.[0] ? (
                    <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                  )}
                  {l.condition && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 backdrop-blur border border-white/10 text-[10px] tracking-wider text-white/80 uppercase rounded-sm">
                      {l.condition}
                    </div>
                  )}
                  {l.isVerifiedPhoto && (
                    <div className="absolute top-2 right-2">
                      <VerifiedBadge size="sm" />
                    </div>
                  )}
                </div>
                <div className="pt-3">
                  <div className="font-serif text-white text-base leading-tight line-clamp-1">{l.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">@{l.sellerUsername} — {l.location || 'Location undisclosed'}</div>
                  <div className="mt-2 text-[#d4b896] font-medium">€{l.price?.toLocaleString()}</div>
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
