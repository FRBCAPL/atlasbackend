// Script to restore ladder data from a backup
// Usage: node restore-ladder-data.js <backup-directory>

import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';
import LadderMatch from './src/models/LadderMatch.js';
import LadderChallenge from './src/models/LadderChallenge.js';
import Ladder from './src/models/Ladder.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function restoreLadderData(backupDir) {
  try {
    if (!backupDir) {
      console.log('❌ Please provide backup directory path');
      console.log('Usage: node restore-ladder-data.js <backup-directory>');
      return;
    }

    if (!fs.existsSync(backupDir)) {
      console.log(`❌ Backup directory not found: ${backupDir}`);
      return;
    }

    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('⚠️  WARNING: This will DELETE all current ladder data!');
    console.log('⚠️  Make sure you have a current backup before proceeding!');
    console.log(`📁 Restoring from: ${backupDir}\n`);

    // Read backup summary
    const summaryPath = path.join(backupDir, 'backup-summary.json');
    if (fs.existsSync(summaryPath)) {
      const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
      console.log('📋 BACKUP SUMMARY:');
      console.log(`📅 Backup Date: ${summary.backupDate}`);
      console.log(`🏆 Ladders: ${summary.ladders}`);
      console.log(`👥 Players: ${summary.players}`);
      console.log(`🏆 Matches: ${summary.matches}`);
      console.log(`⚔️ Challenges: ${summary.challenges}\n`);
    }

    // Clear existing data
    console.log('🧹 Clearing existing ladder data...');
    await LadderChallenge.deleteMany({});
    await LadderMatch.deleteMany({});
    await LadderPlayer.deleteMany({});
    await Ladder.deleteMany({});
    console.log('   ✅ Cleared existing data\n');

    // Restore ladders
    console.log('📊 Restoring ladder configurations...');
    const laddersData = JSON.parse(fs.readFileSync(path.join(backupDir, 'ladders.json'), 'utf8'));
    for (const ladderData of laddersData) {
      const ladder = new Ladder(ladderData);
      await ladder.save();
    }
    console.log(`   ✅ Restored ${laddersData.length} ladder configurations`);

    // Restore players
    console.log('👥 Restoring ladder players...');
    const playersData = JSON.parse(fs.readFileSync(path.join(backupDir, 'ladder-players.json'), 'utf8'));
    for (const playerData of playersData) {
      const player = new LadderPlayer(playerData);
      await player.save();
    }
    console.log(`   ✅ Restored ${playersData.length} ladder players`);

    // Restore matches
    console.log('🏆 Restoring ladder matches...');
    const matchesData = JSON.parse(fs.readFileSync(path.join(backupDir, 'ladder-matches.json'), 'utf8'));
    for (const matchData of matchesData) {
      const match = new LadderMatch(matchData);
      await match.save();
    }
    console.log(`   ✅ Restored ${matchesData.length} ladder matches`);

    // Restore challenges
    console.log('⚔️ Restoring ladder challenges...');
    const challengesData = JSON.parse(fs.readFileSync(path.join(backupDir, 'ladder-challenges.json'), 'utf8'));
    for (const challengeData of challengesData) {
      const challenge = new LadderChallenge(challengeData);
      await challenge.save();
    }
    console.log(`   ✅ Restored ${challengesData.length} ladder challenges`);

    console.log('\n🎉 RESTORE COMPLETED SUCCESSFULLY!');
    console.log('Your ladder data has been restored to the backup state.');
    
  } catch (error) {
    console.error('❌ Restore error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Get backup directory from command line arguments
const backupDir = process.argv[2];
restoreLadderData(backupDir).catch(console.error);
