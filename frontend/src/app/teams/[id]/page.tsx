'use client'

import { useState, useEffect } from 'react'
import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'
import { IconUsers, IconTrophy, IconMapPin, IconCalendar, IconClock, IconStar, IconShield, IconX, IconUser } from '@tabler/icons-react'

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

// Team data structure
const defaultTeamData = {
  id: 1,
  name: '1. Mannschaft',
  trainer: 'Max Mustermann',
  coTrainer: 'Klaus Weber',
  ligazugehoerigkeit: 'Kreisliga',
  saison: '2024/25',
  gruendung: '1952',
  teamPhoto: null, // URL zum Mannschaftsbild
  startingEleven: [
    { id: 1, name: 'Max Müller', position: 'TW', number: 1, age: 28, goals: 0, assists: 2, games: 18, rating: 7.2, cards: 1, saves: 67 },
    { id: 2, name: 'Tom Wagner', position: 'IV', number: 4, age: 25, goals: 2, assists: 1, games: 20, rating: 7.8, cards: 3, tackles: 45 },
    { id: 3, name: 'Ben Schmidt', position: 'IV', number: 5, age: 26, goals: 1, assists: 0, games: 19, rating: 7.5, cards: 2, tackles: 52 },
    { id: 4, name: 'Jan Klein', position: 'LV', number: 3, age: 24, goals: 0, assists: 3, games: 17, rating: 7.1, cards: 4, crosses: 23 },
    { id: 5, name: 'Leo Bauer', position: 'RV', number: 2, age: 23, goals: 1, assists: 4, games: 21, rating: 7.6, cards: 2, crosses: 28 },
    { id: 6, name: 'Tim Fischer', position: 'DM', number: 6, age: 27, goals: 3, assists: 2, games: 22, rating: 8.1, cards: 5, passes: 89 },
    { id: 7, name: 'Paul Richter', position: 'ZM', number: 8, age: 25, goals: 4, assists: 6, games: 20, rating: 8.3, cards: 1, passes: 91 },
    { id: 8, name: 'Nick Hoffmann', position: 'ZM', number: 10, age: 24, goals: 6, assists: 8, games: 19, rating: 8.7, cards: 2, passes: 87 },
    { id: 9, name: 'Alex König', position: 'LF', number: 7, age: 22, goals: 8, assists: 5, games: 18, rating: 8.2, cards: 3, shots: 34 },
    { id: 10, name: 'Finn Weber', position: 'RF', number: 11, age: 21, goals: 7, assists: 3, games: 16, rating: 7.9, cards: 1, shots: 28 },
    { id: 11, name: 'Luis Neumann', position: 'ST', number: 9, age: 26, goals: 12, assists: 4, games: 21, rating: 8.5, cards: 2, shots: 42 }
  ],
  substitutes: [
    { id: 12, name: 'David Braun', position: 'TW', number: 12, age: 30, goals: 0, assists: 0, games: 8, rating: 6.9, cards: 0, saves: 24 },
    { id: 13, name: 'Moritz Schulz', position: 'IV', number: 13, age: 22, goals: 1, assists: 0, games: 12, rating: 7.1, cards: 2, tackles: 18 },
    { id: 14, name: 'Felix Zimmermann', position: 'MF', number: 14, age: 20, goals: 2, assists: 1, games: 15, rating: 7.3, cards: 1, passes: 78 },
    { id: 15, name: 'Noah Hartmann', position: 'MF', number: 15, age: 19, goals: 1, assists: 2, games: 10, rating: 7.0, cards: 1, passes: 82 },
    { id: 16, name: 'Elias Lange', position: 'ST', number: 16, age: 21, goals: 3, assists: 1, games: 11, rating: 7.4, cards: 2, shots: 16 },
    { id: 17, name: 'Luca Weber', position: 'IV', number: 17, age: 23, goals: 0, assists: 1, games: 9, rating: 6.8, cards: 3, tackles: 22 },
    { id: 18, name: 'Simon Koch', position: 'MF', number: 18, age: 24, goals: 2, assists: 3, games: 13, rating: 7.2, cards: 1, passes: 85 },
    { id: 19, name: 'Jonas Müller', position: 'LV', number: 19, age: 21, goals: 0, assists: 2, games: 7, rating: 6.7, cards: 1, crosses: 14 },
    { id: 20, name: 'Robin Klein', position: 'ST', number: 20, age: 20, goals: 4, assists: 0, games: 8, rating: 7.5, cards: 0, shots: 12 },
    { id: 21, name: 'Marcel Fischer', position: 'MF', number: 21, age: 22, goals: 1, assists: 4, games: 14, rating: 7.6, cards: 2, passes: 88 },
    { id: 22, name: 'Leon Hoffmann', position: 'RV', number: 22, age: 25, goals: 1, assists: 3, games: 11, rating: 7.3, cards: 1, crosses: 19 },
    { id: 23, name: 'Daniel Richter', position: 'MF', number: 23, age: 19, goals: 0, assists: 1, games: 6, rating: 6.5, cards: 0, passes: 74 },
    { id: 24, name: 'Tobias König', position: 'ST', number: 24, age: 26, goals: 5, assists: 2, games: 9, rating: 7.8, cards: 1, shots: 18 }
  ]
}

// Formationslogik - 4-2-3-1 Formation
const formation = {
  goalkeeper: [1], // TW
  defense: [4, 5, 3, 2], // IV, IV, LV, RV
  defensiveMidfield: [6, 8], // DM, DM
  offensiveMidfield: [11, 7, 10], // LOM, ZOM, ROM
  attack: [9] // ST
}

export default function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [team, setTeam] = useState(defaultTeamData)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  
  const openPlayerModal = (player: any) => {
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }
  
  const closePlayerModal = () => {
    setSelectedPlayer(null)
    setIsModalOpen(false)
  }

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setTeamId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    if (teamId) {
      // Hier würde normalerweise die API aufgerufen werden
      // const fetchTeam = async () => {
      //   const response = await fetch(`/api/teams/${teamId}`)
      //   const data = await response.json()
      //   setTeam(data)
      // }
      // fetchTeam()
    }
  }, [teamId])

  return (
    <PageLayout>






        {/* Mannschaftsbild */}
        <AnimatedSection className="px-4 py-4" delay={0.3}>
          <div className="container">
            <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-white/[0.08] shadow-lg dark:shadow-white/[0.05]">
              <h2 className="text-lg font-semibold text-viktoria-blue dark:text-viktoria-yellow mb-4 text-center">Mannschaftsfoto</h2>
              <div className="aspect-[16/9] md:aspect-[21/9] bg-gradient-to-r from-viktoria-blue-light to-viktoria-blue rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <IconUsers size={48} className="mx-auto mb-4 text-viktoria-yellow" />
                  <p className="text-lg font-semibold">Mannschaftsfoto</p>
                  <p className="text-sm opacity-80">Saison {team.saison}</p>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Fußballfeld - Start 11 */}
        <AnimatedSection className="px-4 py-4" delay={0.4}>
          <div className="container">
            <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/40 dark:border-white/[0.08] shadow-lg dark:shadow-white/[0.05]">
              <div className="flex items-center justify-center mb-6">
                <IconShield className="text-viktoria-blue dark:text-viktoria-yellow mr-3" size={24} />
                <h2 className="text-lg md:text-xl font-semibold text-viktoria-blue dark:text-viktoria-yellow">Start-11</h2>
              </div>
              
              {/* Fußballfeld */}
              <div className="relative bg-green-600 rounded-lg min-h-[500px] md:min-h-[600px]">
                {/* Feldlinien */}
                <div className="absolute inset-6 md:inset-8 pointer-events-none">
                  <div className="w-full h-full border-2 border-white rounded-lg relative">
                    {/* Mittellinie - horizontal */}
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white transform -translate-y-0.5"></div>
                    {/* Mittelkreis */}
                    <div className="absolute top-1/2 left-1/2 w-16 h-16 md:w-20 md:h-20 border-2 border-white rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
                    {/* Strafräume - oben und unten */}
                    <div className="absolute top-0 left-1/4 w-1/2 h-12 md:h-16 border-2 border-white border-t-0"></div>
                    <div className="absolute bottom-0 left-1/4 w-1/2 h-12 md:h-16 border-2 border-white border-b-0"></div>
                  </div>
                </div>

                {/* Spieler Formation 4-2-3-1 - optimal über das gesamte Spielfeld verteilt */}
                {/* Torwart - ganz unten im eigenen Strafraum */}
                <div className="absolute bottom-[5%] left-1/2 transform -translate-x-1/2">
                  <AnimatedDiv delay={0.5} className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-yellow rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => openPlayerModal(team.startingEleven.find(p => p.number === formation.goalkeeper[0]))}
                    >
                      <span className="text-viktoria-blue font-bold text-xs md:text-sm">
                        {team.startingEleven.find(p => p.number === formation.goalkeeper[0])?.number}
                      </span>
                    </div>
                    <p className="text-white text-xs md:text-sm font-medium text-center max-w-16 leading-tight">
                      {team.startingEleven.find(p => p.number === formation.goalkeeper[0])?.name.split(' ')[1]}
                    </p>
                  </AnimatedDiv>
                </div>

                {/* Abwehr - 4 Spieler in unserer Spielfeldhälfte */}
                <div className="absolute bottom-[25%] left-0 w-full flex justify-around px-6 md:px-8">
                  {formation.defense.map((playerNumber, index) => {
                    const player = team.startingEleven.find(p => p.number === playerNumber)
                    return (
                      <AnimatedDiv key={playerNumber} delay={0.6 + index * 0.1} className="flex flex-col items-center">
                        <div 
                          className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                          onClick={() => openPlayerModal(player)}
                        >
                          <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                            {player?.number}
                          </span>
                        </div>
                        <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                          {player?.name.split(' ')[1]}
                        </p>
                      </AnimatedDiv>
                    )
                  })}
                </div>
                
                {/* Defensives Mittelfeld - 2 Spieler vor der Abwehr */}
                <div className="absolute bottom-[45%] left-0 w-full flex justify-center gap-16 md:gap-20 px-6 md:px-8">
                  {formation.defensiveMidfield.map((playerNumber, index) => {
                    const player = team.startingEleven.find(p => p.number === playerNumber)
                    return (
                      <AnimatedDiv key={playerNumber} delay={1.0 + index * 0.1} className="flex flex-col items-center">
                        <div 
                          className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                          onClick={() => openPlayerModal(player)}
                        >
                          <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                            {player?.number}
                          </span>
                        </div>
                        <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                          {player?.name.split(' ')[1]}
                        </p>
                      </AnimatedDiv>
                    )
                  })}
                </div>

                {/* Offensives Mittelfeld - 3 Spieler hinter dem Stürmer */}
                {/* Linker offensiver Mittelfeldspieler */}
                <div className="absolute bottom-[65%] left-[20%]">
                  <AnimatedDiv delay={1.3} className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => openPlayerModal(team.startingEleven.find(p => p.number === 11))}
                    >
                      <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                        {team.startingEleven.find(p => p.number === 11)?.number}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                      {team.startingEleven.find(p => p.number === 11)?.name.split(' ')[1]}
                    </p>
                  </AnimatedDiv>
                </div>
                
                {/* Zentraler offensiver Mittelfeldspieler - genau unter dem Stürmer */}
                <div className="absolute bottom-[65%] left-1/2 transform -translate-x-1/2">
                  <AnimatedDiv delay={1.4} className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => openPlayerModal(team.startingEleven.find(p => p.number === 7))}
                    >
                      <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                        {team.startingEleven.find(p => p.number === 7)?.number}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                      {team.startingEleven.find(p => p.number === 7)?.name.split(' ')[1]}
                    </p>
                  </AnimatedDiv>
                </div>

                {/* Rechter offensiver Mittelfeldspieler */}
                <div className="absolute bottom-[65%] right-[20%]">
                  <AnimatedDiv delay={1.5} className="flex flex-col items-center">
                    <div 
                      className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => openPlayerModal(team.startingEleven.find(p => p.number === 10))}
                    >
                      <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                        {team.startingEleven.find(p => p.number === 10)?.number}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                      {team.startingEleven.find(p => p.number === 10)?.name.split(' ')[1]}
                    </p>
                  </AnimatedDiv>
                </div>

                {/* Stürmer - 1 Spieler ganz vorne */}
                <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2">
                  {formation.attack.map((playerNumber, index) => {
                    const player = team.startingEleven.find(p => p.number === playerNumber)
                    return (
                      <AnimatedDiv key={playerNumber} delay={1.6 + index * 0.1} className="flex flex-col items-center">
                        <div 
                          className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                          onClick={() => openPlayerModal(player)}
                        >
                          <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                            {player?.number}
                          </span>
                        </div>
                        <p className="text-white text-xs font-medium text-center max-w-14 leading-tight">
                          {player?.name.split(' ')[1]}
                        </p>
                      </AnimatedDiv>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Ersatzbank */}
        <AnimatedSection className="px-4 py-4" delay={1.6}>
          <div className="container">
            <div className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl p-4 md:p-6 border border-white/40 dark:border-white/[0.08] shadow-lg dark:shadow-white/[0.05]">
              <div className="flex items-center justify-center mb-6">
                <IconUsers className="text-viktoria-blue dark:text-viktoria-yellow mr-3" size={24} />
                <h2 className="text-lg md:text-xl font-semibold text-viktoria-blue dark:text-viktoria-yellow">Ersatzbank</h2>
              </div>
              
              {/* Ersatzbank im Spielfeld-Design - erweitert für 15 Personen */}
              <div className="relative bg-green-600 rounded-lg min-h-[380px] md:min-h-[420px]">
                {/* Weißer Rahmen wie beim Spielfeld */}
                <div className="absolute inset-4 md:inset-6 pointer-events-none">
                  <div className="w-full h-full border-2 border-white rounded-lg relative"></div>
                </div>

                {/* Grid Layout - 4 Spalten, 4 Reihen */}
                <div className="absolute inset-8 md:inset-12 grid grid-cols-4 gap-4 md:gap-6 place-items-center">
                  {/* Trainer */}
                  <AnimatedDiv delay={1.7} className="flex flex-col items-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-yellow rounded-full flex items-center justify-center shadow-lg mb-1">
                      <span className="text-viktoria-blue font-bold text-xs md:text-sm">T</span>
                    </div>
                    <p className="text-white text-xs font-medium text-center max-w-20 leading-tight">
                      Trainer
                    </p>
                  </AnimatedDiv>

                  {/* Alle 13 Ersatzspieler */}
                  {team.substitutes.map((player, index) => (
                    <AnimatedDiv 
                      key={player.id} 
                      delay={1.8 + index * 0.05}
                      className="flex flex-col items-center"
                    >
                      <div 
                        className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-blue rounded-full flex items-center justify-center shadow-lg mb-1 cursor-pointer hover:scale-110 transition-transform duration-300"
                        onClick={() => openPlayerModal(player)}
                      >
                        <span className="text-viktoria-yellow font-bold text-xs md:text-sm">
                          {player.number}
                        </span>
                      </div>
                      <p className="text-white text-xs font-medium text-center max-w-20 leading-tight">
                        {player.name.split(' ')[1]}
                      </p>
                    </AnimatedDiv>
                  ))}

                  {/* Co-Trainer */}
                  <AnimatedDiv delay={2.5} className="flex flex-col items-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-viktoria-yellow rounded-full flex items-center justify-center shadow-lg mb-1">
                      <span className="text-viktoria-blue font-bold text-xs md:text-sm">C</span>
                    </div>
                    <p className="text-white text-xs font-medium text-center max-w-20 leading-tight">
                      Co-T
                    </p>
                  </AnimatedDiv>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Spieler Modal */}
        {/* Professioneller Spieler Steckbrief Modal */}
        {isModalOpen && selectedPlayer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <AnimatedDiv 
              delay={0} 
              className="bg-white rounded-2xl max-w-2xl w-full relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header - Vereinsfarben */}
              <div className="relative bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light p-6 text-white">
                <button
                  onClick={closePlayerModal}
                  className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-300"
                >
                  <IconX className="text-white" size={20} />
                </button>
                
                <div className="flex items-center space-x-6">
                  {/* Spieler Avatar */}
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                    <IconUser className="text-white" size={32} />
                  </div>
                  
                  {/* Spieler Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-permanent-marker text-white mb-1">
                      {selectedPlayer.name}
                    </h2>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-viktoria-yellow rounded-full flex items-center justify-center">
                          <span className="text-viktoria-blue font-bold text-sm">
                            {selectedPlayer.number}
                          </span>
                        </div>
                        <span className="text-viktoria-yellow font-semibold">
                          {selectedPlayer.position}
                        </span>
                      </div>
                      <div className="text-white/80 text-sm">
                        {selectedPlayer.age} Jahre
                      </div>
                    </div>
                  </div>
                  
                  {/* Bewertung */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-viktoria-yellow rounded-full flex items-center justify-center mb-2">
                      <span className="text-viktoria-blue font-bold text-lg">
                        {selectedPlayer.rating}
                      </span>
                    </div>
                    <p className="text-white/80 text-xs">Bewertung</p>
                  </div>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="p-6 space-y-6">
                {/* Haupt-Statistiken */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-viktoria-blue/10 to-viktoria-blue/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-viktoria-blue mb-1">
                      {selectedPlayer.goals}
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Tore</p>
                  </div>
                  <div className="bg-gradient-to-br from-viktoria-yellow/10 to-viktoria-yellow/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-viktoria-blue mb-1">
                      {selectedPlayer.assists}
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Assists</p>
                  </div>
                  <div className="bg-gradient-to-br from-viktoria-blue/10 to-viktoria-blue/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-viktoria-blue mb-1">
                      {selectedPlayer.games}
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Spiele</p>
                  </div>
                  <div className="bg-gradient-to-br from-viktoria-yellow/10 to-viktoria-yellow/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-viktoria-blue mb-1">
                      {selectedPlayer.cards}
                    </div>
                    <p className="text-gray-600 text-sm font-medium">Karten</p>
                  </div>
                </div>

                {/* Positions-spezifische Statistiken */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-viktoria-blue mb-3 text-center">
                    Spezialstatistiken
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPlayer.position === 'TW' && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {selectedPlayer.saves}
                          </div>
                          <p className="text-gray-600 text-sm">Paraden</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {Math.round((selectedPlayer.saves / (selectedPlayer.saves + selectedPlayer.goals * 2)) * 100)}%
                          </div>
                          <p className="text-gray-600 text-sm">Parade-Quote</p>
                        </div>
                      </>
                    )}
                    {(selectedPlayer.position === 'IV' || selectedPlayer.position === 'DM') && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {selectedPlayer.tackles}
                          </div>
                          <p className="text-gray-600 text-sm">Zweikämpfe</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {Math.round((selectedPlayer.tackles / selectedPlayer.games) * 10) / 10}
                          </div>
                          <p className="text-gray-600 text-sm">Pro Spiel</p>
                        </div>
                      </>
                    )}
                    {(selectedPlayer.position === 'LV' || selectedPlayer.position === 'RV') && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {selectedPlayer.crosses}
                          </div>
                          <p className="text-gray-600 text-sm">Flanken</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {Math.round((selectedPlayer.crosses / selectedPlayer.games) * 10) / 10}
                          </div>
                          <p className="text-gray-600 text-sm">Pro Spiel</p>
                        </div>
                      </>
                    )}
                    {(selectedPlayer.position === 'ZM' || selectedPlayer.position === 'MF') && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {selectedPlayer.passes}%
                          </div>
                          <p className="text-gray-600 text-sm">Passquote</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {Math.round(((selectedPlayer.goals + selectedPlayer.assists) / selectedPlayer.games) * 10) / 10}
                          </div>
                          <p className="text-gray-600 text-sm">Scorerpunkte</p>
                        </div>
                      </>
                    )}
                    {(selectedPlayer.position === 'ST' || selectedPlayer.position === 'LF' || selectedPlayer.position === 'RF') && (
                      <>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {selectedPlayer.shots}
                          </div>
                          <p className="text-gray-600 text-sm">Schüsse</p>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-viktoria-blue">
                            {Math.round((selectedPlayer.goals / selectedPlayer.shots) * 100)}%
                          </div>
                          <p className="text-gray-600 text-sm">Effizienz</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Saison-Leistung */}
                <div className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light rounded-lg p-4 text-white">
                  <h3 className="font-semibold mb-3 text-center">Saison 2024/25</h3>
                  <div className="flex justify-center space-x-8">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-viktoria-yellow">
                        {Math.round((selectedPlayer.goals + selectedPlayer.assists) / selectedPlayer.games * 10) / 10}
                      </div>
                      <p className="text-white/80 text-sm">Scorerpunkte/Spiel</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-viktoria-yellow">
                        {Math.round((selectedPlayer.games / 22) * 100)}%
                      </div>
                      <p className="text-white/80 text-sm">Einsatzquote</p>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedDiv>
          </div>
        )}
    </PageLayout>
  )
} 