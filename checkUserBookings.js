const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

const User = mongoose.model('User', new mongoose.Schema({}, {strict: false}));

async function checkUserBookings() {
  try {
    console.log('🔍 Checking user bookings...');
    
    const users = await User.find({});
    console.log(`Total users: ${users.length}`);
    
    for (const user of users) {
      if (user.bookings && user.bookings.length > 0) {
        console.log(`\n👤 User: ${user.username || user.firstname} ${user.lastname || ''}`);
        console.log(`   Total bookings: ${user.bookings.length}`);
        
        user.bookings.forEach((booking, index) => {
          console.log(`   ${index + 1}. Class: ${booking.class || 'NOT SET'}`);
          console.log(`      Date: ${booking.date}`);
          console.log(`      Status: ${booking.paymentStatus}`);
          console.log(`      Coach: ${booking.coachName}`);
        });
        
        // Update Miko Nene's bookings
        if (user.username === 'Miko Nene' || (user.firstname === 'Miko' && user.lastname === 'Nene')) {
          console.log(`\n🔧 Updating ${user.username}'s bookings...`);
          let hasUpdates = false;
          
          user.bookings.forEach(booking => {
            if (!booking.class || booking.class === 'Boxing') {
              booking.class = 'Jiu Jitsu Adults';
              hasUpdates = true;
              console.log(`   ✅ Updated booking to Jiu Jitsu Adults`);
            }
          });
          
          if (hasUpdates) {
            user.markModified('bookings');
            await user.save();
            console.log(`   💾 Saved changes for ${user.username}`);
          }
        }
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

checkUserBookings();
