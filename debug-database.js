#!/usr/bin/env node

/**
 * Debug database connection and queries
 */

import mongoose from 'mongoose';
import LadderPlayer from './src/models/LadderPlayer.js';

async function debugDatabase() {
  try {
    console.log('🔍 Debug Database Connection');
    console.log('============================\n');

    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/frontrangepoolhub';
    console.log(`MongoDB URI: ${mongoUri}`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check database name
    console.log(`📊 Database name: ${mongoose.connection.db.databaseName}`);

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📋 Collections: ${collections.map(c => c.name).join(', ')}`);

    // Try different ways to count players
    console.log('\n🔍 Counting players...');
    
    try {
      const count1 = await LadderPlayer.countDocuments();
      console.log(`Count with countDocuments(): ${count1}`);
    } catch (e) {
      console.log(`Error with countDocuments(): ${e.message}`);
    }

    try {
      const count2 = await LadderPlayer.estimatedDocumentCount();
      console.log(`Count with estimatedDocumentCount(): ${count2}`);
    } catch (e) {
      console.log(`Error with estimatedDocumentCount(): ${e.message}`);
    }

    try {
      const count3 = await mongoose.connection.db.collection('ladderplayers').countDocuments();
      console.log(`Count with direct collection: ${count3}`);
    } catch (e) {
      console.log(`Error with direct collection: ${e.message}`);
    }

    // Try to get some players
    console.log('\n🔍 Getting players...');
    try {
      const players = await LadderPlayer.find().limit(5);
      console.log(`Found ${players.length} players with find():`);
      players.forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.firstName} ${player.lastName} (Ladder: ${player.ladderName}, Rating: ${player.fargoRate})`);
      });
    } catch (e) {
      console.log(`Error with find(): ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the debug
debugDatabase().catch(console.error);


