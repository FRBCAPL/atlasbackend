import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixEmailIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the collection
    const collection = mongoose.connection.collection('ladderplayers');
    
    // Drop the email index
    console.log('🗑️  Dropping email index...');
    await collection.dropIndex('email_1');
    console.log('✅ Email index dropped');

    console.log('🎉 Database ready for import without emails!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

console.log(`
🔧 FIX EMAIL INDEX
==================

This script will drop the unique email index
so we can import players without email addresses.
`);

fixEmailIndex();
