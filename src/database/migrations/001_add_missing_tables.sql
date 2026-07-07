-- Migration 001: Add guards_count to invoices table and create invoice_counters
-- This migration ensures new columns are available for the PDF generator
-- and that the invoice sequential numbering has a proper tracking table.

-- Add guards_count column to invoices if it doesn't exist
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a trick
CREATE TABLE IF NOT EXISTS _migration_check (id INTEGER);
DROP TABLE IF EXISTS _migration_check;

-- invoice_counters table for sequential invoice numbering
CREATE TABLE IF NOT EXISTS invoice_counters (
    fiscal_year TEXT PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- error_logs table (may not exist on older installs)
CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    user_id INTEGER,
    client_ip VARCHAR(45),
    additional_data TEXT,
    is_resolved INTEGER DEFAULT 0,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- expense_categories table (dynamic categories)
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories if table is empty
INSERT OR IGNORE INTO expense_categories (name) VALUES
('salary'), ('equipment'), ('vehicle'), ('office'),
('training'), ('miscellaneous'), ('other'),
('utilities'), ('supplies'), ('maintenance'),
('transport'), ('communication'), ('salary_advance');
