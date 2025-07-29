import tabellenAutomatisierungExtension from './extensions/tabellen-automatisierung/admin-app';
import clubExtension from './extensions/club/admin-app';

export default {
  config: {
    // Custom configurations for content types
    ...tabellenAutomatisierungExtension.config,
    contentTypes: {
      ...tabellenAutomatisierungExtension.config?.contentTypes,
      ...clubExtension.config?.contentTypes
    }
  },
  bootstrap(app) {
    // Initialize extensions
    if (tabellenAutomatisierungExtension.bootstrap) {
      tabellenAutomatisierungExtension.bootstrap(app);
    }
    if (clubExtension.bootstrap) {
      clubExtension.bootstrap(app);
    }
  },
};