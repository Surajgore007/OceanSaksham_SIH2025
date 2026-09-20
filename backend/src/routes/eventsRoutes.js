const express = require('express');
const router = express.Router();
const { addClient, getClientCount } = require('../services/sseService');

// GET /api/events - Real-time SSE event stream for Live Map and Official Dashboard
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial connection confirmation
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ status: 'connected', clients: getClientCount() + 1, timestamp: new Date().toISOString() })}\n\n`);

  addClient(res);
});

module.exports = router;
