/**
 * team controller - Minimal version using default Strapi behavior
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::team.team');