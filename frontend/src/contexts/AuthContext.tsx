'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthService } from '@/lib/auth'
import { User, AuthContextType, LoginCredentials, RegisterData, AuthError, ProfileUpdateData, MemberProfileUpdateData } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        // Check for existing token
        const existingToken = AuthService.getToken()
        const existingUser = AuthService.getUser()
        
        if (existingToken && existingUser) {
          // Verify token is still valid by fetching current user
          const currentUser = await AuthService.getCurrentUser()
          
          if (currentUser) {
            setToken(existingToken)
            setUser(currentUser)
          } else {
            // Token invalid, clear storage
            AuthService.logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        AuthService.logout()
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true)
      const authResponse = await AuthService.login(credentials)
      
      setToken(authResponse.jwt)
      setUser(authResponse.user)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setLoading(true)
      const authResponse = await AuthService.register(data)
      
      setToken(authResponse.jwt)
      setUser(authResponse.user)
    } catch (error) {
      console.error('Registration failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = (): void => {
    AuthService.logout()
    setUser(null)
    setToken(null)
  }

  const updateProfile = async (data: ProfileUpdateData): Promise<void> => {
    if (!user) throw new Error('Nicht authentifiziert')
    
    try {
      setLoading(true)
      const updatedUser = await AuthService.updateProfile(user.id, data)
      setUser(updatedUser)
    } catch (error) {
      console.error('Profile update failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateMemberProfile = async (data: MemberProfileUpdateData): Promise<void> => {
    if (!user?.mitglied) throw new Error('Mitgliedsdaten nicht verfügbar')
    
    try {
      setLoading(true)
      const updatedUser = await AuthService.updateMemberProfile(user.mitglied.id, data)
      setUser(updatedUser)
    } catch (error) {
      console.error('Member profile update failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const uploadProfilePhoto = async (file: File): Promise<void> => {
    if (!user?.mitglied) throw new Error('Mitgliedsdaten nicht verfügbar')
    
    try {
      setLoading(true)
      const updatedUser = await AuthService.uploadProfilePhoto(user.mitglied.id, file)
      setUser(updatedUser)
    } catch (error) {
      console.error('Profile photo upload failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      setLoading(true)
      await AuthService.changePassword(currentPassword, newPassword)
    } catch (error) {
      console.error('Password change failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const hasRole = (roles: string | string[]): boolean => {
    return AuthService.hasRole(user, roles)
  }

  const isMemberType = (types: string | string[]): boolean => {
    return AuthService.isMemberType(user, types)
  }

  const isAuthenticated = !!user && !!token

  const contextValue: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    updateMemberProfile,
    uploadProfilePhoto,
    changePassword,
    isAuthenticated,
    hasRole,
    isMemberType
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper hook for authentication status
export function useAuthStatus() {
  const { isAuthenticated, loading, user } = useAuth()
  
  return {
    isAuthenticated,
    loading,
    user,
    isLoggedIn: isAuthenticated && !loading
  }
}

// Helper hook for role checking
export function useRoles() {
  const { hasRole, isMemberType, user } = useAuth()
  
  // Check if user is Strapi Super Admin (has no mitglied relation but is authenticated)
  const isStrapiAdmin = user && !user.mitglied && user.confirmed && !user.blocked
  const isFrontendAdmin = hasRole(['admin', 'vorstand'])
  const isAnyAdmin = isStrapiAdmin || isFrontendAdmin
  
  return {
    hasRole,
    isMemberType,
    isAdmin: isAnyAdmin,
    isStrapiAdmin,
    isFrontendAdmin,
    isTrainer: hasRole('trainer'),
    isPlayer: hasRole('spieler'),
    isFan: isMemberType('fan'),
    userRole: user?.mitglied?.attributes?.benutzerrolle || (isStrapiAdmin ? 'super-admin' : 'authenticated'),
    memberType: user?.mitglied?.attributes?.mitgliedstyp
  }
} 