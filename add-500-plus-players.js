import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import LadderPlayer from './src/models/LadderPlayer.js';

async function add500PlusPlayers() {
  try {
    console.log('🔍 ADDING 500+ PLAYERS TO LADDERS');
    console.log('==================================\n');

    // Connect to MongoDB
    console.log('✅ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Ladder IDs from the database
    const LADDER_IDS = {
      '500-549': '68ad3d317367a8f33a23f4f7',
      '550-plus': '68ad3d317367a8f33a23f4f8'
    };

    // 500-549 Ladder Players
    const players500to549 = [
      { firstName: 'Mike', lastName: 'Thistlewood', fargoRate: 511, position: 1, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Jahnzel', lastName: 'Rionn', fargoRate: 558, position: 2, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Blaine', lastName: 'Myers', fargoRate: 500, position: 3, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'John', lastName: 'Burgess', fargoRate: 582, position: 4, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Levi', lastName: 'Romero', fargoRate: 510, position: 5, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Norberto', lastName: 'Montano', fargoRate: 520, position: 6, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Noel', lastName: 'Montano Martinez', fargoRate: 572, position: 7, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Timothy', lastName: 'Cole', fargoRate: 506, position: 8, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: false, status: 'VACATION' },
      { firstName: 'Randy', lastName: 'Ramirez', fargoRate: 576, position: 9, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Donavin', lastName: 'Warson', fargoRate: 521, position: 10, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Anthony', lastName: 'Zapf', fargoRate: 581, position: 11, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Chris', lastName: 'Standley', fargoRate: 516, position: 12, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Jon', lastName: 'Glennon', fargoRate: 500, position: 13, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Johnathan', lastName: 'Tate', fargoRate: 532, position: 14, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true },
      { firstName: 'Drew', lastName: 'Rieck', fargoRate: 525, position: 15, ladderName: '500-549', ladderId: LADDER_IDS['500-549'], isActive: true }
    ];

    // 550+ Ladder Players
    const players550Plus = [
      { firstName: 'Lucas', lastName: 'Taylor', fargoRate: 639, position: 1, ladderName: '550-plus', ladderId: LADDER_IDS['550-plus'], isActive: true },
      { firstName: 'Ruben', lastName: 'Silva', fargoRate: 712, position: 2, ladderName: '550-plus', ladderId: LADDER_IDS['550-plus'], isActive: true }
    ];

    console.log('📊 Adding 500-549 Ladder Players...');
    for (const playerData of players500to549) {
      try {
        // Check if player already exists
        const existingPlayer = await LadderPlayer.findOne({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          ladderName: playerData.ladderName
        });

        if (existingPlayer) {
          console.log(`   ⚠️  Player already exists: ${playerData.firstName} ${playerData.lastName} (Position ${playerData.position})`);
          continue;
        }

        // Create new player
        const newPlayer = new LadderPlayer({
          ...playerData,
          wins: 0,
          losses: 0,
          totalMatches: 0,
          immunityUntil: null,
          isSuspended: false,
          vacationMode: playerData.status === 'VACATION',
          vacationUntil: playerData.status === 'VACATION' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days from now
        });

        await newPlayer.save();
        console.log(`   ✅ Added: ${playerData.firstName} ${playerData.lastName} (Position ${playerData.position}, Fargo: ${playerData.fargoRate})`);
      } catch (error) {
        console.log(`   ❌ Error adding ${playerData.firstName} ${playerData.lastName}: ${error.message}`);
      }
    }

    console.log('\n📊 Adding 550+ Ladder Players...');
    for (const playerData of players550Plus) {
      try {
        // Check if player already exists
        const existingPlayer = await LadderPlayer.findOne({
          firstName: playerData.firstName,
          lastName: playerData.lastName,
          ladderName: playerData.ladderName
        });

        if (existingPlayer) {
          console.log(`   ⚠️  Player already exists: ${playerData.firstName} ${playerData.lastName} (Position ${playerData.position})`);
          continue;
        }

        // Create new player
        const newPlayer = new LadderPlayer({
          ...playerData,
          wins: 0,
          losses: 0,
          totalMatches: 0,
          immunityUntil: null,
          isSuspended: false,
          vacationMode: false,
          vacationUntil: null
        });

        await newPlayer.save();
        console.log(`   ✅ Added: ${playerData.firstName} ${playerData.lastName} (Position ${playerData.position}, Fargo: ${playerData.fargoRate})`);
      } catch (error) {
        console.log(`   ❌ Error adding ${playerData.firstName} ${playerData.lastName}: ${error.message}`);
      }
    }

    // Verify the results
    console.log('\n🔍 VERIFICATION:');
    console.log('================');
    
    const ladder500to549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ position: 1 });
    const ladder550Plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ position: 1 });

    console.log(`\n📊 500-549 Ladder: ${ladder500to549.length} players`);
    ladder500to549.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate}) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    console.log(`\n📊 550+ Ladder: ${ladder550Plus.length} players`);
    ladder550Plus.forEach(player => {
      console.log(`   ${player.position}. ${player.firstName} ${player.lastName} (${player.fargoRate}) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    });

    console.log('\n✅ Script completed successfully!');
    console.log('🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

add500PlusPlayers();
