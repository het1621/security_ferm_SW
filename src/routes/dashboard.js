const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);
router.use(requireRole('admin', 'manager', 'accountant', 'employee'));

// GET /api/dashboard - All KPIs in one call
router.get('/', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const today = new Date().toISOString().split('T')[0];

    // Revenue this month
    const revenueResult = await query(
      `SELECT 
        COALESCE(SUM(final_amount), 0) as total_billed,
        COALESCE(SUM(payment_received), 0) as total_collected,
        COALESCE(SUM(payment_due), 0) as total_outstanding,
        COUNT(*) as invoice_count,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
       FROM invoices WHERE invoice_date >= $1 AND status != 'cancelled'`,
      [monthStart]
    );

    // Employee stats
    const empResult = await query(
      `SELECT 
        COUNT(*) as total_employees,
        COUNT(*) FILTER (WHERE is_active = true) as active_employees
       FROM employees`
    );

    // Client stats
    const clientResult = await query(
      `SELECT 
        COUNT(*) as total_clients,
        COUNT(*) FILTER (WHERE is_active = true) as active_clients
       FROM clients`
    );

    // Expense this month
    const expenseResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses WHERE expense_date >= $1 AND status IN ('approved', 'paid')`,
      [monthStart]
    );

    // Pending payroll
    const payrollResult = await query(
      `SELECT COUNT(*) as pending_count, COALESCE(SUM(net_salary), 0) as pending_amount
       FROM payroll WHERE payment_status = 'pending'`
    );

    // Last 6 months revenue trend
    const trendResult = await query(
      `SELECT TO_CHAR(invoice_date, 'Mon') as month,
        EXTRACT(MONTH FROM invoice_date) as month_num,
        EXTRACT(YEAR FROM invoice_date) as year,
        COALESCE(SUM(payment_received), 0) as collected,
        COALESCE(SUM(final_amount), 0) as billed
       FROM invoices
       WHERE invoice_date >= CURRENT_DATE - INTERVAL '6 months' AND status != 'cancelled'
       GROUP BY TO_CHAR(invoice_date, 'Mon'), EXTRACT(MONTH FROM invoice_date), EXTRACT(YEAR FROM invoice_date)
       ORDER BY EXTRACT(YEAR FROM invoice_date) ASC, EXTRACT(MONTH FROM invoice_date) ASC`
    );

    // Recent invoices
    const recentInvoices = await query(
      `SELECT i.invoice_number, i.status, i.final_amount, i.invoice_date, c.name as client_name
       FROM invoices i JOIN clients c ON i.client_id = c.id
       ORDER BY i.created_at DESC LIMIT 5`
    );

    // Top clients by revenue
    const topClients = await query(
      `SELECT c.name, c.city,
        COALESCE(SUM(i.payment_received), 0) as revenue
       FROM clients c
       LEFT JOIN invoices i ON c.id = i.client_id AND i.status != 'cancelled'
       GROUP BY c.id, c.name, c.city
       ORDER BY revenue DESC LIMIT 5`
    );

    // Expense by category this month
    const expByCategory = await query(
      `SELECT category, COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE expense_date >= $1 AND status IN ('approved', 'paid')
       GROUP BY category ORDER BY total DESC`,
      [monthStart]
    );

    const revenue = revenueResult.rows[0];
    const employees = empResult.rows[0];
    const clients = clientResult.rows[0];

    res.json({
      success: true,
      data: {
        kpis: {
          revenue: {
            billed: parseFloat(revenue.total_billed),
            collected: parseFloat(revenue.total_collected),
            outstanding: parseFloat(revenue.total_outstanding),
            invoice_count: parseInt(revenue.invoice_count),
            overdue_count: parseInt(revenue.overdue_count)
          },
          employees: {
            total: parseInt(employees.total_employees),
            active: parseInt(employees.active_employees)
          },
          clients: {
            total: parseInt(clients.total_clients),
            active: parseInt(clients.active_clients)
          },
          expenses: parseFloat(expenseResult.rows[0].total_expenses),
          payroll: {
            pending_count: parseInt(payrollResult.rows[0].pending_count),
            pending_amount: parseFloat(payrollResult.rows[0].pending_amount)
          }
        },
        revenue_trend: trendResult.rows,
        recent_invoices: recentInvoices.rows,
        top_clients: topClients.rows,
        expense_by_category: expByCategory.rows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard data' });
  }
});

module.exports = router;
