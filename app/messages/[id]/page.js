'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import MarketplaceNav from '@/components/marketplace-nav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Send, BadgePercent, Check, X } from 'lucide-react'

function App() {
  const params = useParams()
  const id = params?.id
  const [user, setUser] = useState(null)
  const [convo, setConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const sinceRef = useRef(null)

  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setUser(d.user))
  }, [])

  const load = async (poll = false) => {
    const qs = poll && sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : ''
    const res = await fetch(`/api/conversations/${id}${qs}`)
    if (!res.ok) return
    const data = await res.json()
    setConvo(data.conversation)
    if (poll) {
      if (data.messages.length) {
        setMessages((prev) => [...prev, ...data.messages])
        sinceRef.current = data.messages[data.messages.length - 1].createdAt
      }
    } else {
      setMessages(data.messages)
      if (data.messages.length) sinceRef.current = data.messages[data.messages.length - 1].createdAt
    }
  }

  useEffect(() => {
    if (!id) return
    load(false)
    const t = setInterval(() => load(true), 3500)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', text }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages((prev) => [...prev, data.message])
        sinceRef.current = data.message.createdAt
        setText('')
      } else {
        toast.error(data.error || 'Send failed.')
      }
    } finally {
      setSending(false)
    }
  }

  const sendOffer = async (e) => {
    e.preventDefault()
    const p = Number(offerPrice)
    if (!Number.isFinite(p) || p <= 0) {
      toast.error('Enter a valid amount.')
      return
    }
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'offer', price: p }),
    })
    const data = await res.json()
    if (res.ok) {
      setMessages((prev) => [...prev, data.message])
      sinceRef.current = data.message.createdAt
      setOfferOpen(false)
      setOfferPrice('')
      toast.success(`Offer of €${p.toLocaleString()} sent.`)
    } else {
      toast.error(data.error || 'Offer failed.')
    }
  }

  const offerAction = async (msgId, action, counterPrice) => {
    const body = { action }
    if (action === 'counter') body.price = counterPrice
    const res = await fetch(`/api/messages/${msgId}/offer-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      toast.success(action === 'accept' ? 'Offer accepted' : action === 'reject' ? 'Offer declined' : 'Counter-offer sent')
      load(false)
    } else {
      toast.error(data.error || 'Action failed.')
    }
  }

  if (!convo) {
    return <main className="min-h-screen bg-background"><MarketplaceNav /><div className="p-10 text-muted-foreground">Loading conversation…</div></main>
  }

  const counterpartyName = user?.id === convo.sellerId ? convo.buyerUsername : convo.sellerUsername

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <MarketplaceNav />
      <section className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col">
        <a href={`/listings/${convo.listingId}`} className="block">
          <Card className="bg-card border-white/10 p-3 mb-4 hover:border-white/20 transition flex items-center gap-3">
            <div className="w-12 h-12 bg-neutral-900 rounded-sm overflow-hidden flex-shrink-0">
              {convo.listingImage ? <img src={convo.listingImage} alt="" className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif text-white text-sm truncate">{convo.listingTitle}</div>
              <div className="text-xs text-muted-foreground">with @{counterpartyName} — asking €{convo.listingPrice?.toLocaleString()}</div>
            </div>
          </Card>
        </a>

        <Card className="bg-card border-white/10 flex-1 flex flex-col min-h-[60vh]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">Say hello, ask a question, or make an offer.</div>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user?.id
              if (m.type === 'system') {
                return (
                  <div key={m.id} className="text-center">
                    <span className="text-xs text-[#d4b896] bg-[#d4b896]/10 border border-[#d4b896]/20 px-3 py-1 rounded-full">{m.text}</span>
                  </div>
                )
              }
              if (m.type === 'offer') {
                const status = m.offerStatus
                const canAct = !mine && status === 'pending'
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-sm border ${mine ? 'border-[#d4b896]/30 bg-[#d4b896]/5' : 'border-white/10 bg-white/[0.03]'} p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        <BadgePercent className="w-4 h-4 text-[#d4b896]" />
                        <span className="text-xs uppercase tracking-wider text-[#d4b896]">Offer</span>
                        {status !== 'pending' && (
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${status === 'accepted' ? 'bg-green-500/20 text-green-400' : status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/70'}`}>{status}</span>
                        )}
                      </div>
                      <div className="font-serif text-xl text-white">€{m.price?.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">@{m.senderUsername} • {new Date(m.createdAt).toLocaleString()}</div>
                      {canAct && (
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => offerAction(m.id, 'accept')} className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm h-8"><Check className="w-3.5 h-3.5 mr-1" /> Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => offerAction(m.id, 'reject')} className="border-white/10 rounded-sm h-8"><X className="w-3.5 h-3.5 mr-1" /> Reject</Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            const v = prompt(`Counter-offer (asking €${convo.listingPrice}, their offer €${m.price}):`)
                            if (v) offerAction(m.id, 'counter', Number(v))
                          }} className="rounded-sm h-8">Counter</Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-sm ${mine ? 'bg-[#d4b896] text-black' : 'bg-white/[0.06] text-white border border-white/10'}`}>
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    <div className={`text-[10px] mt-1 ${mine ? 'text-black/60' : 'text-muted-foreground'}`}>@{m.senderUsername} • {new Date(m.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {offerOpen && (
            <form onSubmit={sendOffer} className="border-t border-white/10 p-3 flex gap-2 bg-black">
              <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder={`Offer amount (asking €${convo.listingPrice?.toLocaleString()})`} className="bg-white/5 border-white/10 text-white rounded-sm" />
              <Button type="submit" className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm">Send offer</Button>
              <Button type="button" variant="ghost" onClick={() => setOfferOpen(false)} className="rounded-sm">Cancel</Button>
            </form>
          )}

          <form onSubmit={send} className="border-t border-white/10 p-3 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOfferOpen(!offerOpen)} className="border-white/10 rounded-sm flex-shrink-0">
              <BadgePercent className="w-4 h-4" />
            </Button>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" className="bg-white/5 border-white/10 text-white rounded-sm" />
            <Button type="submit" disabled={sending || !text.trim()} className="bg-[#d4b896] hover:bg-[#c5a87f] text-black rounded-sm">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </section>
    </main>
  )
}

export default App
