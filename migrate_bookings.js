require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB for migration.');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// User Schema (for migration)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  username: String,
  firstname: String,
  lastname: String,
  password: String,
  profilePic: String,
  profileBg: String,
  bookings: [
    {
      coachId: String,
      coachName: String,
      date: String,
      time: String,
      class: String,
      paymentStatus: { type: String, enum: ['unpaid', 'pending', 'verified', 'rejected'], default: 'unpaid' },
      paymentProof: String,
      paymentDate: Date,
      verifiedBy: String,
      verificationDate: Date
    }
  ],
  bookingHistory: [
    {
      coachId: String,
      coachName: String,
      date: String,
      time: String,
      class: String,
      paymentStatus: String,
      completedAt: { type: Date, default: Date.now },
      attendanceStatus: { type: String, enum: ['completed', 'missed'], default: 'completed' }
    }
  ],
  isAdmin: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  updateVerificationCode: { type: String },
  updateVerificationCodeExpires: { type: Date },
  lastAttendance: {
    date: Date,
    status: String,
    confirmedBy: String,
    timestamp: Date
  },
  notifications: [
    {
      type: { type: String },
      date: Date,
      status: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }
  ]
});

const User = mongoose.model('User', userSchema);

// Function to check if a schedule is expired
const isScheduleExpired = (date, time) => {
    const now = new Date();
    const scheduleDate = new Date(date);
    
    if (scheduleDate < now) {
        if (!time) return true;
        
        // Parse time like "10:00 AM - 11:00 AM" to get end time
        let endTimeStr = time.includes('-') ? time.split('-')[1].trim() : time;
        let [timeVal, ampm] = endTimeStr.split(' ');
        let [hour, minute] = timeVal.split(':').map(Number);
        
        if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
        if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        
        const endTime = new Date(scheduleDate);
        endTime.setHours(hour, minute, 0, 0);
        
        return endTime < now;
    }
    
    return false;
};

// Migration function
const migrateBookingsData = async () => {
    try {
        console.log('Starting bookings migration...');
        
        const users = await User.find({});
        let migratedCount = 0;
        let movedToHistoryCount = 0;
        
        for (const user of users) {
            let hasChanges = false;
            const activeBookings = [];
            const historyBookings = [...(user.bookingHistory || [])];
            
            if (user.bookings && user.bookings.length > 0) {
                for (const booking of user.bookings) {
                    // Add missing fields to existing bookings
                    if (!booking.class) {
                        booking.class = 'Boxing'; // Default to Boxing for legacy bookings
                        hasChanges = true;
                    }
                    
                    if (!booking.paymentStatus) {
                        booking.paymentStatus = 'verified'; // Assume existing bookings are verified
                        hasChanges = true;
                    }
                    
                    // Check if booking should be moved to history
                    const isCompleted = booking.paymentStatus === 'verified' && 
                                      isScheduleExpired(booking.date, booking.time);
                    
                    if (isCompleted) {
                        // Move to history
                        historyBookings.push({
                            coachId: booking.coachId,
                            coachName: booking.coachName,
                            date: booking.date,
                            time: booking.time,
                            class: booking.class,
                            paymentStatus: booking.paymentStatus,
                            completedAt: new Date(),
                            attendanceStatus: 'completed'
                        });
                        movedToHistoryCount++;
                        hasChanges = true;
                        console.log(`Moving completed booking to history for user ${user.username}: ${booking.coachName} - ${booking.date} ${booking.time}`);
                    } else {
                        // Keep in active bookings
                        activeBookings.push(booking);
                    }
                }
                
                if (hasChanges) {
                    await User.findByIdAndUpdate(user._id, {
                        bookings: activeBookings,
                        bookingHistory: historyBookings
                    });
                    migratedCount++;
                    console.log(`Migrated user: ${user.username}`);
                }
            }
        }
        
        console.log(`Migration completed!`);
        console.log(`Users migrated: ${migratedCount}`);
        console.log(`Bookings moved to history: ${movedToHistoryCount}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
};

// Run migration
migrateBookingsData(); 