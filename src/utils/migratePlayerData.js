import fetchSheetData from './fetchSheetData.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

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

// Utility: Generate a default PIN for existing users
function generateDefaultPin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Main migration function
export async function migratePlayerData() {
  try {
    console.log('Starting player data migration...');
    
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
      pin: row[11] || generateDefaultPin(),
      preferredContacts: (row[10] || "")
        .split(/\r?\n/)
        .map(method => method.trim().toLowerCase())
        .filter(Boolean),
    })).filter(p => p.email && p.firstName && p.lastName);
    
    console.log(`Processing ${players.length} valid player records`);
    
    // Migration statistics
    const stats = {
      total: players.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorsList: []
    };
    
    // Process each player
    for (const playerData of players) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ email: playerData.email.toLowerCase() });
        
        if (existingUser) {
          console.log(`User ${playerData.email} already exists, skipping...`);
          stats.skipped++;
          continue;
        }
        
        // Hash the PIN
        const hashedPin = await bcrypt.hash(playerData.pin, 10);
        
        // Create new user
        const user = new User({
          firstName: playerData.firstName.trim(),
          lastName: playerData.lastName.trim(),
          email: playerData.email.toLowerCase().trim(),
          phone: playerData.phone.trim(),
          textNumber: '', // Not in original data
          emergencyContactName: '', // Not in original data
          emergencyContactPhone: '', // Not in original data
          preferredContacts: playerData.preferredContacts.length > 0 ? playerData.preferredContacts : ['email'],
          availability: playerData.availability,
          locations: playerData.locations.trim(),
          pin: hashedPin,
          division: '', // Will be assigned by admin
          notes: `Migrated from Google Sheets on ${new Date().toISOString()}`,
          isActive: true
        });
        
        await user.save();
        console.log(`Created user: ${user.firstName} ${user.lastName} (${user.email})`);
        stats.created++;
        
      } catch (error) {
        console.error(`Error processing player ${playerData.email}:`, error.message);
        stats.errors++;
        stats.errorsList.push({
          email: playerData.email,
          error: error.message
        });
      }
    }
    
    console.log('Migration completed!');
    console.log('Statistics:', stats);
    
    return {
      success: true,
      message: 'Migration completed successfully',
      stats
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      success: false,
      message: 'Migration failed',
      error: error.message
    };
  }
}

// Function to validate migrated data
export async function validateMigratedData() {
  try {
    console.log('Validating migrated data...');
    
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersWithAvailability = await User.countDocuments({
      $or: [
        { 'availability.Mon': { $exists: true, $ne: [] } },
        { 'availability.Tue': { $exists: true, $ne: [] } },
        { 'availability.Wed': { $exists: true, $ne: [] } },
        { 'availability.Thu': { $exists: true, $ne: [] } },
        { 'availability.Fri': { $exists: true, $ne: [] } },
        { 'availability.Sat': { $exists: true, $ne: [] } }
      ]
    });
    
    const usersWithLocations = await User.countDocuments({
      locations: { $exists: true, $ne: '' }
    });
    
    const usersWithContactPrefs = await User.countDocuments({
      preferredContacts: { $exists: true, $ne: [] }
    });
    
    const validation = {
      totalUsers,
      activeUsers,
      usersWithAvailability,
      usersWithLocations,
      usersWithContactPrefs,
      completeness: {
        availability: Math.round((usersWithAvailability / totalUsers) * 100),
        locations: Math.round((usersWithLocations / totalUsers) * 100),
        contactPrefs: Math.round((usersWithContactPrefs / totalUsers) * 100)
      }
    };
    
    console.log('Validation results:', validation);
    return validation;
    
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

// Function to clean up test data
export async function cleanupTestData() {
  try {
    console.log('Cleaning up test data...');
    
    // Remove users with test emails
    const result = await User.deleteMany({
      email: { $regex: /test|example|demo/, $options: 'i' }
    });
    
    console.log(`Removed ${result.deletedCount} test users`);
    return result;
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

// Function to export users to JSON (for backup)
export async function exportUsersToJSON() {
  try {
    console.log('Exporting users to JSON...');
    
    const users = await User.find({}).select('-pin -__v');
    const exportData = {
      exportDate: new Date().toISOString(),
      totalUsers: users.length,
      users: users
    };
    
    return exportData;
    
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

// CLI function for running migration
if (process.argv[2] === 'migrate') {
  migratePlayerData()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

if (process.argv[2] === 'validate') {
  validateMigratedData()
    .then(result => {
      console.log('Validation result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Validation error:', error);
      process.exit(1);
    });
}

if (process.argv[2] === 'cleanup') {
  cleanupTestData()
    .then(result => {
      console.log('Cleanup result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Cleanup error:', error);
      process.exit(1);
    });
}

if (process.argv[2] === 'export') {
  exportUsersToJSON()
    .then(result => {
      console.log('Export result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Export error:', error);
      process.exit(1);
    });
}
