/**
 * Admin panel extensions for Spiel collection
 * Integrates enhanced game creation interface with club selection
 */

import React from 'react';
import EnhancedGameForm from './components/EnhancedGameForm';
import SpielEditView from './components/SpielEditView';

export default {
  config: {
    locales: ['de'],
  },
  
  bootstrap(app) {
    // Register custom components for Spiel collection
    app.addComponents([
      {
        name: 'EnhancedGameForm',
        Component: EnhancedGameForm,
      },
      {
        name: 'SpielEditView', 
        Component: SpielEditView,
      }
    ]);

    // Customize the Spiel collection admin interface
    app.customizeCollectionType('api::spiel.spiel', {
      // Override the create view to use enhanced form
      createView: {
        component: 'EnhancedGameForm',
        props: {
          isCreating: true,
          enableRealTimeValidation: true,
          showValidationDetails: true
        }
      },
      
      // Override the edit view to use enhanced form
      editView: {
        component: 'SpielEditView',
        props: {
          isCreating: false,
          enableRealTimeValidation: true,
          showValidationDetails: true
        }
      },

      // Customize list view columns
      listView: {
        columns: [
          {
            name: 'datum',
            label: 'Datum',
            sortable: true,
            searchable: false,
            type: 'date'
          },
          {
            name: 'heim_club',
            label: 'Heim-Club',
            sortable: true,
            searchable: true,
            type: 'relation',
            targetModel: 'api::club.club',
            displayField: 'name'
          },
          {
            name: 'gast_club',
            label: 'Gast-Club', 
            sortable: true,
            searchable: true,
            type: 'relation',
            targetModel: 'api::club.club',
            displayField: 'name'
          },
          {
            name: 'liga',
            label: 'Liga',
            sortable: true,
            searchable: true,
            type: 'relation',
            targetModel: 'api::liga.liga',
            displayField: 'name'
          },
          {
            name: 'spieltag',
            label: 'Spieltag',
            sortable: true,
            searchable: false,
            type: 'number'
          },
          {
            name: 'status',
            label: 'Status',
            sortable: true,
            searchable: false,
            type: 'enumeration'
          },
          {
            name: 'ergebnis',
            label: 'Ergebnis',
            sortable: false,
            searchable: false,
            type: 'custom',
            render: (data) => {
              if (data.status === 'beendet' && data.heim_tore !== null && data.gast_tore !== null) {
                return `${data.heim_tore}:${data.gast_tore}`;
              }
              return '-';
            }
          }
        ],
        
        // Default filters
        filters: [
          {
            name: 'liga',
            type: 'relation',
            targetModel: 'api::liga.liga'
          },
          {
            name: 'saison',
            type: 'relation', 
            targetModel: 'api::saison.saison'
          },
          {
            name: 'status',
            type: 'enumeration',
            options: [
              { value: 'geplant', label: 'Geplant' },
              { value: 'beendet', label: 'Beendet' },
              { value: 'abgesagt', label: 'Abgesagt' },
              { value: 'verschoben', label: 'Verschoben' }
            ]
          }
        ],

        // Default sorting
        defaultSort: {
          field: 'datum',
          order: 'desc'
        },

        // Bulk actions
        bulkActions: [
          {
            name: 'markAsCompleted',
            label: 'Als beendet markieren',
            icon: 'check',
            action: async (selectedItems) => {
              // Custom bulk action implementation
              console.log('Marking games as completed:', selectedItems);
            }
          }
        ]
      },

      // Add custom menu items
      menu: {
        items: [
          {
            name: 'validation-tools',
            label: 'Validierungstools',
            icon: 'check-circle',
            to: '/plugins/spiel/validation-tools'
          },
          {
            name: 'club-management',
            label: 'Club-Verwaltung',
            icon: 'users',
            to: '/content-manager/collectionType/api::club.club'
          }
        ]
      }
    });

    // Add custom validation middleware for admin operations
    app.addMiddleware('spiel-validation', {
      beforeCreate: async (data, { strapi }) => {
        const gameValidationService = strapi.service('api::spiel.game-validation');
        const validation = await gameValidationService.validateGameCreation(data);
        
        if (!validation.isValid) {
          throw new Error(`Validierung fehlgeschlagen: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        return data;
      },
      
      beforeUpdate: async (data, { strapi, id }) => {
        const gameValidationService = strapi.service('api::spiel.game-validation');
        const validation = await gameValidationService.validateGameUpdate(data, id);
        
        if (!validation.isValid) {
          throw new Error(`Validierung fehlgeschlagen: ${validation.errors.map(e => e.message).join(', ')}`);
        }
        
        return data;
      }
    });

    // Register custom admin pages
    app.addMenuLink({
      to: '/plugins/spiel/dashboard',
      icon: 'dashboard',
      intlLabel: {
        id: 'spiel.dashboard.title',
        defaultMessage: 'Spiel Dashboard'
      },
      permissions: [
        {
          action: 'plugin::spiel.read',
          subject: null
        }
      ]
    });

    // Add custom settings page
    app.addSettingsLink('global', {
      intlLabel: {
        id: 'spiel.settings.title',
        defaultMessage: 'Spiel Einstellungen'
      },
      id: 'spiel-settings',
      to: '/settings/spiel',
      icon: 'cog',
      permissions: [
        {
          action: 'admin::spiel.settings.read',
          subject: null
        }
      ]
    });
  },

  // Custom translations
  translations: {
    de: {
      'spiel.dashboard.title': 'Spiel Dashboard',
      'spiel.settings.title': 'Spiel Einstellungen',
      'spiel.form.enhanced.title': 'Erweiterte Spiel-Erstellung',
      'spiel.validation.realtime': 'Echtzeitvalidierung',
      'spiel.club.selection': 'Club-Auswahl',
      'spiel.club.filter.liga': 'Nach Liga filtern',
      'spiel.validation.errors': 'Validierungsfehler',
      'spiel.validation.warnings': 'Hinweise',
      'spiel.form.autosave': 'Automatisch speichern',
      'spiel.form.preview': 'Vorschau',
      'spiel.club.required': 'Club-Auswahl erforderlich',
      'spiel.club.same': 'Club kann nicht gegen sich selbst spielen',
      'spiel.club.inactive': 'Club ist nicht aktiv',
      'spiel.club.not.in.liga': 'Club ist nicht in dieser Liga'
    }
  }
};