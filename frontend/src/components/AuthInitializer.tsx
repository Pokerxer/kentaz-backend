'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { setUser, setSessionChecked } from '@/store/userSlice';

/**
 * Restores the logged-in user once, on app load, from the token in localStorage.
 *
 * Without this, `state.user.isAuthenticated` starts `false` on every fresh page
 * load / refresh even when a valid `kentaz_token` exists, which bounces logged-in
 * users off auth-gated pages (e.g. /checkout). Mounted globally in Providers so
 * every page can trust `isAuthenticated` once `sessionChecked` is true.
 */
export function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('kentaz_token');
    if (!token) {
      dispatch(setSessionChecked());
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';
    fetch(`${apiUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Invalid session'))))
      .then((data) => {
        if (data && data._id) {
          dispatch(setUser(data));
        } else {
          localStorage.removeItem('kentaz_token');
          dispatch(setSessionChecked());
        }
      })
      .catch(() => {
        // Token expired or backend unreachable — clear it and continue as guest.
        localStorage.removeItem('kentaz_token');
        dispatch(setSessionChecked());
      });
  }, [dispatch]);

  return null;
}
