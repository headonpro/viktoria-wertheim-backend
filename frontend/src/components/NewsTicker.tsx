'use client'

import React, { useState, useEffect } from 'react'
import { NewsArtikel } from '@/types/strapi'
import { strapi } from '@/lib/strapi'
import DarkModeToggle from '@/components/DarkModeToggle'

interface NewsTickerProps {
  onNewsClick?: (article: NewsArtikel) => void
}



export default function NewsTicker({ onNewsClick }: NewsTickerProps) {
  const [newsArticles, setNewsArticles] = useState<NewsArtikel[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  // Fetch news from API
  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        const response = await strapi.get('/news-artikels', {
          params: {
            populate: {
              kategorie: true
            },
            sort: 'datum:desc',
            pagination: {
              limit: 10
            }
          }
        })

        const apiNews = response.data.data || []
        setNewsArticles(apiNews)
      } catch (err) {
        setNewsArticles([])
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])



  if (loading) {
    return (
      <div className="w-full bg-transparent">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200 mr-4 flex items-center justify-center">
              <div className="w-2 h-2 bg-viktoria-yellow rounded-full animate-pulse"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-3 bg-gray-300 rounded w-48"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (newsArticles.length === 0) {
    return (
      <div className="w-full bg-transparent">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center">
            <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200 mr-4 flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
            <span className="text-gray-500 text-sm">Keine aktuellen Nachrichten verfügbar</span>
          </div>
        </div>
      </div>
    )
  }

  // Kombiniere alle News-Titel zu einem langen String mit gelben Separatoren
  const baseNewsText = newsArticles
    .filter(article => {
      // Handle both API format and legacy format
      const titel = article.titel || (article.attributes && article.attributes.titel)
      return article && titel
    })
    .map(article => {
      // Handle both API format and legacy format
      return article.titel || article.attributes?.titel
    })
    .join('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0|\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')



  // Erstelle News-Elemente mit gelben Separatoren für die Anzeige
  const createNewsContent = (text: string) => {
    const parts = text.split('|')
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < parts.length - 1 && (
          <span className="text-viktoria-yellow">|</span>
        )}
      </React.Fragment>
    ))
  }

  return (
    <div
      className="w-full bg-transparent relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-4 py-2 md:py-3 pb-6 md:pb-8 relative">
        <div className="flex items-center">
          {/* Kompaktes News Label */}
          <div className="flex-shrink-0 mr-4">
            <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md text-gray-600 dark:text-gray-300 w-10 h-6 rounded-md border border-white/40 dark:border-white/[0.03] shadow-lg shadow-black/15 dark:shadow-white/[0.20] flex items-center justify-center">
              <div className="w-2 h-2 bg-viktoria-yellow rounded-full animate-pulse shadow-lg shadow-viktoria-yellow/50 animate-glow-pulse"></div>
            </div>
          </div>

          {/* Scrolling News Container */}
          <div className="flex-1 overflow-hidden relative">
            <div
              className="cursor-pointer animate-scroll"
              onClick={() => onNewsClick?.(newsArticles[0])}
              style={{
                display: 'flex',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              {/* Langer Text mit mehrfachen Wiederholungen */}
              <span className="text-gray-600 dark:text-gray-300 hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors duration-300 text-sm font-medium whitespace-nowrap flex-shrink-0">
                {createNewsContent(`${baseNewsText} | ${baseNewsText} | ${baseNewsText}`)}
              </span>
            </div>
          </div>



          {/* CSS Animation */}
          <style jsx>{`
            @keyframes scroll-seamless {
              0% {
                transform: translateX(100%);
              }
              100% {
                transform: translateX(-100%);
              }
            }
            .animate-scroll {
              animation: scroll-seamless 15s linear infinite;
            }
          `}</style>
        </div>
      </div>
    </div>
  )
} 