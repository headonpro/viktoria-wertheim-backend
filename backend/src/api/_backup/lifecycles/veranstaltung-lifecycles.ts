/**
 * veranstaltung lifecycles - Ultra-simplified version
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Set default values
    if (data.oeffentlich === undefined) {
      data.oeffentlich = true;
    }
    
    if (data.anmeldung_erforderlich === undefined) {
      data.anmeldung_erforderlich = false;
    }
  },

  async afterCreate(event) {
    const { result } = event;
    strapi.log.info(`Created event: ${result.titel} on ${result.datum}`);
  }
};