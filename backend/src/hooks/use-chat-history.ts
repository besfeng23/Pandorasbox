
'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, orderBy, query, where, queryEqual, doc } from 'firebase/firestore';
import { useConnectionStore } from '@/store/connection';
import type { Message, Thread } from '@/lib/types';
import { toDate } from '@/lib/utils';

export function useChatHistory(userId: string | null, threadId: string | null, agentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { setConnectionStatus, pendingMessages, calculateLatency } = useConnectionStore();
  const queryRef = useRef<any>(null);

  useEffect(() => {
    if (!userId || !threadId || !firestore) {
      setMessages([]);
      setThread(null);
      setIsLoading(false);
      queryRef.current = null; // Reset query ref when clearing
      return;
    }

    // Reset query ref when threadId or agentId changes to force re-subscription
    queryRef.current = null;
    setIsLoading(true);
    setError(null);

    // Clear messages immediately when switching threads to prevent stale data
    setMessages([]);

    // Listener for thread data (including summary)
    const threadDocRef = doc(firestore, `users/${userId}/agents/${agentId}/threads`, threadId);
    const unsubscribeThread = onSnapshot(
      threadDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const threadData = {
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
          } as any as Thread;
          setThread(threadData);
        } else {
          console.warn(`[useChatHistory] Thread ${threadId} does not exist`);
          setThread(null);
          setError(`Thread not found`);
          setIsLoading(false);
        }
      },
      (err) => {
        console.error('[useChatHistory] Error loading thread:', err);
        setError('Could not load thread. Please check your connection.');
        setIsLoading(false);
      }
    );

    const historyCollectionRef = collection(firestore, `users/${userId}/agents/${agentId}/history`);
    const newQuery = query(
      historyCollectionRef,
      where('userId', '==', userId),
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );

    queryRef.current = newQuery;

    const unsubscribeMessages = onSnapshot(
      newQuery,
      (snapshot) => {
        const history = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            ...data,
            createdAt: toDate(data.createdAt),
            content: data.content,
            role: data.role
          } as any as Message;
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
        console.error('[useChatHistory] Error fetching chat history (onSnapshot error):', err);

        // Check for missing index error
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          setError('Firestore index missing. Please create the required composite index for the history collection.');
          console.error('[useChatHistory] Missing Firestore index. Create index for: userId, threadId, createdAt');
        } else {
          setError('Could not load chat history. Please check your connection and Firebase setup.');
        }

        setIsLoading(false);
        setConnectionStatus('offline');
      }
    );

    return () => {
      console.log(`[useChatHistory] Cleaning up listeners for thread ${threadId}`);
      unsubscribeThread();
      unsubscribeMessages();
      // Don't reset queryRef here as it might be needed for comparison
    }
  }, [userId, threadId, agentId, firestore, setConnectionStatus, pendingMessages, calculateLatency]);

  return { messages, thread, isLoading, error };
}
