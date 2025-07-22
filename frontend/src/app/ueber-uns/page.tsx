"use client"

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconUsers, IconTrophy, IconHeart, IconMapPin, IconCalendar, IconStar, IconHistory, IconGitMerge } from '@tabler/icons-react'
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

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
          
          {/* Vereinslogo und Einleitung */}
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
                SV Viktoria Wertheim
              </h1>
              <div className="flex items-center justify-center space-x-2 text-viktoria-yellow mb-6">
                <IconStar size={20} fill="currentColor" />
                <span className="font-semibold text-sm md:text-base">Seit 1945</span>
                <IconStar size={20} fill="currentColor" />
              </div>
            </div>
          </AnimatedSection>

          {/* Vereinsidentität */}
          <AnimatedSection delay={0.15}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Unsere Vereinsidentität
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Vereinsfarben</h3>
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-6 h-6 bg-viktoria-yellow rounded-full border-2 border-white shadow-sm"></div>
                        <div className="w-6 h-6 bg-viktoria-blue rounded-full border-2 border-white shadow-sm"></div>
                      </div>
                      <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">GELB-BLAU</span>
                    </div>
                  </div>
                  <div className="rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Vereinsadresse</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Haslocher Weg 85<br/>
                      97877 Wertheim-Bestenheid
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Vereinsgeschichte */}
          <AnimatedSection delay={0.2}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Unsere Geschichte
                </h2>
              </div>
              <div className="p-6 space-y-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                <p>
                  Mit einer Genehmigung durch die amerikanische Militärregierung wurde am <strong>15. Oktober 1945</strong> die <strong>SG Wertheim</strong> gegründet, aus der 1951 – durch eine Fusion mit dem SC 46 Eichel und dem SC 48 Wertheim – die <strong>Sportvereinigung (SV) Wertheim</strong> entstand.
                </p>
                <p>
                  Als die Fusion scheiterte, behielt der Fußballverein der Kernstadt Wertheim den Namen SV, während im Stadtteil Bestenheid im Jahre <strong>1952</strong> der <strong>SC Viktoria Wertheim</strong> gegründet wurde.
                </p>
              </div>
            </div>
          </AnimatedSection>

          {/* Sportliche Erfolge */}
          <AnimatedSection delay={0.3}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Sportliche Höhepunkte
                </h2>
              </div>
              <div className="p-6 space-y-4 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                <div className="rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Die goldenen Jahre (1960er)</h3>
                  <p>
                    Der SC Viktoria Wertheim spielte in den Jahren <strong>1964/65 in der 2. Amateurliga Nordbaden</strong> und nach einem Aufstieg <strong>1965/66 für ein Jahr in der 1. Amateurliga Nordbaden</strong>.
                  </p>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Bis zur Gründung der Oberliga Baden-Württemberg in der Saison 1978/79 war die 1. Amateurliga die oberste Amateurklasse und dritthöchste deutsche Spielklasse.
                  </p>
                </div>
                
                <div className="rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Moderne Erfolge</h3>
                  <p>
                    Die erste Fußballmannschaft spielte seit der Saison <strong>2013/14 für sechs Spielzeiten in der Landesliga Odenwald</strong>.
                  </p>
                  <p className="mt-2">
                    Am Ende der Saison 2018/19 stieg die SV Viktoria Wertheim als Viertletzter der Landesliga Odenwald in die Kreisliga Tauberbischofsheim ab, woraufhin die <strong>Meisterschaft der Kreisliga Tauberbischofsheim</strong> und somit der <strong>direkte Wiederaufstieg in die Landesliga Odenwald</strong> folgte.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Die Fusion */}
          <AnimatedSection delay={0.4}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Die Vereinigung im Jahr 2000
                </h2>
              </div>
              <div className="p-6 text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                <div className="rounded-lg p-4">
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Ein historischer Moment für den Wertheimer Fußball
                  </p>
                  <p>
                    Die beiden Clubs <strong>SV Wertheim</strong> und <strong>SC Viktoria Wertheim</strong> vereinigten sich im Jahr <strong>2000</strong> zur <strong>SV Viktoria Wertheim</strong>.
                  </p>
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                    Diese Fusion brachte die Fußballvereine der Kernstadt und des Stadtteils Bestenheid wieder zusammen und schuf die Grundlage für den heutigen Verein.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Tradition und Erfolge */}
          <AnimatedSection delay={0.5}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Tradition und Erfolge
                </h2>
              </div>
              <div className="p-6 text-gray-600 dark:text-gray-400 text-sm leading-relaxed space-y-4">
                <p>
                  In seiner Vereinsgeschichte kann der Verein schon auf viele gute Zeiten und Erfolge zurückblicken.
                </p>
                <div className="rounded-lg p-4">
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Vollständige Vereinsgeschichte
                  </p>
                  <p>
                    Auf dieser Seite wurden sowohl die Erfolge der <strong>SV Viktoria Wertheim seit ihrer Gründung</strong>, als auch die Erfolge der Vereine <strong>SC Viktoria Wertheim</strong> und <strong>SV Wertheim</strong> vor der Fusion im Jahre 2000 berücksichtigt!
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Zeitstrahl */}
          <AnimatedSection delay={0.6}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Wichtige Meilensteine
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-sm flex-shrink-0">
                      1945
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Gründung der SG Wertheim</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Genehmigung durch amerikanische Militärregierung</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-sm flex-shrink-0">
                      1952
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Gründung SC Viktoria Wertheim</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Neuer Verein in Bestenheid</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-sm flex-shrink-0">
                      1965
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">1. Amateurliga Nordbaden</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Höchste Spielklasse erreicht</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-sm flex-shrink-0">
                      2000
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Fusion zur SV Viktoria Wertheim</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Vereinigung beider Vereine</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Vereinsgelände */}
          <AnimatedSection delay={0.7}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Unser Sportplatz
                </h2>
              </div>
              <div className="p-6 space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <p className="leading-relaxed">
                  Unser Heimatstadion am Haslocher Weg 85 ist das Herz von Viktoria Wertheim. 
                  Hier trainieren unsere Mannschaften und hier finden unsere Heimspiele statt.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center">
                    <IconMapPin className="mr-2 text-gray-600 dark:text-gray-400" size={16} />
                    <span className="text-sm">Haslocher Weg 85, 97877 Wertheim-Bestenheid</span>
                  </div>
                  <div className="flex items-center">
                    <IconCalendar className="mr-2 text-gray-600 dark:text-gray-400" size={16} />
                    <span className="text-sm">Trainingszeiten: Di & Do ab 19:00 Uhr, Sa ab 15:00 Uhr</span>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Call to Action */}
          <AnimatedSection delay={0.8}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 text-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Werde Teil unserer Tradition!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                Ob als Spieler, Trainer, Schiedsrichter oder einfach als Fan – 
                bei Viktoria Wertheim ist jeder willkommen, der unsere Leidenschaft für den Fußball teilt.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <a 
                  href="/mitgliedschaft" 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 text-sm"
                >
                  Mitglied werden
                </a>
                <a 
                  href="/kontakt" 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 text-sm"
                >
                  Kontakt aufnehmen
                </a>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
}