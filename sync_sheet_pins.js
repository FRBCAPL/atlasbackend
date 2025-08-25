import { fetchSheetData } from './src/utils/fetchSheetData.js';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Google Sheet details
const sheetID = "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

async function syncSheetPins() {
  try {
    console.log('🔄 Syncing PINs from Google Sheet to database...');
    console.log('Sheet ID:', sheetID);
    console.log('Sheet Name:', pinSheetName);
    
    // Fetch data from Google Sheets
    const rows = await fetchSheetData(sheetID, `${pinSheetName}!A1:L1000`);
    
    if (!rows || rows.length === 0) {
      console.log('❌ No data found in Google Sheets');
      return;
    }
    
    console.log(`📊 Found ${rows.length - 1} player records (excluding header row)`);
    
    // Process each row (skip header)
    const players = rows.slice(1).map(row => ({
      firstName: row[0] || "",
      lastName: row[1] || "",
      email: row[2] || "",
      pin: row[11] || "", // PIN is in column L (index 11)
    })).filter(p => p.email && p.firstName && p.lastName);
    
    console.log(`📋 Processing ${players.length} valid player records`);
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Get all users from database
    const dbUsers = await User.find({});
    console.log(`📊 Found ${dbUsers.length} users in database`);
    
    // Sync statistics
    const stats = {
      total: players.length,
      updated: 0,
      notFound: 0,
      errors: 0,
      errorsList: []
    };
    
    console.log('\n=== SYNCING PINs ===');
    
    for (const player of players) {
      try {
        // Find matching user in database
        const dbUser = dbUsers.find(u => u.email.toLowerCase() === player.email.toLowerCase());
        
        if (!dbUser) {
          console.log(`❌ User not found in DB: ${player.firstName} ${player.lastName} (${player.email})`);
          stats.notFound++;
          continue;
        }
        
        if (!player.pin) {
          console.log(`⚠️  No PIN in sheet for: ${player.firstName} ${player.lastName} (${player.email})`);
          continue;
        }
        
        // Hash the PIN from the sheet
        const hashedPin = await bcrypt.hash(player.pin, 10);
        
        // Update the user's PIN
        await User.updateOne(
          { _id: dbUser._id },
          { $set: { pin: hashedPin } }
        );
        
        console.log(`✅ Updated PIN for ${player.firstName} ${player.lastName} (${player.email}) to: ${player.pin}`);
        stats.updated++;
        
      } catch (error) {
        console.error(`❌ Error updating ${player.firstName} ${player.lastName}:`, error.message);
        stats.errors++;
        stats.errorsList.push({
          email: player.email,
          error: error.message
        });
      }
    }
    
    // Show summary
    console.log('\n=== SYNC SUMMARY ===');
    console.log(`Total players in sheet: ${stats.total}`);
    console.log(`PINs updated: ${stats.updated}`);
    console.log(`Users not found in DB: ${stats.notFound}`);
    console.log(`Errors: ${stats.errors}`);
    
    if (stats.errors > 0) {
      console.log('\n❌ Errors:');
      stats.errorsList.forEach(error => {
        console.log(`   - ${error.email}: ${error.error}`);
      });
    }
    
    console.log('\n🎉 PIN sync completed!');
    console.log('\n💡 You can now login using the PINs from the Google Sheet!');
    
    // Show some example login credentials
    console.log('\n📋 Example Login Credentials:');
    players.slice(0, 5).forEach(player => {
      if (player.pin) {
        console.log(`   ${player.firstName} ${player.lastName}: Email: ${player.email} | PIN: ${player.pin}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error syncing sheet PINs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

syncSheetPins()
  .then(() => {
    console.log('🎉 Sheet PIN sync completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sheet PIN sync failed:', error);
    process.exit(1);
  });
