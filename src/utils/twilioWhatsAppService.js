import localDb from './localDb.js';
import realTimeService from './realTimeService.js';

/**
 * Twilio WhatsApp Ingestion & NLP Parsing Service for OceanSaksham
 * 
 * Capabilities:
 * 1. Natural Language Extraction (Free-form text reports)
 * 2. Native WhatsApp Location Pin Parser (Latitude & Longitude payload)
 * 3. Media Evidence Ingestion (Twilio MediaUrl0)
 * 4. Step-by-Step Interactive Chatbot State Machine
 * 5. Direct Dispatch to OceanSaksham Database & Real-Time Map
 */

// In-memory conversation state for WhatsApp users
const userSessions = new Map();

// Known Indian Coastal Landmarks & Coordinates Knowledge Base
const COASTAL_LOCATIONS_KB = [
  { name: 'Juhu Beach, Mumbai', keywords: ['juhu', 'juhu beach'], lat: 19.0988, lng: 72.8267 },
  { name: 'Versova Beach, Mumbai', keywords: ['versova', 'versova beach'], lat: 19.1317, lng: 72.8136 },
  { name: 'Marine Drive, Mumbai', keywords: ['marine drive', 'nariman point', 'chowpatty'], lat: 18.9438, lng: 72.8233 },
  { name: 'Aksa Beach, Mumbai', keywords: ['aksa', 'aksa beach', 'malad'], lat: 19.1760, lng: 72.7950 },
  { name: 'Gateway of India, Mumbai', keywords: ['gateway', 'colaba'], lat: 18.9220, lng: 72.8347 },
  { name: 'Marina Beach, Chennai', keywords: ['marina', 'marina beach', 'chennai'], lat: 13.0500, lng: 80.2824 },
  { name: 'Elliot Beach, Chennai', keywords: ['elliot', 'besant nagar'], lat: 12.9994, lng: 80.2707 },
  { name: 'Calangute Beach, Goa', keywords: ['calangute', 'baga', 'goa'], lat: 15.5439, lng: 73.7553 },
  { name: 'Miramar Beach, Goa', keywords: ['miramar', 'panaji'], lat: 15.4867, lng: 73.8078 },
  { name: 'Kochi Port & Beach, Kerala', keywords: ['kochi', 'cochin', 'fort kochi'], lat: 9.9656, lng: 76.2422 },
  { name: 'RK Beach, Visakhapatnam', keywords: ['vizag', 'rk beach', 'visakhapatnam'], lat: 17.7126, lng: 83.3182 },
  { name: 'Puri Sea Beach, Odisha', keywords: ['puri', 'puri beach', 'odisha'], lat: 19.7983, lng: 85.8249 },
  { name: 'Puducherry Promenade', keywords: ['puducherry', 'pondicherry', 'promenade'], lat: 11.9338, lng: 79.8354 }
];

/**
 * NLP Keyword Dictionary for Coastal Hazards & Severity
 */
const HAZARD_KEYWORDS = {
  tsunami: ['tsunami', 'tidal wave', 'giant wave', 'sea receded', 'sea water receding', 'सुनामी'],
  high_waves: ['high wave', 'high waves', 'rough sea', 'swell', 'large waves', 'crashing waves', 'swell surge', 'ऊंची लहरें', 'लाटा'],
  flooding: ['flood', 'flooding', 'waterlogged', 'water entering', 'inundation', 'water rise', 'जलभराव', 'पूर'],
  storm_surge: ['storm surge', 'sea surge', 'cyclone surge', 'high tide damage', 'तूफान'],
  coastal_erosion: ['erosion', 'beach washed away', 'sea wall broken', 'sand erosion', 'भूक्षरण'],
  emergency_sos: ['sos', 'emergency', 'help', 'trapped', 'drowning', 'boat capsize', 'मदद', 'बचाओ']
};

const SEVERITY_KEYWORDS = {
  critical: ['critical', 'massive', 'extreme', 'severe', 'danger', 'dangerous', 'disaster', 'urgent', 'evacuate', 'lifethreatening', 'बहुत गंभीर'],
  high: ['high', 'strong', 'heavy', 'warning', 'bad', 'गंभीर', 'धोकादायक'],
  medium: ['medium', 'moderate', 'rising', 'noticeable', 'मध्यम'],
  low: ['low', 'minor', 'small', 'calm', 'कम']
};

/**
 * 1. Extract Hazard Details from Natural Language Text
 */
export const extractHazardInfoFromText = (text = '') => {
  const lowerText = text.toLowerCase();
  
  // 1. Detect Hazard Type
  let detectedType = null;
  for (const [type, keywords] of Object.entries(HAZARD_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detectedType = type;
      break;
    }
  }

  // 2. Detect Severity
  let detectedSeverity = 'medium';
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detectedSeverity = severity;
      break;
    }
  }

  // 3. Detect Coordinates via Regex (e.g. "19.076, 72.877" or "19.0760 N, 72.8777 E")
  const coordRegex = /(-?\d{1,2}\.\d+)[,\s]+(-?\d{1,3}\.\d+)/;
  const coordMatch = text.match(coordRegex);
  let extractedCoords = null;
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      extractedCoords = { lat, lng };
    }
  }

  // 4. Detect Coastal Location from Knowledge Base
  let matchedLocation = null;
  for (const loc of COASTAL_LOCATIONS_KB) {
    if (loc.keywords.some(kw => lowerText.includes(kw))) {
      matchedLocation = loc;
      break;
    }
  }

  return {
    hazardType: detectedType,
    severity: detectedSeverity,
    coordinates: extractedCoords || (matchedLocation ? { lat: matchedLocation.lat, lng: matchedLocation.lng } : null),
    locationName: matchedLocation ? matchedLocation.name : (extractedCoords ? `${extractedCoords.lat.toFixed(4)}, ${extractedCoords.lng.toFixed(4)}` : null),
    rawText: text
  };
};

/**
 * 2. Process Inbound WhatsApp Payload from Twilio
 * 
 * Handles multi-modal inputs:
 * - Free-form text (NLP parsing)
 * - WhatsApp native location message (req.body.Latitude, req.body.Longitude)
 * - Media photo attachments (req.body.MediaUrl0)
 */
export const processInboundWhatsAppMessage = async (payload = {}) => {
  const from = payload.From || 'whatsapp:+919876543210';
  const body = (payload.Body || '').trim();
  const numMedia = parseInt(payload.NumMedia || '0', 10);
  const mediaUrl = numMedia > 0 ? payload.MediaUrl0 : null;
  const latitude = payload.Latitude ? parseFloat(payload.Latitude) : null;
  const longitude = payload.Longitude ? parseFloat(payload.Longitude) : null;
  const address = payload.Address || null;

  // Retrieve or initialize conversation session
  let session = userSessions.get(from) || {
    step: 'IDLE',
    hazardType: null,
    location: null,
    lat: null,
    lng: null,
    media: [],
    description: ''
  };

  const lowerBody = body.toLowerCase();

  // Reset or Help Commands
  if (lowerBody === 'reset' || lowerBody === 'clear' || lowerBody === 'cancel') {
    userSessions.delete(from);
    return {
      reply: `🔄 *Session Reset*\n\nWelcome to *OceanSaksham Coastal Hazard Reporting*.\nSend *REPORT* or describe the coastal hazard to begin.`,
      status: 'reset'
    };
  }

  if (lowerBody === 'help' || lowerBody === 'info') {
    return {
      reply: `🌊 *OceanSaksham WhatsApp Reporting Instructions*\n\n` +
             `You can report hazards in 3 easy ways:\n\n` +
             `1️⃣ *Fast One-Shot Text Report:*\n` +
             `   Example: _"High waves and sea flooding at Juhu beach Mumbai"_\n\n` +
             `2️⃣ *Interactive Menu:*\n` +
             `   Type *REPORT* and follow the 3 quick steps.\n\n` +
             `3️⃣ *Share Live Location & Photo:*\n` +
             `   Send a photo of the waves + tap 📎 > *Location* > *Send Current Location*.\n\n` +
             `📞 *Emergency Coast Guard:* 1078`,
      status: 'help'
    };
  }

  // --- PATH A: One-Shot Natural Language Report Detection ---
  // If user sends a descriptive sentence containing both a hazard keyword and a known location
  if (session.step === 'IDLE' && body.length > 8 && lowerBody !== 'hi' && lowerBody !== 'hello' && lowerBody !== 'report') {
    const nlpResult = extractHazardInfoFromText(body);

    if (nlpResult.hazardType || latitude || nlpResult.coordinates) {
      const finalLat = latitude || nlpResult.coordinates?.lat || 19.0760;
      const finalLng = longitude || nlpResult.coordinates?.lng || 72.8777;
      const finalLocName = address || nlpResult.locationName || `${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}`;
      const finalType = nlpResult.hazardType || 'high_waves';

      const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();

      const newReport = {
        id: `report_${Date.now()}`,
        hazardType: finalType,
        type: finalType,
        severity: nlpResult.severity || 'high',
        description: body,
        location: {
          name: finalLocName,
          address: finalLocName,
          coordinates: { lat: finalLat, lng: finalLng }
        },
        lat: finalLat,
        lng: finalLng,
        media: mediaUrl ? [{
          id: `wa_img_${Date.now()}`,
          url: mediaUrl,
          preview: mediaUrl,
          name: `whatsapp_${refId}.jpg`,
          geotagged: true
        }] : [],
        mediaFiles: mediaUrl ? [{ url: mediaUrl, preview: mediaUrl }] : [],
        source: 'whatsapp',
        reportedBy: `WhatsApp Citizen (${from.replace('whatsapp:', '')})`,
        reportedByRole: 'citizen',
        reporterName: `WhatsApp User (${from.replace('whatsapp:', '')})`,
        status: 'pending_verification',
        verificationStatus: 'pending',
        priority: nlpResult.severity === 'critical' ? 'high' : 'normal',
        timestamp: nowIso,
        submittedAt: nowIso
      };

      // Save directly into OceanSaksham DB & dispatch real-time events
      try {
        localDb.insert('userReports', newReport);
        localDb.insert('pendingVerification', newReport);
        localDb.insert('pendingReports', newReport);
        realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
        realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));
      } catch (err) {
        console.warn('LocalDb sync warning in twilioWhatsAppService:', err);
      }

      userSessions.delete(from);

      return {
        reply: `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
               `📋 *Reference ID:* \`${refId}\`\n` +
               `⚠️ *Hazard:* ${finalType.replace('_', ' ').toUpperCase()}\n` +
               `📍 *Location:* ${finalLocName}\n` +
               `🔴 *Severity:* ${(nlpResult.severity || 'high').toUpperCase()}\n\n` +
               `INCOIS & Disaster Response Authorities have received your telemetry.\n` +
               `_Tip: Send a photo anytime to attach evidence to this report._\n\n` +
               `📞 *Coast Guard Distress Helpline:* 1078`,
        status: 'submitted',
        report: newReport
      };
    }
  }

  // --- PATH B: Step-by-Step Conversational Guided Flow ---
  if (session.step === 'IDLE') {
    session.step = 'SELECT_HAZARD';
    userSessions.set(from, session);

    return {
      reply: `🌊 *Welcome to OceanSaksham Coastal Hazard Reporting*\n` +
             `_National Ocean Information Services (INCOIS)_\n\n` +
             `Please reply with the hazard number:\n\n` +
             `1️⃣ 🌊 High Waves / Swell Surge\n` +
             `2️⃣ 🌧️ Coastal Flooding / Inundation\n` +
             `3️⃣ 🌀 Storm Surge / Cyclone\n` +
             `4️⃣ 🚨 Tsunami / Sudden Sea Receding\n` +
             `5️⃣ 🏖️ Coastal Beach Erosion\n` +
             `6️⃣ 🆘 Emergency SOS Distress\n\n` +
             `_Or simply text what you see (e.g. "Big waves at Juhu beach")_`,
      status: 'step_hazard'
    };
  }

  // Step 1: Hazard Selection
  if (session.step === 'SELECT_HAZARD') {
    const hazardMap = {
      '1': 'high_waves',
      '2': 'flooding',
      '3': 'storm_surge',
      '4': 'tsunami',
      '5': 'coastal_erosion',
      '6': 'emergency_sos'
    };

    const detected = hazardMap[body] || extractHazardInfoFromText(body).hazardType;

    if (detected) {
      session.hazardType = detected;
      session.step = 'LOCATION';
      userSessions.set(from, session);

      return {
        reply: `📍 *Step 2: Share Incident Location*\n\n` +
               `Please share your location in one of two ways:\n` +
               `• Tap 📎 *Attachment* > *Location* > *Send Your Current Location*\n` +
               `• Or reply with the beach/port name (e.g. _"Versova Beach, Mumbai"_)\n\n` +
               `Reply *RESET* to restart.`,
        status: 'step_location'
      };
    } else {
      return {
        reply: `⚠️ Please enter a number between 1 and 6, or describe the hazard (e.g. _High waves_).`,
        status: 'invalid_choice'
      };
    }
  }

  // Step 2: Location Handling
  if (session.step === 'LOCATION') {
    let locLat = latitude;
    let locLng = longitude;
    let locName = address;

    if (!locLat || !locLng) {
      const nlp = extractHazardInfoFromText(body);
      if (nlp.coordinates) {
        locLat = nlp.coordinates.lat;
        locLng = nlp.coordinates.lng;
        locName = nlp.locationName || body;
      } else {
        locName = body;
        locLat = 19.0760;
        locLng = 72.8777;
      }
    }

    session.lat = locLat;
    session.lng = locLng;
    session.locationName = locName || `${locLat.toFixed(4)}, ${locLng.toFixed(4)}`;
    session.step = 'PHOTO';
    userSessions.set(from, session);

    return {
      reply: `📸 *Step 3: Capture Photo Evidence (Optional)*\n\n` +
             `📍 Location: *${session.locationName}*\n\n` +
             `Please take & send a live photo of the coastal hazard.\n` +
             `_Or reply *SKIP* to submit without a photo._`,
      status: 'step_photo'
    };
  }

  // Step 3: Photo & Final Submission
  if (session.step === 'PHOTO') {
    const isSkip = lowerBody === 'skip' || lowerBody === 'no';
    const photoUrl = mediaUrl || (isSkip ? null : null);

    const refId = `INCOIS-WA-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const newReport = {
      id: `report_${Date.now()}`,
      hazardType: session.hazardType || 'high_waves',
      type: session.hazardType || 'high_waves',
      severity: session.hazardType === 'tsunami' ? 'critical' : 'high',
      description: `Reported via WhatsApp: ${session.hazardType?.replace('_', ' ')} near ${session.locationName}`,
      location: {
        name: session.locationName,
        address: session.locationName,
        coordinates: { lat: session.lat, lng: session.lng }
      },
      lat: session.lat,
      lng: session.lng,
      media: photoUrl ? [{
        id: `wa_img_${Date.now()}`,
        url: photoUrl,
        preview: photoUrl,
        name: `whatsapp_${refId}.jpg`,
        geotagged: true
      }] : [],
      mediaFiles: photoUrl ? [{ url: photoUrl, preview: photoUrl }] : [],
      source: 'whatsapp',
      reportedBy: `WhatsApp Citizen (${from.replace('whatsapp:', '')})`,
      reportedByRole: 'citizen',
      reporterName: `WhatsApp User (${from.replace('whatsapp:', '')})`,
      status: 'pending_verification',
      verificationStatus: 'pending',
      priority: session.hazardType === 'tsunami' ? 'high' : 'normal',
      timestamp: nowIso,
      submittedAt: nowIso
    };

    try {
      localDb.insert('userReports', newReport);
      localDb.insert('pendingVerification', newReport);
      localDb.insert('pendingReports', newReport);
      realTimeService.notifyListeners('userReports', localDb.getCollection('userReports'));
      realTimeService.notifyListeners('pendingVerification', localDb.getCollection('pendingVerification'));
    } catch (err) {
      console.warn('LocalDb sync warning in twilioWhatsAppService:', err);
    }

    userSessions.delete(from);

    return {
      reply: `✅ *Hazard Report Dispatched to Authorities!*\n\n` +
             `📋 *Reference ID:* \`${refId}\`\n` +
             `⚠️ *Hazard:* ${session.hazardType.replace('_', ' ').toUpperCase()}\n` +
             `📍 *Location:* ${session.locationName}\n` +
             `${photoUrl ? '📸 *Evidence:* Attached\n' : ''}\n` +
             `Disaster authorities at INCOIS and State Coastal Control have been notified.\n\n` +
             `📞 *Emergency Coast Guard:* 1078`,
      status: 'submitted',
      report: newReport
    };
  }

  return {
    reply: `👋 Send *REPORT* to submit a hazard report or *HELP* for instructions.`,
    status: 'idle'
  };
};

export default {
  extractHazardInfoFromText,
  processInboundWhatsAppMessage
};
