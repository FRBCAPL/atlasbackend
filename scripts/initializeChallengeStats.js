const mongoose = require('mongoose');
const ChallengeStats = require('../src/models/ChallengeStats');
const fs = require('fs');
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pool-league';

async function initializeChallengeStats(division) {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Load standings for the division
    const standingsPath = path.join(__dirname, '../public', `standings_${division.replace(/\s+/g, '_')}.json`);
    
    if (!fs.existsSync(standingsPath)) {
      console.error(`Standings file not found: ${standingsPath}`);
      return;
    }

    const standings = JSON.parse(fs.readFileSync(standingsPath, 'utf8'));
    console.log(`Loaded ${standings.length} players from standings for division: ${division}`);

    // Initialize challenge stats for each player
    const statsToCreate = [];
    
    for (const player of standings) {
      const existingStats = await ChallengeStats.findOne({ 
        playerName: player.name, 
        division: division 
      });

      if (!existingStats) {
        const newStats = new ChallengeStats({
          playerName: player.name,
          division: division,
          currentStanding: parseInt(player.rank),
          totalChallengeMatches: 0,
          matchesAsChallenger: 0,
          matchesAsDefender: 0,
          requiredDefenses: 0,
          voluntaryDefenses: 0,
          challengesByWeek: [],
          defendedByWeek: [],
          challengedOpponents: [],
          lastChallengeWeek: 0,
          hasReachedChallengeLimit: false,
          hasReachedDefenseLimit: false,
          isEligibleForChallenges: true,
          isEligibleForDefense: true
        });
        
        statsToCreate.push(newStats);
        console.log(`Preparing stats for: ${player.name} (Rank ${player.rank})`);
      } else {
        console.log(`Stats already exist for: ${player.name}`);
      }
    }

    // Save all new stats
    if (statsToCreate.length > 0) {
      await ChallengeStats.insertMany(statsToCreate);
      console.log(`✅ Created challenge stats for ${statsToCreate.length} players`);
    } else {
      console.log('✅ All players already have challenge stats');
    }

    // Verify the results
    const totalStats = await ChallengeStats.countDocuments({ division });
    console.log(`Total challenge stats records for ${division}: ${totalStats}`);

    // Show summary
    const stats = await ChallengeStats.find({ division }).sort({ currentStanding: 1 });
    console.log('\n📊 Challenge Stats Summary:');
    console.log('Rank | Player Name | Challenges | Defenses | Status');
    console.log('-----|-------------|------------|----------|--------');
    
    for (const stat of stats) {
      const status = stat.hasReachedChallengeLimit ? 'Limit Reached' : 
                    stat.hasReachedDefenseLimit ? 'Defense Limit' : 'Active';
      console.log(`${stat.currentStanding?.toString().padStart(4)} | ${stat.playerName.padEnd(11)} | ${stat.totalChallengeMatches.toString().padStart(9)} | ${stat.requiredDefenses.toString().padStart(8)} | ${status}`);
    }

  } catch (error) {
    console.error('Error initializing challenge stats:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Command line usage
if (require.main === module) {
  const division = process.argv[2];
  
  if (!division) {
    console.error('Usage: node initializeChallengeStats.js <division>');
    console.error('Example: node initializeChallengeStats.js "FRBCAPL TEST"');
    process.exit(1);
  }

  console.log(`Initializing challenge stats for division: ${division}`);
  initializeChallengeStats(division);
}

module.exports = { initializeChallengeStats }; 