const bcrypt = require('bcryptjs');
const db = require('./schema');

function seedDatabase() {
  console.log('🌱 Seeding OceanSaksham database...');

  const password_hash = bcrypt.hashSync('official123', 10);
  const citizen_hash = bcrypt.hashSync('citizen123', 10);

  // Seed default official and citizen accounts
  const users = [
    {
      id: 'usr_official_1',
      name: 'Dr. R. K. Nair (INCOIS Official)',
      email: 'official@oceansaksham.gov.in',
      phone: '9876543211',
      password_hash,
      role: 'official',
      reputation_score: 0.95
    },
    {
      id: 'usr_citizen_1',
      name: 'Ramesh K. Patel (Coastal Fisherman)',
      email: 'citizen@oceansaksham.gov.in',
      phone: '9876543210',
      password_hash: citizen_hash,
      role: 'citizen',
      reputation_score: 0.85
    }
  ];

  users.forEach(user => {
    db.run(
      `INSERT OR REPLACE INTO users (id, name, email, phone, password_hash, role, reputation_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.phone, user.password_hash, user.role, user.reputation_score]
    );
  });

  // Seed baseline hotspots
  const hotspots = [
    {
      id: 'hot_1',
      name: 'Versova Beach High Wave Alert Zone',
      hazard_type: 'high-waves',
      latitude: 19.1314,
      longitude: 72.8152,
      radius_km: 6.0,
      severity: 'High',
      created_by: 'INCOIS Official'
    },
    {
      id: 'hot_2',
      name: 'Marina Beach Tidal Surge Zone',
      hazard_type: 'storm-surge',
      latitude: 13.0475,
      longitude: 80.2824,
      radius_km: 8.0,
      severity: 'Severe',
      created_by: 'INCOIS Official'
    }
  ];

  hotspots.forEach(hot => {
    db.run(
      `INSERT OR REPLACE INTO hotspots (id, name, hazard_type, latitude, longitude, radius_km, severity, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [hot.id, hot.name, hot.hazard_type, hot.latitude, hot.longitude, hot.radius_km, hot.severity, hot.created_by]
    );
  });

  console.log('✅ Seed completed successfully!');
}

setTimeout(seedDatabase, 1000);
