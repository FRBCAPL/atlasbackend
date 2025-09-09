import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Simple Gmail Test...\n');

// Check if environment variables are set
const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;

console.log('📧 Gmail User:', gmailUser ? `✅ Set (${gmailUser})` : '❌ Missing');
console.log('🔑 Gmail App Password:', gmailPassword ? `✅ Set (${gmailPassword.length} characters)` : '❌ Missing');

if (!gmailUser || !gmailPassword) {
  console.log('\n❌ Gmail configuration is incomplete!');
  console.log('Please check your .env file and ensure both GMAIL_USER and GMAIL_APP_PASSWORD are set.');
  process.exit(1);
}

console.log('\n✅ Gmail configuration looks good!');
console.log('Now testing email sending...');

// Test nodemailer directly
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPassword
  }
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Gmail connection failed:', error.message);
  } else {
    console.log('✅ Gmail connection successful!');
    console.log('📧 Ready to send emails!');
  }
});
