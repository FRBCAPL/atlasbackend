import { fetchSheetData } from './src/utils/fetchSheetData.js';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Google Sheet details
const sheetID = process.env.GOOGLE_SHEETS_ID || "1tvMgMHsRwQxsR6lMNlSnztmwpK7fhZeNEyqjTqmRFRc";
const pinSheetName = "BCAPL SIGNUP";

async function fetchSheetPins() {
  try {
    console.log('🔍 Fetching PINs from Google Sheet...');
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
    
    // Connect to MongoDB to check which users exist
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    const dbUsers = await User.find({}).select('firstName lastName email isApproved isActive');
    
    console.log('\n=== GOOGLE SHEET PINs ===');
    console.log('📋 Users with PINs from Google Sheet:');
    
    players.forEach((player, index) => {
      const dbUser = dbUsers.find(u => u.email.toLowerCase() === player.email.toLowerCase());
      const exists = dbUser ? '✅ EXISTS' : '❌ NOT IN DB';
      const approved = dbUser?.isApproved ? '✅ APPROVED' : '❌ NOT APPROVED';
      const active = dbUser?.isActive ? '✅ ACTIVE' : '❌ INACTIVE';
      
      console.log(`${index + 1}. ${player.firstName} ${player.lastName} (${player.email})`);
      console.log(`   - PIN: ${player.pin || '❌ NO PIN'}`);
      console.log(`   - Status: ${exists} | ${approved} | ${active}`);
      console.log('');
    });
    
    // Show users that exist in DB but not in sheet
    const sheetEmails = players.map(p => p.email.toLowerCase());
    const missingFromSheet = dbUsers.filter(u => !sheetEmails.includes(u.email.toLowerCase()));
    
    if (missingFromSheet.length > 0) {
      console.log('⚠️  Users in DB but not in Google Sheet:');
      missingFromSheet.forEach(user => {
        console.log(`   - ${user.firstName} ${user.lastName} (${user.email})`);
      });
      console.log('');
    }
    
    console.log('🎉 PIN fetch completed!');
    console.log('\n💡 You can now login using the email or PIN from the Google Sheet!');
    
  } catch (error) {
    console.error('❌ Error fetching sheet PINs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

fetchSheetPins()
  .then(() => {
    console.log('🎉 Sheet PIN fetch completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sheet PIN fetch failed:', error);
    process.exit(1);
  });
