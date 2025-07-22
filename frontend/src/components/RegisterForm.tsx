'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { RegisterData, AuthError } from '@/types/auth'
import { IconEye, IconEyeOff, IconUser, IconLock, IconMail, IconPhone, IconCheck } from '@tabler/icons-react'

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function RegisterForm({ onSuccess, redirectTo = '/' }: RegisterFormProps) {
  const router = useRouter()
  const { register, loading } = useAuth()
  
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    vorname: '',
    nachname: '',
    telefon: '',
    geburtsdatum: '',
    mitgliedstyp: 'fan',
    datenschutz_akzeptiert: false,
    newsletter_aktiv: true
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const validateStep1 = () => {
    return formData.vorname.trim() && 
           formData.nachname.trim() && 
           formData.email.trim() && 
           formData.username.trim()
  }

  const validateStep2 = () => {
    return formData.password.trim() && 
           formData.confirmPassword.trim() && 
           formData.password === formData.confirmPassword &&
           formData.password.length >= 6
  }

  const validateStep3 = () => {
    return formData.datenschutz_akzeptiert
  }

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2)
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await register(formData)
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(redirectTo)
      }
    } catch (err: any) {
      const authError = err as AuthError
      setError(authError.message || 'Registrierung fehlgeschlagen')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = validateStep1() && validateStep2() && validateStep3()

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-white/40 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUser size={24} className="text-viktoria-yellow" />
          </div>
          <h2 className="text-2xl font-bold text-viktoria-blue mb-2">
            Registrierung
          </h2>
          <p className="text-gray-600 text-sm">
            Werden Sie Mitglied bei Viktoria Wertheim
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-viktoria-blue text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {step < currentStep ? <IconCheck size={16} /> : step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step < currentStep ? 'bg-viktoria-blue' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Persönliche Daten</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vorname" className="block text-sm font-medium text-gray-700 mb-2">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    id="vorname"
                    name="vorname"
                    value={formData.vorname}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="nachname" className="block text-sm font-medium text-gray-700 mb-2">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    id="nachname"
                    name="nachname"
                    value={formData.nachname}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconMail size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Benutzername *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="telefon" className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon (optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconPhone size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="telefon"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="geburtsdatum" className="block text-sm font-medium text-gray-700 mb-2">
                  Geburtsdatum (optional)
                </label>
                <input
                  type="date"
                  id="geburtsdatum"
                  name="geburtsdatum"
                  value={formData.geburtsdatum}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                />
              </div>
            </div>
          )}

          {/* Step 2: Password and Member Type */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Zugangsdaten & Mitgliedstyp</h3>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconLock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <IconEyeOff size={18} className="text-gray-400" /> : <IconEye size={18} className="text-gray-400" />}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">Mindestens 6 Zeichen</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort bestätigen *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconLock size={18} className="text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? <IconEyeOff size={18} className="text-gray-400" /> : <IconEye size={18} className="text-gray-400" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">Passwörter stimmen nicht überein</p>
                )}
              </div>

              <div>
                <label htmlFor="mitgliedstyp" className="block text-sm font-medium text-gray-700 mb-2">
                  Mitgliedstyp *
                </label>
                <select
                  id="mitgliedstyp"
                  name="mitgliedstyp"
                  value={formData.mitgliedstyp}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                  required
                >
                  <option value="fan">Fan / Unterstützer</option>
                  <option value="spieler">Aktiver Spieler</option>
                  <option value="trainer">Trainer</option>
                  <option value="familie">Familienmitglied</option>
                  <option value="ehrenmitglied">Ehrenmitglied</option>
                  <option value="funktionaer">Funktionär</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Terms and Conditions */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Datenschutz & Newsletter</h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="datenschutz_akzeptiert"
                    name="datenschutz_akzeptiert"
                    checked={formData.datenschutz_akzeptiert}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-4 w-4 text-viktoria-blue focus:ring-viktoria-blue border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="datenschutz_akzeptiert" className="text-sm text-gray-700">
                    Ich akzeptiere die{' '}
                    <a href="/datenschutz" target="_blank" className="text-viktoria-blue hover:underline">
                      Datenschutzerklärung
                    </a>{' '}
                    und stimme der Verarbeitung meiner Daten zu. *
                  </label>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="newsletter_aktiv"
                    name="newsletter_aktiv"
                    checked={formData.newsletter_aktiv}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 h-4 w-4 text-viktoria-blue focus:ring-viktoria-blue border-gray-300 rounded"
                  />
                  <label htmlFor="newsletter_aktiv" className="text-sm text-gray-700">
                    Ich möchte den Newsletter erhalten und über Vereinsnews informiert werden. (optional)
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                disabled={isSubmitting}
              >
                Zurück
              </button>
            )}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !validateStep1()) ||
                  (currentStep === 2 && !validateStep2())
                }
                className="ml-auto px-6 py-2 bg-viktoria-blue text-white rounded-lg hover:bg-viktoria-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Weiter
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="ml-auto flex items-center px-6 py-2 bg-viktoria-blue text-white rounded-lg hover:bg-viktoria-blue-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registrieren...
                  </>
                ) : (
                  'Registrieren'
                )}
              </button>
            )}
          </div>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            Bereits ein Konto?{' '}
            <a
              href="/login"
              className="text-viktoria-blue hover:text-viktoria-blue-light font-medium transition-colors duration-200"
            >
              Hier anmelden
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 