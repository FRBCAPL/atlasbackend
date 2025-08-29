import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import LadderPlayer from '../src/models/LadderPlayer.js';

dotenv.config();

const fixDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get league user emails
    const leagueUsers = await User.find({});
    const leagueEmails = leagueUsers.map(u => u.email.toLowerCase());
    
    console.log(`Found ${leagueUsers.length} league users`);

    // Remove ladder players that have league emails
    const result = await LadderPlayer.deleteMany({
      email: { $in: leagueEmails }
    });

    console.log(`Removed ${result.deletedCount} league players from ladder`);

    // Show remaining ladder players
    const remainingLadderPlayers = await LadderPlayer.find({});
    console.log(`Remaining ladder players: ${remainingLadderPlayers.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixDatabase();
