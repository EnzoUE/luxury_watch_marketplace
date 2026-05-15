'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import MarketplaceNav from '@/components/marketplace-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Heart, ShieldCheck, Truck, BadgeCheck, FileCheck, Loader2 } from 'lucide-react'

function App() {
  const params = useParams()
  const id = params?.id
  const [listing, setListing] = useState(null)
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  // Offer flow
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [sendingOffer, setSendingOffer] = useState(false)

  // Shipping
  const [shipFrom, setShipFrom] = useState('')
  const [shipping, setShipping] = useState(null)
  const [shipLoading, setShipLoading] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setMe(d.user || null))
  }, [])

  useEffect(() => {
    if (!id) return
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((d) => setListing(d.listing || null))
      .finally(() => setLoading(false))
  }, [id])

  const estimateShipping = async (e) => {
    e.preventDefault()
    if (!shipFrom.trim()) { toast.error('Enter your city or country.'); return }
    if (!listing?.location) { toast.error('Seller has no location set.'); return }
    setShipLoading(true)
    try {
      const res = await fetch('/api/shipping/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: listing.location, to: shipFrom }),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error || 'Could not estimate.')
      else setShipping(data)
    } catch { toast.error('Network error.') }
    finally { setShipLoading(false) }
  }

  const startConversation = async (asOffer = false) => {
    if (!me) { window.location.href = '/login'; return null }
    const res = await fetch('/api/conversations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: id }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Could not start chat.'); return null }
    return data.conversation
  }

  const submitOffer = async (e) => {
    e.preventDefault()
    const p = Number(offerPrice)
    if (!Number.isFinite(p) || p <= 0) { toast.error('Enter a valid offer.'); return }
    setSendingOffer(true)
    const convo = await startConversation(true)
    if (!convo) { setSendingOffer(false); return }
    const res = await fetch(`/api/conversations/${convo.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'offer', price: p }),
    })
    const data = await res.json()
    setSendingOffer(false)
    if (!res.ok) { toast.error(data.error || 'Offer failed.'); return }
    toast.success(`Offer of €${p.toLocaleString()} sent.`)
    window.location.href = `/messages/${convo.id}`
  }

  const messageSeller = async () => {
    const convo = await startConversation(false)
    if (convo) window.location.href = `/messages/${convo.id}`
  }

  const buyNow = () => {
    if (!me) { window.location.href = '/login'; return }
    toast('Stripe Connect checkout coming next.', {
      description: `Ready to buy “${listing.title}” for €${listing.price.toLocaleString()}. Connect Stripe to enable real payments.`,
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <MarketplaceNav />
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square bg-white/[0.03] animate-pulse rounded-sm" />
          <div className="space-y-4">
            <div className="h-10 bg-white/[0.03] animate-pulse rounded-sm w-3/4" />
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
          <a href="/listings"><Button variant="outline" className="border-white/10 rounded-sm">Back to marketplace</Button></a>
        </div>
      </main>
    )
  }

  const images = listing.images?.length ? listing.images : []
  const main = images[activeImg]
  const isOwner = me?.id === listing.userId

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav />
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-neutral-900 overflow-hidden rounded-sm mb-3">
            {main ? <img src={main} alt={listing.title} className="w-full h-full object-cover" /> :
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((u, i) => (
                <button key={i} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden rounded-sm border ${i === activeImg ? 'border-[#d4b896]' : 'border-white/10'}`}>
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
            Sold by <a href={`/u/${listing.sellerUsername}`} className="text-white hover:text-[#d4b896]">@{listing.sellerUsername}</a>
            {listing.location && <> — {listing.location}</>}
          </div>
          <div className="flex items-baseline gap-3 mb-8">
            <div className="font-serif text-4xl text-white">€{listing.price.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">incl. buyer protection</div>
          </div>

          {isOwner ? (
            <Card className="bg-card border-white/10 p-4 mb-6 text-sm text-muted-foreground">This is your listing.</Card>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-3">
                <Button onClick={buyNow} className="flex-1 bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-12 text-base">Buy now</Button>
                <Button onClick={() => setOfferOpen(!offerOpen)} variant="outline" className="flex-1 border-white/10 rounded-sm h-12 text-base">Make an offer</Button>
                <Button variant="ghost" size="icon" className="h-12 w-12 rounded-sm border border-white/10" onClick={() => toast('Added to watchlist')}><Heart className="w-5 h-5" /></Button>
              </div>
              <button onClick={messageSeller} className="text-xs text-[#d4b896] hover:text-white transition mb-6">Message the seller →</button>

              {offerOpen && (
                <form onSubmit={submitOffer} className="flex gap-2 mb-6 animate-fade-up">
                  <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder={`Your offer in EUR (asking €${listing.price.toLocaleString()})`} className="bg-white/5 border-white/10 text-white rounded-sm h-11" />
                  <Button type="submit" disabled={sendingOffer} className="bg-white text-black hover:bg-white/90 rounded-sm h-11">{sendingOffer ? 'Sending…' : 'Send offer'}</Button>
                </form>
              )}
            </>
          )}

          <Card className="bg-card border-white/10 p-5 mb-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Shipping estimate</div>
            <form onSubmit={estimateShipping} className="flex gap-2 mb-3">
              <Input value={shipFrom} onChange={(e) => setShipFrom(e.target.value)} placeholder="Your city or country (e.g. Berlin)" className="bg-white/5 border-white/10 text-white rounded-sm h-10" />
              <Button type="submit" disabled={shipLoading} variant="outline" className="border-white/10 rounded-sm h-10">
                {shipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Estimate'}
              </Button>
            </form>
            {shipping && (
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="text-white">{shipping.distanceKm.toLocaleString()} km</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping cost</span><span className="text-[#d4b896] font-medium">€{shipping.costEUR}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estimated delivery</span><span className="text-white">{shipping.eta}</span></div>
              </div>
            )}
          </Card>

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
              { icon: BadgeCheck, t: 'Verified seller', d: 'KYC + sales history.' },
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
