'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import PageLayout from '@/components/PageLayout'
import GameCards from '@/components/GameCards'
import LeagueTable from '@/components/LeagueTable'
import TopScorers from '@/components/TopScorers'
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



export default function HomePage() {
  const [selectedArticle, setSelectedArticle] = useState<NewsArtikel | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [topScorers, setTopScorers] = useState<Spieler[]>([])
  const [newsArticles, setNewsArticles] = useState<NewsArtikel[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<'1' | '2' | '3'>('1')

  // Team names mapping - memoized to prevent re-renders
  const teamNames = useMemo(() => ({
    '1': '1. Mannschaft',
    '2': '2. Mannschaft',
    '3': '3. Mannschaft'
  }), [])



  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Get team name for filtering
        const selectedTeamName = teamNames[selectedTeam]

        // Fetch top scorers and news
        const [playersResponse, newsResponse] = await Promise.all([
          strapi.get('/spielerstatistiks', {
            params: {
              sort: 'tore:desc',
              'filters[tore][$gt]': 0,
              'pagination[limit]': 5,
              'populate[0]': 'spieler',
              'populate[1]': 'team',
              'populate[2]': 'saison'
            }
          }),
          strapi.get('/news-artikels', {
            params: {
              populate: '*', // Strapi 5 format
              sort: 'datum:desc',
              'pagination[limit]': 3
            }
          })
        ])

        // Use API data with fallback for missing player data
        const apiPlayers = playersResponse.data.data || []
        const apiNews = newsResponse.data.data || []
        
        // If no players found for selected team, show fallback message
        if (apiPlayers.length === 0 && process.env.NODE_ENV !== 'test') {
          console.warn(`No players found for team: ${selectedTeamName}`)
        }
        
        setTopScorers(apiPlayers)
        setNewsArticles(apiNews)
      } catch (err) {
        console.error('Error fetching homepage data:', err)
        // Show empty state with team context
        setTopScorers([])
        setNewsArticles([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTeam, teamNames]) // Add selectedTeam and teamNames as dependencies

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
      <div>
        {/* News Ticker Section */}
        <div className="mt-3 md:-mt-2 lg:px-0">
          <div className="lg:max-w-5xl lg:mx-auto">
            <NewsTicker onNewsClick={openModal} />
          </div>
        </div>

        {/* Team Status Section */}
        <AnimatedSection className="px-4 md:px-6 lg:px-0 py-2 md:py-3 -mt-4 md:-mt-6" delay={0.1}>
          <div className="lg:max-w-5xl lg:mx-auto">
            <TeamStatus 
              selectedTeam={selectedTeam} 
              onTeamChange={setSelectedTeam} 
            />
          </div>
        </AnimatedSection>
        {/* Game Cards Section */}
        <div className="px-4 md:px-6 lg:px-0 mt-4 md:mt-9 lg:mt-8">
          <AnimatedSection className="py-2 md:py-3" delay={0.15}>
            <div className="lg:max-w-5xl lg:mx-auto">
              <GameCards selectedTeam={selectedTeam} />
            </div>
          </AnimatedSection>
        </div>
        {/* League Table Section */}
        <div className="px-4 md:px-6 lg:px-0 mt-4 md:mt-9 lg:mt-8">
          <AnimatedSection className="py-2 md:py-3" delay={0.18}>
            <div className="lg:max-w-5xl lg:mx-auto">
              <LeagueTable selectedTeam={selectedTeam} />
            </div>
          </AnimatedSection>
        </div>
        {/* Top Scorers Section */}
        <div className="px-4 md:px-6 mt-4 md:mt-9 lg:mt-8">
          <AnimatedSection className="py-2 md:py-3" delay={0.2}>
            <div className="container max-w-4xl lg:max-w-5xl">
              <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                {/* Top Scorers Column */}
                <div>
                  <TopScorers />
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
        <div className="px-4 md:px-6 lg:hidden mt-4 md:mt-9 lg:mt-8">
          <AnimatedSection className="py-2 md:py-3" delay={0.25}>
            <div className="container max-w-6xl">
              <NewsCarousel newsArticles={newsArticles} onNewsClick={openModal} />
            </div>
          </AnimatedSection>
        </div>
        
        {/* Sponsors Section */}
        <div className="px-4 md:px-6 lg:px-0 mt-4 md:mt-9 lg:mt-8 pb-16 md:pb-24 lg:pb-32">
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
