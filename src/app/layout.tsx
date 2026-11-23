import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import '@/styles/tokens.css'
import '@/styles/globals.css'

const serif = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})
const sans = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-sans', display: 'swap' })

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
const TITLE = 'SIRR — bir iç seyir'
const DESCRIPTION =
  'Doğa, zaman ve benlik üzerinden altı bölümlük bir iç yolculuk: uyanış, yaratılış, nefs, zaman, sükûn ve dönüş.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  ...(SITE ? { metadataBase: new URL(SITE), alternates: { canonical: '/' } } : {}),
  // social previews need an absolute image URL: only emitted when the public site URL is known
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    title: TITLE,
    description: DESCRIPTION,
    ...(SITE ? { images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Alacakaranlıkta bir göl ve tek bir ağaç' }] } : {}),
  },
  twitter: { card: SITE ? 'summary_large_image' : 'summary', title: TITLE, description: DESCRIPTION, ...(SITE ? { images: ['/og.jpg'] } : {}) },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = { themeColor: '#15130f', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
