
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { AppSettings } from '@/lib/types';

const defaultSettings: AppSettings = {
  theme: 'system',
  active_model: 'mistralai/Mistral-7B-Instruct-v0.3',
  reply_style: 'detailed',
  system_prompt_override: '',
  personal_api_key: '',
};

export function useSettings(userId?: string) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const firestore = useFirestore();

  useEffect(() => {
    if (!userId || !firestore) {
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
  }, [userId, firestore]);

  return { settings, isLoading };
}
