import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import Ladder from '../src/models/Ladder.js';

dotenv.config();

const migrate500PlusLadder = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the new ladder references
    const ladder500_549 = await Ladder.findOne({ name: '500-549' });
    const ladder550_plus = await Ladder.findOne({ name: '550-plus' });

    if (!ladder500_549 || !ladder550_plus) {
      console.error('Required ladders not found. Please run initialize-ladders.js first.');
      process.exit(1);
    }

    // Find all players in the old 500+ ladder (or any player with FargoRate >= 500)
    const old500PlusPlayers = await LadderPlayer.find({
      $or: [
        { ladderName: '500-plus' },
        { fargoRate: { $gte: 500 } }
      ]
    });

    console.log(`Found ${old500PlusPlayers.length} players to migrate`);

    const migrationResults = {
      migratedTo500_549: 0,
      migratedTo550_plus: 0,
      errors: []
    };

    for (const player of old500PlusPlayers) {
      try {
        let newLadderName, newLadderId;

        // Determine new ladder based on FargoRate
        if (player.fargoRate >= 500 && player.fargoRate <= 549) {
          newLadderName = '500-549';
          newLadderId = ladder500_549._id;
        } else if (player.fargoRate >= 550) {
          newLadderName = '550-plus';
          newLadderId = ladder550_plus._id;
        } else {
          // This shouldn't happen, but just in case
          console.log(`Skipping player ${player.email} with FargoRate ${player.fargoRate}`);
          continue;
        }

        // Update player's ladder assignment
        player.ladderName = newLadderName;
        player.ladderId = newLadderId;

        // Reset position to be reassigned later
        player.position = 0;

        await player.save();

        if (newLadderName === '500-549') {
          migrationResults.migratedTo500_549++;
        } else {
          migrationResults.migratedTo550_plus++;
        }

        console.log(`Migrated ${player.firstName} ${player.lastName} (${player.fargoRate}) to ${newLadderName}`);

      } catch (error) {
        migrationResults.errors.push({
          player: player.email,
          error: error.message
        });
        console.error(`Error migrating player ${player.email}:`, error.message);
      }
    }

    // Reassign positions for both new ladders
    console.log('\nReassigning positions...');

    // 500-549 ladder
    const players500_549 = await LadderPlayer.find({ ladderName: '500-549' }).sort({ fargoRate: -1 });
    for (let i = 0; i < players500_549.length; i++) {
      players500_549[i].position = i + 1;
      await players500_549[i].save();
    }

    // 550+ ladder
    const players550_plus = await LadderPlayer.find({ ladderName: '550-plus' }).sort({ fargoRate: -1 });
    for (let i = 0; i < players550_plus.length; i++) {
      players550_plus[i].position = i + 1;
      await players550_plus[i].save();
    }

    console.log('\n=== Migration Results ===');
    console.log(`Migrated to 500-549: ${migrationResults.migratedTo500_549} players`);
    console.log(`Migrated to 550+: ${migrationResults.migratedTo550_plus} players`);
    console.log(`Errors: ${migrationResults.errors.length}`);

    if (migrationResults.errors.length > 0) {
      console.log('\nErrors:');
      migrationResults.errors.forEach(error => {
        console.log(`- ${error.player}: ${error.error}`);
      });
    }

    console.log('\nMigration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

migrate500PlusLadder();
