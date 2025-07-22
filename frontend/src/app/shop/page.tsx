'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconShirt, IconTrophy, IconUsers, IconMail, IconPhone, IconMapPin, IconClock, IconBallFootball } from '@tabler/icons-react'

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
      

        {/* Coming Soon Banner - Kompakter */}
        <AnimatedSection className="px-4 pt-12 md:pt-8 pb-4" delay={0.2}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-viktoria-yellow/10 to-viktoria-blue/10 dark:from-viktoria-yellow/5 dark:to-viktoria-blue/5 border border-viktoria-yellow/30 dark:border-viktoria-yellow/20 rounded-2xl p-6 text-center shadow-lg dark:shadow-white/[0.05]">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center shadow-md">
                    <IconShirt size={24} className="text-viktoria-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-viktoria-blue dark:text-viktoria-yellow">
                      Unser Shop kommt bald! 🛠️
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                      Wir werkeln gerade fleißig an unserem Online-Shop.
                    </p>
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
              <h2 className="text-xl md:text-2xl font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-2">
                Das wird&apos;s bald geben
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Unsere kommenden Produktkategorien</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {/* Trikots */}
              <AnimatedDiv 
                className="group bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl p-5 border-2 border-white/80 dark:border-white/[0.15] hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
                delay={0.4}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconShirt size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-2">Trikots & Teamwear</h3>
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
                className="group bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl p-5 border-2 border-white/80 dark:border-white/[0.15] hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
                delay={0.5}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconTrophy size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-2">Fanartikel</h3>
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
                className="group bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl p-5 border-2 border-white/80 dark:border-white/[0.15] hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
                delay={0.6}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconUsers size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-2">Mitgliedschaft</h3>
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



        {/* Newsletter Signup - Bonus Section */}
        <AnimatedSection className="px-4 py-6" delay={0.8}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-r from-viktoria-blue/5 to-viktoria-yellow/5 dark:from-viktoria-blue/10 dark:to-viktoria-yellow/10 rounded-xl p-6 border border-viktoria-blue/20 dark:border-viktoria-blue/30 text-center shadow-lg dark:shadow-white/[0.05]">
                <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconClock size={20} className="text-viktoria-blue" />
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-2">Shop-News</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Erfahrt als Erste, wann unser Shop online geht!
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="eure.email@beispiel.de"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-white/[0.15] rounded-lg focus:outline-none focus:ring-2 focus:ring-viktoria-blue-light dark:focus:ring-viktoria-yellow bg-white/90 dark:bg-white/[0.08] text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <button className="px-4 py-2 bg-viktoria-blue hover:bg-viktoria-blue-light dark:bg-viktoria-yellow dark:hover:bg-viktoria-yellow/80 text-white dark:text-viktoria-blue text-sm font-medium rounded-lg transition-colors">
                    ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
    </PageLayout>
  )
} 