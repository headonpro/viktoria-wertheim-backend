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
import DarkModeToggle from '@/components/DarkModeToggle'

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

        // Fetch news only - spielerstatistiks endpoint was removed in backend simplification
        const [newsResponse] = await Promise.all([
          strapi.get('/news-artikels', {
            params: {
              populate: '*', // Strapi 5 format
              sort: 'datum:desc',
              'pagination[limit]': 3
            }
          })
        ])

        // Use API data for news, fallback data for players since spielerstatistiks was removed
        const apiNews = newsResponse.data.data || []
        
        // Use empty array for top scorers since the API was removed
        console.warn('HomePage: spielerstatistiks API was removed - TopScorers component will handle its own data')
        setTopScorers([])
        setNewsArticles(apiNews)
      } catch (err) {
        console.error('Error fetching homepage data:', err)
        // Show empty state
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
          <div className="lg:max-w-5xl lg:mx-auto relative">
            <NewsTicker onNewsClick={openModal} />
            
            {/* Dark Mode Toggle - Always visible */}
            <div className="absolute top-2 md:top-3 right-4 z-10">
              <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl px-2 py-1 rounded-md overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-md before:p-0.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[2px] after:rounded-[calc(0.375rem-2px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
                <div className="relative z-10">
                  <DarkModeToggle />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Status Section */}
        <AnimatedSection className="px-4 md:px-6 lg:px-0 py-2 md:py-3 mt-3 md:-mt-2" delay={0.1}>
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
