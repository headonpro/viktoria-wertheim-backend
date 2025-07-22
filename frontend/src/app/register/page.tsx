'use client'

import PageLayout from '@/components/PageLayout'
import RegisterForm from '@/components/RegisterForm'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

export default function RegisterPage() {
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
      {/* Header Section - nur Mobile */}
      

      {/* Desktop Intro Section */}
      <div className="hidden lg:block py-12">
        <AnimatedSection delay={0.1}>
          <div className="container text-center">
            <h1 className="text-4xl md:text-5xl font-permanent-marker text-viktoria-blue mb-4">
              <span className="text-viktoria-yellow">M</span>itglied werden
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Werden Sie Teil der Viktoria Wertheim Familie und erhalten Sie Zugang 
              zu exklusiven Inhalten und Vereinsaktivitäten.
            </p>
          </div>
        </AnimatedSection>
      </div>

      {/* Register Form Section */}
      <AnimatedSection className="px-4 py-8" delay={0.2}>
        <div className="container">
          <RegisterForm redirectTo="/dashboard" />
        </div>
      </AnimatedSection>

      {/* Benefits Section */}
      <AnimatedSection className="px-4 py-8" delay={0.3}>
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-viktoria-blue mb-4">
                Ihre Vorteile als Mitglied
              </h2>
              <p className="text-gray-600">
                Entdecken Sie was Sie als Vereinsmitglied erwartet
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Exclusive Content */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Exklusive Inhalte</h3>
                <p className="text-gray-600 text-sm">
                  Zugang zu internen News, Berichten und Vereinsgeschehen
                </p>
              </div>

              {/* Events */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Vereinsevents</h3>
                <p className="text-gray-600 text-sm">
                  Anmeldung zu Veranstaltungen, Festen und Mitgliederversammlungen
                </p>
              </div>

              {/* Community */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Community</h3>
                <p className="text-gray-600 text-sm">
                  Direkter Kontakt zu anderen Mitgliedern und dem Vereinsvorstand
                </p>
              </div>

              {/* Digital Services */}
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 text-center">
                <div className="w-12 h-12 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-viktoria-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-viktoria-blue mb-2">Digitale Services</h3>
                <p className="text-gray-600 text-sm">
                  Mitgliedsausweis, Beitragsstatus und weitere Online-Services
                </p>
              </div>

            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Call to Action */}
      <AnimatedSection className="px-4 py-8" delay={0.4}>
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-viktoria-blue rounded-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">
                Bereit für Viktoria Wertheim?
              </h3>
              <p className="text-viktoria-yellow mb-6">
                Registrieren Sie sich jetzt und werden Sie Teil unserer Vereinsfamilie. 
                Die Registrierung ist kostenlos und dauert nur wenige Minuten.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#top"
                  className="inline-flex items-center justify-center px-6 py-3 border border-viktoria-yellow text-viktoria-yellow font-semibold rounded-lg hover:bg-viktoria-yellow hover:text-viktoria-blue transition-all duration-300"
                >
                  Jetzt registrieren
                </a>
                <a
                  href="/kontakt"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white text-white font-semibold rounded-lg hover:bg-white hover:text-viktoria-blue transition-all duration-300"
                >
                  Fragen? Kontaktieren Sie uns
                </a>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </PageLayout>
  )
} 