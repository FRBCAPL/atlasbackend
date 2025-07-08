import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log('Connecting to MongoDB:', uri); // Debug print
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set. Please set it in your .env file.');
  }
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('✅ MongoDB connected successfully!');
};

export default connectDB;
