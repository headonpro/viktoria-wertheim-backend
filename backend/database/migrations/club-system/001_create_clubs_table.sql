-- +migrate up
-- Create clubs table with all required fields
CREATE TABLE IF NOT EXISTS clubs (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) UNIQUE NOT NULL,
    kurz_name VARCHAR(20),
    logo_id INTEGER,
    gruendungsjahr INTEGER CHECK (gruendungsjahr >= 1800 AND gruendungsjahr <= 2030),
    vereinsfarben VARCHAR(50),
    heimstadion VARCHAR(100),
    adresse TEXT,
    website VARCHAR(200),
    club_typ VARCHAR(20) DEFAULT 'gegner_verein' CHECK (club_typ IN ('viktoria_verein', 'gegner_verein')),
    viktoria_team_mapping VARCHAR(10) CHECK (viktoria_team_mapping IN ('team_1', 'team_2', 'team_3')),
    aktiv BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id INTEGER,
    updated_by_id INTEGER,
    published_at TIMESTAMP,
    locale VARCHAR(10) DEFAULT 'de'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clubs_name ON clubs(name);
CREATE INDEX IF NOT EXISTS idx_clubs_typ ON clubs(club_typ);
CREATE INDEX IF NOT EXISTS idx_clubs_aktiv ON clubs(aktiv);
CREATE INDEX IF NOT EXISTS idx_clubs_viktoria_mapping ON clubs(viktoria_team_mapping) WHERE club_typ = 'viktoria_verein';
CREATE INDEX IF NOT EXISTS idx_clubs_document_id ON clubs(document_id);

-- Create unique constraint for viktoria team mapping
CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_viktoria_mapping_unique 
ON clubs(viktoria_team_mapping) 
WHERE viktoria_team_mapping IS NOT NULL AND club_typ = 'viktoria_verein';

-- Create clubs_ligen_links junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS clubs_ligen_links (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL,
    liga_id INTEGER NOT NULL,
    club_order DOUBLE PRECISION,
    liga_order DOUBLE PRECISION,
    UNIQUE(club_id, liga_id)
);

-- Create indexes for junction table
CREATE INDEX IF NOT EXISTS idx_clubs_ligen_club ON clubs_ligen_links(club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_ligen_liga ON clubs_ligen_links(liga_id);

-- Add foreign key constraints (assuming ligen table exists)
-- ALTER TABLE clubs_ligen_links ADD CONSTRAINT fk_clubs_ligen_club 
-- FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW
    EXECUTE FUNCTION update_clubs_updated_at();

-- +migrate down
-- Remove trigger and function
DROP TRIGGER IF EXISTS trigger_clubs_updated_at ON clubs;
DROP FUNCTION IF EXISTS update_clubs_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_clubs_viktoria_mapping_unique;
DROP INDEX IF EXISTS idx_clubs_document_id;
DROP INDEX IF EXISTS idx_clubs_viktoria_mapping;
DROP INDEX IF EXISTS idx_clubs_aktiv;
DROP INDEX IF EXISTS idx_clubs_typ;
DROP INDEX IF EXISTS idx_clubs_name;
DROP INDEX IF EXISTS idx_clubs_ligen_liga;
DROP INDEX IF EXISTS idx_clubs_ligen_club;

-- Drop tables
DROP TABLE IF EXISTS clubs_ligen_links;
DROP TABLE IF EXISTS clubs;