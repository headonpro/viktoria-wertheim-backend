/**
 * training controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::training.training' as any, ({ strapi }) => ({

  // Training erstellen
  async createTraining(ctx) {
    try {
      const { titel, datum, dauer, ort, beschreibung, trainingsziel, mannschaft, trainer } = ctx.request.body;

      if (!titel || !datum || !mannschaft || !trainer) {
        return ctx.badRequest('Titel, Datum, Mannschaft und Trainer sind erforderlich');
      }

      const newTraining = await strapi.db.query('api::training.training').create({
        data: {
          titel,
          datum,
          dauer: dauer || 90,
          ort: ort || 'Sportplatz Wertheim',
          beschreibung,
          trainingsziel,
          mannschaft,
          trainer,
          status: 'geplant',
          publishedAt: new Date()
        }
      });

      ctx.body = {
        success: true,
        data: newTraining
      };
    } catch (error) {
      console.error('Fehler beim Erstellen des Trainings:', error);
      ctx.internalServerError('Fehler beim Erstellen des Trainings');
    }
  },

  // Trainings nach Team
  async findByTeam(ctx) {
    try {
      const { teamId } = ctx.params;
      const { limit = 20 } = ctx.query;

      const trainings = await strapi.db.query('api::training.training').findMany({
        where: { mannschaft: teamId },
        populate: {
          trainer: {
            populate: ['profilfoto']
          },
          mannschaft: true,
          teilnehmer: {
            populate: ['mitglied']
          },
          abwesende: {
            populate: ['mitglied']
          }
        },
        orderBy: { datum: 'desc' },
        limit: parseInt(limit as string)
      });

      ctx.body = {
        success: true,
        data: trainings
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Team-Trainings:', error);
      ctx.internalServerError('Fehler beim Abrufen der Team-Trainings');
    }
  },

  // Kommende Trainings
  async getUpcoming(ctx) {
    try {
      const { teamId } = ctx.query;
      const now = new Date();

      let whereClause: any = {
        datum: { $gte: now },
        status: { $in: ['geplant', 'laufend'] }
      };

      if (teamId) {
        whereClause.mannschaft = teamId;
      }

      const trainings = await strapi.db.query('api::training.training').findMany({
        where: whereClause,
        populate: {
          trainer: true,
          mannschaft: true
        },
        orderBy: { datum: 'asc' }
      });

      ctx.body = {
        success: true,
        data: trainings
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der kommenden Trainings:', error);
      ctx.internalServerError('Fehler beim Abrufen der kommenden Trainings');
    }
  },

  // Training-Anwesenheit aktualisieren
  async updateAttendance(ctx) {
    try {
      const { id } = ctx.params;
      const { participantIds = [], absentIds = [] } = ctx.request.body;

      const training = await strapi.db.query('api::training.training').findOne({
        where: { id }
      });

      if (!training) {
        return ctx.notFound('Training nicht gefunden');
      }

      await strapi.db.query('api::training.training').update({
        where: { id },
        data: {
          teilnehmer: participantIds,
          abwesende: absentIds
        }
      });

      ctx.body = {
        success: true,
        message: 'Anwesenheit aktualisiert'
      };
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Anwesenheit:', error);
      ctx.internalServerError('Fehler beim Aktualisieren der Anwesenheit');
    }
  },

  // Training abschließen
  async completeTraining(ctx) {
    try {
      const { id } = ctx.params;
      const { wetter, notizen, uebungen } = ctx.request.body;

      const training = await strapi.db.query('api::training.training').findOne({
        where: { id }
      });

      if (!training) {
        return ctx.notFound('Training nicht gefunden');
      }

      await strapi.db.query('api::training.training').update({
        where: { id },
        data: {
          status: 'abgeschlossen',
          wetter,
          notizen,
          uebungen
        }
      });

      ctx.body = {
        success: true,
        message: 'Training abgeschlossen'
      };
    } catch (error) {
      console.error('Fehler beim Abschließen des Trainings:', error);
      ctx.internalServerError('Fehler beim Abschließen des Trainings');
    }
  },

  // Trainings nach Trainer
  async findByTrainer(ctx) {
    try {
      const { trainerId } = ctx.params;

      const trainings = await strapi.db.query('api::training.training').findMany({
        where: { trainer: trainerId },
        populate: {
          mannschaft: true,
          teilnehmer: {
            populate: ['mitglied']
          }
        },
        orderBy: { datum: 'desc' }
      });

      ctx.body = {
        success: true,
        data: trainings
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Trainer-Trainings:', error);
      ctx.internalServerError('Fehler beim Abrufen der Trainer-Trainings');
    }
  }

})); 