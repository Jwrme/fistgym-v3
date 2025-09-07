const mongoose = require('mongoose');

// Use the same database as backend
mongoose.connect('mongodb://localhost:27017/test');

const Payment = mongoose.model('Payment', new mongoose.Schema({}, {strict: false}));

async function checkPayments() {
  try {
    console.log('🔍 Checking payments in "test" database...');
    
    const allPayments = await Payment.find({});
    console.log(`Total payments: ${allPayments.length}`);
    
    if (allPayments.length > 0) {
      console.log('\n📋 Recent payments:');
      const recent = allPayments.slice(-5);
      recent.forEach((p, index) => {
        console.log(`${index + 1}. User: ${p.userId}`);
        console.log(`   Class: ${p.className || 'NOT SET'}`);
        console.log(`   Date: ${p.date}`);
        console.log(`   Status: ${p.status}`);
        console.log(`   ID: ${p._id}`);
        console.log('---');
      });
      
      // Update Miko Nene's payments to Jiu Jitsu Adults
      const mikoPayments = allPayments.filter(p => p.userId === 'Miko Nene');
      if (mikoPayments.length > 0) {
        console.log(`\n🔧 Updating ${mikoPayments.length} Miko Nene payment(s)...`);
        for (const payment of mikoPayments) {
          await Payment.findByIdAndUpdate(payment._id, {
            className: 'Jiu Jitsu Adults'
          });
          console.log(`✅ Updated payment ${payment._id} to Jiu Jitsu Adults`);
        }
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkPayments();
