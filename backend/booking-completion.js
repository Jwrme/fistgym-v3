const User = require('./models/User');
const Coach = require('./models/Coach');

// Manual booking completion endpoint - fallback for coaches to mark sessions as done
const completeBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { coachId } = req.body;

        console.log(`🎯 Manual completion requested for booking ${id} by coach ${coachId}`);

        // Find the user with this booking
        const user = await User.findOne({ 'bookings._id': id });
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Booking not found' 
            });
        }

        // Find the specific booking
        const booking = user.bookings.find(b => b._id.toString() === id);
        if (!booking) {
            return res.status(404).json({ 
                success: false, 
                error: 'Booking not found in user records' 
            });
        }

        // Verify coach ownership
        if (booking.coachId !== coachId) {
            return res.status(403).json({ 
                success: false, 
                error: 'Unauthorized: You can only complete your own bookings' 
            });
        }

        // Check if booking is verified (payment must be verified to complete)
        if (booking.paymentStatus !== 'verified') {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot complete booking: Payment not verified' 
            });
        }

        console.log(`✅ Moving booking to history manually: ${user.username} - ${booking.coachName} (${booking.date} ${booking.time})`);

        // Move to user's booking history
        const historyEntry = {
            coachId: booking.coachId,
            coachName: booking.coachName,
            date: booking.date,
            time: booking.time,
            class: booking.class,
            paymentStatus: booking.paymentStatus,
            completedAt: new Date(),
            attendanceStatus: 'completed'
        };

        user.bookingHistory = user.bookingHistory || [];
        user.bookingHistory.push(historyEntry);

        // Remove from active bookings
        user.bookings = user.bookings.filter(b => b._id.toString() !== id);

        await user.save();

        // Also add to coach's class history
        try {
            await Coach.findByIdAndUpdate(coachId, {
                $push: {
                    classHistory: {
                        studentName: `${user.firstname} ${user.lastname}`,
                        date: booking.date,
                        time: booking.time,
                        class: booking.class,
                        completedAt: new Date(),
                        attendanceStatus: 'completed'
                    }
                }
            });
            console.log(`✅ Added to coach's class history: ${booking.coachName} - ${user.firstname} ${user.lastname}`);
        } catch (coachError) {
            console.error(`❌ Error updating coach class history: ${coachError.message}`);
        }

        res.json({
            success: true,
            message: 'Booking completed and moved to history successfully'
        });

    } catch (error) {
        console.error('❌ Error completing booking manually:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while completing booking'
        });
    }
};

module.exports = { completeBooking };
