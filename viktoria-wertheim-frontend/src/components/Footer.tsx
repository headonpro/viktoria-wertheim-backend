'use client'

import dynamic from 'next/dynamic'
import { IconStar } from '@tabler/icons-react'
import Image from "next/image";

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function Footer() {
  return (
    <AnimatedSection
      className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-transparent dark:to-transparent dark:bg-white/[0.02] text-white dark:text-white py-8 md:py-12 px-4"
      delay={0.7}
    >
      <div className="container">
        <div className="text-center mb-12">
          <Image 
            src="/viktorialogo.png" 
            alt="Viktoria Wertheim Logo"
            width={80}
            height={80}
            className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-6 drop-shadow-lg"
            priority
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            SV Viktoria Wertheim
          </h1>
          <div className="flex items-center justify-center space-x-2 text-viktoria-yellow">
            <IconStar size={20} fill="currentColor" />
            <span className="font-semibold">Seit 1945</span>
            <IconStar size={20} fill="currentColor" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-10">
          {/* Kontakt */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-4 text-viktoria-yellow">
              Kontakt
            </h3>
            <div className="space-y-2 text-sm text-white/80 dark:text-gray-300">
              <p>Sportplatz Wertheim</p>
              <p>Sportstraße 1</p>
              <p>97877 Wertheim</p>
              <p>Tel: (09342) 123-456</p>
              <p>Email: info@viktoria-wertheim.de</p>
            </div>
          </div>

          {/* Verein */}
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-4 text-viktoria-yellow">
              Verein
            </h3>
            <div className="space-y-2 text-sm text-white/80 dark:text-gray-300">
              <a href="/ueber-uns" className="block hover:text-viktoria-yellow transition-colors">Über uns</a>
              <a href="/vorstand" className="block hover:text-viktoria-yellow transition-colors">Vorstand</a>
              <a href="/mitgliedschaft" className="block hover:text-viktoria-yellow transition-colors">Mitgliedschaft</a>
              <a href="/sponsoren" className="block hover:text-viktoria-yellow transition-colors">Sponsoren</a>
            </div>
          </div>

          {/* Rechtliches */}
          <div className="text-center md:text-right">
            <h3 className="text-lg font-semibold mb-4 text-viktoria-yellow">
              Rechtliches
            </h3>
            <div className="space-y-2 text-sm text-white/80 dark:text-gray-300">
              <a href="/impressum" className="block hover:text-viktoria-yellow transition-colors">Impressum</a>
              <a href="/datenschutz" className="block hover:text-viktoria-yellow transition-colors">Datenschutz</a>
              <a href="/agb" className="block hover:text-viktoria-yellow transition-colors">AGB</a>
              <a href="/satzung" className="block hover:text-viktoria-yellow transition-colors">Satzung</a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 dark:border-white/[0.1] pt-6 text-center">
          <p className="text-sm text-white/80 dark:text-gray-300">
            © 2024 SV Viktoria Wertheim. Alle Rechte vorbehalten.
          </p>
          <p className="text-xs text-white/60 dark:text-gray-400 mt-2">
            Tradition • Leidenschaft • Gemeinschaft
          </p>
        </div>
      </div>
    </AnimatedSection>
  )
} 