'use client'

import { useEffect, useState } from 'react'
import MarketplaceNav from '@/components/marketplace-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({
    title: '',
    description: '',
    brand: 'AP × Swatch',
    collection: '',
    reference: '',
    year: '',
    condition: 'New',
    price: '',
    location: '',
    boxIncluded: true,
    papersIncluded: true,
  })
  const [imageUrl, setImageUrl] = useState('')
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user || null)
        if (!d.user) {
          toast.error('Sign in to list a watch.')
          setTimeout(() => { window.location.href = '/login' }, 1500)
        }
      })
      .finally(() => setChecking(false))
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggle = (k) => () => setForm({ ...form, [k]: !form[k] })

  const addImage = () => {
    const u = imageUrl.trim()
    if (!u.startsWith('http')) {
      toast.error('Paste a valid http(s) image URL.')
      return
    }
    if (images.length >= 8) {
      toast.error('Max 8 images.')
      return
    }
    setImages([...images, u])
    setImageUrl('')
  }

  const removeImage = (i) => setImages(images.filter((_, idx) => idx !== i))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images, price: Number(form.price), year: form.year ? Number(form.year) : null }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not create listing.')
      } else {
        toast.success('Listing live.')
        window.location.href = `/listings/${data.listing.id}`
      }
    } catch {
      toast.error('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Loading…</div></main>
  if (!user) return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Redirecting to sign in…</div></main>

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav active="sell" />
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">List a watch</div>
        <h1 className="font-serif text-3xl sm:text-4xl text-white mb-8">Create your listing</h1>

        <form onSubmit={submit} className="space-y-6">
          <Card className="bg-card border-white/10 p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
              <Input required value={form.title} onChange={set('title')} placeholder="e.g. AP × Swatch Mission to Le Brassus — Onyx Bioceramic" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Brand</label>
                <Input value={form.brand} onChange={set('brand')} className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Collection</label>
                <Input value={form.collection} onChange={set('collection')} placeholder="Bioceramic Royal Oak" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reference</label>
                <Input value={form.reference} onChange={set('reference')} placeholder="APXS-01" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Year</label>
                <Input type="number" value={form.year} onChange={set('year')} placeholder="2026" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Condition</label>
                <select value={form.condition} onChange={set('condition')} className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-sm h-10 px-3">
                  <option>New</option><option>Like new</option><option>Excellent</option><option>Good</option><option>Fair</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Price (EUR)</label>
                <Input required type="number" min="1" value={form.price} onChange={set('price')} placeholder="e.g. 4500" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Location</label>
              <Input value={form.location} onChange={set('location')} placeholder="Paris, France" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={form.boxIncluded} onChange={toggle('boxIncluded')} /> Box included
              </label>
              <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                <input type="checkbox" checked={form.papersIncluded} onChange={toggle('papersIncluded')} /> Papers included
              </label>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={5} placeholder="Honest condition notes, history, any details a serious buyer should know." className="w-full mt-1 bg-white/5 border border-white/10 text-white rounded-sm p-3 text-sm" />
            </div>
          </Card>

          <Card className="bg-card border-white/10 p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Images (paste URLs — max 8)</div>
            <div className="flex gap-2 mb-4">
              <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-white/5 border-white/10 text-white rounded-sm" />
              <Button type="button" onClick={addImage} className="bg-white text-black hover:bg-white/90 rounded-sm"><Plus className="w-4 h-4" /></Button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((u, i) => (
                  <div key={i} className="relative aspect-square rounded-sm overflow-hidden border border-white/10">
                    <img src={u} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/70 p-1 rounded-sm hover:bg-black">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-12 px-8">
              {submitting ? 'Publishing…' : 'Publish listing'}
            </Button>
            <a href="/listings"><Button type="button" variant="outline" className="border-white/10 rounded-sm h-12">Cancel</Button></a>
          </div>
        </form>
      </section>
    </main>
  )
}

export default App
