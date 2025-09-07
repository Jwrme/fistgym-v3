const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/senjitsu_users');

const Payment = mongoose.model('Payment', new mongoose.Schema({}, {strict: false}));

async function checkPayments() {
  try {
    const payments = await Payment.find({}).sort({submittedAt: -1}).limit(5);
    
    console.log('📋 Recent payments:');
    payments.forEach((p, index) => {
      console.log(`${index + 1}. User: ${p.userId}`);
      console.log(`   Class: ${p.className || 'NOT SET'}`);
      console.log(`   Date: ${p.date}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   ID: ${p._id}`);
      console.log('---');
    });
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkPayments();
