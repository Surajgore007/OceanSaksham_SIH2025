const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'oceansaksham.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        phone TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT CHECK(role IN ('citizen', 'official')) NOT NULL DEFAULT 'citizen',
        reputation_score REAL DEFAULT 0.5,
        total_reports INTEGER DEFAULT 0,
        verified_reports INTEGER DEFAULT 0,
        rejected_reports INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reports table with raw fields for the ML credibility model
    db.run(`
      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT,
        hazard_type TEXT NOT NULL,
        severity TEXT CHECK(severity IN ('Low', 'Moderate', 'High', 'Severe')) NOT NULL,
        description TEXT,
        text_lang TEXT DEFAULT 'en',
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        address TEXT,
        gps_accuracy REAL DEFAULT 10.0,
        device_timestamp DATETIME,
        server_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        exif_lat REAL,
        exif_lng REAL,
        exif_valid INTEGER DEFAULT 0,
        media_url TEXT,
        media_hash TEXT,
        status TEXT CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'RESOLVED')) DEFAULT 'PENDING',
        credibility_score REAL DEFAULT 0.5,
        credibility_reasons TEXT,
        is_duplicate INTEGER DEFAULT 0,
        duplicate_of TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id)
      )
    `);

    // Cryptographically hash-chained audit logs for official overrides
    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
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
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports(id),
        FOREIGN KEY (official_id) REFERENCES users(id)
      )
    `);

    // SOS Alerts state machine table
    db.run(`
      CREATE TABLE IF NOT EXISTS sos_alerts (
        id TEXT PRIMARY KEY,
        reporter_id TEXT,
        reporter_name TEXT,
        reporter_phone TEXT,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        accuracy REAL DEFAULT 15.0,
        status TEXT CHECK(status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')) DEFAULT 'ACTIVE',
        source TEXT DEFAULT 'GPS',
        acknowledged_at DATETIME,
        acknowledged_by TEXT,
        resolved_at DATETIME,
        resolved_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id)
      )
    `);

    // Hotspot danger zones
    db.run(`
      CREATE TABLE IF NOT EXISTS hotspots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius_km REAL DEFAULT 5.0,
        severity TEXT DEFAULT 'High',
        status TEXT CHECK(status IN ('ACTIVE', 'RESOLVED')) DEFAULT 'ACTIVE',
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for spatial and temporal queries
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_spatial ON reports (latitude, longitude)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_reports_created ON reports (created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_sos_status ON sos_alerts (status)`);
  });
}

initDatabase();

module.exports = db;
