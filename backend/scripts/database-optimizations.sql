-- Database Optimizations for Club Operations
-- This script creates indexes, materialized views, and other optimizations
-- for improved performance of club-related queries

-- ============================================================================
-- INDEXES FOR CLUB-RELATED QUERIES
-- ============================================================================

-- Club table optimizations
CREATE INDEX IF NOT EXISTS idx_clubs_typ_aktiv ON clubs(club_typ, aktiv);
CREATE INDEX IF NOT EXISTS idx_clubs_viktoria_mapping ON clubs(viktoria_team_mapping) WHERE club_typ = 'viktoria_verein';
CREATE INDEX IF NOT EXISTS idx_clubs_name_search ON clubs USING gin(to_tsvector('german', name));
CREATE INDEX IF NOT EXISTS idx_clubs_aktiv ON clubs(aktiv) WHERE aktiv = true;

-- Spiele table optimizations for club queries
CREATE INDEX IF NOT EXISTS idx_spiele_clubs_liga_saison ON spiele(heim_club_id, gast_club_id, liga_id, saison_id);
CREATE INDEX IF NOT EXISTS idx_spiele_heim_club_status ON spiele(heim_club_id, status) WHERE status = 'beendet';
CREATE INDEX IF NOT EXISTS idx_spiele_gast_club_status ON spiele(gast_club_id, status) WHERE status = 'beendet';
CREATE INDEX IF NOT EXISTS idx_spiele_liga_saison_status ON spiele(liga_id, saison_id, status);
CREATE INDEX IF NOT EXISTS idx_spiele_datum_status ON spiele(datum, status);

-- Tabellen-Einträge optimizations
CREATE INDEX IF NOT EXISTS idx_tabellen_club_liga ON tabellen_eintraege(club_id, liga_id);
CREATE INDEX IF NOT EXISTS idx_tabellen_liga_platz ON tabellen_eintraege(liga_id, platz);
CREATE INDEX IF NOT EXISTS idx_tabellen_punkte_tordiff ON tabellen_eintraege(liga_id, punkte DESC, tordifferenz DESC);

-- Club-Liga relationship optimizations
CREATE INDEX IF NOT EXISTS idx_clubs_ligen_links_club ON clubs_ligen_links(club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_ligen_links_liga ON clubs_ligen_links(liga_id);
CREATE INDEX IF NOT EXISTS idx_clubs_ligen_links_composite ON clubs_ligen_links(club_id, liga_id);

-- ============================================================================
-- MATERIALIZED VIEWS FOR CLUB-LIGA STATISTICS
-- ============================================================================

-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS club_liga_stats;

-- Create materialized view for club-liga statistics
CREATE MATERIALIZED VIEW club_liga_stats AS
SELECT 
    c.id as club_id,
    c.document_id as club_document_id,
    c.name as club_name,
    c.kurz_name,
    c.club_typ,
    c.viktoria_team_mapping,
    l.id as liga_id,
    l.document_id as liga_document_id,
    l.name as liga_name,
    COUNT(DISTINCT s.id) as total_spiele,
    COUNT(DISTINCT CASE WHEN s.status = 'beendet' THEN s.id END) as beendete_spiele,
    COUNT(DISTINCT CASE WHEN s.heim_club_id = c.id AND s.status = 'beendet' THEN s.id END) as heim_spiele,
    COUNT(DISTINCT CASE WHEN s.gast_club_id = c.id AND s.status = 'beendet' THEN s.id END) as gast_spiele,
    COALESCE(SUM(CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' THEN s.heim_tore 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' THEN s.gast_tore 
        ELSE 0 
    END), 0) as tore_fuer,
    COALESCE(SUM(CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' THEN s.gast_tore 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' THEN s.heim_tore 
        ELSE 0 
    END), 0) as tore_gegen,
    c.aktiv,
    c.created_at,
    c.updated_at
FROM clubs c
JOIN clubs_ligen_links cll ON c.id = cll.club_id
JOIN ligen l ON cll.liga_id = l.id
LEFT JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id) 
    AND s.liga_id = l.id
WHERE c.aktiv = true
GROUP BY c.id, c.document_id, c.name, c.kurz_name, c.club_typ, c.viktoria_team_mapping, 
         l.id, l.document_id, l.name, c.aktiv, c.created_at, c.updated_at;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_club_liga_stats_unique ON club_liga_stats(club_id, liga_id);
CREATE INDEX idx_club_liga_stats_club ON club_liga_stats(club_id);
CREATE INDEX idx_club_liga_stats_liga ON club_liga_stats(liga_id);
CREATE INDEX idx_club_liga_stats_typ ON club_liga_stats(club_typ);
CREATE INDEX idx_club_liga_stats_viktoria ON club_liga_stats(viktoria_team_mapping) WHERE club_typ = 'viktoria_verein';

-- ============================================================================
-- MATERIALIZED VIEW FOR CURRENT SEASON STATISTICS
-- ============================================================================

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS current_season_club_stats;

-- Create materialized view for current season club statistics
CREATE MATERIALIZED VIEW current_season_club_stats AS
WITH current_saison AS (
    SELECT id, document_id, name 
    FROM saisons 
    WHERE aktiv = true 
    LIMIT 1
)
SELECT 
    c.id as club_id,
    c.document_id as club_document_id,
    c.name as club_name,
    c.kurz_name,
    c.club_typ,
    c.viktoria_team_mapping,
    l.id as liga_id,
    l.document_id as liga_document_id,
    l.name as liga_name,
    cs.id as saison_id,
    cs.name as saison_name,
    COUNT(DISTINCT s.id) as total_spiele,
    COUNT(DISTINCT CASE WHEN s.status = 'beendet' THEN s.id END) as beendete_spiele,
    COUNT(DISTINCT CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' 
             AND s.heim_tore > s.gast_tore THEN s.id 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' 
             AND s.gast_tore > s.heim_tore THEN s.id 
    END) as siege,
    COUNT(DISTINCT CASE 
        WHEN (s.heim_club_id = c.id OR s.gast_club_id = c.id) 
             AND s.status = 'beendet' 
             AND s.heim_tore = s.gast_tore THEN s.id 
    END) as unentschieden,
    COUNT(DISTINCT CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' 
             AND s.heim_tore < s.gast_tore THEN s.id 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' 
             AND s.gast_tore < s.heim_tore THEN s.id 
    END) as niederlagen,
    COALESCE(SUM(CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' THEN s.heim_tore 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' THEN s.gast_tore 
        ELSE 0 
    END), 0) as tore_fuer,
    COALESCE(SUM(CASE 
        WHEN s.heim_club_id = c.id AND s.status = 'beendet' THEN s.gast_tore 
        WHEN s.gast_club_id = c.id AND s.status = 'beendet' THEN s.heim_tore 
        ELSE 0 
    END), 0) as tore_gegen,
    -- Calculate points (3 for win, 1 for draw, 0 for loss)
    COALESCE(
        COUNT(DISTINCT CASE 
            WHEN s.heim_club_id = c.id AND s.status = 'beendet' 
                 AND s.heim_tore > s.gast_tore THEN s.id 
            WHEN s.gast_club_id = c.id AND s.status = 'beendet' 
                 AND s.gast_tore > s.heim_tore THEN s.id 
        END) * 3 +
        COUNT(DISTINCT CASE 
            WHEN (s.heim_club_id = c.id OR s.gast_club_id = c.id) 
                 AND s.status = 'beendet' 
                 AND s.heim_tore = s.gast_tore THEN s.id 
        END), 0
    ) as punkte,
    c.aktiv,
    NOW() as last_updated
FROM clubs c
JOIN clubs_ligen_links cll ON c.id = cll.club_id
JOIN ligen l ON cll.liga_id = l.id
CROSS JOIN current_saison cs
LEFT JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id) 
    AND s.liga_id = l.id 
    AND s.saison_id = cs.id
WHERE c.aktiv = true
GROUP BY c.id, c.document_id, c.name, c.kurz_name, c.club_typ, c.viktoria_team_mapping, 
         l.id, l.document_id, l.name, cs.id, cs.name, c.aktiv;

-- Create indexes on current season stats
CREATE UNIQUE INDEX idx_current_season_stats_unique ON current_season_club_stats(club_id, liga_id);
CREATE INDEX idx_current_season_stats_club ON current_season_club_stats(club_id);
CREATE INDEX idx_current_season_stats_liga ON current_season_club_stats(liga_id);
CREATE INDEX idx_current_season_stats_punkte ON current_season_club_stats(liga_id, punkte DESC, tore_fuer - tore_gegen DESC);

-- ============================================================================
-- FUNCTIONS FOR MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Function to refresh club statistics materialized views
CREATE OR REPLACE FUNCTION refresh_club_stats_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY club_liga_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_season_club_stats;
    
    -- Log the refresh
    INSERT INTO system_logs (level, message, created_at) 
    VALUES ('info', 'Club statistics materialized views refreshed', NOW())
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MATERIALIZED VIEW REFRESH
-- ============================================================================

-- Function to handle materialized view refresh after data changes
CREATE OR REPLACE FUNCTION trigger_refresh_club_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Use pg_notify to trigger async refresh to avoid blocking
    PERFORM pg_notify('refresh_club_stats', 'data_changed');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic refresh
DROP TRIGGER IF EXISTS trigger_refresh_club_stats_spiele ON spiele;
CREATE TRIGGER trigger_refresh_club_stats_spiele
    AFTER INSERT OR UPDATE OR DELETE ON spiele
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_club_stats();

DROP TRIGGER IF EXISTS trigger_refresh_club_stats_clubs ON clubs;
CREATE TRIGGER trigger_refresh_club_stats_clubs
    AFTER INSERT OR UPDATE OR DELETE ON clubs
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_club_stats();

DROP TRIGGER IF EXISTS trigger_refresh_club_stats_links ON clubs_ligen_links;
CREATE TRIGGER trigger_refresh_club_stats_links
    AFTER INSERT OR UPDATE OR DELETE ON clubs_ligen_links
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_club_stats();

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to get clubs by liga with optimized query
CREATE OR REPLACE FUNCTION get_clubs_by_liga(liga_id_param INTEGER)
RETURNS TABLE (
    club_id INTEGER,
    club_name VARCHAR(100),
    kurz_name VARCHAR(20),
    club_typ VARCHAR(20),
    viktoria_team_mapping VARCHAR(10),
    total_spiele BIGINT,
    beendete_spiele BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cls.club_id,
        cls.club_name,
        cls.kurz_name,
        cls.club_typ,
        cls.viktoria_team_mapping,
        cls.total_spiele,
        cls.beendete_spiele
    FROM club_liga_stats cls
    WHERE cls.liga_id = liga_id_param
        AND cls.aktiv = true
    ORDER BY cls.club_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get viktoria club by team mapping
CREATE OR REPLACE FUNCTION get_viktoria_club_by_team(team_mapping VARCHAR(10))
RETURNS TABLE (
    club_id INTEGER,
    club_document_id VARCHAR(255),
    club_name VARCHAR(100),
    kurz_name VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        c.name,
        c.kurz_name
    FROM clubs c
    WHERE c.club_typ = 'viktoria_verein'
        AND c.viktoria_team_mapping = team_mapping
        AND c.aktiv = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get current season table for liga
CREATE OR REPLACE FUNCTION get_current_season_table(liga_id_param INTEGER)
RETURNS TABLE (
    club_id INTEGER,
    club_name VARCHAR(100),
    kurz_name VARCHAR(20),
    spiele BIGINT,
    siege BIGINT,
    unentschieden BIGINT,
    niederlagen BIGINT,
    tore_fuer NUMERIC,
    tore_gegen NUMERIC,
    tordifferenz NUMERIC,
    punkte NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        css.club_id,
        css.club_name,
        css.kurz_name,
        css.beendete_spiele as spiele,
        css.siege,
        css.unentschieden,
        css.niederlagen,
        css.tore_fuer,
        css.tore_gegen,
        (css.tore_fuer - css.tore_gegen) as tordifferenz,
        css.punkte
    FROM current_season_club_stats css
    WHERE css.liga_id = liga_id_param
        AND css.aktiv = true
    ORDER BY css.punkte DESC, (css.tore_fuer - css.tore_gegen) DESC, css.tore_fuer DESC, css.club_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Set optimal connection parameters for club operations
-- These should be set in postgresql.conf or via ALTER SYSTEM

-- Increase shared_buffers for better caching (adjust based on available RAM)
-- shared_buffers = 256MB (for systems with 1GB+ RAM)

-- Optimize work_mem for sorting operations
-- work_mem = 4MB

-- Increase effective_cache_size to help query planner
-- effective_cache_size = 1GB

-- Enable parallel query execution for large datasets
-- max_parallel_workers_per_gather = 2
-- max_parallel_workers = 8

-- Optimize checkpoint settings for write performance
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB

-- ============================================================================
-- PERFORMANCE MONITORING SETUP
-- ============================================================================

-- Create table for performance monitoring if it doesn't exist
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20),
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON performance_metrics(metric_name, created_at);

-- Function to log performance metrics
CREATE OR REPLACE FUNCTION log_performance_metric(
    p_metric_name VARCHAR(100),
    p_metric_value NUMERIC,
    p_metric_unit VARCHAR(20) DEFAULT 'ms',
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, context)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_context);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to clean up old performance metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS void AS $$
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Log cleanup
    PERFORM log_performance_metric('cleanup_performance_metrics', 
        (SELECT COUNT(*) FROM performance_metrics), 'records');
END;
$$ LANGUAGE plpgsql;

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_level_time ON system_logs(level, created_at);

-- ============================================================================
-- INITIAL DATA REFRESH
-- ============================================================================

-- Refresh materialized views initially
SELECT refresh_club_stats_views();

-- Log completion
INSERT INTO system_logs (level, message, context) 
VALUES ('info', 'Database optimizations applied successfully', 
        '{"script": "database-optimizations.sql", "version": "1.0"}'::jsonb);