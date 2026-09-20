const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/schema');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, phone, password, role = 'citizen' } = req.body;

  if (!name || (!email && !phone) || !password) {
    return res.status(400).json({ error: 'Name, email/phone, and password are required' });
  }

  const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const password_hash = bcrypt.hashSync(password, 10);

  const query = `
    INSERT INTO users (id, name, email, phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [id, name, email || null, phone || null, password_hash, role], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'An account with this email or phone already exists' });
      }
      return res.status(500).json({ error: err.message });
    }

    const token = jwt.sign({ id, name, role, email, phone }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id, name, email, phone, role, reputation_score: 0.5 }
    });
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { emailOrPhone, password, role } = req.body;

  if (!emailOrPhone || !password) {
    return res.status(400).json({ error: 'Email/Phone and password are required' });
  }

  const query = `
    SELECT * FROM users
    WHERE (email = ? OR phone = ?) AND (role = ? OR ? IS NULL)
  `;

  db.get(query, [emailOrPhone, emailOrPhone, role || null, role || null], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email/phone or role credentials' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role, email: user.email, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Authentication successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        reputation_score: user.reputation_score,
        total_reports: user.total_reports,
        verified_reports: user.verified_reports
      }
    });
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  db.get(`SELECT id, name, email, phone, role, reputation_score, total_reports, verified_reports FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

module.exports = router;
