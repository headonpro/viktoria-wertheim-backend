// import authController from './controllers/auth';

export default (plugin: any) => {
  // Extend the users-permissions plugin
  const originalBootstrap = plugin.bootstrap;

  plugin.bootstrap = async ({ strapi }: { strapi: any }) => {
    // Call original bootstrap first
    if (originalBootstrap) {
      await originalBootstrap({ strapi });
    }

    // Create custom roles and permissions
    await createCustomRoles(strapi);
  };

  // Extend auth controllers
  // plugin = authController(plugin);

  return plugin;
};

async function createCustomRoles(strapi: any) {
  const pluginStore = strapi.store({
    environment: '',
    type: 'plugin',
    name: 'users-permissions',
  });

  // Define custom roles with their permissions
  const customRoles = [
    {
      name: 'Admin',
      description: 'Full administrative access to all content and system settings',
      type: 'admin',
      permissions: {
        // Full access to all content types
        'api::club': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::liga': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::saison': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::team': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::mitglied': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::spieler': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::spielerstatistik': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::spiel': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::tabellen-eintrag': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::kategorie': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::news-artikel': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::sponsor': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::veranstaltung': ['find', 'findOne', 'create', 'update', 'delete'],
      }
    },
    {
      name: 'Redakteur',
      description: 'Content editor with access to news, events, and basic team information',
      type: 'editor',
      permissions: {
        // Read access to most content
        'api::club': ['find', 'findOne'],
        'api::liga': ['find', 'findOne'],
        'api::saison': ['find', 'findOne'],
        'api::team': ['find', 'findOne', 'update'],
        'api::mitglied': ['find', 'findOne'],
        'api::spieler': ['find', 'findOne', 'update'],
        'api::spielerstatistik': ['find', 'findOne'],
        'api::spiel': ['find', 'findOne'],
        'api::tabellen-eintrag': ['find', 'findOne'],
        // Full access to content management
        'api::kategorie': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::news-artikel': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::veranstaltung': ['find', 'findOne', 'create', 'update', 'delete'],
        // Read-only access to sponsors
        'api::sponsor': ['find', 'findOne'],
      }
    },
    {
      name: 'Vereinsvorstand',
      description: 'Club board member with access to member data and team management',
      type: 'board',
      permissions: {
        // Read access to most content
        'api::club': ['find', 'findOne'],
        'api::liga': ['find', 'findOne'],
        'api::saison': ['find', 'findOne'],
        // Full access to team and member management
        'api::team': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::mitglied': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::spieler': ['find', 'findOne', 'create', 'update', 'delete'],
        'api::spielerstatistik': ['find', 'findOne', 'update'],
        'api::spiel': ['find', 'findOne', 'create', 'update'],
        'api::tabellen-eintrag': ['find', 'findOne'],
        // Limited content management
        'api::kategorie': ['find', 'findOne'],
        'api::news-artikel': ['find', 'findOne', 'create', 'update'],
        'api::veranstaltung': ['find', 'findOne', 'create', 'update', 'delete'],
        // Sponsor management
        'api::sponsor': ['find', 'findOne', 'create', 'update', 'delete'],
      }
    },
    {
      name: 'Mitglied',
      description: 'Club member with limited access to member-only content',
      type: 'member',
      permissions: {
        // Read-only access to public content
        'api::club': ['find', 'findOne'],
        'api::liga': ['find', 'findOne'],
        'api::saison': ['find', 'findOne'],
        'api::team': ['find', 'findOne'],
        'api::spieler': ['find', 'findOne'],
        'api::spielerstatistik': ['find', 'findOne'],
        'api::spiel': ['find', 'findOne'],
        'api::tabellen-eintrag': ['find', 'findOne'],
        'api::kategorie': ['find', 'findOne'],
        'api::news-artikel': ['find', 'findOne'],
        'api::sponsor': ['find', 'findOne'],
        'api::veranstaltung': ['find', 'findOne'],
        // Limited access to own member data
        'api::mitglied': ['find', 'findOne'],
      }
    }
  ];

  // Get existing roles
  const existingRoles = await strapi.entityService.findMany('plugin::users-permissions.role');
  const existingRoleNames = existingRoles.map((role: any) => role.name);

  // Create roles that don't exist
  for (const roleConfig of customRoles) {
    if (!existingRoleNames.includes(roleConfig.name)) {
      console.log(`Creating role: ${roleConfig.name}`);
      
      // Create the role
      const role = await strapi.entityService.create('plugin::users-permissions.role', {
        data: {
          name: roleConfig.name,
          description: roleConfig.description,
          type: roleConfig.type,
        },
      });

      // Create permissions for this role
      await createRolePermissions(strapi, role.id, roleConfig.permissions);
    } else {
      console.log(`Role ${roleConfig.name} already exists, updating permissions...`);
      
      // Find existing role and update permissions
      const existingRole = existingRoles.find((role: any) => role.name === roleConfig.name);
      if (existingRole) {
        await updateRolePermissions(strapi, existingRole.id, roleConfig.permissions);
      }
    }
  }
}

async function createRolePermissions(strapi: any, roleId: number, permissions: Record<string, string[]>) {
  for (const [contentType, actions] of Object.entries(permissions)) {
    for (const action of actions) {
      await strapi.entityService.create('plugin::users-permissions.permission', {
        data: {
          action: `${contentType}.${action}`,
          enabled: true,
          policy: '',
          role: roleId,
        },
      });
    }
  }
}

async function updateRolePermissions(strapi: any, roleId: number, permissions: Record<string, string[]>) {
  // Delete existing permissions for this role
  const existingPermissions = await strapi.entityService.findMany('plugin::users-permissions.permission', {
    filters: { role: roleId },
  });

  for (const permission of existingPermissions) {
    await strapi.entityService.delete('plugin::users-permissions.permission', permission.id);
  }

  // Create new permissions
  await createRolePermissions(strapi, roleId, permissions);
}