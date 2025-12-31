'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, orderBy, query, Timestamp } from 'firebase/firestore';
import { useConnectionStore } from '@/store/connection';
import type { Message } from '@/lib/types';
import { toDate } from '@/lib/utils';

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
      console.error("useChatHistory: No userId provided.");
      return;
    }

    console.log(`Setting up snapshot listener for userId: ${userId}`);
    const historyCollection = collection(firestore, `users/${userId}/history`);
    const q = query(historyCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('Snapshot received. Docs:', snapshot.docs.length);
        const history = snapshot.docs.map((doc) => {
          const data = doc.data();
          
          return {
            id: doc.id,
            ...data,
            timestamp: toDate(data.timestamp),
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
        console.error('Error fetching chat history (onSnapshot error):', err);
        setError('Could not load chat history. Please check your connection and Firebase setup.');
        setIsLoading(false);
        setConnectionStatus('offline');
      }
    );

    return () => {
        console.log(`Tearing down snapshot listener for userId: ${userId}`);
        unsubscribe();
    }
  }, [userId, firestore, setConnectionStatus, pendingMessages, calculateLatency]);

  return { messages, isLoading, error, userId };
}
