/**
 * tests/services/workflows/workflowEngine.test.js
 *
 * Unit tests for Workflow Engine Service.
 * Tests condition evaluation logic, escalation level mapping,
 * and auto-approval criteria matching.
 */

const workflowEngine = require('../../../src/services/workflows/workflowEngine');

// Mock DB connection
jest.mock('../../../src/database/connection', () => ({
  query: jest.fn(),
}));

describe('Workflow Engine Service', () => {

  // ─── Condition Evaluation ────────────────────────────────────────────────
  describe('evaluateCondition', () => {

    test('no condition returns true (always run)', () => {
      expect(workflowEngine.evaluateCondition(null, { amount: 1000 })).toBe(true);
      expect(workflowEngine.evaluateCondition({}, { amount: 1000 })).toBe(true);
    });

    test('equals (==)', () => {
      const cond = { field: 'status', operator: '==', value: 'draft' };
      expect(workflowEngine.evaluateCondition(cond, { status: 'draft' })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { status: 'sent' })).toBe(false);
    });

    test('not equals (!=)', () => {
      const cond = { field: 'status', operator: '!=', value: 'paid' };
      expect(workflowEngine.evaluateCondition(cond, { status: 'draft' })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { status: 'paid' })).toBe(false);
    });

    test('greater than (>)', () => {
      const cond = { field: 'amount', operator: '>', value: 5000 };
      expect(workflowEngine.evaluateCondition(cond, { amount: 5001 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { amount: 5000 })).toBe(false);
      expect(workflowEngine.evaluateCondition(cond, { amount: 4999 })).toBe(false);
    });

    test('greater than or equal (>=)', () => {
      const cond = { field: 'days_overdue', operator: '>=', value: 30 };
      expect(workflowEngine.evaluateCondition(cond, { days_overdue: 31 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { days_overdue: 30 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { days_overdue: 29 })).toBe(false);
    });

    test('less than (<)', () => {
      const cond = { field: 'budget_utilization', operator: '<', value: 90 };
      expect(workflowEngine.evaluateCondition(cond, { budget_utilization: 89 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { budget_utilization: 90 })).toBe(false);
      expect(workflowEngine.evaluateCondition(cond, { budget_utilization: 95 })).toBe(false);
    });

    test('less than or equal (<=)', () => {
      const cond = { field: 'amount', operator: '<=', value: 1000 };
      expect(workflowEngine.evaluateCondition(cond, { amount: 999 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { amount: 1000 })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { amount: 1001 })).toBe(false);
    });

    test('contains string', () => {
      const cond = { field: 'description', operator: 'contains', value: 'urgent' };
      expect(workflowEngine.evaluateCondition(cond, { description: 'This is an URGENT request' })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { description: 'Regular request' })).toBe(false);
    });

    test('in array', () => {
      const cond = { field: 'category', operator: 'in', value: ['Travel', 'Meals'] };
      expect(workflowEngine.evaluateCondition(cond, { category: 'Meals' })).toBe(true);
      expect(workflowEngine.evaluateCondition(cond, { category: 'Office Supplies' })).toBe(false);
    });
  });

  // ─── Escalation Levels ───────────────────────────────────────────────────
  describe('getEscalationLevel', () => {
    test('< 15 days is gentle (level 1)', () => {
      const res = workflowEngine.getEscalationLevel(10);
      expect(res.level).toBe(1);
      expect(res.type).toBe('gentle');
    });

    test('15-29 days is firm (level 2)', () => {
      const res = workflowEngine.getEscalationLevel(15);
      expect(res.level).toBe(2);
      expect(res.type).toBe('firm');
    });

    test('30-44 days is urgent (level 3)', () => {
      const res = workflowEngine.getEscalationLevel(30);
      expect(res.level).toBe(3);
      expect(res.type).toBe('urgent');
    });

    test('45+ days is final (level 4)', () => {
      const res = workflowEngine.getEscalationLevel(45);
      expect(res.level).toBe(4);
      expect(res.type).toBe('final');
      
      const res2 = workflowEngine.getEscalationLevel(90);
      expect(res2.level).toBe(4);
    });
  });

  // ─── Auto-Approvals ──────────────────────────────────────────────────────
  describe('checkAutoApproval', () => {
    test('expense below 5000 is auto-approved', () => {
      const res = workflowEngine.checkAutoApproval('expense', { amount: 4999 });
      expect(res.approved).toBe(true);
      expect(res.reason).toContain('below ₹5,000');
    });

    test('expense >= 5000 is NOT auto-approved', () => {
      const res = workflowEngine.checkAutoApproval('expense', { amount: 5000 });
      expect(res.approved).toBe(false);
    });

    test('payroll with status generated is auto-approved', () => {
      const res = workflowEngine.checkAutoApproval('payroll', { status: 'generated' });
      expect(res.approved).toBe(true);
      expect(res.reason).toContain('standard payroll run');
    });

    test('payroll with other status is NOT auto-approved', () => {
      const res = workflowEngine.checkAutoApproval('payroll', { status: 'draft' });
      expect(res.approved).toBe(false);
    });

    test('unsupported entity type is NOT auto-approved', () => {
      const res = workflowEngine.checkAutoApproval('invoice', { amount: 100 });
      expect(res.approved).toBe(false);
    });
  });

});
