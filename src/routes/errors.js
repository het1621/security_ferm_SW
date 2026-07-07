const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware } = require('../middleware/auth');

// Allow logging errors without auth if necessary (e.g. login failures), but it's better to capture whatever we can.
// We'll use authMiddleware loosely or only for reading.

// POST /api/errors (Used by Frontend Error Boundary/Interceptor)
router.post('/', async (req, res) => {
  try {
    const { error_type, error_message, stack_trace, endpoint, method, additional_data } = req.body;
    
    // Attempt to extract user ID if auth token exists in headers
    let user_id = null;
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        user_id = decoded.userId;
      } catch (e) { /* ignore invalid tokens for error logging */ }
    }

    const client_ip = req.ip || req.connection.remoteAddress;

    await query(
      `INSERT INTO error_logs (error_type, error_message, stack_trace, endpoint, method, user_id, client_ip, additional_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        error_type || 'FrontendError',
        error_message || 'Unknown error',
        stack_trace || null,
        endpoint || null,
        method || null,
        user_id,
        client_ip,
        additional_data ? JSON.stringify(additional_data) : null
      ]
    );

    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Failed to log error to DB:', err);
    res.status(500).json({ success: false });
  }
});

const jwt = require('jsonwebtoken');

// Admin endpoints protected by master passcode OR view_dev_errors permission
const masterPasscodeMiddleware = (req, res, next) => {
  const code = req.headers['x-master-passcode'];
  if (code === 'M$sterC0de') {
    return next();
  }
  
  // Also allow if they have a valid JWT with admin role or view_dev_errors permission
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const isAuthorized = decoded.role === 'admin' || (decoded.permissions && decoded.permissions.includes('view_dev_errors'));
      if (isAuthorized) return next();
    } catch (err) {
      // ignore invalid token, fall through to 403
    }
  }

  return res.status(403).json({ success: false, message: 'Forbidden' });
};

// GET /api/errors
router.get('/', masterPasscodeMiddleware, async (req, res) => {
  try {
    const { is_resolved, page = 1, limit = 50 } = req.query;
    let whereClause = '';
    let params = [];
    if (is_resolved !== undefined) {
      whereClause = 'WHERE e.is_resolved = $1';
      params.push(is_resolved === 'true' ? 1 : 0);
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);
    
    const result = await query(
      `SELECT e.*, u.full_name as user_name
       FROM error_logs e
       LEFT JOIN users u ON e.user_id = u.id
       ${whereClause}
       ORDER BY e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch error logs' });
  }
});

// PATCH /api/errors/:id/resolve
router.patch('/:id/resolve', masterPasscodeMiddleware, async (req, res) => {
  try {
    const result = await query(
      `UPDATE error_logs SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Error marked as resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to resolve error' });
  }
});

// DELETE /api/errors/clear-resolved
router.delete('/clear-resolved', masterPasscodeMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM error_logs WHERE is_resolved = 1');
    res.json({ success: true, message: 'Resolved errors cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear resolved errors' });
  }
});

module.exports = router;
