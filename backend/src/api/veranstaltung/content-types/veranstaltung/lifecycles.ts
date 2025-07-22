/**
 * veranstaltung lifecycles
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate event data
    const errors = await strapi.service('api::veranstaltung.veranstaltung').validateEvent(data);
    if (errors.length > 0) {
      strapi.log.warn(`Event validation warnings: ${errors.join(', ')}`);
    }
    
    // Set default values
    if (data.oeffentlich === undefined) {
      data.oeffentlich = true;
    }
    
    if (data.anmeldung_erforderlich === undefined) {
      data.anmeldung_erforderlich = false;
    }
    
    // Generate short description from description if not provided
    if (!data.kurzbeschreibung && data.beschreibung) {
      data.kurzbeschreibung = generateExcerpt(data.beschreibung, 300);
    }
    
    // Format time if provided
    if (data.uhrzeit) {
      data.uhrzeit = formatTime(data.uhrzeit);
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Validate event data if provided
    if (Object.keys(data).length > 0) {
      const currentEvent = await strapi.entityService.findOne('api::veranstaltung.veranstaltung' as any, event.params.where.id);
      const mergedData = { ...currentEvent, ...data };
      
      const errors = await strapi.service('api::veranstaltung.veranstaltung').validateEvent(mergedData);
      if (errors.length > 0) {
        strapi.log.warn(`Event validation warnings: ${errors.join(', ')}`);
      }
    }
    
    // Update short description if description changed
    if (data.beschreibung && !data.kurzbeschreibung) {
      data.kurzbeschreibung = generateExcerpt(data.beschreibung, 300);
    }
    
    // Format time if provided
    if (data.uhrzeit) {
      data.uhrzeit = formatTime(data.uhrzeit);
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log event creation
    strapi.log.info(`Created event: ${result.titel} on ${result.datum} (${result.kategorie})`);
    
    // Send notification for public events (placeholder for future implementation)
    if (result.oeffentlich && result.publishedAt) {
      await notifyEventCreated(result);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Log significant changes
    const { data } = event.params;
    if (data.datum || data.uhrzeit || data.ort) {
      strapi.log.info(`Updated event details: ${result.titel}`);
      
      // Send notification for date/time/location changes (placeholder for future implementation)
      if (result.oeffentlich && result.publishedAt) {
        await notifyEventUpdated(result, data);
      }
    }
    
    // Handle visibility changes
    if (data.oeffentlich !== undefined) {
      const visibility = data.oeffentlich ? 'public' : 'private';
      strapi.log.info(`Changed event visibility to ${visibility}: ${result.titel}`);
    }
  },

  async beforeDelete(event) {
    const { where } = event.params;
    
    // Log event deletion
    const eventToDelete = await strapi.entityService.findOne('api::veranstaltung.veranstaltung' as any, where.id);
    if (eventToDelete) {
      strapi.log.info(`Deleting event: ${(eventToDelete as any).titel}`);
    }
  },

  async afterDelete(event) {
    const { result } = event;
    
    if (result) {
      strapi.log.info(`Deleted event: ${result.titel}`);
      
      // Send cancellation notification for public events (placeholder for future implementation)
      if (result.oeffentlich && result.publishedAt) {
        await notifyEventCancelled(result);
      }
    }
  }
};

/**
 * Generate excerpt from rich text content
 */
function generateExcerpt(content: string, maxLength: number = 300): string {
  if (!content) return '';
  
  // Strip HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Truncate to maxLength
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 
    ? truncated.substring(0, lastSpace) + '...'
    : truncated + '...';
}

/**
 * Format time string to HH:MM format
 */
function formatTime(timeString: string): string {
  if (!timeString) return '';
  
  // Remove any extra characters and normalize
  const cleaned = timeString.replace(/[^\d:]/g, '');
  
  // Check if already in correct format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(cleaned)) {
    // Ensure two-digit format
    const [hours, minutes] = cleaned.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  
  // Try to parse other formats
  if (cleaned.length === 4 && !cleaned.includes(':')) {
    // Format like "1430" -> "14:30"
    return `${cleaned.substring(0, 2)}:${cleaned.substring(2, 4)}`;
  }
  
  // Return original if can't format
  return timeString;
}

/**
 * Notification functions using the EventNotificationService
 */
async function notifyEventCreated(event: any) {
  try {
    const EventNotificationService = require('../../services/notification').default;
    const notificationService = new EventNotificationService(strapi);
    await notificationService.notifyEventCreated(event);
  } catch (error) {
    strapi.log.error('Failed to notify event creation:', error);
  }
}

async function notifyEventUpdated(event: any, changes: any) {
  try {
    const EventNotificationService = require('../../services/notification').default;
    const notificationService = new EventNotificationService(strapi);
    await notificationService.notifyEventUpdated(event, changes);
  } catch (error) {
    strapi.log.error('Failed to notify event update:', error);
  }
}

async function notifyEventCancelled(event: any) {
  try {
    const EventNotificationService = require('../../services/notification').default;
    const notificationService = new EventNotificationService(strapi);
    await notificationService.notifyEventCancelled(event);
  } catch (error) {
    strapi.log.error('Failed to notify event cancellation:', error);
  }
}