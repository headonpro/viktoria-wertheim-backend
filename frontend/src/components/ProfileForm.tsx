'use client'

import React, { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ProfileFormData, 
  PasswordChangeData, 
  FormState, 
  ProfileTab,
  MemberProfileUpdateData,
  ProfileUpdateData 
} from '@/types/auth'
import { motion } from 'framer-motion'
import Image from "next/image";

interface ProfileFormProps {
  onSuccess?: () => void
}

export default function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { user, updateProfile, updateMemberProfile, uploadProfilePhoto, changePassword } = useAuth()
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal')
  const [formState, setFormState] = useState<FormState>({
    loading: false,
    error: null,
    success: null
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form data states
  const [personalData, setPersonalData] = useState<MemberProfileUpdateData>({
    vorname: user?.mitglied?.attributes?.vorname || '',
    nachname: user?.mitglied?.attributes?.nachname || '',
    email: user?.mitglied?.attributes?.email || user?.email || '',
    telefon: user?.mitglied?.attributes?.telefon || '',
    geburtsdatum: user?.mitglied?.attributes?.geburtsdatum || '',
    bemerkungen: user?.mitglied?.attributes?.bemerkungen || ''
  })

  const [contactData, setContactData] = useState({
    adresse: {
      strasse: user?.mitglied?.attributes?.adresse?.data?.strasse || '',
      hausnummer: user?.mitglied?.attributes?.adresse?.data?.hausnummer || '',
      plz: user?.mitglied?.attributes?.adresse?.data?.plz || '',
      ort: user?.mitglied?.attributes?.adresse?.data?.ort || '',
      land: user?.mitglied?.attributes?.adresse?.data?.land || 'Deutschland'
    },
    notfallkontakt: {
      name: user?.mitglied?.attributes?.notfallkontakt?.data?.name || '',
      beziehung: user?.mitglied?.attributes?.notfallkontakt?.data?.beziehung || '',
      telefon: user?.mitglied?.attributes?.notfallkontakt?.data?.telefon || '',
      email: user?.mitglied?.attributes?.notfallkontakt?.data?.email || ''
    }
  })

  const [accountData, setAccountData] = useState<ProfileUpdateData>({
    username: user?.username || '',
    email: user?.email || ''
  })

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  })

  const [preferences, setPreferences] = useState({
    newsletter_aktiv: user?.mitglied?.attributes?.newsletter_aktiv ?? true
  })

  const resetFormState = () => {
    setFormState({ loading: false, error: null, success: null })
  }

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetFormState()
    
    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await updateMemberProfile(personalData)
      setFormState(prev => ({ ...prev, success: 'Persönliche Daten erfolgreich aktualisiert!' }))
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetFormState()
    
    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await updateMemberProfile({
        adresse: contactData.adresse,
        notfallkontakt: contactData.notfallkontakt
      })
      setFormState(prev => ({ ...prev, success: 'Kontaktdaten erfolgreich aktualisiert!' }))
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetFormState()
    
    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await updateProfile(accountData)
      setFormState(prev => ({ ...prev, success: 'Account-Daten erfolgreich aktualisiert!' }))
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetFormState()
    
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      setFormState(prev => ({ ...prev, error: 'Neue Passwörter stimmen nicht überein!' }))
      return
    }

    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setFormState(prev => ({ ...prev, success: 'Passwort erfolgreich geändert!' }))
      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' })
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetFormState()
    
    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await updateMemberProfile(preferences)
      setFormState(prev => ({ ...prev, success: 'Einstellungen erfolgreich aktualisiert!' }))
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setFormState(prev => ({ ...prev, error: 'Bitte wählen Sie eine Bilddatei aus!' }))
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setFormState(prev => ({ ...prev, error: 'Die Datei ist zu groß. Maximum: 5MB' }))
      return
    }

    resetFormState()
    
    try {
      setFormState(prev => ({ ...prev, loading: true }))
      await uploadProfilePhoto(file)
      setFormState(prev => ({ ...prev, success: 'Profilfoto erfolgreich hochgeladen!' }))
      onSuccess?.()
    } catch (error: any) {
      setFormState(prev => ({ ...prev, error: error.message }))
    } finally {
      setFormState(prev => ({ ...prev, loading: false }))
    }
  }

  const tabs = [
    { id: 'personal' as ProfileTab, label: 'Persönliche Daten', icon: '👤' },
    { id: 'contact' as ProfileTab, label: 'Kontakt & Adresse', icon: '📍' },
    { id: 'membership' as ProfileTab, label: 'Mitgliedschaft', icon: '🏆' },
    { id: 'security' as ProfileTab, label: 'Sicherheit', icon: '🔒' },
    { id: 'preferences' as ProfileTab, label: 'Einstellungen', icon: '⚙️' }
  ]

  const membershipStatus = {
    'aktiv': { label: 'Aktiv', color: 'text-green-600', bg: 'bg-green-100' },
    'inaktiv': { label: 'Inaktiv', color: 'text-gray-600', bg: 'bg-gray-100' },
    'pausiert': { label: 'Pausiert', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'gekuendigt': { label: 'Gekündigt', color: 'text-red-600', bg: 'bg-red-100' }
  }

  const paymentStatus = {
    'aktuell': { label: 'Aktuell', color: 'text-green-600', bg: 'bg-green-100' },
    'ueberfaellig': { label: 'Überfällig', color: 'text-orange-600', bg: 'bg-orange-100' },
    'mahnung_1': { label: '1. Mahnung', color: 'text-red-600', bg: 'bg-red-100' },
    'mahnung_2': { label: '2. Mahnung', color: 'text-red-700', bg: 'bg-red-200' },
    'inkasso': { label: 'Inkasso', color: 'text-red-800', bg: 'bg-red-300' }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with Profile Photo */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-white">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
              {user?.mitglied?.attributes?.profilfoto?.data ? (
                <Image 
                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${user.mitglied.attributes.profilfoto.data.attributes.url}`}
                  alt="Profilfoto"
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-white text-green-600 p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              disabled={formState.loading}
            >
              📷
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {user?.mitglied?.attributes?.vorname} {user?.mitglied?.attributes?.nachname}
            </h1>
            <p className="text-green-100">
              Mitgliedsnummer: {user?.mitglied?.attributes?.mitgliedsnummer}
            </p>
            <p className="text-green-100 capitalize">
              {user?.mitglied?.attributes?.mitgliedstyp} | {user?.mitglied?.attributes?.benutzerrolle}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Form Messages */}
      {(formState.error || formState.success) && (
        <div className="p-4">
          {formState.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {formState.error}
            </div>
          )}
          {formState.success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
              {formState.success}
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Personal Data Tab */}
          {activeTab === 'personal' && (
            <form onSubmit={handlePersonalSubmit} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Persönliche Daten</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vorname *
                  </label>
                  <input
                    type="text"
                    value={personalData.vorname}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, vorname: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nachname *
                  </label>
                  <input
                    type="text"
                    value={personalData.nachname}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, nachname: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={personalData.telefon}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, telefon: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geburtsdatum
                  </label>
                  <input
                    type="date"
                    value={personalData.geburtsdatum}
                    onChange={(e) => setPersonalData(prev => ({ ...prev, geburtsdatum: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bemerkungen
                </label>
                <textarea
                  value={personalData.bemerkungen}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, bemerkungen: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Zusätzliche Informationen..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formState.loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formState.loading ? 'Speichern...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>
          )}

          {/* Contact & Address Tab */}
          {activeTab === 'contact' && (
            <form onSubmit={handleContactSubmit} className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Adresse</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Straße
                        </label>
                        <input
                          type="text"
                          value={contactData.adresse.strasse}
                          onChange={(e) => setContactData(prev => ({
                            ...prev,
                            adresse: { ...prev.adresse, strasse: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nr.
                        </label>
                        <input
                          type="text"
                          value={contactData.adresse.hausnummer}
                          onChange={(e) => setContactData(prev => ({
                            ...prev,
                            adresse: { ...prev.adresse, hausnummer: e.target.value }
                          }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PLZ
                    </label>
                    <input
                      type="text"
                      value={contactData.adresse.plz}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        adresse: { ...prev.adresse, plz: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ort
                    </label>
                    <input
                      type="text"
                      value={contactData.adresse.ort}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        adresse: { ...prev.adresse, ort: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Land
                    </label>
                    <input
                      type="text"
                      value={contactData.adresse.land}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        adresse: { ...prev.adresse, land: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notfallkontakt</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={contactData.notfallkontakt.name}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        notfallkontakt: { ...prev.notfallkontakt, name: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beziehung
                    </label>
                    <select
                      value={contactData.notfallkontakt.beziehung}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        notfallkontakt: { ...prev.notfallkontakt, beziehung: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Bitte wählen...</option>
                      <option value="Ehepartner/in">Ehepartner/in</option>
                      <option value="Lebensgefährte/in">Lebensgefährte/in</option>
                      <option value="Mutter">Mutter</option>
                      <option value="Vater">Vater</option>
                      <option value="Bruder">Bruder</option>
                      <option value="Schwester">Schwester</option>
                      <option value="Freund/in">Freund/in</option>
                      <option value="Andere">Andere</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={contactData.notfallkontakt.telefon}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        notfallkontakt: { ...prev.notfallkontakt, telefon: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail
                    </label>
                    <input
                      type="email"
                      value={contactData.notfallkontakt.email}
                      onChange={(e) => setContactData(prev => ({
                        ...prev,
                        notfallkontakt: { ...prev.notfallkontakt, email: e.target.value }
                      }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formState.loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formState.loading ? 'Speichern...' : 'Kontaktdaten speichern'}
                </button>
              </div>
            </form>
          )}

          {/* Membership Tab */}
          {activeTab === 'membership' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Mitgliedschaftsinformationen</h2>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Mitgliedsnummer</h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.mitglied?.attributes?.mitgliedsnummer}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Mitgliedsstatus</h3>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      membershipStatus[user?.mitglied?.attributes?.mitgliedsstatus || 'aktiv']?.bg
                    } ${membershipStatus[user?.mitglied?.attributes?.mitgliedsstatus || 'aktiv']?.color}`}>
                      {membershipStatus[user?.mitglied?.attributes?.mitgliedsstatus || 'aktiv']?.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Mitgliedstyp</h3>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {user?.mitglied?.attributes?.mitgliedstyp}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Benutzerrolle</h3>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {user?.mitglied?.attributes?.benutzerrolle}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Beitrittsdatum</h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.mitglied?.attributes?.beitrittsdatum && 
                        new Date(user.mitglied.attributes.beitrittsdatum).toLocaleDateString('de-DE')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Zahlungsstatus</h3>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      paymentStatus[user?.mitglied?.attributes?.zahlungsstatus || 'aktuell']?.bg
                    } ${paymentStatus[user?.mitglied?.attributes?.zahlungsstatus || 'aktuell']?.color}`}>
                      {paymentStatus[user?.mitglied?.attributes?.zahlungsstatus || 'aktuell']?.label}
                    </span>
                  </div>
                </div>

                {user?.mitglied?.attributes?.letzter_beitrag && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Letzter Beitrag</h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(user.mitglied.attributes.letzter_beitrag).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-blue-400 text-xl">ℹ️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Hinweis
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Änderungen am Mitgliedsstatus oder der Rolle können nur von der Vereinsführung vorgenommen werden. 
                        Bei Fragen wenden Sie sich bitte an den Vorstand.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account-Sicherheit</h2>
                
                <form onSubmit={handleAccountSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Benutzername
                      </label>
                      <input
                        type="text"
                        value={accountData.username}
                        onChange={(e) => setAccountData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account E-Mail
                      </label>
                      <input
                        type="email"
                        value={accountData.email}
                        onChange={(e) => setAccountData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={formState.loading}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {formState.loading ? 'Speichern...' : 'Account-Daten speichern'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Passwort ändern</h3>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aktuelles Passwort
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Neues Passwort
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Neues Passwort bestätigen
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmNewPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={formState.loading}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {formState.loading ? 'Ändern...' : 'Passwort ändern'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Einstellungen</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Newsletter</h3>
                    <p className="text-sm text-gray-500">
                      Erhalten Sie Updates über Vereinsnachrichten und Veranstaltungen
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.newsletter_aktiv}
                      onChange={(e) => setPreferences(prev => ({ ...prev, newsletter_aktiv: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={formState.loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {formState.loading ? 'Speichern...' : 'Einstellungen speichern'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
} 