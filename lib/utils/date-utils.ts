import { format, formatDistanceToNow } from 'date-fns';

/**
 * Formats a date string into a human-readable format
 * @param dateString - ISO date string to format
 * @param formatString - Optional format string (defaults to 'MMM dd, yyyy')
 * @returns Formatted date string
 */
export function formatDate(dateString: string, formatString: string = 'MMM dd, yyyy'): string {
  try {
    const date = new Date(dateString);
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Returns a relative time string (e.g., "2 days ago")
 * @param dateString - ISO date string to format
 * @returns Relative time string
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return dateString;
  }
}

/**
 * Checks if a date is in the past
 * @param dateString - ISO date string to check
 * @returns Boolean indicating if date is in the past
 */
export function isPastDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.getTime() < Date.now();
  } catch (error) {
    console.error('Error checking if date is in the past:', error);
    return false;
  }
}

/**
 * Checks if a date is in the future
 * @param dateString - ISO date string to check
 * @returns Boolean indicating if date is in the future
 */
export function isFutureDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.getTime() > Date.now();
  } catch (error) {
    console.error('Error checking if date is in the future:', error);
    return false;
  }
} 