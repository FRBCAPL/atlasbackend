import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  keyFile: './src/service-account.json',
  scopes: ['https://www.googleapis.com/auth/calendar']
});

const calendar = google.calendar({ version: 'v3', auth });

async function test() {
  await auth.getClient(); // Ensure credentials are loaded
  calendar.calendars.get({ calendarId: '510b66ed30fdf2925fde5b56e36d93f21e8eb4f947e9a0f528676e826a971f02@group.calendar.google.com' }, (err, res) => {
    if (err) {
      console.error('Calendar access error:', err);
    } else {
      console.log('Calendar access success:', res.data);
    }
  });
}
test();
