'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi, CreateMemberData, MemberWithUser } from '../lib/adminApi';
import { IconUsers, IconShirt, IconCalendar, IconTrophy, IconChartBar, IconSettings, IconShield, IconBell, IconFileText, IconMail } from '@tabler/icons-react';

// Admin Dashboard Hauptkomponente
export function AdminDashboard() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalTeams: 0,
    totalPlayers: 0,
    totalTrainings: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const dashboardStats = await adminApi.getDashboardStats();
        setStats(dashboardStats);
      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Statistiken:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <IconShield className="text-red-500" size={32} />
                Admin Dashboard
              </h1>
              <p className="text-slate-600 mt-2">Vollständige Vereinsverwaltung und Übersicht</p>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg">
              <span className="text-sm font-medium">Super Admin</span>
            </div>
          </div>
        </div>

        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Mitglieder gesamt</p>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? '...' : stats.totalMembers}
                </p>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <IconUsers className="text-blue-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Mannschaften</p>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? '...' : stats.totalTeams}
                </p>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <IconShirt className="text-green-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Aktive Spieler</p>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? '...' : stats.totalPlayers}
                </p>
              </div>
              <div className="bg-yellow-100 rounded-lg p-3">
                <IconTrophy className="text-yellow-600" size={24} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Trainings gesamt</p>
                <p className="text-2xl font-bold text-slate-800">
                  {loading ? '...' : stats.totalTrainings}
                </p>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <IconCalendar className="text-purple-600" size={24} />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Hauptfunktionen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          
          {/* Mitgliederverwaltung */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <IconUsers className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Mitgliederverwaltung</h3>
                <p className="text-slate-600 text-sm">Mitglieder erstellen, bearbeiten und verwalten</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → Alle Mitglieder anzeigen
              </button>
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-700 font-medium">
                → Neues Mitglied erstellen
              </button>
              <button className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-700 font-medium">
                → Mitgliedsdaten exportieren
              </button>
            </div>
          </motion.div>

          {/* Mannschaftsverwaltung */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-green-100 rounded-lg p-3">
                <IconShirt className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Mannschaftsverwaltung</h3>
                <p className="text-slate-600 text-sm">Teams und Spielerzuordnungen verwalten</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-700 font-medium">
                → Alle Mannschaften
              </button>
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → Neue Mannschaft erstellen
              </button>
              <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-purple-700 font-medium">
                → Trainer zuweisen
              </button>
            </div>
          </motion.div>

          {/* Trainings & Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-purple-100 rounded-lg p-3">
                <IconCalendar className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Training & Events</h3>
                <p className="text-slate-600 text-sm">Trainings und Veranstaltungen organisieren</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-purple-700 font-medium">
                → Trainingskalender
              </button>
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → Event erstellen
              </button>
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-700 font-medium">
                → Teilnehmerlisten
              </button>
            </div>
          </motion.div>

          {/* Berichte & Statistiken */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-yellow-100 rounded-lg p-3">
                <IconChartBar className="text-yellow-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Berichte & Analytics</h3>
                <p className="text-slate-600 text-sm">Statistiken und Auswertungen</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-700 font-medium">
                → Mitgliederstatistiken
              </button>
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → Trainingsberichte
              </button>
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-700 font-medium">
                → Finanzübersicht
              </button>
            </div>
          </motion.div>

          {/* System & Einstellungen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-red-100 rounded-lg p-3">
                <IconSettings className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">System & Einstellungen</h3>
                <p className="text-slate-600 text-sm">Systemkonfiguration und Verwaltung</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-red-700 font-medium">
                → Benutzerrollen verwalten
              </button>
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → System-Backup
              </button>
              <button className="w-full text-left p-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors text-yellow-700 font-medium">
                → Einstellungen
              </button>
            </div>
          </motion.div>

          {/* Kommunikation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:shadow-lg transition-all duration-300"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-indigo-100 rounded-lg p-3">
                <IconMail className="text-indigo-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Kommunikation</h3>
                <p className="text-slate-600 text-sm">Newsletter und Benachrichtigungen</p>
              </div>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left p-3 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-700 font-medium">
                → Newsletter versenden
              </button>
              <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 font-medium">
                → Mitteilungen erstellen
              </button>
              <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-green-700 font-medium">
                → E-Mail-Vorlagen
              </button>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Schnellzugriff</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all duration-200 group">
              <IconUsers className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-blue-700 text-sm font-medium">Mitglieder</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all duration-200 group">
              <IconShirt className="text-green-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-green-700 text-sm font-medium">Teams</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all duration-200 group">
              <IconCalendar className="text-purple-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-purple-700 text-sm font-medium">Events</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg hover:from-yellow-100 hover:to-yellow-200 transition-all duration-200 group">
              <IconChartBar className="text-yellow-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-yellow-700 text-sm font-medium">Berichte</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg hover:from-indigo-100 hover:to-indigo-200 transition-all duration-200 group">
              <IconMail className="text-indigo-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-indigo-700 text-sm font-medium">Newsletter</span>
            </button>
            <button className="flex flex-col items-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg hover:from-red-100 hover:to-red-200 transition-all duration-200 group">
              <IconSettings className="text-red-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <span className="text-red-700 text-sm font-medium">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FormErrors {
  [key: string]: string;
}

export default function AdminMemberManagement() {
  const [members, setMembers] = useState<MemberWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<CreateMemberData>({
    username: '',
    email: '',
    password: '',
    vorname: '',
    nachname: '',
    telefon: '',
    geburtsdatum: '',
    mitgliedstyp: 'fan',
    benutzerrolle: 'mitglied',
    mitgliedsnummer: '',
    beitrittsdatum: '',
    bemerkungen: '',
  });

  // Mitglieder laden
  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAllMembersWithUsers();
      setMembers(response.members);
    } catch (error) {
      console.error('Fehler beim Laden der Mitglieder:', error);
      setErrors({ general: 'Fehler beim Laden der Mitglieder' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Formular-Validierung
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.username.trim()) newErrors.username = 'Benutzername ist erforderlich';
    if (!formData.email.trim()) newErrors.email = 'E-Mail ist erforderlich';
    if (!formData.password.trim()) newErrors.password = 'Passwort ist erforderlich';
    if (!formData.vorname.trim()) newErrors.vorname = 'Vorname ist erforderlich';
    if (!formData.nachname.trim()) newErrors.nachname = 'Nachname ist erforderlich';
    if (!formData.mitgliedstyp) newErrors.mitgliedstyp = 'Mitgliedstyp ist erforderlich';

    // E-Mail-Format prüfen
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Ungültiges E-Mail-Format';
    }

    // Passwort-Länge prüfen
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Passwort muss mindestens 6 Zeichen lang sein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mitglied erstellen
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setCreating(true);
    setErrors({});

    try {
      await adminApi.createMemberWithUser(formData);
      
      setSuccessMessage('Mitglied erfolgreich erstellt!');
      setShowCreateForm(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        vorname: '',
        nachname: '',
        telefon: '',
        geburtsdatum: '',
        mitgliedstyp: 'fan',
        benutzerrolle: 'mitglied',
        mitgliedsnummer: '',
        beitrittsdatum: '',
        bemerkungen: '',
      });
      
      // Mitgliederliste neu laden
      await loadMembers();
      
      // Erfolgsmeldung nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error: any) {
      setErrors({ general: error.message });
    } finally {
      setCreating(false);
    }
  };

  // Mitglied löschen
  const handleDeleteMember = async (id: number, name: string) => {
    if (!confirm(`Möchten Sie das Mitglied "${name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }

    try {
      await adminApi.deleteMemberWithUser(id);
      setSuccessMessage('Mitglied erfolgreich gelöscht!');
      await loadMembers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrors({ general: error.message });
    }
  };

  // Automatische Username-Generierung
  const generateUsername = () => {
    if (formData.vorname && formData.nachname) {
      const username = `${formData.vorname.toLowerCase()}.${formData.nachname.toLowerCase()}`;
      setFormData(prev => ({ ...prev, username }));
    }
  };

  // Benutzerrolle basierend auf Mitgliedstyp setzen
  const handleMitgliedstypChange = (mitgliedstyp: string) => {
    let benutzerrolle = 'mitglied';
    if (mitgliedstyp === 'spieler') benutzerrolle = 'spieler';
    if (mitgliedstyp === 'trainer') benutzerrolle = 'trainer';
    
    setFormData(prev => ({ 
      ...prev, 
      mitgliedstyp: mitgliedstyp as any,
      benutzerrolle: benutzerrolle as any
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Mitgliederverwaltung</h1>
              <p className="text-slate-600 mt-2">Verwalten Sie Vereinsmitglieder und erstellen Sie neue Accounts</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {showCreateForm ? 'Abbrechen' : 'Neues Mitglied'}
            </button>
          </div>
        </div>

        {/* Erfolgsmeldung */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fehleranzeige */}
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {errors.general}
          </div>
        )}

        {/* Formular zum Erstellen neuer Mitglieder */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20"
            >
              <h2 className="text-2xl font-semibold text-slate-800 mb-6">Neues Mitglied erstellen</h2>
              
              <form onSubmit={handleCreateMember} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Grunddaten */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-700">Grunddaten</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Vorname *
                      </label>
                      <input
                        type="text"
                        value={formData.vorname}
                        onChange={(e) => setFormData(prev => ({ ...prev, vorname: e.target.value }))}
                        onBlur={generateUsername}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.vorname ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                      {errors.vorname && <p className="text-red-500 text-sm mt-1">{errors.vorname}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nachname *
                      </label>
                      <input
                        type="text"
                        value={formData.nachname}
                        onChange={(e) => setFormData(prev => ({ ...prev, nachname: e.target.value }))}
                        onBlur={generateUsername}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.nachname ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                      {errors.nachname && <p className="text-red-500 text-sm mt-1">{errors.nachname}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        E-Mail *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.email ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Telefon
                      </label>
                      <input
                        type="tel"
                        value={formData.telefon}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefon: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Geburtsdatum
                      </label>
                      <input
                        type="date"
                        value={formData.geburtsdatum}
                        onChange={(e) => setFormData(prev => ({ ...prev, geburtsdatum: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Account-Daten */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-700">Account-Daten</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Benutzername *
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.username ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      />
                      {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Passwort *
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.password ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                        minLength={6}
                      />
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mitgliedstyp *
                      </label>
                      <select
                        value={formData.mitgliedstyp}
                        onChange={(e) => handleMitgliedstypChange(e.target.value)}
                        className={`w-full px-4 py-2 rounded-lg border ${errors.mitgliedstyp ? 'border-red-300' : 'border-slate-300'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        required
                      >
                        <option value="fan">Fan</option>
                        <option value="spieler">Spieler</option>
                        <option value="trainer">Trainer</option>
                        <option value="familie">Familie</option>
                        <option value="ehrenmitglied">Ehrenmitglied</option>
                        <option value="funktionaer">Funktionär</option>
                      </select>
                      {errors.mitgliedstyp && <p className="text-red-500 text-sm mt-1">{errors.mitgliedstyp}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Benutzerrolle
                      </label>
                      <select
                        value={formData.benutzerrolle}
                        onChange={(e) => setFormData(prev => ({ ...prev, benutzerrolle: e.target.value as any }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="mitglied">Mitglied</option>
                        <option value="spieler">Spieler</option>
                        <option value="trainer">Trainer</option>
                        <option value="admin">Admin</option>
                        <option value="vorstand">Vorstand</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mitgliedsnummer
                      </label>
                      <input
                        type="text"
                        value={formData.mitgliedsnummer}
                        onChange={(e) => setFormData(prev => ({ ...prev, mitgliedsnummer: e.target.value }))}
                        placeholder="Wird automatisch generiert"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Beitrittsdatum
                      </label>
                      <input
                        type="date"
                        value={formData.beitrittsdatum}
                        onChange={(e) => setFormData(prev => ({ ...prev, beitrittsdatum: e.target.value }))}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Zusätzliche Informationen */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-700">Zusätzliche Informationen</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Bemerkungen
                      </label>
                      <textarea
                        value={formData.bemerkungen}
                        onChange={(e) => setFormData(prev => ({ ...prev, bemerkungen: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Zusätzliche Informationen..."
                      />
                    </div>
                  </div>
                </div>

                {/* Submit-Button */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-6 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Erstelle...' : 'Mitglied erstellen'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mitgliederliste */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-slate-800 mb-6">Alle Mitglieder</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-600 mt-4">Lade Mitglieder...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Mitgliedsnummer</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">E-Mail</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Typ</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Rolle</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Account</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-800">{member.mitgliedsnummer}</td>
                      <td className="py-3 px-4 text-slate-800">{member.vorname} {member.nachname}</td>
                      <td className="py-3 px-4 text-slate-600">{member.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.mitgliedstyp === 'trainer' ? 'bg-purple-100 text-purple-800' :
                          member.mitgliedstyp === 'spieler' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.mitgliedstyp}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.benutzerrolle === 'admin' ? 'bg-red-100 text-red-800' :
                          member.benutzerrolle === 'trainer' ? 'bg-purple-100 text-purple-800' :
                          member.benutzerrolle === 'spieler' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.benutzerrolle}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          member.mitgliedsstatus === 'aktiv' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {member.mitgliedsstatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {member.user ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.user.confirmed && !member.user.blocked 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {member.user.confirmed && !member.user.blocked ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Kein Account
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteMember(member.id, `${member.vorname} ${member.nachname}`)}
                          className="text-red-600 hover:text-red-800 transition-colors text-sm font-medium"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {members.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  Keine Mitglieder gefunden.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 