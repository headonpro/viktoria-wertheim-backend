'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconScale, IconDownload } from '@tabler/icons-react'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function SatzungPage() {
  return (
    <PageLayout>
      {/* Header Section - nur Mobile */}
      

      <main className="pt-8 pb-6">
        <div className="container space-y-8">
          
          <AnimatedSection delay={0.2}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="p-6">
                <h2 className="text-xl font-bold text-viktoria-blue dark:text-white mb-4 flex items-center">
                  <IconScale className="mr-3 text-viktoria-yellow" size={24} />
                  Vereinssatzung
                </h2>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed mb-6">
                  Die Satzung des SV Viktoria Wertheim e.V. regelt die Grundlagen unseres Vereinslebens, 
                  die Mitgliedschaft, die Organe des Vereins und deren Aufgaben.
                </p>
                
                <div className="text-center">
                  <a 
                    href="#"
                    className="bg-viktoria-blue dark:bg-viktoria-yellow text-white dark:text-viktoria-blue px-6 py-3 rounded-lg font-semibold hover:bg-viktoria-blue-light dark:hover:bg-viktoria-yellow/90 transition-colors duration-300 inline-flex items-center space-x-2"
                  >
                    <IconDownload size={20} />
                    <span>Satzung herunterladen (PDF)</span>
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </main>
    </PageLayout>
  )
} 