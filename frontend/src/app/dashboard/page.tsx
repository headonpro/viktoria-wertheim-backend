'use client'

import PageLayout from '@/components/PageLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth, useRoles } from '@/contexts/AuthContext'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { IconUser, IconCalendar, IconNews, IconTrophy, IconMail, IconBell, IconShield } from '@tabler/icons-react'

// Dynamic Import für PlayerDashboard
const PlayerDashboard = dynamic(
  () => import('@/components/PlayerDashboard'),
  { ssr: false }
)

// Dynamic Import für TrainerDashboard
const TrainerDashboard = dynamic(
  () => import('@/components/TrainerDashboard'),
  { ssr: false }
)

// Dynamic Import für AdminDashboard
const AdminDashboard = dynamic(
  () => import('@/components/AdminMemberManagement').then(mod => ({ default: mod.AdminDashboard })),
  { ssr: false }
)

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

function DashboardContent() {
  const { user } = useAuth()
  const { isAdmin, isTrainer, isPlayer, userRole, memberType, isStrapiAdmin } = useRoles()

  const getName = () => {
    if (user?.mitglied?.attributes?.vorname && user?.mitglied?.attributes?.nachname) {
      return `${user.mitglied.attributes.vorname} ${user.mitglied.attributes.nachname}`
    }
    return user?.username || 'Mitglied'
  }

  // Show specialized dashboard for admins (including Strapi Super Admin)
  if (isAdmin) {
    return (
      <PageLayout>
        <div className="min-h-screen">
          <AdminDashboard />
        </div>
      </PageLayout>
    )
  }

  const getMemberTypeLabel = () => {
    const typeLabels: { [key: string]: string } = {
      'spieler': 'Aktiver Spieler',
      'trainer': 'Trainer',
      'fan': 'Fan & Unterstützer',
      'familie': 'Familienmitglied',
      'ehrenmitglied': 'Ehrenmitglied',
      'funktionaer': 'Funktionär'
    }
    return typeLabels[memberType || ''] || 'Vereinsmitglied'
  }

  const getRoleColor = () => {
    if (isAdmin) return 'from-purple-500 to-purple-600'
    if (isTrainer) return 'from-blue-500 to-blue-600'
    if (isPlayer) return 'from-green-500 to-green-600'
    return 'from-viktoria-blue to-viktoria-blue-light'
  }

  // Show specialized dashboard for players
  if (isPlayer && memberType === 'spieler') {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="flex mb-8" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link 
                    href="/dashboard" 
                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-green-600"
                  >
                    🏠 Dashboard
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-sm font-medium text-gray-500">Spieler-Dashboard</span>
                  </div>
                </li>
              </ol>
            </nav>

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Spieler-Dashboard
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Ihre persönlichen Statistiken, Training und Spiele
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="bg-green-100 rounded-full p-4">
                    <span className="text-4xl">⚽</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Player Dashboard Component */}
            <PlayerDashboard />
          </div>
        </div>
      </PageLayout>
    )
  }

  // Show specialized dashboard for trainers
  if (isTrainer && (memberType === 'trainer' || userRole === 'trainer')) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="flex mb-8" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <Link 
                    href="/dashboard" 
                    className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-green-600"
                  >
                    🏠 Dashboard
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <span className="mx-2 text-gray-400">/</span>
                    <span className="text-sm font-medium text-gray-500">Trainer-Dashboard</span>
                  </div>
                </li>
              </ol>
            </nav>

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Trainer-Dashboard
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Training-Management und Team-Übersicht
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="bg-blue-100 rounded-full p-4">
                    <span className="text-4xl">👨‍🏫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trainer Dashboard Component */}
            <TrainerDashboard />
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      {/* Header Section - nur Mobile */}
      

      {/* Desktop Intro Section */}
      <div className="hidden lg:block py-8">
        <AnimatedSection delay={0.1}>
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-permanent-marker text-viktoria-blue mb-4">
              <span className="text-viktoria-yellow">M</span>itgliederbereich
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Willkommen zurück, {getName().split(' ')[0]}! Hier finden Sie alle wichtigen Informationen für Vereinsmitglieder.
            </p>
          </div>
        </AnimatedSection>
      </div>

      {/* Welcome Card */}
      <AnimatedSection className="px-4 py-6" delay={0.2}>
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <AnimatedDiv 
              className={`bg-gradient-to-r ${getRoleColor()} rounded-xl p-8 text-white shadow-lg`}
              delay={0.3}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <IconUser size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Willkommen, {getName()}!
                  </h2>
                  <p className="text-white/90 mb-1">
                    {getMemberTypeLabel()}
                  </p>
                  {user?.mitglied?.attributes?.mitgliedsnummer && (
                    <p className="text-white/70 text-sm">
                      Mitgliedsnummer: {user.mitglied.attributes.mitgliedsnummer}
                    </p>
                  )}
                </div>
              </div>
              
              {user?.mitglied?.attributes?.mitgliedsstatus === 'aktiv' && (
                <div className="mt-4 flex items-center space-x-2">
                  <IconShield size={16} className="text-green-300" />
                  <span className="text-green-300 text-sm font-medium">Aktives Mitglied</span>
                </div>
              )}
            </AnimatedDiv>
          </div>
        </div>
      </AnimatedSection>

      {/* Quick Actions */}
      <AnimatedSection className="px-4 py-6" delay={0.4}>
        <div className="container">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-2xl font-bold text-viktoria-blue mb-6 text-center">
              Schnellzugriff
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Profile Management */}
              <Link href="/profile">
                <AnimatedDiv 
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/40 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-green-50/50"
                  delay={0.5}
                >
                  <div className="w-12 h-12 bg-viktoria-blue rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconUser size={24} className="text-viktoria-yellow" />
                  </div>
                  <h4 className="text-lg font-semibold text-viktoria-blue mb-2 text-center">
                    Mein Profil
                  </h4>
                  <p className="text-gray-600 text-sm text-center">
                    Persönliche Daten verwalten und einsehen
                  </p>
                </AnimatedDiv>
              </Link>

              {/* News & Updates */}
              <AnimatedDiv 
                className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                delay={0.6}
              >
                <div className="w-12 h-12 bg-viktoria-blue rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconNews size={24} className="text-viktoria-yellow" />
                </div>
                <h4 className="text-lg font-semibold text-viktoria-blue mb-2 text-center">
                  Vereinsnews
                </h4>
                <p className="text-gray-600 text-sm text-center">
                  Aktuelle Nachrichten und Ankündigungen
                </p>
              </AnimatedDiv>

              {/* Events & Calendar */}
              <AnimatedDiv 
                className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                delay={0.7}
              >
                <div className="w-12 h-12 bg-viktoria-blue rounded-xl flex items-center justify-center mx-auto mb-4">
                  <IconCalendar size={24} className="text-viktoria-yellow" />
                </div>
                <h4 className="text-lg font-semibold text-viktoria-blue mb-2 text-center">
                  Termine & Events
                </h4>
                <p className="text-gray-600 text-sm text-center">
                  Kommende Veranstaltungen und Training
                </p>
              </AnimatedDiv>

            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Role Specific Content */}
      <AnimatedSection className="px-4 py-6" delay={0.8}>
        <div className="container">
          <div className="max-w-6xl mx-auto">
            
            {/* Admin Section */}
            {isAdmin && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-purple-600 mb-4">
                  <IconShield className="inline-block mr-2" size={24} />
                  Administrationsbereich
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">Mitgliederverwaltung</h4>
                    <p className="text-purple-600 text-sm">Mitglieder verwalten und bearbeiten</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">Veranstaltungen</h4>
                    <p className="text-purple-600 text-sm">Events erstellen und organisieren</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2">Berichte</h4>
                    <p className="text-purple-600 text-sm">Statistiken und Auswertungen</p>
                  </div>
                </div>
              </div>
            )}

            {/* Trainer Section */}
            {isTrainer && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-blue-600 mb-4">
                  <IconTrophy className="inline-block mr-2" size={24} />
                  Trainerbereich
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Trainingsplanung</h4>
                    <p className="text-blue-600 text-sm">Training organisieren und planen</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2">Spielerverwaltung</h4>
                    <p className="text-blue-600 text-sm">Kader und Aufstellungen verwalten</p>
                  </div>
                </div>
              </div>
            )}

            {/* Player Section */}
            {isPlayer && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-green-600 mb-4">
                  <IconTrophy className="inline-block mr-2" size={24} />
                  Spielerbereich
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Meine Statistiken</h4>
                    <p className="text-green-600 text-sm">Tore, Spiele und Leistung</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <h4 className="font-semibold text-green-800 mb-2">Trainingszeiten</h4>
                    <p className="text-green-600 text-sm">Kommende Trainings und Spiele</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </AnimatedSection>

      {/* Coming Soon */}
      <AnimatedSection className="px-4 py-6" delay={1.0}>
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-viktoria-blue/10 rounded-xl p-8 border border-viktoria-blue/20">
              <IconBell size={48} className="text-viktoria-blue mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-viktoria-blue mb-4">
                Weitere Features folgen!
              </h3>
              <p className="text-gray-600 mb-4">
                Wir arbeiten kontinuierlich an neuen Funktionen für den Mitgliederbereich. 
                Bald verfügbar: Direktnachrichten, Event-Anmeldungen, digitaler Mitgliedsausweis und vieles mehr.
              </p>
              <p className="text-sm text-gray-500">
                Haben Sie Wünsche oder Anregungen? Kontaktieren Sie uns gerne!
              </p>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </PageLayout>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
} 