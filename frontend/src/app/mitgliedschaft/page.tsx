"use client"

import PageLayout from '@/components/PageLayout'
import AnimatedSection from '@/components/AnimatedSection'
import { IconUsers, IconTrophy, IconHeart, IconCheck, IconMail, IconPhone, IconCalendar, IconMapPin, IconStar } from '@tabler/icons-react'

export default function MitgliedschaftPage() {
  return (
    <PageLayout>
      <div className="px-4 md:px-6 lg:px-0">
        <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto space-y-6 md:space-y-8">
          
          {/* Einleitung */}
          <AnimatedSection delay={0.1}>
            <div className="text-center mb-6 md:mb-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <IconUsers size={32} className="text-gray-600 dark:text-gray-400" />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                Werde Teil der Viktoria-Familie!
              </h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm md:text-base">
                Entdecke die Freude am Fußball beim SV Viktoria Wertheim. 
                Als Mitglied unseres Vereins kannst du aktiv mitspielen, trainieren und Teil unserer Gemeinschaft werden.
              </p>
            </div>
          </AnimatedSection>

          {/* Mitgliedschaft Info */}
          <AnimatedSection delay={0.2}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Vereinsmitgliedschaft
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconUsers className="text-gray-600 dark:text-gray-400" size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Aktive Mitgliedschaft</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                  Als Mitglied des SV Viktoria Wertheim erhältst du die Möglichkeit, aktiv am Vereinsleben teilzunehmen, 
                  zu trainieren und in unseren Mannschaften zu spielen.
                </p>
                
                <div className="rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Was bietet dir die Mitgliedschaft?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Regelmäßiges Training</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Spielberechtigung</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Vereinsgemeinschaft</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Vereinsveranstaltungen</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Professionelle Betreuung</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <IconCheck className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={16} />
                      <span className="text-gray-600 dark:text-gray-400">Sportliche Entwicklung</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Training & Spielbetrieb */}
          <AnimatedSection delay={0.3}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Training & Spielbetrieb
                </h2>
              </div>
              <div className="p-6 space-y-4 text-gray-600 dark:text-gray-400 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Trainingszeiten</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <IconCalendar size={16} className="text-gray-600 dark:text-gray-400" />
                        <span>Dienstag: 19:00 - 20:30 Uhr</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IconCalendar size={16} className="text-gray-600 dark:text-gray-400" />
                        <span>Donnerstag: 19:00 - 20:30 Uhr</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IconCalendar size={16} className="text-gray-600 dark:text-gray-400" />
                        <span>Samstag: 15:00 - 16:30 Uhr</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Unser Sportplatz</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <IconMapPin size={16} className="text-gray-600 dark:text-gray-400" />
                        <span>Haslocher Weg 85</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <IconMapPin size={16} className="text-gray-600 dark:text-gray-400" />
                        <span>97877 Wertheim-Bestenheid</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Moderner Rasenplatz mit Vereinsheim und Umkleidekabinen
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Für wen ist die Mitgliedschaft geeignet?</h3>
                  <p className="text-sm leading-relaxed">
                    Unsere Mitgliedschaft richtet sich an alle fußballbegeisterten Menschen, die gerne in einer Mannschaft spielen möchten. 
                    Egal ob Anfänger oder erfahrener Spieler – bei uns findest du deinen Platz im Team.
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Warum Viktoria Wertheim */}
          <AnimatedSection delay={0.4}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Warum SV Viktoria Wertheim?
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IconUsers className="text-gray-600 dark:text-gray-400" size={24} />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Gemeinschaft</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Werde Teil einer großen Familie mit über 75 Jahren Vereinstradition
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IconTrophy className="text-gray-600 dark:text-gray-400" size={24} />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Erfolg</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Erreiche deine sportlichen Ziele in einem ambitionierten Verein
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IconHeart className="text-gray-600 dark:text-gray-400" size={24} />
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Leidenschaft</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      Lebe deine Begeisterung für den Fußball mit Gleichgesinnten
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Mitglied werden */}
          <AnimatedSection delay={0.5}>
            <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-6 text-center transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <IconStar className="text-gray-600 dark:text-gray-400" size={28} />
              </div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Bereit für den ersten Schritt?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                Komm einfach zu einem unserer Trainings vorbei oder kontaktiere uns für weitere Informationen. 
                Ein Probetraining ist jederzeit möglich!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href="mailto:info@viktoria-wertheim.de"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center space-x-2 text-sm"
                >
                  <IconMail size={18} />
                  <span>E-Mail senden</span>
                </a>
                <a 
                  href="tel:+4993421234567"
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 flex items-center justify-center space-x-2 text-sm"
                >
                  <IconPhone size={18} />
                  <span>Anrufen</span>
                </a>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                Oder komm einfach zu einem Training vorbei – wir freuen uns auf dich!
              </p>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
}