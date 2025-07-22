import { strapi } from './strapi'
import { AuthResponse, LoginCredentials, RegisterData, User, AuthError } from '@/types/auth'

export class AuthService {
  private static readonly TOKEN_KEY = 'viktoria_auth_token'
  private static readonly USER_KEY = 'viktoria_user_data'

  // Token Management
  static saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token)
    }
  }

  static getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY)
    }
    return null
  }

  static removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
    }
  }

  // User Data Management
  static saveUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user))
    }
  }

  static getUser(): User | null {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem(this.USER_KEY)
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  // API Calls
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await strapi.post('/auth/local', credentials)
      
      if (response.data.jwt && response.data.user) {
        // Fetch additional member data
        const userWithMember = await this.fetchUserWithMember(response.data.user.id, response.data.jwt)
        
        const authResponse: AuthResponse = {
          jwt: response.data.jwt,
          user: userWithMember
        }

        this.saveToken(authResponse.jwt)
        this.saveUser(authResponse.user)
        
        return authResponse
      } else {
        throw new Error('Ungültige Antwort vom Server')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      throw this.handleAuthError(error)
    }
  }

  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      // Validate password confirmation
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwörter stimmen nicht überein')
      }

      // Prepare registration data
      const { confirmPassword, ...registrationData } = data
      
      // Register user
      const response = await strapi.post('/auth/local/register', registrationData)
      
      if (response.data.jwt && response.data.user) {
        // Create member profile
        const memberData = {
          data: {
            mitgliedsnummer: this.generateMemberNumber(),
            vorname: data.vorname,
            nachname: data.nachname,
            email: data.email,
            telefon: data.telefon,
            geburtsdatum: data.geburtsdatum,
            mitgliedsstatus: 'aktiv',
            mitgliedstyp: data.mitgliedstyp,
            beitrittsdatum: new Date().toISOString().split('T')[0],
            benutzerrolle: this.mapMemberTypeToRole(data.mitgliedstyp),
            datenschutz_akzeptiert: data.datenschutz_akzeptiert,
            newsletter_aktiv: data.newsletter_aktiv || true,
            user: response.data.user.id
          }
        }

        // Create member entry with authentication
        await strapi.post('/mitglieds', memberData, {
          headers: {
            Authorization: `Bearer ${response.data.jwt}`
          }
        })

        // Fetch complete user data with member relation
        const userWithMember = await this.fetchUserWithMember(response.data.user.id, response.data.jwt)
        
        const authResponse: AuthResponse = {
          jwt: response.data.jwt,
          user: userWithMember
        }

        this.saveToken(authResponse.jwt)
        this.saveUser(authResponse.user)
        
        return authResponse
      } else {
        throw new Error('Ungültige Antwort vom Server')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      throw this.handleAuthError(error)
    }
  }

  static async fetchUserWithMember(userId?: number, token?: string): Promise<User> {
    const authToken = token || this.getToken()
    if (!authToken) throw new Error('Nicht authentifiziert')

    try {
      // Use /users/me endpoint which is the correct endpoint for Users-Permissions
      const userResponse = await strapi.get('/users/me', {
        params: {
          populate: {
            mitglied: {
              populate: ['profilfoto', 'adresse', 'notfallkontakt']
            }
          }
        },
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      return userResponse.data
    } catch (error) {
      console.error('Error fetching user with member data:', error)
      // Return basic user data if member fetch fails
      const userResponse = await strapi.get('/users/me', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
      return userResponse.data
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    const token = this.getToken()
    if (!token) return null

    try {
      const response = await strapi.get('/users/me', {
        params: {
          populate: {
            mitglied: {
              populate: ['profilfoto', 'adresse', 'notfallkontakt']
            }
          }
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const user = response.data
      this.saveUser(user)
      return user
    } catch (error) {
      console.error('Error fetching current user:', error)
      this.removeToken()
      return null
    }
  }

  static async updateProfile(userId: number, data: any): Promise<User> {
    const token = this.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      // Use /users/me for updating current user profile
      const response = await strapi.put('/users/me', data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const updatedUser = await this.fetchUserWithMember()
      this.saveUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      console.error('Profile update error:', error)
      throw this.handleAuthError(error)
    }
  }

  // Member Profile Management
  static async updateMemberProfile(memberId: number, data: any): Promise<User> {
    const token = this.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.put(`/mitglieds/${memberId}`, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // Refresh user data
      const updatedUser = await this.fetchUserWithMember()
      this.saveUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      console.error('Member profile update error:', error)
      throw this.handleAuthError(error)
    }
  }

  // Profile Photo Upload
  static async uploadProfilePhoto(memberId: number, file: File): Promise<User> {
    const token = this.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      // Upload file
      const formData = new FormData()
      formData.append('files', file)
      formData.append('ref', 'api::mitglied.mitglied')
      formData.append('refId', memberId.toString())
      formData.append('field', 'profilfoto')

      const uploadResponse = await strapi.post('/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      // Refresh user data
      const updatedUser = await this.fetchUserWithMember()
      this.saveUser(updatedUser)
      return updatedUser
    } catch (error: any) {
      console.error('Profile photo upload error:', error)
      throw this.handleAuthError(error)
    }
  }

  // Password Change
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = this.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.post('/auth/change-password', {
        currentPassword,
        password: newPassword,
        passwordConfirmation: newPassword
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error: any) {
      console.error('Password change error:', error)
      throw this.handleAuthError(error)
    }
  }

  static logout(): void {
    this.removeToken()
  }

  // Helper Methods
  private static generateMemberNumber(): string {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `VW${year}${random}`
  }

  private static mapMemberTypeToRole(memberType: string): string {
    const roleMap: { [key: string]: string } = {
      'spieler': 'spieler',
      'trainer': 'trainer',
      'fan': 'mitglied',
      'familie': 'mitglied',
      'ehrenmitglied': 'mitglied',
      'funktionaer': 'admin'
    }
    return roleMap[memberType] || 'mitglied'
  }

  private static handleAuthError(error: any): AuthError {
    if (error.response?.data?.error) {
      const strapiError = error.response.data.error
      return {
        message: strapiError.message || 'Ein Fehler ist aufgetreten',
        details: strapiError.details
      }
    }
    
    if (error.message) {
      return { message: error.message }
    }

    return { message: 'Ein unbekannter Fehler ist aufgetreten' }
  }

  // Role and Permission Helpers
  static hasRole(user: User | null, roles: string | string[]): boolean {
    if (!user?.mitglied?.attributes?.benutzerrolle) return false
    
    const userRole = user.mitglied.attributes.benutzerrolle
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    
    return allowedRoles.includes(userRole)
  }

  static isMemberType(user: User | null, types: string | string[]): boolean {
    if (!user?.mitglied?.attributes?.mitgliedstyp) return false
    
    const userType = user.mitglied.attributes.mitgliedstyp
    const allowedTypes = Array.isArray(types) ? types : [types]
    
    return allowedTypes.includes(userType)
  }
} 