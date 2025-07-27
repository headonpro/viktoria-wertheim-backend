'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconShirt, IconTrophy, IconUsers, IconClock } from '@tabler/icons-react'

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

export default function ShopPage() {
  return (
    <PageLayout>
      {/* Header Section - nur Mobile */}
      

        {/* Coming Soon Banner - Glassmorphism Styling */}
        <AnimatedSection className="px-4 pt-12 md:pt-8 pb-4" delay={0.2}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 p-6 text-center">
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center shadow-md">
                      <IconShirt size={24} className="text-viktoria-blue" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                        Unser Shop kommt bald! 🛠️
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Wir werkeln gerade fleißig an unserem Online-Shop.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Produktkategorien - Modern Grid */}
        <AnimatedSection className="px-4 py-6" delay={0.3}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                Das wird&apos;s bald geben
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unsere kommenden Produktkategorien</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {/* Trikots */}
              <AnimatedDiv 
                className="group relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px) transition-all duration-300 p-5"
                delay={0.4}
              >
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconShirt size={24} className="text-viktoria-yellow" />
                  </div>
                  <h4 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">Trikots & Teamwear</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Heim- und Auswärtstrikots, Trainingshosen, Jacken
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 dark:text-viktoria-yellow/70 font-medium">
                    Coming Soon
                  </div>
                </div>
              </AnimatedDiv>

              {/* Fanartikel */}
              <AnimatedDiv 
                className="group relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px) transition-all duration-300 p-5"
                delay={0.5}
              >
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconTrophy size={24} className="text-viktoria-yellow" />
                  </div>
                  <h4 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">Fanartikel</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Schals, Mützen, Tassen, Schlüsselanhänger
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 dark:text-viktoria-yellow/70 font-medium">
                    Coming Soon
                  </div>
                </div>
              </AnimatedDiv>

              {/* Mitgliedschaft */}
              <AnimatedDiv 
                className="group relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:transform hover:translateY(-2px) transition-all duration-300 p-5"
                delay={0.6}
              >
                <div className="text-center relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconUsers size={24} className="text-viktoria-yellow" />
                  </div>
                  <h4 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">Mitgliedschaft</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    Online Mitglied werden und Teil der Familie sein
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 dark:text-viktoria-yellow/70 font-medium">
                    Coming Soon
                  </div>
                </div>
              </AnimatedDiv>
            </div>
          </div>
        </AnimatedSection>



        {/* Newsletter Signup - Standard Card Styling */}
        <AnimatedSection className="px-4 py-6" delay={0.8}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="max-w-md mx-auto">
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 p-6 text-center">
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconClock size={20} className="text-viktoria-blue" />
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">Shop-News</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                    Erfahrt als Erste, wann unser Shop online geht!
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="eure.email@beispiel.de"
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.15] rounded-lg focus:outline-none focus:ring-2 focus:ring-viktoria-yellow dark:focus:ring-viktoria-yellow bg-white/90 dark:bg-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                    />
                    <button className="px-4 py-2 bg-viktoria-yellow text-viktoria-blue hover:bg-viktoria-yellow/80 dark:bg-viktoria-yellow dark:hover:bg-viktoria-yellow/80 dark:text-viktoria-blue text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm shadow-viktoria-yellow/20">
                      ✓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
    </PageLayout>
  )
} 