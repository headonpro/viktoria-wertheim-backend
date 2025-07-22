/**
 * Event notification service
 */

export interface EventNotification {
  type: 'created' | 'updated' | 'cancelled' | 'reminder';
  event: any;
  changes?: any;
  recipients?: string[];
  scheduledFor?: Date;
}

export interface NotificationTemplate {
  subject: string;
  body: string;
  type: 'email' | 'push' | 'internal';
}

class EventNotificationService {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Send notification for new event creation
   */
  async notifyEventCreated(event: any) {
    try {
      const notification: EventNotification = {
        type: 'created',
        event,
        recipients: await this.getEventRecipients(event)
      };

      // Log the notification
      this.strapi.log.info(`Event created notification: ${event.titel}`);

      // Store notification in database for future processing
      await this.storeNotification(notification);

      // Send immediate notifications if event is public
      if (event.oeffentlich) {
        await this.sendImmediateNotifications(notification);
      }

      // Schedule reminder notifications
      await this.scheduleEventReminders(event);

    } catch (error) {
      this.strapi.log.error('Failed to send event creation notification:', error);
    }
  }

  /**
   * Send notification for event updates
   */
  async notifyEventUpdated(event: any, changes: any) {
    try {
      const significantChanges = this.identifySignificantChanges(changes);
      
      if (significantChanges.length === 0) {
        return; // No significant changes to notify about
      }

      const notification: EventNotification = {
        type: 'updated',
        event,
        changes: significantChanges,
        recipients: await this.getEventRecipients(event)
      };

      this.strapi.log.info(`Event updated notification: ${event.titel}`, significantChanges);

      await this.storeNotification(notification);

      // Send immediate notifications for significant changes
      if (event.oeffentlich && this.requiresImmediateNotification(significantChanges)) {
        await this.sendImmediateNotifications(notification);
      }

      // Reschedule reminders if date/time changed
      if (significantChanges.includes('datum') || significantChanges.includes('uhrzeit')) {
        await this.rescheduleEventReminders(event);
      }

    } catch (error) {
      this.strapi.log.error('Failed to send event update notification:', error);
    }
  }

  /**
   * Send notification for event cancellation
   */
  async notifyEventCancelled(event: any) {
    try {
      const notification: EventNotification = {
        type: 'cancelled',
        event,
        recipients: await this.getEventRecipients(event)
      };

      this.strapi.log.info(`Event cancelled notification: ${event.titel}`);

      await this.storeNotification(notification);

      // Send immediate cancellation notifications
      if (event.oeffentlich) {
        await this.sendImmediateNotifications(notification);
      }

      // Cancel any scheduled reminders
      await this.cancelEventReminders(event.id);

    } catch (error) {
      this.strapi.log.error('Failed to send event cancellation notification:', error);
    }
  }

  /**
   * Schedule reminder notifications for an event
   */
  async scheduleEventReminders(event: any) {
    if (!event.datum || !event.oeffentlich) {
      return;
    }

    const eventDate = new Date(event.datum);
    const now = new Date();

    // Schedule reminders at different intervals
    const reminderIntervals = [
      { days: 7, label: '1 week before' },
      { days: 3, label: '3 days before' },
      { days: 1, label: '1 day before' },
      { hours: 2, label: '2 hours before' }
    ];

    for (const interval of reminderIntervals) {
      let reminderDate: Date;
      
      if (interval.days) {
        reminderDate = new Date(eventDate);
        reminderDate.setDate(reminderDate.getDate() - interval.days);
      } else if (interval.hours) {
        reminderDate = new Date(eventDate);
        reminderDate.setHours(reminderDate.getHours() - interval.hours);
      }

      // Only schedule if reminder date is in the future
      if (reminderDate > now) {
        const notification: EventNotification = {
          type: 'reminder',
          event,
          recipients: await this.getEventRecipients(event),
          scheduledFor: reminderDate
        };

        await this.storeNotification(notification);
        this.strapi.log.debug(`Scheduled reminder for ${event.titel}: ${interval.label}`);
      }
    }
  }

  /**
   * Get recipients for event notifications
   */
  private async getEventRecipients(event: any): Promise<string[]> {
    const recipients = [];

    try {
      // Get all active members if event is public
      if (event.oeffentlich) {
        const members = await this.strapi.entityService.findMany('api::mitglied.mitglied' as any, {
          filters: {
            status: 'Aktiv',
            email: { $notNull: true }
          },
          fields: ['email']
        });
        
        recipients.push(...members.map((member: any) => member.email));
      }

      // Add contact person if specified
      if (event.kontakt_email) {
        recipients.push(event.kontakt_email);
      }

      // Add admin users
      const adminUsers = await this.strapi.entityService.findMany('plugin::users-permissions.user' as any, {
        filters: {
          role: { name: 'Admin' },
          email: { $notNull: true }
        },
        fields: ['email']
      });
      
      recipients.push(...adminUsers.map((user: any) => user.email));

    } catch (error) {
      this.strapi.log.error('Failed to get event recipients:', error);
    }

    // Remove duplicates and return
    return [...new Set(recipients)];
  }

  /**
   * Identify significant changes that require notifications
   */
  private identifySignificantChanges(changes: any): string[] {
    const significantFields = ['datum', 'uhrzeit', 'ort', 'titel', 'oeffentlich'];
    return Object.keys(changes).filter(field => significantFields.includes(field));
  }

  /**
   * Check if changes require immediate notification
   */
  private requiresImmediateNotification(changes: string[]): boolean {
    const immediateFields = ['datum', 'uhrzeit', 'ort', 'oeffentlich'];
    return changes.some(change => immediateFields.includes(change));
  }

  /**
   * Store notification in database for processing
   */
  private async storeNotification(notification: EventNotification) {
    // This would store notifications in a dedicated table for processing
    // For now, we'll just log it
    this.strapi.log.debug('Storing notification:', {
      type: notification.type,
      eventId: notification.event.id,
      eventTitle: notification.event.titel,
      recipientCount: notification.recipients?.length || 0,
      scheduledFor: notification.scheduledFor
    });
  }

  /**
   * Send immediate notifications
   */
  private async sendImmediateNotifications(notification: EventNotification) {
    // This would integrate with email service, push notifications, etc.
    // For now, we'll simulate the process
    
    const template = this.getNotificationTemplate(notification);
    
    this.strapi.log.info('Sending immediate notifications:', {
      type: notification.type,
      subject: template.subject,
      recipientCount: notification.recipients?.length || 0
    });

    // TODO: Integrate with actual notification services
    // - Email service (SendGrid, Mailgun, etc.)
    // - Push notification service
    // - SMS service for urgent notifications
  }

  /**
   * Get notification template based on type
   */
  private getNotificationTemplate(notification: EventNotification): NotificationTemplate {
    const event = notification.event;
    const eventSummary = this.generateEventSummary(event);

    switch (notification.type) {
      case 'created':
        return {
          subject: `Neue Veranstaltung: ${event.titel}`,
          body: `Eine neue Veranstaltung wurde erstellt:\n\n${eventSummary}\n\nMehr Details finden Sie auf unserer Website.`,
          type: 'email'
        };

      case 'updated':
        const changesText = notification.changes?.join(', ') || 'Details';
        return {
          subject: `Veranstaltung geändert: ${event.titel}`,
          body: `Die Veranstaltung "${event.titel}" wurde aktualisiert.\n\nGeänderte Felder: ${changesText}\n\n${eventSummary}\n\nBitte prüfen Sie die aktuellen Details auf unserer Website.`,
          type: 'email'
        };

      case 'cancelled':
        return {
          subject: `Veranstaltung abgesagt: ${event.titel}`,
          body: `Die Veranstaltung "${event.titel}" wurde leider abgesagt.\n\n${eventSummary}\n\nWir entschuldigen uns für eventuelle Unannehmlichkeiten.`,
          type: 'email'
        };

      case 'reminder':
        return {
          subject: `Erinnerung: ${event.titel}`,
          body: `Erinnerung an die bevorstehende Veranstaltung:\n\n${eventSummary}\n\nWir freuen uns auf Ihre Teilnahme!`,
          type: 'email'
        };

      default:
        return {
          subject: `Veranstaltung: ${event.titel}`,
          body: eventSummary,
          type: 'email'
        };
    }
  }

  /**
   * Generate event summary for notifications
   */
  private generateEventSummary(event: any): string {
    const parts = [`Titel: ${event.titel}`];
    
    if (event.datum) {
      const date = new Date(event.datum);
      parts.push(`Datum: ${date.toLocaleDateString('de-DE')}`);
    }
    
    if (event.uhrzeit) {
      parts.push(`Uhrzeit: ${event.uhrzeit} Uhr`);
    }
    
    if (event.ort) {
      parts.push(`Ort: ${event.ort}`);
    }
    
    if (event.kategorie) {
      parts.push(`Kategorie: ${event.kategorie}`);
    }
    
    if (event.kurzbeschreibung) {
      parts.push(`Beschreibung: ${event.kurzbeschreibung}`);
    }
    
    if (event.kontakt_person) {
      parts.push(`Kontakt: ${event.kontakt_person}`);
    }
    
    if (event.kontakt_email) {
      parts.push(`E-Mail: ${event.kontakt_email}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Reschedule event reminders after date/time changes
   */
  private async rescheduleEventReminders(event: any) {
    // Cancel existing reminders
    await this.cancelEventReminders(event.id);
    
    // Schedule new reminders
    await this.scheduleEventReminders(event);
    
    this.strapi.log.info(`Rescheduled reminders for event: ${event.titel}`);
  }

  /**
   * Cancel scheduled reminders for an event
   */
  private async cancelEventReminders(eventId: any) {
    // This would remove scheduled reminders from the database
    this.strapi.log.debug(`Cancelled reminders for event ID: ${eventId}`);
  }

  /**
   * Process scheduled notifications (to be called by cron job)
   */
  async processScheduledNotifications() {
    try {
      const now = new Date();
      
      // This would query scheduled notifications from database
      // and send those that are due
      
      this.strapi.log.debug('Processing scheduled notifications...');
      
      // TODO: Implement actual scheduled notification processing
      
    } catch (error) {
      this.strapi.log.error('Failed to process scheduled notifications:', error);
    }
  }
}

export default EventNotificationService;