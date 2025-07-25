'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { strapi } from '@/lib/strapi'
import Image from 'next/image'

interface Sponsor {
  id: number
  attributes: {
    name: string
    logo: {
      data: {
        attributes: {
          url: string
          alternativeText?: string
        }
      }
    }
    website_url?: string
    beschreibung?: string
    kategorie: 'hauptsponsor' | 'premium' | 'partner'
    reihenfolge: number
  }
}



export default function SponsorShowcase() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        setLoading(true)
        const response = await strapi.get('/sponsors', {
          params: {
            populate: '*',
            sort: 'reihenfolge:asc'
          }
        })

        const apiSponsors = response.data.data || []
        setSponsors(apiSponsors)
      } catch (error) {
        // API error - show empty state
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as any;
          if (axiosError.response?.status === 404) {
            console.log('Sponsors API endpoint not found (404)')
          } else if (axiosError.response?.status === 403) {
            console.log('Sponsors API access forbidden (403), check permissions in Strapi admin')
          } else {
            console.error('Error fetching sponsors:', axiosError.message || 'Unknown error')
          }
        } else {
          console.error('Error fetching sponsors:', error)
        }
        setSponsors([])
      } finally {
        setLoading(false)
      }
    }

    fetchSponsors()
  }, [])

  if (loading) {
    return (
      <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
        <div className="px-3 py-2 text-center border-b border-white/10">
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Unsere Partner
          </h2>
        </div>
        <div className="p-3 space-y-4">
          {/* Sponsor der Woche Loading */}
          <div className="bg-white/10 rounded-lg p-3 animate-pulse">
            <div className="h-3 bg-white/20 rounded w-24 mb-2"></div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-12 bg-white/20 rounded"></div>
              <div className="flex-1">
                <div className="h-3 bg-white/20 rounded mb-1"></div>
                <div className="h-2 bg-white/20 rounded w-3/4"></div>
              </div>
            </div>
          </div>
          {/* Horizontal Scroll Loading */}
          <div className="space-y-3">
            {[1, 2, 3].map((section) => (
              <div key={section}>
                <div className="h-3 bg-white/20 rounded w-20 mb-2 animate-pulse"></div>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex-shrink-0 w-16 bg-white/10 rounded-md p-2 animate-pulse">
                      <div className="h-6 bg-white/20 rounded mb-1"></div>
                      <div className="h-2 bg-white/20 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Kategorisiere Sponsoren
  const hauptsponsoren = sponsors.filter(s => s.attributes.kategorie === 'hauptsponsor')
  const premiumSponsoren = sponsors.filter(s => s.attributes.kategorie === 'premium')
  const partnerSponsoren = sponsors.filter(s => s.attributes.kategorie === 'partner')

  // Sponsor der Woche (rotiert wöchentlich)
  const getWeekOfYear = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const diff = now.getTime() - start.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 7))
  }

  const sponsorDerWoche = sponsors.length > 0 ? sponsors[getWeekOfYear() % sponsors.length] : null

  return (
    <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0">
      {/* Header */}
      <div className="px-8 md:px-12 py-4 md:py-6 text-center">
        <h2 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
          Unsere Partner
        </h2>
      </div>

      <div className="p-4 md:p-6 pt-0 md:pt-0 space-y-6">
        {/* Sponsor der Woche und Hauptsponsor nebeneinander */}
        <div className="rounded-lg p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-start justify-items-center max-w-4xl mx-auto">
            {/* Sponsor der Woche */}
            {sponsorDerWoche && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full md:ml-20"
              >
                <div className="text-center w-full max-w-xs mx-auto px-3 py-4">
                  {/* Titel - gleiche Höhe */}
                  <div className="h-6 mb-3 flex items-center justify-center">
                    <span className="text-xs font-bold italic text-white dark:text-viktoria-yellow uppercase tracking-wide">
                      Sponsor der Woche
                    </span>
                  </div>

                  {/* Logo - gleiche Höhe */}
                  <div className="h-16 md:h-20 mb-3 flex items-center justify-center">
                    <div className="relative w-20 md:w-24 flex items-center justify-center">
                      {sponsorDerWoche.attributes.logo?.data?.attributes?.url ? (
                        <Image
                          src={sponsorDerWoche.attributes.logo.data.attributes.url}
                          alt={sponsorDerWoche.attributes.name}
                          width={96}
                          height={64}
                          className="h-12 md:h-16 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                        <span className="text-xs font-bold text-viktoria-yellow">
                          {sponsorDerWoche.attributes.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Beschreibung */}
                  <div>
                    {sponsorDerWoche.attributes.beschreibung && (
                      <p className="text-xs text-gray-300 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                        {sponsorDerWoche.attributes.beschreibung}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hauptsponsor */}
            {hauptsponsoren.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full md:-ml-20"
              >
                <div className="text-center w-full max-w-xs mx-auto px-3 py-4">
                  {/* Titel - gleiche Höhe */}
                  <div className="h-6 mb-3 flex items-center justify-center">
                    <h3 className="text-xs font-bold italic text-gray-600 dark:text-viktoria-yellow uppercase tracking-wide">
                      Hauptsponsor
                    </h3>
                  </div>

                  {/* Logo - gleiche Höhe */}
                  <div className="h-16 md:h-20 mb-3 flex items-center justify-center">
                    {hauptsponsoren.map((sponsor, index) => (
                      <motion.div
                        key={sponsor.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="cursor-pointer group"
                        onClick={() => {
                          if (sponsor.attributes.website_url) {
                            window.open(sponsor.attributes.website_url, '_blank', 'noopener,noreferrer')
                          }
                        }}
                      >
                        <div className="transition-all duration-200 hover:scale-105">
                          <div className="relative flex items-center justify-center">
                            {sponsor.attributes.logo?.data?.attributes?.url ? (
                              <Image
                                src={sponsor.attributes.logo.data.attributes.url}
                                alt={sponsor.attributes.name}
                                width={96}
                                height={64}
                                className="h-12 md:h-16 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                              />
                            ) : (
                              <span className="text-lg md:text-xl font-bold text-white dark:text-gray-400 text-center">
                                {sponsor.attributes.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Beschreibung */}
                  <div>
                    {hauptsponsoren.map((sponsor) => (
                      sponsor.attributes.beschreibung && (
                        <p key={sponsor.id} className="text-xs text-gray-300 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                          {sponsor.attributes.beschreibung}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="w-full"
              >
                <div className="text-center w-full max-w-xs mx-auto px-3 py-4">
                  {/* Titel - gleiche Höhe */}
                  <div className="h-6 mb-3 flex items-center justify-center">
                    <h3 className="text-xs font-bold italic text-gray-600 dark:text-viktoria-yellow uppercase tracking-wide">
                      Hauptsponsor
                    </h3>
                  </div>

                  {/* Logo - gleiche Höhe */}
                  <div className="h-16 md:h-20 mb-3 flex items-center justify-center">
                    <span className="text-sm md:text-base text-gray-300 dark:text-gray-400 italic">
                      Platz für Hauptsponsor
                    </span>
                  </div>

                  {/* Beschreibung */}
                  <div>
                    <p className="text-xs text-gray-300 dark:text-gray-400">
                      Interesse? Kontakt aufnehmen
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Premium Partner - Horizontal Scroll */}
          {premiumSponsoren.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="pt-2"
            >
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-white dark:text-viktoria-yellow uppercase tracking-wide text-center">
                  Premium Partner
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2 pb-2">
                {premiumSponsoren.map((sponsor, index) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="w-full cursor-pointer group"
                    onClick={() => {
                      if (sponsor.attributes.website_url) {
                        window.open(sponsor.attributes.website_url, '_blank', 'noopener,noreferrer')
                      }
                    }}
                  >
                    <div className="relative p-2 transition-all duration-200 hover:scale-105">
                      <div className="relative h-10 flex items-center justify-center">
                        {sponsor.attributes.logo?.data?.attributes?.url ? (
                          <Image
                            src={sponsor.attributes.logo.data.attributes.url}
                            alt={sponsor.attributes.name}
                            width={64}
                            height={32}
                            className="h-8 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                          />
                        ) : (
                          <span className="text-xs font-medium text-white/70 text-center">
                            {sponsor.attributes.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Partner - Horizontal Scroll */}
          {partnerSponsoren.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="pt-2 md:pt-12"
            >
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-white dark:text-viktoria-yellow uppercase tracking-wide text-center">
                  Partner
                </h3>
              </div>
              <div className="grid grid-cols-5 gap-2 pb-2">
                {partnerSponsoren.map((sponsor, index) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="w-full cursor-pointer group"
                    onClick={() => {
                      if (sponsor.attributes.website_url) {
                        window.open(sponsor.attributes.website_url, '_blank', 'noopener,noreferrer')
                      }
                    }}
                  >
                    <div className="p-2 transition-all duration-200 hover:scale-105">
                      <div className="relative h-10 flex items-center justify-center">
                        {sponsor.attributes.logo?.data?.attributes?.url ? (
                          <Image
                            src={sponsor.attributes.logo.data.attributes.url}
                            alt={sponsor.attributes.name}
                            width={64}
                            height={32}
                            className="h-8 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                          />
                        ) : (
                          <span className="text-xs font-medium text-white dark:text-gray-400 text-center">
                            {sponsor.attributes.name.substring(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}


              </div>
            </motion.div>
          )}

          {/* Empty State - Only show when no sponsors are available */}
          {sponsors.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-3">🤝</div>
              <p className="text-gray-300 dark:text-gray-400 text-sm mb-4">
                Derzeit sind keine Partner-Daten verfügbar
              </p>
              <p className="text-gray-200 dark:text-gray-300 text-xs">
                Interesse an einer Partnerschaft? Kontaktieren Sie uns!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
