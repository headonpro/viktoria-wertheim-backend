/**
 * mitglied controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::mitglied.mitglied' as any, ({ strapi }) => ({
  
  // Admin-Endpoint zum Erstellen neuer Mitglieder mit User-Account
  async createMemberWithUser(ctx) {
    try {
      const { 
        // User-Daten
        username, 
        email, 
        password,
        // Mitglied-Daten
        vorname,
        nachname,
        telefon,
        geburtsdatum,
        mitgliedstyp,
        benutzerrolle,
        mitgliedsnummer,
        beitrittsdatum,
        adresse,
        notfallkontakt,
        bemerkungen
      } = ctx.request.body;

      // Validierung
      if (!username || !email || !password || !vorname || !nachname || !mitgliedstyp) {
        return ctx.badRequest('Username, Email, Password, Vorname, Nachname und Mitgliedstyp sind erforderlich');
      }

      // 1. Prüfe ob Email bereits existiert
      const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email }
      });
      
      const existingMembers = await strapi.db.query('api::mitglied.mitglied').findMany({
        where: { email }
      });

      if (existingUser || existingMembers.length > 0) {
        return ctx.badRequest('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits');
      }

      // 2. Hole die "authenticated" Rolle
      const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' }
      });

      if (!authenticatedRole) {
        return ctx.internalServerError('Authentifizierte Rolle nicht gefunden');
      }

      // 3. Erstelle User korrekt über users-permissions Plugin
      const newUser = await strapi.plugins['users-permissions'].services.user.add({
        username,
        email,
        password,
        confirmed: true,
        blocked: false,
        role: authenticatedRole.id
      });

      // 4. Generiere Mitgliedsnummer falls nicht angegeben
      let finalMitgliedsnummer = mitgliedsnummer;
      if (!finalMitgliedsnummer) {
        const currentYear = new Date().getFullYear();
        const memberCount = await strapi.db.query('api::mitglied.mitglied').count();
        const nextNumber = memberCount + 1;
        finalMitgliedsnummer = `${currentYear}${nextNumber.toString().padStart(4, '0')}`;
      }

      // 5. Erstelle Mitglied-Datensatz
      const newMember = await strapi.db.query('api::mitglied.mitglied').create({
        data: {
          mitgliedsnummer: finalMitgliedsnummer,
          vorname,
          nachname,
          email,
          telefon,
          geburtsdatum,
          mitgliedstyp,
          benutzerrolle: benutzerrolle || mitgliedstyp,
          beitrittsdatum: beitrittsdatum || new Date(),
          mitgliedsstatus: 'aktiv',
          adresse,
          notfallkontakt,
          bemerkungen,
          datenschutz_akzeptiert: true,
          publishedAt: new Date()
        }
      });

      // Rückgabe ohne sensible User-Daten
      const { password: _, ...userWithoutPassword } = newUser;
      
      ctx.body = {
        success: true,
        message: 'Mitglied erfolgreich erstellt',
        member: newMember,
        user: userWithoutPassword
      };

    } catch (error) {
      console.error('Fehler beim Erstellen des Mitglieds:', error);
      ctx.internalServerError('Fehler beim Erstellen des Mitglieds: ' + error.message);
    }
  },

  // Admin-Endpoint zum Auflisten aller Mitglieder mit User-Informationen
  async getAllMembersWithUsers(ctx) {
    try {
      const members = await strapi.db.query('api::mitglied.mitglied').findMany({
        populate: {
          adresse: true,
          notfallkontakt: true,
          profilfoto: true
        }
      });

      // Hole entsprechende User-Daten
      const membersWithUsers = await Promise.all(
        members.map(async (member) => {
          const user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { email: member.email },
            populate: { role: true }
          });

          if (user) {
            const { password: _, ...userWithoutPassword } = user;
            return {
              ...member,
              user: userWithoutPassword
            };
          }
          
          return {
            ...member,
            user: null
          };
        })
      );

      ctx.body = {
        success: true,
        members: membersWithUsers
      };

    } catch (error) {
      console.error('Fehler beim Abrufen der Mitglieder:', error);
      ctx.internalServerError('Fehler beim Abrufen der Mitglieder');
    }
  }

})); 