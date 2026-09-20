/**
 * Server-Sent Events (SSE) Hub for real-time live map, alerts, and triage queue updates
 */

const clients = new Set();

function addClient(res) {
  clients.add(res);
  res.on('close', () => {
    clients.delete(res);
  });
}

function broadcastEvent(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function getClientCount() {
  return clients.size;
}

module.exports = {
  addClient,
  broadcastEvent,
  getClientCount
};
