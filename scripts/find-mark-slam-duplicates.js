import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const findMarkSlamDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Searching for Mark Slam entries...\n');

    // Search in User collection (league players)
    console.log('📋 Searching in User collection (league players):');
    const leaguePlayers = await User.find({
      $or: [
        { firstName: 'Mark', lastName: 'Slam' },
        { firstName: 'Mark', lastName: { $regex: /Slam/i } },
        { email: { $regex: /mark.*slam/i } }
      ]
    }).lean();

    console.log(`Found ${leaguePlayers.length} Mark Slam entries in User collection:`);
    leaguePlayers.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`     Email: ${player.email}`);
      console.log(`     Phone: ${player.phone}`);
      console.log(`     ID: ${player._id}`);
      console.log(`     Divisions: ${player.divisions?.join(', ') || 'None'}`);
      console.log('');
    });

    // Search in LadderPlayer collection (ladder players)
    console.log('📋 Searching in LadderPlayer collection (ladder players):');
    const ladderPlayers = await LadderPlayer.find({
      $or: [
        { firstName: 'Mark', lastName: 'Slam' },
        { firstName: 'Mark', lastName: { $regex: /Slam/i } },
        { email: { $regex: /mark.*slam/i } }
      ]
    }).lean();

    console.log(`Found ${ladderPlayers.length} Mark Slam entries in LadderPlayer collection:`);
    ladderPlayers.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`     Email: ${player.email}`);
      console.log(`     Ladder: ${player.ladderName}`);
      console.log(`     Position: ${player.position}`);
      console.log(`     ID: ${player._id}`);
      console.log('');
    });

    // Search for any entries with example.com emails
    console.log('📋 Searching for any entries with example.com emails:');
    const exampleComUsers = await User.find({
      email: { $regex: /example\.com$/i }
    }).lean();

    console.log(`Found ${exampleComUsers.length} users with example.com emails:`);
    exampleComUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Phone: ${user.phone}`);
      console.log(`     ID: ${user._id}`);
      console.log('');
    });

    const exampleComLadderPlayers = await LadderPlayer.find({
      email: { $regex: /example\.com$/i }
    }).lean();

    console.log(`Found ${exampleComLadderPlayers.length} ladder players with example.com emails:`);
    exampleComLadderPlayers.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`     Email: ${player.email}`);
      console.log(`     Ladder: ${player.ladderName}`);
      console.log(`     ID: ${player._id}`);
      console.log('');
    });

    // Provide recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Keep the entry with frbcapl@gmail.com (your real email)');
    console.log('2. Delete any entries with mark.slam@example.com (test data)');
    console.log('3. If there are multiple entries with frbcapl@gmail.com, keep the most complete one');
    console.log('');
    console.log('To delete a specific entry, use the ID shown above with:');
    console.log('  - For User collection: User.findByIdAndDelete("ID_HERE")');
    console.log('  - For LadderPlayer collection: LadderPlayer.findByIdAndDelete("ID_HERE")');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

findMarkSlamDuplicates();
