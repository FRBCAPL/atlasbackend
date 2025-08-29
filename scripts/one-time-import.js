import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

// REPLACE THIS WITH YOUR ACTUAL GOOGLE SHEETS CSV DATA
// Export from your "499 LADDER" tab and paste here
const yourGoogleSheetsData = `RANK,PLAYER,FARGO RATE,WIN,LOSS,STATUS,LAST MATCH,NOTES
1,Brett Gonzalez,471,15,2,ACTIVE,Challenge vs Ramsey Knowles on 08-09-2025 - Win (Defender),
2,Tito Rodriguez,463,8,6,ACTIVE,Challenge vs Lawrence Anaya on 08-08-2025 - Loss (Challenger),
3,Lawrence Anaya,455,3,4,ACTIVE,Challenge vs Tito Rodriguez on 08-08-2025 - Win (Defender),
4,Ramsey Knowles,450,12,3,ACTIVE,Challenge vs Brett Gonzalez on 08-09-2025 - Loss (Challenger),
5,Tom Barnard,445,7,5,ACTIVE,Challenge vs Chris Roberts on 08-07-2025 - Win (Defender),
6,Chris Roberts,440,5,7,ACTIVE,Challenge vs Tom Barnard on 08-07-2025 - Loss (Challenger),
7,David Delgado,435,9,4,ACTIVE,Challenge vs Cody Kinney on 08-06-2025 - Win (Defender),
8,Cody Kinney,430,6,8,ACTIVE,Challenge vs David Delgado on 08-06-2025 - Loss (Challenger),
9,Crystal Pettiford,319,1,1,VACATION,Challenge vs Louis Martinez on 08-05-2025 - Loss (Challenger),Dual Rotor Cuff suregry 4/28/25
10,Louis Martinez,420,8,3,ACTIVE,Challenge vs Crystal Pettiford on 08-05-2025 - Win (Defender),
11,Tony Neumann,415,2,9,ACTIVE,Challenge vs Christopher Anderson on 08-04-2025 - Loss (Challenger),No Rating
12,Christopher Anderson,410,7,4,ACTIVE,Challenge vs Tony Neumann on 08-04-2025 - Win (Defender),
13,Kent Montel,405,5,6,ACTIVE,Challenge vs Ramon Valdez on 08-03-2025 - Loss (Challenger),Dual Rotor Cuff suregry 4/28/25
14,Ramon Valdez,464,1,2,IMMUNE,Challenge vs Kent Montel on 08-03-2025 - Win (Defender),
15,Darren Maya,395,3,8,ACTIVE,Challenge vs Lyndi Navarrete on 08-02-2025 - Loss (Challenger),
16,Lyndi Navarrete,390,6,5,VACATION,Challenge vs Darren Maya on 08-02-2025 - Win (Defender),Deployed
17,Johnny Grimaldo,385,4,7,ACTIVE,Challenge vs Joe Eusoof on 08-01-2025 - Loss (Challenger),
18,Joe Eusoof,380,2,10,ACTIVE,Challenge vs Johnny Grimaldo on 08-01-2025 - Win (Defender),
19,George S. Gutierrez,375,5,4,ACTIVE,Challenge vs Valeria Mendoza Poncedeleon on 07-31-2025 - Win (Defender),Deployed
20,Valeria Mendoza Poncedeleon,370,3,6,ACTIVE,Challenge vs George S. Gutierrez on 07-31-2025 - Loss (Challenger),no response vs dave shelton
21,Ben Mullenaux,455,1,2,NO SHOW/ANSW...,Challenge vs Zach Hamning on 07-30-2025 - Loss (Challenger),ked to be removed on 8/11,,,hold for chnage of mind
22,Zach Hamning,365,2,7,NO SHOW/ANSW...,Challenge vs Ben Mullenaux on 07-30-2025 - Win (Defender),No show 2/2/25 vs Chuey
23,Micheal Queen,360,1,8,NO SHOW/ANSW...,Challenge vs Melissa Swatek on 07-29-2025 - Loss (Challenger),No show on 1/26-Next Offense=Removal
24,Melissa Swatek,355,4,5,ACTIVE,Challenge vs Micheal Queen on 07-29-2025 - Win (Defender),no show vs dave shelton
25,Dave Shelton,350,6,3,ACTIVE,Challenge vs Red McKay on 07-28-2025 - Win (Defender),
26,Red McKay,345,2,0,IMMUNE,Challenge vs Dave Shelton on 07-28-2025 - Loss (Challenger),No Rating
27,Chuey Rodriguez,340,3,6,ACTIVE,Challenge vs Jacob Poland on 07-27-2025 - Win (Defender),
28,Jacob Poland,335,1,7,ACTIVE,Challenge vs Chuey Rodriguez on 07-27-2025 - Loss (Challenger),No Rating
29,Mike Johnson,330,5,4,ACTIVE,Challenge vs Sarah Wilson on 07-26-2025 - Win (Defender),
30,Sarah Wilson,325,2,8,ACTIVE,Challenge vs Mike Johnson on 07-26-2025 - Loss (Challenger),
31,Alex Thompson,320,4,5,ACTIVE,Challenge vs Jessica Brown on 07-25-2025 - Win (Defender),
32,Jessica Brown,315,3,6,ACTIVE,Challenge vs Alex Thompson on 07-25-2025 - Loss (Challenger),
33,Ryan Davis,310,6,3,ACTIVE,Challenge vs Amanda Garcia on 07-24-2025 - Win (Defender),
34,Amanda Garcia,305,2,7,ACTIVE,Challenge vs Ryan Davis on 07-24-2025 - Loss (Challenger),
35,Kevin Lee,300,4,5,ACTIVE,Challenge vs Nicole Martinez on 07-23-2025 - Win (Defender),
36,Nicole Martinez,295,3,6,ACTIVE,Challenge vs Kevin Lee on 07-23-2025 - Loss (Challenger),
37,Daniel White,290,5,4,ACTIVE,Challenge vs Rachel Taylor on 07-22-2025 - Win (Defender),
38,Rachel Taylor,285,2,7,ACTIVE,Challenge vs Daniel White on 07-22-2025 - Loss (Challenger),
39,Andrew Clark,280,4,5,ACTIVE,Challenge vs Michelle Anderson on 07-21-2025 - Win (Defender),
40,Michelle Anderson,275,3,6,ACTIVE,Challenge vs Andrew Clark on 07-21-2025 - Loss (Challenger),
41,Robert Lewis,270,6,3,ACTIVE,Challenge vs Jennifer Moore on 07-20-2025 - Win (Defender),
42,Jennifer Moore,265,2,7,ACTIVE,Challenge vs Robert Lewis on 07-20-2025 - Loss (Challenger),
43,William Hall,260,4,5,ACTIVE,Challenge vs Stephanie Jackson on 07-19-2025 - Win (Defender),
44,Stephanie Jackson,255,3,6,ACTIVE,Challenge vs William Hall on 07-19-2025 - Loss (Challenger),
45,James Young,250,5,4,ACTIVE,Challenge vs Lisa Thompson on 07-18-2025 - Win (Defender),
46,Lisa Thompson,245,2,7,ACTIVE,Challenge vs James Young on 07-18-2025 - Loss (Challenger),
47,Red McKay,240,2,0,IMMUNE,Challenge vs Dave Shelton on 07-17-2025 - Win (Defender),No Rating
48,Michael Scott,235,4,5,ACTIVE,Challenge vs Karen Johnson on 07-16-2025 - Win (Defender),
49,Karen Johnson,230,3,6,ACTIVE,Challenge vs Michael Scott on 07-16-2025 - Loss (Challenger),
50,David Wallace,225,1,8,ACTIVE,Challenge vs Stanley Hudson on 07-15-2025 - Loss (Challenger),`;

const importData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Parse CSV data
    const lines = yourGoogleSheetsData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    console.log(`📊 Processing ${lines.length - 1} players...`);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const playerData = {};
      
      headers.forEach((header, index) => {
        playerData[header.toLowerCase().replace(/\s+/g, '_')] = values[index];
      });

      // Split name into first and last
      const nameParts = playerData.player.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // Check if player already exists (by name instead of email)
      const existingPlayer = await LadderPlayer.findOne({ 
        firstName: firstName,
        lastName: lastName 
      });
      if (existingPlayer) {
        console.log(`⏭️  Skipping ${playerData.player} - already exists`);
        skipped++;
        continue;
      }

      // Determine ladder based on FargoRate
      let fargoRate = 450; // Default for "No Rating" players
      let ladderName = '499-under'; // Default ladder for "No Rating" players
      
      if (playerData.fargo_rate !== 'No Rating') {
        fargoRate = parseInt(playerData.fargo_rate);
        
        if (fargoRate <= 499) {
          ladderName = '499-under';
        } else if (fargoRate >= 500 && fargoRate <= 549) {
          ladderName = '500-549';
        } else {
          ladderName = '550-plus';
        }
      }

      // Get ladder reference
      const ladder = await Ladder.findOne({ name: ladderName });
      if (!ladder) {
        console.log(`❌ Ladder ${ladderName} not found`);
        continue;
      }

      // Set status based on sheet data
      let isActive = true;
      let immunityUntil = null;
      
      if (playerData.status === 'VACATION') {
        isActive = false;
      } else if (playerData.status === 'IMMUNE') {
        // Set immunity for 7 days from now
        immunityUntil = new Date();
        immunityUntil.setDate(immunityUntil.getDate() + 7);
      } else if (playerData.status === 'NO SHOW/ANSW...') {
        isActive = false; // Mark as inactive for no-show players
      }

      // Create player (without email and pin - will be claimed later)
      const player = new LadderPlayer({
        firstName,
        lastName,
        // email: null, // Will be set when player claims account
        // pin: null, // Will be set when player claims account
        fargoRate,
        ladderId: ladder._id,
        ladderName,
        position: parseInt(playerData.rank),
        isActive,
        immunityUntil,
        stats: {
          wins: parseInt(playerData.win) || 0,
          losses: parseInt(playerData.loss) || 0
        }
      });

      await player.save();
      
      if (playerData.fargo_rate === 'No Rating') {
        console.log(`✅ Imported ${playerData.player} (No Rating) → ${ladderName}`);
      } else {
        console.log(`✅ Imported ${playerData.player} (${fargoRate}) → ${ladderName}`);
      }
      imported++;
    }

    console.log('\n🎉 Import Complete!');
    console.log(`✅ Imported: ${imported} players`);
    console.log(`⏭️  Skipped: ${skipped} players`);

    // Show final ladder distribution
    console.log('\n📋 Final Ladder Distribution:');
    const ladders = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladders) {
      const count = await LadderPlayer.countDocuments({ ladderName });
      console.log(`   ${ladderName}: ${count} players`);
    }

    console.log('\n📝 Account Setup:');
    console.log('   Players will claim their accounts later');
    console.log('   Email and PIN will be set during account claiming');

    process.exit(0);

  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

console.log(`
🚀 ONE-TIME LADDER DATA IMPORT
==============================

📝 INSTRUCTIONS:
1. Export your "499 LADDER" tab as CSV from Google Sheets
2. Replace 'yourGoogleSheetsData' with your actual CSV data
3. Run: node scripts/one-time-import.js
4. Done! Your data will be in the database forever.

📋 EXPECTED FORMAT (from your sheet):
RANK,PLAYER,FARGO RATE,WIN,LOSS,STATUS,LAST MATCH,NOTES
1,Brett Gonzalez,471,15,2,ACTIVE,Challenge vs...,

🎯 LADDER ASSIGNMENT:
- 0-499 → 499-under
- 500-549 → 500-549  
- 550+ → 550-plus
- "No Rating" → 499-under (default 450 rating)

📝 ACCOUNT SETUP:
- No email/pin generated
- Players will claim accounts later
- Email and PIN will be set during claiming process
`);

importData();
