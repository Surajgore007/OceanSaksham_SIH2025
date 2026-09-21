/**
 * Unit Test for Cryptographic Hash-Chained Audit Logging & Tamper Detection
 */

const assert = require('assert');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Setup in-memory test database
const db = new sqlite3.Database(':memory:');

function initTestDb() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        report_id TEXT,
        official_id TEXT NOT NULL,
        official_name TEXT,
        action_type TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        previous_hash TEXT,
        entry_hash TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function recordTestAuditEntry({ reportId, officialId, officialName, actionType, oldValue, newValue, reason }) {
  return new Promise((resolve, reject) => {
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const timestamp = new Date().toISOString();

    db.get(`SELECT entry_hash FROM audit_logs ORDER BY rowid DESC LIMIT 1`, [], (err, lastRow) => {
      if (err) return reject(err);
      const previousHash = lastRow && lastRow.entry_hash ? lastRow.entry_hash : '0'.repeat(64);
      const payload = `${auditId}|${reportId || ''}|${officialId}|${actionType}|${oldValue || ''}|${newValue || ''}|${reason || ''}|${timestamp}|${previousHash}`;
      const entryHash = crypto.createHash('sha256').update(payload).digest('hex');

      db.run(
        `INSERT INTO audit_logs (id, report_id, official_id, official_name, action_type, old_value, new_value, reason, previous_hash, entry_hash, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [auditId, reportId, officialId, officialName, actionType, oldValue, newValue, reason, previousHash, entryHash, timestamp],
        function (insertErr) {
          if (insertErr) reject(insertErr);
          else resolve({ auditId, entryHash, previousHash });
        }
      );
    });
  });
}

function verifyTestAuditChain() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM audit_logs ORDER BY rowid ASC`, [], (err, rows) => {
      if (err) return reject(err);
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
      resolve({ valid, totalEntries: rows.length, brokenAt });
    });
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 Running Audit Log Cryptographic Integrity Unit Tests');
  console.log('='.repeat(60));

  await initTestDb();

  // Test 1: Empty chain is valid
  let res = await verifyTestAuditChain();
  assert.strictEqual(res.valid, true, 'Empty chain should be valid');
  assert.strictEqual(res.totalEntries, 0);
  console.log('✅ Test 1 Passed: Empty log verification');

  // Test 2: Sequential insertions create a valid hash chain
  const e1 = await recordTestAuditEntry({
    reportId: 'rep_101',
    officialId: 'usr_off1',
    officialName: 'Officer Alice',
    actionType: 'STATUS_UPDATE',
    oldValue: 'PENDING',
    newValue: 'VERIFIED',
    reason: 'Confirmed visual damage'
  });

  const e2 = await recordTestAuditEntry({
    reportId: 'rep_102',
    officialId: 'usr_off2',
    officialName: 'Officer Bob',
    actionType: 'SEVERITY_OVERRIDE',
    oldValue: 'Moderate',
    newValue: 'Severe',
    reason: 'Storm surge inundation rising'
  });

  const e3 = await recordTestAuditEntry({
    reportId: 'rep_103',
    officialId: 'usr_off1',
    officialName: 'Officer Alice',
    actionType: 'STATUS_UPDATE',
    oldValue: 'PENDING',
    newValue: 'REJECTED',
    reason: 'Duplicate of rep_102'
  });

  res = await verifyTestAuditChain();
  assert.strictEqual(res.valid, true, 'Chain with 3 entries should be valid');
  assert.strictEqual(res.totalEntries, 3);
  assert.strictEqual(e2.previousHash, e1.entryHash, 'e2 previousHash must link to e1 entryHash');
  assert.strictEqual(e3.previousHash, e2.entryHash, 'e3 previousHash must link to e2 entryHash');
  console.log('✅ Test 2 Passed: 3-entry sequential hash chaining verified');

  // Test 3: Tampering detection (modifying an old row)
  await new Promise((resolve, reject) => {
    db.run(`UPDATE audit_logs SET reason = 'TAMPERED REASON' WHERE id = ?`, [e1.auditId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  res = await verifyTestAuditChain();
  assert.strictEqual(res.valid, false, 'Tampered chain must be detected as invalid');
  assert.strictEqual(res.brokenAt, e1.auditId, 'Tamper must be detected at entry e1');
  console.log('✅ Test 3 Passed: Tamper detection identified modified entry at', res.brokenAt);

  console.log('='.repeat(60));
  console.log('🎉 All Audit Log Integrity Unit Tests Passed!');
  console.log('='.repeat(60));
  db.close();
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
