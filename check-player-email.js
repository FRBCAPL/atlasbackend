import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkPlayerEmail = async () => {
  await connectDB();

  try {
    // Look for players that might be you based on common patterns
    const possibleEmails = [
      'frbcapl@gmail.com',
      'sslampro@gmail.com', // This was in the match data
      'mark.slam@gmail.com',
      'mark@gmail.com'
    ];

    console.log('🔍 Checking for your player account...\n');

    for (const email of possibleEmails) {
      const player = await LadderPlayer.findOne({ email: email.toLowerCase() });
      if (player) {
        console.log(`✅ Found player with email: ${email}`);
        console.log(`   Name: ${player.firstName} ${player.lastName}`);
        console.log(`   Ladder: ${player.ladderName}`);
        console.log(`   Position: ${player.position}`);
        console.log(`   Active: ${player.isActive}`);
        console.log(`   Player ID: ${player._id}`);
        console.log('');
      } else {
        console.log(`❌ No player found with email: ${email}`);
      }
    }

    // Also search by name patterns
    console.log('🔍 Searching by name patterns...\n');
    
    const namePatterns = ['Mark', 'Slam', 'Admin'];
    for (const name of namePatterns) {
      const players = await LadderPlayer.find({
        $or: [
          { firstName: { $regex: name, $options: 'i' } },
          { lastName: { $regex: name, $options: 'i' } }
        ]
      });
      
      if (players.length > 0) {
        console.log(`✅ Found players with name containing "${name}":`);
        players.forEach(player => {
          console.log(`   ${player.firstName} ${player.lastName} - ${player.email} - ${player.ladderName}`);
        });
        console.log('');
      }
    }

    // Show all players in the 500-549 ladder (where you're looking)
    console.log('🔍 All players in 500-549 ladder:');
    const ladderPlayers = await LadderPlayer.find({ ladderName: '500-549' });
    ladderPlayers.forEach(player => {
      console.log(`   ${player.firstName} ${player.lastName} - ${player.email} - Position ${player.position}`);
    });

  } catch (error) {
    console.error('❌ Error checking player email:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkPlayerEmail();
