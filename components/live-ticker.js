'use client'

import { useEffect, useState } from 'react'
import { Activity, Zap, Tag, TrendingUp } from 'lucide-react'

function timeAgo(iso) {
  if (!iso) return ''
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'just now'
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

const ICONS = { new_listing: Tag, new_offer: Zap, sold: TrendingUp }

export default function LiveTicker() {
  const [events, setEvents] = useState([])

  const load = async () => {
    try {
      const res = await fetch('/api/activity')
      const data = await res.json()
      if (data.ok) setEvents(data.items || [])
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 12000)
    return () => clearInterval(t)
  }, [])

  if (events.length === 0) return null

  const looped = [...events, ...events]

  return (
    <section className="relative border-y border-white/5 bg-gradient-to-r from-black via-[#0a0a0a] to-black overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      <div className="flex items-center gap-3 px-6 py-3">
        <div className="flex items-center gap-2 flex-shrink-0 z-20 pr-3 border-r border-white/10">
          <div className="relative">
            <Activity className="w-4 h-4 text-[#d4b896]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          </div>
          <span className="text-[10px] tracking-[0.3em] text-white/70 uppercase hidden sm:inline">Live</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-10 animate-ticker whitespace-nowrap">
            {looped.map((e, i) => {
              const Icon = ICONS[e.type] || Activity
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-white/80">
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${e.type === 'sold' ? 'text-emerald-400' : 'text-[#d4b896]'}`} />
                  <span className="text-white/90">@{e.username || 'anon'}</span>
                  <span className="text-white/60">{e.label}</span>
                  {e.price && <span className="text-[#d4b896] font-medium">€{e.price.toLocaleString()}</span>}
                  <span className="text-white/40 text-xs">· {timeAgo(e.createdAt)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  )
}
