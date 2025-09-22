import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LadderPlayer from './src/models/LadderPlayer.js';
import Ladder from './src/models/Ladder.js';

dotenv.config();

const restoreMissingPlayers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the 499-under ladder
    const ladder = await Ladder.findOne({ name: '499-under' });
    if (!ladder) {
      console.log('❌ 499-under ladder not found');
      return;
    }

    console.log('\n🔍 Checking for missing players...');

    // Check if Tony Neumann exists
    const tonyNeumann = await LadderPlayer.findOne({ 
      firstName: 'Tony', 
      lastName: 'Neumann' 
    });

    if (!tonyNeumann) {
      console.log('📝 Tony Neumann not found - creating new player...');
      
      // Create Tony Neumann at position 11
      const newTony = new LadderPlayer({
        firstName: 'Tony',
        lastName: 'Neumann',
        email: '', // Will need to be set later
        ladderId: ladder._id,
        ladderName: '499-under',
        position: 11,
        fargoRate: 450, // Using the most recent data
        wins: 5,
        losses: 1,
        isActive: true,
        totalMatches: 6
      });

      await newTony.save();
      console.log('✅ Tony Neumann created at position 11');
    } else {
      console.log('✅ Tony Neumann already exists');
    }

    // Check Christopher Anderson status
    const chrisAnderson = await LadderPlayer.findOne({ 
      firstName: 'Christopher', 
      lastName: 'Anderson' 
    });

    if (chrisAnderson) {
      if (!chrisAnderson.isActive) {
        console.log('📝 Christopher Anderson is inactive - reactivating...');
        chrisAnderson.isActive = true;
        await chrisAnderson.save();
        console.log('✅ Christopher Anderson reactivated');
      } else {
        console.log('✅ Christopher Anderson is already active');
      }
    } else {
      console.log('❌ Christopher Anderson not found in database');
    }

    // Now we need to reorder positions since we inserted Tony at position 11
    console.log('\n🔄 Reordering ladder positions...');
    
    const allPlayers = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    
    // Move everyone from position 11 and up down by 1 position
    for (let i = 0; i < allPlayers.length; i++) {
      const player = allPlayers[i];
      if (player.position >= 11 && player.firstName !== 'Tony' && player.lastName !== 'Neumann') {
        player.position = player.position + 1;
        await player.save();
      }
    }

    // Set Tony to position 11
    if (tonyNeumann) {
      tonyNeumann.position = 11;
      await tonyNeumann.save();
    } else {
      const newTony = await LadderPlayer.findOne({ firstName: 'Tony', lastName: 'Neumann' });
      if (newTony) {
        newTony.position = 11;
        await newTony.save();
      }
    }

    console.log('\n📋 Updated ladder positions:');
    const updatedPlayers = await LadderPlayer.find({ ladderName: '499-under' }).sort({ position: 1 });
    
    updatedPlayers.forEach((player, index) => {
      if (player.firstName === 'Tony' && player.lastName === 'Neumann') {
        console.log(`🎯 ${player.position}. ${player.firstName} ${player.lastName} - ${player.fargoRate} (${player.wins}W/${player.losses}L) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'} - RESTORED`);
      } else if (player.firstName === 'Christopher' && player.lastName === 'Anderson') {
        console.log(`🎯 ${player.position}. ${player.firstName} ${player.lastName} - ${player.fargoRate} (${player.wins}W/${player.losses}L) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'} - REACTIVATED`);
      } else {
        console.log(`${player.position}. ${player.firstName} ${player.lastName} - ${player.fargoRate} (${player.wins}W/${player.losses}L) - ${player.isActive ? 'ACTIVE' : 'INACTIVE'}`);
      }
    });

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    console.log('\n✅ Player restoration completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

restoreMissingPlayers();
