-- Migration: Create automation tables for tabellen-automatisierung
-- Version: 001
-- Description: Creates queue jobs, snapshots, and audit log tables for table automation

-- Create queue_jobs table for job management
CREATE TABLE IF NOT EXISTS queue_jobs (
    id SERIAL PRIMARY KEY,
    liga_document_id VARCHAR(255),
    saison_document_id VARCHAR(255),
    priority INTEGER DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    job_data JSONB,
    created_by INTEGER
);

-- Create indexes for queue_jobs table
CREATE INDEX IF NOT EXISTS idx_queue_jobs_status ON queue_jobs(status);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_priority ON queue_jobs(priority);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_liga_saison ON queue_jobs(liga_document_id, saison_document_id);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_created_at ON queue_jobs(created_at);

-- Create snapshots table for rollback functionality
CREATE TABLE IF NOT EXISTS table_snapshots (
    id SERIAL PRIMARY KEY,
    liga_document_id VARCHAR(255),
    saison_document_id VARCHAR(255),
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    created_by INTEGER,
    file_path VARCHAR(500),
    compressed BOOLEAN DEFAULT false,
    size_bytes INTEGER
);

-- Create indexes for table_snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_liga_saison ON table_snapshots(liga_document_id, saison_document_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON table_snapshots(created_at);

-- Create audit_logs table for tracking all automation activities
CREATE TABLE IF NOT EXISTS automation_audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    user_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    liga_id INTEGER,
    saison_id INTEGER
);

-- Create indexes for automation_audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON automation_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON automation_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON automation_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON automation_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_liga_saison ON automation_audit_logs(liga_id, saison_id);

-- Add automation-specific columns to existing spiele table
ALTER TABLE spiele 
ADD COLUMN IF NOT EXISTS last_calculation TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS calculation_status VARCHAR(20) DEFAULT 'pending' CHECK (calculation_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS calculation_error TEXT;

-- Add automation-specific columns to existing tabellen_eintraege table
ALTER TABLE tabellen_eintraege 
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS auto_calculated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS calculation_source VARCHAR(100);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_spiele_status ON spiele(status);
CREATE INDEX IF NOT EXISTS idx_spiele_calculation_status ON spiele(calculation_status);
CREATE INDEX IF NOT EXISTS idx_spiele_datum ON spiele(datum);
CREATE INDEX IF NOT EXISTS idx_tabellen_auto_calculated ON tabellen_eintraege(auto_calculated);
CREATE INDEX IF NOT EXISTS idx_tabellen_platz ON tabellen_eintraege(platz);

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tabellen_eintraege
DROP TRIGGER IF EXISTS update_tabellen_eintraege_last_updated ON tabellen_eintraege;
CREATE TRIGGER update_tabellen_eintraege_last_updated
    BEFORE UPDATE ON tabellen_eintraege
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Insert initial configuration data
INSERT INTO automation_audit_logs (action, entity_type, timestamp, user_id)
VALUES ('MIGRATION_APPLIED', 'DATABASE', CURRENT_TIMESTAMP, 0)
ON CONFLICT DO NOTHING;