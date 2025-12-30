'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Message } from '@/lib/types';
import { useConnectionStore } from '@/store/connection';


export function useChatHistory(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { setConnectionStatus, calculateLatency } = useConnectionStore();


  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      setError("User ID is required to fetch chat history.");
      setConnectionStatus('offline');
      return;
    }

    const historyCollection = collection(firestore, `users/${userId}/history`);
    const q = query(historyCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.metadata.fromCache) {
            setConnectionStatus('syncing');
        } else {
            setConnectionStatus('live');
        }

        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                calculateLatency(change.doc.id);
            }
        });

        const history = snapshot.docs.map((doc: DocumentData) => {
          const data = doc.data();
          const timestamp = data.timestamp instanceof Timestamp 
            ? data.timestamp.toDate() 
            : new Date();
          return {
            id: doc.id,
            ...data,
            timestamp: timestamp,
          } as Message;
        });
        setMessages(history);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching chat history:', err);
        setError('Could not load chat history. Please check your connection and Firebase setup.');
        setConnectionStatus('offline');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, firestore, setConnectionStatus, calculateLatency]);

  return { messages, isLoading, error };
}
