import client from './client';

export function login(payload) {
  return client.post('/api/auth/login', payload);
}

export function register(payload) {
  return client.post('/api/auth/register', payload);
}

export function fetchProfile() {
  return client.get('/api/auth/me');
}
