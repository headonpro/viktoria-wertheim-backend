"use client"

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconMail, IconPhone, IconMapPin, IconUser, IconBuilding, IconFileText } from '@tabler/icons-react'
import Image from "next/image"

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function ImpressumPage() {
  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
          
          {/* Einleitung */}
          <AnimatedSection delay={0.1}>
            <div className="text-center mb-6 md:mb-8">
              <Image 
                src="/viktorialogo.png" 
                alt="Viktoria Wertheim Logo"
                width={80}
                height={80}
                className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 drop-shadow-lg"
                priority
              />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Impressum
              </h1>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4 text-sm md:text-base">
                Rechtliche Angaben gemäß § 5 TMG für die Website des SV Viktoria Wertheim
              </p>
            </div>
          </AnimatedSection>

          {/* Angaben gemäß § 5 TMG */}
          <AnimatedSection delay={0.2}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Angaben gemäß § 5 TMG
                </h3>
              </div>
              <div className="p-6 space-y-4 text-gray-700 dark:text-gray-200 relative z-10">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Vereinsname:</h4>
                  <p>SV Viktoria Wertheim</p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Anschrift:</h4>
                  <p>
                    Haslocher Weg 85<br/>
                    97877 Wertheim
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Vorstand */}
          <AnimatedSection delay={0.3}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Vertreten durch die gleichberechtigten Vorsitzenden
                </h3>
              </div>
              <div className="p-6 space-y-4 text-gray-700 dark:text-gray-200 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">1. Vorsitzender:</h4>
                    <p>Fabian Väthjeder</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">2. Vorsitzender:</h4>
                    <p>Christian Först</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Schatzmeister:</h4>
                    <p>Tobias Mittag</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Spielausschußvorsitzender:</h4>
                    <p>Kevin Niedens</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Jugendleiter:</h4>
                    <p>Christian Först</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Schriftführer:</h4>
                    <p>Eduard Helfenstein</p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Kontakt */}
          <AnimatedSection delay={0.4}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Kontakt
                </h3>
              </div>
              <div className="p-6 relative z-10">
                <div className="flex items-center space-x-3">
                  <IconMail className="text-gray-600 dark:text-gray-400" size={20} />
                  <span className="text-gray-700 dark:text-gray-200">E-Mail: 
                    <a href="mailto:info@viktoria-wertheim.de" className="text-gray-800 dark:text-gray-100 hover:underline ml-1">
                      info@viktoria-wertheim.de
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Vereinsregister */}
          <AnimatedSection delay={0.5}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Eintragung im Vereinsregister
                </h3>
              </div>
              <div className="p-6 space-y-3 text-gray-700 dark:text-gray-200 relative z-10">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Registergericht:</span>
                  <span className="ml-2">Amtsgericht Wertheim</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Registernummer:</span>
                  <span className="ml-2">306</span>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Verantwortlich für den Inhalt */}
          <AnimatedSection delay={0.6}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 relative z-10">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Spielberichte:</h4>
                  <p>
                    Gregor Scheurich<br/>
                    Lange Str. 44<br/>
                    97877 Wertheim
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Disclaimer */}
          <AnimatedSection delay={0.7}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Disclaimer
                </h3>
              </div>
              <div className="p-6 text-gray-700 dark:text-gray-200 text-sm leading-relaxed space-y-4 relative z-10">
                <p>
                  Inhalt und Werke dieser Website sind urheberrechtlich geschützt. Trotz höchster Sorgfalt kann nicht für die Richtigkeit der wiedergegebenen Informationen oder die permanente technische Erreichbarkeit garantiert werden.
                </p>
                <p>
                  Es wird keine Haftung für den Inhalt von extern verlinkten Websites übernommen. Auf deren Inhalte haben wir keinen Einfluss und distanzieren uns ausdrücklich.
                </p>
                <p>
                  Sollten Sie dennoch etwas an unseren Seiten zu beanstanden haben, bitten wir um einen einfachen entsprechenden Hinweis, damit wir die Inhalte schnellstmöglich entfernen können.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                  Quelle: Impressum-Generator von anwalt.de speziell für Eingetragener Verein (e.V.).
                </p>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
}