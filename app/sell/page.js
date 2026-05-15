'use client'

import { useEffect, useState } from 'react'
import MarketplaceNav from '@/components/marketplace-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import ImageDropzone from '@/components/image-dropzone'
import { toast } from 'sonner'
import { ShieldCheck, Camera } from 'lucide-react'

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({
    title: '', description: '', brand: 'AP × Swatch', collection: '', reference: '', year: '',
    condition: 'New', price: '', location: '', boxIncluded: true, papersIncluded: true,
  })
  const [images, setImages] = useState([])
  const [verifyImg, setVerifyImg] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => {
      setUser(d.user || null)
      if (!d.user) {
        toast.error('Sign in to list a watch.')
        setTimeout(() => (window.location.href = '/login'), 1200)
      }
    }).finally(() => setChecking(false))
  }, [])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const toggle = (k) => () => setForm({ ...form, [k]: !form[k] })

  const submit = async (e) => {
    e.preventDefault()
    if (images.length === 0) { toast.error('Add at least one product photo.'); return }
    if (verifyImg.length === 0) {
      toast.error('Owner verification photo is required.', { description: 'Upload one photo of the watch with a handwritten note (your username + today’s date).' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          images,
          verifiedPhotoUrl: verifyImg[0],
          price: Number(form.price),
          year: form.year ? Number(form.year) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) toast.error(data.error || 'Could not create listing.')
      else {
        toast.success('Listing live. Owner Verified ✓')
        window.location.href = `/listings/${data.listing.id}`
      }
    } catch { toast.error('Network error.') }
    finally { setSubmitting(false) }
  }

  const todayLabel = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (checking) return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Loading…</div></main>
  if (!user) return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Redirecting…</div></main>

  return (
    <main className="min-h-screen bg-background">
      <MarketplaceNav active="sell" />
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-2">List a watch</div>
        <h1 className="font-serif text-3xl sm:text-4xl text-white mb-8">Create your listing</h1>

        <form onSubmit={submit} className="space-y-6">
          <Card className="bg-card border-white/10 p-6">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Product photos</div>
            <ImageDropzone images={images} onChange={setImages} max={8} />
          </Card>

          <Card className="bg-card border-emerald-500/20 p-6 bg-gradient-to-br from-emerald-500/[0.03] to-transparent">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm text-white font-medium mb-1">Owner Verification photo — required</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  Take one photo showing the watch <span className="text-white">alongside a handwritten note</span> containing your username
                  <span className="text-[#d4b896]"> @{user.username}</span> and today’s date <span className="text-[#d4b896]">{todayLabel}</span>.
                  This proves you physically own the watch and unlocks the <span className="text-emerald-400">Owner Verified</span> badge on your listing.
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs text-muted-foreground bg-white/[0.02] border border-white/10 rounded-sm p-3 mb-4">
              <Camera className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                Lay the watch flat. Place the handwritten note beside it (not on the dial). Make sure the username and date are
                clearly readable. Single photo only — don’t crop, don’t filter.
              </div>
            </div>
            <ImageDropzone images={verifyImg} onChange={setVerifyImg} max={1} />
          </Card>

          <Card className="bg-card border-white/10 p-6 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Title</label>
              <Input required value={form.title} onChange={set('title')} placeholder="e.g. AP × Swatch Royal Pop — Pop Blue" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Brand</label>
                <Input value={form.brand} onChange={set('brand')} className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Collection</label>
                <Input value={form.collection} onChange={set('collection')} placeholder="Royal Pop" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">Reference</label>
                <Input value={form.reference} onChange={set('reference')} placeholder="e.g. RP-BLU-01" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
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
                <Input required type="number" min="1" value={form.price} onChange={set('price')} placeholder="e.g. 920" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider">Location</label>
              <Input value={form.location} onChange={set('location')} placeholder="e.g. Paris, France" className="bg-white/5 border-white/10 text-white rounded-sm mt-1" />
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
