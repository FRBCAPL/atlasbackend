import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const removeLeaguePlayersFromLadder = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔧 Removing League Players from Ladder...\n');

    // Get all league users
    const leagueUsers = await User.find({});
    const leagueEmails = leagueUsers.map(user => user.email.toLowerCase());
    
    console.log(`📊 Found ${leagueUsers.length} league users`);

    // Find ladder players that were incorrectly added (have league emails)
    const incorrectlyAddedLadderPlayers = await LadderPlayer.find({
      email: { $in: leagueEmails }
    });

    console.log(`🔍 Found ${incorrectlyAddedLadderPlayers.length} ladder players with league emails`);

    if (incorrectlyAddedLadderPlayers.length > 0) {
      console.log('\n📝 Removing incorrectly added ladder players:');
      
      for (const player of incorrectlyAddedLadderPlayers) {
        console.log(`   ❌ Removing: ${player.firstName} ${player.lastName} (${player.email})`);
        await LadderPlayer.deleteOne({ _id: player._id });
      }

      console.log(`\n✅ Removed ${incorrectlyAddedLadderPlayers.length} league players from ladder`);
    }

    // Keep only the original ladder players (without emails or with non-league emails)
    const remainingLadderPlayers = await LadderPlayer.find({});
    const playersWithEmails = remainingLadderPlayers.filter(lp => lp.email);
    const playersWithoutEmails = remainingLadderPlayers.filter(lp => !lp.email);

    console.log(`\n📋 Final Ladder Status:`);
    console.log(`   Total Ladder Players: ${remainingLadderPlayers.length}`);
    console.log(`   Players with Email/PIN: ${playersWithEmails.length}`);
    console.log(`   Players without Email/PIN: ${playersWithoutEmails.length}`);

    if (playersWithoutEmails.length > 0) {
      console.log(`\n📝 Original Ladder Players (unclaimed):`);
      playersWithoutEmails.forEach(player => {
        console.log(`   - ${player.firstName} ${player.lastName} (Position ${player.position})`);
      });
    }

    console.log(`\n🎉 Ladder System Restored!`);
    console.log(`   Only original ladder players remain`);
    console.log(`   League players are separate`);
    console.log(`   Both apps use the same database structure`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error removing league players from ladder:', error);
    process.exit(1);
  }
};

console.log(`
🔧 REMOVE LEAGUE PLAYERS FROM LADDER
====================================

This script will remove the league players that were incorrectly
added to the ladder system, keeping only the original ladder players.

`);

removeLeaguePlayersFromLadder();
