import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '../components/Navbar';

export const metadata: Metadata = {
  title: 'LifeLink — Healthcare Inventory Sharing',
  description:
    'Real-time inventory-sharing mesh connecting rural clinics, blood banks, and transport fleets.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-neutral-300 min-h-screen flex flex-col antialiased selection:bg-neutral-800 selection:text-neutral-100">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="w-full border-t border-neutral-800/80 py-6 px-6 text-xs text-neutral-500 bg-[#0a0a0a]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
              <span className="text-neutral-400">
                LifeLink • Navi Mumbai & Mumbai Pilot
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-500 text-xs">
              <span>Offline 2G Ready</span>
              <span>•</span>
              <span>Low-Bandwidth Optimized</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
