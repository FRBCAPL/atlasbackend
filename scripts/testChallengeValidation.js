const mongoose = require('mongoose');
const challengeValidationService = require('../src/services/challengeValidationService');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-league';

async function testChallengeValidation() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    const division = 'FRBCAPL TEST';
    
    // Test 1: Validate a valid challenge (lower ranked challenging higher ranked)
    const validChallenge = await challengeValidationService.validateChallenge(
      'Tony Neumann', // Rank 15
      'Jon Glennon',  // Rank 12 (3 spots above)
      division,
      false,
      null
    );
    
    // Test 2: Validate invalid challenge (higher ranked challenging lower ranked)
    const invalidChallenge = await challengeValidationService.validateChallenge(
      'Mark Slam',     // Rank 1
      'Randy Fishburn', // Rank 2 (1 spot below)
      division,
      false,
      null
    );
    
    // Test 3: Validate challenge too far above (more than 4 spots)
    const tooFarChallenge = await challengeValidationService.validateChallenge(
      'Tony Neumann', // Rank 15
      'Mark Slam',    // Rank 1 (14 spots above - too far)
      division,
      false,
      null
    );
    
    // Test 4: Get eligible opponents for a player
    const eligibleOpponents = await challengeValidationService.getEligibleOpponents(
      'Tony Neumann',
      division
    );
    
    // Test 5: Get challenge stats for a player
    const stats = await challengeValidationService.getOrCreateChallengeStats(
      'Tony Neumann',
      division
    );
    
    // Test 6: Test weekly limits
    // Test 7: Test opponent tracking
    // Test 8: Test middle-ranked player
    const middleStats = await challengeValidationService.getOrCreateChallengeStats(
      'Lucas Taylor',
      division
    );
    
    const middleEligible = await challengeValidationService.getEligibleOpponents(
      'Lucas Taylor',
      division
    );
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the tests
if (require.main === module) {
  testChallengeValidation();
}

module.exports = { testChallengeValidation }; 