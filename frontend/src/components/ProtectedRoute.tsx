'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useAuthStatus } from '@/contexts/AuthContext'
import { ProtectedRouteProps } from '@/types/auth'
import PageLayout from '@/components/PageLayout'
import dynamic from 'next/dynamic'

// Dynamic Import für animierte Komponenten
const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

interface AccessDeniedProps {
  message: string
  showLogin?: boolean
}

function AccessDenied({ message, showLogin = false }: AccessDeniedProps) {
  const router = useRouter()

  return (
    <PageLayout>
      <div className="pt-[60px] md:pt-[20px] min-h-screen flex items-center justify-center">
        <AnimatedSection delay={0.1}>
          <div className="container">
            <div className="max-w-md mx-auto text-center bg-white/70 backdrop-blur-sm rounded-xl p-8 border border-white/40 shadow-lg">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-viktoria-blue mb-4">
                Zugriff verweigert
              </h1>
              
              <p className="text-gray-600 mb-6">
                {message}
              </p>
              
              <div className="space-y-3">
                {showLogin && (
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-viktoria-blue hover:bg-viktoria-blue-light text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
                  >
                    Zur Anmeldung
                  </button>
                )}
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-300"
                >
                  Zur Startseite
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </PageLayout>
  )
}

function LoadingSpinner() {
  return (
    <PageLayout>
      <div className="pt-[60px] md:pt-[20px] min-h-screen flex items-center justify-center">
        <AnimatedSection delay={0.1}>
          <div className="container">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viktoria-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Berechtigung wird überprüft...</p>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </PageLayout>
  )
}

export default function ProtectedRoute({ 
  children, 
  requiredRole, 
  requiredMemberType,
  fallback 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, hasRole, isMemberType } = useAuth()

  // Show loading spinner while authentication is being checked
  if (loading) {
    return <LoadingSpinner />
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }
    return (
      <AccessDenied 
        message="Sie müssen angemeldet sein, um diese Seite zu sehen."
        showLogin={true}
      />
    )
  }

  // Check role-based access
  if (requiredRole && !hasRole(requiredRole)) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    const roleText = Array.isArray(requiredRole) 
      ? requiredRole.join(' oder ') 
      : requiredRole
    
    return (
      <AccessDenied 
        message={`Sie benötigen die Berechtigung '${roleText}', um diese Seite zu sehen.`}
      />
    )
  }

  // Check member type-based access
  if (requiredMemberType && !isMemberType(requiredMemberType)) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    const typeText = Array.isArray(requiredMemberType) 
      ? requiredMemberType.join(' oder ') 
      : requiredMemberType
    
    return (
      <AccessDenied 
        message={`Diese Seite ist nur für ${typeText} zugänglich.`}
      />
    )
  }

  // User has all required permissions
  return <>{children}</>
}

// Higher-order component for easier usage
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiredRole?: string | string[]
    requiredMemberType?: string | string[]
    fallback?: React.ReactNode
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Utility component for inline role checking
interface RoleGateProps {
  children: React.ReactNode
  requiredRole?: string | string[]
  requiredMemberType?: string | string[]
  fallback?: React.ReactNode
}

export function RoleGate({ 
  children, 
  requiredRole, 
  requiredMemberType,
  fallback = null 
}: RoleGateProps) {
  const { isAuthenticated, hasRole, isMemberType } = useAuth()

  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <>{fallback}</>
  }

  if (requiredMemberType && !isMemberType(requiredMemberType)) {
    return <>{fallback}</>
  }

  return <>{children}</>
} 