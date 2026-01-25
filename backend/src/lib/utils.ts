import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Timestamp } from "firebase/firestore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: Date | Timestamp | string | number): string {
    const d = toDate(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDateTime(date: Date | Timestamp | string | number): string {
    const d = toDate(date);
    return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function toDate(timestamp: Date | Timestamp | string | number | any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    // Fallback for serialized objects
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    return new Date();
}

export function chunkText(text: string, maxLength: number = 1000): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks;
}
