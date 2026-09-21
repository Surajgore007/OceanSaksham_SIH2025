const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');
const sosRoutes = require('./routes/sosRoutes');
const auditRoutes = require('./routes/auditRoutes');
const hotspotRoutes = require('./routes/hotspotRoutes');
const eventsRoutes = require('./routes/eventsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiter on submission and auth to prevent spamming
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  skip: (req) => process.env.NODE_ENV === 'test' || (process.env.BENCHMARK_MODE === 'true' && req.headers['x-benchmark-bypass'] === 'true'),
  message: { error: 'Too many requests from this IP, please try again after a minute.' }
});

app.use('/api/reports', submissionLimiter);
app.use('/api/auth', submissionLimiter);

// Route mountings
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/events', eventsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'OceanSaksham API & Triage Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🌊 OceanSaksham Backend running on http://localhost:${PORT}`);
  console.log(`🛰️ SSE event stream available at http://localhost:${PORT}/api/events`);
});
