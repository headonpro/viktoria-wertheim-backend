/**
 * Lifecycle hooks for Mannschaft content type
 * 
 * These hooks provide additional validation for enum fields
 */

const ENUM_FIELDS = {
  status: ['aktiv', 'inaktiv', 'aufgeloest'],
  liga: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
  altersklasse: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
  trend: ['steigend', 'gleich', 'fallend']
};

/**
 * Validates enum fields before create/update
 * @param {Object} event - Strapi lifecycle event
 */
function validateEnumFields(event) {
  const { data } = event.params;
  
  Object.entries(ENUM_FIELDS).forEach(([fieldName, allowedValues]) => {
    const value = data[fieldName];
    
    // Reject null and undefined explicitly
    if (value === null || value === undefined) {
      throw new Error(`Field "${fieldName}" cannot be null or undefined`);
    }
    
    // For non-empty values, validate against enum
    if (value !== '' && !allowedValues.includes(value)) {
      throw new Error(`Field "${fieldName}" must be one of: ${allowedValues.join(', ')}. Received: "${value}"`);
    }
  });
}

function validateEnumFieldsStrict(event) {
  const { data } = event.params;
  
  // Check if data contains any enum fields with null/undefined values
  Object.keys(ENUM_FIELDS).forEach(fieldName => {
    if (data.hasOwnProperty(fieldName)) {
      const value = data[fieldName];
      if (value === null || value === undefined || typeof value === 'undefined') {
        throw new Error(`Field "${fieldName}" cannot be null or undefined`);
      }
    }
  });
}

module.exports = {
  beforeCreate(event) {
    validateEnumFieldsStrict(event);
    validateEnumFields(event);
  },
  
  beforeUpdate(event) {
    validateEnumFieldsStrict(event);
    validateEnumFields(event);
  }
};
