const crypto = require('crypto');

// Generate API token for Strapi MCP
const generateApiToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  console.log('Generated API Token:', token);
  return token;
};

// Create token entry for database
const createTokenData = () => {
  const token = generateApiToken();
  const hashedToken = crypto.createHash('sha512').update(token).digest('hex');
  
  const tokenData = {
    name: 'MCP Server Token',
    description: 'API Token for MCP Server Integration',
    type: 'full-access',
    accessKey: hashedToken,
    lastUsedAt: null,
    permissions: null,
    expiresAt: null,
    lifespan: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('\nToken Data for Database:');
  console.log(JSON.stringify(tokenData, null, 2));
  
  console.log('\nSQL Insert Statement:');
  console.log(`INSERT INTO strapi_api_tokens (name, description, type, access_key, created_at, updated_at) VALUES ('${tokenData.name}', '${tokenData.description}', '${tokenData.type}', '${tokenData.accessKey}', '${tokenData.createdAt}', '${tokenData.updatedAt}');`);
  
  return { token, tokenData };
};

createTokenData();