const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/Senjitsu_Users', {useNewUrlParser: true, useUnifiedTopology: true}).then(async () => {
  const userSchema = new mongoose.Schema({}, {strict: false});
  const User = mongoose.model('User', userSchema);
  
  console.log('=== DEBUGGING USER COUNT ===');
  
  // Check total users
  const totalAll = await User.countDocuments({});
  console.log('Total users in database:', totalAll);
  
  // Check admin users
  const adminUsers = await User.countDocuments({isAdmin: true});
  console.log('Admin users:', adminUsers);
  
  // Check using old query
  const oldQuery = await User.countDocuments({isAdmin: {$ne: true}});
  console.log('Old query result:', oldQuery);
  
  // Check using new query
  const newQuery = await User.countDocuments({ 
    $or: [
      { isAdmin: { $exists: false } },
      { isAdmin: false },
      { isAdmin: null }
    ]
  });
  console.log('New query result:', newQuery);
  
  // Show sample users with their isAdmin field
  const sampleUsers = await User.find({}, {username: 1, isAdmin: 1}).limit(10);
  console.log('Sample users:');
  sampleUsers.forEach(user => {
    console.log(`- ${user.username}: isAdmin = ${user.isAdmin}`);
  });
  
  mongoose.disconnect();
}).catch(err => console.error('Error:', err)); 