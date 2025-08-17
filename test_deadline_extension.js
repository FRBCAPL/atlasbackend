import fetch from 'node-fetch';

async function testDeadlineExtension() {
  try {
    console.log('Testing deadline extension functionality...');
    
    // First, get current season data for FRBCAPL TEST
    console.log('\n1. Getting current season data for FRBCAPL TEST...');
    const currentResponse = await fetch('http://localhost:8080/api/seasons/current/FRBCAPL%20TEST');
    const currentData = await currentResponse.json();
    
    if (currentData.success) {
      console.log('Current Phase 2 end date:', currentData.season.phase2End);
      console.log('Current date:', new Date().toISOString());
      
      const now = new Date();
      const phase2End = new Date(currentData.season.phase2End);
      
      if (now > phase2End) {
        console.log('✅ Phase 2 deadline has passed - should be extended automatically');
      } else {
        console.log('✅ Phase 2 deadline is still in the future');
      }
    }
    
    // Test the update-schedule endpoint (this should automatically extend the deadline)
    console.log('\n2. Testing update-schedule endpoint...');
    const updateResponse = await fetch('http://localhost:8080/admin/update-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ division: 'FRBCAPL TEST' })
    });
    
    const updateData = await updateResponse.json();
    console.log('Update response:', updateData);
    
    // Check if the deadline was extended
    if (updateData.deadlineExtended) {
      console.log('✅ Deadline was automatically extended!');
      console.log('New deadline:', updateData.newDeadline);
    }
    
    // Get updated season data
    console.log('\n3. Getting updated season data...');
    const updatedResponse = await fetch('http://localhost:8080/api/seasons/current/FRBCAPL%20TEST');
    const updatedData = await updatedResponse.json();
    
    if (updatedData.success) {
      console.log('Updated Phase 2 end date:', updatedData.season.phase2End);
    }
    
  } catch (error) {
    console.error('Error testing deadline extension:', error);
  }
}

testDeadlineExtension();
