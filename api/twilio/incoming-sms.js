import handler from '../whatsapp.js';

/**
 * Compatibility endpoint matching standard Twilio path:
 * POST /api/twilio/incoming-sms
 */
export default async function twilioIncomingSmsHandler(req, res) {
  return handler(req, res);
}
