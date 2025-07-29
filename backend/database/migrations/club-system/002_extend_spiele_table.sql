-- +migrate up
-- Add club relation fields to spiele table
ALTER TABLE spiele 
ADD COLUMN IF NOT EXISTS heim_club_id INTEGER,
ADD COLUMN IF NOT EXISTS gast_club_id INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spiele_heim_club ON spiele(heim_club_id);
CREATE INDEX IF NOT EXISTS idx_spiele_gast_club ON spiele(gast_club_id);
CREATE INDEX IF NOT EXISTS idx_spiele_clubs_liga ON spiele(heim_club_id, gast_club_id, liga_id);
CREATE INDEX IF NOT EXISTS idx_spiele_clubs_saison ON spiele(heim_club_id, gast_club_id, saison_id);

-- Add foreign key constraints (will be enabled after clubs are populated)
-- ALTER TABLE spiele ADD CONSTRAINT fk_spiele_heim_club 
-- FOREIGN KEY (heim_club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- ALTER TABLE spiele ADD CONSTRAINT fk_spiele_gast_club 
-- FOREIGN KEY (gast_club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- Add validation constraint to ensure either team OR club fields are populated
-- This will be enabled after migration is complete
-- ALTER TABLE spiele ADD CONSTRAINT check_spiele_team_or_club 
-- CHECK (
--     (heim_team_id IS NOT NULL AND gast_team_id IS NOT NULL) OR 
--     (heim_club_id IS NOT NULL AND gast_club_id IS NOT NULL)
-- );

-- Add automation tracking fields
ALTER TABLE spiele 
ADD COLUMN IF NOT EXISTS last_calculation TIMESTAMP,
ADD COLUMN IF NOT EXISTS calculation_status VARCHAR(20) DEFAULT 'pending' CHECK (calculation_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS calculation_error TEXT;

-- Create index for automation queries
CREATE INDEX IF NOT EXISTS idx_spiele_calculation_status ON spiele(calculation_status);
CREATE INDEX IF NOT EXISTS idx_spiele_last_calculation ON spiele(last_calculation);

-- +migrate down
-- Remove indexes
DROP INDEX IF EXISTS idx_spiele_last_calculation;
DROP INDEX IF EXISTS idx_spiele_calculation_status;
DROP INDEX IF EXISTS idx_spiele_clubs_saison;
DROP INDEX IF EXISTS idx_spiele_clubs_liga;
DROP INDEX IF EXISTS idx_spiele_gast_club;
DROP INDEX IF EXISTS idx_spiele_heim_club;

-- Remove constraints (if they were added)
-- ALTER TABLE spiele DROP CONSTRAINT IF EXISTS check_spiele_team_or_club;
-- ALTER TABLE spiele DROP CONSTRAINT IF EXISTS fk_spiele_gast_club;
-- ALTER TABLE spiele DROP CONSTRAINT IF EXISTS fk_spiele_heim_club;

-- Remove columns
ALTER TABLE spiele 
DROP COLUMN IF EXISTS calculation_error,
DROP COLUMN IF EXISTS calculation_status,
DROP COLUMN IF EXISTS last_calculation,
DROP COLUMN IF EXISTS gast_club_id,
DROP COLUMN IF EXISTS heim_club_id;