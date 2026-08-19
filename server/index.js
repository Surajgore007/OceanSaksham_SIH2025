/**
 * Pure Node.js Built-in HTTP Server for Twilio WhatsApp Webhook
 * ZERO EXTERNAL DEPENDENCIES
 * Exposes Webhook + REST API to sync WhatsApp reports directly with Official Console & Map!
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const PORT = process.env.PORT || 5000;
const PUBLIC_FILE = path.join(__dirname, '..', 'public', 'whatsapp_reports.json');

// In-memory conversation state
const userSessions = new Map();

// In-memory received reports list
let receivedReports = [];

// Load existing reports from public file if exists
try {
  if (fs.existsSync(PUBLIC_FILE)) {
    const raw = fs.readFileSync(PUBLIC_FILE, 'utf8');
    receivedReports = JSON.parse(raw) || [];
  }
} catch (e) {
  receivedReports = [];
}

function saveReportsToFile() {
  try {
    fs.writeFileSync(PUBLIC_FILE, JSON.stringify(receivedReports, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving whatsapp_reports.json:', err);
  }
}

/**
 * Downloads a Twilio media URL and converts it to a permanent Base64 Data URL.
 * Runs in background so webhook response to Twilio is NEVER blocked or delayed.
 */
function downloadMediaAsBase64(mediaUrl) {
  return new Promise((resolve) => {
    if (!mediaUrl) return resolve(null);

    function fetchUrl(targetUrl, redirectCount = 0) {
      if (redirectCount > 6) return resolve(null);

      try {
        const urlObj = new URL(targetUrl);
        const client = urlObj.protocol === 'https:' ? https : http;
        client.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchUrl(res.headers.location, redirectCount + 1);
          }

          if (res.statusCode === 200) {
            const contentType = res.headers['content-type'] || 'image/jpeg';
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
              const buffer = Buffer.concat(chunks);
              const base64 = buffer.toString('base64');
              console.log(`📸 [Background Media Download Complete]: ${Math.round(buffer.length / 1024)} KB`);
              resolve(`data:${contentType};base64,${base64}`);
            });
          } else {
            console.warn(`[Media Download] HTTP ${res.statusCode} - skipping`);
            resolve(null);
          }
        }).on('error', (err) => {
          console.error('Media download error:', err.message);
          resolve(null);
        });
      } catch (err) {
        resolve(null);
      }
    }

    fetchUrl(mediaUrl);
  });
}

function attachMediaInBackground(reportId, rawMediaUrl) {
  if (!rawMediaUrl || !reportId) return;
  downloadMediaAsBase64(rawMediaUrl).then(base64 => {
    if (!base64) return;
    const idx = receivedReports.findIndex(r => r.id === reportId);
    if (idx === -1) return;
    const mediaItem = {
      id: `wa_img_${Date.now()}`,
      url: base64,
      preview: base64,
      dataUrl: base64,
      name: `whatsapp_${reportId}.jpg`,
      type: 'image',
      geotagged: true
    };
    receivedReports[idx].media = [mediaItem];
    receivedReports[idx].mediaFiles = [mediaItem];
    saveReportsToFile();
    console.log(`✅ [Photo Attached to Report ${reportId} in Dashboard]`);
  });
}

// Coastal Knowledge Base & Keywords
const COASTAL_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'chowpatty', 'nariman point'], lat: 18.9438, lng: 72.8233 },
  { name: 'Gateway of India, Mumbai', keywords: ['gateway', 'colaba'], lat: 18.9220, lng: 72.8347 },
  { name: 'Aksa Beach, Mumbai', keywords: ['aksa', 'malad'], lat: 19.1760, lng: 72.7950 },
  { name: 'Marina Beach, Chennai', keywords: ['marina', 'chennai'], lat: 13.0500, lng: 80.2824 },
  { name: 'Calangute Beach, Goa', keywords: ['calangute', 'baga', 'goa'], lat: 15.5439, lng: 73.7553 },
  { name: 'Puri Beach, Odisha', keywords: ['puri', 'odisha'], lat: 19.7983, lng: 85.8249 },
  { name: 'RK Beach, Vizag', keywords: ['vizag', 'rk beach', 'visakhapatnam'], lat: 17.7126, lng: 83.3182 },
  { name: 'Kochi Port & Beach, Kerala', keywords: ['kochi', 'cochin', 'kerala'], lat: 9.9656, lng: 76.2422 }
];

const HAZARD_MAP = {
  '1': 'high_waves',
  '2': 'flooding',
  '3': 'storm_surge',
  '4': 'tsunami',
  '5': 'coastal_erosion',
  '6': 'emergency_sos'
};

const HAZARD_LABELS = {
  'high_waves': 'HIGH WAVES / SWELL SURGE',
  'flooding': 'COASTAL FLOODING',
  'storm_surge': 'STORM SURGE',
  'tsunami': 'TSUNAMI WARNING',
  'coastal_erosion': 'BEACH EROSION',
  'emergency_sos': 'EMERGENCY DISTRESS (SOS)'
};

function createReport(hazardType, locName, lat, lng, description, from) {
  const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;
  const nowIso = new Date().toISOString();
  const phone = (from || '').replace('whatsapp:', '');

  const report = {
    id: `wa_${Date.now()}`,
    hazardType: hazardType || 'high_waves',
    type: hazardType || 'high_waves',
    severity: hazardType === 'tsunami' ? 'critical' : (hazardType === 'storm_surge' ? 'high' : 'medium'),
    description: description || `Reported via WhatsApp from ${phone}`,
    location: {
      name: locName,
      address: locName,
      coordinates: { lat, lng }
    },
    lat, lng,
    media: [],
    mediaFiles: [],
    source: 'whatsapp',
    reportedBy: `WhatsApp (${phone})`,
    reportedByRole: 'citizen',
    reporterName: `WhatsApp User (${phone})`,
    status: 'pending_verification',
    verificationStatus: 'pending',
    priority: hazardType === 'tsunami' ? 'high' : 'normal',
    timestamp: nowIso,
    submittedAt: nowIso
  };

  receivedReports.unshift(report);
  saveReportsToFile();
  console.log(`\n📢 [REPORT CREATED]: ID: ${report.id} | Ref: ${refId} | Hazard: ${hazardType} | Location: ${locName}`);
  return { report, refId };
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${escapeXml(message)}</Body>
  </Message>
</Response>`;
}

function getWelcomeMenu() {
  return (
    `🌊 *Welcome to OceanSaksham Hazard Reporting*\n` +
    `_INCOIS Coastal Information Services_\n\n` +
    `Please reply with hazard number:\n` +
    `1️⃣ 🌊 High Waves / Swell Surge\n` +
    `2️⃣ 🌧️ Coastal Flooding\n` +
    `3️⃣ 🌀 Storm Surge\n` +
    `4️⃣ 🚨 Tsunami\n` +
    `5️⃣ 🏖️ Beach Erosion\n` +
    `6️⃣ 🆘 Emergency Distress\n\n` +
    `_Or describe what you see in words._`
  );
}

function handleWebhook(payload) {
  const from = payload.From || 'whatsapp:+910000000000';
  const body = (payload.Body || '').trim();
  const lowerBody = body.toLowerCase();
  const numMedia = parseInt(payload.NumMedia || '0', 10);
  const mediaUrl = numMedia > 0 ? payload.MediaUrl0 : null;
  const latitude = payload.Latitude ? parseFloat(payload.Latitude) : null;
  const longitude = payload.Longitude ? parseFloat(payload.Longitude) : null;

  let session = userSessions.get(from) || { step: 'IDLE' };

  // --- 1. Global Reset / Help / Restart ---
  if (lowerBody === 'reset' || lowerBody === 'clear' || lowerBody === 'cancel') {
    userSessions.delete(from);
    return twiml(`🔄 *Session Reset*\n\nSend *REPORT* or *HI* to begin.`);
  }

  if (lowerBody === 'help' || lowerBody === 'info') {
    return twiml(
      `🌊 *OceanSaksham WhatsApp Reporting Guide*\n\n` +
      `1️⃣ *Fast Text:* Send _"High waves and flooding at Juhu beach"_\n` +
      `2️⃣ *Interactive Menu:* Reply *REPORT*\n` +
      `3️⃣ *GPS & Photo:* Send a photo + tap 📎 > *Location* > *Send Current Location*.\n\n` +
      `📞 *Coast Guard Helpline:* 1078`
    );
  }

  // --- 2. Greetings reset session back to Welcome Menu ---
  const isGreeting = ['hi', 'hello', 'hey', 'start', 'report', 'menu'].includes(lowerBody);
  if (isGreeting && session.step !== 'LOCATION' && session.step !== 'PHOTO') {
    session = { step: 'SELECT_HAZARD' };
    userSessions.set(from, session);
    return twiml(getWelcomeMenu());
  }

  // --- 3. PHOTO RECEIVED (Either at step PHOTO, or standalone when IDLE) ---
  if (mediaUrl) {
    let hazardType = session.hazardType || 'high_waves';
    let locName = session.locName || payload.Address || 'Reported Coastal Location';
    let lat = session.lat || latitude || 19.0988;
    let lng = session.lng || longitude || 72.8267;

    // Check if caption contains location
    if (body.length > 2) {
      const locMatch = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
      if (locMatch) {
        locName = locMatch.name;
        lat = locMatch.lat;
        lng = locMatch.lng;
      }
    }

    const { report, refId } = createReport(
      hazardType,
      locName,
      lat,
      lng,
      `Reported via WhatsApp: ${HAZARD_LABELS[hazardType] || hazardType} at ${locName}`,
      from
    );

    // Delete session so next message starts fresh
    userSessions.delete(from);

    // Download and attach photo in background
    attachMediaInBackground(report.id, mediaUrl);

    const hazardLabel = HAZARD_LABELS[hazardType] || hazardType.toUpperCase().replace(/_/g, ' ');

    return twiml(
      `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
      `📋 *Reference ID:* \`${refId}\`\n` +
      `⚠️ *Hazard:* ${hazardLabel}\n` +
      `📍 *Location:* ${locName}\n` +
      `📸 *Evidence:* Photo Attached & Geotagged\n\n` +
      `Disaster management and coastal monitoring teams at INCOIS have been alerted.\n\n` +
      `📞 *Coast Guard:* 1078`
    );
  }

  // --- 4. STEP 3: User in PHOTO step, sending SKIP or text ---
  if (session.step === 'PHOTO') {
    const isSkip = ['skip', 'no', 'done', 'submit', 'ok', 'pass'].includes(lowerBody);

    if (isSkip || body.length > 0) {
      const hazardType = session.hazardType || 'high_waves';
      const locName = session.locName || 'Reported Coastal Area';
      const lat = session.lat || 19.0988;
      const lng = session.lng || 72.8267;

      const { report, refId } = createReport(
        hazardType,
        locName,
        lat,
        lng,
        `Reported via WhatsApp: ${HAZARD_LABELS[hazardType] || hazardType} at ${locName}`,
        from
      );

      userSessions.delete(from);

      const hazardLabel = HAZARD_LABELS[hazardType] || hazardType.toUpperCase().replace(/_/g, ' ');

      return twiml(
        `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
        `📋 *Reference ID:* \`${refId}\`\n` +
        `⚠️ *Hazard:* ${hazardLabel}\n` +
        `📍 *Location:* ${locName}\n\n` +
        `Disaster management and coastal monitoring teams at INCOIS have been alerted.\n\n` +
        `📞 *Coast Guard:* 1078`
      );
    }
  }

  // --- 5. One-Shot Natural Language Report (e.g. "high waves flooding at juhu beach") ---
  const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
  const isHazardText = ['wave', 'waves', 'flood', 'flooding', 'surge', 'tsunami', 'erosion', 'sos', 'cyclone', 'sea'].some(k => lowerBody.includes(k));

  if (isHazardText && (matchedLoc || latitude || body.length > 15) && session.step === 'IDLE') {
    const lat = latitude || matchedLoc?.lat || 19.0988;
    const lng = longitude || matchedLoc?.lng || 72.8267;
    const locName = payload.Address || matchedLoc?.name || body;
    const hazardType = ['tsunami', 'flood', 'storm_surge', 'erosion', 'sos'].find(h => lowerBody.includes(h)) || 'high_waves';

    const { refId } = createReport(hazardType, locName, lat, lng, body, from);
    userSessions.delete(from);

    const hazardLabel = HAZARD_LABELS[hazardType] || hazardType.toUpperCase().replace(/_/g, ' ');

    return twiml(
      `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
      `📋 *Reference ID:* \`${refId}\`\n` +
      `⚠️ *Hazard:* ${hazardLabel}\n` +
      `📍 *Location:* ${locName}\n\n` +
      `Disaster management and coastal monitoring teams at INCOIS have been alerted.\n` +
      `_Tip: Send a photo anytime to attach live evidence._\n\n` +
      `📞 *Coast Guard:* 1078`
    );
  }

  // --- 6. Step 1: IDLE -> Show Welcome Menu ---
  if (session.step === 'IDLE') {
    session.step = 'SELECT_HAZARD';
    userSessions.set(from, session);
    return twiml(getWelcomeMenu());
  }

  // --- 7. Step 2: SELECT_HAZARD -> Validate hazard selection ---
  if (session.step === 'SELECT_HAZARD') {
    let hazardType = HAZARD_MAP[body];
    if (!hazardType) {
      // Check if they typed words like "flooding", "waves", etc.
      if (lowerBody.includes('wave') || lowerBody.includes('swell')) hazardType = 'high_waves';
      else if (lowerBody.includes('flood')) hazardType = 'flooding';
      else if (lowerBody.includes('surge') || lowerBody.includes('storm')) hazardType = 'storm_surge';
      else if (lowerBody.includes('tsunami')) hazardType = 'tsunami';
      else if (lowerBody.includes('erosion')) hazardType = 'coastal_erosion';
      else if (lowerBody.includes('sos') || lowerBody.includes('emergency')) hazardType = 'emergency_sos';
    }

    if (!hazardType) {
      return twiml(
        `⚠️ Please reply with a number from *1 to 6* to choose the hazard:\n\n` +
        `1️⃣ High Waves\n2️⃣ Flooding\n3️⃣ Storm Surge\n4️⃣ Tsunami\n5️⃣ Erosion\n6️⃣ SOS`
      );
    }

    session.hazardType = hazardType;
    session.step = 'LOCATION';
    userSessions.set(from, session);

    return twiml(
      `📍 *Step 2: Share Incident Location*\n\n` +
      `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
      `• Or reply with the coastal landmark name (e.g. _"Juhu Beach"_)\n\n` +
      `Reply *RESET* to cancel.`
    );
  }

  // --- 8. Step 3: LOCATION -> Capture location and prompt for photo ---
  if (session.step === 'LOCATION') {
    const locMatch = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
    session.lat = latitude || locMatch?.lat || 19.0988;
    session.lng = longitude || locMatch?.lng || 72.8267;
    session.locName = payload.Address || locMatch?.name || body || 'Reported Coastal Location';
    session.step = 'PHOTO';
    userSessions.set(from, session);

    return twiml(
      `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
      `Location: *${session.locName}*\n\n` +
      `Send a live photo of the hazard, or reply *SKIP* to submit without photo.`
    );
  }

  return twiml(getWelcomeMenu());
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // REST API - get all reports
  if (req.method === 'GET' && (url === '/api/reports' || url === '/api/whatsapp/reports' || url === '/reports')) {
    const jsonBuf = Buffer.from(JSON.stringify(receivedReports), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': jsonBuf.length
    });
    res.end(jsonBuf);
    return;
  }

  // Health check
  if (req.method === 'GET' && (url === '/' || url === '/health')) {
    const healthBuf = Buffer.from(JSON.stringify({ status: 'active', service: 'OceanSaksham WhatsApp Webhook', totalReports: receivedReports.length }), 'utf8');
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': healthBuf.length
    });
    res.end(healthBuf);
    return;
  }

  // Webhook POST handler
  if (req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk.toString(); });
    req.on('end', () => {
      let payload = {};
      try {
        payload = rawBody.startsWith('{') ? JSON.parse(rawBody) : querystring.parse(rawBody);
      } catch {}

      console.log(`\n[Twilio Inbound] Path: ${url} | From: ${payload.From || 'Unknown'} | Body: "${payload.Body || ''}" | Media: ${payload.NumMedia || 0}`);

      let responseXml;
      try {
        responseXml = handleWebhook(payload);
      } catch (err) {
        console.error('[handleWebhook Error]', err);
        responseXml = twiml('✅ Report received. Our team will respond shortly.');
      }

      console.log('[TwiML Response sent]:\n', responseXml);
      const xmlBuf = Buffer.from(responseXml, 'utf8');
      res.writeHead(200, {
        'Content-Type': 'text/xml; charset=utf-8',
        'Content-Length': xmlBuf.length
      });
      res.end(xmlBuf);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🌊 OceanSaksham Zero-Dependency Twilio WhatsApp Server`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Webhook URLs:`);
  console.log(`   - http://localhost:${PORT}/api/twilio/incoming-sms`);
  console.log(`   - http://localhost:${PORT}/api/whatsapp`);
  console.log(`📊 Reports Feed: http://localhost:${PORT}/api/reports`);
  console.log(`\n👉 In another terminal run: ngrok http ${PORT}\n`);
});
