-- Migration: Create views and materialized views for performance optimization
-- Version: 002
-- Description: Creates optimized views for automation monitoring and basic statistics

-- Note: Complex team statistics views are omitted in this version due to Strapi's 
-- relation structure using link tables. These will be implemented in application logic.

-- Create view for queue monitoring
CREATE OR REPLACE VIEW queue_status_view AS
SELECT 
    status,
    priority,
    COUNT(*) as job_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, CURRENT_TIMESTAMP) - created_at))) as avg_duration_seconds,
    MIN(created_at) as oldest_job,
    MAX(created_at) as newest_job
FROM queue_jobs
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY status, priority
ORDER BY priority DESC, status;

-- Create view for system health monitoring
CREATE OR REPLACE VIEW system_health_view AS
SELECT 
    'queue_jobs' as component,
    COUNT(*) as total_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as recent_count
FROM queue_jobs

UNION ALL

SELECT 
    'snapshots' as component,
    COUNT(*) as total_count,
    COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as recent_count,
    0 as processing_count,
    0 as failed_count,
    AVG(size_bytes)::INTEGER as avg_size
FROM table_snapshots

UNION ALL

SELECT 
    'calculations' as component,
    COUNT(*) as total_count,
    COUNT(CASE WHEN calculation_status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN calculation_status = 'processing' THEN 1 END) as processing_count,
    COUNT(CASE WHEN calculation_status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN last_calculation > CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 END) as recent_count
FROM spiele;

-- Create function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_automation_data()
RETURNS void AS $$
BEGIN
    -- Clean up old completed queue jobs (older than 7 days)
    DELETE FROM queue_jobs 
    WHERE status IN ('completed', 'failed') 
        AND completed_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
    
    -- Clean up old snapshots (older than 30 days)
    DELETE FROM table_snapshots 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Clean up old audit logs (older than 90 days)
    DELETE FROM automation_audit_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;