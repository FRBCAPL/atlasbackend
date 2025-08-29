import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from '../src/models/LadderPlayer.js';
import User from '../src/models/User.js';

dotenv.config();

const checkLucasTaylor = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for Lucas Taylor in ladder database
    console.log('\n🔍 Checking Ladder Database for Lucas Taylor...');
    const ladderLucas = await LadderPlayer.findOne({
      firstName: { $regex: /^Lucas$/i },
      lastName: { $regex: /^Taylor$/i }
    });

    if (ladderLucas) {
      console.log('✅ Found Lucas Taylor in Ladder Database:');
      console.log(`  Name: ${ladderLucas.firstName} ${ladderLucas.lastName}`);
      console.log(`  Email: ${ladderLucas.email || 'No email'}`);
      console.log(`  Fargo Rate: ${ladderLucas.fargoRate}`);
      console.log(`  Ladder: ${ladderLucas.ladderName}`);
      console.log(`  Position: ${ladderLucas.position}`);
      console.log(`  Wins: ${ladderLucas.wins || 0}`);
      console.log(`  Losses: ${ladderLucas.losses || 0}`);
      console.log(`  Has PIN: ${ladderLucas.pin ? 'Yes' : 'No'}`);
      console.log(`  Is Active: ${ladderLucas.isActive}`);
    } else {
      console.log('❌ Lucas Taylor NOT found in Ladder Database');
    }

    // Check for Lucas Taylor in league database
    console.log('\n🔍 Checking League Database for Lucas Taylor...');
    const leagueLucas = await User.findOne({
      firstName: { $regex: /^Lucas$/i },
      lastName: { $regex: /^Taylor$/i }
    });

    if (leagueLucas) {
      console.log('✅ Found Lucas Taylor in League Database:');
      console.log(`  Name: ${leagueLucas.firstName} ${leagueLucas.lastName}`);
      console.log(`  Email: ${leagueLucas.email || 'No email'}`);
      console.log(`  Has PIN: ${leagueLucas.pin ? 'Yes' : 'No'}`);
      console.log(`  Is Approved: ${leagueLucas.isApproved}`);
      console.log(`  Is Active: ${leagueLucas.isActive}`);
    } else {
      console.log('❌ Lucas Taylor NOT found in League Database');
    }

    // Check all ladder players with similar names
    console.log('\n🔍 Checking for similar names in Ladder Database...');
    const similarLadderPlayers = await LadderPlayer.find({
      $or: [
        { firstName: { $regex: /lucas/i } },
        { lastName: { $regex: /taylor/i } }
      ]
    });

    if (similarLadderPlayers.length > 0) {
      console.log(`Found ${similarLadderPlayers.length} similar players in ladder:`);
      similarLadderPlayers.forEach(player => {
        console.log(`  - ${player.firstName} ${player.lastName} (${player.email || 'No email'})`);
      });
    } else {
      console.log('No similar players found in ladder database');
    }

    await mongoose.disconnect();
    console.log('\n✅ MongoDB disconnected');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

checkLucasTaylor();
