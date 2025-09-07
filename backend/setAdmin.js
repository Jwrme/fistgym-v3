require('dotenv').config();
const mongoose = require('mongoose');

const uri = 'mongodb://localhost:27017/Senjitsu_Users';

const userSchema = new mongoose.Schema({
  email: String,
  isAdmin: Boolean
});
const User = mongoose.model('User', userSchema, 'users');

async function setAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await User.updateOne(
    { email: 'admin@senjitsu.com' },
    { $set: { isAdmin: true } }
  );
  console.log('Update result:', result);
  await mongoose.disconnect();
}

setAdmin().catch(err => {
  console.error('Error updating admin:', err);
  process.exit(1);
}); 