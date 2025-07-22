'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconBuildingStore, IconHeart, IconTrophy, IconMail, IconPhone, IconStar, IconGift } from '@tabler/icons-react'
import Image from "next/image"

// Dynamic Import für animierte Komponenten - löst SSR-Probleme
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

interface Sponsor {
  name: string
  category: 'Hauptsponsor' | 'Premium' | 'Gold' | 'Silber' | 'Partner'
  description: string
  website?: string
  since: string
  benefits: string[]
}

interface SponsoringPackage {
  name: string
  price: string
  description: string
  benefits: string[]
  icon: any
  color: string
  popular?: boolean
}

export default function SponsorsPage() {
  const sponsors: Sponsor[] = [
    {
      name: 'Stadtwerke Wertheim',
      category: 'Hauptsponsor',
      description: 'Unser langjähriger Hauptpartner unterstützt uns seit über 15 Jahren in allen Bereichen.',
      website: 'https://stadtwerke-wertheim.de',
      since: '2009',
      benefits: ['Trikotsponsoring', 'Stadionwerbung', 'Eventunterstützung']
    },
    {
      name: 'Autohaus Müller GmbH',
      category: 'Premium',
      description: 'Das lokale Autohaus ist stolzer Partner unserer 1. Mannschaft.',
      website: 'https://autohaus-mueller-wertheim.de',
      since: '2018',
      benefits: ['Bandenwerbung', 'Fahrzeugstellung', 'Trikotärmel']
    },
    {
      name: 'Bäckerei Schmidt',
      category: 'Gold',
      description: 'Die traditionelle Bäckerei versorgt unsere Mannschaften mit frischen Backwaren.',
      since: '2020',
      benefits: ['Cateringpartner', 'Stadionwerbung']
    },
    {
      name: 'Sparkasse Tauberfranken',
      category: 'Gold',
      description: 'Als regionale Bank unterstützt die Sparkasse unsere Jugendarbeit.',
      website: 'https://sparkasse-tauberfranken.de',
      since: '2015',
      benefits: ['Jugendförderung', 'Stadionwerbung']
    },
    {
      name: 'Restaurant Zur Krone',
      category: 'Silber',
      description: 'Das beliebte Restaurant ist Partner für unsere Vereinsveranstaltungen.',
      since: '2019',
      benefits: ['Eventpartner', 'Cateringservice']
    },
    {
      name: 'Zahnarztpraxis Dr. Weber',
      category: 'Partner',
      description: 'Gesundheitspartner für unsere Spieler und Mitglieder.',
      since: '2021',
      benefits: ['Gesundheitspartner', 'Vereinsrabatte']
    }
  ]

  const sponsoringPackages: SponsoringPackage[] = [
    {
      name: 'Hauptsponsor',
      price: 'ab 2.500€/Jahr',
      description: 'Premium-Partnerschaft mit maximaler Sichtbarkeit und exklusiven Vorteilen',
      benefits: [
        'Logo auf Trikots (Brust)',
        'Stadionwerbung (4 Banden)',
        'Erwähnung in Vereinsmedien',
        'VIP-Bereich bei Heimspielen',
        'Eventpartnerschaft',
        'Exklusive Branchenrechte'
      ],
      icon: IconStar,
      color: 'viktoria-yellow',
      popular: true
    },
    {
      name: 'Premium-Partner',
      price: 'ab 1.500€/Jahr',
      description: 'Hochwertige Partnerschaft mit starker Präsenz im Vereinsumfeld',
      benefits: [
        'Logo auf Trikots (Ärmel)',
        'Stadionwerbung (2 Banden)',
        'Website-Verlinkung',
        'Einladungen zu Events',
        'Social Media Erwähnungen',
        'Vereinsrabatte'
      ],
      icon: IconTrophy,
      color: 'viktoria-blue'
    },
    {
      name: 'Gold-Partner',
      price: 'ab 800€/Jahr',
      description: 'Solide Partnerschaft mit guter Sichtbarkeit für mittelständische Unternehmen',
      benefits: [
        'Stadionwerbung (1 Bande)',
        'Logo auf Vereinskleidung',
        'Website-Verlinkung',
        'Newsletter-Erwähnungen',
        'Ticketkontingent',
        'Vereinsveranstaltungen'
      ],
      icon: IconBuildingStore,
      color: 'orange-600'
    },
    {
      name: 'Silber-Partner',
      price: 'ab 400€/Jahr',
      description: 'Einstiegsmöglichkeit für lokale Unternehmen und Handwerker',
      benefits: [
        'Logo im Stadionprogramm',
        'Website-Auflistung',
        'Social Media Posts',
        'Vereinsrabatte',
        'Saisonkarten-Ermäßigung'
      ],
      icon: IconHeart,
      color: 'gray-600'
    }
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Hauptsponsor': return 'bg-viktoria-yellow text-viktoria-blue'
      case 'Premium': return 'bg-viktoria-blue text-white'
      case 'Gold': return 'bg-orange-500 text-white'
      case 'Silber': return 'bg-gray-500 text-white'
      case 'Partner': return 'bg-green-600 text-white'
      default: return 'bg-gray-400 text-white'
    }
  }

  const getPackageColorClasses = (color: string) => {
    switch (color) {
      case 'viktoria-yellow': return 'text-viktoria-yellow bg-viktoria-yellow/10 border-viktoria-yellow'
      case 'viktoria-blue': return 'text-viktoria-blue bg-viktoria-blue/10 border-viktoria-blue'
      case 'orange-600': return 'text-orange-600 bg-orange-100 border-orange-600'
      case 'gray-600': return 'text-gray-600 bg-gray-100 border-gray-600'
      default: return 'text-gray-600 bg-gray-100 border-gray-600'
    }
  }

  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
          
          {/* Einleitung */}
          <AnimatedSection delay={0.2}>
            <div className="text-center mb-8">
              <Image 
                src="/viktorialogo.png" 
                alt="Viktoria Wertheim Logo"
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 drop-shadow-lg"
                priority
              />
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Unsere wertvollen Partner
              </h1>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed px-4 text-sm md:text-base">
                Ohne unsere Sponsoren wäre der Vereinssport nicht möglich. 
                Wir sind stolz auf die langjährigen Partnerschaften und bedanken 
                uns für die Unterstützung.
              </p>
            </div>
          </AnimatedSection>

          {/* Aktuelle Sponsoren */}
          <AnimatedSection delay={0.3}>
            <div>
              <div className="px-8 md:px-12 py-6 md:py-8 text-center mb-6">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Unsere aktuellen Sponsoren
                </h2>
              </div>
              <div className="space-y-4">
                {sponsors.map((sponsor, index) => (
                  <AnimatedDiv 
                    key={index} 
                    delay={0.4 + index * 0.1}
                    className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">
                            {sponsor.name}
                          </h3>
                          <span className={`${getCategoryColor(sponsor.category)} text-xs font-bold px-2 py-1 rounded-full`}>
                            {sponsor.category}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                          {sponsor.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span>Partner seit {sponsor.since}</span>
                          {sponsor.website && (
                            <a 
                              href={sponsor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                              Zur Website →
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sponsor.benefits.map((benefit, benefitIndex) => (
                            <span 
                              key={benefitIndex}
                              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded"
                            >
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AnimatedDiv>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Sponsoring-Pakete */}
          <AnimatedSection delay={0.8}>
            <div>
              <div className="px-8 md:px-12 py-6 md:py-8 text-center mb-6">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Werden Sie unser Partner!
                </h2>
              </div>
              <div className="space-y-4">
                {sponsoringPackages.map((pkg, index) => (
                  <AnimatedDiv 
                    key={index} 
                    delay={0.9 + index * 0.1}
                    className="relative bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold px-3 py-1 rounded-full">
                          BELIEBT
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      {/* Icon & Price */}
                      <div className="flex-shrink-0 text-center">
                        <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 p-3 rounded-lg mb-2">
                          <pkg.icon size={24} />
                        </div>
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                          {pkg.price}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-2">
                          {pkg.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                          {pkg.description}
                        </p>
                        
                        {/* Benefits */}
                        <div>
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-2">Leistungen:</h4>
                          <ul className="grid grid-cols-1 gap-1">
                            {pkg.benefits.map((benefit, benefitIndex) => (
                              <li key={benefitIndex} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                <span className="text-gray-600 dark:text-gray-400 mt-0.5">✓</span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </AnimatedDiv>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Warum Sponsor werden */}
          <AnimatedSection delay={1.4}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 text-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <IconGift className="text-gray-600 dark:text-gray-400 mx-auto mb-4" size={48} />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Warum Viktoria sponsern?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                Als Sponsor unterstützen Sie nicht nur den Sport, sondern investieren 
                in die Gemeinschaft. Profitieren Sie von der positiven Ausstrahlung 
                und der regionalen Verbundenheit unseres Vereins.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">250+</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Mitglieder</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">1000+</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Fans</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">20+</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">Heimspiele/Jahr</div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Kontakt für Sponsoring */}
          <AnimatedSection delay={1.5}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 text-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Interesse an einer Partnerschaft?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                Gerne erstellen wir Ihnen ein individuelles Sponsoring-Angebot. 
                Kontaktieren Sie unseren Vorstand für ein persönliches Gespräch.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <a 
                  href="mailto:vorsitzender@viktoria-wertheim.de?subject=Sponsoring-Anfrage"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <IconMail size={20} />
                  <span>E-Mail senden</span>
                </a>
                <a 
                  href="tel:09342123456"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <IconPhone size={20} />
                  <span>(09342) 123-456</span>
                </a>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
} 