'use client';

import { useEffect, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function useSuggestions(userId: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !firestore) {
      return;
    }

    const suggestionsDocRef = doc(firestore, `users/${userId}/state/suggestions`);
    const stateDocRef = doc(firestore, `users/${userId}/state/preferences`);

    const unsubscribeSuggestions = onSnapshot(
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

    const unsubscribePreferences = onSnapshot(
      stateDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setDismissedIds(new Set(data.dismissedSuggestions || []));
          setPinnedIds(new Set(data.pinnedSuggestions || []));
        }
      },
      (err) => {
        console.error('Error fetching preferences:', err);
      }
    );

    return () => {
      unsubscribeSuggestions();
      unsubscribePreferences();
    };
  }, [userId, firestore]);

  const dismissSuggestion = useCallback(async (suggestionIndex: number) => {
    if (!userId || !firestore || !suggestions[suggestionIndex]) return;
    const suggestionId = `${suggestionIndex}-${suggestions[suggestionIndex].substring(0, 20)}`;
    const newDismissed = new Set(dismissedIds);
    newDismissed.add(suggestionId);
    setDismissedIds(newDismissed);

    try {
      const stateDocRef = doc(firestore, `users/${userId}/state/preferences`);
      await setDoc(stateDocRef, { dismissedSuggestions: Array.from(newDismissed) }, { merge: true });
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      setDismissedIds(dismissedIds); // Revert on error
    }
  }, [userId, firestore, suggestions, dismissedIds]);

  const pinSuggestion = useCallback(async (suggestionIndex: number) => {
    if (!userId || !firestore || !suggestions[suggestionIndex]) return;
    const suggestionId = `${suggestionIndex}-${suggestions[suggestionIndex].substring(0, 20)}`;
    const newPinned = new Set(pinnedIds);
    if (newPinned.has(suggestionId)) {
      newPinned.delete(suggestionId);
    } else {
      newPinned.add(suggestionId);
    }
    setPinnedIds(newPinned);

    try {
      const stateDocRef = doc(firestore, `users/${userId}/state/preferences`);
      await setDoc(stateDocRef, { pinnedSuggestions: Array.from(newPinned) }, { merge: true });
    } catch (error) {
      console.error('Error pinning suggestion:', error);
      setPinnedIds(pinnedIds); // Revert on error
    }
  }, [userId, firestore, suggestions, pinnedIds]);

  // Filter out dismissed suggestions and sort pinned first
  const filteredSuggestions = suggestions
    .map((s, idx) => ({ text: s, index: idx, id: `${idx}-${s.substring(0, 20)}` }))
    .filter(({ id }) => !dismissedIds.has(id))
    .sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    })
    .map(({ text }) => text);

  return { suggestions: filteredSuggestions, dismissSuggestion, pinSuggestion, pinnedIds };
}
