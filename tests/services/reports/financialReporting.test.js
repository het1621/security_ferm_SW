/**
 * tests/services/reports/financialReporting.test.js
 *
 * Unit tests for Financial Reporting Service.
 * Tests KPI calculations (margins, DSO, current ratio, revenue/employee).
 */

const Decimal = require('decimal.js');

// Mock DB connection
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

const reportService = require('../../../src/services/reports/financialReportingService');

describe('Financial Reporting Service', () => {

  // ─── KPI Calculations ─────────────────────────────────────────────────────
  describe('calculateKPIs', () => {

    test('standard KPIs: revenue 10L, expenses 7L, 10 employees', () => {
      const r = reportService.calculateKPIs({
        revenue: 1000000,
        cogs: 600000,
        totalExpenses: 700000,
        receivables: 200000,
        payables: 150000,
        cashBalance: 300000,
        employeeCount: 10,
        periodDays: 30,
      });

      // Gross Profit = 10L - 6L = 4L, margin = 40%
      expect(r.gross_profit).toBe(400000);
      expect(r.gross_margin).toBe(40);

      // Net Profit = 10L - 7L = 3L, margin = 30%
      expect(r.net_profit).toBe(300000);
      expect(r.net_margin).toBe(30);

      // DSO = (2L / 10L) × 30 = 6 days
      expect(r.dso).toBe(6);

      // Current Ratio = (3L + 2L) / 1.5L = 3.33
      expect(r.current_ratio).toBe(3.33);

      // Revenue per Employee = 10L / 10 = 1L
      expect(r.revenue_per_employee).toBe(100000);
    });

    test('zero revenue → zero margins, zero DSO', () => {
      const r = reportService.calculateKPIs({
        revenue: 0, cogs: 0, totalExpenses: 50000,
        receivables: 0, payables: 0, cashBalance: 0, employeeCount: 5,
      });
      expect(r.gross_margin).toBe(0);
      expect(r.net_margin).toBe(0);
      expect(r.dso).toBe(0);
      expect(r.net_profit).toBe(-50000);
    });

    test('zero payables → zero current ratio', () => {
      const r = reportService.calculateKPIs({
        revenue: 100000, cogs: 50000, totalExpenses: 60000,
        receivables: 20000, payables: 0, cashBalance: 10000, employeeCount: 2,
      });
      expect(r.current_ratio).toBe(0);
    });

    test('zero employees → zero revenue per employee', () => {
      const r = reportService.calculateKPIs({
        revenue: 500000, cogs: 200000, totalExpenses: 300000,
        receivables: 0, payables: 0, cashBalance: 0, employeeCount: 0,
      });
      expect(r.revenue_per_employee).toBe(0);
    });

    test('negative net profit when expenses exceed revenue', () => {
      const r = reportService.calculateKPIs({
        revenue: 100000, cogs: 50000, totalExpenses: 150000,
        receivables: 0, payables: 0, cashBalance: 0, employeeCount: 5,
      });
      expect(r.net_profit).toBe(-50000);
      expect(r.net_margin).toBe(-50);
    });

    test('high DSO indicates slow collection', () => {
      const r = reportService.calculateKPIs({
        revenue: 100000, cogs: 0, totalExpenses: 50000,
        receivables: 100000, payables: 50000, cashBalance: 10000,
        employeeCount: 5, periodDays: 30,
      });
      // DSO = (100K / 100K) × 30 = 30 days (all revenue is uncollected)
      expect(r.dso).toBe(30);
    });

    test('quarterly period (90 days)', () => {
      const r = reportService.calculateKPIs({
        revenue: 300000, cogs: 100000, totalExpenses: 200000,
        receivables: 100000, payables: 50000, cashBalance: 50000,
        employeeCount: 10, periodDays: 90,
      });
      // DSO = (100K / 300K) × 90 = 30 days
      expect(r.dso).toBe(30);
    });
  });

  // ─── Rounding ─────────────────────────────────────────────────────────────
  describe('_round helper', () => {

    test('rounds to 2 decimal places', () => {
      expect(reportService._round(1234.567)).toBe(1234.57);
      expect(reportService._round(1234.564)).toBe(1234.56);
    });

    test('handles null/undefined', () => {
      expect(reportService._round(null)).toBe(0);
      expect(reportService._round(undefined)).toBe(0);
    });
  });
});
