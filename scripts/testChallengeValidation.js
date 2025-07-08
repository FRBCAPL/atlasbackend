import mongoose from 'mongoose';
import challengeValidationService from '../src/services/challengeValidationService.js';

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-league';

async function testChallengeValidation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const division = 'FRBCAPL TEST';
    
    console.log('\n🧪 Testing Challenge Phase Validation');
    console.log('=====================================\n');

    // Test 1: Validate a valid challenge (lower ranked challenging higher ranked)
    console.log('Test 1: Valid Challenge (Tony Neumann challenging Jon Glennon)');
    const validChallenge = await challengeValidationService.validateChallenge(
      'Tony Neumann', // Rank 15
      'Jon Glennon',  // Rank 12 (3 spots above)
      division,
      false,
      null
    );
    
    console.log('Result:', validChallenge.isValid ? '✅ PASS' : '❌ FAIL');
    if (!validChallenge.isValid) {
      console.log('Errors:', validChallenge.errors);
    }
    if (validChallenge.warnings.length > 0) {
      console.log('Warnings:', validChallenge.warnings);
    }
    console.log('Current Week:', validChallenge.currentWeek);
    console.log('');

    // Test 2: Validate invalid challenge (higher ranked challenging lower ranked)
    console.log('Test 2: Invalid Challenge (Mark Slam challenging Randy Fishburn)');
    const invalidChallenge = await challengeValidationService.validateChallenge(
      'Mark Slam',     // Rank 1
      'Randy Fishburn', // Rank 2 (1 spot below)
      division,
      false,
      null
    );
    
    console.log('Result:', !invalidChallenge.isValid ? '✅ PASS' : '❌ FAIL');
    if (invalidChallenge.errors.length > 0) {
      console.log('Expected Errors:', invalidChallenge.errors);
    }
    console.log('');

    // Test 3: Validate challenge too far above (more than 4 spots)
    console.log('Test 3: Invalid Challenge (Tony Neumann challenging Mark Slam)');
    const tooFarChallenge = await challengeValidationService.validateChallenge(
      'Tony Neumann', // Rank 15
      'Mark Slam',    // Rank 1 (14 spots above - too far)
      division,
      false,
      null
    );
    
    console.log('Result:', !tooFarChallenge.isValid ? '✅ PASS' : '❌ FAIL');
    if (tooFarChallenge.errors.length > 0) {
      console.log('Expected Errors:', tooFarChallenge.errors);
    }
    console.log('');

    // Test 4: Get eligible opponents for a player
    console.log('Test 4: Eligible Opponents for Tony Neumann (Rank 15)');
    const eligibleOpponents = await challengeValidationService.getEligibleOpponents(
      'Tony Neumann',
      division
    );
    
    console.log('Eligible Opponents Count:', eligibleOpponents.length);
    console.log('Eligible Opponents:');
    eligibleOpponents.forEach(opponent => {
      console.log(`  - ${opponent.name} (Rank ${opponent.position}) - ${opponent.positionDifference} spots above`);
    });
    console.log('');

    // Test 5: Get challenge stats for a player
    console.log('Test 5: Challenge Stats for Tony Neumann');
    const stats = await challengeValidationService.getOrCreateChallengeStats(
      'Tony Neumann',
      division
    );
    
    console.log('Player:', stats.playerName);
    console.log('Current Standing:', stats.currentStanding);
    console.log('Total Challenge Matches:', stats.totalChallengeMatches);
    console.log('Matches as Challenger:', stats.matchesAsChallenger);
    console.log('Matches as Defender:', stats.matchesAsDefender);
    console.log('Required Defenses:', stats.requiredDefenses);
    console.log('Voluntary Defenses:', stats.voluntaryDefenses);
    console.log('Remaining Challenges:', stats.remainingChallenges);
    console.log('Remaining Defenses:', stats.remainingDefenses);
    console.log('Can Challenge This Week:', stats.canChallengeThisWeek(7));
    console.log('Can Defend This Week:', stats.canDefendThisWeek(7));
    console.log('');

    // Test 6: Test weekly limits
    console.log('Test 6: Weekly Limit Testing');
    console.log('Tony Neumann can challenge week 7:', stats.canChallengeThisWeek(7));
    console.log('Tony Neumann can defend week 7:', stats.canDefendThisWeek(7));
    console.log('Tony Neumann can challenge week 8:', stats.canChallengeThisWeek(8));
    console.log('Tony Neumann can defend week 8:', stats.canDefendThisWeek(8));
    console.log('');

    // Test 7: Test opponent tracking
    console.log('Test 7: Opponent Tracking');
    console.log('Can challenge Jon Glennon:', stats.canChallengeOpponent('Jon Glennon'));
    console.log('Can challenge Lyndl Navarrete:', stats.canChallengeOpponent('Lyndl Navarrete'));
    console.log('Can challenge Mark Test:', stats.canChallengeOpponent('Mark Test'));
    console.log('');

    // Test 8: Test middle-ranked player
    console.log('Test 8: Middle Ranked Player (Lucas Taylor - Rank 5)');
    const middleStats = await challengeValidationService.getOrCreateChallengeStats(
      'Lucas Taylor',
      division
    );
    
    const middleEligible = await challengeValidationService.getEligibleOpponents(
      'Lucas Taylor',
      division
    );
    
    console.log('Lucas Taylor eligible opponents:', middleEligible.length);
    middleEligible.forEach(opponent => {
      console.log(`  - ${opponent.name} (Rank ${opponent.position}) - ${opponent.positionDifference} spots above`);
    });
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the tests
if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
  await testChallengeValidation();
} 