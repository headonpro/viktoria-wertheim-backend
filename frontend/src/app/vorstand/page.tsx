'use client'

import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconUser, IconMail, IconPhone, IconUsers, IconTrophy, IconShield, IconCoin } from '@tabler/icons-react'
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

interface BoardMember {
  name: string
  position: string
  description: string
  email?: string
  phone?: string
  icon: any
  color: string
}

export default function BoardPage() {
  const boardMembers: BoardMember[] = [
    {
      name: 'Fabian Väthjeder',
      position: '1. Vorsitzender',
      description: 'Leitung des Vereins, Vertretung nach außen, strategische Ausrichtung und Koordination aller Vereinsaktivitäten.',
      email: 'vorsitzender@viktoria-wertheim.de',
      phone: '09342 123-456',
      icon: IconUsers,
      color: 'viktoria-blue'
    },
    {
      name: 'Maria Schmidt',
      position: '2. Vorsitzende',
      description: 'Stellvertretung, Jugendarbeit und Koordination der Nachwuchsmannschaften sowie Organisation von Vereinsveranstaltungen.',
      email: 'stellv.vorsitzende@viktoria-wertheim.de',
      phone: '09342 123-457',
      icon: IconUser,
      color: 'viktoria-yellow'
    },
    {
      name: 'Peter Wagner',
      position: 'Kassenwart',
      description: 'Verwaltung der Vereinsfinanzen, Buchführung, Beitragsverwaltung und finanzielle Planung des Vereins.',
      email: 'kasse@viktoria-wertheim.de',
      phone: '09342 123-458',
      icon: IconCoin,
      color: 'green-600'
    },
    {
      name: 'Andrea Klein',
      position: 'Schriftführerin',
      description: 'Protokollführung bei Versammlungen, Korrespondenz und Verwaltung der Vereinsdokumente.',
      email: 'schriftfuehrung@viktoria-wertheim.de',
      icon: IconShield,
      color: 'purple-600'
    },
    {
      name: 'Michael Bauer',
      position: 'Sportwart',
      description: 'Organisation des Spielbetriebs, Koordination mit dem Verband und Betreuung der Mannschaften.',
      email: 'sport@viktoria-wertheim.de',
      phone: '09342 123-459',
      icon: IconTrophy,
      color: 'orange-600'
    },
    {
      name: 'Sabine Fischer',
      position: 'Jugendleiterin',
      description: 'Leitung der Jugendarbeit, Koordination der Nachwuchstrainer und Organisation von Jugendturnieren.',
      email: 'jugend@viktoria-wertheim.de',
      icon: IconUsers,
      color: 'pink-600'
    }
  ]

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
                Unser Vorstandsteam
              </h1>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed px-4 text-sm md:text-base">
                Die ehrenamtliche Vereinsführung arbeitet mit Leidenschaft und Engagement 
                für den Erfolg und die Weiterentwicklung von Viktoria Wertheim.
              </p>
            </div>
          </AnimatedSection>

          {/* Vorstandsmitglieder */}
          <AnimatedSection delay={0.2}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Vorstandsmitglieder
                </h3>
              </div>
              <div className="p-6 space-y-4 relative z-10">
                {boardMembers.map((member, index) => (
                  <AnimatedDiv 
                    key={index} 
                    delay={0.3 + index * 0.1}
                    className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl border border-white/60 dark:border-white/[0.1] p-6 hover:bg-gray-100/60 dark:hover:bg-white/[0.08] transition-all duration-300 shadow-sm hover:shadow-md hover:transform hover:translateY(-1px)"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Icon */}
                      <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 p-3 rounded-lg flex-shrink-0">
                        <member.icon size={24} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg mb-1">
                          {member.name}
                        </h4>
                        <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                          {member.position}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                          {member.description}
                        </p>
                        
                        {/* Kontakt */}
                        <div className="space-y-2">
                          {member.email && (
                            <a 
                              href={`mailto:${member.email}`}
                              className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                              <IconMail size={16} />
                              <span>{member.email}</span>
                            </a>
                          )}
                          {member.phone && (
                            <a 
                              href={`tel:${member.phone}`}
                              className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                              <IconPhone size={16} />
                              <span>{member.phone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimatedDiv>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Ehrenamt Info */}
          <AnimatedSection delay={0.3}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Ehrenamtliches Engagement
                </h3>
              </div>
              <div className="p-6 text-center relative z-10">
                <IconUsers className="text-gray-600 dark:text-gray-400 mx-auto mb-4" size={48} />
                <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
                  Unser gesamter Vorstand arbeitet ehrenamtlich und investiert seine Freizeit 
                  für den Verein. Wir sind stolz auf das große Engagement und den Zusammenhalt 
                  in unserem Vorstandsteam.
                </p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">6</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Vorstandsmitglieder</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">100%</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Ehrenamtlich</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">24/7</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Für den Verein</div>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Allgemeine Kontaktinfo */}
          <AnimatedSection delay={0.4}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Allgemeine Kontaktinformationen
                </h3>
              </div>
              <div className="p-6 space-y-3 relative z-10">
                <div className="flex items-center justify-center space-x-2">
                  <IconMail className="text-gray-600 dark:text-gray-400" size={20} />
                  <a 
                    href="mailto:info@viktoria-wertheim.de"
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                  >
                    info@viktoria-wertheim.de
                  </a>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <IconPhone className="text-gray-600 dark:text-gray-400" size={20} />
                  <a 
                    href="tel:09342123456"
                    className="text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 transition-colors font-medium"
                  >
                    (09342) 123-456
                  </a>
                </div>
              </div>
            </div>
          </AnimatedSection>

          {/* Interesse am Vorstand */}
          <AnimatedSection delay={0.5}>
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)">
              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                  Interesse am Vorstand?
                </h3>
              </div>
              <div className="p-6 text-center relative z-10">
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                  Sie möchten sich ehrenamtlich für unseren Verein engagieren? 
                  Wir freuen uns immer über neue Mitstreiter im Vorstandsteam!
                </p>
                <a 
                  href="/kontakt" 
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-300 inline-block"
                >
                  Jetzt Kontakt aufnehmen
                </a>
              </div>
            </div>
          </AnimatedSection>

        </div>
      </div>
    </PageLayout>
  )
} 