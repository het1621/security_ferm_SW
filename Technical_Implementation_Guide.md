# Security Firm Management Software - Technical Implementation Guide

---

## 📐 Database Schema Design

### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'manager', 'accountant', 'employee') NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2. Clients (Societies) Table
```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    contract_start_date DATE NOT NULL,
    contract_end_date DATE,
    monthly_rate DECIMAL(12, 2) NOT NULL,
    billing_cycle INT DEFAULT 1, -- 1 = Monthly
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT positive_rate CHECK (monthly_rate > 0)
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_city ON clients(city);
```

### 3. Employees (Watchmen) Table
```sql
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    aadhar_number VARCHAR(12),
    pan_number VARCHAR(10),
    bank_account_number VARCHAR(25),
    bank_ifsc_code VARCHAR(11),
    bank_account_holder_name VARCHAR(255),
    date_of_joining DATE NOT NULL,
    designation VARCHAR(100) DEFAULT 'Watchman',
    salary_structure_id INT REFERENCES salary_structures(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_age CHECK (EXTRACT(YEAR FROM AGE(date_of_birth)) >= 18)
);

CREATE INDEX idx_employees_name ON employees(full_name);
CREATE INDEX idx_employees_joining_date ON employees(date_of_joining);
```

### 4. Salary Structures Table
```sql
CREATE TABLE salary_structures (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    base_salary DECIMAL(12, 2) NOT NULL,
    dearness_allowance DECIMAL(12, 2) DEFAULT 0,
    house_rent_allowance DECIMAL(12, 2) DEFAULT 0,
    other_allowances DECIMAL(12, 2) DEFAULT 0,
    pf_percentage DECIMAL(5, 2) DEFAULT 12.0,
    gratuity_percentage DECIMAL(5, 2) DEFAULT 0,
    esi_applicable BOOLEAN DEFAULT false,
    income_tax_applicable BOOLEAN DEFAULT false,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_salary CHECK (base_salary > 0),
    CONSTRAINT valid_percentage CHECK (pf_percentage BETWEEN 0 AND 100)
);
```

### 5. Attendance Table
```sql
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    client_id INT NOT NULL REFERENCES clients(id),
    attendance_date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME NOT NULL,
    hours_worked DECIMAL(5, 2) GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600
    ) STORED,
    status ENUM('present', 'absent', 'leave', 'holiday') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time CHECK (check_out_time > check_in_time),
    CONSTRAINT valid_hours CHECK (hours_worked >= 0 AND hours_worked <= 24),
    UNIQUE(employee_id, client_id, attendance_date)
);

CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, attendance_date);
CREATE INDEX idx_attendance_client_date ON attendance(client_id, attendance_date);
```

### 6. Invoices Table
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id INT NOT NULL REFERENCES clients(id),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount_subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0, -- GST or other tax
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    final_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
        total_amount - discount_amount
    ) STORED,
    status ENUM('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled') DEFAULT 'draft',
    payment_received DECIMAL(12, 2) DEFAULT 0,
    payment_due DECIMAL(12, 2) GENERATED ALWAYS AS (
        final_amount - payment_received
    ) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT valid_dates CHECK (due_date >= invoice_date),
    CONSTRAINT valid_amounts CHECK (total_amount > 0 AND discount_amount >= 0),
    CONSTRAINT non_negative_payment CHECK (payment_received >= 0)
);

CREATE INDEX idx_invoices_client_date ON invoices(client_id, invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

### 7. Payments Table
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES invoices(id),
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'upi', 'card') NOT NULL,
    transaction_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT positive_amount CHECK (amount_paid > 0)
);

CREATE INDEX idx_payments_invoice_date ON payments(invoice_id, payment_date);
```

### 8. Payroll Table
```sql
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL REFERENCES employees(id),
    payroll_month DATE NOT NULL, -- First day of month
    days_worked INT NOT NULL,
    base_salary DECIMAL(12, 2) NOT NULL,
    allowances DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
        base_salary + allowances
    ) STORED,
    pf_deduction DECIMAL(12, 2) DEFAULT 0,
    esi_deduction DECIMAL(12, 2) DEFAULT 0,
    tax_deduction DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) GENERATED ALWAYS AS (
        pf_deduction + esi_deduction + tax_deduction + other_deductions
    ) STORED,
    net_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
        gross_salary - total_deductions
    ) STORED,
    payment_status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    payment_date DATE,
    payment_method ENUM('bank_transfer', 'cash', 'cheque'),
    transaction_reference VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT positive_days CHECK (days_worked BETWEEN 0 AND 31),
    CONSTRAINT unique_payroll UNIQUE(employee_id, payroll_month)
);

CREATE INDEX idx_payroll_employee_month ON payroll(employee_id, payroll_month);
CREATE INDEX idx_payroll_status ON payroll(payment_status);
```

### 9. Expenses Table
```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    expense_date DATE NOT NULL,
    category ENUM('utilities', 'equipment', 'supplies', 'maintenance', 
                   'transport', 'communication', 'miscellaneous') NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('cash', 'cheque', 'bank_transfer', 'card') NOT NULL,
    vendor_name VARCHAR(255),
    receipt_number VARCHAR(50),
    status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
    approver_id INT REFERENCES users(id),
    approval_date TIMESTAMP,
    approval_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_status ON expenses(status);
```

### 10. Audit Log Table
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    action ENUM('create', 'update', 'delete') NOT NULL,
    old_values JSONB,
    new_values JSONB NOT NULL,
    user_id INT REFERENCES users(id),
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
```

---

## 🔌 API Structure

### Base API Configuration

```javascript
// Backend: Node.js + Express
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            message: err.message,
            code: err.code || 'INTERNAL_ERROR'
        }
    });
});

module.exports = app;
```

### Authentication Endpoints

```javascript
// POST /api/v1/auth/login
// Request:
{
  "email": "user@company.com",
  "password": "secure_password"
}

// Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@company.com",
      "full_name": "John Doe",
      "role": "manager"
    },
    "token": "jwt_token_here",
    "expiresIn": 86400
  }
}

// POST /api/v1/auth/logout
// POST /api/v1/auth/refresh-token
// POST /api/v1/auth/change-password
```

### Client Management Endpoints

```javascript
// GET /api/v1/clients
// List all clients with pagination
// Query params: page=1, limit=20, search="society_name"

// POST /api/v1/clients
// Create new client
{
  "name": "Alpha Society",
  "address": "123 Main St",
  "city": "Ahmedabad",
  "state": "Gujarat",
  "email": "admin@alphasociety.com",
  "monthly_rate": 50000
}

// GET /api/v1/clients/:id
// Get client details

// PUT /api/v1/clients/:id
// Update client

// DELETE /api/v1/clients/:id
// Soft delete client
```

### Invoice Endpoints

```javascript
// GET /api/v1/invoices
// List invoices with filters
// Query: client_id, status, from_date, to_date

// POST /api/v1/invoices
// Create invoice manually
{
  "client_id": 5,
  "invoice_date": "2026-06-01",
  "billing_period_start": "2026-05-01",
  "billing_period_end": "2026-05-31",
  "amount_subtotal": 50000,
  "tax_rate": 18,
  "discount_amount": 0
}

// POST /api/v1/invoices/:id/generate-pdf
// Generate and download PDF

// POST /api/v1/invoices/:id/send-email
// Send invoice to client email

// POST /api/v1/invoices/auto-generate
// Auto-generate monthly invoices for all clients
// Scheduled task (runs on 1st of each month)
```

### Attendance Endpoints

```javascript
// POST /api/v1/attendance/mark
// Mark attendance
{
  "employee_id": 10,
  "client_id": 5,
  "attendance_date": "2026-06-01",
  "check_in_time": "09:00:00",
  "check_out_time": "18:00:00",
  "status": "present"
}

// GET /api/v1/attendance
// List attendance records
// Query: employee_id, client_id, from_date, to_date

// GET /api/v1/employees/:id/attendance-summary
// Monthly attendance summary
```

### Payroll Endpoints

```javascript
// POST /api/v1/payroll/calculate
// Calculate payroll for a month
{
  "month": "2026-06-01",
  "employees": [10, 11, 12]
}

// GET /api/v1/payroll/:id
// Get payroll slip

// POST /api/v1/payroll/:id/generate-pdf
// Generate salary slip PDF

// POST /api/v1/payroll/process-payment
// Mark payroll as paid

// GET /api/v1/payroll/monthly-summary
// Payroll summary for dashboard
```

### Expense Endpoints

```javascript
// POST /api/v1/expenses
// Create expense
{
  "expense_date": "2026-06-01",
  "category": "utilities",
  "description": "Electricity bill May 2026",
  "amount": 15000,
  "payment_method": "bank_transfer",
  "vendor_name": "Power Company"
}

// PUT /api/v1/expenses/:id/approve
// Approve pending expense
{
  "approval_notes": "Approved"
}

// GET /api/v1/expenses/summary
// Monthly expense summary
```

### Reports Endpoints

```javascript
// GET /api/v1/reports/client-revenue
// Client-wise revenue report
// Query: from_date, to_date

// GET /api/v1/reports/expense-summary
// Expense analysis

// GET /api/v1/reports/profit-loss
// P&L statement

// GET /api/v1/reports/employee-cost
// Employee cost analysis

// GET /api/v1/reports/outstanding-invoices
// Overdue payments report
```

---

## 🔐 Critical Business Logic Implementation

### Invoice Calculation Function

```javascript
async function calculateInvoiceAmount(clientId, billingPeriodStart, billingPeriodEnd) {
    try {
        // 1. Get client monthly rate
        const client = await Client.findById(clientId);
        if (!client) throw new Error('Client not found');
        
        // 2. Calculate number of days
        const startDate = new Date(billingPeriodStart);
        const endDate = new Date(billingPeriodEnd);
        const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // 3. Calculate daily rate
        const daysInMonth = 30; // Standard
        const dailyRate = client.monthly_rate / daysInMonth;
        
        // 4. Calculate amount (use DECIMAL for precision, NOT float)
        const Decimal = require('decimal.js');
        const amount = new Decimal(dailyRate)
            .times(daysInPeriod)
            .toNumber();
        
        // 5. Validate
        if (amount <= 0) {
            throw new Error('Invalid calculation: amount must be positive');
        }
        
        return {
            amount: parseFloat(amount.toFixed(2)),
            daysInPeriod,
            dailyRate
        };
    } catch (error) {
        logger.error('Invoice calculation error:', error);
        throw error;
    }
}

// TEST CASES
test('Invoice calculation - full month', async () => {
    const result = await calculateInvoiceAmount(1, '2026-06-01', '2026-06-30');
    expect(result.amount).toBe(50000); // Full month rate
});

test('Invoice calculation - partial month', async () => {
    const result = await calculateInvoiceAmount(1, '2026-06-15', '2026-06-30');
    expect(result.daysInPeriod).toBe(16);
    expect(result.amount).toBeCloseTo(26666.67, 2);
});

test('Invoice calculation - handles leap years', async () => {
    const result = await calculateInvoiceAmount(1, '2024-02-01', '2024-02-29');
    expect(result.daysInPeriod).toBe(29);
});
```

### Salary Calculation Function

```javascript
async function calculateSalarySlip(employeeId, payrollMonth) {
    try {
        // 1. Get employee & salary structure
        const employee = await Employee.findById(employeeId);
        const structure = await SalaryStructure.findByEmployee(employeeId);
        
        // 2. Get attendance count
        const attendance = await Attendance.findByEmployeeMonth(employeeId, payrollMonth);
        const daysWorked = attendance.filter(a => a.status === 'present').length;
        const leaveDays = attendance.filter(a => a.status === 'leave').length;
        
        // 3. Calculate salary components
        const Decimal = require('decimal.js');
        
        let baseSalary = new Decimal(structure.base_salary);
        if (daysWorked < 30) {
            baseSalary = baseSalary.times(daysWorked).dividedBy(30);
        }
        
        const da = new Decimal(structure.dearness_allowance || 0);
        const hra = new Decimal(structure.house_rent_allowance || 0);
        const otherAllowances = new Decimal(structure.other_allowances || 0);
        
        const grossSalary = baseSalary.plus(da).plus(hra).plus(otherAllowances);
        
        // 4. Calculate deductions
        const pfDeduction = grossSalary
            .times(structure.pf_percentage)
            .dividedBy(100);
        
        const taxDeduction = new Decimal(structure.income_tax_applicable ? 0 : 0);
        
        const totalDeductions = pfDeduction.plus(taxDeduction);
        const netSalary = grossSalary.minus(totalDeductions);
        
        // 5. Save payroll record
        const payroll = await Payroll.create({
            employee_id: employeeId,
            payroll_month: payrollMonth,
            days_worked: daysWorked,
            base_salary: baseSalary.toNumber(),
            allowances: da.plus(hra).plus(otherAllowances).toNumber(),
            gross_salary: grossSalary.toNumber(),
            pf_deduction: pfDeduction.toNumber(),
            total_deductions: totalDeductions.toNumber(),
            net_salary: netSalary.toNumber(),
            payment_status: 'pending'
        });
        
        return payroll;
    } catch (error) {
        logger.error('Salary calculation error:', error);
        throw error;
    }
}

// TEST CASES
test('Salary calculation - full month', async () => {
    const payroll = await calculateSalarySlip(1, '2026-06-01');
    expect(payroll.days_worked).toBe(30);
    expect(payroll.gross_salary).toBe(50000);
    expect(payroll.pf_deduction).toBeCloseTo(6000, 2);
    expect(payroll.net_salary).toBeCloseTo(44000, 2);
});

test('Salary calculation - partial month', async () => {
    const payroll = await calculateSalarySlip(1, '2026-06-01');
    expect(payroll.net_salary).toBeLessThan(44000);
});
```

### Data Validation Layer

```javascript
// Validation schemas using Joi
const invoiceSchema = Joi.object({
    client_id: Joi.number().required(),
    invoice_date: Joi.date().required(),
    due_date: Joi.date().min(Joi.ref('invoice_date')).required(),
    billing_period_start: Joi.date().required(),
    billing_period_end: Joi.date().min(Joi.ref('billing_period_start')).required(),
    amount_subtotal: Joi.number().positive().required(),
    tax_rate: Joi.number().min(0).max(100),
    discount_amount: Joi.number().min(0)
});

const salarySchema = Joi.object({
    base_salary: Joi.number().positive().required(),
    pf_percentage: Joi.number().min(0).max(100),
    days_worked: Joi.number().min(0).max(31).required()
});

// Middleware validation
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    message: error.details[0].message,
                    code: 'VALIDATION_ERROR'
                }
            });
        }
        req.validated = value;
        next();
    };
};
```

---

## 🛡️ Security Implementation

### Password Hashing

```javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}
```

### JWT Token Generation

```javascript
const jwt = require('jsonwebtoken');

function generateToken(userId, role) {
    const payload = {
        userId,
        role,
        iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '24h'
    });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Invalid token');
    }
}
```

### Authentication Middleware

```javascript
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: { message: 'Missing authentication token' }
        });
    }
    
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: { message: 'Invalid token' }
        });
    }
};

// Usage
app.get('/api/v1/clients', authMiddleware, clientController.list);
```

---

## 📊 Sample Frontend Integration

### React Component: Invoice Dashboard

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const InvoiceDashboard = () => {
    const [invoices, setInvoices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await axios.get('/api/v1/invoices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setInvoices(response.data.data);
            calculateSummary(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setLoading(false);
        }
    };

    const calculateSummary = (invoices) => {
        const summary = {
            totalInvoiced: 0,
            totalPaid: 0,
            totalPending: 0,
            overdue: 0
        };

        invoices.forEach(invoice => {
            summary.totalInvoiced += invoice.final_amount;
            summary.totalPaid += invoice.payment_received;
            summary.totalPending += invoice.payment_due;
            if (invoice.status === 'overdue') {
                summary.overdue += invoice.payment_due;
            }
        });

        setSummary(summary);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="invoice-dashboard">
            <h1>Invoice Dashboard</h1>
            
            {summary && (
                <div className="summary-cards">
                    <Card title="Total Invoiced" value={`₹${summary.totalInvoiced.toFixed(2)}`} />
                    <Card title="Total Paid" value={`₹${summary.totalPaid.toFixed(2)}`} />
                    <Card title="Pending" value={`₹${summary.totalPending.toFixed(2)}`} />
                    <Card title="Overdue" value={`₹${summary.overdue.toFixed(2)}`} color="red" />
                </div>
            )}

            <div className="invoice-table">
                <table>
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Client</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Due Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td>{invoice.invoice_number}</td>
                                <td>{invoice.client_name}</td>
                                <td>₹{invoice.final_amount.toFixed(2)}</td>
                                <td><Badge status={invoice.status} /></td>
                                <td>{new Date(invoice.due_date).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => downloadPDF(invoice.id)}>PDF</button>
                                    <button onClick={() => sendEmail(invoice.id)}>Send</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InvoiceDashboard;
```

---

## ⚠️ Critical Implementation Warnings

### DO NOT:
- ❌ Store passwords in plaintext
- ❌ Use floating-point for money calculations (use DECIMAL or big number library)
- ❌ Store sensitive data (bank details, SSN) in application logs
- ❌ Hardcode secrets in source code
- ❌ Skip input validation on financial forms
- ❌ Use unencrypted HTTP for user data
- ❌ Implement custom cryptography
- ❌ Leave debug code in production

### DO:
- ✅ Use DECIMAL(12,2) for all monetary amounts
- ✅ Hash passwords with bcrypt (min 12 rounds)
- ✅ Encrypt sensitive fields at database level
- ✅ Implement comprehensive audit logging
- ✅ Test all calculations with edge cases
- ✅ Use environment variables for configuration
- ✅ Implement rate limiting on APIs
- ✅ Monitor all financial transactions

---

## 🧪 Test Plan Summary

| Module | Unit Tests | Integration Tests | E2E Tests |
|--------|-----------|-------------------|-----------|
| Authentication | 15 | 8 | 5 |
| Invoicing | 25 | 12 | 8 |
| Payroll | 30 | 15 | 10 |
| Attendance | 20 | 10 | 6 |
| Expenses | 15 | 8 | 5 |
| Reports | 20 | 12 | 8 |
| **TOTAL** | **125** | **65** | **42** |

---

**This technical implementation guide is a foundation. Adjust based on:**
- Specific tech stack choices
- Client-specific regulations (GST, TDS in India)
- Scalability requirements
- Performance benchmarks

