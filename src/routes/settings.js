const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin'));

// ═══════════════════════════════════════════════════════════════════
//  SALARY STRUCTURES CRUD
// ═══════════════════════════════════════════════════════════════════

// GET /api/settings/salary-structures
router.get('/salary-structures', async (req, res) => {
  try {
    const result = await query(
      `SELECT ss.*,
              COUNT(e.id) AS active_guards
       FROM salary_structures ss
       LEFT JOIN employees e ON e.salary_structure_id = ss.id AND e.is_active = true
       GROUP BY ss.id
       ORDER BY ss.is_active DESC, ss.base_salary ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Fetch salary structures error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch salary structures' });
  }
});

// POST /api/settings/salary-structures
router.post('/salary-structures', async (req, res) => {
  try {
    const {
      name, base_salary, dearness_allowance = 0, house_rent_allowance = 0,
      other_allowances = 0, pf_percentage = 12, esi_applicable = false,
      income_tax_applicable = false, effective_from
    } = req.body;

    if (!name || !base_salary) {
      return res.status(400).json({ success: false, message: 'Name and base salary are required' });
    }

    const result = await query(
      `INSERT INTO salary_structures
         (name, base_salary, dearness_allowance, house_rent_allowance, other_allowances,
          pf_percentage, esi_applicable, income_tax_applicable, effective_from)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [name, base_salary, dearness_allowance, house_rent_allowance, other_allowances,
       pf_percentage, esi_applicable, income_tax_applicable, effective_from || new Date().toISOString().split('T')[0]]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Salary structure created' });
  } catch (error) {
    console.error('Create salary structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to create salary structure' });
  }
});

// PUT /api/settings/salary-structures/:id
router.put('/salary-structures/:id', async (req, res) => {
  try {
    const {
      name, base_salary, dearness_allowance, house_rent_allowance,
      other_allowances, pf_percentage, esi_applicable, income_tax_applicable,
      effective_from, is_active
    } = req.body;

    const result = await query(
      `UPDATE salary_structures SET
         name = COALESCE($1, name),
         base_salary = COALESCE($2, base_salary),
         dearness_allowance = COALESCE($3, dearness_allowance),
         house_rent_allowance = COALESCE($4, house_rent_allowance),
         other_allowances = COALESCE($5, other_allowances),
         pf_percentage = COALESCE($6, pf_percentage),
         esi_applicable = COALESCE($7, esi_applicable),
         income_tax_applicable = COALESCE($8, income_tax_applicable),
         effective_from = COALESCE($9, effective_from),
         is_active = COALESCE($10, is_active)
       WHERE id = $11
       RETURNING *`,
      [name, base_salary, dearness_allowance, house_rent_allowance,
       other_allowances, pf_percentage, esi_applicable, income_tax_applicable,
       effective_from, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Salary structure updated' });
  } catch (error) {
    console.error('Update salary structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to update salary structure' });
  }
});

// DELETE /api/settings/salary-structures/:id (soft-disable)
router.delete('/salary-structures/:id', async (req, res) => {
  try {
    // Check if any active employees are on this structure
    const check = await query(
      'SELECT COUNT(*) AS cnt FROM employees WHERE salary_structure_id = $1 AND is_active = true',
      [req.params.id]
    );
    if (parseInt(check.rows[0].cnt) > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${check.rows[0].cnt} active guard(s) are on this salary structure. Reassign them first.`
      });
    }

    await query('UPDATE salary_structures SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Salary structure deactivated' });
  } catch (error) {
    console.error('Delete salary structure error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete salary structure' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  USER / TEAM MANAGEMENT (extends auth routes)
// ═══════════════════════════════════════════════════════════════════

// PATCH /api/settings/users/:id/toggle — activate/deactivate user
router.patch('/users/:id/toggle', async (req, res) => {
  try {
    // Don't let user deactivate themselves
    if (parseInt(req.params.id) === req.user.userId) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account' });
    }

    const result = await query(
      `UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, email, full_name, role, is_active`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: user,
      message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle user status' });
  }
});

// PUT /api/settings/users/:id — update user role/details
router.put('/users/:id', async (req, res) => {
  try {
    const { full_name, role, phone } = req.body;

    const result = await query(
      `UPDATE users SET
         full_name = COALESCE($1, full_name),
         role = COALESCE($2, role),
         phone = COALESCE($3, phone),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, full_name, role, phone, is_active`,
      [full_name, role, phone, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
});

// POST /api/settings/users/:id/reset-password — admin resets someone's password
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hash, req.params.id]
    );

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

// ═══════════════════════════════════════════════════════════════════
//  SYSTEM SETTINGS
// ═══════════════════════════════════════════════════════════════════

// GET /api/settings/system/:key
router.get('/system/:key', async (req, res) => {
  try {
    const result = await query(
      'SELECT setting_value FROM system_settings WHERE setting_key = $1',
      [req.params.key]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }
    res.json({ success: true, data: result.rows[0].setting_value });
  } catch (error) {
    console.error('Fetch system setting error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch setting' });
  }
});

// PUT /api/settings/system/:key
router.put('/system/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: 'Value is required' });
    }

    const result = await query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ($1, $2)
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
       RETURNING setting_value`,
      [req.params.key, value]
    );

    res.json({ success: true, data: result.rows[0].setting_value, message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Update system setting error:', error);
    res.status(500).json({ success: false, message: 'Failed to update setting' });
  }
});

module.exports = router;
