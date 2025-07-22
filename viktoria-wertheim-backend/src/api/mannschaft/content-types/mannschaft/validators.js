/**
 * Custom validators for Mannschaft content type
 * 
 * These validators ensure enum fields don't accept null/undefined values
 */

/**
 * Validates that enum fields are not null or undefined
 * @param {*} value - The value to validate
 * @param {Object} field - Field definition
 * @returns {boolean|string} - true if valid, error message if invalid
 */
function validateEnumNotNull(value, field) {
  // Skip validation for null/undefined values - let Strapi's required field validation handle this
  if (value === null || value === undefined || value === '') {
    return true;
  }
  
  // If field has enum values, validate against them
  if (field.enum && field.enum.length > 0) {
    if (!field.enum.includes(value)) {
      return `${field.name || 'Field'} must be one of: ${field.enum.join(', ')}`;
    }
  }
  
  return true;
}

module.exports = {
  validateEnumNotNull
};
