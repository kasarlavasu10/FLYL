const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? '';
const API_BASE = `${API_ORIGIN}/api`;

export function getAuthToken(): string | null {
  // Check sessionStorage first for strict tab isolation during multi-user testing
  const sessionToken = sessionStorage.getItem('connecthub_token');
  if (sessionToken) {
    return sessionToken;
  }
  const localToken = localStorage.getItem('connecthub_token');
  if (localToken) {
    sessionStorage.setItem('connecthub_token', localToken);
    return localToken;
  }
  return null;
}

export function setAuthToken(token: string | null) {
  if (token) {
    sessionStorage.setItem('connecthub_token', token);
    localStorage.setItem('connecthub_token', token);
  } else {
    sessionStorage.removeItem('connecthub_token');
    localStorage.removeItem('connecthub_token');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  register: (body: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/auth/me'),
  forgotPassword: (email: string) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body: any) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),

  // Users & Profiles
  getProfile: (username: string) => apiRequest(`/users/profile/${username}`),
  updateProfile: (body: any) => apiRequest('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (formData: FormData) => apiRequest('/users/avatar', { method: 'POST', body: formData }),
  uploadCover: (formData: FormData) => apiRequest('/users/cover', { method: 'POST', body: formData }),
  searchUsers: (query: string) => apiRequest(`/users/search?q=${encodeURIComponent(query)}`),
  getSuggestions: () => apiRequest('/users/suggestions'),

  // Connections & Friends
  getFriends: () => apiRequest('/connections/friends'),
  getPendingConnections: () => apiRequest('/connections/pending'),
  sendConnectionRequest: (recipientId: number) => apiRequest(`/connections/request/${recipientId}`, { method: 'POST' }),
  acceptConnectionRequest: (requestId: number) => apiRequest(`/connections/accept/${requestId}`, { method: 'POST' }),
  rejectConnectionRequest: (requestId: number) => apiRequest(`/connections/reject/${requestId}`, { method: 'POST' }),
  removeConnection: (connectionId: number) => apiRequest(`/connections/${connectionId}`, { method: 'DELETE' }),

  // Conversations & Chat
  getConversations: () => apiRequest('/conversations'),
  getOrCreateConversation: (userId: number) => apiRequest(`/conversations/with/${userId}`, { method: 'POST' }),
  getMessages: (conversationId: number) => apiRequest(`/conversations/${conversationId}/messages`),
  markConversationRead: (conversationId: number) => apiRequest(`/conversations/${conversationId}/read`, { method: 'POST' }),
  sendMessage: (formData: FormData) => apiRequest('/messages', { method: 'POST', body: formData }),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id: number) => apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'POST' }),

  // Calls
  getCallHistory: () => apiRequest('/calls/history'),
  logCall: (body: any) => apiRequest('/calls/log', { method: 'POST', body: JSON.stringify(body) }),

  // Privacy & Settings
  getBlockedUsers: () => apiRequest('/privacy/blocked'),
  blockUser: (userId: number) => apiRequest(`/privacy/block/${userId}`, { method: 'POST' }),
  unblockUser: (userId: number) => apiRequest(`/privacy/unblock/${userId}`, { method: 'POST' }),
  reportUser: (body: any) => apiRequest('/privacy/report', { method: 'POST', body: JSON.stringify(body) }),
};
