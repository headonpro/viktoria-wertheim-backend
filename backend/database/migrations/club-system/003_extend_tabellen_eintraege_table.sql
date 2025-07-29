-- +migrate up
-- Add club relation field to tabellen_eintraege table
ALTER TABLE tabellen_eintraege 
ADD COLUMN IF NOT EXISTS club_id INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_club ON tabellen_eintraege(club_id);
CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_club_liga ON tabellen_eintraege(club_id, liga_id);

-- Add foreign key constraint (will be enabled after clubs are populated)
-- ALTER TABLE tabellen_eintraege ADD CONSTRAINT fk_tabellen_eintraege_club 
-- FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- Add automation tracking fields
ALTER TABLE tabellen_eintraege 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_calculated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calculation_source VARCHAR(50) DEFAULT 'manual';

-- Create index for automation queries
CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_auto_calculated ON tabellen_eintraege(auto_calculated);
CREATE INDEX IF NOT EXISTS idx_tabellen_eintraege_last_updated ON tabellen_eintraege(last_updated);

-- Add trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_tabellen_eintraege_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tabellen_eintraege_last_updated
    BEFORE UPDATE ON tabellen_eintraege
    FOR EACH ROW
    EXECUTE FUNCTION update_tabellen_eintraege_last_updated();

-- Create materialized view for club-based table statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS club_table_stats AS
SELECT 
    c.id as club_id,
    c.name as club_name,
    c.kurz_name,
    l.id as liga_id,
    l.name as liga_name,
    te.platz,
    te.spiele,
    te.siege,
    te.unentschieden,
    te.niederlagen,
    te.tore_fuer,
    te.tore_gegen,
    te.tordifferenz,
    te.punkte,
    te.last_updated
FROM clubs c
JOIN tabellen_eintraege te ON c.id = te.club_id
JOIN ligen l ON te.liga_id = l.id
WHERE c.aktiv = true
ORDER BY l.id, te.platz;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_club_table_stats_club_liga ON club_table_stats(club_id, liga_id);
CREATE INDEX IF NOT EXISTS idx_club_table_stats_liga_platz ON club_table_stats(liga_id, platz);

-- +migrate down
-- Remove materialized view and indexes
DROP INDEX IF EXISTS idx_club_table_stats_liga_platz;
DROP INDEX IF EXISTS idx_club_table_stats_club_liga;
DROP MATERIALIZED VIEW IF EXISTS club_table_stats;

-- Remove trigger and function
DROP TRIGGER IF EXISTS trigger_tabellen_eintraege_last_updated ON tabellen_eintraege;
DROP FUNCTION IF EXISTS update_tabellen_eintraege_last_updated();

-- Remove indexes
DROP INDEX IF EXISTS idx_tabellen_eintraege_last_updated;
DROP INDEX IF EXISTS idx_tabellen_eintraege_auto_calculated;
DROP INDEX IF EXISTS idx_tabellen_eintraege_club_liga;
DROP INDEX IF EXISTS idx_tabellen_eintraege_club;

-- Remove constraints (if they were added)
-- ALTER TABLE tabellen_eintraege DROP CONSTRAINT IF EXISTS fk_tabellen_eintraege_club;

-- Remove columns
ALTER TABLE tabellen_eintraege 
DROP COLUMN IF EXISTS calculation_source,
DROP COLUMN IF EXISTS auto_calculated,
DROP COLUMN IF EXISTS last_updated,
DROP COLUMN IF EXISTS club_id;