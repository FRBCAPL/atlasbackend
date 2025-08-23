import { fetchSheetData } from './src/utils/fetchSheetData.js';
import User from './src/models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Google Sheet details (same as frontend)
const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

// Utility: Parse availability string into day-slot map (same as frontend)
function parseAvailability(str) {
  const dayMap = {
    Monday: "Mon",
    Tuesday: "Tue", 
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
  };
  
  const result = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  
  if (!str) return result;
  
  str.split(/\r?\n/).forEach(line => {
    const match = line.match(/Day:\s*(\w+),\s*Available From:\s*([\w:]+),\s*Available Until:\s*([\w: ]+)/i);
    if (match) {
      const [_, dayFull, from, until] = match;
      const dayShort = dayMap[dayFull];
      if (dayShort) {
        const fromNorm = normalizeTime(from);
        const untilNorm = normalizeTime(until);
        result[dayShort].push(`${fromNorm} - ${untilNorm}`);
      }
    }
  });
  
  return result;
}

// Utility: Normalize time string for display (same as frontend)
function normalizeTime(str) {
  if (!str) return "";
  str = str.trim().toLowerCase().replace(/\s+/g, "");
  let match = str.match(/^(\d{1,2})(:?(\d{2}))?(am|pm)$/);
  if (!match) return str.toUpperCase();
  let [, h, , m, ap] = match;
  if (!m) m = "00";
  return `${parseInt(h, 10)}:${m} ${ap.toUpperCase()}`;
}

// Main update function
async function updateExistingUsers() {
  try {
    console.log('Starting existing user data update...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB successfully');
    
    // Fetch data from Google Sheets
    console.log('Fetching data from Google Sheets...');
    const rows = await fetchSheetData(sheetID, `${pinSheetName}!A1:L1000`);
    
    if (!rows || rows.length === 0) {
      console.log('No data found in Google Sheets');
      return { success: false, message: 'No data found in Google Sheets' };
    }
    
    console.log(`Found ${rows.length - 1} player records (excluding header row)`);
    
    // Process each row (skip header)
    const players = rows.slice(1).map(row => ({
      firstName: row[0] || "",
      lastName: row[1] || "",
      email: row[2] || "",
      phone: row[3] || "",
      locations: row[8] || "",
      availability: parseAvailability(row[7] || ""),
      preferredContacts: (row[10] || "")
        .split(/\r?\n/)
        .map(method => method.trim().toLowerCase())
        .filter(Boolean),
    })).filter(p => p.email && p.firstName && p.lastName);
    
    console.log(`Processing ${players.length} valid player records`);
    
    // Update statistics
    const stats = {
      total: players.length,
      updated: 0,
      notFound: 0,
      errors: 0,
      errorsList: []
    };
    
    // Process each player
    for (const playerData of players) {
      try {
        // Find existing user by email
        const existingUser = await User.findOne({ email: playerData.email.toLowerCase() });
        
        if (!existingUser) {
          console.log(`User ${playerData.email} not found in database, skipping...`);
          stats.notFound++;
          continue;
        }
        
        // Update user with Google Sheets data
        const updateData = {
          firstName: playerData.firstName.trim(),
          lastName: playerData.lastName.trim(),
          phone: playerData.phone.trim(),
          locations: playerData.locations.trim(),
          availability: playerData.availability,
          preferredContacts: playerData.preferredContacts.length > 0 ? playerData.preferredContacts : ['email'],
          notes: `Updated from Google Sheets on ${new Date().toISOString()}`
        };
        
        // Update the user
        await User.findByIdAndUpdate(existingUser._id, updateData);
        
        console.log(`Updated user: ${playerData.firstName} ${playerData.lastName} (${playerData.email})`);
        stats.updated++;
        
      } catch (error) {
        console.error(`Error updating player ${playerData.email}:`, error.message);
        stats.errors++;
        stats.errorsList.push({
          email: playerData.email,
          error: error.message
        });
      }
    }
    
    console.log('Update completed!');
    console.log('Statistics:', stats);
    
    return {
      success: true,
      message: 'User updates completed successfully',
      stats
    };
    
  } catch (error) {
    console.error('Update failed:', error);
    return {
      success: false,
      message: 'Update failed',
      error: error.message
    };
  } finally {
    // Close database connection
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the update
updateExistingUsers()
  .then(result => {
    console.log('Final result:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });
