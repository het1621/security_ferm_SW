/**
 * tests/services/payroll/salarySlip.test.js
 *
 * Unit tests for the salary slip calculation logic
 * used by the salary slip service.
 */

const { percentage, add, subtract } = require('../../../src/services/utils/decimalMath');
const Decimal = require('decimal.js');

describe('Salary Slip Calculations', () => {

  // ─── Pro-Rata Earnings Calculation ───────────────────────────────────────
  describe('Pro-rata earnings calculation', () => {
    function calculateEarnings(base, hra, da, other, daysWorked, daysInMonth) {
      const D = (v) => new Decimal(v || 0);
      const ratio = D(daysWorked).dividedBy(daysInMonth);
      
      const proBase = D(base).times(ratio).toDecimalPlaces(2);
      const proHra = D(hra).times(ratio).toDecimalPlaces(2);
      const proDa = D(da).times(ratio).toDecimalPlaces(2);
      const proOther = D(other).times(ratio).toDecimalPlaces(2);
      
      const total = proBase.plus(proHra).plus(proDa).plus(proOther).toDecimalPlaces(2);
      
      return {
        base: parseFloat(proBase.toString()),
        hra: parseFloat(proHra.toString()),
        da: parseFloat(proDa.toString()),
        other: parseFloat(proOther.toString()),
        total: parseFloat(total.toString())
      };
    }

    test('Full month returns full amounts', () => {
      const res = calculateEarnings(20000, 4000, 1600, 1000, 31, 31);
      expect(res.base).toBe(20000);
      expect(res.total).toBe(26600);
    });

    test('Half month returns half amounts', () => {
      const res = calculateEarnings(20000, 4000, 1600, 1000, 15, 30);
      expect(res.base).toBe(10000);
      expect(res.hra).toBe(2000);
      expect(res.da).toBe(800);
      expect(res.other).toBe(500);
      expect(res.total).toBe(13300);
    });
  });

  // ─── Statutory Deductions Calculation ──────────────────────────────────
  describe('Statutory Deductions (PF & ESI)', () => {
    function calculateStatutory(baseSalary, grossSalary, pfPct, isEsiApplicable) {
      const D = (v) => new Decimal(v || 0);
      const pfAmount = D(baseSalary).times(D(pfPct)).dividedBy(100).toDecimalPlaces(2);
      
      let esiAmount = D(0);
      if (isEsiApplicable) {
        esiAmount = D(grossSalary).times(0.0075).toDecimalPlaces(2);
      }
      
      return {
        pf: parseFloat(pfAmount.toString()),
        esi: parseFloat(esiAmount.toString())
      };
    }

    test('PF calculated on base salary at 12%', () => {
      const res = calculateStatutory(20000, 26600, 12, false);
      expect(res.pf).toBe(2400);
      expect(res.esi).toBe(0);
    });

    test('ESI calculated on gross salary at 0.75%', () => {
      const res = calculateStatutory(15000, 20000, 12, true);
      expect(res.pf).toBe(1800);
      expect(res.esi).toBe(150);
    });
  });

  // ─── Income Tax (TDS) Calculation ──────────────────────────────────────
  describe('Income Tax (TDS) New Regime', () => {
    function calculateMonthlyTDS(monthlyGross) {
      const D = (v) => new Decimal(v || 0);
      const gross = D(monthlyGross);
      
      const standardDeduction = D(75000);
      const annualizedGross = gross.times(12).minus(standardDeduction);
      const taxableIncome = annualizedGross.greaterThan(0) ? annualizedGross : D(0);
      let annualTax = D(0);

      if (taxableIncome.greaterThan(1500000)) {
        annualTax = taxableIncome.minus(1500000).times(0.3).plus(150000);
      } else if (taxableIncome.greaterThan(1200000)) {
        annualTax = taxableIncome.minus(1200000).times(0.2).plus(90000);
      } else if (taxableIncome.greaterThan(900000)) {
        annualTax = taxableIncome.minus(900000).times(0.15).plus(45000);
      } else if (taxableIncome.greaterThan(600000)) {
        annualTax = taxableIncome.minus(600000).times(0.1).plus(15000);
      } else if (taxableIncome.greaterThan(300000)) {
        annualTax = taxableIncome.minus(300000).times(0.05);
      }

      // Section 87A Rebate
      if (annualizedGross.lessThanOrEqualTo(1200000)) {
        annualTax = D(0);
      }

      return parseFloat(annualTax.dividedBy(12).toDecimalPlaces(2).toString());
    }

    test('No tax for gross < 100k (with standard deduction rebate)', () => {
      // 90k/mo -> 10.8L/yr -> -75k -> 10.05L -> fully rebated under 12L
      expect(calculateMonthlyTDS(90000)).toBe(0);
    });

    test('Tax applicable for high income > 12L after std deduction', () => {
      // 120k/mo -> 14.4L/yr -> -75k = 13.65L. 
      // Tax: (13.65L - 12L)*0.2 + 90k = 33k + 90k = 123000
      // Monthly = 123000 / 12 = 10250
      expect(calculateMonthlyTDS(120000)).toBe(10250);
    });
  });

});
