import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Timestamp } from "firebase/firestore";
import { format } from 'date-fns';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timestamp: any): string {
  if (!timestamp) {
    return '...';
  }

  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'object' && timestamp.seconds) {
    date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
  }
  else {
    return "Invalid date";
  }

  return format(date, 'h:mm a');
}
