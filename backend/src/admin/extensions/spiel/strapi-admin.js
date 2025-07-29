export default {
  config: {
    // Custom configuration for Spiel admin panel
    contentTypes: {
      'api::spiel.spiel': {
        // Custom edit view configuration
        editView: {
          components: {
            heim_club: {
              type: 'club-select',
              props: {
                placeholder: 'Heim-Club auswählen...'
              }
            },
            gast_club: {
              type: 'club-select', 
              props: {
                placeholder: 'Gast-Club auswählen...'
              }
            }
          }
        }
      }
    }
  }
};