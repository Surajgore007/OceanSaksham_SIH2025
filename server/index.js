/**
 * Pure Node.js Built-in HTTP Server for Twilio WhatsApp Webhook
 * ZERO EXTERNAL DEPENDENCIES
 * Exposes Webhook + REST API to sync WhatsApp reports directly with Official Console & Map!
 */

const http = require('http');
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

// Coastal Knowledge Base & Keywords
const COASTAL_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu', 'juhu beach'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova', 'versova beach'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'nariman point', 'chowpatty', 'mumbai'], lat: 18.9438, lng: 72.8233 },
  { name: 'Aksa Beach, Mumbai', keywords: ['aksa', 'aksa beach', 'malad'], lat: 19.1760, lng: 72.7950 },
  { name: 'Gateway of India, Mumbai', keywords: ['gateway', 'colaba'], lat: 18.9220, lng: 72.8347 },
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

function createReport(hazardType, locName, lat, lng, description, mediaUrl, from) {
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
    lat: lat,
    lng: lng,
    media: mediaUrl ? [{
      id: `wa_img_${Date.now()}`,
      url: mediaUrl,
      preview: mediaUrl,
      name: `whatsapp_${refId}.jpg`,
      type: 'image',
      geotagged: true
    }] : [],
    mediaFiles: mediaUrl ? [{ url: mediaUrl, preview: mediaUrl }] : [],
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
  console.log(`\n📢 [NEW WHATSAPP REPORT RECORDED]: Ref: ${refId} | Hazard: ${hazardType} | Location: ${locName} | Photo: ${mediaUrl ? 'Yes' : 'No'}`);
  return { report, refId };
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
  let replyText = '';

  // 1. Reset / Help
  if (lowerBody === 'reset' || lowerBody === 'clear' || lowerBody === 'cancel') {
    userSessions.delete(from);
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>🔄 *Session Reset*\n\nWelcome to *OceanSaksham Coastal Hazard Reporting*.\nSend *REPORT* or describe the hazard to begin.</Message>
</Response>`;
  }

  if (lowerBody === 'help' || lowerBody === 'info') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>🌊 *OceanSaksham WhatsApp Reporting Guide*\n\n1️⃣ *Fast Text:* Send _"High waves and flooding at Juhu beach"_\n2️⃣ *Interactive Menu:* Reply *REPORT*\n3️⃣ *GPS & Photo:* Send a photo + tap 📎 > *Location* > *Send Current Location*.\n\n📞 *Coast Guard Helpline:* 1078</Message>
</Response>`;
  }

  // 2. Priority Check: Is this a single full NLP text report or photo with location?
  const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
  const hasHazardKeyword = ['wave', 'waves', 'flood', 'flooding', 'surge', 'tsunami', 'erosion', 'sos', 'water', 'cyclone', 'sea'].some(k => lowerBody.includes(k));

  // If user sent a full description in ONE message (contains hazard info and/or photo/location)
  if (hasHazardKeyword || (mediaUrl && (matchedLoc || latitude || body.length > 5))) {
    const lat = latitude || matchedLoc?.lat || 19.0760;
    const lng = longitude || matchedLoc?.lng || 72.8777;
    const locName = payload.Address || matchedLoc?.name || (body.length > 3 ? body : `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    const hazardType = ['tsunami', 'flood', 'storm_surge', 'erosion', 'sos'].find(h => lowerBody.includes(h)) || 'high_waves';

    const { refId } = createReport(hazardType, locName, lat, lng, body || 'Photo report submitted', mediaUrl, from);
    userSessions.delete(from);

    replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                `📋 *Reference ID:* \`${refId}\`\n` +
                `⚠️ *Hazard:* ${hazardType.replace('_', ' ').toUpperCase()}\n` +
                `📍 *Location:* ${locName}\n` +
                `${mediaUrl ? '📸 *Evidence:* Photo Attached & Geotagged\n' : ''}\n` +
                `Disaster management and INCOIS Coastal Control have received your report.\n\n` +
                `📞 *Emergency Coast Guard:* 1078`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;
  }

  // 3. Conversational Guided Flow
  if (session.step === 'IDLE') {
    session.step = 'SELECT_HAZARD';
    userSessions.set(from, session);
    replyText = `🌊 *Welcome to OceanSaksham Coastal Reporting*\n` +
                `_National Ocean Information Services (INCOIS)_\n\n` +
                `Please reply with the hazard number:\n\n` +
                `1️⃣ 🌊 High Waves / Swell Surge\n` +
                `2️⃣ 🌧️ Coastal Flooding\n` +
                `3️⃣ 🌀 Storm Surge\n` +
                `4️⃣ 🚨 Tsunami Warning\n` +
                `5️⃣ 🏖️ Beach Erosion\n` +
                `6️⃣ 🆘 Emergency Distress (SOS)\n\n` +
                `_Or describe what you see in your own words._`;
  } else if (session.step === 'SELECT_HAZARD') {
    const hazardType = HAZARD_MAP[body] || 'high_waves';
    session.hazardType = hazardType;
    session.step = 'LOCATION';
    userSessions.set(from, session);

    replyText = `📍 *Step 2: Share Incident Location*\n\n` +
                `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
                `• Or reply with the coastal landmark (e.g. _"Juhu Beach, Mumbai"_)\n\n` +
                `Reply *RESET* to restart.`;
  } else if (session.step === 'LOCATION') {
    session.lat = latitude || 19.0760;
    session.lng = longitude || 72.8777;
    session.locName = payload.Address || body || 'Reported Coastal Location';
    session.step = 'PHOTO';
    userSessions.set(from, session);

    replyText = `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
                `Location: *${session.locName}*\n\n` +
                `Please send a live photo of the hazard, or reply *SKIP* to submit without photo.`;
  } else if (session.step === 'PHOTO') {
    const { refId } = createReport(
      session.hazardType || 'high_waves',
      session.locName,
      session.lat,
      session.lng,
      `Reported via WhatsApp: ${session.hazardType} at ${session.locName}`,
      mediaUrl,
      from
    );
    userSessions.delete(from);

    replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                `📋 *Reference ID:* \`${refId}\`\n` +
                `⚠️ *Hazard:* ${(session.hazardType || 'Hazard').toUpperCase().replace('_', ' ')}\n` +
                `📍 *Location:* ${session.locName}\n` +
                `${mediaUrl ? '📸 *Evidence:* Photo Attached & Geotagged\n' : ''}\n` +
                `Official Review Console and live rescue teams have been alerted.\n\n` +
                `📞 *Emergency Coast Guard:* 1078`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;
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

  // REST API endpoint to retrieve reports
  if (req.method === 'GET' && (url === '/api/reports' || url === '/api/whatsapp/reports' || url === '/reports')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(receivedReports));
    return;
  }

  // Health check
  if (req.method === 'GET' && (url === '/' || url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'active', 
      service: 'OceanSaksham Twilio WhatsApp Webhook',
      totalWhatsAppReports: receivedReports.length 
    }));
    return;
  }

  // Handle POST webhook
  if (req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => {
      rawBody += chunk.toString();
    });

    req.on('end', () => {
      let payload = {};
      try {
        if (rawBody.startsWith('{')) {
          payload = JSON.parse(rawBody);
        } else {
          payload = querystring.parse(rawBody);
        }
      } catch (err) {
        console.error('Error parsing body:', err);
      }

      console.log(`\n[Twilio Inbound] From: ${payload.From || 'Unknown'} | Body: "${payload.Body || ''}" | Media: ${payload.NumMedia || 0}`);

      const twiml = handleWebhook(payload);
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml);
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🌊 OceanSaksham Zero-Dependency Twilio WhatsApp Server`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Webhook URLs:`);
  console.log(`   - http://localhost:${PORT}/api/twilio/incoming-sms`);
  console.log(`   - http://localhost:${PORT}/api/whatsapp`);
  console.log(`📊 Reports Feed API: http://localhost:${PORT}/api/reports`);
  console.log(`\n👉 In another terminal run: ngrok http ${PORT}\n`);
});
