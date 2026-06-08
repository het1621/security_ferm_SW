# Security Firm Management Software - QA Testing Checklist

**Project:** Security Firm Management System  
**Version:** v1.0  
**QA Lead:** _______________  
**Test Date:** _______________

---

## ✅ Pre-Testing Requirements

- [ ] Development environment stable & all features deployed to QA
- [ ] Test database seeded with sample data (5 clients, 20 employees, 3 months of data)
- [ ] Access credentials provided for all user roles
- [ ] Test plan reviewed by Project Manager
- [ ] Test cases documented in Jira/TestRail
- [ ] Test data backup created (for rollback if needed)
- [ ] Performance baseline established

---

## 🔐 Authentication & Authorization Testing

### User Login & Session Management
- [ ] User can login with valid email & password
- [ ] User cannot login with incorrect password (3 attempts before lockout)
- [ ] User session expires after 24 hours of inactivity
- [ ] "Forgot Password" link works and sends reset email
- [ ] Password reset token expires after 24 hours
- [ ] User cannot use old password after reset
- [ ] Logout clears session on all tabs/windows
- [ ] User cannot access dashboard without login
- [ ] Login fails gracefully when database is unavailable

**Test Data:**
```
User: admin@company.com | Password: SecurePass@123 | Role: Admin
User: manager@company.com | Password: SecurePass@123 | Role: Manager
User: accountant@company.com | Password: SecurePass@123 | Role: Accountant
User: employee@company.com | Password: SecurePass@123 | Role: Employee
```

### Role-Based Access Control (RBAC)
- [ ] Admin can create/edit/delete users
- [ ] Manager can view only assigned clients & employees
- [ ] Accountant can access invoicing & expense management
- [ ] Employee cannot access payroll or financial data
- [ ] Role change takes effect immediately
- [ ] Disabled users cannot login
- [ ] Concurrent logins prevented (optional, based on requirements)

### Permission Validation
- [ ] Manager cannot access reports for other managers' clients
- [ ] Employee data is visible only to assigned manager
- [ ] Expense approval only by authorized users
- [ ] Payroll modification only by Accountant or Admin

---

## 👥 Client (Society) Management Testing

### Client Creation
- [ ] User can create new client with all required fields
- [ ] System prevents duplicate client names
- [ ] Email validation works (rejects invalid formats)
- [ ] Phone number validation (accepts Indian format: +91XXXXXXXXXX)
- [ ] Postal code validated for correct format
- [ ] Monthly rate cannot be negative or zero
- [ ] Contract start date cannot be in future
- [ ] Contract end date must be after start date (if provided)
- [ ] All fields saved correctly in database

**Test Cases:**
```
Valid: Name="Alpha Society", City="Ahmedabad", Rate=50000
Invalid: Name="", Email="invalid.email", Rate=-100
Boundary: Name with 255 chars, Rate=99999999.99
```

### Client Search & Filtering
- [ ] Search by client name (case-insensitive)
- [ ] Filter by city (dropdown)
- [ ] Filter by status (active/inactive)
- [ ] Pagination works (20 records per page)
- [ ] Sorting by name, creation date, monthly rate
- [ ] Search results highlight matching terms
- [ ] No results message shown when search returns nothing

### Client Update & Deactivation
- [ ] Manager can edit client details
- [ ] Changes reflected immediately in database
- [ ] Audit log records who changed what and when
- [ ] Deactivated clients not shown in invoice generation
- [ ] Historical data (invoices, payments) preserved after deactivation
- [ ] Can reactivate deactivated clients

### Bulk Client Import (if applicable)
- [ ] CSV import accepts valid format
- [ ] Duplicates detected and skipped
- [ ] Invalid rows logged with error messages
- [ ] Success/failure report generated

---

## 👨‍💼 Employee (Watchmen) Management Testing

### Employee Creation
- [ ] All required fields (name, DOB, phone, joining date) accepted
- [ ] Employee ID auto-generated or manually set (unique)
- [ ] Aadhar number validation (12 digits)
- [ ] PAN number validation (10 characters, format check)
- [ ] Bank account number validation (IBAN format)
- [ ] IFSC code validation
- [ ] Age validation (minimum 18 years)
- [ ] Date of birth cannot be in future
- [ ] Phone number must be 10 digits
- [ ] Email is optional but validated if provided

**Test Cases:**
```
Valid: Name="Raj Kumar", DOB="1990-05-15", Phone="9876543210", Aadhar="123456789012"
Invalid: DOB="2010-01-01" (age < 18), Phone="98765" (< 10 digits)
Boundary: Name with 255 chars, DOB from 1930 to present day
```

### Salary Structure Assignment
- [ ] Employee linked to salary structure
- [ ] Base salary must be positive
- [ ] PF percentage between 0-100%
- [ ] Allowances cannot be negative
- [ ] Multiple salary structure versions maintained (effective dates)
- [ ] Latest structure version used for payroll calculation

### Employee Status Management
- [ ] Active employees shown in attendance
- [ ] Inactive employees cannot be marked attendance
- [ ] Leave balance tracked correctly
- [ ] Employee status change logged in audit trail

### Employee Data Validation
- [ ] Duplicate phone numbers flagged with warning
- [ ] Duplicate Aadhar/PAN numbers rejected
- [ ] Bank details not visible to non-accountants
- [ ] Document upload for ID proof works

---

## 📅 Attendance Testing

### Attendance Marking
- [ ] Employee marked present for specific date
- [ ] Check-in time must be before check-out time
- [ ] Hours worked calculated correctly (with decimals)
- [ ] Same employee-client-date cannot have duplicate entries
- [ ] Attendance cannot be marked for future dates
- [ ] Status options work: present, absent, leave, holiday
- [ ] Notes added successfully

**Test Cases:**
```
Valid: CheckIn="09:00", CheckOut="18:00" → Hours=9
Valid: CheckIn="23:30", CheckOut="07:30" (next day) → Hours=8
Invalid: CheckIn="18:00", CheckOut="09:00" (time reversal)
Boundary: CheckIn="00:00", CheckOut="23:59:59"
```

### Attendance Validation
- [ ] Cannot mark attendance before employee joining date
- [ ] Attendance for unassigned client-employee pair rejected
- [ ] Automatic attendance calculation from check-in/out times
- [ ] Bulk attendance upload via CSV/Excel
- [ ] Attendance report by employee (monthly)
- [ ] Attendance report by client (daily/monthly)

### Month-End Attendance Summary
- [ ] Total working days counted correctly
- [ ] Leave days separate from holidays
- [ ] Partial month calculations (joining/leaving mid-month)
- [ ] Payroll integration: correct days_worked used in salary calculation

---

## 💰 Invoicing Testing

### Invoice Generation - CRITICAL
**This is financial data - test exhaustively**

- [ ] Invoice number auto-generated (unique, sequential)
- [ ] Client selection from dropdown
- [ ] Billing period dates validated
- [ ] Monthly rate fetched from client master
- [ ] Invoice amount calculated correctly (rate × days / 30)
- [ ] Tax calculation correct (GST 18% if applicable)
- [ ] Discount applied correctly
- [ ] Final amount = (amount - discount) + tax
- [ ] All currency amounts displayed with 2 decimals

**Test Cases - CRITICAL:**
```
Scenario 1: Full Month
- Client Rate: 50,000 | Billing Period: 2026-06-01 to 2026-06-30
- Days: 30 | Amount: 50,000 | Tax (18%): 9,000 | Final: 59,000
✅ VERIFY manually with calculator

Scenario 2: Partial Month (15-30 June)
- Days: 16 | Amount: 26,666.67 | Tax: 4,800 | Final: 31,466.67
✅ VERIFY rounding behavior (use DECIMAL, not float)

Scenario 3: Short Month (Jan 1-31, Feb 1-28)
- Ensure correct day count regardless of month length
- Leap year (Feb 29) handled correctly

Scenario 4: With Discount
- Discount applied AFTER tax or BEFORE tax? (Confirm with client)
- 10% discount on 59,000 = ?

Scenario 5: Edge Cases
- Rate = 0.01 (smallest amount)
- Rate = 999,999.99 (largest amount)
- Discount = 100% of amount
- Negative adjustment (credit)
```

### Invoice PDF Generation
- [ ] PDF generated successfully
- [ ] Company header with logo
- [ ] Client details correct
- [ ] Billing period clearly shown
- [ ] Line items with calculations visible
- [ ] GST registration number included (if applicable)
- [ ] QR code for payment (if applicable)
- [ ] Terms & conditions printed
- [ ] Special characters & Hindi text rendered correctly
- [ ] PDF file naming: Invoice_[ClientName]_[Date].pdf

### Invoice Status Workflow
- [ ] Draft → Sent → Paid (or Partially Paid)
- [ ] Overdue flag set when due date passed
- [ ] Cannot delete paid invoices
- [ ] Can edit draft invoices only
- [ ] Status change triggers audit log

### Invoice Email Delivery
- [ ] Email sent successfully to client
- [ ] PDF attachment included
- [ ] Email contains due date and payment instructions
- [ ] Failed email logged for retry
- [ ] Bulk email sending works (up to 100 invoices)

### Auto-Invoice Generation
- [ ] Scheduled task runs on 1st of each month
- [ ] Only active clients included
- [ ] Invoices generated in draft status
- [ ] Logging shows which invoices created
- [ ] No duplicate invoices if task runs twice
- [ ] Task handles errors gracefully (doesn't crash)

---

## 💳 Payment Tracking Testing

### Payment Recording
- [ ] Payment amount recorded against invoice
- [ ] Payment date validated (cannot be after today)
- [ ] Payment method selected: cash, cheque, bank transfer, UPI, card
- [ ] Transaction reference stored for bank transfers
- [ ] Multiple payments against single invoice allowed
- [ ] Payment reduces "amount due" correctly
- [ ] Overpayment handled (refund tracked or error)
- [ ] Payment cannot exceed invoice amount

**Test Cases:**
```
Invoice: ₹59,000
Payment 1: ₹30,000 (status: Partially Paid)
Payment 2: ₹29,000 (status: Paid)
Attempt Payment 3: ₹5,000 (ERROR: exceeds remaining)
```

### Payment Reconciliation
- [ ] Dashboard shows outstanding invoices
- [ ] Overdue payment list accurate
- [ ] Payment reminders sent before due date
- [ ] Customer statements show payment history
- [ ] Zero-balance invoices marked as paid

---

## 💼 Payroll Testing

### Salary Calculation - CRITICAL
**This determines employee income - test rigorously**

- [ ] Days worked counted from attendance records
- [ ] Base salary prorated for partial months
- [ ] Allowances (DA, HRA, other) added correctly
- [ ] Gross salary = base + all allowances
- [ ] PF deduction calculated: gross × PF% ÷ 100
- [ ] Income tax deducted if applicable
- [ ] Other deductions included
- [ ] Total deductions sum correctly
- [ ] Net salary = gross - deductions
- [ ] All amounts stored with 2 decimals (DECIMAL, not float)

**Test Cases - CRITICAL:**
```
Scenario 1: Full Month (30 days worked)
- Base: 30,000 | DA: 5,000 | HRA: 3,000
- Gross: 38,000 | PF (12%): 4,560
- Net: 33,440
✅ VERIFY with calculator

Scenario 2: Partial Month (20 days worked)
- Base: 30,000 × 20/30 = 20,000
- Gross: 28,000 | PF: 3,360
- Net: 24,640
✅ VERIFY prorated calculation

Scenario 3: Employee with Leave
- 30 days, 2 days leave (28 days worked)
- Base: 30,000 × 28/30 = 28,000
- Gross: 36,000 | PF: 4,320
- Net: 31,680

Scenario 4: Edge Cases
- Zero days worked: salary = 0 ✅
- All days leave: should still generate slip
- Negative deduction: should be handled
```

### Salary Slip Generation
- [ ] PDF includes all salary components
- [ ] Employee name and ID correct
- [ ] Month clearly specified
- [ ] Calculation breakup shown
- [ ] Bank details for transfer shown
- [ ] QR code for UPI payment (if applicable)
- [ ] Special characters rendered correctly

### Payroll Status Management
- [ ] Payroll marked as pending initially
- [ ] Bulk payroll generation for all employees (month)
- [ ] Cannot regenerate payroll for completed month
- [ ] Payment status updated when salary paid
- [ ] Payment method tracked (bank transfer, cash, cheque)

### Month-End Payroll Process
- [ ] All active employees included
- [ ] Employees joining mid-month prorated correctly
- [ ] Employees leaving mid-month handled
- [ ] Leave balances updated
- [ ] PF contributions tracked (employer + employee)
- [ ] Gratuity calculations (if applicable)
- [ ] Lock payroll after month-end to prevent edits

---

## 📊 Expense Management Testing

### Expense Entry
- [ ] Date validated (cannot be future date)
- [ ] Category selected from dropdown
- [ ] Amount must be positive
- [ ] Payment method selected
- [ ] Vendor name optional but acceptable
- [ ] Receipt number optional
- [ ] Description has min 5 characters
- [ ] Attachment upload works (max 5MB, PDF/JPG/PNG)
- [ ] Created expense status = "pending"

**Test Categories:**
- [ ] Utilities (electricity, water, internet)
- [ ] Equipment (purchase/maintenance)
- [ ] Supplies (office, cleaning)
- [ ] Maintenance (building, repairs)
- [ ] Transport
- [ ] Communication (mobile, postal)
- [ ] Miscellaneous

### Expense Approval Workflow
- [ ] Manager/Admin can approve expenses
- [ ] Can reject with reason/notes
- [ ] Approval is tracked with date & user
- [ ] Rejected expenses can be resubmitted
- [ ] Approved expenses counted in budget
- [ ] Notification sent to submitter

### Expense Reporting
- [ ] Monthly expense summary by category
- [ ] Trends (month-on-month comparison)
- [ ] Budget vs actual analysis
- [ ] Department/cost center breakdown

---

## 📈 Reporting & Analytics Testing

### Dashboard - Performance Critical
- [ ] Dashboard loads in < 3 seconds
- [ ] Charts render correctly (no "loading" state after 2s)
- [ ] Real-time data (refreshed every 5 minutes)
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Mobile breakpoints work

### Revenue Dashboard
- [ ] Total revenue for selected period
- [ ] Client-wise revenue breakdown
- [ ] Month-wise trend line chart
- [ ] Outstanding amount highlighted
- [ ] Payment collection rate %
- [ ] Top 5 clients by revenue

**Verify Calculations:**
```
Total Invoiced: Sum of all final_amounts for period
Total Paid: Sum of all payments_received
Outstanding: Total Invoiced - Total Paid
Collection %: (Total Paid / Total Invoiced) × 100
```

### Expense Analytics
- [ ] Total expenses by category
- [ ] Month-wise expense trends
- [ ] Largest expenses highlighted
- [ ] Budget variance if budget exists
- [ ] Cost per employee (total expense / employee count)

### Employee Cost Analysis
- [ ] Total payroll for period
- [ ] Cost per employee per month
- [ ] Cost per client (payroll / employee count × utilization)
- [ ] Trend: payroll increase over months

### Financial Reports (P&L)
- [ ] Revenue section (invoiced amount)
- [ ] Cost of operations (salaries, expenses)
- [ ] Gross margin %: (Revenue - Salaries) / Revenue
- [ ] Net margin after expenses
- [ ] Period comparison (YoY, MoM)

### Custom Reports
- [ ] Date range selection works
- [ ] Client filter applies correctly
- [ ] PDF export includes all data
- [ ] Excel export with formatting
- [ ] Scheduled reports via email

---

## 🔒 Security & Data Protection Testing

### Data Encryption
- [ ] Sensitive fields encrypted in database (bank details, PAN, Aadhar)
- [ ] Data transmitted over HTTPS only
- [ ] Passwords hashed (bcrypt, not plain text)
- [ ] API keys not logged
- [ ] Database backups encrypted

### Access Control
- [ ] User A cannot see User B's data
- [ ] Manager A cannot see Manager B's clients
- [ ] Employee data restricted by role
- [ ] Audit log accessible only to Admin

### Input Validation & Injection Prevention
- [ ] SQL injection attempts blocked
- [ ] Script injection (XSS) prevented
- [ ] CSV injection (formula injection) prevented
- [ ] Path traversal attempts blocked
- [ ] File upload validates file type (not just extension)

### Audit Logging
- [ ] All financial transactions logged
- [ ] User actions logged (create, update, delete)
- [ ] Failed login attempts logged
- [ ] Sensitive data changes flagged
- [ ] Audit log immutable (cannot delete old logs)

---

## ⚡ Performance Testing

### Load Testing
- [ ] Dashboard with 1000+ invoices loads in < 3 seconds
- [ ] Search through 500 employees completes in < 1 second
- [ ] Bulk payroll (100 employees) processes in < 2 minutes
- [ ] Concurrent users (10+) don't cause slowness
- [ ] Database queries optimized (indexes created)

### Stress Testing
- [ ] System handles 100 simultaneous login attempts
- [ ] 50 concurrent invoice generation requests
- [ ] Graceful degradation (doesn't crash)
- [ ] Error messages shown instead of hangs

### Database Performance
- [ ] Frequently used tables have indexes
- [ ] N+1 query problems identified & fixed
- [ ] Query execution time < 1 second for reports
- [ ] Backup/restore time documented

---

## 📱 Compatibility Testing

### Browser Compatibility
- [ ] Chrome (latest 2 versions)
- [ ] Firefox (latest 2 versions)
- [ ] Safari (latest 2 versions)
- [ ] Edge (latest version)

### Device Compatibility
- [ ] Desktop (1920×1080, 1366×768)
- [ ] Tablet (iPad, Android tablets)
- [ ] Mobile (iPhone, Android phones)
- [ ] Responsive breakpoints: 320px, 768px, 1024px

### Browser Features
- [ ] LocalStorage working (session persistence)
- [ ] PDF downloads work
- [ ] File uploads work
- [ ] Notifications/alerts display correctly

---

## 🔄 Integration Testing

### Critical Workflows
- [ ] New Client → Invoice → Payment → Report
- [ ] Employee Onboard → Attendance → Payroll → Salary Slip
- [ ] Add Expense → Approval → Report
- [ ] Attendance Mark → Payroll Auto-Calc → Report

### Inter-Module Dependencies
- [ ] Client deactivation prevents invoice generation
- [ ] Employee status affects attendance eligibility
- [ ] Attendance data used in payroll calculation
- [ ] Payment data reflected in revenue report

---

## 🐛 Bug Tracking & Resolution

### Bug Severity Classification
- **Critical (P0):** System crash, data loss, financial calculation error
- **High (P1):** Feature doesn't work, wrong calculation, security issue
- **Medium (P2):** UI glitch, minor performance issue
- **Low (P3):** Typo, cosmetic issue

### Bug Report Template
```
Title: [Module] - [Brief Description]
Severity: P0/P1/P2/P3
Steps to Reproduce:
1. ...
2. ...
3. ...
Expected: ...
Actual: ...
Screenshots/Video: [Attach]
Test Data: [Provide]
```

---

## ✅ UAT Sign-Off Checklist

Before going live, client must verify:

- [ ] All invoices calculated correctly
- [ ] Sample salary slips match client expectations
- [ ] Reports provide required insights
- [ ] User interface intuitive and easy to navigate
- [ ] No data loss during migration
- [ ] Backup & restore procedures work
- [ ] System stable under expected load
- [ ] Support documentation clear and complete
- [ ] User training completed
- [ ] Go-live date confirmed

---

## 📋 Test Execution Summary

| Module | Total Tests | Passed | Failed | Pass % |
|--------|-------------|--------|--------|--------|
| Authentication | 15 | | | |
| Client Management | 20 | | | |
| Employee Management | 25 | | | |
| Attendance | 22 | | | |
| Invoicing | 35 | | | |
| Payment Tracking | 15 | | | |
| Payroll | 40 | | | |
| Expenses | 18 | | | |
| Reports | 25 | | | |
| Security | 20 | | | |
| Performance | 15 | | | |
| **TOTAL** | **250** | | | **%** |

---

## 📝 Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Lead | _________________ | _______ | _________________ |
| Project Manager | _________________ | _______ | _________________ |
| Client Rep | _________________ | _______ | _________________ |

---

**Testing Framework:** Jest, Supertest (Node.js)  
**Test Environment:** AWS EC2 (t3.medium)  
**Test Database:** PostgreSQL 14+  
**Coverage Target:** 70% for critical modules

---

**Remember:** A bug found in testing costs ₹100. A bug found in production costs ₹10,000+.

