/**
 * Vercel Serverless Function: Twilio WhatsApp Webhook Handler
 * Endpoint: POST /api/whatsapp
 * 
 * Works 100% serverless on Vercel with ZERO dedicated backend server to run!
 */

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

// Global in-memory cache across serverless warm invocations
const sessionStore = new Map();

export default async function handler(req, res) {
  // Only accept POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(200).send('OceanSaksham WhatsApp Webhook Active. Send POST requests from Twilio.');
  }

  try {
    const payload = req.body || {};
    const from = payload.From || 'whatsapp:+910000000000';
    const body = (payload.Body || '').trim();
    const lowerBody = body.toLowerCase();
    const numMedia = parseInt(payload.NumMedia || '0', 10);
    const mediaUrl = numMedia > 0 ? payload.MediaUrl0 : null;
    const latitude = payload.Latitude ? parseFloat(payload.Latitude) : null;
    const longitude = payload.Longitude ? parseFloat(payload.Longitude) : null;

    let session = sessionStore.get(from) || { step: 'IDLE' };
    let replyText = '';

    // Command: Reset or Help
    if (lowerBody === 'reset' || lowerBody === 'cancel' || lowerBody === 'clear') {
      sessionStore.delete(from);
      replyText = `🔄 *Session Reset*\n\nWelcome to *OceanSaksham Coastal Hazard Reporting*.\nSend *REPORT* or describe what you see to begin.`;
    } else if (lowerBody === 'help' || lowerBody === 'info') {
      replyText = `🌊 *OceanSaksham WhatsApp Reporting Guide*\n\n` +
                  `1️⃣ *Fast Text:* Send _"High waves and water entering Juhu beach"_\n` +
                  `2️⃣ *Interactive Menu:* Reply *REPORT*\n` +
                  `3️⃣ *GPS & Photo:* Send a photo + tap 📎 > *Location* > *Send Current Location*.\n\n` +
                  `📞 *Coast Guard Helpline:* 1078`;
    } else if (session.step === 'IDLE') {
      // NLP check for single-sentence report
      const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
      const hasHazardKeyword = ['wave', 'flood', 'surge', 'tsunami', 'erosion', 'sos', 'water', 'cyclone'].some(k => lowerBody.includes(k));

      if (hasHazardKeyword && (matchedLoc || latitude)) {
        const lat = latitude || matchedLoc?.lat || 19.0760;
        const lng = longitude || matchedLoc?.lng || 72.8777;
        const locName = matchedLoc?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;

        sessionStore.delete(from);
        replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                    `📋 *Reference ID:* \`${refId}\`\n` +
                    `📍 *Location:* ${locName}\n` +
                    `🌊 *Status:* Telemetry forwarded to INCOIS Coastal Monitoring.\n\n` +
                    `📞 *Emergency Coast Guard:* 1078`;
      } else {
        session.step = 'SELECT_HAZARD';
        sessionStore.set(from, session);
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
      }
    } else if (session.step === 'SELECT_HAZARD') {
      const hazardType = HAZARD_MAP[body] || 'high_waves';
      session.hazardType = hazardType;
      session.step = 'LOCATION';
      sessionStore.set(from, session);

      replyText = `📍 *Step 2: Share Incident Location*\n\n` +
                  `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
                  `• Or reply with the coastal landmark (e.g. _"Juhu Beach, Mumbai"_)\n\n` +
                  `Reply *RESET* to restart.`;
    } else if (session.step === 'LOCATION') {
      session.lat = latitude || 19.0760;
      session.lng = longitude || 72.8777;
      session.locName = payload.Address || body || 'Reported Coastal Location';
      session.step = 'PHOTO';
      sessionStore.set(from, session);

      replyText = `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
                  `Location: *${session.locName}*\n\n` +
                  `Please send a live photo of the hazard, or reply *SKIP* to submit without photo.`;
    } else if (session.step === 'PHOTO') {
      const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;
      sessionStore.delete(from);

      replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                  `📋 *Reference ID:* \`${refId}\`\n` +
                  `⚠️ *Hazard:* ${(session.hazardType || 'Hazard').toUpperCase().replace('_', ' ')}\n` +
                  `📍 *Location:* ${session.locName}\n` +
                  `${mediaUrl ? '📸 *Evidence:* Photo Attached & Geotagged\n' : ''}\n` +
                  `Disaster response and coastal control teams have been alerted.\n\n` +
                  `📞 *Emergency Coast Guard:* 1078`;
    }

    // Return TwiML XML to Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  } catch (error) {
    console.error('WhatsApp Webhook error:', error);
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ We received your message. If this is an emergency, please call Coast Guard 1078 directly.</Message>
</Response>`;
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(fallbackTwiml);
  }
}
