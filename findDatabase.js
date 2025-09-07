const mongoose = require('mongoose');

const possibleDatabases = [
  'test',
  'senjitsu_users', 
  'senjitsu',
  'fist_gym',
  'fistgym',
  'gym',
  'local'
];

async function findDatabase() {
  for (const dbName of possibleDatabases) {
    try {
      console.log(`🔍 Checking database: ${dbName}`);
      
      // Connect to this database
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      await mongoose.connect(`mongodb://localhost:27017/${dbName}`);
      
      // Try to find User model
      const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));
      const Payment = mongoose.model('Payment', new mongoose.Schema({}, {strict: false}));
      
      const userCount = await User.countDocuments();
      const paymentCount = await Payment.countDocuments();
      
      console.log(`   Users: ${userCount}, Payments: ${paymentCount}`);
      
      if (userCount > 0 || paymentCount > 0) {
        console.log(`✅ Found data in database: ${dbName}`);
        
        // Check for Miko Nene specifically
        const mikoUser = await User.findOne({
          $or: [
            { username: 'Miko Nene' },
            { firstname: 'Miko', lastname: 'Nene' }
          ]
        });
        
        if (mikoUser) {
          console.log(`   👤 Found Miko Nene user!`);
          if (mikoUser.bookings && mikoUser.bookings.length > 0) {
            console.log(`   📋 Bookings: ${mikoUser.bookings.length}`);
            mikoUser.bookings.forEach((booking, i) => {
              console.log(`      ${i+1}. Class: ${booking.class || 'NOT SET'}, Status: ${booking.paymentStatus}`);
            });
          }
        }
        
        const mikoPayments = await Payment.find({ userId: 'Miko Nene' });
        if (mikoPayments.length > 0) {
          console.log(`   💳 Found ${mikoPayments.length} payments for Miko Nene`);
        }
        
        return dbName;
      }
      
    } catch (error) {
      console.log(`   ❌ Error with ${dbName}: ${error.message}`);
    }
  }
  
  console.log('❌ No database with data found');
  mongoose.disconnect();
}

findDatabase();
