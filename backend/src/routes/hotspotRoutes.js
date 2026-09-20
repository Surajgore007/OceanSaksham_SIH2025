const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { broadcastEvent } = require('../services/sseService');

// GET /api/hotspots - List active hotspots
router.get('/', (req, res) => {
  db.all(`SELECT * FROM hotspots WHERE status = 'ACTIVE' ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /api/hotspots - Create new hotspot danger zone
router.post('/', authenticateToken, requireRole('official'), (req, res) => {
  const { name, hazard_type, latitude, longitude, radius_km = 5.0, severity = 'High' } = req.body;

  if (!name || !hazard_type || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Name, hazard_type, latitude, and longitude are required' });
  }

  const id = `hot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const created_by = req.user.name;

  db.run(
    `INSERT INTO hotspots (id, name, hazard_type, latitude, longitude, radius_km, severity, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, hazard_type, parseFloat(latitude), parseFloat(longitude), parseFloat(radius_km), severity, created_by],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const hotspot = {
        id,
        name,
        hazard_type,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius_km: parseFloat(radius_km),
        severity,
        status: 'ACTIVE',
        created_by,
        created_at: new Date().toISOString()
      };

      broadcastEvent('HOTSPOT_CREATED', hotspot);

      res.status(201).json({
        message: 'Hotspot created successfully',
        hotspot
      });
    }
  );
});

module.exports = router;
