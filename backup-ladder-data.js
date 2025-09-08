// Script to backup all ladder data before testing
// This will save all players, matches, challenges, and rankings
// Usage: node backup-ladder-data.js [original|hourly]

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

async function backupLadderData(backupType = 'original') {
  try {
    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    // Create backup directory based on type
    let backupDir;
    if (backupType === 'original') {
      backupDir = './ladder-backups/original-state';
      console.log('📁 Creating ORIGINAL STATE backup...\n');
    } else if (backupType === 'hourly') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupDir = `./ladder-backups/hourly-backups/backup-${timestamp}`;
      console.log('📁 Creating HOURLY backup...\n');
    } else {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      backupDir = `./ladder-backups/backup-${timestamp}`;
      console.log('📁 Creating MANUAL backup...\n');
    }
    
    if (!fs.existsSync('./ladder-backups')) {
      fs.mkdirSync('./ladder-backups');
    }
    if (backupType === 'hourly' && !fs.existsSync('./ladder-backups/hourly-backups')) {
      fs.mkdirSync('./ladder-backups/hourly-backups');
    }
    fs.mkdirSync(backupDir, { recursive: true });
    
    console.log(`📁 Created backup directory: ${backupDir}\n`);

    // Backup all ladders
    console.log('📊 Backing up ladder configurations...');
    const ladders = await Ladder.find({});
    fs.writeFileSync(
      path.join(backupDir, 'ladders.json'), 
      JSON.stringify(ladders, null, 2)
    );
    console.log(`   ✅ Backed up ${ladders.length} ladder configurations`);

    // Backup all ladder players
    console.log('👥 Backing up ladder players...');
    const players = await LadderPlayer.find({});
    fs.writeFileSync(
      path.join(backupDir, 'ladder-players.json'), 
      JSON.stringify(players, null, 2)
    );
    console.log(`   ✅ Backed up ${players.length} ladder players`);

    // Backup all ladder matches
    console.log('🏆 Backing up ladder matches...');
    const matches = await LadderMatch.find({});
    fs.writeFileSync(
      path.join(backupDir, 'ladder-matches.json'), 
      JSON.stringify(matches, null, 2)
    );
    console.log(`   ✅ Backed up ${matches.length} ladder matches`);

    // Backup all ladder challenges
    console.log('⚔️ Backing up ladder challenges...');
    const challenges = await LadderChallenge.find({});
    fs.writeFileSync(
      path.join(backupDir, 'ladder-challenges.json'), 
      JSON.stringify(challenges, null, 2)
    );
    console.log(`   ✅ Backed up ${challenges.length} ladder challenges`);

    // Create summary file
    const summary = {
      backupDate: new Date().toISOString(),
      ladders: ladders.length,
      players: players.length,
      matches: matches.length,
      challenges: challenges.length,
      ladderNames: ladders.map(l => l.name),
      playerCountByLadder: {}
    };

    // Count players by ladder
    for (const ladder of ladders) {
      const playerCount = players.filter(p => p.ladderName === ladder.name).length;
      summary.playerCountByLadder[ladder.name] = playerCount;
    }

    fs.writeFileSync(
      path.join(backupDir, 'backup-summary.json'), 
      JSON.stringify(summary, null, 2)
    );

    console.log('\n📋 BACKUP SUMMARY:');
    console.log('==================');
    console.log(`📅 Backup Date: ${summary.backupDate}`);
    console.log(`🏆 Ladders: ${summary.ladders}`);
    console.log(`👥 Players: ${summary.players}`);
    console.log(`🏆 Matches: ${summary.matches}`);
    console.log(`⚔️ Challenges: ${summary.challenges}`);
    console.log('\n📊 Players by Ladder:');
    Object.entries(summary.playerCountByLadder).forEach(([ladder, count]) => {
      console.log(`   ${ladder}: ${count} players`);
    });

    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup location: ${backupDir}`);
    
    if (backupType === 'original') {
      console.log(`\n💡 This is your ORIGINAL STATE backup!`);
      console.log(`   To restore to original state: node restore-ladder-data.js ${backupDir}`);
    } else if (backupType === 'hourly') {
      console.log(`\n💡 This is an HOURLY backup!`);
      console.log(`   To restore: node restore-ladder-data.js ${backupDir}`);
    } else {
      console.log(`\n💡 To restore this backup later, run:`);
      console.log(`   node restore-ladder-data.js ${backupDir}`);
    }
    
  } catch (error) {
    console.error('❌ Backup error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Get backup type from command line arguments
const backupType = process.argv[2] || 'original';
backupLadderData(backupType).catch(console.error);
