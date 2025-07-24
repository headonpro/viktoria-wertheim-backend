/**
 * Setup public API permissions for content types
 */

const { Client } = require('pg');

async function setupPublicPermissions() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'viktoria_wertheim',
    user: 'postgres',
    password: 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Get the public role ID
    const publicRoleResult = await client.query(
      "SELECT id FROM up_roles WHERE type = 'public'"
    );

    if (publicRoleResult.rows.length === 0) {
      console.log('❌ Public role not found');
      return;
    }

    const publicRoleId = publicRoleResult.rows[0].id;
    console.log('📋 Public role ID:', publicRoleId);

    // Define permissions for public access
    const permissions = [

      
      // Clubs permissions (needed for spiel relations)
      { action: 'api::club.club.find', enabled: true },
      { action: 'api::club.club.findOne', enabled: true },
      
      // Teams permissions
      { action: 'api::team.team.find', enabled: true },
      { action: 'api::team.team.findOne', enabled: true },
      
      // Liga permissions
      { action: 'api::liga.liga.find', enabled: true },
      { action: 'api::liga.liga.findOne', enabled: true },
      
      // Saison permissions
      { action: 'api::saison.saison.find', enabled: true },
      { action: 'api::saison.saison.findOne', enabled: true },
      
      // News permissions (for homepage)
      { action: 'api::news-artikel.news-artikel.find', enabled: true },
      { action: 'api::news-artikel.news-artikel.findOne', enabled: true },
    ];

    console.log('📤 Setting up public permissions...');

    for (const permission of permissions) {
      try {
        // Check if permission already exists
        const existingPermission = await client.query(
          'SELECT id FROM up_permissions WHERE action = $1',
          [permission.action]
        );

        let permissionId;

        if (existingPermission.rows.length > 0) {
          permissionId = existingPermission.rows[0].id;
          console.log(`✅ Found existing permission: ${permission.action}`);
        } else {
          // Create new permission
          const newPermission = await client.query(
            'INSERT INTO up_permissions (action, created_at, updated_at, published_at, document_id) VALUES ($1, NOW(), NOW(), NOW(), $2) RETURNING id',
            [permission.action, Math.random().toString(36).substring(2, 15)]
          );
          permissionId = newPermission.rows[0].id;
          console.log(`✅ Created permission: ${permission.action}`);
        }

        // Check if role-permission link exists
        const existingLink = await client.query(
          'SELECT id FROM up_permissions_role_lnk WHERE permission_id = $1 AND role_id = $2',
          [permissionId, publicRoleId]
        );

        if (existingLink.rows.length === 0) {
          // Create role-permission link
          await client.query(
            'INSERT INTO up_permissions_role_lnk (permission_id, role_id) VALUES ($1, $2)',
            [permissionId, publicRoleId]
          );
          console.log(`✅ Linked permission to public role: ${permission.action}`);
        } else {
          console.log(`✅ Permission already linked to public role: ${permission.action}`);
        }

      } catch (error) {
        console.log(`❌ Error with permission ${permission.action}:`, error.message);
      }
    }

    console.log('🎉 Public permissions setup completed!');

  } catch (error) {
    console.error('❌ Error setting up permissions:', error);
  } finally {
    await client.end();
  }
}

setupPublicPermissions();