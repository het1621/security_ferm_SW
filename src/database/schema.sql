-- Security Firm Management Software - Database Schema
-- PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'accountant', 'employee')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- 2. CLIENTS (SOCIETIES) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
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
    monthly_rate DECIMAL(12, 2) NOT NULL,
    billing_cycle INT DEFAULT 1,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
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
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    dearness_allowance DECIMAL(12, 2) DEFAULT 0,
    house_rent_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    pf_percentage DECIMAL(5, 2) DEFAULT 12.0,
    esi_applicable BOOLEAN DEFAULT false,
    income_tax_applicable BOOLEAN DEFAULT false,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_salary CHECK (base_salary > 0),
    CONSTRAINT valid_pf CHECK (pf_percentage BETWEEN 0 AND 100)
);

-- ============================================================
-- 4. EMPLOYEES (WATCHMEN) TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
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
    is_active BOOLEAN DEFAULT true,
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
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    client_id INT REFERENCES clients(id),
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    hours_worked DECIMAL(5, 2),
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
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL REFERENCES clients(id),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount_subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    payment_received DECIMAL(12, 2) DEFAULT 0,
    payment_due DECIMAL(12, 2),
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
-- 7. PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid DECIMAL(12, 2) NOT NULL,
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
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    payroll_month DATE NOT NULL,
    days_in_month INT NOT NULL DEFAULT 30,
    days_worked INT NOT NULL DEFAULT 0,
    days_absent INT DEFAULT 0,
    days_leave INT DEFAULT 0,
    base_salary DECIMAL(12, 2) NOT NULL,
    da_amount DECIMAL(12, 2) DEFAULT 0,
    hra_amount DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) NOT NULL,
    pf_deduction DECIMAL(12, 2) DEFAULT 0,
    esi_deduction DECIMAL(12, 2) DEFAULT 0,
    tax_deduction DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) NOT NULL,
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
    id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(30) NOT NULL CHECK (category IN ('utilities', 'equipment', 'supplies', 'maintenance', 'transport', 'communication', 'salary_advance', 'miscellaneous')),
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
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
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT,
    action VARCHAR(10) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'login', 'logout')),
    old_values JSONB,
    new_values JSONB,
    user_id INT REFERENCES users(id),
    ip_address VARCHAR(45),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

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

 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 - -   8 .   S Y S T E M   S E T T I N G S   T A B L E 
 - -   = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = 
 C R E A T E   T A B L E   I F   N O T   E X I S T S   s y s t e m _ s e t t i n g s   ( 
         s e t t i n g _ k e y   V A R C H A R ( 5 0 )   P R I M A R Y   K E Y , 
         s e t t i n g _ v a l u e   T E X T   N O T   N U L L , 
         u p d a t e d _ a t   T I M E S T A M P   D E F A U L T   C U R R E N T _ T I M E S T A M P 
 ) ; 
 
 I N S E R T   I N T O   s y s t e m _ s e t t i n g s   ( s e t t i n g _ k e y ,   s e t t i n g _ v a l u e ) 
 V A L U E S   ( 
         ' i n v o i c e _ e m a i l _ t e m p l a t e ' , 
         ' D e a r   { { c l i e n t _ n a m e } } , \ n \ n P l e a s e   f i n d   a t t a c h e d   t h e   i n v o i c e   { { i n v o i c e _ n u m b e r } }   f o r   t h e   p e r i o d   { { b i l l i n g _ p e r i o d } } . \ n \ n T o t a l   A m o u n t :   ¹ { { t o t a l _ a m o u n t } } \ n D u e   D a t e :   { { d u e _ d a t e } } \ n \ n T h a n k   y o u   f o r   y o u r   b u s i n e s s . \ n \ n R e g a r d s , \ n S e c u r i t y   A g e n c y ' 
 )   O N   C O N F L I C T   ( s e t t i n g _ k e y )   D O   N O T H I N G ; 
  
 