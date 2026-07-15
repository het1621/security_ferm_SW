/**
 * tests/services/utils/decimalMath.test.js
 * 
 * Unit tests for the decimal math utility module.
 * Verifies that all financial calculations use precise decimal arithmetic.
 */

const {
  toDecimal,
  add,
  subtract,
  multiply,
  divide,
  percentage,
  min,
  max,
  round,
  isPositive,
  isZero,
  sum,
} = require('../../../src/services/utils/decimalMath');

describe('decimalMath', () => {
  // ─── toDecimal ──────────────────────────────────────────────────────────────
  describe('toDecimal', () => {
    test('converts number to Decimal', () => {
      expect(toDecimal(100).toFixed(2)).toBe('100.00');
    });

    test('converts string to Decimal', () => {
      expect(toDecimal('50000.75').toFixed(2)).toBe('50000.75');
    });

    test('handles null as zero', () => {
      expect(toDecimal(null).toFixed(2)).toBe('0.00');
    });

    test('handles undefined as zero', () => {
      expect(toDecimal(undefined).toFixed(2)).toBe('0.00');
    });

    test('handles empty string as zero', () => {
      expect(toDecimal('').toFixed(2)).toBe('0.00');
    });
  });

  // ─── add ────────────────────────────────────────────────────────────────────
  describe('add', () => {
    test('adds two values precisely', () => {
      // Classic floating-point failure: 0.1 + 0.2 !== 0.3 in JS
      expect(add(0.1, 0.2)).toBe('0.30');
    });

    test('adds salary components', () => {
      // Basic + HRA + DA + Special
      expect(add(20000, 4000, 1600, 1000)).toBe('26600.00');
    });

    test('handles string inputs', () => {
      expect(add('50000', '5000')).toBe('55000.00');
    });
  });

  // ─── subtract ───────────────────────────────────────────────────────────────
  describe('subtract', () => {
    test('subtracts correctly (gross - deductions = net)', () => {
      expect(subtract(30000, 6000)).toBe('24000.00');
    });

    test('handles negative results', () => {
      expect(subtract(5000, 10000)).toBe('-5000.00');
    });
  });

  // ─── multiply ───────────────────────────────────────────────────────────────
  describe('multiply', () => {
    test('multiplies for daily rate calculation', () => {
      // Daily rate × days worked
      expect(multiply(1000, 15)).toBe('15000.00');
    });
  });

  // ─── divide ─────────────────────────────────────────────────────────────────
  describe('divide', () => {
    test('divides for daily rate', () => {
      // Monthly salary / days in month
      expect(divide(30000, 30)).toBe('1000.00');
    });

    test('handles division by zero gracefully', () => {
      expect(divide(30000, 0)).toBe('0.00');
    });
  });

  // ─── percentage ─────────────────────────────────────────────────────────────
  describe('percentage', () => {
    test('calculates PF at 12% of basic', () => {
      expect(percentage(50000, 12)).toBe('6000.00');
    });

    test('calculates GST at 18%', () => {
      expect(percentage(10000, 18)).toBe('1800.00');
    });

    test('calculates education cess at 4%', () => {
      expect(percentage(12500, 4)).toBe('500.00');
    });
  });

  // ─── min ────────────────────────────────────────────────────────────────────
  describe('min', () => {
    test('caps PF at 15000', () => {
      // Employee PF capped at ₹15,000
      const rawPF = percentage(200000, 12); // 24000
      expect(min(rawPF, 15000)).toBe('15000.00');
    });

    test('returns lower value when under cap', () => {
      const rawPF = percentage(50000, 12); // 6000
      expect(min(rawPF, 15000)).toBe('6000.00');
    });
  });

  // ─── sum ────────────────────────────────────────────────────────────────────
  describe('sum', () => {
    test('sums array of salary components', () => {
      const components = [20000, 4000, 1600, 1000, 5000];
      expect(sum(components)).toBe('31600.00');
    });

    test('handles empty array', () => {
      expect(sum([])).toBe('0.00');
    });
  });

  // ─── isPositive / isZero ────────────────────────────────────────────────────
  describe('isPositive & isZero', () => {
    test('detects positive net salary', () => {
      expect(isPositive(24000)).toBe(true);
    });

    test('detects zero balance', () => {
      expect(isZero(0)).toBe(true);
    });

    test('negative is not positive', () => {
      expect(isPositive(-100)).toBe(false);
    });
  });

  // ─── Real-World Scenarios ───────────────────────────────────────────────────
  describe('Real-world payroll scenarios', () => {
    test('Security Guard full salary calculation', () => {
      const basic = 20000;
      const hra = 4000;
      const da = 1600;
      const special = 1000;

      const gross = add(basic, hra, da, special);
      expect(gross).toBe('26600.00');

      const pfDeduction = min(percentage(basic, 12), 15000);
      expect(pfDeduction).toBe('2400.00');

      const net = subtract(gross, pfDeduction);
      expect(net).toBe('24200.00');
    });

    test('GST on ₹1,00,000 invoice', () => {
      const taxable = 100000;
      const gstRate = 18;

      const gstAmount = percentage(taxable, gstRate);
      expect(gstAmount).toBe('18000.00');

      const cgst = divide(gstAmount, 2);
      const sgst = divide(gstAmount, 2);
      expect(cgst).toBe('9000.00');
      expect(sgst).toBe('9000.00');

      const total = add(taxable, gstAmount);
      expect(total).toBe('118000.00');
    });
  });
});
