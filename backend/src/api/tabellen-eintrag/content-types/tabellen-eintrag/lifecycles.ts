/**
 * Tabellen-eintrag lifecycle hooks using TableHookService
 */

import { getHookServiceFactory } from '../../../../services/HookServiceFactory';

// Get the hook service factory
const factory = getHookServiceFactory(strapi);

// Create table hook service
const tableHookService = factory.createTableService();

export default {
  async beforeCreate(event: any) {
    const result = await tableHookService.beforeCreate(event);
    return result.success ? result.modifiedData || event.params.data : event.params.data;
  },

  async beforeUpdate(event: any) {
    const result = await tableHookService.beforeUpdate(event);
    return result.success ? result.modifiedData || event.params.data : event.params.data;
  },

  async afterCreate(event: any) {
    await tableHookService.afterCreate(event);
  },

  async afterUpdate(event: any) {
    await tableHookService.afterUpdate(event);
  }
};