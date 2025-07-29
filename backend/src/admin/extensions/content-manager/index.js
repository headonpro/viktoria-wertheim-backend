export default {
  config: {
    // Custom configurations for content types
    contentTypes: {
      'api::spiel.spiel': {
        // Custom field configurations
        fieldConfigurations: {
          heim_club: {
            hint: 'Wählen Sie den Heim-Club aus. Wird automatisch nach Liga gefiltert.',
          },
          gast_club: {
            hint: 'Wählen Sie den Gast-Club aus. Wird automatisch nach Liga gefiltert.',
          },
          heim_team: {
            hint: 'VERALTET: Verwenden Sie stattdessen Club-Felder. Nur für Rückwärtskompatibilität.',
          },
          gast_team: {
            hint: 'VERALTET: Verwenden Sie stattdessen Club-Felder. Nur für Rückwärtskompatibilität.',
          },
        },
        // Custom layout configuration
        layouts: {
          edit: [
            [
              {
                name: 'datum',
                size: 6,
              },
              {
                name: 'spieltag',
                size: 6,
              },
            ],
            [
              {
                name: 'liga',
                size: 6,
              },
              {
                name: 'saison',
                size: 6,
              },
            ],
            [
              {
                name: 'status',
                size: 12,
              },
            ],
            // Club fields section
            [
              {
                name: 'heim_club',
                size: 6,
              },
              {
                name: 'gast_club',
                size: 6,
              },
            ],
            // Score fields
            [
              {
                name: 'heim_tore',
                size: 6,
              },
              {
                name: 'gast_tore',
                size: 6,
              },
            ],
            // Legacy team fields (collapsed by default)
            [
              {
                name: 'heim_team',
                size: 6,
              },
              {
                name: 'gast_team',
                size: 6,
              },
            ],
            [
              {
                name: 'notizen',
                size: 12,
              },
            ],
          ],
        },
      },
    },
  },
};