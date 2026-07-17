/**
 * tests/services/gst/gstCompliance.test.js
 *
 * Unit tests for GST Compliance Service.
 * Tests supply type classification, tax type determination,
 * GST amount calculation (CGST+SGST vs IGST), and B2CS aggregation.
 */

const Decimal = require('decimal.js');

// Mock DB connection
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
  run: jest.fn(),
}));

const gstService = require('../../../src/services/gst/gstComplianceService');

describe('GST Compliance Service', () => {

  // ─── Supply Type Classification ───────────────────────────────────────────
  describe('classifySupplyType', () => {

    test('registered buyer (has GSTIN) → B2B', () => {
      const result = gstService.classifySupplyType('24AAAAA0000A1Z5', '24', '24', 500000);
      expect(result).toBe('B2B');
    });

    test('unregistered buyer, intra-state → B2CS', () => {
      const result = gstService.classifySupplyType(null, '24', '24', 300000);
      expect(result).toBe('B2CS');
    });

    test('unregistered buyer, inter-state, invoice > 2.5L → B2CL', () => {
      const result = gstService.classifySupplyType(null, '24', '27', 300000);
      expect(result).toBe('B2CL');
    });

    test('unregistered buyer, inter-state, invoice <= 2.5L → B2CS', () => {
      const result = gstService.classifySupplyType(null, '24', '27', 200000);
      expect(result).toBe('B2CS');
    });

    test('no buyer state → treated as intra-state B2CS', () => {
      const result = gstService.classifySupplyType(null, '24', null, 500000);
      expect(result).toBe('B2CS');
    });

    test('empty string GSTIN → not B2B', () => {
      const result = gstService.classifySupplyType('', '24', '24', 100000);
      expect(result).toBe('B2CS');
    });
  });

  // ─── Tax Type Determination ───────────────────────────────────────────────
  describe('determineTaxType', () => {

    test('same state → CGST+SGST', () => {
      expect(gstService.determineTaxType('24', '24')).toBe('cgst_sgst');
    });

    test('different states → IGST', () => {
      expect(gstService.determineTaxType('24', '27')).toBe('igst');
    });
  });

  // ─── GST Amount Calculation ───────────────────────────────────────────────
  describe('calculateGST', () => {

    test('CGST+SGST at 18% on ₹1,00,000', () => {
      const r = gstService.calculateGST(100000, 18, 'cgst_sgst');
      expect(r.cgst).toBe(9000);
      expect(r.sgst).toBe(9000);
      expect(r.igst).toBe(0);
      expect(r.total_gst).toBe(18000);
    });

    test('IGST at 18% on ₹1,00,000', () => {
      const r = gstService.calculateGST(100000, 18, 'igst');
      expect(r.cgst).toBe(0);
      expect(r.sgst).toBe(0);
      expect(r.igst).toBe(18000);
      expect(r.total_gst).toBe(18000);
    });

    test('5% GST (CGST+SGST split)', () => {
      const r = gstService.calculateGST(200000, 5, 'cgst_sgst');
      expect(r.cgst).toBe(5000);
      expect(r.sgst).toBe(5000);
      expect(r.total_gst).toBe(10000);
    });

    test('zero taxable value → zero tax', () => {
      const r = gstService.calculateGST(0, 18, 'cgst_sgst');
      expect(r.total_gst).toBe(0);
    });

    test('precision: ₹99,999 at 18% CGST+SGST', () => {
      const r = gstService.calculateGST(99999, 18, 'cgst_sgst');
      // 99999 * 9 / 100 = 8999.91
      expect(r.cgst).toBe(8999.91);
      expect(r.sgst).toBe(8999.91);
      expect(r.total_gst).toBe(17999.82);
    });
  });

  // ─── B2CS Aggregation ─────────────────────────────────────────────────────
  describe('B2CS aggregation', () => {

    test('aggregates by rate + place_of_supply', () => {
      const records = [
        { taxable_value: 50000, tax_rate: 18, cgst: 4500, sgst: 4500, place_of_supply: '24' },
        { taxable_value: 30000, tax_rate: 18, cgst: 2700, sgst: 2700, place_of_supply: '24' },
        { taxable_value: 20000, tax_rate: 5, cgst: 500, sgst: 500, place_of_supply: '24' },
      ];
      const result = gstService._aggregateB2CS(records, '24');
      expect(result).toHaveLength(2); // two rate groups: 18% and 5%

      const rate18 = result.find(r => r.rt === 18);
      expect(rate18.txval).toBe(80000);
      expect(rate18.camt).toBe(7200);
      expect(rate18.samt).toBe(7200);

      const rate5 = result.find(r => r.rt === 5);
      expect(rate5.txval).toBe(20000);
    });
  });

  // ─── Date Formatting ──────────────────────────────────────────────────────
  describe('Date formatting', () => {

    test('formats ISO date to DD-MM-YYYY', () => {
      expect(gstService._formatDate('2025-07-15')).toBe('15-07-2025');
    });

    test('handles empty date', () => {
      expect(gstService._formatDate('')).toBe('');
    });
  });
});
