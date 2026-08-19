/**
 * Pure Node.js Built-in HTTP Server for Twilio WhatsApp Webhook
 * ZERO EXTERNAL DEPENDENCIES
 * Exposes Webhook + REST API to sync WhatsApp reports directly with Official Console & Map!
 *
 * KEY DESIGN: Respond to Twilio IMMEDIATELY (within 15s timeout), then download
 * media in the background. This ensures the user always gets a confirmation message.
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
 * Called in the BACKGROUND after responding to Twilio - no timeout risk.
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
            console.warn(`[Media Download] HTTP ${res.statusCode} - skipping background fetch`);
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

/**
 * After responding to Twilio, downloads the photo in the background and
 * patches the report with the real base64 image.
 */
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
    console.log(`✅ [Photo Attached to Report ${reportId}]`);
  });
}

// Coastal Knowledge Base & Keywords
const COASTAL_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu', 'juhu beach'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova', 'versova beach'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'nariman point', 'chowpatty', 'mumbai'], lat: 18.9438, lng: 72.8233 },
  { name: 'Gateway of India, Mumbai', keywords: ['gateway', 'gateway of india', 'colaba'], lat: 18.9220, lng: 72.8347 },
  { name: 'Aksa Beach, Mumbai', keywords: ['aksa', 'aksa beach', 'malad'], lat: 19.1760, lng: 72.7950 },
  { name: 'Marina Beach, Chennai', keywords: ['marina', 'marina beach', 'chennai'], lat: 13.0500, lng: 80.2824 },
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

/**
 * Creates a report SYNCHRONOUSLY (no media download), saves immediately.
 * Media is attached later via attachMediaInBackground().
 */
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

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
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

  // --- Reset / Help ---
  if (lowerBody === 'reset' || lowerBody === 'clear' || lowerBody === 'cancel') {
    userSessions.delete(from);
    return twiml(`🔄 *Session Reset*\n\nWelcome to *OceanSaksham Coastal Hazard Reporting*.\nSend *REPORT* or describe what you see to begin.`);
  }

  if (lowerBody === 'help' || lowerBody === 'info') {
    return twiml(`🌊 *OceanSaksham WhatsApp Reporting Guide*\n\n1️⃣ *Fast Text:* Send _"High waves and flooding at Juhu beach"_\n2️⃣ *Interactive Menu:* Reply *REPORT*\n3️⃣ *GPS & Photo:* Send a photo + tap 📎 > *Location* > *Send Current Location*.\n\n📞 *Coast Guard Helpline:* 1078`);
  }

  // --- STEP 3: User in guided flow, sending photo (or SKIP) ---
  if (session.step === 'PHOTO') {
    const hazardType = session.hazardType || 'high_waves';
    const locName = session.locName || 'Coastal Area';
    const lat = session.lat || 19.0988;
    const lng = session.lng || 72.8267;
    const description = lowerBody === 'skip'
      ? `Reported via WhatsApp: ${hazardType} at ${locName}`
      : `Reported via WhatsApp: ${hazardType} at ${locName}`;

    const { report, refId } = createReport(hazardType, locName, lat, lng, description, from);
    userSessions.delete(from);

    // Download media in background AFTER responding
    if (mediaUrl) attachMediaInBackground(report.id, mediaUrl);

    return twiml(
      `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
      `📋 *Reference ID:* \`${refId}\`\n` +
      `⚠️ *Hazard:* ${hazardType.toUpperCase().replace(/_/g, ' ')}\n` +
      `📍 *Location:* ${locName}\n` +
      `${mediaUrl ? '📸 *Evidence:* Photo received & being processed\n' : ''}\n` +
      `Official Review Console and INCOIS disaster teams have received your report.\n\n` +
      `📞 *Emergency Coast Guard:* 1078`
    );
  }

  // --- Standalone photo when IDLE ---
  if (mediaUrl && session.step === 'IDLE') {
    const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
    const lat = latitude || matchedLoc?.lat || 19.0988;
    const lng = longitude || matchedLoc?.lng || 72.8267;
    const locName = payload.Address || matchedLoc?.name || (body.length > 2 ? body : 'Coastal Area');
    const hazardType = ['tsunami', 'flood', 'storm_surge', 'erosion', 'sos'].find(h => lowerBody.includes(h)) || 'high_waves';

    const { report, refId } = createReport(hazardType, locName, lat, lng, body || 'Live photo coastal hazard report', from);
    userSessions.delete(from);

    // Download media in background AFTER responding
    attachMediaInBackground(report.id, mediaUrl);

    return twiml(
      `✅ *Photo Hazard Report Received & Dispatched!*\n\n` +
      `📋 *Reference ID:* \`${refId}\`\n` +
      `⚠️ *Hazard:* ${hazardType.replace(/_/g, ' ').toUpperCase()}\n` +
      `📍 *Location:* ${locName}\n` +
      `📸 *Evidence:* Photo received & being processed\n\n` +
      `Disaster management authorities can now review your report in the Official Console.\n\n` +
      `📞 *Coast Guard Distress Helpline:* 1078`
    );
  }

  // --- One-Shot Natural Language Report ---
  const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
  const hasHazardKeyword = ['wave', 'waves', 'flood', 'flooding', 'surge', 'tsunami', 'erosion', 'sos', 'water', 'cyclone', 'sea'].some(k => lowerBody.includes(k));

  if (hasHazardKeyword) {
    const lat = latitude || matchedLoc?.lat || 19.0988;
    const lng = longitude || matchedLoc?.lng || 72.8267;
    const locName = payload.Address || matchedLoc?.name || (body.length > 3 ? body : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    const hazardType = ['tsunami', 'flood', 'storm_surge', 'erosion', 'sos'].find(h => lowerBody.includes(h)) || 'high_waves';

    const { refId } = createReport(hazardType, locName, lat, lng, body, from);
    userSessions.delete(from);

    return twiml(
      `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
      `📋 *Reference ID:* \`${refId}\`\n` +
      `⚠️ *Hazard:* ${hazardType.replace(/_/g, ' ').toUpperCase()}\n` +
      `📍 *Location:* ${locName}\n\n` +
      `Disaster management and INCOIS Coastal Control have received your report.\n` +
      `_Tip: Send a photo anytime to attach live evidence._\n\n` +
      `📞 *Emergency Coast Guard:* 1078`
    );
  }

  // --- Conversational Step-by-Step Guided Flow ---
  if (session.step === 'IDLE') {
    session.step = 'SELECT_HAZARD';
    userSessions.set(from, session);
    return twiml(
      `🌊 *Welcome to OceanSaksham Coastal Reporting*\n` +
      `_National Ocean Information Services (INCOIS)_\n\n` +
      `Please reply with the hazard number:\n\n` +
      `1️⃣ 🌊 High Waves / Swell Surge\n` +
      `2️⃣ 🌧️ Coastal Flooding\n` +
      `3️⃣ 🌀 Storm Surge\n` +
      `4️⃣ 🚨 Tsunami Warning\n` +
      `5️⃣ 🏖️ Beach Erosion\n` +
      `6️⃣ 🆘 Emergency Distress (SOS)\n\n` +
      `_Or describe what you see in your own words._`
    );
  }

  if (session.step === 'SELECT_HAZARD') {
    const hazardType = HAZARD_MAP[body] || 'high_waves';
    session.hazardType = hazardType;
    session.step = 'LOCATION';
    userSessions.set(from, session);
    return twiml(
      `📍 *Step 2: Share Incident Location*\n\n` +
      `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
      `• Or reply with the coastal landmark (e.g. _"Juhu Beach, Mumbai"_)\n\n` +
      `Reply *RESET* to restart.`
    );
  }

  if (session.step === 'LOCATION') {
    const locMatch = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
    session.lat = latitude || locMatch?.lat || 19.0988;
    session.lng = longitude || locMatch?.lng || 72.8267;
    session.locName = payload.Address || locMatch?.name || body || 'Coastal Area';
    session.step = 'PHOTO';
    userSessions.set(from, session);
    return twiml(
      `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
      `Location: *${session.locName}*\n\n` +
      `Please send a live photo of the hazard, or reply *SKIP* to submit without photo.`
    );
  }

  return twiml(`🌊 Welcome to *OceanSaksham*. Send *REPORT* to begin, or describe the hazard.`);
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(receivedReports));
    return;
  }

  // Health check
  if (req.method === 'GET' && (url === '/' || url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'active', service: 'OceanSaksham WhatsApp Webhook', totalReports: receivedReports.length }));
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

      console.log(`\n[Twilio Inbound] From: ${payload.From || 'Unknown'} | Body: "${payload.Body || ''}" | Media: ${payload.NumMedia || 0}`);

      // handleWebhook is now SYNCHRONOUS — responds to Twilio instantly
      const responseXml = handleWebhook(payload);
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(responseXml);
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
