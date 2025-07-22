const sqlite3 = require('better-sqlite3');
const path = require('path');

async function fixLigaEnumValidation() {
  console.log('🔍 Checking and fixing Liga enum validation issues...');
  
  try {
    // Connect to SQLite database
    const dbPath = path.join(__dirname, '../.tmp/data.db');
    const db = sqlite3(dbPath);
    
    // Get all mannschaften
    const mannschaften = db.prepare('SELECT * FROM mannschaften').all();

    console.log(`Found ${mannschaften.length} mannschaften in database`);

    // Valid enum values from schema
    const validLigaValues = [
      "Kreisklasse B",
      "Kreisklasse A", 
      "Kreisliga",
      "Landesliga"
    ];

    const validStatusValues = [
      "aktiv",
      "inaktiv", 
      "aufgeloest"
    ];

    let fixedCount = 0;

    for (const mannschaft of mannschaften) {
      let needsUpdate = false;
      let updateData = {};

      // Check Liga field
      if (mannschaft.liga && !validLigaValues.includes(mannschaft.liga)) {
        console.log(`❌ Invalid liga value: "${mannschaft.liga}" for ${mannschaft.name}`);
        
        // Try to map old values to new enum values
        const ligaMapping = {
          'Kreisklasse B': 'Kreisklasse B',
          'Kreisklasse A': 'Kreisklasse A',
          'Kreisliga': 'Kreisliga',
          'Landesliga': 'Landesliga',
          // Add common variations
          'kreisklasse b': 'Kreisklasse B',
          'kreisklasse a': 'Kreisklasse A',
          'kreisliga': 'Kreisliga',
          'landesliga': 'Landesliga'
        };

        const mappedLiga = ligaMapping[mannschaft.liga] || 'Kreisklasse A'; // Default fallback
        updateData.liga = mappedLiga;
        needsUpdate = true;
        console.log(`  ➡️  Mapping to: "${mappedLiga}"`);
      }

      // Check Status field
      if (mannschaft.status && !validStatusValues.includes(mannschaft.status)) {
        console.log(`❌ Invalid status value: "${mannschaft.status}" for ${mannschaft.name}`);
        updateData.status = 'aktiv'; // Default to aktiv
        needsUpdate = true;
        console.log(`  ➡️  Setting to: "aktiv"`);
      }

      // Update if needed
      if (needsUpdate) {
        // Build SQL update query
        const updateFields = [];
        const updateValues = [];
        
        if (updateData.liga) {
          updateFields.push('liga = ?');
          updateValues.push(updateData.liga);
        }
        if (updateData.status) {
          updateFields.push('status = ?');
          updateValues.push(updateData.status);
        }
        
        updateValues.push(mannschaft.id);
        
        const updateQuery = `UPDATE mannschaften SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(updateQuery).run(...updateValues);
        
        fixedCount++;
        console.log(`✅ Fixed ${mannschaft.name}`);
      } else {
        console.log(`✅ ${mannschaft.name} - Liga: "${mannschaft.liga}", Status: "${mannschaft.status}" (OK)`);
      }
    }

    db.close();
    console.log(`\n🎉 Fixed ${fixedCount} mannschaften with invalid enum values`);
    
  } catch (error) {
    console.error('❌ Error fixing liga enum validation:', error);
  }
}

// Run the fix
fixLigaEnumValidation()
  .then(() => {
    console.log('✅ Liga enum validation fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });