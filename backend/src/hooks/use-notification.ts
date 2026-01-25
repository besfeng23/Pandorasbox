'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermissionStatus);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied';
    const status = await Notification.requestPermission();
    setPermission(status as NotificationPermissionStatus);
    return status;
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return null;
    return new Notification(title, options);
  }, [isSupported, permission]);

  const showMessageNotification = useCallback((message: string) => {
    return showNotification("New Message", {
      body: message,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const showMemoryNotification = useCallback((memory: string) => {
    return showNotification("Memory Saved", {
      body: memory,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const showArtifactNotification = useCallback((title: string) => {
    return showNotification("Artifact Created", {
      body: title,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  const showErrorNotification = useCallback((error: string) => {
    return showNotification("Error", {
      body: error,
      icon: '/favicon.ico'
    });
  }, [showNotification]);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showMessageNotification,
    showMemoryNotification,
    showArtifactNotification,
    showErrorNotification
  };
}

