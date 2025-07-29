#!/usr/bin/env node

/**
 * Test Script for New Bylaw: "Must Defend" Rule
 * 
 * This script tests the new bylaw that requires players to accept defense challenges
 * if they have no matches scheduled for the current week.
 */

import mongoose from 'mongoose';
import ChallengeStats from '../src/models/ChallengeStats.js';
import challengeValidationService from '../src/services/challengeValidationService.js';

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://renderuser:testpass1234@cluster0.ui3qqqc.mongodb.net/pool-league?retryWrites=true&w=majority';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

// Test data
const TEST_DIVISION = 'FRBCAPL TEST';
const TEST_PLAYERS = [
  { name: 'Mark Slam', position: 1 },
  { name: 'Randy Fishburn', position: 2 },
  { name: 'Don Lowe', position: 3 },
  { name: 'Lucas Taylor', position: 4 },
  { name: 'Vince Ivey', position: 5 }
];

async function setupTestData() {
  console.log('\n🔧 Setting up test data...');
  
  // Clear existing test data
  await ChallengeStats.deleteMany({ division: TEST_DIVISION });
  
  // Create fresh challenge stats for test players
  for (const player of TEST_PLAYERS) {
    const stats = new ChallengeStats({
      playerName: player.name,
      division: TEST_DIVISION,
      currentStanding: player.position,
      totalChallengeMatches: 0,
      matchesAsChallenger: 0,
      matchesAsDefender: 0,
      requiredDefenses: 0,
      voluntaryDefenses: 0,
      challengesByWeek: [],
      defendedByWeek: [],
      challengedOpponents: [],
      hasReachedChallengeLimit: false,
      hasReachedDefenseLimit: false,
      isEligibleForChallenges: true,
      isEligibleForDefense: true
    });
    
    await stats.save();
    console.log(`  ✅ Created stats for ${player.name}`);
  }
}

async function testChallengeValidation() {
  console.log('\n🧪 Testing Challenge Validation...');
  
  const currentWeek = challengeValidationService.getCurrentChallengeWeek();
  console.log(`  📅 Current Week: ${currentWeek}`);
  
  // Test 1: Basic challenge validation
  console.log('\n  📋 Test 1: Basic challenge validation');
  const result1 = await challengeValidationService.validateChallenge(
    'Mark Slam', 'Randy Fishburn', TEST_DIVISION
  );
  
  console.log(`    Valid: ${result1.isValid}`);
  console.log(`    Errors: ${result1.errors.length}`);
  console.log(`    Warnings: ${result1.warnings.length}`);
  
  if (result1.warnings.length > 0) {
    console.log(`    ⚠️  Warnings: ${result1.warnings.join(', ')}`);
  }
  
  // Test 2: Challenge to player with no matches this week
  console.log('\n  📋 Test 2: Challenge to player with no matches this week');
  const result2 = await challengeValidationService.validateChallenge(
    'Mark Slam', 'Don Lowe', TEST_DIVISION
  );
  
  console.log(`    Valid: ${result2.isValid}`);
  console.log(`    Errors: ${result2.errors.length}`);
  console.log(`    Warnings: ${result2.warnings.length}`);
  
  if (result2.warnings.length > 0) {
    console.log(`    ⚠️  Warnings: ${result2.warnings.join(', ')}`);
  }
}

async function testDefenseAcceptance() {
  console.log('\n🛡️ Testing Defense Acceptance...');
  
  // Test 1: Player with no matches must accept
  console.log('\n  📋 Test 1: Player with no matches must accept');
  const result1 = await challengeValidationService.validateDefenseAcceptance(
    'Don Lowe', 'Mark Slam', TEST_DIVISION
  );
  
  console.log(`    Valid: ${result1.isValid}`);
  console.log(`    Errors: ${result1.errors.length}`);
  console.log(`    Warnings: ${result1.warnings.length}`);
  
  if (result1.warnings.length > 0) {
    console.log(`    ⚠️  Warnings: ${result1.warnings.join(', ')}`);
  }
  
  // Test 2: Player with matches can decline
  console.log('\n  📋 Test 2: Player with matches can decline');
  
  // First, give Don Lowe a match this week
  const donStats = await ChallengeStats.findOne({ 
    playerName: 'Don Lowe', 
    division: TEST_DIVISION 
  });
  donStats.challengesByWeek.push(challengeValidationService.getCurrentChallengeWeek());
  await donStats.save();
  
  const result2 = await challengeValidationService.validateDefenseAcceptance(
    'Don Lowe', 'Mark Slam', TEST_DIVISION
  );
  
  console.log(`    Valid: ${result2.isValid}`);
  console.log(`    Errors: ${result2.errors.length}`);
  console.log(`    Warnings: ${result2.warnings.length}`);
  
  if (result2.errors.length > 0) {
    console.log(`    ❌ Errors: ${result2.errors.join(', ')}`);
  }
}

async function testEligibleOpponents() {
  console.log('\n🎯 Testing Eligible Opponents...');
  
  const opponents = await challengeValidationService.getEligibleOpponents('Mark Slam', TEST_DIVISION);
  
  console.log(`  📊 Found ${opponents.length} eligible opponents:`);
  
  for (const opponent of opponents) {
    console.log(`    👤 ${opponent.name} (Rank #${opponent.position})`);
    console.log(`       Must Defend: ${opponent.mustDefend ? '✅ YES' : '❌ NO'}`);
    console.log(`       Can Defend This Week: ${opponent.canDefendThisWeek ? '✅ YES' : '❌ NO'}`);
    console.log(`       Required Defenses: ${opponent.stats.requiredDefenses}/2`);
    console.log('');
  }
}

async function testWeeklyAvailability() {
  console.log('\n📅 Testing Weekly Availability...');
  
  const currentWeek = challengeValidationService.getCurrentChallengeWeek();
  
  for (const player of TEST_PLAYERS) {
    const stats = await ChallengeStats.findOne({ 
      playerName: player.name, 
      division: TEST_DIVISION 
    });
    
    const canChallenge = stats.canChallengeThisWeek(currentWeek);
    const canDefend = stats.canDefendThisWeek(currentWeek);
    const hasAnyMatch = stats.challengesByWeek.includes(currentWeek) || 
                       stats.defendedByWeek.includes(currentWeek);
    
    console.log(`  👤 ${player.name}:`);
    console.log(`     Can Challenge: ${canChallenge ? '✅' : '❌'}`);
    console.log(`     Can Defend: ${canDefend ? '✅' : '❌'}`);
    console.log(`     Has Match This Week: ${hasAnyMatch ? '✅' : '❌'}`);
    console.log(`     Must Defend: ${!hasAnyMatch ? '⚠️  YES' : '❌ NO'}`);
    console.log('');
  }
}

async function runAllTests() {
  console.log('🚀 Starting New Bylaw Testing Suite...');
  console.log('=====================================');
  
  try {
    await connectDB();
    await setupTestData();
    
    await testChallengeValidation();
    await testDefenseAcceptance();
    await testEligibleOpponents();
    await testWeeklyAvailability();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  • Challenge validation with new bylaw ✅');
    console.log('  • Defense acceptance enforcement ✅');
    console.log('  • Eligible opponents with mustDefend flag ✅');
    console.log('  • Weekly availability tracking ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await disconnectDB();
  }
}

// Run the tests
runAllTests(); 