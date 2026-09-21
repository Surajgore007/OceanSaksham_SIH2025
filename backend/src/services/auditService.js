const crypto = require('crypto');
const db = require('../db/schema');

/**
 * Inserts an immutable, hash-chained audit log entry.
 * Chain property: entry_hash = SHA256(id|report_id|official_id|action_type|old_value|new_value|reason|timestamp|previous_hash)
 */
function recordAuditEntry({ reportId, officialId, officialName, actionType, oldValue, newValue, reason }, callback) {
  const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const timestamp = new Date().toISOString();

  db.get(`SELECT entry_hash FROM audit_logs ORDER BY rowid DESC LIMIT 1`, [], (err, lastRow) => {
    const previousHash = lastRow && lastRow.entry_hash ? lastRow.entry_hash : '0'.repeat(64);
    const payload = `${auditId}|${reportId || ''}|${officialId}|${actionType}|${oldValue || ''}|${newValue || ''}|${reason || ''}|${timestamp}|${previousHash}`;
    const entryHash = crypto.createHash('sha256').update(payload).digest('hex');

    db.run(
      `INSERT INTO audit_logs (id, report_id, official_id, official_name, action_type, old_value, new_value, reason, previous_hash, entry_hash, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [auditId, reportId, officialId, officialName, actionType, oldValue, newValue, reason, previousHash, entryHash, timestamp],
      function (insertErr) {
        if (callback) callback(insertErr, { auditId, entryHash, previousHash });
      }
    );
  });
}

/**
 * Verifies cryptographic integrity of the entire audit hash chain
 */
function verifyAuditChain(callback) {
  db.all(`SELECT * FROM audit_logs ORDER BY rowid ASC`, [], (err, rows) => {
    if (err) return callback(err, null);
    let valid = true;
    let prevHash = '0'.repeat(64);
    let brokenAt = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.previous_hash && row.previous_hash !== prevHash) {
        valid = false;
        brokenAt = row.id;
        break;
      }
      const payload = `${row.id}|${row.report_id || ''}|${row.official_id}|${row.action_type}|${row.old_value || ''}|${row.new_value || ''}|${row.reason || ''}|${row.timestamp}|${row.previous_hash || '0'.repeat(64)}`;
      const computedHash = crypto.createHash('sha256').update(payload).digest('hex');
      if (row.entry_hash && computedHash !== row.entry_hash) {
        valid = false;
        brokenAt = row.id;
        break;
      }
      if (row.entry_hash) {
        prevHash = row.entry_hash;
      }
    }
    callback(null, { valid, totalEntries: rows.length, brokenAt });
  });
}

module.exports = { recordAuditEntry, verifyAuditChain };
