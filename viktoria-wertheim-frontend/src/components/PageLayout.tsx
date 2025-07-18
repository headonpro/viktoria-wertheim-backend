'use client'

import Header from '@/components/Header'
import MobileNav from '@/components/MobileNav'
import Footer from '@/components/Footer'

interface PageLayoutProps {
  children: React.ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen transition-colors duration-300 bg-gray-50 text-gray-900 dark:bg-[#020205] dark:text-white">
      <Header />
      <main className="pt-[140px] md:pt-[85px] pb-6">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </div>
  )
} 