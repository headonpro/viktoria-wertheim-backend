'use client'

import PageLayout from '@/components/PageLayout'
import LoginForm from '@/components/LoginForm'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null // Prevent flash before redirect
  }

  return (
    <PageLayout>


      {/* Desktop Intro Section */}
      <div className="hidden lg:block py-12">
        <AnimatedSection delay={0.1}>
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-permanent-marker text-viktoria-blue mb-4">
              <span className="text-viktoria-yellow">M</span>itgliederbereich
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Melden Sie sich an, um Zugang zu exklusiven Inhalten, Terminen und 
              Funktionen des Vereins zu erhalten.
            </p>
          </div>
        </AnimatedSection>
      </div>

      {/* Login Form Section */}
      <AnimatedSection className="px-4 py-8" delay={0.2}>
        <div className="container">
          <LoginForm redirectTo="/dashboard" />
        </div>
      </AnimatedSection>

      {/* Info Section */}
      <AnimatedSection className="px-4 py-8" delay={0.3}>
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Spieler Info */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Für Spieler</h3>
                <p className="text-gray-600 text-sm">
                  Trainingszeiten, Spielpläne, persönliche Statistiken und Team-Kommunikation
                </p>
              </div>

              {/* Trainer Info */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Für Trainer</h3>
                <p className="text-gray-600 text-sm">
                  Mannschaftsplanung, Trainingsorganisation und Spielerbeurteilungen
                </p>
              </div>

              {/* Fans Info */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Für Fans</h3>
                <p className="text-gray-600 text-sm">
                  Exklusive News, Events und Community-Features für treue Unterstützer
                </p>
              </div>

            </div>
          </div>
        </div>
      </AnimatedSection>
    </PageLayout>
  )
} 