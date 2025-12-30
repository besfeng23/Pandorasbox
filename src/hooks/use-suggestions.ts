'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export function useSuggestions(userId: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const firestore = useFirestore();

  useEffect(() => {
    if (!userId) {
      return;
    }

    const suggestionsDocRef = doc(firestore, `users/${userId}/state/suggestions`);

    const unsubscribe = onSnapshot(
      suggestionsDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setSuggestions(data.suggestions || []);
        } else {
          setSuggestions([]);
        }
      },
      (err) => {
        console.error('Error fetching suggestions:', err);
      }
    );

    return () => unsubscribe();
  }, [userId, firestore]);

  return { suggestions };
}
