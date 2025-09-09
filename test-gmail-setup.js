import dotenv from 'dotenv';
import { sendChallengeNotificationEmail } from './src/services/nodemailerService.js';

// Load environment variables
dotenv.config();

async function testGmailSetup() {
  console.log('🧪 Testing Gmail Setup...\n');
  
  // Check if environment variables are set
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  
  console.log('📧 Gmail User:', gmailUser ? `✅ Set (${gmailUser})` : '❌ Missing');
  console.log('🔑 Gmail App Password:', gmailPassword ? `✅ Set (${gmailPassword.length} characters)` : '❌ Missing');
  
  if (!gmailUser || !gmailPassword) {
    console.log('\n❌ Gmail configuration is incomplete!');
    console.log('Please check your .env file and ensure both GMAIL_USER and GMAIL_APP_PASSWORD are set.');
    return;
  }
  
  // Test email data
  const testEmailData = {
    to_email: gmailUser, // Send test email to yourself
    to_name: 'Test User',
    from_name: 'Front Range Pool Hub',
    challenge_type: 'challenge',
    entry_fee: 5,
    race_length: 5,
    game_type: '8-ball',
    location: 'Legends Brews & Cues',
    preferred_dates: ['2024-12-25', '2024-12-26'],
    challenge_message: 'This is a test email to verify Gmail setup is working correctly.',
    challenger_position: 5,
    defender_position: 3,
    ladder_name: '499 & Under',
    app_url: 'https://newapp-1-ic1v.onrender.com'
  };
  
  try {
    console.log('\n📤 Sending test email...');
    const result = await sendChallengeNotificationEmail(testEmailData);
    
    if (result.success) {
      console.log('✅ Gmail setup is working correctly!');
      console.log('📧 Test email sent successfully!');
      console.log('📧 Message ID:', result.messageId);
      console.log('\n🎉 Your email system is ready for counter-proposals!');
    } else {
      console.log('❌ Failed to send test email:', result.error);
    }
  } catch (error) {
    console.log('❌ Error testing Gmail setup:', error.message);
    console.log('\n🔧 Common issues:');
    console.log('1. Make sure 2-Factor Authentication is enabled on your Gmail account');
    console.log('2. Verify the app password is correct (16 characters, no spaces)');
    console.log('3. Check that the Gmail address is correct');
    console.log('4. Ensure the .env file is in the atlasbackend directory');
  }
}

// Run the test
testGmailSetup();
