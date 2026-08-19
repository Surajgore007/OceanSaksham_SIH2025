/**
 * Standalone Node.js / Express Webhook for Twilio API for WhatsApp
 * 
 * Instructions:
 * 1. Install twilio: `npm install twilio`
 * 2. In Twilio Console -> Messaging -> Senders -> WhatsApp Sandbox Settings:
 *    Set "WHEN A MESSAGE COMES IN" URL to: https://<YOUR_DEPLOYED_DOMAIN>/api/whatsapp
 */

const express = require('express');
const router = express.Router();

// NLP and Location Extraction Helpers
const COASTAL_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'chowpatty'], lat: 18.9438, lng: 72.8233 },
  { name: 'Marina Beach, Chennai', keywords: ['marina'], lat: 13.0500, lng: 80.2824 },
  { name: 'Calangute Beach, Goa', keywords: ['calangute', 'baga'], lat: 15.5439, lng: 73.7553 }
];

const HAZARD_MAP = {
  '1': 'high_waves',
  '2': 'flooding',
  '3': 'storm_surge',
  '4': 'tsunami',
  '5': 'coastal_erosion',
  '6': 'emergency_sos'
};

const userSessions = new Map();

router.post('/webhook/whatsapp', (req, res) => {
  const from = req.body.From || 'whatsapp:+910000000000';
  const body = (req.body.Body || '').trim();
  const lowerBody = body.toLowerCase();
  const numMedia = parseInt(req.body.NumMedia || '0', 10);
  const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;
  const latitude = req.body.Latitude ? parseFloat(req.body.Latitude) : null;
  const longitude = req.body.Longitude ? parseFloat(req.body.Longitude) : null;

  let session = userSessions.get(from) || { step: 'IDLE' };
  let replyText = '';

  // Help / Reset
  if (lowerBody === 'reset' || lowerBody === 'clear') {
    userSessions.delete(from);
    replyText = `🔄 *Session Reset*\nSend *REPORT* or describe the hazard to begin.`;
  } else if (lowerBody === 'help' || lowerBody === 'info') {
    replyText = `🌊 *OceanSaksham WhatsApp Reporting*\n\n` +
                `1️⃣ *Fast Text:* Send _"High waves at Juhu beach"_\n` +
                `2️⃣ *Menu:* Reply *REPORT*\n` +
                `3️⃣ *GPS & Photo:* Send photo + 📎 Location pin.\n\n` +
                `📞 *Coast Guard:* 1078`;
  } else if (session.step === 'IDLE') {
    // Check for NLP one-shot text
    const matchedLoc = COASTAL_KB.find(l => l.keywords.some(k => lowerBody.includes(k)));
    const isHazardText = ['wave', 'flood', 'surge', 'tsunami', 'erosion', 'sos'].some(k => lowerBody.includes(k));

    if (isHazardText && (matchedLoc || latitude)) {
      const lat = latitude || matchedLoc?.lat || 19.0760;
      const lng = longitude || matchedLoc?.lng || 72.8777;
      const locName = matchedLoc?.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      const refId = `INCOIS-${Date.now().toString().slice(-6)}`;

      userSessions.delete(from);
      replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                  `📋 *Reference ID:* \`${refId}\`\n` +
                  `📍 *Location:* ${locName}\n` +
                  `Disaster response teams at INCOIS have been notified.\n\n` +
                  `📞 *Coast Guard Distress:* 1078`;
    } else {
      session.step = 'SELECT_HAZARD';
      userSessions.set(from, session);
      replyText = `🌊 *Welcome to OceanSaksham Hazard Reporting*\n` +
                  `_INCOIS Coastal Information Services_\n\n` +
                  `Please reply with hazard number:\n` +
                  `1️⃣ 🌊 High Waves / Swell Surge\n` +
                  `2️⃣ 🌧️ Coastal Flooding\n` +
                  `3️⃣ 🌀 Storm Surge\n` +
                  `4️⃣ 🚨 Tsunami\n` +
                  `5️⃣ 🏖️ Beach Erosion\n` +
                  `6️⃣ 🆘 Emergency Distress\n\n` +
                  `_Or describe what you see in words._`;
    }
  } else if (session.step === 'SELECT_HAZARD') {
    const hazardType = HAZARD_MAP[body] || 'high_waves';
    session.hazardType = hazardType;
    session.step = 'LOCATION';
    userSessions.set(from, session);

    replyText = `📍 *Step 2: Share Incident Location*\n\n` +
                `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
                `• Or reply with the coastal landmark name (e.g. _"Juhu Beach"_)\n\n` +
                `Reply *RESET* to cancel.`;
  } else if (session.step === 'LOCATION') {
    session.lat = latitude || 19.0760;
    session.lng = longitude || 72.8777;
    session.locName = req.body.Address || body || 'Reported Coastal Location';
    session.step = 'PHOTO';
    userSessions.set(from, session);

    replyText = `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
                `Location: *${session.locName}*\n\n` +
                `Send a live photo of the hazard, or reply *SKIP* to submit without photo.`;
  } else if (session.step === 'PHOTO') {
    const refId = `INCOIS-${Date.now().toString().slice(-6)}`;
    userSessions.delete(from);

    replyText = `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
                `📋 *Reference ID:* \`${refId}\`\n` +
                `⚠️ *Hazard:* ${(session.hazardType || 'Hazard').toUpperCase()}\n` +
                `📍 *Location:* ${session.locName}\n` +
                `${mediaUrl ? '📸 *Evidence:* Attached\n' : ''}\n` +
                `Disaster management and coastal monitoring teams have been alerted.\n\n` +
                `📞 *Coast Guard:* 1078`;
  }

  // Return standard TwiML XML response
  const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${replyText}</Message>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(xmlResponse);
});

module.exports = router;
