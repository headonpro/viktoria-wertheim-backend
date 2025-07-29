// Temporarily disabled due to @strapi/design-system dependency conflicts
// import ClubManagementView from './components/ClubManagementView.jsx';
// import BulkImportExport from './components/BulkImportExport.jsx';
// import LigaAssignmentManager from './components/LigaAssignmentManager.jsx';
// import ClubLogoManager from './components/ClubLogoManager.jsx';

export default {
  config: {
    locales: ['en', 'de'],
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'Viktoria Wertheim Admin',
        'app.components.LeftMenu.navbrand.workplace': 'Club Management'
      },
      de: {
        'app.components.LeftMenu.navbrand.title': 'Viktoria Wertheim Admin',
        'app.components.LeftMenu.navbrand.workplace': 'Vereinsverwaltung'
      }
    },
    theme: {
      colors: {
        primary100: '#f6ecfc',
        primary200: '#e0c1f4',
        primary500: '#ac73e6',
        primary600: '#9736e8',
        primary700: '#8312d1',
        danger700: '#b72b1a'
      }
    }
  },
  bootstrap(app) {
    // Temporarily disabled admin customizations due to dependency conflicts
    console.log('Club admin extensions temporarily disabled');
  }
};