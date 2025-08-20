import { createMatchEvent } from '../googleCalendar.js';
import Calendar from '../models/Calendar.js';

// Helper to convert "7:00 PM" to "19:00"
function convertTo24(timeStr) {
  if (!timeStr) return "19:00"; // Default to 7 PM if no time provided
  let [time, ampm] = timeStr.trim().toUpperCase().split(' ');
  let [hour, min] = time.split(':').map(Number);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

// Helper to format date for calendar
function formatDateForCalendar(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  
  // Handle different date formats
  let date;
  if (dateStr.includes('-')) {
    // YYYY-MM-DD format
    date = new Date(dateStr);
  } else if (dateStr.includes('/')) {
    // MM/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      date = new Date(year, month - 1, day);
    }
  } else {
    // Try to parse as is
    date = new Date(dateStr);
  }
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateStr);
    return new Date().toISOString().split('T')[0];
  }
  
  return date.toISOString().split('T')[0];
}

// Add match to app calendar (always happens)
export async function addMatchToAppCalendar(proposal, userId) {
  try {
    if (!proposal.date || !proposal.time) {
      console.log(`Skipping app calendar event for proposal ${proposal._id}: missing date or time`);
      return null;
    }

    // Create event for both players
    const players = [proposal.senderName, proposal.receiverName];
    const events = [];

    for (const playerName of players) {
      const eventData = {
        userId: playerName, // Using player name as userId for now
        eventType: 'match',
        title: `${proposal.senderName} vs ${proposal.receiverName}`,
        description: `Game Type: ${proposal.gameType || 'N/A'}, Race Length: ${proposal.raceLength || 'N/A'}`,
        date: new Date(proposal.date),
        startTime: proposal.time,
        endTime: null, // Could calculate based on start time
        location: proposal.location || 'TBD',
        matchDetails: {
          opponent: playerName === proposal.senderName ? proposal.receiverName : proposal.senderName,
          gameType: proposal.gameType || 'N/A',
          raceLength: proposal.raceLength || 'N/A',
          division: proposal.divisions?.[0] || 'N/A',
          proposalId: proposal._id
        }
      };

      const event = new Calendar(eventData);
      await event.save();
      events.push(event);
      console.log(`Created app calendar event for ${playerName}: ${proposal.senderName} vs ${proposal.receiverName} on ${proposal.date} at ${proposal.time}`);
    }

    return events;
  } catch (error) {
    console.error(`Failed to create app calendar event for proposal ${proposal._id}:`, error.message);
    return null;
  }
}

// Add match to Google Calendar (optional, based on user preference)
export async function addMatchToGoogleCalendar(proposal, userPrefersGoogleCalendar = false) {
  try {
    // Only proceed if user wants Google Calendar integration and it's configured
    if (!userPrefersGoogleCalendar || !process.env.GOOGLE_CALENDAR_ID) {
      console.log('Google Calendar integration not enabled or not configured - skipping Google Calendar event creation');
      return null;
    }

    if (!proposal.date || !proposal.time) {
      console.log(`Skipping Google Calendar event for proposal ${proposal._id}: missing date or time`);
      return null;
    }

    const dateStr = formatDateForCalendar(proposal.date);
    const timeStr = convertTo24(proposal.time);
    
    // Create start and end times (2 hour duration)
    const startDateTime = new Date(`${dateStr}T${timeStr}:00-06:00`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    const eventData = {
      summary: `${proposal.senderName} vs ${proposal.receiverName}`,
      description: `Game Type: ${proposal.gameType || 'N/A'}, Race Length: ${proposal.raceLength || 'N/A'}`,
      location: proposal.location || 'TBD',
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString()
    };

    const result = await createMatchEvent(eventData);
    console.log(`Created Google Calendar event for proposal ${proposal._id}: ${proposal.senderName} vs ${proposal.receiverName} on ${proposal.date} at ${proposal.time}`);
    
    return result;
  } catch (error) {
    console.error(`Failed to create Google Calendar event for proposal ${proposal._id}:`, error.message);
    // Don't throw the error - just log it and continue
    return null;
  }
}

// Main function to add match to calendars
export async function addMatchToCalendars(proposal, userPrefersGoogleCalendar = false) {
  try {
    // Always add to app calendar
    const appCalendarResult = await addMatchToAppCalendar(proposal, proposal.senderName);
    
    // Optionally add to Google Calendar
    const googleCalendarResult = await addMatchToGoogleCalendar(proposal, userPrefersGoogleCalendar);
    
    return {
      appCalendar: appCalendarResult,
      googleCalendar: googleCalendarResult
    };
  } catch (error) {
    console.error(`Failed to add match to calendars for proposal ${proposal._id}:`, error.message);
    return null;
  }
}

export async function removeMatchFromCalendar(eventId) {
  try {
    // This would require storing the event ID when creating the event
    // For now, we'll just log that we would remove it
    console.log(`Would remove calendar event: ${eventId}`);
    return true;
  } catch (error) {
    console.error(`Failed to remove calendar event ${eventId}:`, error.message);
    return false;
  }
}
