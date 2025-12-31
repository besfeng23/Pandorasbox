'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useConnectionStore } from '@/store/connection';
import type { Message } from '@/lib/types';

export function useChatHistory(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { setConnectionStatus, pendingMessages, calculateLatency } = useConnectionStore();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setError("User ID is required to fetch chat history.");
      return;
    }

    const historyCollection = collection(firestore, `users/${userId}/history`);
    const q = query(historyCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const history = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          let timestamp: Date;
          const ts = data.timestamp;

          // Robust timestamp conversion
          if (ts instanceof Timestamp) {
            timestamp = ts.toDate();
          } else if (ts && typeof ts.seconds === 'number' && typeof ts.nanoseconds === 'number') {
            // Handle plain object representation of a Timestamp
            timestamp = new Timestamp(ts.seconds, ts.nanoseconds).toDate();
          } else if (ts instanceof Date) {
            // It's already a Date object
            timestamp = ts;
          } else {
            // Fallback for unexpected formats
            console.warn(`Invalid timestamp format for message ${doc.id}:`, ts);
            timestamp = new Date();
          }

          return {
            id: doc.id,
            ...data,
            timestamp: timestamp,
          } as Message;
        });

        // After getting the latest history, check for any pending messages
        // that have now been confirmed.
        history.forEach(message => {
            if (pendingMessages.has(message.id)) {
                calculateLatency(message.id);
            }
        });
        
        setMessages(history);
        setIsLoading(false);
        setError(null);
        setConnectionStatus(pendingMessages.size > 0 ? 'syncing' : 'live');
      },
      (err) => {
        console.error('Error fetching chat history:', err);
        setError('Could not load chat history. Please check your connection and Firebase setup.');
        setIsLoading(false);
        setConnectionStatus('offline');
      }
    );

    return () => unsubscribe();
  }, [userId, firestore, setConnectionStatus, pendingMessages, calculateLatency]);

  return { messages, isLoading, error };
}
