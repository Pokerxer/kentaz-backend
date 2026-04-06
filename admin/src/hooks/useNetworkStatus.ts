'use client';

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,
    wasOffline: false,
  });

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({ isOnline: true, wasOffline: !prev.isOnline }));
  }, []);

  const handleOffline = useCallback(() => {
    setStatus({ isOnline: false, wasOffline: false });
  }, []);

  useEffect(() => {
    // Set initial state
    setStatus({ isOnline: navigator.onLine, wasOffline: false });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
}