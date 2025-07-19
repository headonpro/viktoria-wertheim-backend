'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { strapi } from '@/lib/strapi'

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

// Mock data for development with local logos
const mockSponsors: Sponsor[] = [
  {
    id: 0,
    attributes: {
      name: 'Red Bull',
      logo: {
        data: {
          attributes: {
            url: '/RedBullLogo.png',
            alternativeText: 'Red Bull Logo'
          }
        }
      },
      website_url: 'https://www.redbull.com',
      beschreibung: 'Red Bull verleiht Flügel - Hauptsponsor für Demo-Zwecke.',
      kategorie: 'hauptsponsor',
      reihenfolge: 0
    }
  },
  {
    id: 1,
    attributes: {
      name: 'Kalinsky',
      logo: {
        data: {
          attributes: {
            url: '/KalinskyLogo.png',
            alternativeText: 'Kalinsky Logo'
          }
        }
      },
      website_url: 'https://www.kalinsky.de',
      beschreibung: 'Premium Partner für Qualität und Service.',
      kategorie: 'premium',
      reihenfolge: 1
    }
  },
  {
    id: 2,
    attributes: {
      name: 'Szabo',
      logo: {
        data: {
          attributes: {
            url: '/SzaboLogo.png',
            alternativeText: 'Szabo Logo'
          }
        }
      },
      website_url: 'https://www.szabo.de',
      beschreibung: 'Premium Partner für professionelle Dienstleistungen.',
      kategorie: 'premium',
      reihenfolge: 2
    }
  },
  {
    id: 3,
    attributes: {
      name: 'Pink',
      logo: {
        data: {
          attributes: {
            url: '/PinkLogo.png',
            alternativeText: 'Pink Logo'
          }
        }
      },
      website_url: 'https://www.pink.de',
      beschreibung: 'Zuverlässiger Partner für innovative Lösungen.',
      kategorie: 'premium',
      reihenfolge: 3
    }
  },
  {
    id: 4,
    attributes: {
      name: 'Zippe',
      logo: {
        data: {
          attributes: {
            url: '/ZippeLogo.png',
            alternativeText: 'Zippe Logo'
          }
        }
      },
      website_url: 'https://www.zippe.de',
      beschreibung: 'Die Firma Zippe aus Wertheim – unser starker Partner für Technik und Umwelt.\nWeltweit führend im Glasrecycling und Bau von Schmelzanlagen.',
      kategorie: 'partner',
      reihenfolge: 4
    }
  },
  {
    id: 5,
    attributes: {
      name: 'Zorbas',
      logo: {
        data: {
          attributes: {
            url: '/ZorbasLogo.png',
            alternativeText: 'Zorbas Logo'
          }
        }
      },
      website_url: 'https://www.zorbas.de',
      beschreibung: 'Kulinarischer Partner für besondere Momente.',
      kategorie: 'partner',
      reihenfolge: 5
    }
  },

]

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
        setSponsors(apiSponsors.length > 0 ? apiSponsors : mockSponsors)
      } catch (error) {
        console.error('Error fetching sponsors, using mock data:', error)
        setSponsors(mockSponsors)
      } finally {
        setLoading(false)
      }
    }

    fetchSponsors()
  }, [])

  if (loading) {
    return (
      <div className="bg-white/10 dark:bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/[0.05] overflow-hidden">
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
    <div className="bg-white/10 dark:bg-white/[0.02] backdrop-blur-sm rounded-lg border border-white/20 dark:border-white/[0.05] overflow-hidden shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08] transition-all duration-300">
      {/* Header */}
      <div className="px-3 py-2 text-center">
        <h2 className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
          Unsere Partner
        </h2>
      </div>

      <div className="p-3 space-y-4">
        {/* Sponsor der Woche */}
        {sponsorDerWoche && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white/5 dark:bg-gradient-to-r dark:from-viktoria-yellow/15 dark:to-viktoria-blue/15 rounded-lg p-3 border border-white/40 dark:border-white/[0.08] shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08] transition-all duration-300">
              <div className="mb-2 text-center">
                <span className="text-xs font-bold italic text-gray-800 dark:text-viktoria-yellow uppercase tracking-wide">
                  Sponsor der Woche
                </span>
              </div>
              
              <div className="text-center">
                <div className="relative h-12 w-20 mx-auto mb-2 flex items-center justify-center">
                  {sponsorDerWoche.attributes.logo?.data?.attributes?.url ? (
                    <img
                      src={sponsorDerWoche.attributes.logo.data.attributes.url}
                      alt={sponsorDerWoche.attributes.name}
                      className="h-12 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                    />
                  ) : (
                    <span className="text-xs font-bold text-viktoria-yellow">
                      {sponsorDerWoche.attributes.name}
                    </span>
                  )}
                </div>
                
                <div>
                  {sponsorDerWoche.attributes.beschreibung && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed whitespace-pre-line">
                      {sponsorDerWoche.attributes.beschreibung}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hauptsponsor - Horizontal Scroll */}
        {hauptsponsoren.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-2">
              <h3 className="text-xs font-bold italic text-gray-600 dark:text-viktoria-yellow uppercase tracking-wide text-center">
                Hauptsponsor
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3 overflow-x-auto scrollbar-hide pb-2">
              {hauptsponsoren.map((sponsor, index) => (
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
                  <div className="p-6 transition-all duration-200 hover:scale-105">
                    <div className="relative h-24 flex items-center justify-center">
                      {sponsor.attributes.logo?.data?.attributes?.url ? (
                        <img
                          src={sponsor.attributes.logo.data.attributes.url}
                          alt={sponsor.attributes.name}
                          className="h-20 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                        <span className="text-xl font-bold text-gray-600 dark:text-gray-400 text-center">
                          {sponsor.attributes.name}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-2">
              <h3 className="text-xs font-bold italic text-gray-600 dark:text-viktoria-yellow uppercase tracking-wide text-center">
                Hauptsponsor
              </h3>
            </div>
            <div className="p-2 text-center">
              <div className="relative h-12 mb-1 flex items-center justify-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  Platz für Hauptsponsor
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Interesse? Kontakt aufnehmen
              </p>
            </div>
          </motion.div>
        )}

        {/* Premium Partner - Horizontal Scroll */}
        {premiumSponsoren.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-200 uppercase tracking-wide text-center">
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
                    <div className="relative h-10 mb-1 flex items-center justify-center">
                      {sponsor.attributes.logo?.data?.attributes?.url ? (
                        <img
                          src={sponsor.attributes.logo.data.attributes.url}
                          alt={sponsor.attributes.name}
                          className="h-8 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                        <span className="text-xs font-medium text-white/70 text-center">
                          {sponsor.attributes.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center truncate group-hover:text-viktoria-blue-light transition-colors">
                      {sponsor.attributes.name}
                    </p>
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
          >
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide text-center">
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
                    <div className="relative h-10 mb-1 flex items-center justify-center">
                      {sponsor.attributes.logo?.data?.attributes?.url ? (
                        <img
                          src={sponsor.attributes.logo.data.attributes.url}
                          alt={sponsor.attributes.name}
                          className="h-8 w-auto object-contain brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                          {sponsor.attributes.name.substring(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 text-center truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      {sponsor.attributes.name}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {/* Fiktive Partner für leere Plätze */}
              {Array.from({ length: Math.max(0, 5 - partnerSponsoren.length) }, (_, index) => {
                const fiktivePartner = [
                  { name: 'AutoHaus Weber', icon: 'M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.6-1.6-1.6h-1.9c-.7 0-1.3-.6-1.3-1.4s.6-1.4 1.3-1.4H22V6h-3.5c-2.2 0-4.1 1.8-4.3 4-.2 2.2 1.5 4 3.6 4h1.2v2h-2v1zM1 6v4h3.5c.8 0 1.5.7 1.5 1.5S5.3 13 4.5 13H1v4h2v-2h1.5c2.2 0 4-1.8 4-4s-1.8-4-4-4H1z' },
                  { name: 'Bäckerei Müller', icon: 'M18 2c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h12zm-2 2H8c-.6 0-1 .4-1 1v14c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V5c0-.6-.4-1-1-1zm-4 3c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3z' },
                  { name: 'TechSolutions', icon: 'M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h3l-1 1v1h12v-1l-1-1h3c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z' }
                ]
                
                const partner = fiktivePartner[index % fiktivePartner.length]
                
                return (
                  <motion.div
                    key={`fictional-${index}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: (partnerSponsoren.length + index) * 0.05 }}
                    className="w-full cursor-pointer group"
                    onClick={() => {
                      window.location.href = '/kontakt'
                    }}
                  >
                    <div className="p-2 transition-all duration-200 hover:scale-105">
                      <div className="relative h-10 mb-1 flex items-center justify-center">
                        <svg 
                          className="h-8 w-8 brightness-0 dark:brightness-0 dark:invert hover:scale-110 transition-all duration-300" 
                          viewBox="0 0 24 24" 
                          fill="currentColor"
                        >
                          <path d={partner.icon}/>
                        </svg>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 text-center truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                        {partner.name}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Fallback */}
        {sponsors.length === 0 && (
          <div className="text-center py-4">
            <p className="text-white/50 text-xs mb-2">
              Keine Partner verfügbar
            </p>
            <button className="bg-viktoria-yellow/20 text-viktoria-yellow px-3 py-1 rounded-md text-xs font-medium hover:bg-viktoria-yellow/30 transition-colors">
              Partner werden
            </button>
          </div>
        )}
      </div>
    </div>
  )
}