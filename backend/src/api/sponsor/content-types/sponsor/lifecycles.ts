/**
 * Sponsor content type lifecycles
 * Handles validation and business logic for sponsor management
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate sponsor data completeness
    await validateSponsorData(data);
    
    // Set default ordering based on category if not provided
    if (!data.reihenfolge && data.kategorie) {
      data.reihenfolge = getDefaultOrderByCategory(data.kategorie);
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Validate sponsor data completeness
    await validateSponsorData(data);
    
    // Update ordering if category changed
    if (data.kategorie && !data.reihenfolge) {
      data.reihenfolge = getDefaultOrderByCategory(data.kategorie);
    }
  },
};

/**
 * Validates sponsor data completeness based on requirements
 */
async function validateSponsorData(data: any) {
  // Name is required (handled by schema)
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Sponsor name ist erforderlich');
  }

  // Category is required (handled by schema)
  if (!data.kategorie) {
    throw new Error('Sponsor Kategorie ist erforderlich');
  }

  // Validate website URL format if provided
  if (data.website && data.website.trim().length > 0) {
    const urlPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;
    if (!urlPattern.test(data.website.trim())) {
      throw new Error('Website URL hat ein ungültiges Format');
    }
    
    // Ensure URL has protocol
    if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
      data.website = 'https://' + data.website;
    }
  }

  // Validate description length
  if (data.beschreibung && data.beschreibung.length > 500) {
    throw new Error('Beschreibung darf maximal 500 Zeichen lang sein');
  }

  // Validate contact information length
  if (data.kontakt && data.kontakt.length > 200) {
    throw new Error('Kontaktinformationen dürfen maximal 200 Zeichen lang sein');
  }

  // Validate ordering range
  if (data.reihenfolge !== undefined && (data.reihenfolge < 0 || data.reihenfolge > 999)) {
    throw new Error('Reihenfolge muss zwischen 0 und 999 liegen');
  }
}

/**
 * Returns default ordering value based on sponsor category
 */
function getDefaultOrderByCategory(kategorie: string): number {
  switch (kategorie) {
    case 'Hauptsponsor':
      return 100; // High priority
    case 'Premium':
      return 200; // Medium priority
    case 'Partner':
      return 300; // Lower priority
    default:
      return 999; // Lowest priority
  }
}