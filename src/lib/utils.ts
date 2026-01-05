
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { format, isToday, isSameDay } from 'date-fns';


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
  // Handle ISO string dates from serialization
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }
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

/**
 * Formats a timestamp for display in messages.
 * Returns "HH:MM" for today, "MMM DD, HH:MM" for older dates.
 */
export function formatMessageTime(timestamp: any): string {
  if (!timestamp) {
    return '';
  }

  try {
    const date = toDate(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    return format(date, 'MMM dd, HH:mm');
  } catch (error) {
    console.error("Invalid date for formatting:", timestamp);
    return '';
  }
}

/**
 * Formats a full date/time for tooltips.
 */
export function formatFullDateTime(timestamp: any): string {
  if (!timestamp) {
    return '';
  }

  try {
    const date = toDate(timestamp);
    return format(date, 'PPpp'); // e.g., "Apr 29th, 2021 at 08:30 AM"
  } catch (error) {
    console.error("Invalid date for formatting:", timestamp);
    return '';
  }
}
