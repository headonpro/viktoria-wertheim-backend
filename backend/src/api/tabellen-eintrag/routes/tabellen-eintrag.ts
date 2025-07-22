/**
 * tabellen-eintrag router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::tabellen-eintrag.tabellen-eintrag' as any);

// Additional custom routes for table management
export const customRoutes = {
  routes: [
    {
      method: 'GET',
      path: '/tabellen-eintraege/league/:ligaId',
      handler: 'tabellen-eintrag.getLeagueTable',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/tabellen-eintraege/club/:ligaId/:clubId',
      handler: 'tabellen-eintrag.getClubStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/tabellen-eintraege/initialize/:ligaId',
      handler: 'tabellen-eintrag.initializeTable',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/tabellen-eintraege/update-positions/:ligaId',
      handler: 'tabellen-eintrag.updatePositions',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};