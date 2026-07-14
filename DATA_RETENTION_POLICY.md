# Data Retention & Deletion Policy

**Effective Date:** July 2026
**Scope:** This policy applies to all employee Personally Identifiable Information (PII) including Aadhar, PAN, Bank Details, and Salary History stored within the Security Agency Management Software.

## 1. Active Employees
All PII is retained indefinitely while the employee is actively employed and marked as `is_active = true` in the system.

## 2. Inactive / Terminated Employees
When an employee leaves the agency or is terminated, their profile is marked as `is_active = false`. 
- **Soft Deletion:** The record is not physically deleted from the database to maintain referential integrity for historical attendance, payroll, and invoice generation.
- **Access Control:** The UI defaults to hiding inactive employees. API queries strictly require explicit flags to fetch them.

## 3. Long-Term Retention & Compliance
To comply with standard Indian labor and tax laws (e.g., PF, ESI, Income Tax Act):
- Employee payroll and attendance history, along with the Aadhar/PAN/Bank details used for those transactions, are retained for a minimum of **7 years** following the end of the financial year in which they were last active.

## 4. Hard Deletion (Right to be Forgotten)
After the 7-year compliance window expires, employee PII (Aadhar, PAN, Bank Account) should be explicitly scrubbed from the database via an administrative script. The employee's name and ID will be retained as an anonymized stub to prevent foreign-key constraints from failing on historical invoices.

## 5. Security Measures During Retention
- All PII is subjected to Strict RBAC Masking across all API endpoints.
- Full-Disk Encryption (BitLocker/FileVault) is enforced on the host machine storing the database.
- Any unmasking of PII by Administrators or Accountants triggers an immediate audit log trail.
