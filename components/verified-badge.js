'use client'

import { ShieldCheck } from 'lucide-react'

export default function VerifiedBadge({ size = 'md', className = '' }) {
  const cls =
    size === 'sm'
      ? 'text-[9px] px-1.5 py-0.5'
      : size === 'lg'
      ? 'text-xs px-2.5 py-1'
      : 'text-[10px] px-2 py-0.5'
  return (
    <span
      className={`inline-flex items-center gap-1 ${cls} tracking-[0.2em] uppercase rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 backdrop-blur ${className}`}
      title="Seller submitted a verified ownership photo of this watch."
    >
      <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
      Owner Verified
    </span>
  )
}
