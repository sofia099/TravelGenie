import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'TravelGenie - AI Travel Assistant',
  description: 'Plan your perfect trip with AI. Search flights, discover hotels, and book travel instantly.',
  keywords: ['travel', 'AI', 'flights', 'hotels', 'booking', 'assistant'],
  authors: [{ name: 'TravelGenie' }],
  openGraph: {
    title: 'TravelGenie - AI Travel Assistant',
    description: 'Plan your perfect trip with AI',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} bg-[#0f172a] text-slate-200 min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
