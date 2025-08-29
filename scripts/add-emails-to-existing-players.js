import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

// ADD EMAILS TO EXISTING PLAYERS
// Replace this with your actual email data from Google Sheets
const emailData = {
  'Brett Gonzalez': 'brett@example.com',
  'Tito Rodriguez': 'tito@example.com',
  'Lawrence Anaya': 'lawrence@example.com',
  'Ramsey Knowles': 'ramsey@example.com',
  'Tom Barnard': 'tom@example.com',
  'Chris Roberts': 'chris@example.com',
  'David Delgado': 'david@example.com',
  'Cody Kinney': 'cody@example.com',
  'Crystal Pettiford': 'crystal@example.com',
  'Louis Martinez': 'louis@example.com',
  'Tony Neumann': 'tony@example.com',
  'Christopher Anderson': 'christopher@example.com',
  'Kent Montel': 'kent@example.com',
  'Ramon Valdez': 'ramon@example.com',
  'Darren Maya': 'darren@example.com',
  'Lyndi Navarrete': 'lyndi@example.com',
  'Johnny Grimaldo': 'johnny@example.com',
  'Joe Eusoof': 'joe@example.com',
  'George S. Gutierrez': 'george@example.com',
  'Valeria Mendoza Poncedeleon': 'valeria@example.com',
  'Ben Mullenaux': 'ben@example.com',
  'Zach Hamning': 'zach@example.com',
  'Micheal Queen': 'micheal@example.com',
  'Melissa Swatek': 'melissa@example.com',
  'Dave Shelton': 'dave@example.com',
  'Red McKay': 'red@example.com',
  'Chuey Rodriguez': 'chuey@example.com',
  'Jacob Poland': 'jacob@example.com',
  'Mike Johnson': 'mike@example.com',
  'Sarah Wilson': 'sarah@example.com',
  'Alex Thompson': 'alex@example.com',
  'Jessica Brown': 'jessica@example.com',
  'Ryan Davis': 'ryan@example.com',
  'Amanda Garcia': 'amanda@example.com',
  'Kevin Lee': 'kevin@example.com',
  'Nicole Martinez': 'nicole@example.com',
  'Daniel White': 'daniel@example.com',
  'Rachel Taylor': 'rachel@example.com',
  'Andrew Clark': 'andrew@example.com',
  'Michelle Anderson': 'michelle@example.com',
  'Robert Lewis': 'robert@example.com',
  'Jennifer Moore': 'jennifer@example.com',
  'William Hall': 'william@example.com',
  'Stephanie Jackson': 'stephanie@example.com',
  'James Young': 'james@example.com',
  'Lisa Thompson': 'lisa@example.com',
  'Michael Scott': 'michael@example.com',
  'Karen Johnson': 'karen@example.com',
  'David Wallace': 'david2@example.com'
};

const addEmails = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📧 Adding emails to existing players...');

    let updated = 0;
    let skipped = 0;

    // Get all existing players
    const players = await LadderPlayer.find({});
    console.log(`📊 Found ${players.length} existing players`);

    for (const player of players) {
      const fullName = `${player.firstName} ${player.lastName}`;
      const email = emailData[fullName];

             if (email) {
         // Only update if we have a real email from the Google Sheet
         player.email = email;
         await player.save();
         console.log(`✅ Added email for ${fullName}: ${email}`);
         updated++;
       } else {
         console.log(`⏭️  No email in Google Sheet for ${fullName} - skipping`);
         skipped++;
       }
    }

    console.log('\n🎉 Email update complete!');
    console.log(`✅ Updated: ${updated} players`);
    console.log(`⏭️  Skipped: ${skipped} players`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to add emails:', error);
    process.exit(1);
  }
};

console.log(`
📧 ADD EMAILS TO EXISTING PLAYERS
================================

 📝 INSTRUCTIONS:
 1. This will ADD emails to existing players
 2. It will NOT clear or delete anything
 3. Only players who have emails in your Google Sheet will be updated
 4. Replace the emailData object with your actual data

 🎯 WHAT IT DOES:
 - Finds all existing ladder players
 - Adds emails ONLY for players who have emails in your Google Sheet
 - Skips players who don't have emails in your Google Sheet
 - Keeps all existing data intact
`);

addEmails();
