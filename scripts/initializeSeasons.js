const mongoose = require('mongoose');
const Season = require('../src/models/Season');
require('dotenv').config();

async function initializeSeasons() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Clear existing seasons
    await Season.deleteMany({});

    // Define seasons for each division
    const seasons = [
      {
        name: 'Summer 2025 - FRBCAPL TEST',
        division: 'FRBCAPL TEST',
        seasonStart: new Date('2025-06-01'),
        seasonEnd: new Date('2025-08-10'),
        phase1Start: new Date('2025-06-01'),
        phase1End: new Date('2025-07-12'),
        phase2Start: new Date('2025-07-13'),
        phase2End: new Date('2025-08-10'),
        totalWeeks: 10,
        phase1Weeks: 6,
        phase2Weeks: 4,
        isActive: true,
        isCurrent: true,
        description: 'Summer 2025 BCAPL Singles Division - Test League',
        rules: 'Front Range Pool League BCAPL Singles Division bylaws (hybrid format)'
      },
      {
        name: 'Summer 2025 - Singles Test',
        division: 'Singles Test',
        seasonStart: new Date('2025-06-01'),
        seasonEnd: new Date('2025-08-10'),
        phase1Start: new Date('2025-06-01'),
        phase1End: new Date('2025-07-12'),
        phase2Start: new Date('2025-07-13'),
        phase2End: new Date('2025-08-10'),
        totalWeeks: 10,
        phase1Weeks: 6,
        phase2Weeks: 4,
        isActive: true,
        isCurrent: true,
        description: 'Summer 2025 Singles Division - Test League',
        rules: 'Front Range Pool League BCAPL Singles Division bylaws (hybrid format)'
      }
    ];

    // Insert seasons
    const createdSeasons = await Season.insertMany(seasons);
    
  } catch (error) {
    console.error('Error initializing seasons:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the initialization
initializeSeasons(); 