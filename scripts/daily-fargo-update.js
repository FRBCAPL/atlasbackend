#!/usr/bin/env node

/**
 * Daily Fargo Rating Update Script
 * 
 * This script can be run manually or scheduled to check and update Fargo ratings.
 * It provides options for:
 * 1. Manual rating input
 * 2. File-based rating updates
 * 3. Backup creation
 * 4. Update logging
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fargoUpdateService from '../src/services/fargoUpdateService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    console.log('🏓 Daily Fargo Rating Update Tool');
    console.log('==================================\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get current date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Update Date: ${today}\n`);

    // Show current ratings
    console.log('📊 Current Ratings Summary:');
    const ladders = ['499-under', '500-549', '550-plus'];
    
    for (const ladderName of ladders) {
      try {
        const ratings = await fargoUpdateService.getCurrentRatings(ladderName);
        const withRatings = ratings.filter(r => r.fargoRate > 0).length;
        const withoutRatings = ratings.length - withRatings;
        console.log(`  ${ladderName}: ${ratings.length} players (${withRatings} with ratings, ${withoutRatings} without)`);
      } catch (error) {
        console.log(`  ${ladderName}: Error loading ratings - ${error.message}`);
      }
    }
    console.log('');

    // Ask what to do
    console.log('What would you like to do?');
    console.log('1. Update ratings manually');
    console.log('2. Update ratings from file');
    console.log('3. Create backup only');
    console.log('4. View update history');
    console.log('5. Exit');

    const choice = await askQuestion('\nEnter your choice (1-5): ');

    switch (choice) {
      case '1':
        await manualUpdate();
        break;
      case '2':
        await fileUpdate();
        break;
      case '3':
        await createBackup();
        break;
      case '4':
        await viewHistory();
        break;
      case '5':
        console.log('👋 Goodbye!');
        break;
      default:
        console.log('❌ Invalid choice');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    fargoUpdateService.log(`Daily update script error: ${error.message}`, 'ERROR');
  } finally {
    rl.close();
    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');
  }
}

async function manualUpdate() {
  console.log('\n📝 Manual Rating Update');
  console.log('=======================');

  const ladderName = await askQuestion('Enter ladder name (499-under, 500-549, 550-plus): ');
  
  if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
    console.log('❌ Invalid ladder name');
    return;
  }

  console.log('\nEnter ratings (one per line, press Enter twice when done):');
  console.log('Use 0 or leave empty for no rating');
  
  const ratings = [];
  let line;
  
  do {
    line = await askQuestion(`Rating ${ratings.length + 1}: `);
    if (line.trim()) {
      const rating = parseInt(line.trim());
      ratings.push(isNaN(rating) ? null : rating);
    }
  } while (line.trim() !== '');

  if (ratings.length === 0) {
    console.log('❌ No ratings entered');
    return;
  }

  console.log(`\n📊 You entered ${ratings.length} ratings`);
  console.log('Ratings:', ratings.map(r => r || 'No Rating').join(', '));

  const confirm = await askQuestion('\nProceed with update? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Update cancelled');
    return;
  }

  try {
    // Create backup first
    console.log('💾 Creating backup...');
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    console.log(`✅ Backup created: ${backupPath}`);

    // Update ratings
    console.log('🔄 Updating ratings...');
    const results = await fargoUpdateService.updateFargoRatings(ratings, ladderName);
    
    console.log('\n✅ Update completed!');
    console.log(`📈 Updated: ${results.updated}`);
    console.log(`📊 Unchanged: ${results.unchanged}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    if (results.changes.length > 0) {
      console.log('\n📝 Changes made:');
      results.changes.forEach(change => {
        console.log(`  ${change.player}: ${change.oldRating} → ${change.newRating}`);
      });
    }
    
  } catch (error) {
    console.log(`❌ Update failed: ${error.message}`);
  }
}

async function fileUpdate() {
  console.log('\n📁 File-based Rating Update');
  console.log('===========================');

  const filePath = await askQuestion('Enter path to ratings file: ');
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ File not found');
    return;
  }

  const ladderName = await askQuestion('Enter ladder name (499-under, 500-549, 550-plus): ');
  
  if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
    console.log('❌ Invalid ladder name');
    return;
  }

  try {
    console.log('📖 Reading file...');
    const ratings = await fargoUpdateService.loadRatingsFromFile(filePath);
    console.log(`📊 Loaded ${ratings.length} ratings from file`);

    const confirm = await askQuestion('\nProceed with update? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Update cancelled');
      return;
    }

    // Create backup first
    console.log('💾 Creating backup...');
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    console.log(`✅ Backup created: ${backupPath}`);

    // Update ratings
    console.log('🔄 Updating ratings...');
    const results = await fargoUpdateService.updateFargoRatings(ratings, ladderName);
    
    console.log('\n✅ Update completed!');
    console.log(`📈 Updated: ${results.updated}`);
    console.log(`📊 Unchanged: ${results.unchanged}`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
  } catch (error) {
    console.log(`❌ Update failed: ${error.message}`);
  }
}

async function createBackup() {
  console.log('\n💾 Create Backup');
  console.log('================');

  const ladderName = await askQuestion('Enter ladder name (499-under, 500-549, 550-plus): ');
  
  if (!['499-under', '500-549', '550-plus'].includes(ladderName)) {
    console.log('❌ Invalid ladder name');
    return;
  }

  try {
    console.log('💾 Creating backup...');
    const backupPath = await fargoUpdateService.createBackup(ladderName);
    console.log(`✅ Backup created: ${backupPath}`);
  } catch (error) {
    console.log(`❌ Backup failed: ${error.message}`);
  }
}

async function viewHistory() {
  console.log('\n📜 Update History');
  console.log('=================');

  try {
    const history = await fargoUpdateService.getUpdateHistory(20);
    
    if (history.length === 0) {
      console.log('No update history found.');
      return;
    }

    console.log('Recent updates:');
    history.forEach(item => {
      const timestamp = new Date(item.timestamp).toLocaleString();
      console.log(`[${timestamp}] [${item.level}] ${item.message}`);
    });
  } catch (error) {
    console.log(`❌ Error loading history: ${error.message}`);
  }
}

// Run the script
main().catch(console.error);

