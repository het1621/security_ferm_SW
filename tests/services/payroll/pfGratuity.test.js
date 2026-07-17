/**
 * tests/services/payroll/pfGratuity.test.js
 *
 * Unit tests for PF contribution calculations and Gratuity formula.
 */

const Decimal = require('decimal.js');

// Mock DB connection to avoid loading better-sqlite3
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

const pfCalculator = require('../../../src/services/payroll/pfCalculator');
const gratuityCalculator = require('../../../src/services/payroll/gratuityCalculator');

describe('PF Calculator', () => {

  // ─── Contribution Calculation ─────────────────────────────────────────────
  describe('calculateContribution', () => {

    test('basic ₹20,000 — full contribution without cap', () => {
      const r = pfCalculator.calculateContribution(20000, false);
      expect(r.employee_contribution).toBe(2400);       // 12% of 20K
      expect(r.employer_pf_contribution).toBe(734);      // 3.67% of 20K
      expect(r.employer_eps_contribution).toBe(1249.50);  // 8.33% of 15K (EPS capped)
      expect(r.admin_charges).toBe(100);                  // 0.50% of 20K
    });

    test('basic ₹15,000 — at statutory cap', () => {
      const r = pfCalculator.calculateContribution(15000, true);
      expect(r.pf_basic).toBe(15000);
      expect(r.employee_contribution).toBe(1800);       // 12% of 15K
      expect(r.employer_pf_contribution).toBe(550.50);   // 3.67% of 15K
      expect(r.employer_eps_contribution).toBe(1249.50); // 8.33% of 15K
    });

    test('basic ₹30,000 with statutory cap — PF on 15K only', () => {
      const r = pfCalculator.calculateContribution(30000, true);
      expect(r.pf_basic).toBe(15000);  // capped
      expect(r.employee_contribution).toBe(1800);  // 12% of 15K
    });

    test('basic ₹30,000 without cap — PF on full 30K', () => {
      const r = pfCalculator.calculateContribution(30000, false);
      expect(r.pf_basic).toBe(30000);
      expect(r.employee_contribution).toBe(3600);  // 12% of 30K
      // EPS is always capped at 15K basic
      expect(r.employer_eps_contribution).toBe(1249.50);  // 8.33% of 15K
      expect(r.employer_pf_contribution).toBe(1101);      // 3.67% of 30K
    });

    test('zero basic → zero contributions', () => {
      const r = pfCalculator.calculateContribution(0);
      expect(r.employee_contribution).toBe(0);
      expect(r.employer_pf_contribution).toBe(0);
      expect(r.employer_eps_contribution).toBe(0);
      expect(r.total_monthly_deposit).toBe(0);
    });

    test('total monthly deposit = employee + employer PF + EPS', () => {
      const r = pfCalculator.calculateContribution(20000);
      const expected = r.employee_contribution + r.employer_pf_contribution + r.employer_eps_contribution;
      expect(r.total_monthly_deposit).toBe(expected);
    });
  });
});

describe('Gratuity Calculator', () => {

  // ─── Gratuity Formula ─────────────────────────────────────────────────────
  describe('calculate', () => {

    test('standard gratuity: Basic 20K, DA 2K, 10 years', () => {
      // (20000+2000) * 15 * 10 / 26 = 126,923.08
      const r = gratuityCalculator.calculate(20000, 2000, 10);
      expect(r.calculated_amount).toBe(126923.08);
      expect(r.is_eligible).toBe(true);
      expect(r.is_capped).toBe(false);
    });

    test('exactly 5 years — eligible', () => {
      const r = gratuityCalculator.calculate(30000, 0, 5);
      expect(r.is_eligible).toBe(true);
      // (30000) * 15 * 5 / 26 = 86,538.46
      expect(r.calculated_amount).toBe(86538.46);
    });

    test('4 years — not eligible', () => {
      const r = gratuityCalculator.calculate(30000, 0, 4);
      expect(r.is_eligible).toBe(false);
    });

    test('high salary long service — capped at ₹20 lakhs', () => {
      // Basic 200K + DA 20K = 220K, 30 years
      // (220000) * 15 * 30 / 26 = 38,07,692.31 → capped at 20,00,000
      const r = gratuityCalculator.calculate(200000, 20000, 30);
      expect(r.is_capped).toBe(true);
      expect(r.capped_amount).toBe(2000000);
      expect(r.calculated_amount).toBeGreaterThan(2000000);
    });

    test('zero years → zero gratuity', () => {
      const r = gratuityCalculator.calculate(20000, 0, 0);
      expect(r.calculated_amount).toBe(0);
      expect(r.is_eligible).toBe(false);
    });

    test('monthly provision calculation', () => {
      const r = gratuityCalculator.calculate(20000, 2000, 10);
      // monthly_provision = capped / (years * 12)
      const expected = parseFloat((r.capped_amount / (10 * 12)).toFixed(2));
      expect(r.monthly_provision).toBe(expected);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────────
  describe('Edge Cases', () => {

    test('zero basic with DA only', () => {
      const r = gratuityCalculator.calculate(0, 5000, 10);
      // (0+5000) * 15 * 10 / 26 = 28,846.15
      expect(r.calculated_amount).toBe(28846.15);
    });

    test('very large salary but short service', () => {
      const r = gratuityCalculator.calculate(500000, 0, 3);
      expect(r.is_eligible).toBe(false);
      // Still calculates amount even if not eligible
      expect(r.calculated_amount).toBeGreaterThan(0);
    });
  });
});
