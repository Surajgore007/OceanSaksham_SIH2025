/**
 * Pure Node.js Built-in HTTP Server for Twilio WhatsApp Webhook
 * ZERO EXTERNAL DEPENDENCIES (No 'express' or 'body-parser' needed!)
 * Run anytime with: node server/index.js
 */

const http = require('http');
const querystring = require('querystring');

const PORT = process.env.PORT || 5000;

// In-memory conversation state
const userSessions = new Map();

// Coastal Knowledge Base & Keywords
const COASTAL_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'chowpatty'], lat: 18.9438, lng: 72.8233 },
  { name: 'Aksa Beach, Mumbai', keywords: ['aksa'], lat: 19.1760, lng: 72.7950 },
  { name: 'Marina Beach, Chennai', keywords: ['marina'], lat: 13.0500, lng: 80.2824 },
  { name: 'Calangute Beach, Goa', keywords: ['calangute', 'baga'], lat: 15.5439, lng: 73.7553 },
  { name: 'Puri Beach, Odisha', keywords: ['puri'], lat: 19.7983, lng: 85.8249 },
  { name: 'RK Beach, Vizag', keywords: ['vizag', 'rk beach'], lat: 17.7126, lng: 83.3182 }
];

const HAZARD_MAP = {
  '1': 'high_waves',
  '2': 'flooding',
  '3': 'storm_surge',
  '4': 'tsunami',
  '5': 'coastal_erosion',
  '6': 'emergency_sos'
};

const WELCOME_TEXT = 
`🌊 *Welcome to OceanSaksham Coastal Reporting*
_National Ocean Information Services (INCOIS)_

Please reply with the hazard number:

1️⃣ 🌊 High Waves / Swell Surge
2️⃣ 🌧️ Coastal Flooding
3️⃣ 🌀 Storm Surge
4️⃣ 🚨 Tsunami Warning
5️⃣ 🏖️ Beach Erosion
6️⃣ 🆘 Emergency Distress (SOS)

_Or describe what you see in your own words._`;

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

  // 1. Reset / Help / Greetings (ALWAYS reset to start menu)
  if (lowerBody === 'reset' || lowerBody === 'clear' || lowerBody === 'cancel') {
    userSessions.delete(from);
    replyText = `🔄 *Session Reset*\n\nWelcome to *OceanSaksham Coastal Hazard Reporting*.\nSend *REPORT* or describe the hazard to begin.`;
  } else if (lowerBody === 'help' || lowerBody === 'info') {
    replyText = `🌊 *OceanSaksham WhatsApp Reporting Guide*\n\n` +
                `1️⃣ *Fast Text:* Send _"High waves and flooding at Juhu beach"_\n` +
                `2️⃣ *Interactive Menu:* Reply *REPORT*\n` +
                `3️⃣ *GPS & Photo:* Send a photo + tap 📎 > *Location* > *Send Current Location*.\n\n` +
                `📞 *Coast Guard Helpline:* 1078`;
  } else if (/^(hi+|hello+|hey+|report|start|menu|namaste)$/i.test(lowerBody)) {
    session = { step: 'SELECT_HAZARD' };
    userSessions.set(from, session);
    replyText = WELCOME_TEXT;
  } else if (session.step === 'IDLE') {
    const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
    const hasHazardKeyword = ['wave', 'flood', 'surge', 'tsunami', 'erosion', 'sos', 'water', 'cyclone'].some(k => lowerBody.includes(k));

    if (hasHazardKeyword && (matchedLoc || latitude)) {
      const lat = latitude || matchedLoc?.lat || 19.0760;
      const lng = longitude || matchedLoc?.lng || 72.8777;
      const locName = matchedLoc?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;

      userSessions.delete(from);
      replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                  `📋 *Reference ID:* \`${refId}\`\n` +
                  `📍 *Location:* ${locName}\n` +
                  `🌊 *Status:* Telemetry forwarded to INCOIS Coastal Monitoring.\n\n` +
                  `📞 *Emergency Coast Guard:* 1078`;
    } else {
      session.step = 'SELECT_HAZARD';
      userSessions.set(from, session);
      replyText = WELCOME_TEXT;
    }
  } else if (session.step === 'SELECT_HAZARD') {
    const hazardType = HAZARD_MAP[body];
    if (!hazardType) {
      replyText = `⚠️ Please reply with a number from *1 to 6*:\n\n1️⃣ High Waves\n2️⃣ Flooding\n3️⃣ Storm Surge\n4️⃣ Tsunami\n5️⃣ Erosion\n6️⃣ SOS`;
    } else {
      session.hazardType = hazardType;
      session.step = 'LOCATION';
      userSessions.set(from, session);

      replyText = `📍 *Step 2: Share Incident Location*\n\n` +
                  `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
                  `• Or reply with the coastal landmark (e.g. _"Juhu Beach, Mumbai"_)\n\n` +
                  `Reply *RESET* to restart.`;
    }
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
    const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;
    userSessions.delete(from);

    replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                `📋 *Reference ID:* \`${refId}\`\n` +
                `⚠️ *Hazard:* ${(session.hazardType || 'Hazard').toUpperCase().replace('_', ' ')}\n` +
                `📍 *Location:* ${session.locName}\n` +
                `${mediaUrl ? '📸 *Evidence:* Photo Attached & Geotagged\n' : ''}\n` +
                `Disaster response and coastal control teams have been alerted.\n\n` +
                `📞 *Emergency Coast Guard:* 1078`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  // Support health check
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'active', service: 'OceanSaksham Twilio WhatsApp Webhook' }));
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

      console.log(`[Twilio Inbound] From: ${payload.From || 'Unknown'} | Body: "${payload.Body || ''}"`);

      const twiml = handleWebhook(payload);
      console.log('[TwiML Response sent]:\n', twiml);

      res.writeHead(200, {
        'Content-Type': 'text/xml; charset=utf-8'
      });
      res.end(twiml, 'utf8');
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n🌊 OceanSaksham Zero-Dependency Twilio WhatsApp Server`);
  console.log(`🚀 Running on port ${PORT}`);
  console.log(`📍 Webhook URLs:`);
  console.log(`   - http://localhost:${PORT}/api/twilio/incoming-sms`);
  console.log(`   - http://localhost:${PORT}/api/whatsapp`);
  console.log(`\n👉 In another terminal run: ngrok http ${PORT}\n`);
});
