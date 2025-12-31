import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { format } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely converts a Firestore timestamp-like object to a JavaScript Date.
 * Handles `Timestamp` objects, plain date objects, and server-side objects with `_seconds`.
 *
 * @param timestamp The timestamp object to convert.
 * @returns A `Date` object.
 */
export function toDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Handle server-side rendered timestamps (often plain objects)
  if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
    return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
  }
  // Fallback for unexpected formats
  return new Date();
}

export function formatTime(timestamp: any): string {
  if (!timestamp) {
    return '...';
  }

  try {
    const date = toDate(timestamp);
    return format(date, 'h:mm a');
  } catch (error) {
    console.error("Invalid date for formatting:", timestamp);
    return "Invalid date";
  }
}
