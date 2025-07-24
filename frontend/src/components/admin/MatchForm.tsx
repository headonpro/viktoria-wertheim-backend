'use client'

import { useState, useEffect } from 'react'
import { getApiUrl } from '@/lib/apiConfig'

interface Club {
  id: number
  attributes: {
    name: string
  }
}

interface Team {
  id: number
  attributes: {
    name: string
  }
}

interface Liga {
  id: number
  attributes: {
    name: string
  }
}

interface Saison {
  id: number
  attributes: {
    name: string
  }
}

interface ValidationError {
  field: string
  message: string
  code: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export default function MatchForm() {
  const [formData, setFormData] = useState({
    datum: '',
    heimclub: '',
    auswaertsclub: '',
    unser_team: '',
    liga: '',
    saison: '',
    ist_heimspiel: true,
    status: 'geplant',
    spielort: '',
    schiedsrichter: '',
    tore_heim: '',
    tore_auswaerts: ''
  })

  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [ligas, setLigas] = useState<Liga[]>([])
  const [saisons, setSaisons] = useState<Saison[]>([])
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Load reference data
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        const [clubsRes, teamsRes, ligasRes, saisonsRes] = await Promise.all([
          fetch(`${getApiUrl()}/api/clubs`),
          fetch(`${getApiUrl()}/api/teams`),
          fetch(`${getApiUrl()}/api/ligas`),
          fetch(`${getApiUrl()}/api/saisons`)
        ])

        const [clubsData, teamsData, ligasData, saisonsData] = await Promise.all([
          clubsRes.json(),
          teamsRes.json(),
          ligasRes.json(),
          saisonsRes.json()
        ])

        setClubs(clubsData.data || [])
        setTeams(teamsData.data || [])
        setLigas(ligasData.data || [])
        setSaisons(saisonsData.data || [])
      } catch (error) {
        console.error('Error loading reference data:', error)
      }
    }

    loadReferenceData()
  }, [])

  // Real-time validation
  const validateForm = async () => {
    if (!formData.datum || !formData.heimclub || !formData.auswaertsclub) {
      return // Don't validate incomplete forms
    }

    setIsValidating(true)
    try {
      const response = await fetch(`${getApiUrl()}/api/spiels/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: formData })
      })

      const validationResult = await response.json()
      setValidation(validationResult)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  // Validate on form changes (debounced)
  useEffect(() => {
    const timer = setTimeout(validateForm, 500)
    return () => clearTimeout(timer)
  }, [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors([])

    try {
      // Convert form data to proper types
      const submitData = {
        ...formData,
        heimclub: parseInt(formData.heimclub),
        auswaertsclub: parseInt(formData.auswaertsclub),
        unser_team: parseInt(formData.unser_team),
        liga: parseInt(formData.liga),
        saison: parseInt(formData.saison),
        tore_heim: formData.tore_heim ? parseInt(formData.tore_heim) : undefined,
        tore_auswaerts: formData.tore_auswaerts ? parseInt(formData.tore_auswaerts) : undefined,
        datum: new Date(formData.datum).toISOString()
      }

      const response = await fetch(`${getApiUrl()}/api/spiels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: submitData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        if (errorData.error?.details?.errors) {
          setErrors(errorData.error.details.errors)
        } else {
          setErrors([{
            field: 'general',
            message: errorData.error?.message || 'Unbekannter Fehler',
            code: 'UNKNOWN_ERROR'
          }])
        }
        return
      }

      const result = await response.json()
      alert('Spiel erfolgreich erstellt!')
      
      // Reset form
      setFormData({
        datum: '',
        heimclub: '',
        auswaertsclub: '',
        unser_team: '',
        liga: '',
        saison: '',
        ist_heimspiel: true,
        status: 'geplant',
        spielort: '',
        schiedsrichter: '',
        tore_heim: '',
        tore_auswaerts: ''
      })
      
    } catch (error) {
      console.error('Submit error:', error)
      setErrors([{
        field: 'general',
        message: 'Netzwerkfehler beim Erstellen des Spiels',
        code: 'NETWORK_ERROR'
      }])
    } finally {
      setLoading(false)
    }
  }

  const getFieldError = (fieldName: string) => {
    return errors.find(error => error.field === fieldName)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Neues Spiel erstellen</h2>
      
      {/* Validation Status */}
      {validation && (
        <div className="mb-6 p-4 rounded-lg border">
          {validation.isValid ? (
            <div className="text-green-700 bg-green-50 border-green-200">
              <h3 className="font-semibold mb-2">✅ Formular ist gültig</h3>
              {validation.suggestions.map((suggestion, index) => (
                <p key={index} className="text-sm">{suggestion}</p>
              ))}
            </div>
          ) : (
            <div className="text-red-700 bg-red-50 border-red-200">
              <h3 className="font-semibold mb-2">❌ Validierungsfehler</h3>
              {validation.errors.map((error, index) => (
                <p key={index} className="text-sm">• {error}</p>
              ))}
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mt-3 text-viktoria-yellow bg-viktoria-yellow/10 border-viktoria-yellow/30 p-3 rounded">
              <h4 className="font-semibold mb-1">⚠️ Warnungen</h4>
              {validation.warnings.map((warning, index) => (
                <p key={index} className="text-sm">• {warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Datum und Uhrzeit *
          </label>
          <input
            type="datetime-local"
            value={formData.datum}
            onChange={(e) => setFormData({...formData, datum: e.target.value})}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              getFieldError('datum') ? 'border-red-500' : 'border-gray-300'
            }`}
            required
          />
          {getFieldError('datum') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('datum')?.message}</p>
          )}
        </div>

        {/* Clubs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heimclub *
            </label>
            <select
              value={formData.heimclub}
              onChange={(e) => setFormData({...formData, heimclub: e.target.value})}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getFieldError('heimclub') ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Bitte wählen...</option>
              {clubs.map(club => (
                <option key={club.id} value={club.id}>
                  {club.attributes.name}
                </option>
              ))}
            </select>
            {getFieldError('heimclub') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('heimclub')?.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Auswärtsclub *
            </label>
            <select
              value={formData.auswaertsclub}
              onChange={(e) => setFormData({...formData, auswaertsclub: e.target.value})}
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                getFieldError('auswaertsclub') ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Bitte wählen...</option>
              {clubs.filter(club => club.id.toString() !== formData.heimclub).map(club => (
                <option key={club.id} value={club.id}>
                  {club.attributes.name}
                </option>
              ))}
            </select>
            {getFieldError('auswaertsclub') && (
              <p className="mt-1 text-sm text-red-600">{getFieldError('auswaertsclub')?.message}</p>
            )}
          </div>
        </div>

        {/* Team, Liga, Saison */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unser Team *
            </label>
            <select
              value={formData.unser_team}
              onChange={(e) => setFormData({...formData, unser_team: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Bitte wählen...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.attributes.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Liga *
            </label>
            <select
              value={formData.liga}
              onChange={(e) => setFormData({...formData, liga: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Bitte wählen...</option>
              {ligas.map(liga => (
                <option key={liga.id} value={liga.id}>
                  {liga.attributes.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Saison *
            </label>
            <select
              value={formData.saison}
              onChange={(e) => setFormData({...formData, saison: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Bitte wählen...</option>
              {saisons.map(saison => (
                <option key={saison.id} value={saison.id}>
                  {saison.attributes.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setFormData({
              datum: '',
              heimclub: '',
              auswaertsclub: '',
              unser_team: '',
              liga: '',
              saison: '',
              ist_heimspiel: true,
              status: 'geplant',
              spielort: '',
              schiedsrichter: '',
              tore_heim: '',
              tore_auswaerts: ''
            })}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Zurücksetzen
          </button>
          
          <button
            type="submit"
            disabled={loading || !validation?.isValid}
            className={`px-6 py-3 rounded-lg text-white font-medium ${
              loading || !validation?.isValid
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Erstelle...' : 'Spiel erstellen'}
          </button>
        </div>
      </form>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Fehler beim Erstellen:</h3>
          {errors.map((error, index) => (
            <p key={index} className="text-red-700 text-sm">
              <strong>{error.field}:</strong> {error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}