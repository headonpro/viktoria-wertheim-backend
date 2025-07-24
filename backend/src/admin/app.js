export default {
  config: {
    // Disable video tutorials
    tutorials: false,
    // Disable notifications about new Strapi features
    notifications: { releases: false },
    
    // Custom theme and branding
    theme: {
      light: {},
      dark: {
        colors: {
          primary100: '#1c5282',
          primary200: '#1c5282',
          primary500: '#1c5282',
          primary600: '#1c5282',
          primary700: '#1c5282',
        },
      },
    },
    
    // Localization
    locales: ['de'],
    
    // Custom translations for better error messages
    translations: {
      de: {
        'content-manager.containers.Edit.submit': 'Speichern',
        'content-manager.containers.Edit.reset': 'Zurücksetzen',
        'content-manager.error.validation.required': 'Dieses Feld ist erforderlich',
        'content-manager.error.validation.invalid': 'Ungültiger Wert',
        'content-manager.error.validation.enum': 'Wert muss einer der erlaubten Optionen sein',
        'content-manager.success.record.save': 'Erfolgreich gespeichert',
        'content-manager.success.record.delete': 'Erfolgreich gelöscht',
        
        // Custom error messages for our specific validations
        'validation.error.invalid-status': 'Ungültiger Status. Erlaubte Werte: aktiv, inaktiv, pausiert',
        'validation.error.team-club-mismatch': 'Team gehört nicht zum angegebenen Verein',
        'validation.error.liga-saison-mismatch': 'Liga und Saison sind nicht konsistent',
      }
    }
  },
  
  bootstrap(app) {
    // Custom bootstrap logic
    console.log('Strapi Admin Panel initialized with custom configuration');
  },
};