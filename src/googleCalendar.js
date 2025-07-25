import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account.json'),
  scopes: SCOPES
});

const calendar = google.calendar({ version: 'v3', auth });

async function createMatchEvent({ summary, description, location, startDateTime, endDateTime }) {
  await auth.getClient(); // Ensure credentials are loaded
  const event = {
    summary,
    location,
    description,
    start: { dateTime: startDateTime, timeZone: 'America/Denver' },
    end: { dateTime: endDateTime, timeZone: 'America/Denver' }
  };
  return calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: event,
  });
}

export { createMatchEvent };
