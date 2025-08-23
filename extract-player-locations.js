import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Location from './src/models/Location.js';

dotenv.config();

async function extractPlayerLocations() {
  try {
    console.log('🔍 Extracting locations from existing players...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Get all users with location data
    const users = await User.find({ 
      locations: { $exists: true, $ne: '' },
      isActive: true 
    }).select('locations');
    
    console.log(`📊 Found ${users.length} users with location data`);
    
    // Extract all unique locations
    const allLocations = new Set();
    const locationCounts = {};
    
    users.forEach(user => {
      if (user.locations) {
        const locationLines = user.locations
          .split('\n')
          .map(loc => loc.trim())
          .filter(loc => loc.length > 0);
        
        locationLines.forEach(location => {
          allLocations.add(location);
          locationCounts[location] = (locationCounts[location] || 0) + 1;
        });
      }
    });
    
    console.log(`📍 Found ${allLocations.size} unique locations:`);
    
    // Sort locations by usage count (most popular first)
    const sortedLocations = Array.from(allLocations).sort((a, b) => {
      return (locationCounts[b] || 0) - (locationCounts[a] || 0);
    });
    
    // Display current locations
    sortedLocations.forEach((location, index) => {
      const count = locationCounts[location];
      console.log(`${index + 1}. "${location}" (used by ${count} player${count > 1 ? 's' : ''})`);
    });
    
    // Check which locations already exist in the locations database
    const existingLocations = await Location.find({}).select('name');
    const existingLocationNames = new Set(existingLocations.map(loc => loc.name));
    
    console.log('\n🔍 Checking which locations already exist in database...');
    
    const newLocations = [];
    const alreadyExists = [];
    
    sortedLocations.forEach(location => {
      if (existingLocationNames.has(location)) {
        alreadyExists.push(location);
      } else {
        newLocations.push(location);
      }
    });
    
    console.log(`✅ ${alreadyExists.length} locations already exist in database`);
    console.log(`➕ ${newLocations.length} new locations to add`);
    
    if (newLocations.length === 0) {
      console.log('🎉 All player locations are already in the database!');
      return;
    }
    
    // Add new locations to the database
    console.log('\n📝 Adding new locations to database...');
    
    const addedLocations = [];
    const failedLocations = [];
    
    for (const locationName of newLocations) {
      try {
        const location = new Location({
          name: locationName,
          address: '', // Will need to be filled in manually
          notes: `Added automatically from player data (used by ${locationCounts[locationName]} player${locationCounts[locationName] > 1 ? 's' : ''})`,
          isActive: true
        });
        
        await location.save();
        addedLocations.push(locationName);
        console.log(`✅ Added: "${locationName}"`);
        
      } catch (error) {
        console.error(`❌ Failed to add "${locationName}":`, error.message);
        failedLocations.push(locationName);
      }
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Total unique locations found: ${allLocations.size}`);
    console.log(`Locations already in database: ${alreadyExists.length}`);
    console.log(`New locations added: ${addedLocations.length}`);
    console.log(`Failed to add: ${failedLocations.length}`);
    
    if (addedLocations.length > 0) {
      console.log('\n✅ Successfully added locations:');
      addedLocations.forEach((location, index) => {
        console.log(`${index + 1}. "${location}"`);
      });
    }
    
    if (failedLocations.length > 0) {
      console.log('\n❌ Failed to add locations:');
      failedLocations.forEach((location, index) => {
        console.log(`${index + 1}. "${location}"`);
      });
    }
    
    console.log('\n💡 Next steps:');
    console.log('1. Review the added locations in the admin dashboard');
    console.log('2. Add addresses and notes to the locations');
    console.log('3. Deactivate any locations that are no longer relevant');
    
  } catch (error) {
    console.error('❌ Error extracting player locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the extraction
extractPlayerLocations()
  .then(() => {
    console.log('🎉 Location extraction completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Location extraction failed:', error);
    process.exit(1);
  });
