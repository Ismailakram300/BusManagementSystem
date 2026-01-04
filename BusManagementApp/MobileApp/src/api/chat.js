import client from './client';

export function getBusMessages(busId) {
  return client.get(`/api/chat/bus/${busId}`);
}

export function sendMessage(busId, message) {
  return client.post('/api/chat', { busId, message });
}

