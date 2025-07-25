/**
 * Integration tests for ValidationService with Strapi context
 */

import { ValidationService } from '../src/services/ValidationService';

describe('ValidationService Integration', () => {
  
  it('should be importable and have all required methods', () => {
    expect(ValidationService).toBeDefined();
    expect(typeof ValidationService.validateRequired).toBe('function');
    expect(typeof ValidationService.validateUnique).toBe('function');
    expect(typeof ValidationService.validateDateRange).toBe('function');
    expect(typeof ValidationService.validateEnum).toBe('function');
  });

  it('should work with real-world team validation scenario', () => {
    const teamData = {
      name: 'FC Viktoria Wertheim',
      liga: 'Kreisliga A',
      trainer: 'Max Mustermann',
      saison: '2024/2025'
    };
    
    const requiredFields = ['name', 'liga', 'trainer', 'saison'];
    const errors = ValidationService.validateRequired(teamData, requiredFields);
    
    expect(errors).toEqual([]);
  });

  it('should work with real-world saison validation scenario', () => {
    const startDate = new Date('2024-08-01');
    const endDate = new Date('2025-06-30');
    
    const errors = ValidationService.validateDateRange(startDate, endDate);
    
    expect(errors).toEqual([]);
  });

  it('should work with real-world enum validation scenario', () => {
    const teamStatus = 'active';
    const allowedStatuses = ['active', 'inactive', 'suspended'];
    
    const isValid = ValidationService.validateEnum(teamStatus, allowedStatuses);
    
    expect(isValid).toBe(true);
  });
});