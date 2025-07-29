-- +migrate up
-- Add performance optimizations for club system

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_spiele_club_status_datum ON spiele(heim_club_id, gast_club_id, status, datum) 
WHERE heim_club_id IS NOT NULL AND gast_club_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spiele_liga_saison_clubs ON spiele(liga_id, saison_id, heim_club_id, gast_club_id)
WHERE heim_club_id IS NOT NULL AND gast_club_id IS NOT NULL;

-- Create partial indexes for active clubs only
CREATE INDEX IF NOT EXISTS idx_clubs_active_viktoria ON clubs(viktoria_team_mapping, name) 
WHERE aktiv = true AND club_typ = 'viktoria_verein';

CREATE INDEX IF NOT EXISTS idx_clubs_active_gegner ON clubs(name) 
WHERE aktiv = true AND club_typ = 'gegner_verein';

-- Create function for efficient club lookup by team mapping
CREATE OR REPLACE FUNCTION get_club_by_team_mapping(team_mapping VARCHAR(10))
RETURNS TABLE(
    id INTEGER,
    document_id VARCHAR(255),
    name VARCHAR(100),
    kurz_name VARCHAR(20),
    club_typ VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.document_id, c.name, c.kurz_name, c.club_typ
    FROM clubs c
    WHERE c.viktoria_team_mapping = team_mapping 
    AND c.aktiv = true 
    AND c.club_typ = 'viktoria_verein';
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for efficient club games lookup
CREATE OR REPLACE FUNCTION get_club_games_for_liga(
    p_liga_id INTEGER, 
    p_saison_id INTEGER,
    p_status VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
    id INTEGER,
    datum TIMESTAMP,
    heim_club_id INTEGER,
    gast_club_id INTEGER,
    heim_tore INTEGER,
    gast_tore INTEGER,
    status VARCHAR(20),
    spieltag INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.datum, s.heim_club_id, s.gast_club_id, 
           s.heim_tore, s.gast_tore, s.status, s.spieltag
    FROM spiele s
    WHERE s.liga_id = p_liga_id 
    AND s.saison_id = p_saison_id
    AND s.heim_club_id IS NOT NULL 
    AND s.gast_club_id IS NOT NULL
    AND (p_status IS NULL OR s.status = p_status)
    ORDER BY s.spieltag, s.datum;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function for club statistics calculation
CREATE OR REPLACE FUNCTION calculate_club_stats(
    p_club_id INTEGER,
    p_liga_id INTEGER,
    p_saison_id INTEGER
)
RETURNS TABLE(
    club_id INTEGER,
    spiele INTEGER,
    siege INTEGER,
    unentschieden INTEGER,
    niederlagen INTEGER,
    tore_fuer INTEGER,
    tore_gegen INTEGER,
    tordifferenz INTEGER,
    punkte INTEGER
) AS $$
DECLARE
    stats RECORD;
BEGIN
    SELECT 
        COUNT(*) as total_games,
        SUM(CASE 
            WHEN (s.heim_club_id = p_club_id AND s.heim_tore > s.gast_tore) OR 
                 (s.gast_club_id = p_club_id AND s.gast_tore > s.heim_tore) 
            THEN 1 ELSE 0 END) as wins,
        SUM(CASE 
            WHEN s.heim_tore = s.gast_tore 
            THEN 1 ELSE 0 END) as draws,
        SUM(CASE 
            WHEN (s.heim_club_id = p_club_id AND s.heim_tore < s.gast_tore) OR 
                 (s.gast_club_id = p_club_id AND s.gast_tore < s.heim_tore) 
            THEN 1 ELSE 0 END) as losses,
        SUM(CASE 
            WHEN s.heim_club_id = p_club_id THEN s.heim_tore 
            ELSE s.gast_tore END) as goals_for,
        SUM(CASE 
            WHEN s.heim_club_id = p_club_id THEN s.gast_tore 
            ELSE s.heim_tore END) as goals_against
    INTO stats
    FROM spiele s
    WHERE (s.heim_club_id = p_club_id OR s.gast_club_id = p_club_id)
    AND s.liga_id = p_liga_id
    AND s.saison_id = p_saison_id
    AND s.status = 'beendet'
    AND s.heim_tore IS NOT NULL
    AND s.gast_tore IS NOT NULL;
    
    RETURN QUERY
    SELECT 
        p_club_id,
        COALESCE(stats.total_games, 0)::INTEGER,
        COALESCE(stats.wins, 0)::INTEGER,
        COALESCE(stats.draws, 0)::INTEGER,
        COALESCE(stats.losses, 0)::INTEGER,
        COALESCE(stats.goals_for, 0)::INTEGER,
        COALESCE(stats.goals_against, 0)::INTEGER,
        COALESCE(stats.goals_for - stats.goals_against, 0)::INTEGER,
        COALESCE(stats.wins * 3 + stats.draws, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_club_table_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY club_table_stats;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh materialized view when tabellen_eintraege changes
CREATE OR REPLACE FUNCTION trigger_refresh_club_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify to trigger async refresh
    PERFORM pg_notify('refresh_club_stats', '');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tabellen_eintraege_refresh_stats
    AFTER INSERT OR UPDATE OR DELETE ON tabellen_eintraege
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_club_stats();

-- +migrate down
-- Remove trigger and functions
DROP TRIGGER IF EXISTS trigger_tabellen_eintraege_refresh_stats ON tabellen_eintraege;
DROP FUNCTION IF EXISTS trigger_refresh_club_stats();
DROP FUNCTION IF EXISTS refresh_club_table_stats();
DROP FUNCTION IF EXISTS calculate_club_stats(INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_club_games_for_liga(INTEGER, INTEGER, VARCHAR(20));
DROP FUNCTION IF EXISTS get_club_by_team_mapping(VARCHAR(10));

-- Remove indexes
DROP INDEX IF EXISTS idx_clubs_active_gegner;
DROP INDEX IF EXISTS idx_clubs_active_viktoria;
DROP INDEX IF EXISTS idx_spiele_liga_saison_clubs;
DROP INDEX IF EXISTS idx_spiele_club_status_datum;