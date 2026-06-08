const express = require('express');
const router = express.Router();
const { query } = require('../database/connection');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validators');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'DOC-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and Image files are allowed'));
    }
  }
});

router.use(authMiddleware);
router.use(requireRole('admin', 'manager'));

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const { search, is_active, client_id, page = 1, limit = 50 } = req.query;
    let conditions = [];
    let params = [];
    let pc = 1;

    if (search) {
      conditions.push(`(e.full_name ILIKE $${pc} OR e.employee_id ILIKE $${pc} OR e.phone ILIKE $${pc})`);
      params.push(`%${search}%`); pc++;
    }
    if (is_active !== undefined) {
      conditions.push(`e.is_active = $${pc}`);
      params.push(is_active === 'true'); pc++;
    }
    if (client_id) {
      conditions.push(`e.assigned_client_id = $${pc}`);
      params.push(client_id); pc++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT e.*, 
        s.base_salary, s.dearness_allowance, s.house_rent_allowance, s.pf_percentage,
        c.name as client_name,
        ss.name as salary_structure_name
       FROM employees e
       LEFT JOIN clients c ON e.assigned_client_id = c.id
       LEFT JOIN salary_structures ss ON e.salary_structure_id = ss.id
       LEFT JOIN LATERAL (
         SELECT base_salary, dearness_allowance, house_rent_allowance, pf_percentage 
         FROM salary_structures WHERE id = e.salary_structure_id
       ) s ON true
       ${where}
       ORDER BY e.is_active DESC, e.full_name ASC
       LIMIT $${pc} OFFSET $${pc + 1}`,
      [...params, parseInt(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) FROM employees e ${where}`, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*, c.name as client_name, ss.name as salary_structure_name,
        ss.base_salary, ss.dearness_allowance, ss.house_rent_allowance, ss.other_allowances, ss.pf_percentage
       FROM employees e
       LEFT JOIN clients c ON e.assigned_client_id = c.id
       LEFT JOIN salary_structures ss ON e.salary_structure_id = ss.id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch employee' });
  }
});

// POST /api/employees
router.post('/', validate(schemas.createEmployee), async (req, res) => {
  try {
    const { full_name, phone, email, date_of_birth, address, city, aadhar_number, pan_number,
      bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name,
      date_of_joining, designation = 'Watchman', salary_structure_id, assigned_client_id,
      emergency_contact_name, emergency_contact_phone, notes } = req.body;

    if (!full_name || !phone || !date_of_joining) {
      return res.status(400).json({ success: false, message: 'Name, phone, and joining date are required' });
    }

    // Generate employee ID using a collision-resistant approach
    const crypto = require('crypto');
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const employee_id = `EMP-${randomHex}`;

    const result = await query(
      `INSERT INTO employees (employee_id, full_name, phone, email, date_of_birth, address, city, 
        aadhar_number, pan_number, bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name,
        date_of_joining, designation, salary_structure_id, assigned_client_id, 
        emergency_contact_name, emergency_contact_phone, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [employee_id, full_name, phone, email, date_of_birth || null, address, city, aadhar_number, pan_number,
        bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name,
        date_of_joining, designation, salary_structure_id || null, assigned_client_id || null,
        emergency_contact_name, emergency_contact_phone, notes]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: 'Employee created successfully' });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: 'Failed to create employee' });
  }
});

// PUT /api/employees/:id
router.put('/:id', validate(schemas.updateEmployee), async (req, res) => {
  try {
    const { full_name, phone, email, date_of_birth, address, city, aadhar_number, pan_number,
      bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name,
      date_of_joining, designation, salary_structure_id, assigned_client_id,
      emergency_contact_name, emergency_contact_phone, notes, is_active } = req.body;

    const result = await query(
      `UPDATE employees SET full_name=$1, phone=$2, email=$3, date_of_birth=$4, address=$5, city=$6,
        aadhar_number=$7, pan_number=$8, bank_account_number=$9, bank_ifsc_code=$10, bank_name=$11,
        bank_account_holder_name=$12, date_of_joining=$13, designation=$14, salary_structure_id=$15,
        assigned_client_id=$16, emergency_contact_name=$17, emergency_contact_phone=$18, notes=$19,
        is_active=$20, updated_at=CURRENT_TIMESTAMP
       WHERE id=$21 RETURNING *`,
      [full_name, phone, email, date_of_birth || null, address, city, aadhar_number, pan_number,
        bank_account_number, bank_ifsc_code, bank_name, bank_account_holder_name,
        date_of_joining, designation, salary_structure_id || null, assigned_client_id || null,
        emergency_contact_name, emergency_contact_phone, notes, is_active !== undefined ? is_active : true,
        req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, data: result.rows[0], message: 'Employee updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update employee' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'UPDATE employees SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to deactivate employee' });
  }
});

// GET /api/employees/salary-structures
router.get('/meta/salary-structures', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salary_structures WHERE is_active = true ORDER BY base_salary ASC');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch salary structures' });
  }
});

// POST /api/employees/:id/upload-doc
router.post('/:id/upload-doc', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = await query(
      'INSERT INTO employee_documents (employee_id, file_name, file_path) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, req.file.originalname, req.file.filename]
    );

    res.json({ success: true, message: 'Document uploaded successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to upload document' });
  }
});

// GET /api/employees/:id/docs
router.get('/:id/docs', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, file_name, file_path, uploaded_at FROM employee_documents WHERE employee_id = $1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

module.exports = router;
