'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import LiveTicker from '@/components/live-ticker'
import {
  ShieldCheck,
  Handshake,
  Zap,
  Truck,
  BadgeCheck,
  Lock,
  Receipt,
  ArrowRight,
  Sparkles,
  Clock,
  Watch,
  Briefcase,
  Gem,
  Layers,
} from 'lucide-react'

const HERO_IMG = 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1600&q=80&auto=format&fit=crop'
const FEAT_IMG_1 = 'https://images.unsplash.com/photo-1600003014637-ff82a275e191?w=1200&q=80&auto=format&fit=crop'
const FEAT_IMG_2 = 'https://images.unsplash.com/photo-1633451238042-85d93d267866?w=1200&q=80&auto=format&fit=crop'
const FEAT_IMG_3 = 'https://images.unsplash.com/photo-1600003014608-c2ccc1570a65?w=1200&q=80&auto=format&fit=crop'

const RELEASE_DATE = new Date('2026-05-16T08:00:00Z').getTime()

function useCountdown(target) {
  // Initialize to `target` so initial diff is 0 -> server and client render identical HTML.
  // After mount, switch to real Date.now() and tick every second.
  const [now, setNow] = useState(target)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  return { days, hours, minutes, seconds }
}

function FadeIn({ children, delay = 0, y = 30, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function PressStrip() {
  const press = ['HODINKEE', 'GQ', 'HYPEBEAST', 'WATCHTIME', 'ESQUIRE', 'WIRED']
  return (
    <section className="relative py-12 px-6 border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center text-[10px] tracking-[0.4em] text-muted-foreground uppercase mb-8">
            As featured in
          </div>
        </FadeIn>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {press.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.55, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="font-serif text-xl sm:text-2xl tracking-[0.3em] text-white/60 hover:text-white/90 transition cursor-default"
            >
              {p}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const quotes = [
    {
      q: 'Finally, a marketplace built by collectors for collectors. The escrow flow alone is worth it.',
      a: 'Marc D.',
      r: 'Geneva — 14 watches sold',
    },
    {
      q: 'I lost a Royal Oak deal to a scam two years ago. With Tapisserie I would never have to worry again.',
      a: 'Priya R.',
      r: 'London — collector since 2018',
    },
    {
      q: 'The cleanest interface I have used in this space. It feels like Apple decided to enter the watch business.',
      a: 'Jules M.',
      r: 'Paris — independent retailer',
    },
  ]
  return (
    <section className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="max-w-2xl mb-16">
            <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">Voices</div>
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">Trusted by collectors who care about every detail.</h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5">
          {quotes.map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="bg-black p-8 h-full flex flex-col">
                <div className="text-[#d4b896] font-serif text-5xl leading-none mb-4">&ldquo;</div>
                <p className="text-white/90 leading-relaxed mb-8 flex-1">{t.q}</p>
                <div>
                  <div className="font-serif text-white">{t.a}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.r}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-black/40 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm border border-[#d4b896]/60 flex items-center justify-center">
            <span className="text-[#d4b896] text-xs font-bold">T</span>
          </div>
          <span className="font-serif text-lg tracking-[0.25em] text-white">TAPISSERIE</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how" className="hover:text-white transition">How it works</a>
          <a href="#references" className="hover:text-white transition">Collection</a>
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#countdown" className="hover:text-white transition">Drop</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
          <a href="/listings" className="hover:text-white transition">Browse</a>
          <a href="/login" className="hover:text-white transition">Sign in</a>
        </div>
        <a href="#cta">
          <Button size="sm" className="bg-[#d4b896] hover:bg-[#c5a87f] text-black font-medium rounded-sm">
            Get Early Access
          </Button>
        </a>
      </div>
    </nav>
  )
}

function CountdownBox({ label, value }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 sm:w-28 h-20 sm:h-28 border border-[#d4b896]/30 bg-black/40 backdrop-blur flex items-center justify-center rounded-sm">
        <span className="font-serif text-3xl sm:text-5xl text-white tabular-nums">{String(value).padStart(2, '0')}</span>
        <div className="absolute inset-0 shimmer opacity-30 pointer-events-none"></div>
      </div>
      <span className="mt-3 text-[10px] tracking-[0.3em] text-muted-foreground uppercase">{label}</span>
    </div>
  )
}

function EmailForm({ size = 'lg', referrer }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, referrer }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong.')
      } else {
        setSuccess(true)
        if (data.duplicate) toast("You're already on the list.", { description: 'We\'ll be in touch soon.' })
        else toast.success(data.message || 'Welcome to TAPISSERIE.')
      }
    } catch (err) {
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 animate-fade-up">
        <div className="flex items-center gap-2 text-[#d4b896]">
          <BadgeCheck className="w-5 h-5" />
          <span className="font-serif text-xl">You&apos;re on the list.</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          We&apos;ll notify you when the marketplace opens. Early members get reduced fees on their first sale.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className={`flex flex-col sm:flex-row gap-2 w-full ${size === 'lg' ? 'max-w-md' : 'max-w-sm'} mx-auto`}>
      <Input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground/60 rounded-sm h-12 px-4"
      />
      <Button
        type="submit"
        disabled={loading}
        className="bg-[#d4b896] hover:bg-[#c5a87f] text-black font-medium rounded-sm h-12 px-6 whitespace-nowrap"
      >
        {loading ? 'Joining…' : 'Get Early Access'}
        {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </form>
  )
}

function Hero() {
  const [waitlistCount, setWaitlistCount] = useState(500)
  useEffect(() => {
    fetch('/api/waitlist/social-proof').then((r) => r.json()).then((d) => {
      if (d.ok && d.displayed) setWaitlistCount(d.displayed)
    }).catch(() => {})
  }, [])
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden noise-bg">
      <div className="absolute inset-0 grid-bg opacity-40"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black"></div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full md:w-2/3 h-full opacity-40 md:opacity-70 pointer-events-none">
        <img src={HERO_IMG} alt="Luxury watch" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="max-w-2xl animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#d4b896]/30 bg-black/40 backdrop-blur rounded-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs tracking-[0.2em] text-[#d4b896] uppercase">Private beta opens May 16, 2026 · Collector spots limited</span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl leading-[1.05] text-white text-balance mb-6">
            Don’t miss the drop. <span className="gold-gradient italic">Secure</span> your AP × Swatch without the line.
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
            Join <span className="text-white font-medium">{waitlistCount.toLocaleString()}+ collectors</span> waiting for the Royal Pop marketplace. Early members get <span className="text-[#d4b896] font-medium">0% selling fees for the first 48 hours</span>.
          </p>
          <div id="cta" className="space-y-4">
            <EmailForm referrer="hero" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
              <span className="flex items-center gap-1.5"><BadgeCheck className="w-3 h-3 text-[#d4b896]" /> Verified collectors only</span>
              <span className="hidden sm:inline text-white/20">·</span>
              <span>No spam — drop notification only</span>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground tracking-[0.3em] uppercase animate-pulse">
        Scroll
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Join the waitlist', desc: 'Reserve your spot before public launch. Early members receive priority access and reduced fees on their first sale.' },
    { n: '02', title: 'List or browse', desc: 'Verified sellers list their AP × Swatch references. Buyers browse with full transparency on condition, box, and papers.' },
    { n: '03', title: 'Offer or buy now', desc: 'Send offers, negotiate, or purchase instantly. Every transaction is held in escrow until the buyer confirms delivery.' },
    { n: '04', title: 'Secure handover', desc: 'Tapisserie generates the shipping label, tracks the parcel, and releases funds once the watch is authenticated.' },
  ]
  return (
    <section id="how" className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="max-w-2xl mb-20">
            <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">How it works</div>
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">Four steps. Zero anxiety.</h2>
            <p className="text-muted-foreground text-lg">Built like a Swiss movement — every detail engineered for trust.</p>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.08}>
              <div className="bg-black p-8 hover:bg-white/[0.02] transition-colors group h-full">
                <div className="text-[#d4b896]/60 font-serif text-3xl mb-6 group-hover:text-[#d4b896] transition">{s.n}</div>
                <h3 className="font-serif text-xl text-white mb-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features = [
    { icon: ShieldCheck, title: 'Secure buyer/seller system', desc: 'Identity-verified accounts and dispute resolution backed by our team.' },
    { icon: Handshake, title: 'Offer negotiation', desc: 'Counter-offers, accept/reject flows, expiring offers — like Grailed, refined for watches.' },
    { icon: Zap, title: 'Buy Now', desc: 'One-tap purchase with instant escrow lock. The watch is yours the moment you tap.' },
    { icon: Truck, title: 'Distance-based shipping', desc: 'Geolocation-powered shipping estimates so buyers see the true cost upfront.' },
    { icon: BadgeCheck, title: 'Verified seller badges', desc: 'Reputation, history, and identity checks. Trust at a glance.' },
    { icon: Lock, title: 'Escrow-ready architecture', desc: 'Funds released only after the watch is delivered and authenticated.' },
    { icon: Receipt, title: 'Transparent fees', desc: 'A single, fair marketplace fee. No hidden costs, no surprises at checkout.' },
    { icon: Clock, title: 'Built for the drop', desc: 'Optimised for the May 16, 2026 release — handle peak demand without lag.' },
  ]
  return (
    <section id="features" className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-16 mb-20">
          <FadeIn className="flex-1 max-w-xl">
            <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">Features</div>
            <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">Engineered for collectors.</h2>
            <p className="text-muted-foreground text-lg">Every feature exists to remove friction between you and your next reference.</p>
          </FadeIn>
          <FadeIn delay={0.15} className="flex-1 grid grid-cols-3 gap-4">
            <div className="aspect-[3/4] overflow-hidden rounded-sm"><img src={FEAT_IMG_1} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-700" /></div>
            <div className="aspect-[3/4] overflow-hidden rounded-sm mt-8"><img src={FEAT_IMG_2} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-700" /></div>
            <div className="aspect-[3/4] overflow-hidden rounded-sm"><img src={FEAT_IMG_3} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-700" /></div>
          </FadeIn>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {features.map((f, i) => (
            <FadeIn key={i} delay={(i % 4) * 0.06}>
              <div className="bg-black p-6 hover:bg-white/[0.02] transition group h-full">
                <f.icon className="w-6 h-6 text-[#d4b896] mb-4 group-hover:scale-110 transition" />
                <h3 className="text-white font-medium mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function Countdown() {
  const { days, hours, minutes, seconds } = useCountdown(RELEASE_DATE)
  return (
    <section id="countdown" className="relative py-32 px-6 border-t border-white/5 overflow-hidden">
      <div className="absolute inset-0 noise-bg"></div>
      <div className="relative max-w-7xl mx-auto text-center">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">The drop</div>
        <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">May 16, 2026</h2>
        <p className="text-muted-foreground text-lg mb-14 max-w-xl mx-auto">
          The AP × Swatch collection drops. The marketplace opens the same morning.
        </p>
        <div className="flex justify-center gap-3 sm:gap-6 mb-14">
          <CountdownBox label="Days" value={days} />
          <CountdownBox label="Hours" value={hours} />
          <CountdownBox label="Minutes" value={minutes} />
          <CountdownBox label="Seconds" value={seconds} />
        </div>
        <div className="max-w-md mx-auto">
          <EmailForm size="md" referrer="countdown" />
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const items = [
    { q: 'When does the marketplace open?', a: 'TAPISSERIE opens on May 16, 2026 — the same day the AP × Swatch collection drops. Waitlist members get access first.' },
    { q: 'What is escrow and why does it matter?', a: 'When a buyer pays, funds are held by TAPISSERIE — not the seller. The money only moves to the seller after the buyer confirms the watch arrived as described. This protects both sides.' },
    { q: 'How much does it cost to sell?', a: 'A single, transparent marketplace fee. No listing fees, no surprises. Early waitlist members pay reduced fees on their first sale.' },
    { q: 'Are sellers verified?', a: 'Yes. Every seller goes through identity verification, and trusted sellers earn a verified badge based on completed sales and feedback.' },
    { q: 'How is shipping calculated?', a: 'We calculate shipping cost based on the distance between buyer and seller using geolocation, so the price you see is the price you pay.' },
    { q: 'Can I make offers like on Vinted or Grailed?', a: 'Absolutely. Send offers, counter-offers, and negotiate directly inside the chat with the seller. Buy Now is also one tap away.' },
  ]
  return (
    <section id="faq" className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-3xl mx-auto">
        <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4 text-center">FAQ</div>
        <h2 className="font-serif text-4xl sm:text-5xl text-white mb-14 text-center">Questions, answered.</h2>
        <Accordion type="single" collapsible className="w-full">
          {items.map((it, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
              <AccordionTrigger className="text-left text-white hover:text-[#d4b896] font-serif text-lg py-5">
                {it.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-5">
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-sm border border-[#d4b896]/60 flex items-center justify-center">
            <span className="text-[#d4b896] text-[10px] font-bold">T</span>
          </div>
          <span className="font-serif text-sm tracking-[0.25em] text-white">TAPISSERIE</span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          © 2026 Tapisserie. Independent marketplace. Not affiliated with Audemars Piguet or Swatch.
        </p>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="#" className="hover:text-white transition">Privacy</a>
          <a href="#" className="hover:text-white transition">Terms</a>
          <a href="/admin" className="hover:text-white transition">Admin</a>
        </div>
      </div>
    </footer>
  )
}

function FeaturedRefs() {
  const refs = [
    { name: 'AP × Swatch Mission to Le Brassus', code: 'APXS-01', img: HERO_IMG, color: 'Onyx Bioceramic' },
    { name: 'AP × Swatch Geneva', code: 'APXS-02', img: FEAT_IMG_1, color: 'Lake Léman Blue' },
    { name: 'AP × Swatch Sahara', code: 'APXS-03', img: FEAT_IMG_2, color: 'Desert Tan' },
    { name: 'AP × Swatch Forêt', code: 'APXS-04', img: FEAT_IMG_3, color: 'Vallée Green' },
    { name: 'AP × Swatch Glacier', code: 'APXS-05', img: HERO_IMG, color: 'Arctic White' },
    { name: 'AP × Swatch Midnight', code: 'APXS-06', img: FEAT_IMG_2, color: 'Galaxy Black' },
  ]
  return (
    <section id="references" className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">The collection</div>
              <h2 className="font-serif text-4xl sm:text-5xl text-white mb-4">Six references. One drop.</h2>
              <p className="text-muted-foreground text-lg">
                A first look at the AP × Swatch references making their debut on May 16. Browse, watchlist, and prepare your offer.
              </p>
            </div>
            <a href="#cta" className="text-sm text-[#d4b896] hover:text-white transition tracking-wide">
              Reserve early access →
            </a>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/5">
          {refs.map((r, i) => (
            <FadeIn key={r.code} delay={(i % 3) * 0.08}>
              <div className="bg-black group cursor-pointer h-full">
                <div className="aspect-square overflow-hidden bg-neutral-950 relative">
                  <img src={r.img} alt={r.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition duration-700" />
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur border border-white/10 text-[10px] tracking-[0.2em] text-white/80 uppercase rounded-sm">
                    {r.code}
                  </div>
                </div>
                <div className="p-5">
                  <div className="font-serif text-white text-lg leading-tight mb-1">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.color}</div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function StickyCTA({ visible }) {
  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 transition-all duration-500 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-black/85 backdrop-blur-md border-t border-[#d4b896]/30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="w-4 h-4 text-[#d4b896] flex-shrink-0" />
            <p className="text-xs sm:text-sm text-white/90 truncate">
              <span className="hidden sm:inline">The drop is approaching. </span>
              Lock in early access — reduced fees on your first sale.
            </p>
          </div>
          <a href="#cta" className="flex-shrink-0">
            <Button size="sm" className="bg-[#d4b896] hover:bg-[#c5a87f] text-black font-medium rounded-sm whitespace-nowrap">
              Get Access
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

function CrossSell() {
  const items = [
    { icon: Layers, name: 'Rubber Straps', desc: 'Tropical-style FKM rubber, custom-fit for Bioceramic cases.' },
    { icon: Watch, name: 'Leather Straps', desc: 'Hand-stitched calfskin and full-grain leather in collector tones.' },
    { icon: Gem, name: 'Titanium Clasps', desc: 'Micro-adjust deployant clasps, brushed grade-5 titanium.' },
    { icon: Briefcase, name: 'Travel Cases', desc: 'Single-watch and two-watch travel rolls, premium leather lined.' },
  ]
  return (
    <section className="relative py-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div className="max-w-xl">
              <div className="text-xs tracking-[0.3em] text-[#d4b896] uppercase mb-4">Curated accessories</div>
              <h2 className="font-serif text-4xl sm:text-5xl text-white mb-3">Upgrade your Royal Pop.</h2>
              <p className="text-muted-foreground text-lg">Exclusive accessories curated for AP × Swatch collectors.</p>
            </div>
            <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Coming soon</span>
          </div>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
          {items.map((it, i) => (
            <FadeIn key={it.name} delay={(i % 4) * 0.08}>
              <div className="bg-black h-full p-6 group flex flex-col">
                <div className="aspect-[4/3] rounded-sm mb-5 bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/5 flex items-center justify-center relative overflow-hidden">
                  <it.icon className="w-10 h-10 text-[#d4b896]/70 group-hover:text-[#d4b896] group-hover:scale-110 transition" strokeWidth={1.1} />
                  <div className="absolute top-2 right-2 text-[9px] tracking-[0.25em] uppercase bg-[#d4b896]/10 text-[#d4b896] border border-[#d4b896]/20 px-2 py-0.5 rounded-sm">
                    Coming soon
                  </div>
                </div>
                <div className="font-serif text-xl text-white mb-2">{it.name}</div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{it.desc}</p>
                <button className="text-xs text-[#d4b896]/70 hover:text-[#d4b896] tracking-wider uppercase mt-4 text-left transition" disabled>
                  Notify me →
                </button>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    // pageview beacon (fire-and-forget)
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'pageview', path: '/' }),
    }).catch(() => {})

    const onScroll = () => {
      setShowSticky(window.scrollY > window.innerHeight * 0.9)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'When does the marketplace open?', acceptedAnswer: { '@type': 'Answer', text: 'TAPISSERIE opens on May 16, 2026 — the same day the AP × Swatch collection drops. Waitlist members get access first.' } },
      { '@type': 'Question', name: 'What is escrow and why does it matter?', acceptedAnswer: { '@type': 'Answer', text: 'When a buyer pays, funds are held by TAPISSERIE — not the seller. The money only moves to the seller after the buyer confirms the watch arrived as described. This protects both sides.' } },
      { '@type': 'Question', name: 'How much does it cost to sell?', acceptedAnswer: { '@type': 'Answer', text: 'A single, transparent marketplace fee. No listing fees, no surprises. Early waitlist members pay reduced fees on their first sale.' } },
      { '@type': 'Question', name: 'Are sellers verified?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Every seller goes through identity verification, and trusted sellers earn a verified badge based on completed sales and feedback.' } },
      { '@type': 'Question', name: 'How is shipping calculated?', acceptedAnswer: { '@type': 'Answer', text: 'We calculate shipping cost based on the distance between buyer and seller using geolocation, so the price you see is the price you pay.' } },
      { '@type': 'Question', name: 'Can I make offers like on Vinted or Grailed?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely. Send offers, counter-offers, and negotiate directly inside the chat with the seller. Buy Now is also one tap away.' } },
    ],
  }

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Nav />
      <Hero />
      <LiveTicker />
      <PressStrip />
      <HowItWorks />
      <FeaturedRefs />
      <Features />
      <CrossSell />
      <Testimonials />
      <Countdown />
      <FAQ />
      <Footer />
      <StickyCTA visible={showSticky} />
    </main>
  )
}

export default App
