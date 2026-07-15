# 📐 CALCULATION FORMULAS REFERENCE
## All Financial Formulas Used in the ERP System
**Last Updated:** July 15, 2026

---

## 1. PAYROLL FORMULAS

### 1.1 Gross Salary
```
Gross Salary = Basic + HRA + DA + Special Allowance + Variable Components
```

### 1.2 Net Salary
```
Net Salary = Gross Salary - Total Deductions
Total Deductions = PF (Employee) + Income Tax (TDS) + Professional Tax + Other Deductions
```

### 1.3 Pro-Rata Salary (Partial Month)
```
Daily Rate = Monthly Salary / Total Days in Month
Pro-Rata Salary = Daily Rate × Days Worked
```

### 1.4 HRA Calculation
```
HRA = Basic Salary × HRA Percentage (typically 20-40%)
```

### 1.5 Dearness Allowance
```
DA = Basic Salary × DA Percentage (typically 8-12%)
```

---

## 2. PROVIDENT FUND (PF) — EPFO Rules

### 2.1 Employee PF Contribution
```
Employee PF = MIN(Basic × 12%, ₹15,000/month)
```

### 2.2 Employer PF Contribution
```
Employer PF = Basic × 12% (no cap)
  ├── PF Account:    Employer PF × (8.33/12) = ~69.4% of employer PF
  ├── Pension (EPS):  Employer PF × (3.67/12) = ~30.6% of employer PF
```

### 2.3 Total PF
```
Total Monthly PF = Employee PF + Employer PF
```

---

## 3. GRATUITY — Indian Labour Law

### 3.1 Gratuity Amount
```
Gratuity = (Last Drawn Basic + DA) × Years of Service / 26

Conditions:
- Minimum service: 5 years
- Maximum: ₹20,00,000 (₹20 lakhs)
- 26 = working days per month (as per Payment of Gratuity Act)
```

### 3.2 Monthly Gratuity Accrual
```
Monthly Accrual = (Basic + DA) / 26 / 12
```

---

## 4. INCOME TAX (TDS) — FY 2024-25

### 4.1 New Regime Tax Slabs
| Income Range           | Rate | Cumulative Tax at Upper Bound |
|------------------------|------|-------------------------------|
| ₹0 – ₹2,50,000        | 0%   | ₹0                            |
| ₹2,50,001 – ₹5,00,000 | 5%   | ₹12,500                       |
| ₹5,00,001 – ₹7,50,000 | 10%  | ₹37,500                       |
| ₹7,50,001 – ₹10,00,000| 15%  | ₹75,000                       |
| ₹10,00,001 – ₹12,50,000| 20% | ₹1,25,000                     |
| Above ₹12,50,000       | 30%  | —                              |

### 4.2 Education Cess
```
Education Cess = Tax Amount × 4%
```

### 4.3 Surcharge (High Income)
```
Income > ₹50L:  Surcharge = Tax × 10%
Income > ₹1Cr:  Surcharge = Tax × 15%
Income > ₹2Cr:  Surcharge = Tax × 25%
Income > ₹5Cr:  Surcharge = Tax × 37%
```

### 4.4 Total Tax
```
Total Tax = Tax from Slabs + Education Cess + Surcharge (if applicable)
```

### 4.5 Monthly TDS
```
Monthly TDS = Total Annual Tax / 12
```

---

## 5. GST FORMULAS

### 5.1 GST Calculation (Exclusive)
```
GST Amount = Taxable Value × (GST Rate / 100)
Total Amount = Taxable Value + GST Amount
```

### 5.2 GST Calculation (Inclusive)
```
Taxable Value = Total Amount / (1 + GST Rate/100)
GST Amount = Total Amount - Taxable Value
```

### 5.3 CGST/SGST Split (Intra-State)
```
CGST = GST Amount / 2
SGST = GST Amount / 2
```

### 5.4 IGST (Inter-State)
```
IGST = GST Amount (full amount, no split)
```

### 5.5 Security Services SAC Codes
| Service Type       | SAC Code | GST Rate |
|-------------------|----------|----------|
| Security Services | 9989     | 18%      |
| Manpower Supply   | 9997     | 18%      |
| Surveillance      | 9989     | 18%      |

---

## 6. INVOICE FORMULAS

### 6.1 Pro-Rata Invoice (Partial Period)
```
Daily Rate = Monthly Contract Amount / Days in Month
Pro-Rata Amount = Daily Rate × Days of Service
```

### 6.2 Recurring Invoice Next Date
```
Weekly:     Current Date + 7 days
Biweekly:   Current Date + 14 days
Monthly:    Current Date + 1 month (dayjs handles month-end)
Quarterly:  Current Date + 3 months
Yearly:     Current Date + 1 year
```

---

## 7. FINANCIAL REPORTING FORMULAS

### 7.1 Profit & Loss
```
Gross Profit = Total Revenue - Cost of Goods Sold (COGS)
Operating Profit = Gross Profit - Operating Expenses
Net Profit = Operating Profit + Other Income - Other Expenses
```

### 7.2 Margins
```
Gross Margin % = (Gross Profit / Revenue) × 100
Operating Margin % = (Operating Profit / Revenue) × 100
Net Margin % = (Net Profit / Revenue) × 100
```

### 7.3 Balance Sheet Equation
```
Total Assets = Total Liabilities + Total Equity
```

### 7.4 Cash Flow
```
Net Cash Change = Operating CF + Investing CF + Financing CF
Ending Cash = Beginning Cash + Net Cash Change
```

### 7.5 Key Performance Indicators (KPIs)
```
DSO (Days Sales Outstanding) = (Accounts Receivable / Revenue) × Days in Period
Current Ratio = Current Assets / Current Liabilities
Debt-to-Equity = Total Liabilities / Total Equity
Return on Assets = Net Profit / Total Assets × 100
Return on Equity = Net Profit / Total Equity × 100
```

### 7.6 Variance Analysis
```
Variance = Actual Amount - Budgeted Amount
Variance % = (Variance / Budgeted Amount) × 100
Favorable: Actual Revenue > Budget OR Actual Expense < Budget
Unfavorable: Actual Revenue < Budget OR Actual Expense > Budget
```

---

## 8. PROFESSIONAL TAX (STATE-WISE)

### Gujarat
| Monthly Salary Range | Monthly PT |
|---------------------|------------|
| Up to ₹5,999       | ₹0         |
| ₹6,000 – ₹8,999    | ₹80        |
| ₹9,000 – ₹11,999   | ₹150       |
| ₹12,000+            | ₹200       |

### Maharashtra
| Monthly Salary Range | Monthly PT |
|---------------------|------------|
| Up to ₹7,500       | ₹0         |
| ₹7,501 – ₹10,000   | ₹175       |
| ₹10,001+            | ₹200 (₹300 in Feb) |

---

## IMPORTANT RULES

1. **All money math MUST use `decimal.js`** — never raw JavaScript floats
2. **All amounts stored as DECIMAL(10,2) or DECIMAL(12,2)** in SQLite
3. **Rounding: ROUND_HALF_UP** for all financial calculations
4. **Indian Rupee**: No decimal subdivisions in practice (round to nearest ₹1 for salary slips)
5. **PF cap of ₹15,000** applies only to employee contribution, not employer
6. **Gratuity cap of ₹20L** is the statutory maximum
7. **Tax slabs change annually** — store in database table, not hardcoded
