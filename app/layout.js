import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const OG_IMAGE = 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=1200&q=80&auto=format&fit=crop'

export const metadata = {
  title: 'TAPISSERIE — The Marketplace for AP × Swatch',
  description: 'Buy, sell and trade the upcoming AP × Swatch collection securely. Get early access to the most anticipated drop of 2026.',
  keywords: 'AP x Swatch, Audemars Piguet Swatch, luxury watch marketplace, Royal Oak, watch resale, watch collector',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://tapisserie.app'),
  openGraph: {
    title: 'TAPISSERIE — The Marketplace for AP × Swatch',
    description: 'The trusted marketplace for the new AP × Swatch collection. Secure escrow, verified sellers, transparent fees.',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'TAPISSERIE — AP × Swatch Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TAPISSERIE — The Marketplace for AP × Swatch',
    description: 'Buy, sell and trade the AP × Swatch collection securely.',
    images: [OG_IMAGE],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster theme="dark" position="top-center" />
      </body>
    </html>
  )
}
