'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import PageLayout from '@/components/PageLayout'
import GameCards from '@/components/GameCards'
import LeagueTable from '@/components/LeagueTable'
import NewsModal from '@/components/NewsModal'
import NewsTicker from '@/components/NewsTicker'
import TeamStatus from '@/components/TeamStatus'
import SponsorShowcase from '@/components/SponsorShowcase'
import NewsCarousel from '@/components/NewsCarousel'

import { IconClock, IconTrophy } from '@tabler/icons-react'
import { NewsArtikel, Spieler } from '@/types/strapi'
import { strapi } from '@/lib/strapi'
import Image from 'next/image'

// Dynamic Import für animierte Komponenten - löst SSR-Probleme
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

// Mock data als stabile Konstanten außerhalb der Komponente
const mockTopScorers: Spieler[] = [
  {
    id: 1,
    attributes: {
      position: 'sturm',
      rueckennummer: 9,
      tore_saison: 19,
      spiele_saison: 16,
      mitglied: {
        data: {
          id: 1,
          attributes: {
            vorname: 'Okan',
            nachname: 'Cirakoglu',
            email: 'okan@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  },
  {
    id: 2,
    attributes: {
      position: 'sturm',
      rueckennummer: 10,
      tore_saison: 12,
      spiele_saison: 14,
      mitglied: {
        data: {
          id: 2,
          attributes: {
            vorname: 'Max',
            nachname: 'Mustermann',
            email: 'max@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  },
  {
    id: 3,
    attributes: {
      position: 'mittelfeld',
      rueckennummer: 8,
      tore_saison: 5,
      spiele_saison: 12,
      mitglied: {
        data: {
          id: 3,
          attributes: {
            vorname: 'Lukas',
            nachname: 'Beispiel',
            email: 'lukas@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  },
  {
    id: 4,
    attributes: {
      position: 'sturm',
      rueckennummer: 11,
      tore_saison: 7,
      spiele_saison: 10,
      mitglied: {
        data: {
          id: 4,
          attributes: {
            vorname: 'Jonas',
            nachname: 'Test',
            email: 'jonas@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  },
  {
    id: 5,
    attributes: {
      position: 'mittelfeld',
      rueckennummer: 6,
      tore_saison: 3,
      spiele_saison: 8,
      mitglied: {
        data: {
          id: 5,
          attributes: {
            vorname: 'Paul',
            nachname: 'Demo',
            email: 'paul@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  }
]

const mockNewsArticles: NewsArtikel[] = [
  {
    id: 1,
    attributes: {
      titel: "Viktoria Wertheim gewinnt Derby mit 3:1",
      inhalt: "Ein spannendes Spiel endete mit einem verdienten Sieg für unsere Mannschaft gegen FC Eichel. Die Tore fielen durch Okan Cirakoglu (2x) und Marco Schneider. Das Team zeigte eine starke Leistung vor heimischem Publikum.\n\nBereits in der 15. Minute ging Viktoria Wertheim durch einen Treffer von Okan Cirakoglu in Führung. Der Stürmer nutzte eine Flanke von der rechten Seite perfekt aus. FC Eichel kam zwar zum Ausgleich, aber die Antwort ließ nicht lange auf sich warten.\n\nIn der zweiten Halbzeit dominierte Viktoria das Spiel und belohnte sich mit zwei weiteren Treffern. Besonders die Defensive stand sicher und ließ kaum Chancen zu.",
      datum: "2025-01-16T10:00:00.000Z",
      kategorie: {
        data: {
          attributes: {
            name: "Spielberichte"
          }
        }
      },
      publishedAt: "2025-01-17T12:00:00.000Z",
      createdAt: "2025-01-17T12:00:00.000Z",
      updatedAt: "2025-01-17T12:00:00.000Z"
    }
  },
  {
    id: 2,
    attributes: {
      titel: "Neuer Trainer für die Jugend verpflichtet",
      inhalt: "Mit Marco Schneider konnte ein erfahrener Trainer für unsere A-Jugend gewonnen werden. Der 42-jährige bringt jahrelange Erfahrung im Nachwuchsbereich mit.\n\nSchneider war zuletzt beim TSV Tauberbischofsheim tätig und führte dort die A-Jugend zum Aufstieg in die Bezirksliga. Seine Philosophie: 'Jeder Spieler soll individuell gefördert werden, aber der Teamgedanke steht immer im Vordergrund.'\n\nDie erste Trainingseinheit ist für den 15. Januar geplant. Alle Spieler der A-Jugend sind herzlich eingeladen.",
      datum: "2025-01-15T08:00:00.000Z",
      kategorie: {
        data: {
          attributes: {
            name: "Vereinsnews"
          }
        }
      },
      publishedAt: "2025-01-17T12:00:00.000Z",
      createdAt: "2025-01-17T12:00:00.000Z",
      updatedAt: "2025-01-17T12:00:00.000Z"
    }
  },
  {
    id: 3,
    attributes: {
      titel: "Winterpause: Training startet am 15. Januar",
      inhalt: "Nach der wohlverdienten Winterpause beginnt das Training für alle Mannschaften wieder am 15. Januar. Die Vorbereitung auf die Rückrunde startet mit einem Fitnesstest.\n\nTrainer Hans Müller hat bereits einen detaillierten Trainingsplan erstellt: 'Wir werden sowohl an der Kondition als auch an der Taktik arbeiten. Die Winterpause war wichtig, aber jetzt geht es wieder richtig los.'\n\nDas erste Testspiel ist für den 25. Januar gegen den SV Königshofen geplant. Alle Fans sind herzlich eingeladen.",
      datum: "2025-01-14T14:00:00.000Z",
      kategorie: {
        data: {
          attributes: {
            name: "Training"
          }
        }
      },
      publishedAt: "2025-01-17T12:00:00.000Z",
      createdAt: "2025-01-17T12:00:00.000Z",
      updatedAt: "2025-01-17T12:00:00.000Z"
    }
  }
]

export default function HomePage() {
  const [selectedArticle, setSelectedArticle] = useState<NewsArtikel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [topScorers, setTopScorers] = useState<Spieler[]>([])
  const [newsArticles, setNewsArticles] = useState<NewsArtikel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<'1' | '2' | '3'>('1')



  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch top scorers (sorted by goals)
        const [playersResponse, newsResponse] = await Promise.all([
          strapi.get('/spielers', {
            params: {
              populate: {
                mitglied: true,
                mannschaft: true
              },
              sort: 'tore_saison:desc',
              pagination: {
                limit: 5
              }
            }
          }),
          strapi.get('/news-artikels', {
            params: {
              populate: '*', // Strapi 5 format
              sort: ['datum:desc'],
              pagination: {
                limit: 3
              }
            }
          })
        ])

        // Use API data if available, otherwise use mock data
        const apiPlayers = playersResponse.data.data || []
        const apiNews = newsResponse.data.data || []
        setTopScorers(apiPlayers.length > 0 ? apiPlayers : mockTopScorers)
        setNewsArticles(apiNews.length > 0 ? apiNews : mockNewsArticles)
      } catch (err) {
        console.error('Error fetching homepage data, using mock data:', err)
        // Use mock data as fallback
        setTopScorers(mockTopScorers)
        setNewsArticles(mockNewsArticles)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const openModal = (article: NewsArtikel) => {
    setSelectedArticle(article)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedArticle(null)
  }

  return (
    <PageLayout>
      <div className="space-y-6 md:space-y-8 lg:space-y-10">
        {/* News Ticker Section */}
        <div className="mt-2 md:mt-0 lg:px-0">
          <div className="lg:max-w-5xl lg:mx-auto">
            <NewsTicker onNewsClick={openModal} />
          </div>
        </div>

        {/* Team Status Section */}
        <AnimatedSection className="px-4 md:px-6 lg:px-0 py-2 md:py-3" delay={0.1}>
          <div className="lg:max-w-5xl lg:mx-auto">
            <TeamStatus 
              selectedTeam={selectedTeam} 
              onTeamChange={setSelectedTeam} 
            />
          </div>
        </AnimatedSection>
        {/* Game Cards Section */}
        <div className="px-4 md:px-6 lg:px-0">
          <AnimatedSection className="py-2 md:py-3" delay={0.15}>
            <div className="lg:max-w-5xl lg:mx-auto">
              <GameCards selectedTeam={selectedTeam} />
            </div>
          </AnimatedSection>
        </div>
        {/* League Table Section */}
        <div className="px-4 md:px-6 lg:px-0">
          <AnimatedSection className="py-2 md:py-3" delay={0.18}>
            <div className="lg:max-w-5xl lg:mx-auto">
              <LeagueTable selectedTeam={selectedTeam} />
            </div>
          </AnimatedSection>
        </div>
        {/* Top Scorers Section */}
        <div className="px-4 md:px-6">
          <AnimatedSection className="py-2 md:py-3" delay={0.2}>
            <div className="container max-w-4xl lg:max-w-5xl">
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                {/* Top Scorers Column */}
                <div>
                  <div
                    className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.08] overflow-hidden cursor-pointer hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08]"
                  >
                    {/* Title Header */}
                    <div className="px-4 md:px-8 py-3 md:py-4 text-center">
                      <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Torschützenkönig
                      </h2>
                    </div>
                    
                    {/* Header */}
                    <div className="px-4 md:px-6 py-3">
                      <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        <div className="col-span-1">#</div>
                        <div className="col-span-7">Spieler</div>
                        <div className="col-span-2 text-center">Spiele</div>
                        <div className="col-span-2 text-center font-bold">Tore</div>
                      </div>
                    </div>
                    {/* Top Scorers Content */}
                    <div className="py-2 md:py-3">
                      {/* Torschützenkönig - Modernes Design mit Hintergrundbild */}
                      <div className="holo-card relative overflow-hidden rounded-xl md:rounded-2xl transition-all duration-300 hover:shadow-xl md:hover:shadow-2xl cursor-pointer group h-full flex flex-col shadow-lg mb-2 md:mb-4">
                        {/* Overlay für Lesbarkeit - Header-Hintergrund */}
                        <div className="absolute inset-0 backdrop-blur-[0.5px] z-0 header-gradient"></div>

                        {/* Leichter Glow um den Spieler */}
                        <div className="absolute inset-0 z-5" style={{ background: 'radial-gradient(circle at center, rgba(254, 240, 138, 0.05) 0%, transparent 60%)' }}></div>

                        {/* Subtile Holo-Effekte */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-viktoria-yellow/8 to-transparent animate-shimmer-slow z-0"></div>

                        {/* Hintergrundbild */}
                        <div
                          className="absolute inset-0 bg-contain bg-center bg-no-repeat z-10"
                          style={{
                            backgroundImage: "url('/Okan_normal.png')",
                            filter: 'drop-shadow(4px 4px 12px rgba(0,0,0,0.6))'
                          }}
                        ></div>

                        <div className="relative z-20 px-4 md:px-6 py-4 md:py-6 flex-1 flex flex-col justify-center">
                          <div className="grid grid-cols-12 gap-2 md:gap-4 items-center mb-6 md:mb-8">
                            {/* Spieler Name */}
                            <div className="col-span-8">
                              <span className="text-white font-semibold text-2xl md:text-4xl leading-tight drop-shadow-2xl" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>
                                <span className="font-light">{topScorers[0]?.attributes.mitglied?.data?.attributes.vorname || 'Okan'}</span><br />
                                <span className="font-bold">{topScorers[0]?.attributes.mitglied?.data?.attributes.nachname || 'Cirakoglu'}</span>
                              </span>
                            </div>

                            {/* Spiele */}
                            <div className="col-span-2 text-center text-base md:text-lg text-viktoria-yellow font-medium drop-shadow">
                              {topScorers[0]?.attributes.spiele_saison || 16}
                            </div>

                            {/* Tore */}
                            <div className="col-span-2 text-center">
                              <span className="font-bold text-viktoria-yellow text-xl md:text-2xl drop-shadow-lg">
                                {topScorers[0]?.attributes.tore_saison || 19}
                              </span>
                            </div>
                          </div>

                          {/* Zusätzliche Stats - erweitert */}
                          <div className="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
                            <div className="text-center">
                              <div className="text-viktoria-yellow font-bold text-base md:text-lg drop-shadow">
                                {topScorers[0] ? (topScorers[0].attributes.tore_saison / topScorers[0].attributes.spiele_saison).toFixed(2) : '1.19'}
                              </div>
                              <div className="text-white/90 text-sm md:text-base drop-shadow">Tore/Spiel</div>
                            </div>
                            <div className="text-center">
                              <div className="text-viktoria-yellow font-bold text-base md:text-lg drop-shadow">
                                {topScorers[0]?.attributes.rueckennummer || 9}
                              </div>
                              <div className="text-white/90 text-sm md:text-base drop-shadow">
                                {topScorers[0]?.attributes.position || 'Stürmer'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Plätze 2-5 */}
                      {topScorers.slice(1).map((player, index) => (
                        <div key={player.id} className="px-4 md:px-6 py-1.5 md:py-2 transition-all duration-300 hover:bg-white/30 dark:hover:bg-viktoria-dark-lighter/30">
                          <div className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                            <div className="col-span-1 flex items-center">
                              <span className="font-bold text-sm md:text-lg text-gray-600 dark:text-gray-300">{index + 2}.</span>
                            </div>
                            <div className="col-span-7">
                              <span className="text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">
                                <span className="font-light">{player.attributes.mitglied?.data?.attributes.vorname}</span>{' '}
                                <span className="font-semibold">{player.attributes.mitglied?.data?.attributes.nachname}</span>
                              </span>
                            </div>
                            <div className="col-span-2 text-center text-sm md:text-base text-gray-600 dark:text-gray-300">
                              {player.attributes.spiele_saison}
                            </div>
                            <div className="col-span-2 text-center">
                              <span className="font-bold text-sm md:text-base text-gray-600 dark:text-gray-300">
                                {player.attributes.tore_saison}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Latest News Column - Desktop only */}
                <div className="hidden lg:block">
                  <NewsCarousel newsArticles={newsArticles} onNewsClick={openModal} isDesktopSidebar={true} />
                </div>

              </div>
            </div>
          </AnimatedSection>
        </div>
        
        {/* Latest News Section - Mobile/Tablet separate section */}
        <div className="px-4 md:px-6 lg:hidden">
          <AnimatedSection className="py-2 md:py-3" delay={0.25}>
            <div className="container max-w-6xl">
              <NewsCarousel newsArticles={newsArticles} onNewsClick={openModal} />
            </div>
          </AnimatedSection>
        </div>
        
        {/* Sponsors Section */}
        <div className="px-4 md:px-6 lg:px-0">
          <AnimatedSection className="py-2 md:py-3" delay={0.5}>
            <div className="container max-w-4xl lg:max-w-5xl lg:mx-auto">
              <SponsorShowcase />
            </div>
          </AnimatedSection>
        </div>
      </div>
      {/* News Modal */}
      <NewsModal
        article={selectedArticle}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </PageLayout>
  )
} 