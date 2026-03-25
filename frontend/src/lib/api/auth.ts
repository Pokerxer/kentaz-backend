import { apiClient, getAuthToken, setAuthToken, removeAuthToken } from './client';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin' | 'therapist';
  avatar?: string;
  addresses?: Address[];
  wishlist?: string[];
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export { getAuthToken, setAuthToken, removeAuthToken };

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiClient<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function getProfile(): Promise<User> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/auth/me`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch profile');
  }

  return res.json();
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  const token = getAuthToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000'}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error('Failed to update profile');
  }

  return res.json();
}

export function logout(): void {
  removeAuthToken();
}
