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
        <AnimatedSection className="px-4 pt-6 pb-4" delay={0.2}>
          <div className="container lg:max-w-5xl lg:mx-auto">
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-r from-viktoria-yellow/10 to-viktoria-blue/10 border border-viktoria-yellow/30 rounded-2xl p-6 text-center shadow-lg">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center shadow-md">
                    <IconShirt size={24} className="text-viktoria-blue" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-viktoria-blue">
                      Unser Shop kommt bald! 🛠️
                    </h2>
                    <p className="text-gray-600 text-sm">
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
              <h2 className="text-xl md:text-2xl font-semibold text-viktoria-blue mb-2">
                Das wird&apos;s bald geben
              </h2>
              <p className="text-gray-500 text-sm">Unsere kommenden Produktkategorien</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {/* Trikots */}
              <AnimatedDiv 
                className="group bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-white/40 hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
                delay={0.4}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconShirt size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Trikots & Teamwear</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Heim- und Auswärtstrikots, Trainingshosen, Jacken
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 font-medium">
                    Coming Soon
                  </div>
                </div>
              </AnimatedDiv>

              {/* Fanartikel */}
              <AnimatedDiv 
                className="group bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-white/40 hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
                delay={0.5}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconTrophy size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Fanartikel</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Schals, Mützen, Tassen, Schlüsselanhänger
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 font-medium">
                    Coming Soon
                  </div>
                </div>
              </AnimatedDiv>

              {/* Mitgliedschaft */}
              <AnimatedDiv 
                className="group bg-white/70 backdrop-blur-sm rounded-xl p-5 border border-white/40 hover:bg-white/80 transition-all duration-300 shadow-lg hover:shadow-xl"
                delay={0.6}
              >
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-viktoria-blue to-viktoria-blue-light rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform duration-300">
                    <IconUsers size={24} className="text-viktoria-yellow" />
                  </div>
                  <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Mitgliedschaft</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Online Mitglied werden und Teil der Familie sein
                  </p>
                  <div className="mt-3 text-xs text-viktoria-blue/70 font-medium">
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
              <div className="bg-gradient-to-r from-viktoria-blue/5 to-viktoria-yellow/5 rounded-xl p-6 border border-viktoria-blue/20 text-center">
                <div className="w-12 h-12 bg-viktoria-yellow rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconClock size={20} className="text-viktoria-blue" />
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Shop-News</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Erfahrt als Erste, wann unser Shop online geht!
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="eure.email@beispiel.de"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-viktoria-blue-light bg-white/90"
                  />
                  <button className="px-4 py-2 bg-viktoria-blue text-white text-sm font-medium rounded-lg hover:bg-viktoria-blue-light transition-colors">
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