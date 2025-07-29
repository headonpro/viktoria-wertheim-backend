/**
 * Tabellen-Eintrag validation
 * Ensures data consistency between team_name and club/team relations
 */

const validateTabellenEintrag = async (data, { strapi }) => {
  const errors = [];

  // Validate that team_name matches club name when club is present
  if (data.club) {
    try {
      const club = await strapi.entityService.findOne('api::club.club', data.club);
      if (club && data.team_name && data.team_name !== club.name) {
        errors.push({
          path: ['team_name'],
          message: `Team name "${data.team_name}" must match club name "${club.name}"`,
          name: 'ValidationError'
        });
      }
      
      // Auto-correct team_name if not provided but club is present
      if (club && !data.team_name) {
        data.team_name = club.name;
      }
    } catch (error) {
      errors.push({
        path: ['club'],
        message: 'Invalid club reference',
        name: 'ValidationError'
      });
    }
  }

  // Fallback to team name if no club is present
  if (!data.club && data.team && !data.team_name) {
    try {
      const team = await strapi.entityService.findOne('api::team.team', data.team);
      if (team) {
        data.team_name = team.name;
      }
    } catch (error) {
      errors.push({
        path: ['team'],
        message: 'Invalid team reference',
        name: 'ValidationError'
      });
    }
  }

  // Ensure either club or team is present
  if (!data.club && !data.team) {
    errors.push({
      path: ['club', 'team'],
      message: 'Either club or team relation must be provided',
      name: 'ValidationError'
    });
  }

  return errors;
};

module.exports = {
  validateTabellenEintrag
};