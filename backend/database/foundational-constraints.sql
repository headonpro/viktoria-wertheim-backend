-- SQL script to add database constraints and indexes for foundational content types
-- This should be executed after the tables are created by Strapi

-- Add unique constraint for active season (only one can be active)
CREATE UNIQUE INDEX IF NOT EXISTS saisons_unique_active 
ON saisons (aktiv) 
WHERE aktiv = true;

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS saisons_name_idx 
ON saisons (name);

CREATE INDEX IF NOT EXISTS saisons_aktiv_idx 
ON saisons (aktiv);

CREATE INDEX IF NOT EXISTS clubs_name_idx 
ON clubs (name);

CREATE INDEX IF NOT EXISTS clubs_kurz_name_idx 
ON clubs (kurz_name);

CREATE INDEX IF NOT EXISTS clubs_ist_unser_verein_idx 
ON clubs (ist_unser_verein);

CREATE INDEX IF NOT EXISTS ligas_name_idx 
ON ligas (name);

CREATE INDEX IF NOT EXISTS ligas_saison_id_idx 
ON ligas (saison_id);

-- Add check constraints for data validation
ALTER TABLE saisons 
ADD CONSTRAINT saisons_date_check 
CHECK (end_datum > start_datum);

ALTER TABLE ligas 
ADD CONSTRAINT ligas_spieltage_check 
CHECK (spieltage_gesamt > 0);