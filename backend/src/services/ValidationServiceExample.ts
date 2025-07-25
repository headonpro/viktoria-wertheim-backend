/**
 * Example usage of ValidationService in Strapi context
 * This file demonstrates how to use the ValidationService in real Strapi services
 */

import { ValidationService } from './ValidationService';

/**
 * Example function showing how to validate team data before creation
 */
export async function validateTeamCreation(teamData: any) {
  const errors: string[] = [];
  
  // 1. Validate required fields
  const requiredFields = ['name', 'liga', 'trainer', 'saison'];
  const requiredErrors = ValidationService.validateRequired(teamData, requiredFields);
  errors.push(...requiredErrors);
  
  // 2. Validate team name uniqueness
  if (teamData.name) {
    const isUnique = await ValidationService.validateUnique(
      'api::team.team',
      'name',
      teamData.name
    );
    if (!isUnique) {
      errors.push('Team name must be unique');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Example function showing how to validate saison data
 */
export function validateSaisonData(saisonData: any) {
  const errors: string[] = [];
  
  // 1. Validate required fields
  const requiredErrors = ValidationService.validateRequired(saisonData, ['name', 'start_datum', 'end_datum']);
  errors.push(...requiredErrors);
  
  // 2. Validate date range
  if (saisonData.start_datum && saisonData.end_datum) {
    const startDate = new Date(saisonData.start_datum);
    const endDate = new Date(saisonData.end_datum);
    const dateErrors = ValidationService.validateDateRange(startDate, endDate);
    errors.push(...dateErrors);
  }
  
  // 3. Validate aktiv status (boolean enum)
  if (saisonData.aktiv !== undefined) {
    const isValidStatus = ValidationService.validateEnum(saisonData.aktiv, [true, false]);
    if (!isValidStatus) {
      errors.push('aktiv must be true or false');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Example function showing how to validate news article data
 */
export function validateNewsArtikelData(newsData: any) {
  const errors: string[] = [];
  
  // 1. Validate required fields
  const requiredErrors = ValidationService.validateRequired(newsData, ['titel', 'inhalt', 'autor']);
  errors.push(...requiredErrors);
  
  // 2. Validate featured status
  if (newsData.featured !== undefined) {
    const isValidFeatured = ValidationService.validateEnum(newsData.featured, [true, false]);
    if (!isValidFeatured) {
      errors.push('featured must be true or false');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}