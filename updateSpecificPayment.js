const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/senjitsu_users');

const Payment = mongoose.model('Payment', new mongoose.Schema({}, {strict: false}));

async function updatePayment() {
  try {
    console.log('🔍 Looking for Miko Nene payments...');
    
    // Find all payments
    const allPayments = await Payment.find({});
    console.log(`Total payments in database: ${allPayments.length}`);
    
    // Find Miko Nene's payments
    const mikoPayments = await Payment.find({ userId: 'Miko Nene' });
    console.log(`Miko Nene payments: ${mikoPayments.length}`);
    
    if (mikoPayments.length > 0) {
      for (const payment of mikoPayments) {
        console.log(`Payment ID: ${payment._id}`);
        console.log(`Current className: ${payment.className || 'NOT SET'}`);
        console.log(`Date: ${payment.date}`);
        console.log(`Status: ${payment.status}`);
        
        // Update to Jiu Jitsu Adults
        await Payment.findByIdAndUpdate(payment._id, {
          className: 'Jiu Jitsu Adults'
        });
        console.log('✅ Updated to Jiu Jitsu Adults');
        console.log('---');
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

updatePayment();
