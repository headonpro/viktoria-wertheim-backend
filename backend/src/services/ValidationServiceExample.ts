/**
 * ValidationService Usage Examples
 * 
 * This file demonstrates how to use the ValidationService
 * for different content types and validation scenarios.
 */

import { ValidationService } from './ValidationService';

/**
 * Example: Team validation
 */
export async function validateTeamExample(teamData: any, strapi: any): Promise<string[]> {
  const errors: string[] = [];
  const requiredFields = ['name', 'gruendungsjahr'];

  // Required field validation
  const requiredErrors = ValidationService.validateRequired(teamData, requiredFields);
  errors.push(...requiredErrors);

  // Unique validation
  if (teamData.name) {
    const isUnique = await ValidationService.validateUnique(
      'api::team.team',
      'name',
      teamData.name,
      strapi,
      teamData.id
    );
    if (!isUnique) {
      errors.push('Team name must be unique');
    }
  }

  return errors;
}

/**
 * Example: Saison validation
 */
export async function validateSaisonExample(saisonData: any, strapi: any): Promise<string[]> {
  const errors: string[] = [];

  // Required field validation
  const requiredErrors = ValidationService.validateRequired(saisonData, ['name', 'start_datum', 'end_datum']);
  errors.push(...requiredErrors);

  // Date range validation
  if (saisonData.start_datum && saisonData.end_datum) {
    const startDate = new Date(saisonData.start_datum);
    const endDate = new Date(saisonData.end_datum);
    const dateErrors = ValidationService.validateDateRange(startDate, endDate);
    errors.push(...dateErrors);
  }

  // Enum validation
  if (saisonData.aktiv !== undefined) {
    const isValidStatus = ValidationService.validateEnum(saisonData.aktiv, [true, false]);
    if (!isValidStatus) {
      errors.push('Status must be true or false');
    }
  }

  return errors;
}

/**
 * Example: News article validation
 */
export async function validateNewsExample(newsData: any, strapi: any): Promise<string[]> {
  const errors: string[] = [];

  // Required field validation
  const requiredErrors = ValidationService.validateRequired(newsData, ['titel', 'inhalt', 'autor']);
  errors.push(...requiredErrors);

  // Enum validation for featured flag
  if (newsData.featured !== undefined) {
    const isValidFeatured = ValidationService.validateEnum(newsData.featured, [true, false]);
    if (!isValidFeatured) {
      errors.push('Featured must be true or false');
    }
  }

  return errors;
}

export default {
  validateTeamExample,
  validateSaisonExample,
  validateNewsExample
};