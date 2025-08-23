import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import OldUser from './models/User.js';

dotenv.config();

async function testUserData() {
  try {
    // Connect to MongoDB using same logic as server
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/singleLeague';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // Check collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    // Try new User model
    const newUsers = await User.find({}).limit(3);
    console.log(`Found ${newUsers.length} users in new User model`);
    
    // Try old User model  
    const oldUsers = await OldUser.find({}).limit(3);
    console.log(`Found ${oldUsers.length} users in old User model`);
    
    // Try direct collection access
    const usersCollection = db.collection('users');
    const directUsers = await usersCollection.find({}).limit(3).toArray();
    console.log(`Found ${directUsers.length} users in direct 'users' collection`);
    
    if (newUsers.length > 0) {
      console.log('\nSample NEW user data:');
      console.log(JSON.stringify(newUsers[0], null, 2));
      console.log('\nFields available:');
      console.log('firstName:', !!newUsers[0].firstName);
      console.log('lastName:', !!newUsers[0].lastName);
      console.log('phone:', !!newUsers[0].phone);
      console.log('availability:', !!newUsers[0].availability);
      console.log('locations:', !!newUsers[0].locations);
    }
    
    if (oldUsers.length > 0) {
      console.log('\nSample OLD user data:');
      console.log(JSON.stringify(oldUsers[0], null, 2));
    }
    
    if (directUsers.length > 0) {
      console.log('\nSample DIRECT collection user data:');
      console.log(JSON.stringify(directUsers[0], null, 2));
      console.log('\nFields available:');
      console.log('firstName:', !!directUsers[0].firstName);
      console.log('lastName:', !!directUsers[0].lastName);
      console.log('phone:', !!directUsers[0].phone);
      console.log('availability:', !!directUsers[0].availability);
      console.log('locations:', !!directUsers[0].locations);
      console.log('name:', !!directUsers[0].name);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testUserData();
