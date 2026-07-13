import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'HaLand PetCare',
    template: '%s | HaLand PetCare',
  },
  description: 'Integrated pet clinic, hotel, and commerce platform',
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  applicationName: 'HaLand PetCare',
  keywords: ['pet clinic', 'pet hotel', 'inventory', 'pos'],
  openGraph: {
    title: 'HaLand PetCare',
    description: 'Integrated pet clinic, hotel, and commerce platform',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HaLand PetCare',
    description: 'Integrated pet clinic, hotel, and commerce platform',
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
