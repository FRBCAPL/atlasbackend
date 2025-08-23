import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Location from './src/models/Location.js';

dotenv.config();

// League locations provided by the user
const leagueLocations = [
  {
    name: "Legends Brews & Cues",
    address: "",
    notes: "League location - pool hall and brewery"
  },
  {
    name: "Antiques",
    address: "",
    notes: "League location - antique-themed venue"
  },
  {
    name: "Rac m",
    address: "",
    notes: "League location"
  },
  {
    name: "Westside Billiards",
    address: "",
    notes: "League location - westside pool hall"
  },
  {
    name: "Bijou Billiards",
    address: "",
    notes: "League location - downtown pool hall"
  },
  {
    name: "Crooked Cue",
    address: "",
    notes: "League location - popular pool hall"
  },
  {
    name: "Back on the Boulevard",
    address: "",
    notes: "League location - boulevard venue"
  },
  {
    name: "Main Street Tavern",
    address: "",
    notes: "League location - main street bar"
  },
  {
    name: "Murray Street Darts",
    address: "",
    notes: "League location - darts and pool venue"
  },
  {
    name: "My House",
    address: "",
    notes: "Home table - private residence"
  }
];

async function addLeagueLocations() {
  try {
    console.log('🏆 Adding league locations to database...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Check which locations already exist
    const existingLocations = await Location.find({}).select('name');
    const existingLocationNames = new Set(existingLocations.map(loc => loc.name));
    
    console.log(`📊 Found ${existingLocations.length} existing locations in database`);
    
    const locationsToAdd = [];
    const alreadyExists = [];
    
    leagueLocations.forEach(location => {
      if (existingLocationNames.has(location.name)) {
        alreadyExists.push(location.name);
      } else {
        locationsToAdd.push(location);
      }
    });
    
    console.log(`✅ ${alreadyExists.length} locations already exist in database`);
    console.log(`➕ ${locationsToAdd.length} new locations to add`);
    
    if (alreadyExists.length > 0) {
      console.log('\n📋 Already existing locations:');
      alreadyExists.forEach((location, index) => {
        console.log(`${index + 1}. "${location}"`);
      });
    }
    
    if (locationsToAdd.length === 0) {
      console.log('🎉 All league locations are already in the database!');
      return;
    }
    
    // Add new locations to the database
    console.log('\n📝 Adding new league locations to database...');
    
    const addedLocations = [];
    const failedLocations = [];
    
    for (const locationData of locationsToAdd) {
      try {
        const location = new Location({
          name: locationData.name,
          address: locationData.address,
          notes: locationData.notes,
          isActive: true
        });
        
        await location.save();
        addedLocations.push(locationData.name);
        console.log(`✅ Added: "${locationData.name}"`);
        
      } catch (error) {
        console.error(`❌ Failed to add "${locationData.name}":`, error.message);
        failedLocations.push(locationData.name);
      }
    }
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log(`Total league locations: ${leagueLocations.length}`);
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
    
    // Show all locations in database
    const allLocations = await Location.find({ isActive: true }).sort({ name: 1 });
    console.log('\n📍 All active locations in database:');
    allLocations.forEach((location, index) => {
      console.log(`${index + 1}. "${location.name}"`);
      if (location.address) console.log(`   Address: ${location.address}`);
      if (location.notes) console.log(`   Notes: ${location.notes}`);
      console.log('');
    });
    
    console.log('\n💡 Next steps:');
    console.log('1. Review the locations in the admin dashboard');
    console.log('2. Add addresses to the locations that need them');
    console.log('3. Update notes with more specific information');
    console.log('4. Players can now select from these locations during registration');
    
  } catch (error) {
    console.error('❌ Error adding league locations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database connection closed');
  }
}

// Run the addition
addLeagueLocations()
  .then(() => {
    console.log('🎉 League locations addition completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 League locations addition failed:', error);
    process.exit(1);
  });
