const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validators');

router.use(authMiddleware);
router.use(requireRole('admin', 'accountant', 'manager'));

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { category, status, from_date, to_date, page = 1, limit = 50 } = req.query;
    let conditions = [];
    let params = [];
    let pc = 1;

    if (category) { conditions.push(`e.category = $${pc}`); params.push(category); pc++; }
    if (status) { conditions.push(`e.status = $${pc}`); params.push(status); pc++; }
    if (from_date) { conditions.push(`e.expense_date >= $${pc}`); params.push(from_date); pc++; }
    if (to_date) { conditions.push(`e.expense_date <= $${pc}`); params.push(to_date); pc++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT e.*, u.full_name as created_by_name, a.full_name as approver_name
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users a ON e.approver_id = a.id
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM expenses e ${where}`, params);
    const sumResult = await query(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses e ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      total_amount: parseFloat(sumResult.rows[0].total),
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, u.full_name as created_by_name, a.full_name as approver_name
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users a ON e.approver_id = a.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch expense' });
  }
});

// POST /api/expenses
router.post('/', validate(schemas.createExpense), async (req, res) => {
  try {
    const { expense_date, category, description, amount, payment_method, vendor_name, receipt_number, notes } = req.body;
    if (!expense_date || !category || !description || !amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'Date, category, description, amount, and payment method are required' });
    }
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be positive' });
    }

    const result = await query(
      `INSERT INTO expenses (expense_date, category, description, amount, payment_method, vendor_name, receipt_number, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [expense_date, category, description, amount, payment_method, vendor_name, receipt_number, notes, req.user.userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Expense recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const { expense_date, category, description, amount, payment_method, vendor_name, receipt_number, notes } = req.body;
    const result = await query(
      `UPDATE expenses SET expense_date=$1, category=$2, description=$3, amount=$4, payment_method=$5,
        vendor_name=$6, receipt_number=$7, notes=$8
       WHERE id=$9 AND status='pending' RETURNING *`,
      [expense_date, category, description, amount, payment_method, vendor_name, receipt_number, notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found or cannot be edited (only pending expenses can be edited)' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Expense updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
});

// PUT /api/expenses/:id/approve
router.put('/:id/approve', async (req, res) => {
  try {
    const { approval_notes } = req.body;
    const result = await query(
      `UPDATE expenses SET status='approved', approver_id=$1, approval_date=CURRENT_TIMESTAMP, approval_notes=$2
       WHERE id=$3 AND status='pending' RETURNING *`,
      [req.user.userId, approval_notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found or already processed' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Expense approved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve expense' });
  }
});

// PUT /api/expenses/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    const { approval_notes } = req.body;
    const result = await query(
      `UPDATE expenses SET status='rejected', approver_id=$1, approval_date=CURRENT_TIMESTAMP, approval_notes=$2
       WHERE id=$3 AND status='pending' RETURNING *`,
      [req.user.userId, approval_notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found or already processed' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Expense rejected' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject expense' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM expenses WHERE id = $1 AND status = 'pending' RETURNING id",
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found or cannot be deleted' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

module.exports = router;
