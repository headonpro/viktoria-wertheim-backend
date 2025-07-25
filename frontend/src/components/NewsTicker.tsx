'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { NewsArtikel } from '@/types/strapi'
import { strapi } from '@/lib/strapi'

interface NewsTickerProps {
  onNewsClick?: (article: NewsArtikel) => void
}



export default function NewsTicker({ onNewsClick }: NewsTickerProps) {
  const [newsArticles, setNewsArticles] = useState<NewsArtikel[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
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

  // Measure container width for animation calculations
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [newsArticles])



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

  // Prepare news items for display
  const newsItems = newsArticles
    .filter(article => {
      const titel = article.titel || (article.attributes && article.attributes.titel)
      return article && titel
    })
    .map(article => ({
      id: article.id,
      title: article.titel || article.attributes?.titel || '',
      article: article
    }))

  // For seamless scrolling: start from right (100%) and move to left (-100%)
  // This creates the classic news ticker effect: right to left

  return (
    <div
      className="w-full bg-transparent relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-4 py-2 md:py-3 pb-3 md:pb-4 relative">
        <div className="flex items-center">
          {/* Kompaktes News Label */}
          <div className="flex-shrink-0 mr-2">
            <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl w-10 h-6 rounded-md overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-md before:p-0.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[2px] after:rounded-[calc(0.375rem-2px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-viktoria-yellow rounded-full animate-pulse shadow-md shadow-viktoria-yellow/40 ring-1 ring-viktoria-yellow/20 relative z-10"></div>
            </div>
          </div>

          {/* Scrolling News Container with Framer Motion */}
          <div ref={containerRef} className="flex-1 overflow-hidden relative mr-12 md:mr-14">
            <motion.div
              className="flex cursor-pointer whitespace-nowrap"
              animate={{
                x: isPaused ? undefined : ["100%", "-100%"]
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 10, // Adjust speed here
                  ease: "linear",
                },
              }}
              onClick={() => onNewsClick?.(newsItems[0]?.article)}
            >
              {/* Single continuous string with separators */}
              <span className="text-gray-600 dark:text-gray-300 hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors duration-300 text-sm md:text-base font-medium flex-shrink-0">
                {newsItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        onNewsClick?.(item.article)
                      }}
                    >
                      {item.title}
                    </span>
                    {index < newsItems.length - 1 && (
                      <span className="text-viktoria-yellow mx-8">|</span>
                    )}
                  </React.Fragment>
                ))}
                {/* Add separator and repeat for seamless loop */}
                <span className="text-viktoria-yellow mx-8">|</span>
                {newsItems.map((item, index) => (
                  <React.Fragment key={`repeat-${item.id}`}>
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        onNewsClick?.(item.article)
                      }}
                    >
                      {item.title}
                    </span>
                    {index < newsItems.length - 1 && (
                      <span className="text-viktoria-yellow mx-8">|</span>
                    )}
                  </React.Fragment>
                ))}
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
} 