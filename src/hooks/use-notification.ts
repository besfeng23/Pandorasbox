'use client';

import { useState, useEffect, useCallback } from 'react';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  data?: any;
}

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Browser notifications are not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission was previously denied');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    async (options: NotificationOptions): Promise<Notification | null> => {
      if (!isSupported) {
        console.warn('Browser notifications are not supported');
        return null;
      }

      // Request permission if not granted
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          console.warn('Notification permission not granted');
          return null;
        }
      }

      try {
        const notificationOptions: NotificationOptions = {
          icon: options.icon || '/icon-192x192.png',
          badge: options.badge || '/icon-192x192.png',
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
          vibrate: options.vibrate,
          data: options.data,
        };

        const notification = new Notification(options.title, notificationOptions);

        if (options.body) {
          // Note: body is part of the constructor options in newer APIs
          // But we can't modify it after creation, so we'll rely on title
        }

        // Auto-close after 5 seconds unless requireInteraction is true
        if (!notificationOptions.requireInteraction) {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }

        return notification;
      } catch (error) {
        console.error('Error showing notification:', error);
        return null;
      }
    },
    [isSupported, requestPermission]
  );

  const showMessageNotification = useCallback(
    async (message: string, threadTitle?: string) => {
      return showNotification({
        title: 'New Message',
        body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        tag: `message-${Date.now()}`,
        icon: '/icon-192x192.png',
        vibrate: [200, 100, 200],
        data: { type: 'message', threadTitle },
      });
    },
    [showNotification]
  );

  const showMemoryNotification = useCallback(
    async (memoryContent: string) => {
      return showNotification({
        title: 'Memory Saved',
        body: memoryContent.substring(0, 100) + (memoryContent.length > 100 ? '...' : ''),
        tag: `memory-${Date.now()}`,
        icon: '/icon-192x192.png',
        vibrate: [200],
        data: { type: 'memory' },
      });
    },
    [showNotification]
  );

  const showArtifactNotification = useCallback(
    async (artifactTitle: string) => {
      return showNotification({
        title: 'Artifact Created',
        body: artifactTitle,
        tag: `artifact-${Date.now()}`,
        icon: '/icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        data: { type: 'artifact' },
      });
    },
    [showNotification]
  );

  const showErrorNotification = useCallback(
    async (errorMessage: string) => {
      return showNotification({
        title: 'Error',
        body: errorMessage,
        tag: `error-${Date.now()}`,
        icon: '/icon-192x192.png',
        requireInteraction: true,
        vibrate: [300, 100, 300],
        data: { type: 'error' },
      });
    },
    [showNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showMessageNotification,
    showMemoryNotification,
    showArtifactNotification,
    showErrorNotification,
  };
}

