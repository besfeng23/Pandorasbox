
import { useEffect, useState } from 'react';
import { getFirestore } from 'firebase/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/firebase';

export function useRealtimeArtifact(artifactId: string) {
    const { user } = useUser();
    const [content, setContent] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return; // Skip if no firebase client config
        if (!user || !artifactId) return;

        const db = getFirestore();
        const unsub = onSnapshot(doc(db, "artifacts", artifactId), (doc) => {
            const data = doc.data();
            if (data) {
                setContent(data.content);
                setLastUpdated(data.updatedAt?.toDate() || new Date());
            }
        });

        return () => unsub();
    }, [user, artifactId]);

    return { content, lastUpdated };
}
