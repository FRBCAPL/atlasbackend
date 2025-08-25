const mongoose = require('mongoose');
const User = require('./src/models/User.js');

async function checkUsers() {
  try {
    await mongoose.connect('mongodb://localhost:27017/singles-league-app');
    console.log('Connected to database');
    
    const users = await User.find({}).select('firstName lastName email isApproved isActive isAdmin');
    console.log('\n=== All Users ===');
    users.forEach(u => {
      console.log(`${u.firstName} ${u.lastName} (${u.email})`);
      console.log(`  - Approved: ${u.isApproved}`);
      console.log(`  - Active: ${u.isActive}`);
      console.log(`  - Admin: ${u.isAdmin}`);
      console.log('');
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
