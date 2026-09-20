const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastEvent } = require('../services/sseService');

// POST /api/sos - Trigger emergency SOS
router.post('/', authenticateToken, (req, res) => {
  const { latitude, longitude, accuracy = 15.0, source = 'GPS' } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required for SOS broadcast' });
  }

  const sosId = `SOS-${Date.now().toString().slice(-8)}`;
  const id = `sos_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const reporter_id = req.user.id;
  const reporter_name = req.user.name;
  const reporter_phone = req.user.phone || 'N/A';

  const query = `
    INSERT INTO sos_alerts (id, reporter_id, reporter_name, reporter_phone, latitude, longitude, accuracy, status, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
  `;

  db.run(query, [id, reporter_id, reporter_name, reporter_phone, latitude, longitude, accuracy, source], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const sosAlert = {
      id,
      sosId,
      reporter_id,
      reporter_name,
      reporter_phone,
      latitude,
      longitude,
      accuracy,
      status: 'ACTIVE',
      source,
      created_at: new Date().toISOString()
    };

    // Broadcast emergency SOS alert to all active disaster officials immediately
    broadcastEvent('EMERGENCY_SOS', sosAlert);

    res.status(201).json({
      message: 'Emergency SOS broadcasted successfully to disaster responders',
      alert: sosAlert
    });
  });
});

// GET /api/sos - List all SOS alerts
router.get('/', (req, res) => {
  db.all(`SELECT * FROM sos_alerts ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// PATCH /api/sos/:id/status - State machine transitions (ACTIVE -> ACKNOWLEDGED -> RESOLVED)
router.patch('/:id/status', authenticateToken, requireRole('official'), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: "Target status must be 'ACKNOWLEDGED' or 'RESOLVED'" });
  }

  const nowIso = new Date().toISOString();
  let query = '';
  let params = [];

  if (status === 'ACKNOWLEDGED') {
    query = `UPDATE sos_alerts SET status = ?, acknowledged_at = ?, acknowledged_by = ? WHERE id = ?`;
    params = [status, nowIso, req.user.name, id];
  } else {
    query = `UPDATE sos_alerts SET status = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`;
    params = [status, nowIso, req.user.name, id];
  }

  db.run(query, params, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    broadcastEvent('SOS_STATUS_UPDATED', {
      id,
      status,
      updated_by: req.user.name,
      updated_at: nowIso
    });

    res.json({
      message: `SOS alert ${id} transitioned to ${status}`,
      id,
      status,
      updated_by: req.user.name,
      updated_at: nowIso
    });
  });
});

module.exports = router;
