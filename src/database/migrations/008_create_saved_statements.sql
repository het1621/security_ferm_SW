-- Migration 008: Create saved_statements table for permanent statement archive
-- Every financial transaction saves a snapshot here

CREATE TABLE IF NOT EXISTS saved_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Domain classification
    domain VARCHAR(20) NOT NULL CHECK (domain IN ('invoice', 'vendor', 'gst', 'tds', 'payroll')),
    
    -- Human-readable reference
    statement_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    
    -- Links back to source record
    reference_id INTEGER,
    reference_type VARCHAR(50),
    
    -- The actual statement data (JSON snapshot)
    statement_data TEXT NOT NULL,
    
    -- Optional PDF path
    pdf_path VARCHAR(500),
    
    -- Financial summary fields for quick display
    total_amount REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    
    -- Contextual metadata
    period_from DATE,
    period_to DATE,
    party_name VARCHAR(255),
    party_id INTEGER,
    
    -- Audit
    generated_by INTEGER REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Soft delete
    is_archived INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_saved_statements_domain ON saved_statements(domain);
CREATE INDEX IF NOT EXISTS idx_saved_statements_party ON saved_statements(party_name);
CREATE INDEX IF NOT EXISTS idx_saved_statements_date ON saved_statements(generated_at);
CREATE INDEX IF NOT EXISTS idx_saved_statements_ref ON saved_statements(reference_id, reference_type);
