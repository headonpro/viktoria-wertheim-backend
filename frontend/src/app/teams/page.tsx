'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import PageLayout from '@/components/PageLayout'
import { IconUsers, IconTrophy, IconMapPin } from '@tabler/icons-react'
import { strapi } from '@/lib/strapi'
import { Mannschaft } from '@/types/strapi'
import Image from "next/image"
import { getApiUrl } from '@/lib/apiConfig'

export default function TeamsPage() {
  const [teams, setTeams] = useState<Mannschaft[]>([])
  const [loading, setLoading] = useState(true)



  // Fetch teams from API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true)
        const response = await strapi.get('/mannschafts', {
          params: {
            populate: ['teamfoto', 'spielers']
          }
        })
        
        const apiTeams = response.data.data || []
        setTeams(apiTeams)
      } catch (err) {
        console.error('Error fetching teams:', err)
        setTeams([])
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [])

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="space-y-6">

          
          <div className="px-4 pb-8 pt-8">
            <div className="container lg:max-w-5xl lg:mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 dark:border-gray-300 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Mannschaften werden geladen...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header Section - nur Mobile */}






        {/* Enhanced Teams Grid - All devices */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="px-4 pb-8 pt-12 md:pt-8"
        >
          <div className="container lg:max-w-5xl lg:mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
              {teams.map((team, index) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  className="group"
                >
                  <div 
                    onClick={() => {
                      window.location.href = `/teams/${team.id}`
                    }}
                    className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 cursor-pointer h-full flex flex-col hover:transform hover:translateY-[-2px] transition-all duration-300 group-hover:shadow-[0_6px_20px_rgba(0,0,0,0.12),0_3px_10px_rgba(0,0,0,0.08)] dark:group-hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_3px_10px_rgba(255,255,255,0.06)]"
                  >
                    {/* Team Header with Liga Badge */}
                    <div className="relative h-24 md:h-32 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden">
                      {team.attributes.teamfoto?.data ? (
                        <Image
                          src={`${getApiUrl()}${team.attributes.teamfoto.data.attributes.url}`}
                          alt={team.attributes.teamfoto.data.attributes.alternativeText || team.attributes.name}
                          width={400}
                          height={128}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          priority
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-viktoria-yellow/20 rounded-full flex items-center justify-center mx-auto mb-1 md:mb-2">
                              <IconUsers className="w-6 h-6 md:w-8 md:h-8 text-viktoria-yellow" />
                            </div>
                            <p className="text-viktoria-yellow font-semibold text-xs md:text-sm">SV Viktoria Wertheim</p>
                          </div>
                        </div>
                      )}
                      
                      {/* Liga Badge - Links platziert */}
                      <div className="absolute top-3 left-3">
                        <div className="bg-viktoria-yellow text-gray-800 text-xs px-2 py-1 rounded-full font-semibold shadow-sm">
                          {team.attributes.liga}
                        </div>
                      </div>

                      {/* Tabellenplatz Badge - Rechts platziert */}
                      {(team.attributes as any).tabellenplatz && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-viktoria-yellow text-gray-800 text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                            #{(team.attributes as any).tabellenplatz}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Team Content */}
                    <div className="p-4 md:p-6 flex-grow flex flex-col relative z-10">
                      {/* Team Name */}
                      <div className="mb-4 relative z-10">
                        <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide group-hover:text-viktoria-blue dark:group-hover:text-viktoria-yellow transition-colors">
                          {team.attributes.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {(team.attributes as any).spieleranzahl || team.attributes.spielers?.data?.length || 0} Spieler
                        </p>
                      </div>

                      {/* Enhanced Information Grid */}
                      <div className="space-y-3 mb-4 flex-grow">
                        {/* Trainer */}
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-white/[0.02]">
                          <div className="flex items-center">
                            <IconUsers className="w-4 h-4 text-viktoria-blue dark:text-viktoria-yellow mr-2 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Trainer</span>
                          </div>
                          <span className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 text-right">
                            {team.attributes.trainer || 'N/A'}
                          </span>
                        </div>

                        {/* Trainingszeiten */}
                        {(team.attributes as any).trainingszeiten && (
                          <div className="flex items-start justify-between p-2 rounded-lg bg-white/5 dark:bg-white/[0.02]">
                            <div className="flex items-center">
                              <IconMapPin className="w-4 h-4 text-viktoria-blue dark:text-viktoria-yellow mr-2 flex-shrink-0 mt-0.5" />
                              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Training</span>
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 text-right max-w-[60%]">
                              {(team.attributes as any).trainingszeiten}
                            </span>
                          </div>
                        )}

                        {/* Heimspieltag */}
                        {(team.attributes as any).heimspieltag && (
                          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 dark:bg-white/[0.02]">
                            <div className="flex items-center">
                              <IconTrophy className="w-4 h-4 text-viktoria-blue dark:text-viktoria-yellow mr-2 flex-shrink-0" />
                              <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Heimspiele</span>
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 text-right">
                              {((team.attributes as any).heimspieltag || '').replace('Sonntag', 'So').replace('Samstag', 'Sa').replace('Montag', 'Mo').replace('Dienstag', 'Di').replace('Mittwoch', 'Mi').replace('Donnerstag', 'Do').replace('Freitag', 'Fr')}
                            </span>
                          </div>
                        )}

                        {/* Letztes Spiel */}
                        {(team.attributes as any).letztes_spiel && (
                          <div className="p-2 rounded-lg bg-viktoria-yellow/10 dark:bg-viktoria-yellow/5">
                            <div className="text-xs font-medium text-viktoria-blue dark:text-viktoria-yellow mb-1">Letztes Spiel</div>
                            <div className="text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100">
                              {(team.attributes as any).letztes_spiel}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 md:pt-4 border-t border-white/20 dark:border-white/[0.08] relative z-10">
                        <div className="flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold hover:text-viktoria-blue dark:hover:text-viktoria-yellow transition-colors group/btn">
                          <span className="text-sm">Team Details</span>
                          <div className="ml-2 text-lg group-hover/btn:translate-x-1 transition-transform">
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {teams.length === 0 && (
              <div className="text-center py-12">
                <div className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0 p-6 md:p-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 dark:bg-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                    <IconUsers className="w-6 h-6 md:w-8 md:h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2 relative z-10">
                    Keine Mannschaften gefunden
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm relative z-10">
                    Die Mannschaftsdaten werden geladen oder sind nicht verfügbar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </PageLayout>
  )
} 