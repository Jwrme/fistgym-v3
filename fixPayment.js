const mongoose = require('mongoose');

// Connect to database
mongoose.connect('mongodb://localhost:27017/senjitsu_users');

// Define Payment model
const Payment = mongoose.model('Payment', new mongoose.Schema({}, {strict: false}));

async function fixOldPayments() {
  try {
    console.log('🔍 Looking for payments with missing className...');
    
    // Find payments without className that belong to "Miko Nene" user
    const paymentsToFix = await Payment.find({
      userId: 'Miko Nene',
      $or: [
        { className: { $exists: false } },
        { className: null },
        { className: '' }
      ]
    });
    
    console.log(`Found ${paymentsToFix.length} payments to fix`);
    
    for (const payment of paymentsToFix) {
      // Since you booked Jiu Jitsu Adults, let's set that
      await Payment.findByIdAndUpdate(payment._id, {
        className: 'Jiu Jitsu Adults'
      });
      console.log(`✅ Updated payment ${payment._id} to Jiu Jitsu Adults`);
    }
    
    console.log('🎉 All payments fixed!');
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

fixOldPayments();
