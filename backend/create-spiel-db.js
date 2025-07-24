/**
 * Create match directly in PostgreSQL database
 */

const { Client } = require('pg');

async function createSpielInDB() {
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

    // First, let's check the table structure
    console.log('🔍 Checking table structure...');
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'spiele' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Table columns:');
    tableInfo.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });

    // Check if required relations exist
    console.log('\n🔍 Checking relations...');
    
    const clubs = await client.query('SELECT id, name FROM clubs WHERE id IN (1, 17)');
    console.log('Clubs found:', clubs.rows);
    
    const teams = await client.query('SELECT id, name FROM teams WHERE id = 1');
    console.log('Teams found:', teams.rows);
    
    const ligas = await client.query('SELECT id, name FROM ligas WHERE id = 2');
    console.log('Ligas found:', ligas.rows);
    
    const saisons = await client.query('SELECT id, name FROM saisons WHERE id = 2');
    console.log('Saisons found:', saisons.rows);

    // Generate document_id (Strapi 5 requirement)
    const { v4: uuidv4 } = require('crypto');
    const documentId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Insert the match (without relations first)
    console.log('\n📤 Creating match...');
    const insertQuery = `
      INSERT INTO spiele (
        datum,
        ist_heimspiel,
        status,
        tore_heim,
        tore_auswaerts,
        spielort,
        spieltag,
        zuschauer,
        spielbericht,
        created_at,
        updated_at,
        published_at,
        document_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, document_id;
    `;

    const values = [
      '2025-07-20T15:00:00.000Z',  // datum
      true,                        // ist_heimspiel
      'beendet',                   // status
      7,                           // tore_heim
      0,                           // tore_auswaerts
      'Sportplatz Wertheim',       // spielort
      18,                          // spieltag
      120,                         // zuschauer
      'Überragender Auftritt der 1. Mannschaft mit einem deutlichen 7:0 Sieg gegen FSV Tauberhöhe 2. Das Team zeigte von Beginn an eine starke Leistung und dominierte das Spiel über die gesamte Spielzeit.', // spielbericht
      new Date().toISOString(),    // created_at
      new Date().toISOString(),    // updated_at
      new Date().toISOString(),    // published_at
      documentId                   // document_id
    ];

    const result = await client.query(insertQuery, values);
    const spielId = result.rows[0].id;
    
    console.log('✅ Match created with ID:', spielId);
    
    // Now create the relations in link tables
    console.log('📤 Creating relations...');
    
    // Heimclub relation
    await client.query(`
      INSERT INTO spiele_heimclub_lnk (spiel_id, club_id) 
      VALUES ($1, $2)
    `, [spielId, 1]); // SV Viktoria Wertheim
    console.log('✅ Heimclub relation created');
    
    // Auswaertsclub relation
    await client.query(`
      INSERT INTO spiele_auswaertsclub_lnk (spiel_id, club_id) 
      VALUES ($1, $2)
    `, [spielId, 17]); // FSV Tauberhöhe 2
    console.log('✅ Auswaertsclub relation created');
    
    // Team relation
    await client.query(`
      INSERT INTO spiele_unser_team_lnk (spiel_id, team_id, spiel_ord) 
      VALUES ($1, $2, $3)
    `, [spielId, 1, 1]); // 1. Mannschaft
    console.log('✅ Team relation created');
    
    // Liga relation
    await client.query(`
      INSERT INTO spiele_liga_lnk (spiel_id, liga_id) 
      VALUES ($1, $2)
    `, [spielId, 2]); // Kreisklasse A
    console.log('✅ Liga relation created');
    
    // Saison relation
    await client.query(`
      INSERT INTO spiele_saison_lnk (spiel_id, saison_id) 
      VALUES ($1, $2)
    `, [spielId, 2]); // Saison 25/26
    console.log('✅ Saison relation created');
    
    console.log('✅ Match created successfully!');
    console.log('Match ID:', result.rows[0].id);
    console.log('Document ID:', result.rows[0].document_id);

    // Verify the insertion
    console.log('\n🔍 Verifying insertion...');
    const verifyQuery = `
      SELECT 
        s.id,
        s.datum,
        h.name as heimclub,
        a.name as auswaertsclub,
        t.name as team,
        l.name as liga,
        sa.name as saison,
        s.tore_heim,
        s.tore_auswaerts,
        s.status,
        s.spielort
      FROM spiele s
      JOIN spiele_heimclub_lnk shl ON s.id = shl.spiel_id
      JOIN clubs h ON shl.club_id = h.id
      JOIN spiele_auswaertsclub_lnk sal ON s.id = sal.spiel_id
      JOIN clubs a ON sal.club_id = a.id
      JOIN spiele_unser_team_lnk stl ON s.id = stl.spiel_id
      JOIN teams t ON stl.team_id = t.id
      JOIN spiele_liga_lnk sll ON s.id = sll.spiel_id
      JOIN ligas l ON sll.liga_id = l.id
      JOIN spiele_saison_lnk ssl ON s.id = ssl.spiel_id
      JOIN saisons sa ON ssl.saison_id = sa.id
      WHERE s.id = $1;
    `;

    const verification = await client.query(verifyQuery, [spielId]);
    
    if (verification.rows.length > 0) {
      const match = verification.rows[0];
      console.log('📋 Match details:');
      console.log(`- ID: ${match.id}`);
      console.log(`- Date: ${match.datum}`);
      console.log(`- Match: ${match.heimclub} vs ${match.auswaertsclub}`);
      console.log(`- Score: ${match.tore_heim}-${match.tore_auswaerts}`);
      console.log(`- Team: ${match.team}`);
      console.log(`- Liga: ${match.liga}`);
      console.log(`- Saison: ${match.saison}`);
      console.log(`- Status: ${match.status}`);
      console.log(`- Venue: ${match.spielort}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error.detail || error.stack);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
createSpielInDB()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });