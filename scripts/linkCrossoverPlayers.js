import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import User from '../src/models/User.js';

dotenv.config();

const linkCrossoverPlayers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🔗 Linking crossover players between league and ladder...');
    
    // Get all league players
    const leaguePlayers = await User.find({ isApproved: true, isActive: true });
    console.log(`📊 Found ${leaguePlayers.length} active league players`);
    
    // Get all ladder players
    const ladderPlayers = await LadderPlayer.find({});
    console.log(`📊 Found ${ladderPlayers.length} ladder players`);
    
    let linked = 0;
    let notFound = 0;
    
    for (const leaguePlayer of leaguePlayers) {
      // Look for matching ladder player by name
      const matchingLadderPlayer = ladderPlayers.find(ladderPlayer => 
        ladderPlayer.firstName.toLowerCase() === leaguePlayer.firstName.toLowerCase() &&
        ladderPlayer.lastName.toLowerCase() === leaguePlayer.lastName.toLowerCase()
      );
      
      if (matchingLadderPlayer) {
        // Link them by setting the email
        if (!matchingLadderPlayer.email) {
          matchingLadderPlayer.email = leaguePlayer.email.toLowerCase();
          await matchingLadderPlayer.save();
          console.log(`✅ Linked: ${leaguePlayer.firstName} ${leaguePlayer.lastName} (${leaguePlayer.email})`);
          linked++;
        } else {
          console.log(`⏭️  Already linked: ${leaguePlayer.firstName} ${leaguePlayer.lastName}`);
        }
      } else {
        console.log(`❌ No ladder match found: ${leaguePlayer.firstName} ${leaguePlayer.lastName}`);
        notFound++;
      }
    }

    console.log('\n🎉 Crossover player linking completed!');
    console.log(`✅ Linked: ${linked} players`);
    console.log(`❌ Not found in ladder: ${notFound} players`);
    console.log('✅ Crossover players should now be recognized properly');

  } catch (error) {
    console.error('❌ Error linking crossover players:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

console.log(`
🚀 LINK CROSSOVER PLAYERS
==========================

📋 This script will:
1. Find all active league players
2. Match them with ladder players by name
3. Set email addresses on ladder players
4. Enable proper recognition for crossover players

🎯 This will fix the asterisk (*) issue for crossover players
`);

linkCrossoverPlayers();
