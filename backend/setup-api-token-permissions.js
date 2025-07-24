const { Client } = require('pg');

async function setupApiTokenPermissions() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'viktoria_wertheim',
        user: 'postgres',
        password: 'postgres',
    });

    try {
        await client.connect();

        // Get the API token ID
        const tokenResult = await client.query(
            "SELECT id FROM strapi_api_tokens WHERE name = 'MCP Server Token'"
        );

        if (tokenResult.rows.length === 0) {
            console.log('API token not found');
            return;
        }

        const tokenId = tokenResult.rows[0].id;
        console.log('Token ID:', tokenId);

        // Define the permissions we want to grant
        const permissions = [
            // Content Manager permissions
            'admin::content-manager.explorer.create',
            'admin::content-manager.explorer.read',
            'admin::content-manager.explorer.update',
            'admin::content-manager.explorer.delete',
            'admin::content-manager.explorer.publish',

            // API permissions for all content types
            'api::club.club.find',
            'api::club.club.findOne',
            'api::club.club.create',
            'api::club.club.update',
            'api::club.club.delete',

            'api::mannschaft.mannschaft.find',
            'api::mannschaft.mannschaft.findOne',
            'api::mannschaft.mannschaft.create',
            'api::mannschaft.mannschaft.update',
            'api::mannschaft.mannschaft.delete',

            'api::spieler.spieler.find',
            'api::spieler.spieler.findOne',
            'api::spieler.spieler.create',
            'api::spieler.spieler.update',
            'api::spieler.spieler.delete',



            'api::news-artikel.news-artikel.find',
            'api::news-artikel.news-artikel.findOne',
            'api::news-artikel.news-artikel.create',
            'api::news-artikel.news-artikel.update',
            'api::news-artikel.news-artikel.delete',
        ];

        // Insert permissions
        for (const action of permissions) {
            try {
                await client.query(`
          INSERT INTO strapi_api_token_permissions (action, created_at, updated_at) 
          VALUES ($1, NOW(), NOW())
        `, [action]);

                // Get the permission ID
                const permResult = await client.query(
                    'SELECT id FROM strapi_api_token_permissions WHERE action = $1 ORDER BY id DESC LIMIT 1',
                    [action]
                );

                if (permResult.rows.length > 0) {
                    const permissionId = permResult.rows[0].id;

                    // Link permission to token
                    await client.query(`
            INSERT INTO strapi_api_token_permissions_token_lnk (api_token_permission_id, api_token_id) 
            VALUES ($1, $2)
          `, [permissionId, tokenId]);

                    console.log(`✓ Added permission: ${action}`);
                }

            } catch (error) {
                if (error.code !== '23505') { // Ignore duplicate key errors
                    console.log(`✗ Failed to add permission ${action}:`, error.message);
                }
            }
        }

        console.log('\nAPI Token permissions setup completed!');

    } catch (error) {
        console.error('Error setting up API token permissions:', error);
    } finally {
        await client.end();
    }
}

setupApiTokenPermissions();