import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current directory:', __dirname);
console.log('Looking for .env file...');

// Check if .env file exists and read its content
const envPath = path.join(__dirname, '.env');
console.log('Env file path:', envPath);
console.log('File exists:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('File content:');
  console.log(content);
  console.log('File length:', content.length);
  console.log('First 100 chars:', content.substring(0, 100));
}

// Try to load .env file with explicit path
const result = dotenv.config({ path: envPath });
console.log('dotenv result:', result);

console.log('Environment variables:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('MONGO')));
