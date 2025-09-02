// Test script to check Square configuration
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from parent directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🔧 Testing Square Configuration...\n');

console.log('Environment Variables:');
console.log('SQUARE_ACCESS_TOKEN:', process.env.SQUARE_ACCESS_TOKEN ? '✅ Set' : '❌ Not set');
console.log('SQUARE_LOCATION_ID:', process.env.SQUARE_LOCATION_ID ? '✅ Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');

if (process.env.SQUARE_ACCESS_TOKEN) {
  console.log('\n✅ Square is properly configured!');
  console.log('Access Token (first 10 chars):', process.env.SQUARE_ACCESS_TOKEN.substring(0, 10) + '...');
  console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
} else {
  console.log('\n❌ Square is NOT configured properly');
  console.log('Please check your .env file');
}
