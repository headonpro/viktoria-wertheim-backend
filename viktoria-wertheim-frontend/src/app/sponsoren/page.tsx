'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconBuildingStore, IconHeart, IconTrophy, IconMail, IconPhone, IconStar, IconGift } from '@tabler/icons-react'
import Image from "next/image";

// Dynamic Import für animierte Komponenten
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
      {/* Header Section - nur Mobile */}
      

      <main className="pt-8 pb-6">
        <div className="container space-y-8">
          
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
              <h2 className="text-xl font-bold text-viktoria-blue mb-4">
                Unsere wertvollen Partner
              </h2>
              <p className="text-gray-700 leading-relaxed px-4">
                Ohne unsere Sponsoren wäre der Vereinssport nicht möglich. 
                Wir sind stolz auf die langjährigen Partnerschaften und bedanken 
                uns für die Unterstützung.
              </p>
            </div>
          </AnimatedSection>

          {/* Aktuelle Sponsoren */}
          <AnimatedSection delay={0.3}>
            <div>
              <h2 className="text-lg font-bold text-viktoria-blue mb-6 text-center">
                Unsere aktuellen Sponsoren
              </h2>
              <div className="space-y-4">
                {sponsors.map((sponsor, index) => (
                  <AnimatedDiv 
                    key={index} 
                    delay={0.4 + index * 0.1}
                    className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 p-6 hover:bg-white/50 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="font-bold text-viktoria-blue text-lg">
                            {sponsor.name}
                          </h3>
                          <span className={`${getCategoryColor(sponsor.category)} text-xs font-bold px-2 py-1 rounded-full`}>
                            {sponsor.category}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed mb-3">
                          {sponsor.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span>Partner seit {sponsor.since}</span>
                          {sponsor.website && (
                            <a 
                              href={sponsor.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-viktoria-blue hover:text-viktoria-blue-light transition-colors"
                            >
                              Zur Website →
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {sponsor.benefits.map((benefit, benefitIndex) => (
                            <span 
                              key={benefitIndex}
                              className="bg-viktoria-blue/10 text-viktoria-blue text-xs px-2 py-1 rounded"
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
              <h2 className="text-lg font-bold text-viktoria-blue mb-6 text-center">
                Werden Sie unser Partner!
              </h2>
              <div className="space-y-4">
                {sponsoringPackages.map((pkg, index) => (
                  <AnimatedDiv 
                    key={index} 
                    delay={0.9 + index * 0.1}
                    className={`relative bg-white/40 backdrop-blur-sm rounded-xl border-2 border-white/20 p-6 hover:bg-white/50 transition-all duration-300 ${
                      pkg.popular ? 'ring-2 ring-viktoria-yellow/50' : ''
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-viktoria-yellow text-viktoria-blue text-xs font-bold px-3 py-1 rounded-full">
                          BELIEBT
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      {/* Icon & Price */}
                      <div className="flex-shrink-0 text-center">
                        <div className={`${getPackageColorClasses(pkg.color)} p-3 rounded-lg mb-2`}>
                          <pkg.icon size={24} />
                        </div>
                        <div className="text-sm font-bold text-viktoria-blue">
                          {pkg.price}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h3 className="font-bold text-viktoria-blue text-lg mb-2">
                          {pkg.name}
                        </h3>
                        <p className="text-gray-700 text-sm leading-relaxed mb-4">
                          {pkg.description}
                        </p>
                        
                        {/* Benefits */}
                        <div>
                          <h4 className="font-semibold text-gray-800 text-sm mb-2">Leistungen:</h4>
                          <ul className="grid grid-cols-1 gap-1">
                            {pkg.benefits.map((benefit, benefitIndex) => (
                              <li key={benefitIndex} className="flex items-start space-x-2 text-sm text-gray-700">
                                <span className="text-green-600 mt-0.5">✓</span>
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
            <div className="bg-gradient-to-r from-viktoria-blue-light to-viktoria-blue rounded-xl p-6 text-white text-center">
              <IconGift className="text-viktoria-yellow mx-auto mb-4" size={48} />
              <h2 className="text-xl font-bold text-viktoria-yellow mb-4">
                Warum Viktoria sponsern?
              </h2>
              <p className="text-white/90 mb-6 leading-relaxed">
                Als Sponsor unterstützen Sie nicht nur den Sport, sondern investieren 
                in die Gemeinschaft. Profitieren Sie von der positiven Ausstrahlung 
                und der regionalen Verbundenheit unseres Vereins.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-viktoria-yellow">250+</div>
                  <div className="text-xs text-white/80">Mitglieder</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-viktoria-yellow">1000+</div>
                  <div className="text-xs text-white/80">Fans</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-viktoria-yellow">20+</div>
                  <div className="text-xs text-white/80">Heimspiele/Jahr</div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Kontakt für Sponsoring */}
          <AnimatedSection delay={1.5}>
            <div className="bg-viktoria-yellow/20 rounded-xl p-6 text-center">
              <h2 className="text-lg font-bold text-viktoria-blue mb-4">
                Interesse an einer Partnerschaft?
              </h2>
              <p className="text-gray-700 mb-6 text-sm leading-relaxed">
                Gerne erstellen wir Ihnen ein individuelles Sponsoring-Angebot. 
                Kontaktieren Sie unseren Vorstand für ein persönliches Gespräch.
              </p>
              <div className="grid grid-cols-1 gap-3">
                <a 
                  href="mailto:vorsitzender@viktoria-wertheim.de?subject=Sponsoring-Anfrage"
                  className="bg-viktoria-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-viktoria-blue-light transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <IconMail size={20} />
                  <span>E-Mail senden</span>
                </a>
                <a 
                  href="tel:09342123456"
                  className="bg-viktoria-yellow text-viktoria-blue px-6 py-3 rounded-lg font-semibold hover:bg-viktoria-yellow/90 transition-colors duration-300 flex items-center justify-center space-x-2"
                >
                  <IconPhone size={20} />
                  <span>(09342) 123-456</span>
                </a>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </main>
    </PageLayout>
  )
} 