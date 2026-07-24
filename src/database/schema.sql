-- Security Firm Management Software - Database Schema
-- PostgreSQL 14+

-- Enable extensions


-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'employee')),
    is_active INTEGER DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    permissions TEXT
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- 2. CLIENTS (SOCIETIES) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Gujarat',
    postal_code VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    gst_number VARCHAR(20),
    contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contract_end_date DATE,
    monthly_rate REAL NOT NULL,
    billing_cycle INT DEFAULT 1,
    notes TEXT,
    is_active INTEGER DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    CONSTRAINT positive_rate CHECK (monthly_rate > 0)
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

-- ============================================================
-- 3. SALARY STRUCTURES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS salary_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    base_salary REAL NOT NULL,
    dearness_allowance REAL DEFAULT 0,
    house_rent_allowance REAL DEFAULT 0,
    other_allowances REAL DEFAULT 0,
    pf_percentage REAL DEFAULT 12.0,
    esi_applicable INTEGER DEFAULT false,
    income_tax_applicable INTEGER DEFAULT false,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active INTEGER DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_salary CHECK (base_salary > 0),
    CONSTRAINT valid_pf CHECK (pf_percentage BETWEEN 0 AND 100)
);

-- ============================================================
-- 4. EMPLOYEES (WATCHMEN) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    address TEXT,
    city VARCHAR(100),
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    bank_account_number VARCHAR(25),
    bank_ifsc_code VARCHAR(15),
    bank_name VARCHAR(100),
    bank_account_holder_name VARCHAR(255),
    date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
    designation VARCHAR(100) DEFAULT 'Watchman',
    salary_structure_id INT REFERENCES salary_structures(id),
    assigned_client_id INT REFERENCES clients(id),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    notes TEXT,
    is_active INTEGER DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(full_name);
CREATE INDEX IF NOT EXISTS idx_employees_joining ON employees(date_of_joining);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

-- ============================================================
-- 5. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INT NOT NULL REFERENCES employees(id),
    client_id INT REFERENCES clients(id),
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    hours_worked REAL,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'leave', 'holiday', 'half_day')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    UNIQUE(employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_client_date ON attendance(client_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- ============================================================
-- 6. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL REFERENCES clients(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount_subtotal REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    final_amount REAL NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    payment_received REAL DEFAULT 0,
    payment_due REAL,
    tax_type VARCHAR(20) DEFAULT 'none' CHECK (tax_type IN ('none', 'cgst_sgst', 'igst')),
    cgst_amount REAL DEFAULT 0,
    sgst_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    is_rcm_applicable INTEGER DEFAULT false,
    duty_days_worked INT,
    is_ad_hoc INTEGER DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

-- ============================================================
-- 6.5. EXPENSE CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active INTEGER DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INT NOT NULL REFERENCES invoices(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid REAL NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'bank_transfer', 'upi', 'card')),
    transaction_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    CONSTRAINT positive_payment CHECK (amount_paid > 0)
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================================
-- 8. PAYROLL TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INT NOT NULL REFERENCES employees(id),
    payroll_month DATE NOT NULL,
    days_in_month INT NOT NULL DEFAULT 30,
    days_worked INT NOT NULL DEFAULT 0,
    days_absent INT DEFAULT 0,
    days_leave INT DEFAULT 0,
    base_salary REAL NOT NULL,
    da_amount REAL DEFAULT 0,
    hra_amount REAL DEFAULT 0,
    other_allowances REAL DEFAULT 0,
    gross_salary REAL NOT NULL,
    pf_deduction REAL DEFAULT 0,
    esi_deduction REAL DEFAULT 0,
    tax_deduction REAL DEFAULT 0,
    other_deductions REAL DEFAULT 0,
    total_deductions REAL DEFAULT 0,
    net_salary REAL NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_date DATE,
    payment_method VARCHAR(20),
    transaction_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    UNIQUE(employee_id, payroll_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_emp_month ON payroll(employee_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(payment_status);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(payroll_month);

-- ============================================================
-- 9. EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('utilities', 'equipment', 'supplies', 'maintenance', 'transport', 'communication', 'salary_advance', 'miscellaneous')),
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'cheque', 'bank_transfer', 'card', 'upi')),
    vendor_name VARCHAR(255),
    receipt_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    approver_id INT REFERENCES users(id),
    approval_date TIMESTAMP,
    approval_notes TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    CONSTRAINT positive_expense CHECK (amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

-- ============================================================
-- 10. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    action VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout')),
    old_values TEXT,
    new_values TEXT,
    user_id INT REFERENCES users(id),
    ip_address VARCHAR(45),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- 11. ERROR LOGS TABLE
-- ============================================================
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
    severity VARCHAR(20) DEFAULT 'medium',
    feature VARCHAR(100),
    is_critical BOOLEAN DEFAULT false,
    is_resolved INTEGER DEFAULT 0,
    assigned_to INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    resolved_by INTEGER,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ERROR SUMMARY & NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS error_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE,
    total_errors INTEGER DEFAULT 0,
    critical_errors INTEGER DEFAULT 0,
    high_errors INTEGER DEFAULT 0,
    medium_errors INTEGER DEFAULT 0,
    low_errors INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS error_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_log_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP,
    FOREIGN KEY (error_log_id) REFERENCES error_logs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_errors_severity_created ON error_logs(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_feature_created ON error_logs(feature, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_errors_is_resolved ON error_logs(is_resolved);

-- ============================================================
-- DEFAULT ADMIN USER (password: Admin@123)
-- ============================================================
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@securityfirm.com',
    '$2b$12$eEzxhJcQIcPFxMLQHJKnw.PPMkkBhW/oU151k9ufmiw6aYarEpCT.',
    'System Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SAMPLE SALARY STRUCTURES
-- ============================================================
INSERT INTO salary_structures (name, base_salary, dearness_allowance, house_rent_allowance, pf_percentage) VALUES
('Basic Watchman - Grade A', 18000, 2000, 1500, 12.0),
('Senior Watchman - Grade B', 22000, 2500, 2000, 12.0),
('Head Guard - Grade C', 28000, 3000, 2500, 12.0),
('Supervisor - Grade D', 35000, 4000, 3000, 12.0)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE CLIENTS
-- ============================================================
INSERT INTO clients (name, address, city, state, phone, contact_person, monthly_rate, contract_start_date) VALUES
('Shanti Apartment Society', 'Plot 12, SG Highway, Bodakdev', 'Ahmedabad', 'Gujarat', '9876543210', 'Ramesh Patel', 45000, '2025-01-01'),
('Green Valley Complex', '34, Science City Road, Sola', 'Ahmedabad', 'Gujarat', '9876543211', 'Sunil Shah', 55000, '2025-02-01'),
('Sunrise Residency', '78, Bopal Road, Ghuma', 'Ahmedabad', 'Gujarat', '9876543212', 'Kavita Mehta', 38000, '2025-03-01'),
('Royal Heights', '22, Prahlad Nagar, Anandnagar', 'Ahmedabad', 'Gujarat', '9876543213', 'Ajay Desai', 62000, '2025-01-15'),
('Metro Tower', '5, CG Road, Navrangpura', 'Ahmedabad', 'Gujarat', '9876543214', 'Priya Joshi', 75000, '2024-12-01')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8. SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (setting_key, setting_value)
VALUES (
    'invoice_email_template',
    'Dear {{client_name}},\n\nPlease find attached the invoice {{invoice_number}} for the period {{billing_period}}.\n\nTotal Amount: ₹{{total_amount}}\nDue Date: {{due_date}}\n\nThank you for your business.\n\nRegards,\nSecurity Agency'
) ON CONFLICT (setting_key) DO NOTHING;

-- ============================================================
-- 15. PERFORMANCE INDEXES (Phase 16)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_employees_client_id ON employees(assigned_client_id);
CREATE INDEX IF NOT EXISTS idx_employees_salary_struct ON employees(salary_structure_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payroll_created_by ON payroll(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approver_id ON expenses(approver_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);- -   M i g r a t i o n   0 1 3 :   A d v a n c e d   V o u c h e r s   F e a t u r e s   ( B u d g e t s ,   R e c u r r i n g ,   P a y m e n t   T e r m s )  
  
 - -   1 .   B u d g e t s   T a b l e  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   b u d g e t s   (  
         i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,  
         e n t i t y _ t y p e   V A R C H A R ( 5 0 )   N O T   N U L L   C H E C K   ( e n t i t y _ t y p e   I N   ( ' g l o b a l ' ,   ' c l i e n t ' ,   ' v e n d o r ' ,   ' s i t e ' ) ) ,  
         e n t i t y _ i d   I N T ,  
         b u d g e t _ c a t e g o r y   V A R C H A R ( 1 0 0 ) ,  
         a m o u n t   R E A L   N O T   N U L L   C H E C K   ( a m o u n t   >   0 ) ,  
         p e r i o d _ s t a r t   D A T E   N O T   N U L L ,  
         p e r i o d _ e n d   D A T E   N O T   N U L L ,  
         c r e a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P  
 ) ;  
  
 - -   2 .   R e c u r r i n g   V o u c h e r s   T a b l e  
 C R E A T E   T A B L E   I F   N O T   E X I S T S   r e c u r r i n g _ v o u c h e r s   (  
         i d   I N T E G E R   P R I M A R Y   K E Y   A U T O I N C R E M E N T ,  
         t e m p l a t e _ v o u c h e r _ i d   I N T   N O T   N U L L   R E F E R E N C E S   v o u c h e r s ( i d )   O N   D E L E T E   C A S C A D E ,  
         f r e q u e n c y   V A R C H A R ( 2 0 )   N O T   N U L L   C H E C K   ( f r e q u e n c y   I N   ( ' d a i l y ' ,   ' w e e k l y ' ,   ' m o n t h l y ' ,   ' q u a r t e r l y ' ,   ' y e a r l y ' ) ) ,  
         n e x t _ r u n _ d a t e   D A T E   N O T   N U L L ,  
         i s _ a c t i v e   B O O L E A N   D E F A U L T   1 ,  
         c r e a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P ,  
         c r e a t e d _ b y   I N T   R E F E R E N C E S   u s e r s ( i d )  
 ) ;  
  
 - -   3 .   V e n d o r s   A l t e r  
 A L T E R   T A B L E   v e n d o r s   A D D   C O L U M N   p a y m e n t _ t e r m s _ d a y s   I N T E G E R   D E F A U L T   0 ;  
  
 - -   4 .   V o u c h e r s   A l t e r  
 A L T E R   T A B L E   v o u c h e r s   A D D   C O L U M N   d u e _ d a t e   D A T E ;  
 A L T E R   T A B L E   v o u c h e r s   A D D   C O L U M N   c a t e g o r y   V A R C H A R ( 1 0 0 ) ;  
 