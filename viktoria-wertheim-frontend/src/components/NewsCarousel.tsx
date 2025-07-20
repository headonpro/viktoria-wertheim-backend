'use client'

import React, { useRef } from 'react'
import Image from 'next/image'
import { IconClock, IconTrophy } from '@tabler/icons-react'
import { NewsArtikel } from '@/types/strapi'

interface NewsCarouselProps {
  newsArticles: NewsArtikel[]
  onNewsClick: (article: NewsArtikel) => void
  isDesktopSidebar?: boolean
}

export default function NewsCarousel({ newsArticles, onNewsClick, isDesktopSidebar = false }: NewsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Desktop sidebar version - vertical list layout
  if (isDesktopSidebar) {
    return (
      <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.03] overflow-hidden cursor-pointer hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-2xl hover:shadow-3xl shadow-black/20 hover:shadow-black/30 dark:shadow-white/[0.25] dark:hover:shadow-white/[0.35]">
        {/* Title Header */}
        <div className="px-8 md:px-12 py-6 md:py-8 text-center">
          <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            Neueste Nachrichten
          </h2>
        </div>
        
        <div className="pb-6 md:pb-8">
          {newsArticles
            .filter(article => {
              const titel = article.titel || (article.attributes && article.attributes.titel)
              const datum = article.datum || (article.attributes && article.attributes.datum)
              return article && titel && datum
            })
            .slice(0, 3)
            .map((article) => {
              const datum = article.datum || (article.attributes && article.attributes.datum)
              const titel = article.titel || (article.attributes && article.attributes.titel)
              const inhalt = article.inhalt || (article.attributes && article.attributes.inhalt)
              const kategorie = article.kategorie || (article.attributes && article.attributes.kategorie)
              const titelbild = article.titelbild || (article.attributes && article.attributes.titelbild)
              
              let imageUrl: string | null = null
              if (titelbild) {
                imageUrl = titelbild.data?.attributes?.url ||
                          (titelbild as any).url ||
                          (titelbild as any).attributes?.url ||
                          (titelbild as any).data?.url
              }

              const timeAgo = datum ? new Date(datum).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'short'
              }) : 'Unbekannt'

              const categoryName = (kategorie?.data?.attributes?.name) || 'News'

              return (
                <div
                  key={article.id}
                  className="px-4 md:px-6 py-3 md:py-4 transition-all duration-300 hover:bg-white/30 cursor-pointer group"
                  onClick={() => onNewsClick(article)}
                >
                  <div className="flex gap-4 md:gap-5">
                    {/* Image - Fixed aspect ratio 8:5 for consistency */}
                    <div className="relative w-32 md:w-40 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue" style={{ aspectRatio: '8/5' }}>
                      {imageUrl ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${imageUrl}`}
                          alt={titel || 'News Artikel'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          style={{ objectPosition: 'top center' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-viktoria-yellow/20 rounded-full flex items-center justify-center mx-auto mb-1">
                              <IconTrophy className="w-4 h-4 md:w-6 md:h-6 text-viktoria-yellow" />
                            </div>
                            <p className="text-xs text-viktoria-yellow/80">SV Viktoria</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Category and Date - Category left, Date right */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-viktoria-yellow text-gray-800 text-xs px-2 py-0.5 rounded-full font-medium">
                          {categoryName}
                        </span>
                        <div className="flex items-center text-xs text-gray-500">
                          <IconClock className="w-3 h-3 mr-1" />
                          <span>{timeAgo}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:text-base mb-2 line-clamp-2 leading-tight group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow transition-colors">
                        {titel}
                      </h3>

                      {/* Content Preview */}
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-snug">
                        {(() => {
                          if (typeof inhalt === 'string' && inhalt.length > 0) {
                            const cleanContent = inhalt.replace(/\n+/g, ' ').trim()
                            return cleanContent.length > 120
                              ? cleanContent.substring(0, 120) + '...'
                              : cleanContent
                          }
                          if (Array.isArray(inhalt)) {
                            const textContent = inhalt
                              .map(block => {
                                if (block.children && Array.isArray(block.children)) {
                                  return block.children.map(child => child.text || '').join('')
                                }
                                return ''
                              })
                              .join(' ')
                              .trim()
                            return textContent.length > 120
                              ? textContent.substring(0, 120) + '...'
                              : textContent || 'Artikel lesen...'
                          }
                          return 'Artikel lesen...'
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  // Mobile/tablet version - horizontal carousel
  return (
    <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.03] shadow-2xl shadow-black/20 dark:shadow-white/[0.25] p-8 md:p-12">
      {/* Title Header */}
      <div className="mb-6 md:mb-8">
        <div className="text-center">
          <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            Neueste Nachrichten
          </h2>
        </div>
      </div>

      {/* Horizontal Scrollable News Container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto scrollbar-hide gap-4 scroll-smooth"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          paddingLeft: 'calc(50vw - 50% - 8rem)',
          paddingRight: 'calc(50vw - 50% - 8rem)'
        }}
      >
        {newsArticles
          .filter(article => {
            const titel = article.titel || (article.attributes && article.attributes.titel)
            const datum = article.datum || (article.attributes && article.attributes.datum)
            return article && titel && datum
          })
          .map((article, index) => {
            const datum = article.datum || (article.attributes && article.attributes.datum)
            const titel = article.titel || (article.attributes && article.attributes.titel)
            const inhalt = article.inhalt || (article.attributes && article.attributes.inhalt)
            const kategorie = article.kategorie || (article.attributes && article.attributes.kategorie)
            const titelbild = article.titelbild || (article.attributes && article.attributes.titelbild)
            
            let imageUrl: string | null = null
            if (titelbild) {
              imageUrl = titelbild.data?.attributes?.url ||
                        (titelbild as any).url ||
                        (titelbild as any).attributes?.url ||
                        (titelbild as any).data?.url
            }

            const timeAgo = datum ? new Date(datum).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: 'short'
            }) : 'Unbekannt'

            const categoryName = (kategorie?.data?.attributes?.name) || 'News'

            return (
              <div
                key={article.id}
                className={`flex-shrink-0 w-56 sm:w-64 md:w-72 lg:w-80 bg-white/10 dark:bg-white/[0.02] rounded-lg overflow-hidden cursor-pointer hover:bg-white/20 dark:hover:bg-white/[0.05] transition-all duration-300 group border border-white/20 dark:border-white/[0.05] ${
                  index === 0 ? 'ml-[25vw] md:ml-0' : ''
                }`}
                onClick={() => onNewsClick(article)}
              >
                {/* Image */}
                <div className="relative w-full h-48 md:h-56 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue">
                  {imageUrl ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${imageUrl}`}
                      alt={titel || 'News Artikel'}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ objectPosition: 'center' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-viktoria-yellow/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <IconTrophy className="w-6 h-6 md:w-8 md:h-8 text-viktoria-yellow" />
                        </div>
                        <p className="text-sm text-viktoria-yellow/80 font-medium">SV Viktoria</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-viktoria-yellow text-gray-800 text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                      {categoryName}
                    </span>
                  </div>

                  {/* Date Badge */}
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                      <IconClock className="w-3 h-3 mr-1" />
                      <span>{timeAgo}</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 md:p-5">
                  {/* Title */}
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-base md:text-lg mb-3 line-clamp-2 leading-tight group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow transition-colors">
                    {titel}
                  </h3>

                  {/* Content Preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-snug">
                    {(() => {
                      if (typeof inhalt === 'string' && inhalt.length > 0) {
                        const cleanContent = inhalt.replace(/\n+/g, ' ').trim()
                        return cleanContent.length > 150
                          ? cleanContent.substring(0, 150) + '...'
                          : cleanContent
                      }
                      if (Array.isArray(inhalt)) {
                        const textContent = inhalt
                          .map(block => {
                            if (block.children && Array.isArray(block.children)) {
                              return block.children.map(child => child.text || '').join('')
                            }
                            return ''
                          })
                          .join(' ')
                          .trim()
                        return textContent.length > 150
                          ? textContent.substring(0, 150) + '...'
                          : textContent || 'Artikel lesen...'
                      }
                      return 'Artikel lesen...'
                    })()}
                  </p>

                  {/* Read More Indicator */}
                  <div className="mt-3 pt-3 border-t border-white/10 dark:border-white/[0.05]">
                    <span className="text-xs text-viktoria-blue dark:text-viktoria-yellow font-medium group-hover:underline">
                      Weiterlesen →
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}