const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/audit-logs - View audit history for transparency and ground truth analysis
router.get('/', authenticateToken, requireRole('official'), (req, res) => {
  const { report_id } = req.query;
  let query = `SELECT * FROM audit_logs`;
  const params = [];

  if (report_id) {
    query += ` WHERE report_id = ?`;
    params.push(report_id);
  }
  query += ` ORDER BY timestamp DESC LIMIT 200`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

module.exports = router;
