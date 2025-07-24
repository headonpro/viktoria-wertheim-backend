const axios = require('axios');

class StrapiAPIHelper {
  constructor(baseURL = 'http://localhost:1337') {
    this.baseURL = baseURL;
    this.token = null;
  }

  async login(email, password) {
    try {
      const response = await axios.post(`${this.baseURL}/admin/login`, {
        email,
        password
      });
      
      this.token = response.data.data.token;
      console.log('✓ Successfully logged in to Strapi');
      return this.token;
    } catch (error) {
      console.error('✗ Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getContentTypes() {
    // Return known content types from your Strapi instance
    const contentTypes = [
      'api::club.club',
      'api::kategorie.kategorie',
      'api::liga.liga',
      'api::mannschaft.mannschaft',
      'api::mitglied.mitglied',
      'api::news-artikel.news-artikel',
      'api::saison.saison',
      'api::spiel.spiel',
      'api::spieler.spieler',
      'api::spielerstatistik.spielerstatistik',
      'api::sponsor.sponsor',
      'api::tabellen-eintrag.tabellen-eintrag',
      'api::team.team',
      'api::veranstaltung.veranstaltung'
    ];
    
    console.log('✓ Using known content types from Strapi instance');
    return contentTypes;
  }

  async getEntries(contentType, options = {}) {
    try {
      const { pagination = {}, filters = {}, sort = [], populate = [] } = options;
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (pagination.page) params.append('pagination[page]', pagination.page);
      if (pagination.pageSize) params.append('pagination[pageSize]', pagination.pageSize);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([operator, val]) => {
            params.append(`filters[${key}][${operator}]`, val);
          });
        } else {
          params.append(`filters[${key}]`, value);
        }
      });
      
      sort.forEach(sortItem => {
        params.append('sort', sortItem);
      });
      
      populate.forEach(popItem => {
        params.append('populate', popItem);
      });

      // Convert api::club.club to clubs
      const endpoint = contentType.replace('api::', '').split('.')[0] + 's';
      const url = `${this.baseURL}/api/${endpoint}?${params}`;
      console.log('Making request to:', url);
      
      // Try without authentication first (public endpoints)
      try {
        const response = await axios.get(url);
        console.log(`✓ Retrieved ${response.data.data?.length || 0} entries for ${contentType} (public)`);
        return response.data;
      } catch (publicError) {
        console.log('Public access failed, trying with admin token...');
        
        // Try with admin token
        const response = await axios.get(url, {
          headers: this.getHeaders()
        });
        
        console.log(`✓ Retrieved ${response.data.data?.length || 0} entries for ${contentType} (authenticated)`);
        return response.data;
      }
      
    } catch (error) {
      console.error(`✗ Failed to get entries for ${contentType}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createEntry(contentType, data) {
    try {
      const url = `${this.baseURL}/api/${contentType.replace('api::', '').replace('.', 's')}`;
      
      const response = await axios.post(url, { data }, {
        headers: this.getHeaders()
      });
      
      console.log(`✓ Created entry for ${contentType}`);
      return response.data;
    } catch (error) {
      console.error(`✗ Failed to create entry for ${contentType}:`, error.response?.data || error.message);
      throw error;
    }
  }
}

// Example usage
async function testStrapiAPI() {
  const strapi = new StrapiAPIHelper();
  
  try {
    // Login
    await strapi.login('cirakoglu.onur@gmail.com', 'VW123c0nnect!');
    
    // Get content types
    console.log('\n--- Testing Content Types ---');
    await strapi.getContentTypes();
    
    // Get clubs
    console.log('\n--- Testing Get Entries ---');
    const clubs = await strapi.getEntries('api::club.club', {
      pagination: { page: 1, pageSize: 5 }
    });
    
    console.log('Clubs found:', clubs.data?.length || 0);
    if (clubs.data && clubs.data.length > 0) {
      console.log('First club:', clubs.data[0]);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Export for use in other scripts
module.exports = StrapiAPIHelper;

// Run test if called directly
if (require.main === module) {
  testStrapiAPI();
}