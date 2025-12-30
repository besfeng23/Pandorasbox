'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import type { AppSettings } from '@/lib/types';

const defaultSettings: AppSettings = {
    active_model: 'gpt-4o',
    reply_style: 'detailed',
    system_prompt_override: '',
};

export function useSettings(userId?: string) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        setSettings(defaultSettings);
        return;
    }
    const settingsDocRef = doc(firestore, 'settings', userId);

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (doc) => {
        if (doc.exists()) {
          setSettings({ ...defaultSettings, ...doc.data() } as AppSettings);
        } else {
          // Document does not exist, use default settings
          setSettings(defaultSettings);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching settings:', err);
        setSettings(defaultSettings);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { settings, isLoading };
}
