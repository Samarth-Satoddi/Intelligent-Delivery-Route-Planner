/**
 * API Client for Intelligent Delivery Route Planner.
 * Manages communication with FastAPI backend endpoints.
 */

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Campus Maps & City Intelligence
  getMaps: () => request('/api/maps'),
  getMapData: (mapId) => request(`/api/map/${mapId}`),
  getStatistics: (mapId) => request(`/api/graph/${mapId}/statistics`),
  getDistricts: (mapId) => request(`/api/districts/${mapId}`),
  getHeuristics: (mapId, goalNode) =>
    request(`/api/heuristics?map_id=${encodeURIComponent(mapId)}&goal_node=${encodeURIComponent(goalNode)}`),

  // Search Engine
  computeRoute: (mapId, startNode, goalNode, algorithm = 'both') =>
    request('/api/route', {
      method: 'POST',
      body: JSON.stringify({
        map_id: mapId,
        start_node: startNode,
        goal_node: goalNode,
        algorithm: algorithm,
      }),
    }),

  // Benchmarks
  getBenchmarks: () => request('/api/benchmarks'),

  // Authentication
  register: (fullName, email, password) =>
    request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    }),

  login: (email, password, rememberMe = false) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
    }),

  refresh: () =>
    request('/api/auth/refresh', {
      method: 'POST',
    }),

  logout: () =>
    request('/api/auth/logout', {
      method: 'POST',
    }),

  getProfile: () => request('/api/auth/me'),
  getHistory: () => request('/api/auth/history'),

  // Admin
  adminAddNode: (mapId, nodeData) =>
    request(`/api/admin/maps/${mapId}/node`, {
      method: 'POST',
      body: JSON.stringify(nodeData),
    }),

  adminAddEdge: (mapId, edgeData) =>
    request(`/api/admin/maps/${mapId}/edge`, {
      method: 'POST',
      body: JSON.stringify(edgeData),
    }),

  adminGetUsers: () => request('/api/admin/users'),
};
