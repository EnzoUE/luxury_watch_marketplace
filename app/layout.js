import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'TAPISSERIE — The Marketplace for AP x Swatch',
  description: 'Buy, sell and trade the upcoming AP x Swatch collection securely. Get early access to the most anticipated drop of 2026.',
  keywords: 'AP x Swatch, Audemars Piguet Swatch, luxury watch marketplace, Royal Oak, watch resale',
  openGraph: {
    title: 'TAPISSERIE — The Marketplace for AP x Swatch',
    description: 'The trusted marketplace for the new AP x Swatch collection.',
    type: 'website',
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
