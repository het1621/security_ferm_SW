/**
 * tests/services/utils/dateCalculator.test.js
 * 
 * Unit tests for the date calculation utility module.
 * Validates pro-rata, frequency calculations, Indian FY, and edge cases.
 */

const {
  daysInMonth,
  calculateProRata,
  calculateNextDate,
  getIndianFinancialYear,
  getWorkingDays,
  yearsOfService,
  monthsOfService,
  isInMonth,
  getMonthBounds,
  formatIndianDate,
} = require('../../../src/services/utils/dateCalculator');

describe('dateCalculator', () => {
  // ─── daysInMonth ────────────────────────────────────────────────────────────
  describe('daysInMonth', () => {
    test('January has 31 days', () => {
      expect(daysInMonth(1, 2024)).toBe(31);
    });

    test('February 2024 (leap year) has 29 days', () => {
      expect(daysInMonth(2, 2024)).toBe(29);
    });

    test('February 2025 (non-leap) has 28 days', () => {
      expect(daysInMonth(2, 2025)).toBe(28);
    });

    test('April has 30 days', () => {
      expect(daysInMonth(4, 2024)).toBe(30);
    });
  });

  // ─── calculateProRata ──────────────────────────────────────────────────────
  describe('calculateProRata', () => {
    test('full month returns full salary', () => {
      const result = calculateProRata(30000, 30, 30);
      expect(result.proRataSalary).toBe('30000.00');
    });

    test('half month returns half salary', () => {
      const result = calculateProRata(30000, 15, 30);
      expect(result.proRataSalary).toBe('15000.00');
    });

    test('employee joining on 15th July (17 days)', () => {
      const result = calculateProRata(30000, 17, 31);
      expect(result.dailyRate).toBe('967.74');
      expect(result.proRataSalary).toBe('16451.61');
    });

    test('employee joining on 1st (full month)', () => {
      const result = calculateProRata(26600, 31, 31);
      expect(result.proRataSalary).toBe('26600.00');
    });
  });

  // ─── calculateNextDate ────────────────────────────────────────────────────
  describe('calculateNextDate', () => {
    test('weekly adds 7 days', () => {
      expect(calculateNextDate('2024-07-01', 'weekly')).toBe('2024-07-08');
    });

    test('biweekly adds 14 days', () => {
      expect(calculateNextDate('2024-07-01', 'biweekly')).toBe('2024-07-15');
    });

    test('monthly adds 1 month', () => {
      expect(calculateNextDate('2024-07-15', 'monthly')).toBe('2024-08-15');
    });

    test('monthly handles month-end (Jan 31 → Feb 29 in leap year)', () => {
      const result = calculateNextDate('2024-01-31', 'monthly');
      expect(result).toBe('2024-02-29');
    });

    test('monthly handles month-end (Jan 31 → Feb 28 in non-leap)', () => {
      const result = calculateNextDate('2025-01-31', 'monthly');
      expect(result).toBe('2025-02-28');
    });

    test('quarterly adds 3 months', () => {
      expect(calculateNextDate('2024-01-15', 'quarterly')).toBe('2024-04-15');
    });

    test('yearly adds 1 year', () => {
      expect(calculateNextDate('2024-07-01', 'yearly')).toBe('2025-07-01');
    });

    test('throws on unknown frequency', () => {
      expect(() => calculateNextDate('2024-07-01', 'daily')).toThrow('Unknown frequency');
    });
  });

  // ─── getIndianFinancialYear ────────────────────────────────────────────────
  describe('getIndianFinancialYear', () => {
    test('July 2024 is FY 2024-25', () => {
      const fy = getIndianFinancialYear('2024-07-15');
      expect(fy.start).toBe('2024-04-01');
      expect(fy.end).toBe('2025-03-31');
      expect(fy.label).toBe('FY 2024-25');
    });

    test('February 2025 is still FY 2024-25', () => {
      const fy = getIndianFinancialYear('2025-02-15');
      expect(fy.start).toBe('2024-04-01');
      expect(fy.end).toBe('2025-03-31');
      expect(fy.label).toBe('FY 2024-25');
    });

    test('April 2025 starts FY 2025-26', () => {
      const fy = getIndianFinancialYear('2025-04-01');
      expect(fy.start).toBe('2025-04-01');
      expect(fy.end).toBe('2026-03-31');
      expect(fy.label).toBe('FY 2025-26');
    });
  });

  // ─── yearsOfService ────────────────────────────────────────────────────────
  describe('yearsOfService', () => {
    test('calculates 5 years correctly', () => {
      expect(yearsOfService('2019-07-01', '2024-07-15')).toBe(5);
    });

    test('less than 1 year returns 0', () => {
      expect(yearsOfService('2024-01-01', '2024-06-15')).toBe(0);
    });

    test('exactly 4 years 11 months returns 4 (floors)', () => {
      expect(yearsOfService('2020-01-01', '2024-12-01')).toBe(4);
    });
  });

  // ─── getMonthBounds ────────────────────────────────────────────────────────
  describe('getMonthBounds', () => {
    test('July 2024 bounds', () => {
      const bounds = getMonthBounds(7, 2024);
      expect(bounds.firstDay).toBe('2024-07-01');
      expect(bounds.lastDay).toBe('2024-07-31');
    });

    test('February 2024 (leap) bounds', () => {
      const bounds = getMonthBounds(2, 2024);
      expect(bounds.firstDay).toBe('2024-02-01');
      expect(bounds.lastDay).toBe('2024-02-29');
    });
  });

  // ─── formatIndianDate ──────────────────────────────────────────────────────
  describe('formatIndianDate', () => {
    test('formats to DD/MM/YYYY', () => {
      expect(formatIndianDate('2024-07-15')).toBe('15/07/2024');
    });
  });

  // ─── isInMonth ─────────────────────────────────────────────────────────────
  describe('isInMonth', () => {
    test('July 15 is in July', () => {
      expect(isInMonth('2024-07-15', 7, 2024)).toBe(true);
    });

    test('August 1 is NOT in July', () => {
      expect(isInMonth('2024-08-01', 7, 2024)).toBe(false);
    });
  });
});
