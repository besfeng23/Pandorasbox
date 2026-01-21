'use client';

import { useEffect, useCallback } from 'react';
import { useNotification } from '@/hooks/use-notification';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { 
    isSupported, 
    permission, 
    showMessageNotification,
    showMemoryNotification,
    showArtifactNotification,
    showErrorNotification 
  } = useNotification();

  // Check if notifications are enabled
  const areNotificationsEnabled = useCallback(() => {
    if (typeof window === 'undefined') return false;
    if (!isSupported || permission !== 'granted') return false;
    const enabled = localStorage.getItem('notificationsEnabled');
    return enabled === 'true';
  }, [isSupported, permission]);

  // This provider just sets up the notification listeners
  // Actual message notifications are handled in the chat component

  // Listen for custom events for other notification types
  useEffect(() => {
    if (!areNotificationsEnabled()) return;

    const handleMemorySaved = (event: CustomEvent) => {
      const memoryContent = event.detail?.content || event.detail?.memory || '';
      if (memoryContent) {
        showMemoryNotification(memoryContent);
      }
    };

    const handleArtifactCreated = (event: CustomEvent) => {
      const artifactTitle = event.detail?.title || event.detail?.name || 'Artifact Created';
      showArtifactNotification(artifactTitle);
    };

    const handleError = (event: CustomEvent) => {
      const errorMessage = event.detail?.message || event.detail?.error || 'An error occurred';
      showErrorNotification(errorMessage);
    };

    window.addEventListener('memory:saved', handleMemorySaved as EventListener);
    window.addEventListener('artifact:created', handleArtifactCreated as EventListener);
    window.addEventListener('app:error', handleError as EventListener);

    return () => {
      window.removeEventListener('memory:saved', handleMemorySaved as EventListener);
      window.removeEventListener('artifact:created', handleArtifactCreated as EventListener);
      window.removeEventListener('app:error', handleError as EventListener);
    };
  }, [areNotificationsEnabled, showMemoryNotification, showArtifactNotification, showErrorNotification]);

  return <>{children}</>;
}

