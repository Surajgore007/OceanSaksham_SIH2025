const express = require('express');
const bodyParser = require('body-parser');
const twilioWebhook = require('./twilioWebhook');

const app = express();
const PORT = process.env.PORT || 5000;

// Twilio webhooks send x-www-form-urlencoded payloads
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Mount Twilio webhook routes
app.use('/', twilioWebhook);

app.get('/health', (req, res) => {
  res.json({ status: 'active', service: 'OceanSaksham Twilio WhatsApp Webhook' });
});

app.listen(PORT, () => {
  console.log(`\n🌊 OceanSaksham Twilio WhatsApp Server running on port ${PORT}`);
  console.log(`📍 Webhook URLs ready:`);
  console.log(`   - http://localhost:${PORT}/api/twilio/incoming-sms`);
  console.log(`   - http://localhost:${PORT}/api/whatsapp`);
  console.log(`\n👉 To connect to Twilio via ngrok: run 'ngrok http ${PORT}'\n`);
});
