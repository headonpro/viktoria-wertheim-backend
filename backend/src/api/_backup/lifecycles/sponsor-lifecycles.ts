/**
 * Sponsor content type lifecycles - Ultra-simplified version
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Set default ordering based on category if not provided
    if (!data.reihenfolge && data.kategorie) {
      switch (data.kategorie) {
        case 'Hauptsponsor':
          data.reihenfolge = 100;
          break;
        case 'Premium':
          data.reihenfolge = 200;
          break;
        case 'Partner':
          data.reihenfolge = 300;
          break;
        default:
          data.reihenfolge = 999;
      }
    }
  }
};