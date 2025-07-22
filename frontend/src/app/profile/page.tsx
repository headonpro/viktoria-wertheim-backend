'use client'

import React from 'react'
import PageLayout from '@/components/PageLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProfileForm from '@/components/ProfileForm'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function ProfilePage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute>
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    <span className="text-sm font-medium text-gray-500">Mein Profil</span>
                  </div>
                </li>
              </ol>
            </nav>

            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Mein Profil
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Verwalten Sie Ihre persönlichen Daten, Kontaktinformationen und Account-Einstellungen
                  </p>
                </div>
                <div className="hidden md:block">
                  <div className="bg-green-100 rounded-full p-4">
                    <span className="text-4xl">👤</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <ProfileForm 
              onSuccess={() => {
                // Could trigger a toast notification here
                console.log('Profile updated successfully')
              }}
            />

            {/* Help Section */}
            <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Hilfe & Support
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">📞</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Telefonischer Support</h3>
                  <p className="text-sm text-gray-600">
                    Bei Problemen mit Ihrem Profil rufen Sie uns an: 
                    <br />
                    <span className="font-medium">09342 / 123456</span>
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">E-Mail Support</h3>
                  <p className="text-sm text-gray-600">
                    Senden Sie uns eine E-Mail:
                    <br />
                    <a href="mailto:info@viktoria-wertheim.de" className="font-medium text-green-600 hover:text-green-700">
                      info@viktoria-wertheim.de
                    </a>
                  </p>
                </div>

                <div className="text-center">
                  <div className="bg-yellow-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">❓</span>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Häufige Fragen</h3>
                  <p className="text-sm text-gray-600">
                    Antworten auf häufige Fragen finden Sie in unserem
                    <br />
                    <Link href="/faq" className="font-medium text-green-600 hover:text-green-700">
                      FAQ-Bereich
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Data Protection Notice */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-blue-400 text-xl">🔒</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Datenschutz
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Ihre persönlichen Daten werden verschlüsselt übertragen und sicher gespeichert. 
                      Weitere Informationen finden Sie in unserer{' '}
                      <Link href="/datenschutz" className="font-medium underline">
                        Datenschutzerklärung
                      </Link>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    </ProtectedRoute>
  )
} 