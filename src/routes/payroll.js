const express = require('express');
const router = express.Router();
const Decimal = require('decimal.js');
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validators');
const { generatePayslipPDF } = require('../utils/payslipGenerator');

router.use(authMiddleware);
router.use(requireRole('admin', 'accountant'));

async function calculatePayroll(employee_id, payroll_month) {
  // Get employee with salary structure
  const empResult = await query(
    `SELECT e.*, ss.base_salary, ss.dearness_allowance, ss.house_rent_allowance, 
      ss.other_allowances, ss.pf_percentage, ss.esi_applicable
     FROM employees e
     LEFT JOIN salary_structures ss ON e.salary_structure_id = ss.id
     WHERE e.id = $1 AND e.is_active = true`,
    [employee_id]
  );

  if (empResult.rows.length === 0) throw new Error(`Employee ${employee_id} not found or inactive`);
  const emp = empResult.rows[0];
  if (!emp.base_salary) throw new Error(`No salary structure assigned to employee ${emp.full_name}`);

  // Get attendance for the month
  const monthStart = payroll_month;
  const [year, month] = payroll_month.split('-');
  const monthEnd = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

  const attendanceResult = await query(
    `SELECT status FROM attendance 
     WHERE employee_id = $1 AND attendance_date BETWEEN $2 AND $3`,
    [employee_id, monthStart, monthEnd]
  );

  const attendance = attendanceResult.rows;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const halfDays = attendance.filter(a => a.status === 'half_day').length;
  const absentDays = attendance.filter(a => a.status === 'absent').length;
  const leaveDays = attendance.filter(a => a.status === 'leave').length;
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const effectiveDays = presentDays + (halfDays * 0.5);

  // Calculate salary using Decimal.js for precision
  const D = (v) => new Decimal(v || 0);
  const ratio = effectiveDays / daysInMonth;
  const baseSalary = D(emp.base_salary).times(ratio).toDecimalPlaces(2);
  const da = D(emp.dearness_allowance).times(ratio).toDecimalPlaces(2);
  const hra = D(emp.house_rent_allowance).times(ratio).toDecimalPlaces(2);
  const otherAllow = D(emp.other_allowances).times(ratio).toDecimalPlaces(2);
  const grossSalary = baseSalary.plus(da).plus(hra).plus(otherAllow).toDecimalPlaces(2);
  const pfDeduction = grossSalary.times(D(emp.pf_percentage || 12)).dividedBy(100).toDecimalPlaces(2);
  const esiDeduction = emp.esi_applicable ? grossSalary.times(0.75).dividedBy(100).toDecimalPlaces(2) : D(0);
  const totalDeductions = pfDeduction.plus(esiDeduction).toDecimalPlaces(2);
  const netSalary = grossSalary.minus(totalDeductions).toDecimalPlaces(2);

  return {
    employee_id,
    payroll_month: `${monthStart}`,
    days_in_month: daysInMonth,
    days_worked: Math.round(effectiveDays),
    days_absent: absentDays,
    days_leave: leaveDays,
    base_salary: parseFloat(baseSalary.toString()),
    da_amount: parseFloat(da.toString()),
    hra_amount: parseFloat(hra.toString()),
    other_allowances: parseFloat(otherAllow.toString()),
    gross_salary: parseFloat(grossSalary.toString()),
    pf_deduction: parseFloat(pfDeduction.toString()),
    esi_deduction: parseFloat(esiDeduction.toString()),
    tax_deduction: 0,
    other_deductions: 0,
    total_deductions: parseFloat(totalDeductions.toString()),
    net_salary: parseFloat(netSalary.toString()),
  };
}

// GET /api/payroll
router.get('/', async (req, res) => {
  try {
    const { employee_id, month, status, page = 1, limit = 50 } = req.query;
    let conditions = [];
    let params = [];
    let pc = 1;

    if (employee_id) { conditions.push(`p.employee_id = $${pc}`); params.push(employee_id); pc++; }
    if (month) { conditions.push(`TO_CHAR(p.payroll_month, 'YYYY-MM') = $${pc}`); params.push(month); pc++; }
    if (status) { conditions.push(`p.payment_status = $${pc}`); params.push(status); pc++; }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT p.*, e.full_name as employee_name, e.employee_id as emp_id, e.designation,
        e.bank_account_number, e.bank_ifsc_code, e.bank_name
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       ${where}
       ORDER BY p.payroll_month DESC, e.full_name ASC
       LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM payroll p ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payroll' });
  }
});

// POST /api/payroll/calculate
router.post('/calculate', validate(schemas.generatePayroll), async (req, res) => {
  try {
    const { employee_ids, month } = req.body; // month: "YYYY-MM-01"
    if (!month) {
      return res.status(400).json({ success: false, message: 'Month is required (YYYY-MM-01 format)' });
    }

    let empIds = employee_ids;
    if (!empIds || empIds.length === 0) {
      const empResult = await query('SELECT id FROM employees WHERE is_active = true');
      empIds = empResult.rows.map(e => e.id);
    }

    const results = [];
    const errors = [];

    for (const empId of empIds) {
      try {
        // Check if payroll already exists
        const existing = await query(
          "SELECT id, payment_status FROM payroll WHERE employee_id = $1 AND TO_CHAR(payroll_month, 'YYYY-MM') = $2",
          [empId, month.substring(0, 7)]
        );
        if (existing.rows.length > 0) {
          if (existing.rows[0].payment_status === 'paid') {
            errors.push({ employee_id: empId, error: 'Payroll already paid and locked for this month' });
            continue;
          } else {
            // Recalculate: delete the pending payroll
            await query("DELETE FROM payroll WHERE id = $1", [existing.rows[0].id]);
          }
        }

        const data = await calculatePayroll(empId, month);
        const inserted = await query(
          `INSERT INTO payroll (employee_id, payroll_month, days_in_month, days_worked, days_absent, days_leave,
            base_salary, da_amount, hra_amount, other_allowances, gross_salary, pf_deduction, esi_deduction,
            tax_deduction, other_deductions, total_deductions, net_salary, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
          [data.employee_id, data.payroll_month, data.days_in_month, data.days_worked, data.days_absent,
            data.days_leave, data.base_salary, data.da_amount, data.hra_amount, data.other_allowances,
            data.gross_salary, data.pf_deduction, data.esi_deduction, data.tax_deduction, data.other_deductions,
            data.total_deductions, data.net_salary, req.user.userId]
        );
        results.push(inserted.rows[0]);
      } catch (err) {
        errors.push({ employee_id: empId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Payroll calculated for ${results.length} employees`,
      data: results,
      errors
    });
  } catch (error) {
    console.error('Calculate payroll error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate payroll' });
  }
});

// PUT /api/payroll/:id/mark-paid
router.put('/:id/mark-paid', async (req, res) => {
  try {
    const { payment_date, payment_method, transaction_reference } = req.body;
    const result = await query(
      `UPDATE payroll SET payment_status='paid', payment_date=$1, payment_method=$2, 
        transaction_reference=$3, updated_at=CURRENT_TIMESTAMP
       WHERE id=$4 RETURNING *`,
      [payment_date || new Date().toISOString().split('T')[0], payment_method, transaction_reference, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Payroll marked as paid' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update payroll status' });
  }
});

// GET /api/payroll/preview
router.post('/preview', async (req, res) => {
  try {
    const { employee_id, month } = req.body;
    const data = await calculatePayroll(employee_id, month);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/payroll/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, e.full_name, e.employee_id as emp_id, e.designation, e.aadhar_number, 
        e.pan_number, e.bank_account_number, e.bank_ifsc_code, e.bank_name,
        c.name as client_name
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       LEFT JOIN clients c ON e.assigned_client_id = c.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    const payroll = result.rows[0];
    const employee = {
      full_name: payroll.full_name,
      employee_id: payroll.emp_id,
      designation: payroll.designation,
      aadhar_number: payroll.aadhar_number,
      pan_number: payroll.pan_number,
      bank_account_number: payroll.bank_account_number,
      bank_ifsc_code: payroll.bank_ifsc_code,
      bank_name: payroll.bank_name
    };
    const client = payroll.client_name ? { name: payroll.client_name } : null;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip-${employee.full_name.replace(/\s+/g, '_')}-${new Date(payroll.payroll_month).toLocaleString('default', { month: 'short', year: 'numeric' })}.pdf"`);

    generatePayslipPDF(payroll, employee, client,
      (chunk) => res.write(chunk),
      () => res.end()
    );
  } catch (error) {
    console.error('Generate payslip PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate Payslip PDF' });
    }
  }
});

module.exports = router;
