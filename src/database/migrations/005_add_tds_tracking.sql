-- Migration to add TDS tracking to invoices and payments
ALTER TABLE payments ADD COLUMN tds_deducted REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN tds_deducted REAL DEFAULT 0;
