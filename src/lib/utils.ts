import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any): string {
  if (!date) return 'N/A';
  
  // Handle Firestore Timestamp
  if (date.toDate) {
    return date.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Handle regular Date or string
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatAccountNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  const segments = [2, 2, 3, 3, 2];
  const parts: string[] = [];
  let index = 0;

  for (const length of segments) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + length));
    index += length;
  }

  return parts.join('/');
}
