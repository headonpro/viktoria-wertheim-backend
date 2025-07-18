'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import PageLayout from '@/components/PageLayout'
import { IconUsers, IconTrophy, IconMapPin } from '@tabler/icons-react'
import { strapi } from '@/lib/strapi'
import { Mannschaft } from '@/types/strapi'
import Image from "next/image";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Mannschaft[]>([])
  const [loading, setLoading] = useState(true)

  // Erweiterte Mock-Daten mit allen Informationen
  const mockTeams: Mannschaft[] = useMemo(() => [
    {
      id: 1,
      attributes: {
        name: '1. Mannschaft',
        trainer: 'Hans Müller',
        liga: 'Kreisliga',
        teamfoto: undefined,
        // Erweiterte Informationen
        trainingszeiten: 'Di & Do 19:00-20:30',
        heimspieltag: 'Sonntag 15:00 Uhr',
        tabellenplatz: 3,
        letztes_spiel: 'SVW I - FC Eichel 3:1',
        spieleranzahl: 22,
        publishedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    },
    {
      id: 2,
      attributes: {
        name: '2. Mannschaft',
        trainer: 'Marco Schneider',
        liga: 'Kreisklasse A',
        teamfoto: undefined,
        // Erweiterte Informationen
        trainingszeiten: 'Mo & Mi 18:30-20:00',
        heimspieltag: 'Samstag 17:00 Uhr',
        tabellenplatz: 7,
        letztes_spiel: 'SVW II - SV Pülfringen 2:2',
        spieleranzahl: 18,
        publishedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    },
    {
      id: 3,
      attributes: {
        name: '3. Mannschaft',
        trainer: 'Peter Schmidt',
        liga: 'Kreisklasse B',
        teamfoto: undefined,
        // Erweiterte Informationen
        trainingszeiten: 'Fr 19:00-20:30',
        heimspieltag: 'Sonntag 13:00 Uhr',
        tabellenplatz: 5,
        letztes_spiel: 'SVW III - TSV Kreuzwertheim 1:3',
        spieleranzahl: 16,
        publishedAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    }
  ], []);

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
        setTeams(apiTeams.length > 0 ? apiTeams : mockTeams)
      } catch (err) {
        console.error('Error fetching teams, using mock data:', err)
        setTeams(mockTeams)
      } finally {
        setLoading(false)
      }
    }

    fetchTeams()
  }, [mockTeams])

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="space-y-6">

          
          <div className="px-4 pb-8 pt-8">
            <div className="container lg:max-w-5xl lg:mx-auto">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-700 mx-auto mb-4"></div>
                  <p className="text-gray-600">Mannschaften werden geladen...</p>
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
          className="px-4 pb-8 pt-8 md:pt-6"
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
                    className="bg-white/40 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/20 overflow-hidden hover:bg-white/50 transition-all duration-300 group-hover:border-viktoria-yellow/50 cursor-pointer h-full flex flex-col shadow-lg hover:shadow-xl"
                  >
                    {/* Team Header with Liga Badge */}
                    <div className="relative h-24 md:h-32 bg-gradient-to-br from-viktoria-blue-light to-viktoria-blue overflow-hidden">
                      {team.attributes.teamfoto?.data ? (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${team.attributes.teamfoto.data.attributes.url}`}
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
                    <div className="p-4 md:p-6 flex-grow flex flex-col">
                      {/* Team Name */}
                      <div className="mb-4">
                        <h3 className="text-lg md:text-xl font-bold text-gray-800 group-hover:text-viktoria-blue transition-colors">
                          {team.attributes.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {(team.attributes as any).spieleranzahl || team.attributes.spielers?.data?.length || 0} Spieler
                        </p>
                      </div>

                      {/* Enhanced Information Grid */}
                      <div className="space-y-2 md:space-y-3 mb-4 flex-grow">
                        {/* Trainer */}
                        <div className="flex items-center justify-between p-2 md:p-3 bg-white/40 rounded-lg border border-white/30">
                          <div className="flex items-center">
                            <IconUsers className="w-4 h-4 text-viktoria-blue mr-2 flex-shrink-0" />
                            <span className="text-xs md:text-sm font-medium text-gray-700">Trainer</span>
                          </div>
                          <span className="text-xs md:text-sm font-semibold text-gray-800 text-right">
                            {team.attributes.trainer || 'N/A'}
                          </span>
                        </div>

                        {/* Trainingszeiten */}
                        {(team.attributes as any).trainingszeiten && (
                          <div className="flex items-start justify-between p-2 md:p-3 bg-white/40 rounded-lg border border-white/30">
                            <div className="flex items-center">
                              <IconMapPin className="w-4 h-4 text-viktoria-blue mr-2 flex-shrink-0 mt-0.5" />
                              <span className="text-xs md:text-sm font-medium text-gray-700">Training</span>
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 text-right max-w-[60%]">
                              {(team.attributes as any).trainingszeiten}
                            </span>
                          </div>
                        )}

                        {/* Heimspieltag */}
                        {(team.attributes as any).heimspieltag && (
                          <div className="flex items-center justify-between p-2 md:p-3 bg-white/40 rounded-lg border border-white/30">
                            <div className="flex items-center">
                              <IconTrophy className="w-4 h-4 text-viktoria-blue mr-2 flex-shrink-0" />
                              <span className="text-xs md:text-sm font-medium text-gray-700">Heimspiele</span>
                            </div>
                            <span className="text-xs md:text-sm font-semibold text-gray-800 text-right">
                              {(team.attributes as any).heimspieltag}
                            </span>
                          </div>
                        )}

                        {/* Letztes Spiel */}
                        {(team.attributes as any).letztes_spiel && (
                          <div className="p-2 md:p-3 bg-viktoria-blue/10 rounded-lg border border-viktoria-blue/20">
                            <div className="text-xs font-medium text-viktoria-blue mb-1">Letztes Spiel</div>
                            <div className="text-xs md:text-sm font-semibold text-gray-800">
                              {(team.attributes as any).letztes_spiel}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 md:pt-4 border-t border-white/20">
                        <div className="flex items-center justify-center text-viktoria-blue font-semibold group-hover:text-viktoria-blue-light transition-colors group/btn">
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
                <div className="bg-white/40 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/20 p-6 md:p-8">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IconUsers className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-base md:text-lg font-medium">
                    Keine Mannschaften gefunden
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
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