const logger = require('../utils/logger.js');
const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware, requirePermission } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validators');
const { logError } = require('../utils/errorLogger');

router.use(authMiddleware);
router.use(requirePermission('manage_invoices'));

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const { search, city, is_active, page = 1, limit = 50 } = req.query;
    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(c.name LIKE $${paramCount} OR c.contact_person LIKE $${paramCount} OR c.phone LIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }
    if (city) {
      whereConditions.push(`c.city LIKE $${paramCount}`);
      params.push(`%${city}%`);
      paramCount++;
    }
    if (is_active !== undefined) {
      whereConditions.push(`c.is_active = $${paramCount}`);
      params.push(is_active === 'true');
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT c.*, 
        (SELECT COUNT(*) FROM invoices i WHERE i.client_id = c.id) as total_invoices,
        (SELECT COALESCE(SUM(i.final_amount), 0) FROM invoices i WHERE i.client_id = c.id AND i.status != 'cancelled') as total_billed,
        (SELECT COALESCE(SUM(i.payment_received), 0) FROM invoices i WHERE i.client_id = c.id) as total_paid,
        (SELECT COUNT(*) FROM employees e WHERE e.assigned_client_id = c.id AND e.is_active = true) as employee_count
       FROM clients c 
       ${whereClause}
       ORDER BY c.is_active DESC, c.name ASC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) AS count FROM clients c ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    logger.error('Get clients error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clients' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT c.*, 
        (SELECT COALESCE(SUM(i.final_amount), 0) FROM invoices i WHERE i.client_id = c.id AND i.status != 'cancelled') as total_billed,
        (SELECT COALESCE(SUM(i.payment_received), 0) FROM invoices i WHERE i.client_id = c.id) as total_paid,
        (SELECT COUNT(*) FROM employees e WHERE e.assigned_client_id = c.id AND e.is_active = true) as employee_count
       FROM clients c WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    res.status(500).json({ success: false, message: 'Failed to fetch client' });
  }
});

// POST /api/clients
router.post('/', validate(schemas.createClient), async (req, res) => {
  try {
    const { name, address, city, state = 'Gujarat', postal_code, email, phone, contact_person, gst_number, monthly_rate, contract_start_date, contract_end_date, notes } = req.body;
    if (!name || !address || !city || !monthly_rate || !contract_start_date) {
      return res.status(400).json({ success: false, message: 'Name, address, city, monthly rate, and contract start date are required' });
    }
    if (parseFloat(monthly_rate) <= 0) {
      return res.status(400).json({ success: false, message: 'Monthly rate must be positive' });
    }

    // Check for duplicate client name
    const existingClient = await query(
      'SELECT id FROM clients WHERE name LIKE $1 AND is_active = true LIMIT 1',
      [name]
    );
    if (existingClient.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'A client with this exact name already exists. Please use the Edit button (pencil icon) on the existing client instead of creating a new one.' });
    }

    const result = await query(
      `INSERT INTO clients (name, address, city, state, postal_code, email, phone, contact_person, gst_number, monthly_rate, contract_start_date, contract_end_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, address, city, state, postal_code, email, phone, contact_person, gst_number, monthly_rate, contract_start_date, contract_end_date || null, notes, req.user.userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Client created successfully' });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    res.status(500).json({ success: false, message: 'Failed to create client' });
  }
});

// PUT /api/clients/:id
router.put('/:id', validate(schemas.updateClient), async (req, res) => {
  try {
    const { name, address, city, state, postal_code, email, phone, contact_person, gst_number, monthly_rate, contract_start_date, contract_end_date, notes, is_active } = req.body;

    // Coerce is_active to boolean (SQLite returns 0/1 which round-trips through the form)
    const isActiveBool = is_active !== undefined ? Boolean(is_active) : true;

    const result = await query(
      `UPDATE clients SET name=$1, address=$2, city=$3, state=$4, postal_code=$5, email=$6, phone=$7, contact_person=$8, 
       gst_number=$9, monthly_rate=$10, contract_start_date=$11, contract_end_date=$12, notes=$13, is_active=$14, updated_at=CURRENT_TIMESTAMP
       WHERE id=$15`,
      [name, address, city, state, postal_code, email, phone, contact_person, gst_number, monthly_rate, contract_start_date, contract_end_date || null, notes, isActiveBool, req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Re-fetch the updated client (RETURNING * is stripped by the SQLite adapter)
    const updated = await query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true, data: updated.rows[0], message: 'Client updated successfully' });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    logger.error('Update client error:', error);
    res.status(500).json({ success: false, message: 'Failed to update client' });
  }
});

// DELETE /api/clients/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'UPDATE clients SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, message: 'Client deactivated successfully' });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    res.status(500).json({ success: false, message: 'Failed to deactivate client' });
  }
});

// DELETE /api/clients/:id/hard (hard delete)
router.delete('/:id/hard', async (req, res) => {
  try {
    const result = await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    res.json({ success: true, message: 'Client permanently deleted' });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (error.message && error.message.includes('FOREIGN KEY'))) {
      return res.status(400).json({ success: false, message: 'Cannot delete client: linked invoices or employees exist. Please delete or reassign them first.' });
    }
    res.status(500).json({ success: false, message: 'Failed to permanently delete client' });
  }
});

// PATCH /api/clients/:id/renew
router.patch('/:id/renew', async (req, res) => {
  try {
    // Accept both naming conventions for safety
    const contract_end_date = req.body.contract_end_date || req.body.new_end_date;
    const monthly_rate = req.body.monthly_rate || req.body.new_monthly_rate;

    if (!contract_end_date) {
      return res.status(400).json({ success: false, message: 'contract_end_date is required' });
    }
    const updates = ['contract_end_date = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [contract_end_date];
    if (monthly_rate) {
      updates.push(`monthly_rate = $${params.length + 1}`);
      params.push(monthly_rate);
    }
    params.push(req.params.id);
    const result = await query(
      `UPDATE clients SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    const updated = await query('SELECT id, name, contract_end_date, monthly_rate FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Contract renewed successfully', data: updated.rows[0] });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    logger.error('Contract renewal error:', error);
    res.status(500).json({ success: false, message: 'Failed to renew contract' });
  }
});
// GET /api/clients/:id/statement
router.get('/:id/statement', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    
    // Fetch client details
    const clientRes = await query('SELECT name, address, city, phone, email, monthly_rate FROM clients WHERE id = $1', [req.params.id]);
    if (clientRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    let dateWhere = '';
    let params = [req.params.id];
    let pc = 2;
    if (from_date && to_date) {
      dateWhere = `AND date >= date($${pc}) AND date <= date($${pc+1})`;
      params.push(from_date, to_date);
    }

    // Use a UNION query to get both invoices (debits) and payments (credits)
    // For invoices we use invoice_date, for payments we use payment_date
    const statementQuery = `
      WITH statement_data AS (
        SELECT id as ref_id, invoice_number as reference, invoice_date as date, 'Invoice' as type, final_amount as debit, 0 as credit
        FROM invoices WHERE client_id = $1 AND status != 'cancelled'
        UNION ALL
        SELECT p.id as ref_id, p.transaction_reference as reference, p.payment_date as date, 'Payment' as type, 0 as debit, p.amount_paid as credit
        FROM payments p JOIN invoices i ON p.invoice_id = i.id WHERE i.client_id = $1
      )
      SELECT * FROM statement_data
      WHERE 1=1 ${dateWhere}
      ORDER BY date ASC, type DESC
    `;

    const result = await query(statementQuery, params);

    // Calculate running balance
    let balance = 0;
    const transactions = result.rows.map(row => {
      balance += (parseFloat(row.debit) - parseFloat(row.credit));
      return {
        ...row,
        debit: parseFloat(row.debit),
        credit: parseFloat(row.credit),
        balance: parseFloat(balance.toFixed(2))
      };
    });

    res.json({ 
      success: true, 
      data: {
        client: clientRes.rows[0],
        period: { from: from_date, to: to_date },
        transactions,
        final_balance: parseFloat(balance.toFixed(2))
      } 
    });
  } catch (error) {
    logError(error, typeof req !== 'undefined' ? req : {}, { feature: 'clients' });
    logger.error('Statement error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate statement' });
  }
});

module.exports = router;
