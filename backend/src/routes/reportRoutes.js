const express = require('express');
const router = express.Router();
const db = require('../db/schema');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { findDuplicates } = require('../services/duplicateDetection');
const { computeCredibilityScore } = require('../services/triageService');
const { broadcastEvent } = require('../services/sseService');

// POST /api/reports - Citizen / Official Report Submission
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      hazard_type,
      severity = 'Moderate',
      description = '',
      text_lang = 'en',
      latitude,
      longitude,
      address = '',
      gps_accuracy = 10.0,
      device_timestamp = new Date().toISOString(),
      exif_lat = null,
      exif_lng = null,
      exif_valid = 0,
      media_url = null,
      media_hash = null
    } = req.body;

    if (!hazard_type || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'hazard_type, latitude, and longitude are required' });
    }

    const reporter_id = req.user.id;
    const report_id = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const server_timestamp = new Date().toISOString();

    // Fetch existing recent reports for duplicate detection & corroboration
    db.all(`SELECT * FROM reports ORDER BY created_at DESC LIMIT 200`, [], async (err, recentReports) => {
      if (err) recentReports = [];

      const candidateReport = {
        id: report_id,
        reporter_id,
        hazard_type,
        severity,
        description,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        gps_accuracy: parseFloat(gps_accuracy),
        device_timestamp,
        server_timestamp,
        exif_lat: exif_lat ? parseFloat(exif_lat) : null,
        exif_lng: exif_lng ? parseFloat(exif_lng) : null,
        exif_valid: exif_valid ? 1 : 0,
        media_url,
        media_hash
      };

      // 1. Run Duplicate Detection
      const dupCheck = findDuplicates(candidateReport, recentReports);
      candidateReport.is_duplicate = dupCheck.isDuplicate ? 1 : 0;
      candidateReport.duplicate_of = dupCheck.duplicateOf;
      candidateReport.duplicate_reason = dupCheck.reason;

      // 2. Fetch Reporter profile & active hotspots for context
      db.get(`SELECT * FROM users WHERE id = ?`, [reporter_id], async (errUser, reporterUser) => {
        db.all(`SELECT * FROM hotspots WHERE status = 'ACTIVE'`, [], async (errHot, activeHotspots) => {
          // 3. Compute Credibility Score and Explainable Reasons
          const triageResult = await computeCredibilityScore(candidateReport, {
            allReports: recentReports,
            reporter: reporterUser || null,
            activeHotspots: activeHotspots || []
          });

          const credibility_score = triageResult.score;
          const credibility_reasons = JSON.stringify(triageResult.reasons);

          // 4. Insert into database
          const insertQuery = `
            INSERT INTO reports (
              id, reporter_id, hazard_type, severity, description, text_lang,
              latitude, longitude, address, gps_accuracy, device_timestamp, server_timestamp,
              exif_lat, exif_lng, exif_valid, media_url, media_hash, status,
              credibility_score, credibility_reasons, is_duplicate, duplicate_of
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(insertQuery, [
            report_id, reporter_id, hazard_type, severity, description, text_lang,
            candidateReport.latitude, candidateReport.longitude, address, candidateReport.gps_accuracy,
            device_timestamp, server_timestamp, candidateReport.exif_lat, candidateReport.exif_lng,
            candidateReport.exif_valid, media_url, media_hash, 'PENDING',
            credibility_score, credibility_reasons, candidateReport.is_duplicate, candidateReport.duplicate_of
          ], function (insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: insertErr.message });
            }

            // Update user total reports counter
            db.run(`UPDATE users SET total_reports = total_reports + 1 WHERE id = ?`, [reporter_id]);

            const createdReport = {
              ...candidateReport,
              address,
              status: 'PENDING',
              credibility_score,
              credibility_reasons: triageResult.reasons,
              confidence_level: triageResult.confidenceLevel,
              created_at: server_timestamp
            };

            // 5. Broadcast to connected Live Map and Official Consoles
            broadcastEvent('NEW_REPORT', createdReport);

            res.status(201).json({
              message: 'Hazard report submitted successfully',
              report: createdReport
            });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/reports - Fetch all reports with filters & ranking
router.get('/', (req, res) => {
  const { status, hazard_type, severity, sort_by = 'credibility' } = req.query;

  let query = `
    SELECT r.*, u.name as reporter_name, u.role as reporter_role, u.reputation_score as reporter_reputation
    FROM reports r
    LEFT JOIN users u ON r.reporter_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'all') {
    query += ` AND r.status = ?`;
    params.push(status.toUpperCase());
  }
  if (hazard_type && hazard_type !== 'all') {
    query += ` AND r.hazard_type = ?`;
    params.push(hazard_type);
  }
  if (severity && severity !== 'all') {
    query += ` AND r.severity = ?`;
    params.push(severity);
  }

  if (sort_by === 'credibility') {
    query += ` ORDER BY r.credibility_score DESC, r.created_at DESC`;
  } else if (sort_by === 'fifo') {
    query += ` ORDER BY r.created_at ASC`;
  } else {
    query += ` ORDER BY r.created_at DESC`;
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const formatted = rows.map(r => ({
      ...r,
      credibility_reasons: r.credibility_reasons ? JSON.parse(r.credibility_reasons) : [],
      is_duplicate: Boolean(r.is_duplicate),
      exif_valid: Boolean(r.exif_valid)
    }));

    res.json(formatted);
  });
});

// PATCH /api/reports/:id/status - Official Status Update with Audit Log
router.patch('/:id/status', authenticateToken, requireRole('official'), (req, res) => {
  const { id } = req.params;
  const { status, reason = 'Official manual review', severity_override = null } = req.body;

  if (!['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  db.get(`SELECT * FROM reports WHERE id = ?`, [id], (err, currentReport) => {
    if (err || !currentReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const oldStatus = currentReport.status;
    const oldSeverity = currentReport.severity;
    const newSeverity = severity_override || oldSeverity;

    db.run(
      `UPDATE reports SET status = ?, severity = ? WHERE id = ?`,
      [status, newSeverity, id],
      function (updateErr) {
        if (updateErr) {
          return res.status(500).json({ error: updateErr.message });
        }

        // Insert into audit log for ground-truth tracking
        const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        db.run(
          `INSERT INTO audit_logs (id, report_id, official_id, official_name, action_type, old_value, new_value, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [auditId, id, req.user.id, req.user.name, 'STATUS_UPDATE', `${oldStatus} (${oldSeverity})`, `${status} (${newSeverity})`, reason]
        );

        // Update reporter reputation statistics
        if (currentReport.reporter_id) {
          if (status === 'VERIFIED') {
            db.run(`UPDATE users SET verified_reports = verified_reports + 1, reputation_score = MIN(0.99, reputation_score + 0.05) WHERE id = ?`, [currentReport.reporter_id]);
          } else if (status === 'REJECTED') {
            db.run(`UPDATE users SET rejected_reports = rejected_reports + 1, reputation_score = MAX(0.05, reputation_score - 0.10) WHERE id = ?`, [currentReport.reporter_id]);
          }
        }

        // Broadcast status update
        broadcastEvent('REPORT_STATUS_CHANGED', {
          id,
          status,
          severity: newSeverity,
          official_id: req.user.id,
          official_name: req.user.name,
          updated_at: new Date().toISOString()
        });

        res.json({
          message: `Report ${id} status updated to ${status}`,
          reportId: id,
          oldStatus,
          newStatus: status,
          severity: newSeverity
        });
      }
    );
  });
});

module.exports = router;
