import client from './client';

export function getMyAssignment() {
  return client.get('/api/assignments/me');
}

export function getAllAssignments() {
  return client.get('/api/assignments');
}

export function createAssignment(userId, busId) {
  return client.post('/api/assignments', { userId, busId });
}

export function deleteAssignment(assignmentId) {
  return client.delete(`/api/assignments/${assignmentId}`);
}

