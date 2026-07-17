/**
 * src/routes/workflows.js
 * 
 * API endpoints for workflow engine, notifications, auto-approval rules,
 * overdue scanner, and execution logs.
 * Phase 7 of ERP Implementation Plan.
 */

const logger = require('../utils/logger.js');
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const workflowEngine = require('../services/workflows/workflowEngine');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════
// Workflow Rules
// ═══════════════════════════════════════════════════════════════════════════

router.get('/rules', requirePermission('manage_settings'), async (req, res) => {
  try {
    const rules = await workflowEngine.getRules(req.query);
    res.json({ success: true, data: rules });
  } catch (err) {
    logger.error('List rules error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/rules/:id', async (req, res) => {
  try {
    const rule = await workflowEngine.getRule(parseInt(req.params.id));
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    res.json({ success: true, data: rule });
  } catch (err) {
    logger.error('Get rule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rules', requirePermission('manage_settings'), async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow('', null),
      trigger_entity: Joi.string().valid('invoice', 'expense', 'payroll', 'attendance', 'employee', 'pf', 'gst').required(),
      trigger_event: Joi.string().valid('created', 'updated', 'status_changed', 'overdue', 'approaching_due', 'amount_exceeded', 'monthly_cycle', 'approval_required').required(),
      condition: Joi.object().default({}),
      action_type: Joi.string().valid('send_notification', 'auto_approve', 'escalate', 'create_reminder', 'update_status', 'send_email', 'generate_report').required(),
      action_config: Joi.object().default({}),
      priority: Joi.number().integer().min(1).max(10).default(5),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    value.created_by = req.user.id;
    const result = await workflowEngine.createRule(value);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error('Create rule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/rules/:id', requirePermission('manage_settings'), async (req, res) => {
  try {
    const result = await workflowEngine.updateRule(parseInt(req.params.id), req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Update rule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/rules/:id', requirePermission('manage_settings'), async (req, res) => {
  try {
    await workflowEngine.deleteRule(parseInt(req.params.id));
    res.json({ success: true, message: 'Rule deactivated' });
  } catch (err) {
    logger.error('Delete rule error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Notifications
// ═══════════════════════════════════════════════════════════════════════════

router.get('/notifications', async (req, res) => {
  try {
    const result = await workflowEngine.getNotifications(req.user.id, req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/notifications/:id/read', async (req, res) => {
  try {
    await workflowEngine.markRead(parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    logger.error('Mark read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    await workflowEngine.markAllRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    logger.error('Mark all read error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Overdue Scanner
// ═══════════════════════════════════════════════════════════════════════════

router.post('/scan-overdue', requirePermission('manage_payroll'), async (req, res) => {
  try {
    const result = await workflowEngine.scanOverdueInvoices();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Scan overdue error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Auto-Approval Rules
// ═══════════════════════════════════════════════════════════════════════════

router.get('/auto-approvals', async (req, res) => {
  try {
    const rules = await workflowEngine.getAutoApprovalRules();
    res.json({ success: true, data: rules });
  } catch (err) {
    logger.error('List auto-approvals error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/auto-approvals', requirePermission('manage_settings'), async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      entity_type: Joi.string().valid('expense', 'invoice', 'payroll', 'pf_loan', 'gratuity_payout').required(),
      max_amount: Joi.number().min(0).allow(null),
      category_match: Joi.string().allow('', null),
      requires_budget_check: Joi.boolean().default(false),
      applicable_roles: Joi.string().default('admin'),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await workflowEngine.createAutoApprovalRule(value);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Create auto-approval error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Execution Logs
// ═══════════════════════════════════════════════════════════════════════════

router.get('/logs', requirePermission('manage_settings'), async (req, res) => {
  try {
    const logs = await workflowEngine.getLogs(req.query);
    res.json({ success: true, data: logs });
  } catch (err) {
    logger.error('List logs error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Manual Rule Execution (testing)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/execute', requirePermission('manage_settings'), async (req, res) => {
  try {
    const schema = Joi.object({
      trigger_entity: Joi.string().required(),
      trigger_event: Joi.string().required(),
      entity_data: Joi.object().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const result = await workflowEngine.executeRulesForEvent(value.trigger_entity, value.trigger_event, value.entity_data);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('Execute workflow error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
