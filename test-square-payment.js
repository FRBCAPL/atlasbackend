// Test script to test Square payment creation directly
const BACKEND_URL = 'http://localhost:8080';

async function testSquarePayment() {
  try {
    console.log('🧪 Testing Square Payment Creation...\n');
    
    const testData = {
      email: 'test@example.com',
      playerName: 'Test Player',
      paymentMethod: 'creditCard',
      amount: 5.00,
      returnUrl: 'http://localhost:5173/payment-success'
    };
    
    console.log('📤 Sending request to:', `${BACKEND_URL}/api/monetization/create-membership-payment`);
    console.log('📋 Request data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(`${BACKEND_URL}/api/monetization/create-membership-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('\n📥 Response Status:', response.status);
    console.log('📥 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('📥 Response Data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Payment creation successful!');
      if (responseData.paymentType === 'square_redirect') {
        console.log('🔗 Square payment URL:', responseData.paymentUrl);
      } else {
        console.log('⚠️ Payment type:', responseData.paymentType);
      }
    } else {
      console.log('\n❌ Payment creation failed!');
      console.log('Error:', responseData.error);
      console.log('Message:', responseData.message);
    }
    
  } catch (error) {
    console.error('\n💥 Network error:', error.message);
  }
}

testSquarePayment();
