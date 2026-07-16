/**
 * tests/services/payroll/taxCalculator.test.js
 *
 * Unit tests for the Indian Income Tax Calculator.
 * Tests both New Regime (FY 2025-26) and Old Regime slab calculations,
 * deductions (80C/80D/HRA), education cess, surcharge, Section 87A rebate,
 * monthly TDS with YTD, and regime comparison.
 */

const Decimal = require('decimal.js');

// Mock the database connection to avoid loading better-sqlite3 (Electron-compiled)
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

const TaxCalculator = require('../../../src/services/payroll/taxCalculator');

describe('TaxCalculator', () => {

  // ─── New Regime Slab Tests ────────────────────────────────────────────────
  describe('New Regime (FY 2025-26)', () => {

    test('zero income → zero tax', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 0, regime: 'new' });
      expect(r.total_annual_tax).toBe(0);
      expect(r.monthly_tds).toBe(0);
    });

    test('income below 4L (after std deduction) → zero tax + rebate', () => {
      // 4.5L gross - 75K std = 3.75L taxable → within 4L slab = 0 tax
      // Also under 12L rebate limit
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 450000, regime: 'new' });
      expect(r.taxable_income).toBe(375000);
      expect(r.total_annual_tax).toBe(0); // rebate
    });

    test('income of 12L → rebate applies, zero tax', () => {
      // 12L gross - 75K = 11.25L taxable, under 12L rebate → 0 tax
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1200000, regime: 'new' });
      expect(r.total_annual_tax).toBe(0);
    });

    test('income of 15L → correct slab computation', () => {
      // 15L - 75K std = 14.25L taxable
      // 0-4L: 0 | 4-8L: 20K | 8-12L: 40K | 12-14.25L: 33,750
      // Tax = 93,750
      // Cess 4% = 3,750
      // Total = 97,500
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1500000, regime: 'new' });
      expect(r.taxable_income).toBe(1425000);
      expect(r.tax_on_income).toBe(93750);
      expect(r.education_cess).toBe(3750);
      expect(r.total_annual_tax).toBe(97500);
      expect(r.monthly_tds).toBe(8125);
    });

    test('standard deduction is ₹75,000 for new regime', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1000000, regime: 'new' });
      expect(r.standard_deduction).toBe(75000);
    });

    test('no 80C/80D deductions in new regime', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'new',
        declarations: { sec_80c_ppf: 150000, sec_80d_self: 25000 },
      });
      expect(r.sec_80c_total).toBe(0);
      expect(r.sec_80d_total).toBe(0);
    });
  });

  // ─── Old Regime Slab Tests ────────────────────────────────────────────────
  describe('Old Regime', () => {

    test('income 5L → full rebate under 87A', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 500000, regime: 'old' });
      // 5L - 50K std = 4.5L taxable, under 5L rebate limit → 0
      expect(r.total_annual_tax).toBe(0);
    });

    test('standard deduction is ₹50,000 for old regime', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1000000, regime: 'old' });
      expect(r.standard_deduction).toBe(50000);
    });

    test('80C deductions capped at 1.5L', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'old',
        declarations: {
          sec_80c_ppf: 100000,
          sec_80c_elss: 100000,
          sec_80c_lic: 50000, // total 2.5L → capped at 1.5L
        },
      });
      expect(r.sec_80c_total).toBe(150000);
    });

    test('80D deductions for self and parents', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'old',
        declarations: {
          sec_80d_self: 30000,   // capped at 25K
          sec_80d_parents: 30000, // capped at 25K (non-senior)
        },
      });
      expect(r.sec_80d_total).toBe(50000); // 25K + 25K
    });

    test('80D senior parents get higher cap (50K)', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'old',
        declarations: {
          sec_80d_self: 20000,
          sec_80d_senior_parents: 40000,
        },
      });
      // self: min(20K, 25K) = 20K
      // parents: min(0+40K, 50K) = 40K
      expect(r.sec_80d_total).toBe(60000);
    });

    test('NPS 80CCD(1B) capped at 50K', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'old',
        declarations: { sec_80ccd_nps: 80000 },
      });
      expect(r.sec_80ccd_nps).toBe(50000);
    });

    test('Home loan 24b capped at 2L', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 1500000, regime: 'old',
        declarations: { sec_24b_home_loan_interest: 300000 },
      });
      expect(r.sec_24b_home_loan).toBe(200000);
    });
  });

  // ─── HRA Exemption ────────────────────────────────────────────────────────
  describe('HRA Exemption (Old Regime)', () => {

    test('HRA exemption is minimum of three conditions', () => {
      // Basic 30K/mo, DA 3K/mo, HRA 12K/mo → Annual: 360K, 36K, 144K
      // Rent: 15K/mo → 180K/yr
      // opt1: HRA = 144K
      // opt2: 40% of (360K+36K) = 158.4K (non-metro)
      // opt3: 180K - 10% of 396K = 180K - 39.6K = 140.4K
      // min = 140.4K → 140400
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 600000, regime: 'old',
        basicAnnual: 360000, daAnnual: 36000, hraAnnual: 144000,
        declarations: { hra_rent_paid_annual: 180000, hra_city_type: 'non_metro' },
      });
      expect(r.hra_exemption).toBe(140400);
    });

    test('metro city gets 50% instead of 40%', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 600000, regime: 'old',
        basicAnnual: 360000, daAnnual: 36000, hraAnnual: 144000,
        declarations: { hra_rent_paid_annual: 180000, hra_city_type: 'metro' },
      });
      // opt2 now: 50% of 396K = 198K → min(144K, 198K, 140.4K) = 140.4K (unchanged, opt3 still smallest)
      expect(r.hra_exemption).toBe(140400);
    });

    test('no HRA exemption in new regime', () => {
      const r = TaxCalculator.computeAnnualTax({
        grossAnnualIncome: 600000, regime: 'new',
        basicAnnual: 360000, hraAnnual: 144000,
        declarations: { hra_rent_paid_annual: 180000 },
      });
      expect(r.hra_exemption).toBe(0);
    });
  });

  // ─── Education Cess & Surcharge ───────────────────────────────────────────
  describe('Education Cess and Surcharge', () => {

    test('4% cess applied on tax', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1500000, regime: 'new' });
      expect(r.education_cess).toBe(parseFloat((r.tax_on_income * 0.04).toFixed(2)));
    });

    test('surcharge applied for income > 50L', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 6000000, regime: 'new' });
      expect(r.surcharge).toBeGreaterThan(0);
    });

    test('no surcharge for income under 50L', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 2000000, regime: 'new' });
      expect(r.surcharge).toBe(0);
    });
  });

  // ─── Monthly TDS with YTD ─────────────────────────────────────────────────
  describe('Monthly TDS with YTD Adjustment', () => {

    test('April (month 1 of FY) divides by 12', () => {
      const r = TaxCalculator.computeMonthlyTDS({
        grossAnnualIncome: 1500000, regime: 'new',
        currentMonth: '2025-04', tdsAlreadyDeducted: 0,
      });
      expect(r.months_remaining).toBe(12);
      expect(r.monthly_tds).toBe(parseFloat((r.total_annual_tax / 12).toFixed(2)));
    });

    test('December (month 9) divides remaining by 4', () => {
      const r = TaxCalculator.computeMonthlyTDS({
        grossAnnualIncome: 1500000, regime: 'new',
        currentMonth: '2025-12', tdsAlreadyDeducted: 50000,
      });
      expect(r.months_remaining).toBe(4);
      const remainingTax = Math.max(r.total_annual_tax - 50000, 0);
      expect(r.monthly_tds).toBe(parseFloat((remainingTax / 4).toFixed(2)));
    });

    test('March (month 12) gets remaining balance', () => {
      const r = TaxCalculator.computeMonthlyTDS({
        grossAnnualIncome: 1500000, regime: 'new',
        currentMonth: '2026-03', tdsAlreadyDeducted: 90000,
      });
      expect(r.months_remaining).toBe(1);
    });
  });

  // ─── Regime Comparison ────────────────────────────────────────────────────
  describe('Regime Comparison', () => {

    test('returns both regime results and a recommendation', () => {
      const c = TaxCalculator.compareRegimes({
        grossAnnualIncome: 1200000,
        declarations: { sec_80c_ppf: 150000, sec_80d_self: 25000 },
      });
      expect(c.new_regime).toBeDefined();
      expect(c.old_regime).toBeDefined();
      expect(['new', 'old']).toContain(c.recommended);
      expect(c.annual_savings).toBeGreaterThanOrEqual(0);
    });

    test('low income with no deductions → new regime better', () => {
      const c = TaxCalculator.compareRegimes({
        grossAnnualIncome: 800000,
        declarations: {},
      });
      expect(c.recommended).toBe('new');
    });

    test('high income with max deductions → comparison is valid', () => {
      const c = TaxCalculator.compareRegimes({
        grossAnnualIncome: 2500000,
        basicAnnual: 1200000, daAnnual: 120000, hraAnnual: 480000,
        declarations: {
          sec_80c_ppf: 150000,
          sec_80d_self: 25000,
          sec_80d_parents: 25000,
          sec_80ccd_nps: 50000,
          sec_24b_home_loan_interest: 200000,
          hra_rent_paid_annual: 360000,
          hra_city_type: 'metro',
        },
      });
      // With heavy deductions old regime should have lower taxable income
      expect(c.old_regime.taxable_income).toBeLessThan(c.new_regime.taxable_income);
      // Comparison always returns a valid recommendation
      expect(['new', 'old']).toContain(c.recommended);
      expect(c.annual_savings).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Effective Rate ───────────────────────────────────────────────────────
  describe('Effective Tax Rate', () => {

    test('rate is percentage of tax over gross', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 1500000, regime: 'new' });
      const expectedRate = parseFloat(((r.total_annual_tax / 1500000) * 100).toFixed(2));
      expect(r.effective_rate).toBe(expectedRate);
    });

    test('zero income has 0% rate', () => {
      const r = TaxCalculator.computeAnnualTax({ grossAnnualIncome: 0, regime: 'new' });
      expect(r.effective_rate).toBe(0);
    });
  });
});
