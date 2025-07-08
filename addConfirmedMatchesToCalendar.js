// addConfirmedMatchesToCalendar.js

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import credentials from './src/service-account.json' assert { type: 'json' };
import Proposal from './src/models/Proposal.js';
import { createMatchEvent } from './src/googleCalendar.js';

dotenv.config();

console.log("Using service account:", credentials.client_email);
console.log("Using calendar ID:", process.env.GOOGLE_CALENDAR_ID);

// Helper to convert "7:00 PM" to "19:00"
function convertTo24(timeStr) {
  let [time, ampm] = timeStr.trim().toUpperCase().split(' ');
  let [hour, min] = time.split(':').map(Number);
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {});

  const confirmed = await Proposal.find({ status: "confirmed" }).lean();

  console.log(`Found ${confirmed.length} confirmed proposals.`);

  for (const proposal of confirmed) {
    try {
      if (!proposal.date || !proposal.time) {
        console.log(`Skipping proposal ${proposal._id}: missing date or time`);
        continue;
      }
      const startDateTime = new Date(`${proposal.date}T${convertTo24(proposal.time)}:00-06:00`);
      const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours

      await createMatchEvent({
        summary: `${proposal.senderName} vs ${proposal.receiverName}`,
        description: `Game Type: ${proposal.gameType}, Race Length: ${proposal.raceLength}`,
        location: proposal.location,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString()
      });

      console.log(`Created event for proposal ${proposal._id}: ${proposal.senderName} vs ${proposal.receiverName} on ${proposal.date} at ${proposal.time}`);
    } catch (err) {
      console.error(`Failed to create event for proposal ${proposal._id}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch(err => {
  console.error("Batch script error:", err);
  process.exit(1);
});
