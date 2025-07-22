'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoginCredentials, AuthError } from '@/types/auth'
import { IconEye, IconEyeOff, IconUser, IconLock, IconMail } from '@tabler/icons-react'

interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

export default function LoginForm({ onSuccess, redirectTo = '/' }: LoginFormProps) {
  const router = useRouter()
  const { login, loading } = useAuth()
  
  const [formData, setFormData] = useState<LoginCredentials>({
    identifier: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await login(formData)
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push(redirectTo)
      }
    } catch (err: any) {
      const authError = err as AuthError
      setError(authError.message || 'Anmeldung fehlgeschlagen')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = formData.identifier.trim() && formData.password.trim()

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-white/40 shadow-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-viktoria-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <IconUser size={24} className="text-viktoria-yellow" />
          </div>
          <h2 className="text-2xl font-bold text-viktoria-blue mb-2">
            Anmelden
          </h2>
          <p className="text-gray-600 text-sm">
            Willkommen zurück bei Viktoria Wertheim
          </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email/Username Field */}
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail oder Benutzername
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconMail size={18} className="text-gray-400" />
              </div>
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-viktoria-blue focus:border-viktoria-blue transition-colors duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="ihre.email@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
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
                placeholder="Ihr Passwort"
                required
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <IconEyeOff size={18} className="text-gray-400 hover:text-gray-600" />
                ) : (
                  <IconEye size={18} className="text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-viktoria-blue hover:bg-viktoria-blue-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-viktoria-blue disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <a
            href="/password-reset"
            className="text-sm text-viktoria-blue hover:text-viktoria-blue-light transition-colors duration-200"
          >
            Passwort vergessen?
          </a>
          
          <div className="text-sm text-gray-600">
            Noch kein Konto?{' '}
            <a
              href="/register"
              className="text-viktoria-blue hover:text-viktoria-blue-light font-medium transition-colors duration-200"
            >
              Hier registrieren
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 