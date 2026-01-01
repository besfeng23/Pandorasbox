'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { useConnectionStore } from '@/store/connection';
import type { Message } from '@/lib/types';
import { toDate } from '@/lib/utils';

export function useChatHistory(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { setConnectionStatus, pendingMessages, calculateLatency } = useConnectionStore();

  useEffect(() => {
    if (!userId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    console.log(`Setting up snapshot listener for root history collection with userId: ${userId}`);
    const historyCollectionRef = collection(firestore, 'history');
    const q = query(
        historyCollectionRef, 
        where('userId', '==', userId),
        orderBy('timestamp', 'asc')
    );

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
            content: data.content,
            role: data.role
          } as Message;
        });

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
