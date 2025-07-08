import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

console.log('MONGO_URI:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    return findUser();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

async function findUser() {
  try {
    const user = await User.findOne({ email: 'sacodo752@gmail.com' });
    if (!user) {
      console.log('User not found');
    } else {
      console.log('User found:', user);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

findUser(); 