import client from './client';

export function fetchBuses() {
  return client.get('/api/buses');
}

export function fetchBusById(id) {
  return client.get(`/api/buses/${id}`);
}

export function createBus(payload) {
  return client.post('/api/buses', payload);
}

export function updateBus(id, payload) {
  return client.put(`/api/buses/${id}`, payload);
}

export function deleteBus(id) {
  return client.delete(`/api/buses/${id}`);
}

