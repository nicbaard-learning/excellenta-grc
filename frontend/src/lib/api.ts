const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('grc_access_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `API error: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

// Auth
export const auth = {
  login: (email: string, password: string, rememberMe = false) =>
    apiRequest<{ access_token: string; token_type: string; expires_in: number }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
      skipAuth: true,
    }),
  register: (email: string, password: string, fullName: string, orgName: string) =>
    apiRequest<{ access_token: string; token_type: string; expires_in: number }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, organization_name: orgName }),
      skipAuth: true,
    }),
  me: () => apiRequest<any>('/auth/me'),
  updateProfile: (data: any) =>
    apiRequest<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

// Capabilities
export const capabilities = {
  getDashboard: () => apiRequest<any>('/capabilities/dashboard'),
  getDomains: () => apiRequest<any[]>('/capabilities/domains'),
  getDomain: (id: string) => apiRequest<any>(`/capabilities/domains/${id}`),
  getCapability: (id: string) => apiRequest<any>(`/capabilities/capabilities/${id}`),
  getSubCapability: (id: string) => apiRequest<any>(`/capabilities/sub-capabilities/${id}`),
  getChecklistItems: (subId: string) => apiRequest<any[]>(`/capabilities/sub-capabilities/${subId}/checklist-items`),
  createChecklistItem: (subId: string, data: any) =>
    apiRequest<any>(`/capabilities/sub-capabilities/${subId}/checklist-items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateChecklistItem: (itemId: string, data: any) =>
    apiRequest<any>(`/capabilities/checklist-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteChecklistItem: (itemId: string) =>
    apiRequest<any>(`/capabilities/checklist-items/${itemId}`, { method: 'DELETE' }),
  search: (query: string) => apiRequest<any>(`/capabilities/search?q=${encodeURIComponent(query)}`),
  getProgressOverview: () => apiRequest<any>('/capabilities/progress/overview'),
};
