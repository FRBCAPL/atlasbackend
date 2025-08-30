import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

dotenv.config();

const checkCurrentLadder = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const players = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    
    console.log('\n📋 Current 499-under ladder players:');
    console.log('=====================================');
    
    players.forEach(p => {
      const emailStatus = p.email ? `Email: ${p.email}` : 'No email (needs setup)';
      const activeStatus = p.isActive ? 'Active' : 'Inactive';
      console.log(`${p.position}. ${p.firstName} ${p.lastName} (${p.fargoRate}) - ${emailStatus} - ${activeStatus}`);
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total players: ${players.length}`);
    
    const playersWithEmail = players.filter(p => p.email);
    const playersWithoutEmail = players.filter(p => !p.email);
    
    console.log(`   Players with email: ${playersWithEmail.length}`);
    console.log(`   Players without email: ${playersWithoutEmail.length}`);
    
    // Check for potential fake players (common fake names)
    const fakeNames = ['Lisa Thompson', 'Michael Scott', 'David Wallace', 'Karen Johnson', 'Stanley Hudson', 'Jim Halpert', 'Pam Beesly'];
    const potentialFakes = players.filter(p => {
      const fullName = `${p.firstName} ${p.lastName}`;
      return fakeNames.includes(fullName);
    });
    
    if (potentialFakes.length > 0) {
      console.log(`\n⚠️  Potential fake players found:`);
      potentialFakes.forEach(p => {
        console.log(`   - ${p.firstName} ${p.lastName} (Position ${p.position})`);
      });
    } else {
      console.log(`\n✅ No obvious fake players detected`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

checkCurrentLadder();
