const express = require('express');
const router = express.Router();
const Decimal = require('decimal.js');
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validators');
const { sendEmail } = require('../utils/email');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

router.use(authMiddleware);
router.use(requireRole('admin', 'accountant'));

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}${month}-${random}`;
}

function calculateInvoiceAmounts(monthly_rate, billing_period_start, billing_period_end, tax_rate = 0, discount_amount = 0) {
  const start = new Date(billing_period_start);
  const end = new Date(billing_period_end);
  const daysInPeriod = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const daysInMonth = 30; // Standard

  const dailyRate = new Decimal(monthly_rate).dividedBy(daysInMonth);
  const amount_subtotal = dailyRate.times(daysInPeriod).toDecimalPlaces(2);
  const tax_amount = amount_subtotal.times(tax_rate).dividedBy(100).toDecimalPlaces(2);
  const total_amount = amount_subtotal.plus(tax_amount).toDecimalPlaces(2);
  const discountDec = new Decimal(discount_amount || 0);
  const final_amount = total_amount.minus(discountDec).toDecimalPlaces(2);

  return {
    daysInPeriod,
    amount_subtotal: parseFloat(amount_subtotal.toString()),
    tax_amount: parseFloat(tax_amount.toString()),
    total_amount: parseFloat(total_amount.toString()),
    final_amount: parseFloat(final_amount.toString()),
  };
}

// GET /api/invoices
router.get('/', async (req, res) => {
  try {
    const { client_id, status, from_date, to_date, page = 1, limit = 50 } = req.query;
    let conditions = [];
    let params = [];
    let pc = 1;

    if (client_id) { conditions.push(`i.client_id = $${pc}`); params.push(client_id); pc++; }
    if (status) { conditions.push(`i.status = $${pc}`); params.push(status); pc++; }
    if (from_date) { conditions.push(`i.invoice_date >= $${pc}`); params.push(from_date); pc++; }
    if (to_date) { conditions.push(`i.invoice_date <= $${pc}`); params.push(to_date); pc++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone,
        c.address as client_address, c.city as client_city, c.contact_person
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       ${where}
       ORDER BY i.invoice_date DESC, i.created_at DESC
       LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM invoices i ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices' });
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.phone as client_phone,
        c.address as client_address, c.city as client_city, c.state as client_state,
        c.contact_person, c.gst_number as client_gst
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Also fetch payments
    const payments = await query(
      'SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC',
      [req.params.id]
    );

    res.json({ success: true, data: { ...result.rows[0], payments: payments.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch invoice' });
  }
});

// POST /api/invoices
router.post('/', validate(schemas.createInvoice), async (req, res) => {
  try {
    const { client_id, invoice_date, billing_period_start, billing_period_end, tax_rate = 0, discount_amount = 0, notes } = req.body;
    if (!client_id || !billing_period_start || !billing_period_end) {
      return res.status(400).json({ success: false, message: 'Client ID, billing period start and end are required' });
    }

    // Check if an invoice already exists for this client for the exact same billing period
    const existingInvoice = await query(
      'SELECT id FROM invoices WHERE client_id = $1 AND billing_period_start = $2 AND billing_period_end = $3',
      [client_id, billing_period_start, billing_period_end]
    );
    if (existingInvoice.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An invoice already exists for this client for the specified billing period.' });
    }

    // Get client monthly rate
    const clientResult = await query('SELECT * FROM clients WHERE id = $1 AND is_active = true', [client_id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found or inactive' });
    }
    const client = clientResult.rows[0];

    const amounts = calculateInvoiceAmounts(client.monthly_rate, billing_period_start, billing_period_end, tax_rate, discount_amount);
    const invoice_number = generateInvoiceNumber();
    const inv_date = invoice_date || new Date().toISOString().split('T')[0];
    const due_date = new Date(new Date(inv_date).getTime() + (parseInt(process.env.INVOICE_DUE_DAYS) || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await query(
      `INSERT INTO invoices (invoice_number, client_id, invoice_date, due_date, billing_period_start, billing_period_end,
        amount_subtotal, tax_rate, tax_amount, total_amount, discount_amount, final_amount, payment_due, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [invoice_number, client_id, inv_date, due_date, billing_period_start, billing_period_end,
        amounts.amount_subtotal, tax_rate, amounts.tax_amount, amounts.total_amount, discount_amount,
        amounts.final_amount, amounts.final_amount, notes, req.user.userId]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Invoice created successfully' });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
});

// PUT /api/invoices/:id
router.put('/:id', async (req, res) => {
  try {
    const { status, notes, discount_amount } = req.body;
    const result = await query(
      `UPDATE invoices SET status=COALESCE($1, status), notes=COALESCE($2, notes), 
        discount_amount=COALESCE($3, discount_amount), updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [status, notes, discount_amount, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Invoice updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update invoice' });
  }
});

// POST /api/invoices/:id/payment
router.post('/:id/payment', validate(schemas.recordPayment), async (req, res) => {
  try {
    const { amount_paid, payment_date, payment_method, transaction_reference, notes } = req.body;
    if (!amount_paid || !payment_method) {
      return res.status(400).json({ success: false, message: 'Amount and payment method are required' });
    }

    const invoiceResult = await query('SELECT * FROM invoices WHERE id = $1', [req.params.id]);
    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    const invoice = invoiceResult.rows[0];
    const remaining = parseFloat(invoice.final_amount) - parseFloat(invoice.payment_received || 0);

    if (parseFloat(amount_paid) > remaining + 0.01) {
      return res.status(400).json({ success: false, message: `Amount exceeds remaining balance of ₹${remaining.toFixed(2)}` });
    }

    // Record payment
    await query(
      'INSERT INTO payments (invoice_id, payment_date, amount_paid, payment_method, transaction_reference, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [req.params.id, payment_date || new Date().toISOString().split('T')[0], amount_paid, payment_method, transaction_reference, notes, req.user.userId]
    );

    // Update invoice
    const newReceived = parseFloat(invoice.payment_received || 0) + parseFloat(amount_paid);
    const newDue = parseFloat(invoice.final_amount) - newReceived;
    const newStatus = newDue <= 0.01 ? 'paid' : 'partially_paid';

    const updated = await query(
      'UPDATE invoices SET payment_received=$1, payment_due=$2, status=$3, updated_at=CURRENT_TIMESTAMP WHERE id=$4 RETURNING *',
      [newReceived.toFixed(2), Math.max(0, newDue).toFixed(2), newStatus, req.params.id]
    );

    res.json({ success: true, data: updated.rows[0], message: 'Payment recorded successfully' });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// POST /api/invoices/calculate
router.post('/calculate', async (req, res) => {
  try {
    const { client_id, billing_period_start, billing_period_end, tax_rate = 0, discount_amount = 0 } = req.body;
    const clientResult = await query('SELECT monthly_rate FROM clients WHERE id = $1', [client_id]);
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    const amounts = calculateInvoiceAmounts(clientResult.rows[0].monthly_rate, billing_period_start, billing_period_end, tax_rate, discount_amount);
    res.json({ success: true, data: amounts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Calculation failed' });
  }
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  try {
    // Delete associated payments first to satisfy foreign key constraints
    await query('DELETE FROM payments WHERE invoice_id = $1', [req.params.id]);
    
    // We do a hard delete for invoices, but ensure it exists first
    const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete invoice' });
  }
});

// GET /api/invoices/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, c.name, c.address, c.city, c.state, c.postal_code, c.email, c.phone, c.gst_number
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result.rows[0];
    const client = {
      name: invoice.name,
      address: invoice.address,
      city: invoice.city,
      state: invoice.state,
      postal_code: invoice.postal_code,
      email: invoice.email,
      phone: invoice.phone,
      gst_number: invoice.gst_number
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`);

    generateInvoicePDF(invoice, client, 
      (chunk) => res.write(chunk),
      () => res.end()
    );
  } catch (error) {
    console.error('Generate invoice PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' });
    }
  }
});

// POST /api/invoices/:id/email
router.post('/:id/email', async (req, res) => {
  try {
    const result = await query(
      `SELECT i.*, c.name as client_name, c.email as client_email
       FROM invoices i
       JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.client_email) {
      return res.status(400).json({ success: false, message: 'Client has no email address configured' });
    }

    // Fetch template from system_settings
    const settingResult = await query("SELECT setting_value FROM system_settings WHERE setting_key = 'invoice_email_template'");
    let template = settingResult.rows.length > 0 ? settingResult.rows[0].setting_value : '';

    if (!template) {
      // Fallback template
      template = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0f766e;">Invoice {{invoice_number}}</h2>
        <p>Dear {{client_name}},</p>
        <p>Please find the details of your latest invoice below:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px 0; font-weight: bold;">Billing Period:</td>
            <td style="padding: 10px 0; text-align: right;">{{billing_period}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px 0; font-weight: bold;">Subtotal:</td>
            <td style="padding: 10px 0; text-align: right;">₹{{subtotal}}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px 0; font-weight: bold;">Tax ({{tax_rate}}%):</td>
            <td style="padding: 10px 0; text-align: right;">₹{{tax_amount}}</td>
          </tr>
          <tr style="border-bottom: 2px solid #0f766e; background-color: #f0fdfa;">
            <td style="padding: 12px 10px; font-weight: bold; font-size: 16px;">Total Amount:</td>
            <td style="padding: 12px 10px; text-align: right; font-weight: bold; font-size: 16px; color: #0f766e;">₹{{total_amount}}</td>
          </tr>
        </table>
        
        <p style="margin-top: 30px;">Amount Due: <strong>₹{{amount_due}}</strong></p>
        <p>Due Date: <strong>{{due_date}}</strong></p>
        
        <p style="margin-top: 40px; font-size: 12px; color: #777;">Thank you for your business!<br>Security Agency Administration</p>
      </div>
      `;
    }

    // Replace placeholders
    const billingPeriodStr = `${new Date(invoice.billing_period_start).toLocaleDateString()} to ${new Date(invoice.billing_period_end).toLocaleDateString()}`;
    const emailHtml = template
      .replace(/{{client_name}}/g, invoice.client_name)
      .replace(/{{invoice_number}}/g, invoice.invoice_number)
      .replace(/{{billing_period}}/g, billingPeriodStr)
      .replace(/{{subtotal}}/g, parseFloat(invoice.amount_subtotal).toLocaleString('en-IN'))
      .replace(/{{tax_rate}}/g, invoice.tax_rate)
      .replace(/{{tax_amount}}/g, parseFloat(invoice.tax_amount).toLocaleString('en-IN'))
      .replace(/{{total_amount}}/g, parseFloat(invoice.final_amount).toLocaleString('en-IN'))
      .replace(/{{amount_due}}/g, parseFloat(invoice.payment_due).toLocaleString('en-IN'))
      .replace(/{{due_date}}/g, new Date(invoice.due_date).toLocaleDateString());

    const client = {
      name: invoice.client_name,
      address: invoice.address,
      city: invoice.city,
      state: invoice.state,
      postal_code: invoice.postal_code,
      email: invoice.client_email,
      phone: invoice.phone,
      gst_number: invoice.gst_number
    };

    // Generate PDF to memory buffer
    const chunks = [];
    await new Promise((resolve, reject) => {
      try {
        generateInvoicePDF(invoice, client, 
          (chunk) => chunks.push(chunk),
          () => resolve()
        );
      } catch (err) {
        reject(err);
      }
    });
    
    const pdfBuffer = Buffer.concat(chunks);

    const success = await sendEmail({
      to: invoice.client_email,
      subject: `Invoice ${invoice.invoice_number} from Security Agency`,
      html: emailHtml,
      text: `Invoice ${invoice.invoice_number} is ready. Total amount: ₹${invoice.final_amount}. Amount due: ₹${invoice.payment_due}. Due date: ${new Date(invoice.due_date).toLocaleDateString()}.`,
      attachments: [
        {
          filename: `Invoice-${invoice.invoice_number}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (success) {
      res.json({ success: true, message: 'Invoice emailed successfully to ' + invoice.client_email });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email. Check server configuration.' });
    }
  } catch (error) {
    console.error('Email invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to send invoice email' });
  }
});

module.exports = router;
