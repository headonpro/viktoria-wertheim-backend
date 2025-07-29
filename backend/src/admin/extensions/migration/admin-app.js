import MigrationManagementView from './components/MigrationManagementView';

export default {
  config: {
    // Custom views for migration management
    views: {
      migrationManagement: {
        path: '/migration-management',
        component: MigrationManagementView,
        title: 'Migration Management',
        icon: 'database'
      }
    },
    
    // Add menu item to admin panel
    menu: {
      pluginOptions: {
        'migration-management': {
          name: 'Migration Management',
          to: '/migration-management',
          icon: 'database',
          permissions: [
            // Define permissions for migration management
            {
              action: 'plugin::migration.read',
              subject: null,
            },
            {
              action: 'plugin::migration.create',
              subject: null,
            },
            {
              action: 'plugin::migration.update',
              subject: null,
            },
            {
              action: 'plugin::migration.delete',
              subject: null,
            },
          ],
        },
      },
    },
  },
};