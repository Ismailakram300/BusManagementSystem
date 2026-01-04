import client from './client';

// Get all active announcements (for all users)
export function getAllAnnouncements() {
  return client.get('/api/announcements/all');
}

// Get announcements for a specific bus
export function getBusAnnouncements(busId) {
  return client.get(`/api/announcements/bus/${busId}`);
}

// Get all announcements for a bus (admin only - includes inactive)
export function getAllBusAnnouncements(busId) {
  return client.get(`/api/announcements/bus/${busId}/all`);
}

export function createAnnouncement(busId, title, message) {
  return client.post('/api/announcements', { busId, title, message });
}

export function updateAnnouncement(announcementId, updates) {
  return client.put(`/api/announcements/${announcementId}`, updates);
}

export function deleteAnnouncement(announcementId) {
  return client.delete(`/api/announcements/${announcementId}`);
}

