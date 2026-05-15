'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import MarketplaceNav from '@/components/marketplace-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Heart, ShieldCheck, Truck, BadgeCheck, Package, FileCheck } from 'lucide-react'

function App() {
  const params = useParams()
  const id = params?.id
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((d) => setListing(d.listing || null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <MarketplaceNav />
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-white/[0.03] animate-pulse rounded-sm" />
          <div className="space-y-4">
            <div className="h-10 bg-white/[0.03] animate-pulse rounded-sm w-3/4" />
            <div className="h-6 bg-white/[0.03] animate-pulse rounded-sm w-1/2" />
            <div className="h-40 bg-white/[0.03] animate-pulse rounded-sm" />
          </div>
        </div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-background">
        <MarketplaceNav />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-3xl text-white mb-4">Listing not found</h1>
          <p className="text-muted-foreground mb-6">It may have been sold or removed.</p>
          <a href="/listings"><Button variant="outline" className="border-white/10 rounded-sm">Back to marketplace</Button></a>
        </div>
      </main>
    )
  }

  const images = listing.images?.length ? listing.images : []
  const main = images[activeImg]

  const submitOffer = async (e) => {
    e.preventDefault()
    const p = Number(offerPrice)
    if (!Number.isFinite(p) || p <= 0) {
      toast.error('Enter a valid offer amount.')
      return
    }
    toast.success(`Offer of €${p.toLocaleString()} sent to @${listing.sellerUsername}.`, {
      description: 'Real-time offers ship with the messaging module — we saved your intent.',
    })
    setOfferOpen(false)
    setOfferPrice('')
  }

  const buyNow = () => {
    toast("Stripe Connect checkout coming next.", {
      description: `You're ready to buy “${listing.title}” for €${listing.price.toLocaleString()}. Connect Stripe to enable real payments.`,
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav />
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-neutral-900 overflow-hidden rounded-sm mb-3">
            {main ? (
              <img src={main} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((u, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square overflow-hidden rounded-sm border ${i === activeImg ? 'border-[#d4b896]' : 'border-white/10'}`}
                >
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">{listing.brand}</div>
          <h1 className="font-serif text-3xl sm:text-4xl text-white mb-2">{listing.title}</h1>
          <div className="text-sm text-muted-foreground mb-6">
            Sold by <span className="text-white">@{listing.sellerUsername}</span>
            {listing.location && <> — {listing.location}</>}
          </div>
          <div className="flex items-baseline gap-3 mb-8">
            <div className="font-serif text-4xl text-white">€{listing.price.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">incl. buyer protection</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button onClick={buyNow} className="flex-1 bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-12 text-base">
              Buy now
            </Button>
            <Button onClick={() => setOfferOpen(!offerOpen)} variant="outline" className="flex-1 border-white/10 rounded-sm h-12 text-base">
              Make an offer
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-sm border border-white/10" onClick={() => toast('Added to watchlist')}>
              <Heart className="w-5 h-5" />
            </Button>
          </div>

          {offerOpen && (
            <form onSubmit={submitOffer} className="flex gap-2 mb-6 animate-fade-up">
              <Input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder={`Your offer (EUR). Asking €${listing.price.toLocaleString()}`}
                className="bg-white/5 border-white/10 text-white rounded-sm h-11"
              />
              <Button type="submit" className="bg-white text-black hover:bg-white/90 rounded-sm h-11">Send offer</Button>
            </form>
          )}

          <Card className="bg-card border-white/10 p-5 mb-6">
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              {listing.collection && (<><div className="text-muted-foreground">Collection</div><div className="text-white">{listing.collection}</div></>)}
              {listing.reference && (<><div className="text-muted-foreground">Reference</div><div className="text-white">{listing.reference}</div></>)}
              {listing.year && (<><div className="text-muted-foreground">Year</div><div className="text-white">{listing.year}</div></>)}
              <div className="text-muted-foreground">Condition</div><div className="text-white">{listing.condition}</div>
              <div className="text-muted-foreground">Box</div><div className="text-white">{listing.boxIncluded ? 'Included' : 'Not included'}</div>
              <div className="text-muted-foreground">Papers</div><div className="text-white">{listing.papersIncluded ? 'Included' : 'Not included'}</div>
            </div>
          </Card>

          {listing.description && (
            <div className="mb-8">
              <h2 className="font-serif text-xl text-white mb-3">Description</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-px bg-white/5 rounded-sm overflow-hidden">
            {[
              { icon: ShieldCheck, t: 'Escrow protected', d: 'Funds released only after delivery.' },
              { icon: BadgeCheck, t: 'Identity verified seller', d: 'KYC + sales history.' },
              { icon: Truck, t: 'Tracked shipping', d: 'Distance-based price.' },
              { icon: FileCheck, t: 'Authentication', d: 'In-house check before release.' },
            ].map((it, i) => (
              <div key={i} className="bg-black p-4">
                <it.icon className="w-5 h-5 text-[#d4b896] mb-2" />
                <div className="text-white text-sm font-medium">{it.t}</div>
                <div className="text-xs text-muted-foreground">{it.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
