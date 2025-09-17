/**
 * Backend Date Utilities for Ladder App
 * Ensures consistent date handling on the server side
 */

// Timezone configuration - Colorado Springs is Mountain Time
const APP_TIMEZONE = 'America/Denver'; // Mountain Time (handles DST automatically)

/**
 * Get current date in YYYY-MM-DD format (local date, no timezone conversion)
 * This is used for date inputs and display purposes
 */
export function getCurrentDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get current date/time in ISO format with timezone
 * This is used for database storage and API calls
 */
export function getCurrentISODate() {
  return new Date().toISOString();
}

/**
 * Convert a date string (YYYY-MM-DD) to a proper Date object for database storage
 * This ensures the date is stored consistently regardless of user's timezone
 */
export function dateStringToDate(dateString) {
  if (!dateString) return null;
  
  // Create date at noon local time to avoid timezone issues
  const [year, month, day] = dateString.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
}

/**
 * Convert a Date object to YYYY-MM-DD string for display
 */
export function dateToDateString(date) {
  if (!date) return '';
  
  // Use local date components to avoid timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display in the UI
 */
export function formatDateForDisplay(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: APP_TIMEZONE
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

/**
 * Format date and time for display
 */
export function formatDateTimeForDisplay(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: APP_TIMEZONE
  };
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-US', { ...defaultOptions, ...options });
}

/**
 * Check if a date is today
 */
export function isToday(date) {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date) {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day
  
  return dateObj < today;
}

/**
 * Check if a date is in the future
 */
export function isFutureDate(date) {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Set to end of day
  
  return dateObj > today;
}

/**
 * Get date X days from now
 */
export function getDateDaysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Get date X days from a given date
 */
export function getDateDaysFromDate(startDate, days) {
  const date = new Date(startDate);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidDateString(dateString) {
  if (!dateString) return false;
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Get minimum date for date inputs (usually today)
 */
export function getMinDateForInput() {
  return getCurrentDateString();
}

/**
 * Get maximum date for date inputs (usually 1 year from now)
 */
export function getMaxDateForInput() {
  const maxDate = getDateDaysFromNow(365);
  return dateToDateString(maxDate);
}

/**
 * Convert time string (HH:MM) to 24-hour format
 */
export function convertTo24Hour(timeStr) {
  if (!timeStr) return '19:00'; // Default to 7 PM
  
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':');
  
  let hour24 = parseInt(hours);
  
  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Convert 24-hour time to 12-hour format for display
 */
export function convertTo12Hour(time24) {
  if (!time24) return '7:00 PM';
  
  const [hours, minutes] = time24.split(':');
  const hour12 = parseInt(hours);
  
  if (hour12 === 0) {
    return `12:${minutes} AM`;
  } else if (hour12 < 12) {
    return `${hour12}:${minutes} AM`;
  } else if (hour12 === 12) {
    return `12:${minutes} PM`;
  } else {
    return `${hour12 - 12}:${minutes} PM`;
  }
}

/**
 * Create a date-time string for calendar events
 * Combines date and time with proper timezone handling
 */
export function createDateTimeString(dateString, timeString) {
  if (!dateString) return null;
  
  const time24 = convertTo24Hour(timeString);
  return `${dateString}T${time24}:00-07:00`; // Mountain Time offset
}

/**
 * Parse a date-time string and return date and time components
 */
export function parseDateTimeString(dateTimeString) {
  if (!dateTimeString) return { date: '', time: '' };
  
  const dateObj = new Date(dateTimeString);
  const date = dateToDateString(dateObj);
  const time = dateObj.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return { date, time };
}

/**
 * Get relative time description (e.g., "2 days ago", "in 3 hours")
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffDays > 0) {
    return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  } else if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return `${absDays} day${absDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
  } else if (diffHours < 0) {
    const absHours = Math.abs(diffHours);
    return `${absHours} hour${absHours === 1 ? '' : 's'} ago`;
  } else if (diffMinutes > 0) {
    return `in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
  } else if (diffMinutes < 0) {
    const absMinutes = Math.abs(diffMinutes);
    return `${absMinutes} minute${absMinutes === 1 ? '' : 's'} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Sort dates in ascending order
 */
export function sortDatesAscending(dates) {
  return dates.sort((a, b) => new Date(a) - new Date(b));
}

/**
 * Sort dates in descending order
 */
export function sortDatesDescending(dates) {
  return dates.sort((a, b) => new Date(b) - new Date(a));
}

/**
 * Get the start of day for a given date
 */
export function getStartOfDay(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Get the end of day for a given date
 */
export function getEndOfDay(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  return d1.toDateString() === d2.toDateString();
}

/**
 * Get days between two dates
 */
export function getDaysBetween(date1, date2) {
  if (!date1 || !date2) return 0;
  
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const diffMs = Math.abs(d2 - d1);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Sanitize and validate date input from API requests
 * This ensures dates are properly formatted before database storage
 */
export function sanitizeDateInput(dateInput) {
  if (!dateInput) return null;
  
  // If it's already a Date object, return it
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // If it's a string, try to parse it
  if (typeof dateInput === 'string') {
    // Handle ISO strings
    if (dateInput.includes('T') || dateInput.includes('Z')) {
      return new Date(dateInput);
    }
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateStringToDate(dateInput);
    }
    
    // Try to parse as regular date
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  
  // If we can't parse it, return null
  return null;
}

/**
 * Create a date range for database queries
 * Useful for finding matches within a specific date range
 */
export function createDateRange(startDate, endDate) {
  const start = getStartOfDay(startDate);
  const end = getEndOfDay(endDate);
  
  return {
    $gte: start,
    $lte: end
  };
}

/**
 * Get the current period for prize pool calculations
 * Returns start and end dates for the current 2-month period
 */
export function getCurrentPrizePoolPeriod() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Calculate which 2-month period we're in (0-1, 2-3, 4-5, 6-7, 8-9, 10-11)
  const periodStartMonth = Math.floor(currentMonth / 2) * 2;
  
  const startOfPeriod = new Date(currentYear, periodStartMonth, 1);
  const endOfPeriod = new Date(currentYear, periodStartMonth + 2, 0); // Last day of next month
  
  return {
    start: startOfPeriod,
    end: endOfPeriod
  };
}

/**
 * Get the next prize pool period
 */
export function getNextPrizePoolPeriod() {
  const current = getCurrentPrizePoolPeriod();
  const nextStart = new Date(current.end);
  nextStart.setDate(nextStart.getDate() + 1);
  
  const nextEnd = new Date(nextStart);
  nextEnd.setMonth(nextEnd.getMonth() + 2);
  nextEnd.setDate(0); // Last day of the month
  
  return {
    start: nextStart,
    end: nextEnd
  };
}

// Export all functions as default object for easy importing
export default {
  getCurrentDateString,
  getCurrentISODate,
  dateStringToDate,
  dateToDateString,
  formatDateForDisplay,
  formatDateTimeForDisplay,
  isToday,
  isPastDate,
  isFutureDate,
  getDateDaysFromNow,
  getDateDaysFromDate,
  isValidDateString,
  getMinDateForInput,
  getMaxDateForInput,
  convertTo24Hour,
  convertTo12Hour,
  createDateTimeString,
  parseDateTimeString,
  getRelativeTime,
  sortDatesAscending,
  sortDatesDescending,
  getStartOfDay,
  getEndOfDay,
  isSameDay,
  getDaysBetween,
  sanitizeDateInput,
  createDateRange,
  getCurrentPrizePoolPeriod,
  getNextPrizePoolPeriod
};
