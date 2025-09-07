require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const http = require('http');
const WebSocket = require('ws');
const { buildVerificationEmail } = require('./emailTemplates');

// File upload configuration removed - using Facebook video embeds instead

const app = express();
const PORT = process.env.PORT || 3001;

// Validate required environment variables for Render deployment
const requiredEnvVars = ['MONGODB_URI', 'EMAIL_USER', 'EMAIL_PASS', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars);
  console.error('Please set these in your Render dashboard environment variables section');
  process.exit(1);
}

// Rate limiting - Environment-based configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
const RATE_LIMIT_MAX = isDevelopment ? 50000 : 1000; // 50k for dev, 1k for production

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RATE_LIMIT_MAX, // Very high limit for development (auto-refresh + multiple windows)
  message: `Too many requests from this IP, please try again later. Limit: ${RATE_LIMIT_MAX} requests per 15 minutes.`,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain routes if needed
  skip: (req, res) => {
    // Skip rate limiting for development/debug endpoints and static files
    if (isDevelopment) {
      return req.path.startsWith('/api/debug') || 
             req.path.startsWith('/api/health') ||
             req.path.startsWith('/images') ||
             req.path.startsWith('/videos') ||
             req.path.startsWith('/uploads');
    }
    return false; // Don't skip in production
  }
});
app.use(limiter);

// Enhanced CORS configuration for Render deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000', 
      'http://127.0.0.1:3000', 
      'http://localhost:3001',
      // Add your Render frontend URL here when you deploy frontend
      // 'https://your-frontend-app.onrender.com'
    ];
    
    // Allow any .onrender.com subdomain for Render deployments
    // Also allow custom domains
    if (origin.includes('.onrender.com') || 
        origin.includes('api.fist-gym.com') || 
        origin.includes('fist-gym.com') ||
        allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // For legacy browser support
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// MongoDB connection will be established later with proper options

// Simple multer setup for basic file uploads (if needed)
const upload = multer({ dest: 'uploads/' });

// Debug mode enabled for email troubleshooting
const DEBUG_MODE = true;

console.log('=== RUNNING: Senjitsu Backend index.js ===');
console.log('BACKEND SERVER STARTED');
console.log('🚀 DEBUG MODE: DISABLED FOR PERFORMANCE');

// MongoDB connection options with optimized timeouts
const mongooseOptions = {
  maxPoolSize: 100, // Reduced for better stability (was 200)
  minPoolSize: 5, // Reduced minimum pool size
  serverSelectionTimeoutMS: 10000, // Increased to 10 seconds for server selection
  socketTimeoutMS: 30000, // Reduced to 30 seconds for socket operations
  connectTimeoutMS: 15000, // Added connection timeout (15 seconds)
  maxIdleTimeMS: 30000, // Close connections after 30 seconds idle
  heartbeatFrequencyMS: 10000, // Check server every 10 seconds
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Enable retryable writes
  retryReads: true // Enable retryable reads
};

// Database optimization - add indexes for better query performance
const addDatabaseIndexes = async () => {
    try {
        // 🚀 CRITICAL: Compound index for booking status checks (FASTEST LOOKUP)
        await User.collection.createIndex({ 
            'bookings.coachId': 1, 
            'bookings.date': 1, 
            'bookings.time': 1,
            'bookings.paymentStatus': 1 
        });
        
        // 🚀 CRITICAL: Individual field indexes for fast filtering
        await User.collection.createIndex({ 'bookings.coachId': 1 });
        await User.collection.createIndex({ 'bookings.paymentStatus': 1 });
        
        // 🔥 NEW: Index for lastActive field for performance optimization
        await User.collection.createIndex({ lastActive: -1 });
        
        // Index for coach lookups and specialty filtering
        await Coach.collection.createIndex({ '_id': 1, 'specialties': 1 });
        await Coach.collection.createIndex({ 'specialties': 1 });
        
        // Username lookups (login/profile)
        await User.collection.createIndex({ 'username': 1 });
        await Coach.collection.createIndex({ 'username': 1 });
        
        console.log('✅ Database indexes created successfully for performance optimization');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
};

// Connect to MongoDB with error handling
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
// Add database name if not present in the URI
const finalMongoUri = mongoUri.includes('mongodb+srv://') && !mongoUri.includes('mongodb.net/') ? 
  mongoUri.replace('mongodb.net/?', 'mongodb.net/test?') : 
  mongoUri.includes('mongodb+srv://') && !mongoUri.includes('.net/test') && !mongoUri.includes('.net/Senjitsu_Users') ?
    mongoUri.replace('mongodb.net/?', 'mongodb.net/test?') : mongoUri;

mongoose.connect(finalMongoUri, mongooseOptions)
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    // Add database indexes after models are defined
    setTimeout(addDatabaseIndexes, 1000);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    process.exit(1);
  }
});

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  username: String,
  firstname: String,
  lastname: String,
  password: String,
  profilePic: String, // base64 or URL
  profileBg: String, // base64 or URL for background image
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
      verificationDate: Date,
      // Package booking fields
      isPackage: { type: Boolean, default: false },
      packageType: String,
      packageSessions: Number,
      packagePrice: Number
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
  ],
  lastActive: { type: Date }
});

const User = mongoose.model('User', userSchema);

// Coach Schema
const coachSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  password: { type: String, required: true },
  profilePic: { type: String },
  biography: { type: String, required: true },
  specialties: [{ type: String }],
  belt: { type: String, default: '' },
  availability: [{ date: String, time: String, class: String }],
  studentHistory: [{ date: Date, time: String, student: String }],
  cancelledClasses: [{ date: Date, time: String, student: String }],
  classHistory: [
    {
      studentId: String,
      studentName: String,
      date: String,
      time: String,
      class: String,
      completedAt: { type: Date, default: Date.now },
      attendanceStatus: { type: String, enum: ['completed', 'missed'], default: 'completed' }
    }
  ],
  proRecord: { type: String, default: '' },
  proWins: { type: Number, default: 0 },
  proLosses: { type: Number, default: 0 },
  lastAttendance: {
    date: { type: Date },
    status: { type: String },
    confirmedBy: { type: String },
    timestamp: { type: Date }
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
  ],
  verified: { type: Boolean, default: false },
  verificationCode: { type: String },
  updateVerificationCode: { type: String },
  updateVerificationCodeExpires: { type: Date },
  lastPaidDate: { type: Date } // Track when coach was last paid
});

const Coach = mongoose.model('Coach', coachSchema);

// Define Mongoose Schema for Rates
const rateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String }, // Assuming image is stored as a URL or base64
  ratesInfo: { type: String, default: '' }, // ADD THIS
});

const Rate = mongoose.model('Rate', rateSchema);

// Define Mongoose Schema for Promos
const promoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String }, // Assuming image is stored as a URL or base64
  promoInfo: { type: String, default: '' }, // ADD THIS
});

const Promo = mongoose.model('Promo', promoSchema);

// Define Mongoose Schema for Classes
const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String }, // Assuming image is stored as a URL or base64
  video: { type: String }, // Add this line for video (base64 or URL)
});

const Class = mongoose.model('Class', classSchema);

// Define Mongoose Schema for Payroll
const payrollSchema = new mongoose.Schema({
coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
amount: { type: Number, required: true },
paymentDate: { type: Date, required: true },
status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
// Additional payroll details
totalClasses: { type: Number, default: 0 },
totalClients: { type: Number, default: 0 },
totalRevenue: { type: Number, default: 0 },
coachShare: { type: Number, default: 0 },
// Attendance summary
attendanceSummary: {
totalDaysPresent: { type: Number, default: 0 },
totalDaysAbsent: { type: Number, default: 0 },
totalDaysMarked: { type: Number, default: 0 }
},
// Metadata
processedBy: { type: String, default: 'admin' },
createdAt: { type: Date, default: Date.now }
});

const Payroll = mongoose.model('Payroll', payrollSchema);

// Define Mongoose Schema for Coach Availability
const coachAvailabilitySchema = new mongoose.Schema({
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  availableDates: [{
    date: { type: Date, required: true },
    time: { type: String, required: true }
  }],
});

const CoachAvailability = mongoose.model('CoachAvailability', coachAvailabilitySchema);

// Booking Schema
const bookingSchema = new mongoose.Schema({
  coachId: { type: String, required: true },
  coachName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  class: { type: String, required: true },
  paymentStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  paymentProof: { type: String }, // URL or base64 of the payment proof
  paymentDate: { type: Date },
  verifiedBy: { type: String }, // Admin who verified the payment
  verificationDate: { type: Date }
});

const Booking = mongoose.model('Booking', bookingSchema);

// Request validation middleware
const validateRegistration = (req, res, next) => {
  const { email, username, firstname, lastname, password } = req.body;
  if (!email || !username || !firstname || !lastname || !password) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long'
    });
  }
  next();
};

// Register endpoint with validation
app.post('/register', validateRegistration, async (req, res, next) => {
  try {
    let { email, username, firstname, lastname, password, isAdmin } = req.body;
    email = email.toLowerCase();
    const emailRegex = /^[^\s@]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Email already in use' 
      });
    }
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ 
        success: false,
        error: 'Username already in use' 
      });
    }
    if (isAdmin) {
      // For admin, no verification needed
      const user = new User({ email, username, firstname, lastname, password, isAdmin: true, verified: true });
      await user.save();
      return res.json({ success: true, message: 'Admin account created.' });
    } else {
      // For normal users, do email verification
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const expires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
      const user = new User({ email, username, firstname, lastname, password, isAdmin: false, verified: false, verificationCode, verificationCodeExpires: expires });
      await user.save();
      // Send email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      const brand = await EmailBrand.findOne() || await EmailBrand.create({});
      const { subject, html, text } = buildVerificationEmail({
        code: verificationCode,
        purpose: 'Email Verification',
        expiresMinutes: 3,
        brand
      });
      await transporter.sendMail({ from: 'SenJitsu <' + process.env.EMAIL_USER + '>', to: email, subject, html, text });
      return res.json({ success: true, message: 'Verification code sent to email.' });
    }
  } catch (err) {
    next(err);
  }
});

// Resend code endpoint
app.post('/resend-code', async (req, res) => {
  console.log('RESEND CODE endpoint called', req.body);
  const { email } = req.body;
  const user = await User.findOne({
    $or: [
      { email: email },
      { username: email }
    ]
  });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.verified) return res.status(400).json({ success: false, error: 'User already verified' });
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
  user.verificationCode = verificationCode;
  user.verificationCodeExpires = expires;
  await user.save();
  // SEND EMAIL CODE
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const brand = await EmailBrand.findOne() || await EmailBrand.create({});
  const { subject, html, text } = buildVerificationEmail({
    code: verificationCode,
    purpose: 'Email Verification',
    expiresMinutes: 3,
    brand
  });
  await transporter.sendMail({ from: 'SenJitsu <' + process.env.EMAIL_USER + '>', to: user.email, subject, html, text });
  return res.json({ success: true, message: 'Verification code resent.' });
});

// Update /verify-email to check expiration
app.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.verified) return res.json({ success: true, message: 'Already verified' });
  if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ success: false, error: 'Verification code expired. Please resend code.' });
  }
  if (user.verificationCode === code) {
    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();
    return res.json({ success: true, message: 'Email verified! You can now log in.' });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }
});

// Login endpoint with better error handling
app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log('LOGIN ATTEMPT:', { username, password });

    // Try to find in User collection
    const user = await User.findOne({
      $or: [
        { email: username },
        { username: username }
      ]
    });
    console.log('USER FOUND:', user);

    if (user && user.password === password) {
      if (!user.verified) {
        return res.status(403).json({ success: false, error: 'Email not verified. Please check your email for the verification code.' });
      }
      
      // 🔥 UPDATE: Track last active time when user logs in
      user.lastActive = new Date();
      await user.save();
      
      res.json({
        success: true,
        user: {
          _id: user._id,
          email: user.email,
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          profilePic: user.profilePic || null,
          profileBg: user.profileBg || null,
          bookings: user.bookings || [],
          isAdmin: user.isAdmin || false,
          userType: user.isAdmin ? 'admin' : 'user'
        }
      });
      return;
    }

    // Try to find in Coach collection
    const coach = await Coach.findOne({
      $or: [
        { email: username },
        { username: username }
      ]
    });
    console.log('COACH FOUND:', coach);

    if (coach && coach.password === password) {
      // Check if coach needs verification
      if (!coach.verified) {
        // Send verification email on first login attempt
        console.log('🔄 Sending verification email to coach on first login attempt...');
        
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        const coachName = `${coach.firstname} ${coach.lastname}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: coach.email,
          subject: 'Welcome to SenJitsu - Verify Your Coach Account',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <img src="https://i.imgur.com/YourLogoHere.png" alt="SenJitsu Logo" style="max-width: 150px; height: auto;">
                </div>
                
                <h2 style="color: #2ecc40; margin-bottom: 20px;">Hello Coach ${coachName}!</h2>
                
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                  Welcome to the SenJitsu coaching team! To complete your account setup and access the coach dashboard, please verify your email address.
                </p>
                
                <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0; border-left: 4px solid #2ecc40;">
                  <h3 style="color: #2ecc40; margin-bottom: 15px;">Your Verification Code</h3>
                  <div style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 3px; font-family: 'Courier New', monospace;">
                    ${coach.verificationCode}
                  </div>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                  Enter this code on the verification page to activate your coach account.
                </p>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px;">
                    This is an automated message from SenJitsu/FIST GYM.<br>
                    If you didn't request this verification, please ignore this email.
                  </p>
                </div>
              </div>
            </div>
          `
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error('❌ Error sending verification email:', error);
          } else {
            console.log('✅ Verification email sent to coach:', info.response);
          }
        });

        return res.status(403).json({ 
          success: false, 
          error: 'Coach account not verified. Please check your email for the verification code.',
          notVerified: true,
          email: coach.email
        });
      }
      
      // 🔥 UPDATE: Track last active time when coach logs in (if they have lastActive field)
      if (coach.lastActive !== undefined) {
        coach.lastActive = new Date();
        await coach.save();
      }
      
      res.json({
        success: true,
        user: {
          email: coach.email,
          username: coach.username,
          firstname: coach.firstname,
          lastname: coach.lastname,
          profilePic: coach.profilePic || null,
          biography: coach.biography || null,
          userType: 'coach',
          _id: coach._id,
          specialties: coach.specialties || [], // <-- DAPAT KASAMA ITO!
          belt: coach.belt || '',
          availability: coach.availability || [],
        }
      });
      return;
    }

    // If not found
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  } catch (err) {
    next(err);
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key'); // Replace with your secret key
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Update profile picture endpoint with validation
app.post('/update-profile-pic', async (req, res, next) => {
  try {
    const { username, profilePic } = req.body;
    if (!username || !profilePic) {
      return res.status(400).json({
        success: false,
        error: 'Username and profile picture are required'
      });
    }

    const user = await User.findOneAndUpdate(
      { username },
      { profilePic },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({ success: true, profilePic: user.profilePic });
  } catch (err) {
    next(err);
  }
});

// Utility function to check if a schedule is expired
const isScheduleExpired = (date, time) => {
    const now = new Date();
    const scheduleDate = new Date(date);
    
    if (time) {
        // Handle time ranges like "10:00 AM - 11:00 AM"
        let endTimeStr = time;
        if (time.includes('-')) {
            // Take the end time from the range
            endTimeStr = time.split('-')[1].trim();
        }
        
        // Parse time string to hours and minutes
        let [timeStr, ampm] = endTimeStr.split(' ');
        let [hour, minute] = timeStr.split(':').map(Number);
        
        // Convert to 24-hour format
        if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
        if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
        
        scheduleDate.setHours(hour, minute, 0, 0);
    }
    
    return scheduleDate < now;
};

// Filter out expired schedules from an array
const filterExpiredSchedules = (schedules) => {
    if (!Array.isArray(schedules)) return [];
    return schedules.filter(schedule => !isScheduleExpired(schedule.date, schedule.time));
};

// Helper function to check if two time ranges overlap
const doTimeRangesOverlap = (time1, time2) => {
    try {
        // Parse time1 (e.g., "10:00 AM - 1:00 PM")
        const [start1Str, end1Str] = time1.split(' - ');
        // Parse time2 (e.g., "4:30 PM - 6:30 PM")
        const [start2Str, end2Str] = time2.split(' - ');

        // Convert to 24-hour format for comparison
        const convertTo24Hour = (timeStr) => {
            const [time, ampm] = timeStr.trim().split(' ');
            let [hour, minute] = time.split(':').map(Number);
            if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
            return hour * 60 + minute; // Convert to minutes for easy comparison
        };

        const start1 = convertTo24Hour(start1Str);
        const end1 = convertTo24Hour(end1Str);
        const start2 = convertTo24Hour(start2Str);
        const end2 = convertTo24Hour(end2Str);

        // Check for overlap: start1 < end2 && start2 < end1
        return start1 < end2 && start2 < end1;
    } catch (err) {
        console.error('Error parsing time ranges:', err);
        return false;
    }
};

// Function to check if a schedule is already booked
const isScheduleBooked = async (coachId, date, time, classType) => {
    try {
        // Define group classes (unlimited capacity per time slot)
        const groupClasses = ['jiu jitsu adults', 'jiu jitsu kids', 'judo', 'wrestling', 'kali'];
        const isGroupClass = classType && groupClasses.some(gc => classType.toLowerCase().includes(gc.toLowerCase()));
        
        // Define one-on-one classes (exclusive time slots)
        const oneOnOneClasses = ['boxing', 'muay thai', 'mma'];
        const isOneOnOneClass = classType && oneOnOneClasses.some(oc => classType.toLowerCase().includes(oc.toLowerCase()));
        
        if (isOneOnOneClass) {
            // ONE-ON-ONE CLASSES: Check if ANY user has booked this coach at this exact time
            const bookedUser = await User.findOne({
                'bookings': {
                    $elemMatch: {
                        coachId: coachId,
                        date: date,
                        time: time,
                        paymentStatus: { $in: ['verified', 'pending', 'unpaid'] }
                    }
                }
            });

            if (bookedUser) {
                return true;
            }
            
            return false;
        }
        
        if (isGroupClass) {
            // GROUP CLASSES: Always available (backend doesn't prevent group bookings)
            return false;
        }
        
        // FALLBACK: For unknown class types, treat as one-on-one
        
        const bookedUser = await User.findOne({
            'bookings': {
                $elemMatch: {
                    coachId: coachId,
                    date: date,
                    time: time,
                    paymentStatus: { $in: ['verified', 'pending', 'unpaid'] }
                }
            }
        });

        return !!bookedUser;
    } catch (err) {
        console.error('Error checking if schedule is booked:', err);
        return false;
    }
};

// 🚀 OPTIMIZED: Bulk booking status check function (fixes N+1 query problem)
const getBulkBookingStatus = async (coaches) => {
    try {
        // Collect all schedule combinations we need to check
        const scheduleChecks = [];
        coaches.forEach(coach => {
            if (coach.availability) {
                coach.availability.forEach(schedule => {
                    scheduleChecks.push({
                        coachId: coach._id.toString(),
                        date: schedule.date,
                        time: schedule.time,
                        class: schedule.class,
                        scheduleKey: `${coach._id}-${schedule.date}-${schedule.time}-${schedule.class || ''}`
                    });
                });
            }
        });

        if (scheduleChecks.length === 0) return {};

        // 🚀 SINGLE DATABASE QUERY instead of N queries
        const bookedSchedules = await User.aggregate([
            {
                $match: {
                    'bookings.paymentStatus': { $in: ['verified', 'pending', 'unpaid'] }
                }
            },
            {
                $unwind: '$bookings'
            },
            {
                $match: {
                    'bookings.paymentStatus': { $in: ['verified', 'pending', 'unpaid'] }
                }
            },
            {
                $project: {
                    _id: 0,
                    coachId: '$bookings.coachId',
                    date: '$bookings.date',
                    time: '$bookings.time',
                    class: '$bookings.class',
                    scheduleKey: {
                        $concat: [
                            '$bookings.coachId', '-', 
                            '$bookings.date', '-', 
                            '$bookings.time', '-',
                            { $ifNull: ['$bookings.class', ''] }
                        ]
                    }
                }
            }
        ]);

        // Create lookup map for O(1) access
        const bookedMap = {};
        bookedSchedules.forEach(booking => {
            bookedMap[booking.scheduleKey] = true;
        });

        return bookedMap;
    } catch (error) {
        console.error('Error in bulk booking status check:', error);
        return {};
    }
};

// Modify the GET /api/coaches endpoint to include booking status
app.get('/api/coaches', async (req, res) => {
    try {
        // Check if username query parameter is provided
        const { username, skipBookingStatus } = req.query;
        
        let coaches;
        if (username) {
            // Find specific coach by username
            coaches = await Coach.find({ username: username });
        } else {
            // Find all coaches
            coaches = await Coach.find();
        }
        
        // 🚀 PERFORMANCE: Only clean expired schedules periodically, not every request
        const shouldCleanExpired = Math.random() < 0.1; // 10% chance to clean
        if (shouldCleanExpired) {
            let totalCleaned = 0;
            for (const coach of coaches) {
                if (coach.availability && coach.availability.length > 0) {
                    const originalCount = coach.availability.length;
                    const filteredAvailability = filterExpiredSchedules(coach.availability);
                    const newCount = filteredAvailability.length;
                    
                    if (newCount < originalCount) {
                        coach.availability = filteredAvailability;
                        await coach.save();
                        totalCleaned += (originalCount - newCount);
                    }
                }
            }
            
            if (totalCleaned > 0) {
                console.log(`🧹 Cleaned ${totalCleaned} expired slots from database`);
            }
        }
        
        // Convert to plain objects and filter expired schedules
        const coachesData = coaches.map(coach => {
            const coachObj = coach.toObject();
            if (coachObj.availability) {
                coachObj.availability = filterExpiredSchedules(coachObj.availability);
            }
            return coachObj;
        });
        
        // 🚀 BULK OPTIMIZATION: Get all booking statuses in one query
        if (skipBookingStatus !== 'true') {
            const bookedMap = await getBulkBookingStatus(coachesData);
            
            // Apply booking status using the lookup map
            coachesData.forEach(coach => {
                if (coach.availability) {
                    coach.availability.forEach(schedule => {
                        const scheduleKey = `${coach._id}-${schedule.date}-${schedule.time}-${schedule.class || ''}`;
                        schedule.isBooked = !!bookedMap[scheduleKey];
                    });
                }
            });
        }
        
        // 🚀 PERFORMANCE: Add caching headers for coaches data
        res.set({
            'Cache-Control': 'public, max-age=60', // Cache coaches for 1 minute
            'ETag': `"coaches-${coachesData.length}-${Date.now()}"`
        });
        
        res.json(coachesData);
    } catch (err) {
        console.error('Error in coaches API:', err);
        res.status(500).json({ error: 'Server error while fetching coaches.' });
    }
});

// 🚀 SECURITY: Image size validation middleware
const validateImageSize = (paymentProof, maxSizeKB = 500) => {
    if (!paymentProof) return true;
    
    const sizeKB = Math.round(paymentProof.length / 1024);
    if (sizeKB > maxSizeKB) {
        return {
            valid: false,
            error: `Payment proof image is too large (${sizeKB}KB). Maximum allowed: ${maxSizeKB}KB. Please compress your image.`,
            actualSize: sizeKB
        };
    }
    return { valid: true };
};

// Modify the booking endpoint to check if schedule is already booked
app.post('/api/book', async (req, res, next) => {
    try {
        const { userId, booking, paymentProof } = req.body;
        if (!userId || !booking) {
            return res.status(400).json({
                success: false,
                error: 'User ID and booking details are required'
            });
        }

        // 🚀 VALIDATE IMAGE SIZE to prevent MarkBai23 issue
        if (paymentProof) {
            const sizeValidation = validateImageSize(paymentProof, 500); // 500KB limit
            if (!sizeValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: sizeValidation.error
                });
            }
        }

        // Check if the schedule is expired
        if (isScheduleExpired(booking.date, booking.time)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot book an expired schedule'
            });
        }

        // Check if the schedule is already booked using the updated logic
        const isBooked = await isScheduleBooked(booking.coachId, booking.date, booking.time, booking.class);
        if (isBooked) {
            return res.status(400).json({
                success: false,
                error: 'This coach is already booked for another class at this time or has an overlapping schedule'
            });
        }

        // Add booking with payment status based on whether payment proof is provided
        const bookingWithPayment = {
            ...booking,
            paymentStatus: paymentProof ? 'pending' : 'unpaid',
            paymentProof: paymentProof || null,
            paymentDate: paymentProof ? new Date() : null
        };

        const user = await User.findOneAndUpdate(
            { username: userId },
            { $push: { bookings: bookingWithPayment } },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Only create a Booking document if payment proof is provided
        if (paymentProof) {
            const newBookingDoc = new Booking({
                coachId: booking.coachId,
                coachName: booking.coachName,
                classId: booking.classId || null,
                className: booking.className || '',
                clientId: user._id,
                clientName: user.firstname + ' ' + user.lastname,
                date: booking.date,
                amount: booking.amount || 0,
                paymentStatus: 'pending',
                paymentProof: paymentProof,
                paymentDate: new Date()
            });
            await newBookingDoc.save();
        }

        const newBooking = user.bookings[user.bookings.length - 1];
        res.json({ 
            success: true, 
            booking: newBooking,
            message: paymentProof ? 'Booking created. Please wait for payment verification.' : 'Booking created. Please proceed with payment.'
        });
    } catch (err) {
        next(err);
    }
});

// Cancel a booking for a user
app.post('/api/book/cancel', async (req, res) => {
  try {
    const { userId, booking } = req.body;
    if (!userId || !booking) {
      return res.status(400).json({ success: false, error: 'User ID and booking details are required' });
    }

    // Remove the booking from the user's bookings array
    const user = await User.findOneAndUpdate(
      { username: userId },
      { $pull: { bookings: { coachId: booking.coachId, date: booking.date, time: booking.time } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Add to coach's cancelledClasses using atomic update
    let studentName = user.firstname && user.lastname ? `${user.firstname} ${user.lastname}` : user.username;
    await Coach.findOneAndUpdate(
      { _id: booking.coachId },
      { $push: { cancelledClasses: {
        date: new Date(booking.date),
        time: booking.time,
        student: studentName
      } } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while cancelling booking.' });
  }
});

// Add Coach endpoint
app.post('/api/coaches', async (req, res, next) => {
  const { email, username, firstname, lastname, password, profilePic, biography, specialties, belt, proRecord, proWins, proLosses } = req.body;

  if (!email || !username || !firstname || !lastname || !password || !biography) {
    return res.status(400).json({ error: 'Please provide all required coach information.' });
  }

  try {
    const wins = typeof proWins !== 'undefined' ? proWins : (proRecord ? parseInt((proRecord.split('-')[0] || '').trim()) : 0);
    const losses = typeof proLosses !== 'undefined' ? proLosses : (proRecord ? parseInt((proRecord.split('-')[1] || '').trim()) : 0);
    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newCoach = new Coach({
      email,
      username,
      firstname,
      lastname,
      password,
      profilePic,
      biography,
      specialties: specialties || [],
      belt: belt || '',
      proRecord: `${wins} - ${losses}`,
      proWins: wins,
      proLosses: losses,
      availability: [],
      verified: false,
      verificationCode
    });
    await newCoach.save();

    // NOTE: Verification email will be sent when coach first attempts to login
    console.log('✅ Coach account created successfully. Verification email will be sent on first login attempt.');

    res.status(201).json({ success: true, message: 'Coach added successfully!' });
  } catch (err) {
    console.error('Error adding coach:', err);
    res.status(500).json({ error: 'Server error while adding coach.' });
  }
});

// DELETE route for Rates
app.delete('/api/rates/:id', async (req, res, next) => {
  try {
    const rateId = req.params.id;
    const deletedRate = await Rate.findByIdAndDelete(rateId);

    if (!deletedRate) {
      return res.status(404).json({ success: false, error: 'Rate not found' });
    }

    res.json({ success: true, message: 'Rate deleted successfully' });
  } catch (err) {
    console.error('Error deleting rate:', err);
    res.status(500).json({ success: false, error: 'Server error while deleting rate.' });
  }
});

// DELETE route for Promos
app.delete('/api/promos/:id', async (req, res, next) => {
  try {
    const promoId = req.params.id;
    const deletedPromo = await Promo.findByIdAndDelete(promoId);

    if (!deletedPromo) {
      return res.status(404).json({ success: false, error: 'Promo not found' });
    }

    res.json({ success: true, message: 'Promo deleted successfully' });
  } catch (err) {
    console.error('Error deleting promo:', err);
    res.status(500).json({ success: false, error: 'Server error while deleting promo.' });
  }
});

// GET route for Promos
app.get('/api/promos', async (req, res, next) => {
  try {
    const promos = await Promo.find(); // Find all promos in the database
    res.json(promos); // Send the promos as a JSON response
  } catch (err) {
    console.error('Error fetching promos:', err);
    res.status(500).json({ success: false, error: 'Server error while fetching promos.' });
  }
});

// Upload routes removed - using Facebook video embeds and URL inputs instead

// POST route for Promos
app.post('/api/promos', async (req, res, next) => {
  console.log('POST /api/promos body:', req.body); // DEBUG
  const { name, price, image, promoInfo } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Please provide promo name and price.' });
  }

  try {
    const newPromo = new Promo({
      name,
      price: parseFloat(price),
      image,
      promoInfo, // ensure this is saved
    });

    await newPromo.save();
    res.status(201).json({ success: true, message: 'Promo added successfully!', promo: newPromo });
  } catch (err) {
    console.error('Error adding promo:', err);
    res.status(500).json({ error: 'Server error while adding promo.' });
  }
});

// PUT route for Promos (update)
app.put('/api/promos/:id', async (req, res, next) => {
  console.log('PUT /api/promos/:id body:', req.body); // DEBUG
  try {
    const promoId = req.params.id;
    const { name, price, image, promoInfo } = req.body;
    const updatedPromo = await Promo.findByIdAndUpdate(
      promoId,
      { name, price: parseFloat(price), image, promoInfo }, // ensure this is saved
      { new: true }
    );
    if (!updatedPromo) {
      return res.status(404).json({ success: false, error: 'Promo not found' });
    }
    res.json({ success: true, message: 'Promo updated successfully!', promo: updatedPromo });
  } catch (err) {
    console.error('Error updating promo:', err);
    res.status(500).json({ success: false, error: 'Server error while updating promo.' });
  }
});

// GET route for Rates
app.get('/api/rates', async (req, res, next) => {
  try {
    const rates = await Rate.find(); // Find all rates in the database
    res.json(rates); // Send the rates as a JSON response
  } catch (err) {
    console.error('Error fetching rates:', err);
    res.status(500).json({ success: false, error: 'Server error while fetching rates.' });
  }
});

// POST route for Rates
app.post('/api/rates', async (req, res, next) => {
  const { name, price, image, ratesInfo } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Please provide rate name and price.' });
  }

  try {
    const newRate = new Rate({
      name,
      price: parseFloat(price),
      image,
      ratesInfo, // ADD THIS
    });

    await newRate.save();
    res.status(201).json({ success: true, message: 'Rate added successfully!', rate: newRate });
  } catch (err) {
    console.error('Error adding rate:', err.message, err.stack);
    res.status(500).json({ error: 'Server error while adding rate.' });
  }
});

// PUT route for Rates (update)
app.put('/api/rates/:id', async (req, res, next) => {
  try {
    const rateId = req.params.id;
    const { name, price, image, ratesInfo } = req.body;
    const updatedRate = await Rate.findByIdAndUpdate(
      rateId,
      { name, price: parseFloat(price), image, ratesInfo }, // ADD ratesInfo
      { new: true }
    );
    if (!updatedRate) {
      return res.status(404).json({ success: false, error: 'Rate not found' });
    }
    res.json({ success: true, message: 'Rate updated successfully!', rate: updatedRate });
  } catch (err) {
    console.error('Error updating rate:', err);
    res.status(500).json({ success: false, error: 'Server error while updating rate.' });
  }
});

// GET route for Classes
app.get('/api/classes', async (req, res, next) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    console.error('Error fetching classes:', err);
    res.status(500).json({ success: false, error: 'Server error while fetching classes.' });
  }
});

// POST route for Classes
app.post('/api/classes', async (req, res, next) => {
  const { name, description, image, video } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: 'Please provide class name and description.' });
  }

  try {
    const newClass = new Class({
      name,
      description,
      image,
      video, // Save video
    });

    await newClass.save();
    res.status(201).json({ success: true, message: 'Class added successfully!', class: newClass });
  } catch (err) {
    console.error('Error adding class:', err);
    res.status(500).json({ error: 'Server error while adding class.' });
  }
});

// PUT route for Classes (update)
app.put('/api/classes/:id', async (req, res, next) => {
  try {
    const classId = req.params.id;
    const { name, description, image, video } = req.body;
    const updatedClass = await Class.findByIdAndUpdate(
      classId,
      { name, description, image, video },
      { new: true }
    );
    if (!updatedClass) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    res.json({ success: true, message: 'Class updated successfully!', class: updatedClass });
  } catch (err) {
    console.error('Error updating class:', err);
    res.status(500).json({ success: false, error: 'Server error while updating class.' });
  }
});

// DELETE route for Classes
app.delete('/api/classes/:id', async (req, res, next) => {
  try {
    const classId = req.params.id;
    console.log('DELETE /api/classes/:id called:', classId);
    const deletedClass = await Class.findByIdAndDelete(classId);

    if (!deletedClass) {
      console.log('Class not found for delete:', classId);
      return res.status(404).json({ success: false, error: 'Class not found' });
    }

    console.log('Class deleted:', classId);
    res.json({ success: true, message: 'Class deleted successfully' });
  } catch (err) {
    console.error('Error deleting class:', err);
    res.status(500).json({ success: false, error: 'Server error while deleting class.' });
  }
});



// PUT route for Coaches (update)
app.put('/api/coaches/:id', async (req, res) => {
  try {
    const coachId = req.params.id;
    const { firstname, lastname, username, email, biography, profilePic, password, specialties, belt, proRecord, proWins, proLosses } = req.body;
    
    // Check if coach has verified the update (this ensures email verification was done)
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }
    // Only check verification if it's a password change and there's pending verification
    if (password && (coach.updateVerificationCode || coach.updateVerificationCodeExpires)) {
      return res.status(403).json({ success: false, error: 'Profile update not allowed. Please verify code first.' });
    }
    
    // Build update object
    const update = { firstname, lastname, username, email, biography };
    if (profilePic !== undefined) update.profilePic = profilePic;
    if (password && password.trim() !== '') update.password = password; // plain text
    if (specialties !== undefined) update.specialties = specialties;
    if (belt !== undefined) update.belt = belt;
    if (proRecord !== undefined || proWins !== undefined || proLosses !== undefined) {
      const winsEdit = typeof proWins !== 'undefined' ? proWins : (proRecord ? parseInt((proRecord.split('-')[0] || '').trim()) : 0);
      const lossesEdit = typeof proLosses !== 'undefined' ? proLosses : (proRecord ? parseInt((proRecord.split('-')[1] || '').trim()) : 0);
      update.proRecord = `${winsEdit} - ${lossesEdit}`;
      update.proWins = winsEdit;
      update.proLosses = lossesEdit;
    }
    console.log('COACH UPDATE:', update);
    // Remove undefined fields
    Object.keys(update).forEach(key => update[key] === undefined && delete update[key]);
    const updatedCoach = await Coach.findByIdAndUpdate(coachId, { $set: update }, { new: true });
    if (!updatedCoach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }
    res.json({ success: true, message: 'Coach updated successfully!', coach: updatedCoach });
  } catch (err) {
    console.error('Error updating coach:', err);
    res.status(500).json({ success: false, error: 'Server error while updating coach.' });
  }
});

// DELETE route for Coaches
app.delete('/api/coaches/:id', async (req, res) => {
  try {
    const coachId = req.params.id;
    const deletedCoach = await Coach.findByIdAndDelete(coachId);
    if (!deletedCoach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }
    res.json({ success: true, message: 'Coach deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while deleting coach.' });
  }
});

// Payroll endpoints
app.post('/api/payroll', async (req, res) => {
  try {
    const { coachId, amount, paymentDate, status } = req.body;
    
    // Validate required fields
    if (!coachId || !amount || !paymentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if coach exists
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    // Calculate start and end of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Fetch coach earnings data
    const coachIdString = coachId.toString();
    const bookings = await Booking.find({
      coachId: coachIdString,
      status: 'completed',
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const totalClasses = bookings.length;
    const totalClients = bookings.reduce((sum, booking) => sum + (booking.clients || 1), 0);
    const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.price || 0), 0);
    const coachShare = totalRevenue * 0.5;
    
    // Get attendance data
    const attendanceRecords = await CoachesAttendance.find({
      coachId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    const totalDaysPresent = attendanceRecords.filter(record => record.status === 'present').length;
    const totalDaysAbsent = attendanceRecords.filter(record => record.status === 'absent').length;
    const totalDaysMarked = attendanceRecords.length;

    // Create comprehensive payroll record
    const payroll = new Payroll({
      coachId,
      amount,
      paymentDate: new Date(paymentDate),
      status,
      totalClasses,
      totalClients,
      totalRevenue,
      coachShare,
      attendanceSummary: {
        totalDaysPresent,
        totalDaysAbsent,
        totalDaysMarked
      },
      processedBy: 'admin'
    });

    await payroll.save();

    // Update coach's lastPaidDate to current timestamp to ensure proper filtering
    await Coach.findByIdAndUpdate(coachId, {
      lastPaidDate: new Date()
    });

    console.log('✅ Comprehensive payroll record saved:', payroll._id);
    
    // Send notification to coach
    try {
      const paidThrough = new Date(paymentDate);
      const coachNotification = {
        type: 'payment_received',
        message: `Payment of ₱${amount.toLocaleString()} has been processed for ${paidThrough.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}.`,
        amount: amount,
        paidThrough: paidThrough.toISOString(),
        timestamp: new Date(),
        read: false
      };
      
      coach.notifications = coach.notifications || [];
      coach.notifications.push(coachNotification);
      const savedCoach = await coach.save();
      
      console.log('✅ Payment notification sent to coach:', coach.firstname, coach.lastname);
      console.log('🔍 Coach now has', savedCoach.notifications.length, 'notifications');
    } catch (notificationError) {
      console.error('❌ Error sending notification to coach:', notificationError);
    }

    // Return success response
    return res.status(201).json({
      message: 'Payment processed successfully',
      payroll,
      notificationSent: true
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.get('/api/payroll/history', async (req, res) => {
  try {
    console.log('📋 Fetching payroll history from database...');
    
    const payrollHistory = await Payroll.find()
      .populate('coachId', 'firstname lastname')
      .sort({ paymentDate: -1 });

    console.log('📋 Found payroll records:', payrollHistory.length);
    
    // Transform the data to include coach name and handle missing coachId
    const formattedHistory = payrollHistory.map(payment => {
      const coachName = payment.coachId ? 
        `${payment.coachId.firstname} ${payment.coachId.lastname}` : 
        'Unknown Coach';
      
      return {
        _id: payment._id,
        coachName: coachName,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        status: payment.status,
        totalClasses: payment.totalClasses || 0,
        totalClients: payment.totalClients || 0,
        totalRevenue: payment.totalRevenue || 0,
        attendanceSummary: payment.attendanceSummary || {
          totalDaysPresent: 0,
          totalDaysAbsent: 0,
          totalDaysMarked: 0
        }
      };
    });

    console.log('📋 Formatted history records:', formattedHistory.length);
    res.json(formattedHistory);
  } catch (error) {
    console.error('❌ Error fetching payroll history:', error);
    res.status(500).json({ error: 'Failed to fetch payroll history' });
  }
});

// GET payroll data for a coach (for admin and payslip)
app.get('/api/payroll/data/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { start, end } = req.query;
    if (!coachId || !start || !end) {
      return res.status(400).json({ error: 'Missing coachId, start, or end date.' });
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999); // include the whole end day

    // Get ALL attendance data for the coach (not limited by date range)
    const coachData = await Coach.findById(coachId);
    console.log(`🔍 [COACH DEBUG] Coach found:`, coachData ? `${coachData.firstname} ${coachData.lastname}` : 'NOT FOUND');
    
    // Get all attendance records for this coach, sorted by date (most recent first)
    const allAttendanceRecords = await CoachesAttendance.find({ coachId }).sort({ date: -1 });
    console.log(`🔍 [ATTENDANCE DEBUG] Total attendance records found: ${allAttendanceRecords.length}`);
    
    // For payslip, we'll show recent attendance (last 30 days or all if less)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAttendanceRecords = allAttendanceRecords.filter(record => 
      new Date(record.date) >= thirtyDaysAgo
    );
    
    console.log(`🔍 [ATTENDANCE DEBUG] Recent attendance records (last 30 days): ${recentAttendanceRecords.length}`);
    
    // Use recent records for the payslip
    const attendanceRecords = recentAttendanceRecords;

    // Calculate attendance statistics
    const totalDaysPresent = attendanceRecords.filter(record => record.status === 'present').length;
    const totalDaysAbsent = attendanceRecords.filter(record => record.status === 'absent').length;
    const totalDaysMarked = attendanceRecords.length;
    
    console.log(`🔍 [ATTENDANCE DEBUG] Coach: ${coachId}`);
    console.log(`🔍 [ATTENDANCE DEBUG] Date Range: ${startDate} to ${endDate}`);
    console.log(`🔍 [ATTENDANCE DEBUG] Found ${attendanceRecords.length} attendance records`);
    console.log(`🔍 [ATTENDANCE DEBUG] Present: ${totalDaysPresent}, Absent: ${totalDaysAbsent}`);
    if (attendanceRecords.length > 0) {
      console.log(`🔍 [ATTENDANCE DEBUG] Sample record:`, attendanceRecords[0]);
    }
    
    if (attendanceRecords.length > 0) {
      console.log(`🔍 [ATTENDANCE DEBUG] Latest attendance record:`, attendanceRecords[0]);
      console.log(`🔍 [ATTENDANCE DEBUG] Sample records:`, attendanceRecords.slice(0, 3).map(r => ({
        date: r.date,
        status: r.status,
        confirmedBy: r.confirmedBy
      })));
    }

    // Convert ObjectId to string for comparison since Payment.coachId is stored as String
    const coachIdString = coachId.toString();

    // Get coach's last paid date
    const coach = await Coach.findById(coachId);
    const lastPaidDate = coach?.lastPaidDate;

    // Simple filters - filter by lastPaidDate if exists
    let bookingFilter = {
      coachId,
      date: { $gte: startDate, $lte: endDate }
    };

    let paymentFilter = {
      coachId: coachIdString, // Use string version for Payment collection
      status: 'verified',
      verificationDate: { $gte: startDate, $lte: endDate }
    };

    // If coach has been paid before, only show earnings after last payment
    // This ensures paid amounts don't reappear but new bookings still count
    if (lastPaidDate) {
      const lastPaidDateObj = new Date(lastPaidDate);
      // Add 1 second to ensure we exclude the exact payment date
      lastPaidDateObj.setSeconds(lastPaidDateObj.getSeconds() + 1);
      
      bookingFilter.date = { 
        $gt: lastPaidDateObj,
        $lte: endDate 
      };
      paymentFilter.verificationDate = {
        $gt: lastPaidDateObj,
        $lte: endDate
      };
      
      console.log(`🔍 [PAYROLL FILTER] Coach ${coachId} lastPaidDate: ${lastPaidDate}`);
      console.log(`🔍 [PAYROLL FILTER] Filtering payments after: ${lastPaidDateObj}`);
    }

    // Get filtered bookings and payments
    const bookings = await Booking.find(bookingFilter);
    const verifiedPayments = await Payment.find(paymentFilter);

    // Debug logging
    console.log(`🔍 [PAYROLL DEBUG] Coach: ${coachId} (${typeof coachId})`);
    console.log(`🔍 [PAYROLL DEBUG] Coach String: ${coachIdString}`);
    console.log(`🔍 [PAYROLL DEBUG] Date Range: ${startDate} to ${endDate}`);
    console.log(`🔍 [PAYROLL DEBUG] Legacy Bookings Found: ${bookings.length}`);
    console.log(`🔍 [PAYROLL DEBUG] Verified Payments Found: ${verifiedPayments.length}`);
    
    // Log some sample payments to see their format
    if (verifiedPayments.length > 0) {
      console.log(`🔍 [PAYROLL DEBUG] Sample Payment:`, {
        id: verifiedPayments[0]._id,
        coachId: verifiedPayments[0].coachId,
        coachIdType: typeof verifiedPayments[0].coachId,
        amount: verifiedPayments[0].amount,
        verificationDate: verifiedPayments[0].verificationDate,
        className: verifiedPayments[0].className
      });
    }

            // Payroll calculation for coach

    // Group by class and date
    const classMap = {};
    let totalRevenue = 0;
    let totalClients = 0;
    let totalClasses = 0;

    // Process legacy bookings
    bookings.forEach(b => {
      const key = `${b.className}|${b.date.toISOString().split('T')[0]}`;
      if (!classMap[key]) {
        classMap[key] = {
          date: b.date,
          className: b.className,
          clientCount: 0,
          revenue: 0,
          coachShare: 0
        };
        totalClasses++;
      }
      classMap[key].clientCount++;
      classMap[key].revenue += b.amount;
      totalRevenue += b.amount;
      totalClients++;
    });

    // 🔥 NEW: Process verified payments from Payment collection
    verifiedPayments.forEach(payment => {
      // For package bookings, only count once
      if (payment.isPackage) {
        const key = `${payment.packageType} Package|${new Date(payment.verificationDate).toISOString().split('T')[0]}`;
        if (!classMap[key]) {
          classMap[key] = {
            date: new Date(payment.verificationDate),
            className: `${payment.packageType} Package (${payment.packageSessions} sessions)`,
            clientCount: 0,
            revenue: 0,
            coachShare: 0
          };
          totalClasses++;
        }
        classMap[key].clientCount += 1;
        classMap[key].revenue += payment.amount || 0;
        totalRevenue += payment.amount || 0;
        totalClients += 1;
      } else {
        // Regular single class booking
        const paymentDate = new Date(payment.verificationDate);
        const resolvedClass = payment.className || payment.class || 'Unknown Class';
        const key = `${resolvedClass}|${paymentDate.toISOString().split('T')[0]}`;
        if (!classMap[key]) {
          classMap[key] = {
            date: paymentDate,
            className: resolvedClass,
            clientCount: 0,
            revenue: 0,
            coachShare: 0
          };
          totalClasses++;
        }
        classMap[key].clientCount++;
        classMap[key].revenue += payment.amount || 0;
        totalRevenue += payment.amount || 0;
        totalClients++;
      }
    });

    // Compute coach share per class (50% split)
    Object.values(classMap).forEach(c => {
      c.coachShare = c.revenue * 0.5;
    });
    const coachShare = totalRevenue * 0.5;

    // --- Add membership earnings (₱1,000 per active membership) ---
    const currentDate = new Date();
    const activeMemberships = await MembershipApplication.find({ 
      status: 'approved',
      expirationDate: { $gt: currentDate }
    });
    const membershipEarnings = activeMemberships.length * 1000;

            // Payroll calculation completed

    res.json({
      totalClasses,
      totalClients,
      totalRevenue,
      coachShare,
      classBreakdown: Object.values(classMap),
      membershipEarnings, // <-- existing field
      verifiedPaymentsCount: verifiedPayments.length, // <-- new field for debugging
      // Attendance data
      attendanceData: {
        totalDaysPresent,
        totalDaysAbsent,
        totalDaysMarked,
        attendanceRecords: attendanceRecords.map(record => ({
          date: record.date,
          status: record.status,
          confirmedBy: record.confirmedBy,
          timestamp: record.timestamp
        }))
      }
    });
  } catch (err) {
    console.error('Error fetching payroll data:', err);
    res.status(500).json({ error: 'Server error while fetching payroll data.' });
  }
});

// GET payslip for a coach (latest period or by query)
app.get('/api/payroll/payslip/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    let { start, end } = req.query;
    // Default: current month
    const now = new Date();
    if (!start) start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    if (!end) end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    // Convert ObjectId to string for comparison since Payment.coachId is stored as String
    const coachIdString = coachId.toString();

    // Get coach's last paid date
    const coach = await Coach.findById(coachId);
    const lastPaidDate = coach?.lastPaidDate;

    // Filter by lastPaidDate if exists
    let bookingFilter = {
      coachId,
      date: { $gte: startDate, $lte: endDate }
    };

    let paymentFilter = {
      coachId: coachIdString, // Use string version for Payment collection
      status: 'verified',
      verificationDate: { $gte: startDate, $lte: endDate }
    };

    // If coach has been paid before, only show earnings after last payment
    if (lastPaidDate) {
      bookingFilter.date = { 
        $gt: lastPaidDate,
        $gte: startDate, 
        $lte: endDate 
      };
      paymentFilter.verificationDate = {
        $gt: lastPaidDate,
        $gte: startDate,
        $lte: endDate
      };
    }

    const bookings = await Booking.find(bookingFilter);
    const verifiedPayments = await Payment.find(paymentFilter);

    const classMap = {};
    let totalRevenue = 0;
    let totalClients = 0;
    let totalClasses = 0;
    
    // Process legacy bookings
    bookings.forEach(b => {
      const key = `${b.className}|${b.date.toISOString().split('T')[0]}`;
      if (!classMap[key]) {
        classMap[key] = {
          date: b.date,
          className: b.className,
          clientCount: 0,
          revenue: 0,
          coachShare: 0
        };
        totalClasses++;
      }
      classMap[key].clientCount++;
      classMap[key].revenue += b.amount;
      totalRevenue += b.amount;
      totalClients++;
    });

    // 🔥 NEW: Process verified payments
    verifiedPayments.forEach(payment => {
      if (payment.isPackage) {
        const key = `${payment.packageType} Package|${new Date(payment.verificationDate).toISOString().split('T')[0]}`;
        if (!classMap[key]) {
          classMap[key] = {
            date: new Date(payment.verificationDate),
            className: `${payment.packageType} Package (${payment.packageSessions} sessions)`,
            clientCount: 0,
            revenue: 0,
            coachShare: 0
          };
          totalClasses++;
        }
        classMap[key].clientCount += 1;
        classMap[key].revenue += payment.amount || 0;
        totalRevenue += payment.amount || 0;
        totalClients += 1;
      } else {
        const paymentDate = new Date(payment.verificationDate);
        const resolvedClass = payment.className || payment.class || 'Unknown Class';
        const key = `${resolvedClass}|${paymentDate.toISOString().split('T')[0]}`;
        if (!classMap[key]) {
          classMap[key] = {
            date: paymentDate,
            className: resolvedClass,
            clientCount: 0,
            revenue: 0,
            coachShare: 0
          };
          totalClasses++;
        }
        classMap[key].clientCount++;
        classMap[key].revenue += payment.amount || 0;
        totalRevenue += payment.amount || 0;
        totalClients++;
      }
    });

    Object.values(classMap).forEach(c => {
      c.coachShare = c.revenue * 0.5;
    });
    const coachShare = totalRevenue * 0.5;
    res.json({
      periodStart: startDate,
      periodEnd: endDate,
      totalClasses,
      totalClients,
      totalRevenue,
      coachShare,
      classBreakdown: Object.values(classMap)
    });
  } catch (err) {
    console.error('Error fetching payslip:', err);
    res.status(500).json({ error: 'Server error while fetching payslip.' });
  }
});

// --- Coach Availability Endpoints ---
// Set or update coach availability (upsert)
app.post('/api/availability', async (req, res) => {
  try {
    console.log('POST /api/availability payload:', req.body);
    const { coachId, availableDates } = req.body;
    if (!coachId || !Array.isArray(availableDates)) {
      return res.status(400).json({ error: 'coachId and availableDates are required.' });
    }
    // Validate structure
    for (const av of availableDates) {
      if (!av.date || !av.time) {
        return res.status(400).json({ error: 'Each availability must have a date and time.', av });
      }
    }
    // Upsert: update if exists, otherwise create
    const availability = await CoachAvailability.findOneAndUpdate(
      { coachId },
      { availableDates },
      { new: true, upsert: true }
    );
    res.json({ success: true, availability });
  } catch (err) {
    console.error('Error setting coach availability:', err);
    res.status(500).json({ error: 'Server error while setting coach availability.', details: err.message });
  }
});

// Get a coach's availability
app.get('/api/availability/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    const availability = await CoachAvailability.findOne({ coachId });
    if (!availability) {
      return res.json({ coachId, availableDates: [] });
    }
    
    // Filter out expired schedules
    if (availability.availableDates) {
      availability.availableDates = filterExpiredSchedules(availability.availableDates);
    }
    
    res.json(availability);
  } catch (err) {
    console.error('Error fetching coach availability:', err);
    res.status(500).json({ error: 'Server error while fetching coach availability.' });
  }
});

// Get all coaches' availabilities
app.get('/api/availability', async (req, res) => {
  try {
    const availabilities = await CoachAvailability.find().populate('coachId');
    const now = new Date();
    // Clean up expired slots in DB (date + time)
    for (const avail of availabilities) {
      const futureDates = avail.availableDates.filter(slot => {
        const slotDateTime = new Date(slot.date);
        if (slot.time) {
          const [hours, minutes] = slot.time.split(':').map(Number);
          slotDateTime.setHours(hours, minutes, 0, 0);
        }
        return slotDateTime > now;
      });
      if (futureDates.length !== avail.availableDates.length) {
        avail.availableDates = futureDates;
        await avail.save();
      }
    }
    // Only return coaches with future slots
    const filtered = availabilities.map(avail => ({
      ...avail.toObject(),
      availableDates: avail.availableDates.filter(slot => {
        const slotDateTime = new Date(slot.date);
        if (slot.time) {
          const [hours, minutes] = slot.time.split(':').map(Number);
          slotDateTime.setHours(hours, minutes, 0, 0);
        }
        return slotDateTime > now;
      })
    })).filter(avail => avail.availableDates.length > 0);
    res.json(filtered);
  } catch (err) {
    console.error('Error fetching all availabilities:', err);
    res.status(500).json({ error: 'Server error while fetching all availabilities.' });
  }
});

// Cancel a specific available schedule for a coach
app.delete('/api/availability/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { date, time, class: classType } = req.query;

    console.log('DELETE availability request:', { coachId, date, time, classType });

    if (!date || !time) {
      return res.status(400).json({ error: 'date and time are required.' });
    }

    // Find the coach document
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found.' });
    }

    console.log('Coach availability BEFORE:', coach.availability);

    // Remove the specific slot (robust: trim and lowercase for class, trim for time)
    coach.availability = (coach.availability || []).filter(av =>
      !(
        av.date === date &&
        av.time && av.time.trim() === time.trim() &&
        ((av.class || '').toLowerCase().trim() === (classType || '').toLowerCase().trim())
      )
    );

    console.log('Coach availability AFTER:', coach.availability);

    await coach.save();

    res.json({ success: true, availability: coach.availability });
  } catch (err) {
    console.error('Error cancelling coach availability:', err);
    res.status(500).json({ error: 'Server error while cancelling coach availability.', details: err.message });
  }
});

// POST route to create a booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { coachId, coachName, classId, className, clientId, clientName, date } = req.body;
    if (!coachId || !coachName || !classId || !className || !clientId || !clientName || !date) {
      return res.status(400).json({ error: 'Missing required booking fields.' });
    }
    // 1. Validate class exists
    const classDoc = await Class.findOne({ _id: classId, name: className });
    if (!classDoc) {
      return res.status(400).json({ error: 'Class not found.' });
    }
    // 2. Validate coach has the class as specialty
    const coachDoc = await Coach.findById(coachId);
    if (!coachDoc) {
      return res.status(400).json({ error: 'Coach not found.' });
    }
    const specialties = coachDoc.specialties.map(s => s.trim().toLowerCase());
    if (!specialties.includes(className.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Coach does not teach this class.' });
    }
    // 3. Fetch the price from the rates collection
    const rate = await Rate.findOne({ name: className });
    if (!rate) {
      return res.status(400).json({ error: 'Class rate not found.' });
    }
    const amount = rate.price;
    // 4. Save the booking
    const booking = new Booking({
      coachId,
      coachName,
      classId,
      className,
      clientId,
      clientName,
      date,
      amount
    });
    await booking.save();
    res.status(201).json({ success: true, message: 'Booking saved!', booking });
  } catch (err) {
    console.error('Error saving booking:', err);
    res.status(500).json({ error: 'Server error while saving booking.' });
  }
});

// 🚀 OPTIMIZED: Get user by username with selective projection and caching
app.get('/api/users/:username', async (req, res) => {
  try {
    // Only log for Admin to reduce spam
    if (req.params.username === 'Admin') {
      console.log('🔍 [USER FETCH] Fetching user:', req.params.username);
    }
    
    // 🚀 PERFORMANCE: Only select needed fields to reduce data transfer
    const user = await User.findOne(
      { username: req.params.username },
      {
        password: 0, // Never send password
        verificationCode: 0, // Don't send sensitive data
        updateVerificationCode: 0
      }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // 🔍 DEBUG: Special logging for Admin user notifications
    if (req.params.username === 'Admin') {
      console.log('🔍 [ADMIN FETCH] Admin user found!');
      console.log('🔍 [ADMIN FETCH] Admin isAdmin:', user.isAdmin);
      console.log('🔍 [ADMIN FETCH] Admin notifications count:', user.notifications?.length || 0);
      console.log('🔍 [ADMIN FETCH] Admin notifications:', user.notifications?.map(n => ({
        id: n._id?.toString(),
        type: n.type,
        message: n.message?.substring(0, 50) + '...',
        read: n.read,
        date: n.date
      })) || []);
    }
    
    // 🔍 DEBUG: Log package bookings info
    if (req.query.debug === 'true') {
      const packageBookings = user.bookings.filter(b => b.isPackage);
      console.log(`📦 DEBUG: User ${user.username} has ${packageBookings.length} package bookings:`);
      packageBookings.forEach((booking, i) => {
        console.log(`  ${i+1}. ${booking.packageType} - ${booking.coachName} (${booking.date}) - Status: ${booking.paymentStatus}`);
      });
    }
    
    // 🚀 PERFORMANCE: Add caching headers to reduce API calls
    // For admin users, use shorter cache to ensure fresh notifications
    const cacheMaxAge = req.params.username === 'Admin' ? 5 : 30;
    res.set({
      'Cache-Control': `public, max-age=${cacheMaxAge}`, // Shorter cache for admin
      'ETag': `"${user._id}-${user.notifications?.length || 0}-${Date.now()}"` // Include notification count in ETag
    });
    
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get coach by id
app.get('/api/coaches/:id', async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    
    // Filter out expired schedules
    if (coach.availability) {
      coach.availability = filterExpiredSchedules(coach.availability);
    }
    
    res.json(coach);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this endpoint to update availability directly in the Coach document
app.put('/api/coaches/:coachId/availability', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { availability } = req.body;
    if (!Array.isArray(availability)) {
      return res.status(400).json({ success: false, error: 'Availability array is required.' });
    }
    // Validate structure
    for (const av of availability) {
      if (!av.date || !av.time) {
        return res.status(400).json({ success: false, error: 'Each availability must have a date and time.', av });
      }
    }
    // Update the coach document
    const coachDoc = await Coach.findByIdAndUpdate(
      coachId,
      { $set: { availability } },
      { new: true }
    );
    if (!coachDoc) {
      return res.status(404).json({ success: false, error: 'Coach not found.' });
    }
    res.json({ success: true, coach: coachDoc });
  } catch (err) {
    console.error('Error updating coach availability:', err);
    res.status(500).json({ success: false, error: 'Server error while updating coach availability.', details: err.message });
  }
});

// 🔥 NEW: Manual cleanup endpoint for testing
app.post('/api/cleanup/expired-availability', async (req, res) => {
  try {
    console.log('🧹 Manual cleanup request received');
    await cleanupExpiredCoachAvailability();
    res.json({ 
      success: true, 
      message: 'Expired availability cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error in manual cleanup:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while cleaning up expired availability',
      details: err.message 
    });
  }
});

// GET all bookings for a coach (for coach dashboard)
app.get('/api/coach/:coachId/bookings', async (req, res) => {
  try {
    const { coachId } = req.params;
    if (!coachId) return res.status(400).json({ error: 'Missing coachId' });
    
    // Find all users who have verified bookings with this coach
    const users = await User.find({
      'bookings': {
        $elemMatch: {
          coachId: coachId,
          paymentStatus: 'verified'
        }
      }
    });
    
    // Extract verified bookings for this coach with client identification
    const verifiedBookings = [];
    users.forEach(user => {
      user.bookings.forEach(booking => {
        if (booking.coachId === coachId && booking.paymentStatus === 'verified') {
          verifiedBookings.push({
            _id: booking._id,
            coachId: booking.coachId,
            coachName: booking.coachName,
            date: booking.date,
            time: booking.time,
            class: booking.class,
            className: booking.class, // for compatibility
            paymentStatus: booking.paymentStatus,
            paymentProof: booking.paymentProof,
            verifiedBy: booking.verifiedBy,
            verificationDate: booking.verificationDate,
            // Package booking fields for coach display
            isPackage: booking.isPackage,
            packageType: booking.packageType,
            packageSessions: booking.packageSessions,
            packagePrice: booking.packagePrice,
            // Client identification
            clientId: {
              _id: user._id,
              firstname: user.firstname,
              lastname: user.lastname,
              username: user.username
            },
            clientName: `${user.firstname} ${user.lastname}`,
            clientUsername: user.username
          });
        }
      });
    });
    
    // Sort by date (most recent first)
    verifiedBookings.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(verifiedBookings);
  } catch (err) {
    console.error('Error fetching coach bookings:', err);
    res.status(500).json({ error: 'Server error while fetching coach bookings.' });
  }
});

// GET class history for a coach
app.get('/api/coach/:coachId/class-history', async (req, res) => {
  try {
    const { coachId } = req.params;
    if (!coachId) return res.status(400).json({ error: 'Missing coachId' });
    
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    // Sort class history by completedAt date (most recent first)
    const classHistory = (coach.classHistory || []).sort((a, b) => 
      new Date(b.completedAt) - new Date(a.completedAt)
    );
    
    res.json(classHistory);
  } catch (err) {
    console.error('Error fetching coach class history:', err);
    res.status(500).json({ error: 'Server error while fetching coach class history.' });
  }
});

// === Footer Schema and Model ===
const footerSchema = new mongoose.Schema({
  title: { type: String, default: 'SenJitsu' },
  description: { type: String, default: 'Your journey to martial arts excellence starts here.' },
  contact: {
    address: { type: String, default: 'Suite 301, Gil-Preciosa Bldg. 2, 75 Timog Avenue, Quezon City, Philippines' },
    phone: { type: String, default: '0956 092 8153' },
    email: { type: String, default: 'fist@fistgym.com.ph' }
  },
  social: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' }
  }
});
const Footer = mongoose.model('Footer', footerSchema);

// === Footer API Endpoints ===
// Get footer content
app.get('/api/footer', async (req, res) => {
  try {
    let footer = await Footer.findOne();
    if (!footer) {
      footer = await Footer.create({});
    }
    res.json(footer);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update footer content (admin only - add auth if needed)
app.put('/api/footer', async (req, res) => {
  try {
    const update = req.body;
    let footer = await Footer.findOne();
    if (!footer) {
      footer = await Footer.create(update);
    } else {
      Object.assign(footer, update);
      await footer.save();
    }
    res.json({ message: 'Footer updated successfully', footer });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === Home Content Schema and Model ===
const homeContentSchema = new mongoose.Schema({
  title: { type: String, default: 'FITNESS AND SELF-DEFENSE TECHNIQUES' },
  subtitle: { type: String, default: 'MIXED MARTIAL ARTS' },
  background: { type: String, default: '/images/cage22.png' }, // URL or base64
  classesTitle: { type: String, default: 'CLASSES' },
  classesBg: { type: String, default: '/images/background home.jpg' },
  fistGymTitle: { type: String, default: 'FIST Gym, Your Gym' },
  fistGymDesc: { type: String, default: '' },
  fistGymCTA: { type: String, default: '' },
  fistGymImg: { type: String, default: '' }, // URL to uploaded image
});
const HomeContent = mongoose.model('HomeContent', homeContentSchema);

// === Home Content API Endpoints ===
// Get home content
app.get('/api/home-content', async (req, res) => {
  try {
    let homeContent = await HomeContent.findOne();
    if (!homeContent) {
      homeContent = await HomeContent.create({});
    }
    res.json(homeContent);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Update home content (admin only - add auth if needed)
app.put('/api/home-content', async (req, res) => {
  try {
    const update = req.body;
    let homeContent = await HomeContent.findOne();
    if (!homeContent) {
      homeContent = await HomeContent.create(update);
    } else {
      // Handle FIST Gym image upload (base64)
      if (update.fistGymImg && update.fistGymImg.startsWith('data:image')) {
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        const ext = update.fistGymImg.startsWith('data:image/png') ? 'png' : 'jpg';
        const base64Data = update.fistGymImg.replace(/^data:image\/\w+;base64,/, '');
        const filename = `fistgym_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        update.fistGymImg = `/uploads/${filename}`;
      }
      Object.assign(homeContent, update);
      await homeContent.save();
    }
    res.json({ message: 'Home content updated successfully', homeContent });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Promo settings schema and model
const promoSettingsSchema = new mongoose.Schema({
  heading: { type: String, default: 'PROMOS' },
  banner: { type: String, default: 'Limited-Time Offers! Get 50% Off Membership & Free Personal Training — Sign Up Today!' }
});
const PromoSettings = mongoose.model('PromoSettings', promoSettingsSchema);

// Get promo settings
app.get('/api/promo-settings', async (req, res) => {
  let settings = await PromoSettings.findOne();
  if (!settings) {
    settings = new PromoSettings();
    await settings.save();
  }
  res.json(settings);
});

// Update promo settings
app.post('/api/promo-settings', async (req, res) => {
  const { heading, banner } = req.body;
  let settings = await PromoSettings.findOne();
  if (!settings) {
    settings = new PromoSettings({ heading, banner });
  } else {
    if (heading !== undefined) settings.heading = heading;
    if (banner !== undefined) settings.banner = banner;
  }
  await settings.save();
  res.json(settings);
});

// Rates settings schema and model
const ratesSettingsSchema = new mongoose.Schema({
  heading: { type: String, default: 'RATES' },
  banner: { type: String, default: 'Check out our class rates and book your class today!' }
});
const RatesSettings = mongoose.model('RatesSettings', ratesSettingsSchema);

// Get rates settings
app.get('/api/rates-settings', async (req, res) => {
  let settings = await RatesSettings.findOne();
  if (!settings) {
    settings = new RatesSettings();
    await settings.save();
  }
  res.json(settings);
});

// Update rates settings
app.post('/api/rates-settings', async (req, res) => {
  const { heading, banner } = req.body;
  let settings = await RatesSettings.findOne();
  if (!settings) {
    settings = new RatesSettings({ heading, banner });
  } else {
    if (heading !== undefined) settings.heading = heading;
    if (banner !== undefined) settings.banner = banner;
  }
  await settings.save();
  res.json(settings);
});

// Site settings schema and model
const siteSettingsSchema = new mongoose.Schema({
  logoText: { type: String, default: 'SenJitsu' },
  logoImageUrl: { type: String, default: '' }
});
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

// Email brand settings schema and model
const emailBrandSchema = new mongoose.Schema({
  brandName: { type: String, default: 'SenJitsu' },
  logoUrl: { type: String, default: '' },
  address: { type: String, default: 'Suite 301, Gil-Preciosa Bldg. 2, 75 Timog Avenue, Quezon City, Philippines' }
});
const EmailBrand = mongoose.model('EmailBrand', emailBrandSchema);

// Email brand endpoints
app.get('/api/email-brand', async (req, res) => {
  try {
    let brand = await EmailBrand.findOne();
    if (!brand) brand = await EmailBrand.create({});
    res.json({ success: true, brand });
  } catch (err) {
    console.error('Error getting email brand:', err);
    res.status(500).json({ success: false, error: 'Failed to get email brand settings' });
  }
});

app.put('/api/email-brand', async (req, res) => {
  try {
    const { brandName, logoUrl, address } = req.body || {};
    let brand = await EmailBrand.findOne();
    if (!brand) brand = new EmailBrand({});
    if (brandName !== undefined) brand.brandName = brandName;
    if (logoUrl !== undefined) brand.logoUrl = logoUrl;
    if (address !== undefined) brand.address = address;
    await brand.save();
    res.json({ success: true, brand });
  } catch (err) {
    console.error('Error saving email brand:', err);
    res.status(500).json({ success: false, error: 'Failed to save email brand settings' });
  }
});

// Payment settings schema and model
const paymentSettingsSchema = new mongoose.Schema({
  classRates: {
    'Boxing': { type: Number, default: 500 },
    'Muay Thai': { type: Number, default: 500 },
    'Kali': { type: Number, default: 450 },
    'Jiu Jitsu Adults': { type: Number, default: 600 },
    'Jiu Jitsu Kids': { type: Number, default: 400 },
    'MMA': { type: Number, default: 450 },
    'Judo': { type: Number, default: 450 },
    'Wrestling': { type: Number, default: 400 },
    'Aikido': { type: Number, default: 450 }
  },
  classQrCodes: {
    'Boxing': { type: String, default: '/images/gcashqr.png' },
    'Muay Thai': { type: String, default: '/images/gcashqr.png' },
    'Kali': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Adults': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Kids': { type: String, default: '/images/gcashqr.png' },
    'MMA': { type: String, default: '/images/gcashqr.png' },
    'Judo': { type: String, default: '/images/gcashqr.png' },
    'Wrestling': { type: String, default: '/images/gcashqr.png' },
    'Aikido': { type: String, default: '/images/gcashqr.png' }
  },
  classMembershipQrCodes: {
    'Boxing': { type: String, default: '/images/gcashqr.png' },
    'Muay Thai': { type: String, default: '/images/gcashqr.png' },
    'Kali': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Adults': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Kids': { type: String, default: '/images/gcashqr.png' },
    'MMA': { type: String, default: '/images/gcashqr.png' },
    'Judo': { type: String, default: '/images/gcashqr.png' },
    'Wrestling': { type: String, default: '/images/gcashqr.png' },
    'Aikido': { type: String, default: '/images/gcashqr.png' }
  },
  classPackageQrCodes: {
    'Boxing': { type: String, default: '/images/gcashqr.png' },
    'Muay Thai': { type: String, default: '/images/gcashqr.png' },
    'Kali': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Adults': { type: String, default: '/images/gcashqr.png' },
    'Jiu Jitsu Kids': { type: String, default: '/images/gcashqr.png' },
    'MMA': { type: String, default: '/images/gcashqr.png' },
    'Judo': { type: String, default: '/images/gcashqr.png' },
    'Wrestling': { type: String, default: '/images/gcashqr.png' },
    'Aikido': { type: String, default: '/images/gcashqr.png' }
  },
  packagePricing: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      'Boxing': { sessions: 10, price: 2500 },
      'Muay Thai': { sessions: 10, price: 3000 },
      'Kali': { sessions: 4, price: 1400 },
      'Jiu Jitsu Adults': { sessions: 12, price: 2500 },
      'Jiu Jitsu Kids': { sessions: 4, price: 1600 },
      'MMA': { sessions: 4, price: 1400 },
      'Judo': { sessions: 4, price: 1600 },
      'Wrestling': { sessions: 4, price: 1600 },
      'Aikido': { sessions: 4, price: 1600 }
    }
  },
  membershipRate: { type: Number, default: 1000 },
  membershipQrCode: { type: String, default: '/images/gcashqr.png' }
});
const PaymentSettings = mongoose.model('PaymentSettings', paymentSettingsSchema);

  // Serve uploads statically
  app.use('/uploads', require('express').static(path.join(__dirname, '../public/uploads')));

// Debug endpoint to check admin users
app.get('/api/debug/admin-users', async (req, res) => {
  try {
    const admins = await User.find({ isAdmin: true });
    const adminData = admins.map(admin => ({
      username: admin.username,
      email: admin.email,
      isAdmin: admin.isAdmin,
      notificationCount: admin.notifications?.length || 0,
      latestNotifications: admin.notifications?.slice(-3).map(n => ({
        type: n.type,
        message: n.message?.substring(0, 100) + '...',
        date: n.date,
        read: n.read
      })) || []
    }));
    
    res.json({
      success: true,
      adminCount: admins.length,
      admins: adminData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint to manually send admin notification
app.post('/api/debug/test-admin-notification', async (req, res) => {
  try {
    console.log('🔍 [TEST ADMIN NOTIF] Starting test notification...');
    
    const admins = await User.find({ isAdmin: true });
    console.log('🔍 [TEST ADMIN NOTIF] Found admin users:', admins.length);
    
    if (admins.length === 0) {
      return res.json({
        success: false,
        message: 'No admin users found in database',
        suggestion: 'Create an admin user first by setting isAdmin: true on an existing user'
      });
    }
    
    const testNotification = {
      type: 'payment_submission',
      date: new Date(),
      status: 'unread',
      message: `TEST: Payment proof submitted by Test User for Test Coach class on ${new Date().toDateString()}. Please review and approve.`,
      timestamp: new Date(),
      read: false
    };
    
    for (const admin of admins) {
      console.log('🔍 [TEST ADMIN NOTIF] Adding notification to admin:', admin.username);
      admin.notifications = admin.notifications || [];
      admin.notifications.push(testNotification);
      admin.markModified('notifications');
      await admin.save();
      console.log('✅ [TEST ADMIN NOTIF] Notification saved for admin:', admin.username);
    }
    
    res.json({
      success: true,
      message: `Test notification sent to ${admins.length} admin(s)`,
      admins: admins.map(a => ({ username: a.username, notificationCount: a.notifications.length }))
    });
  } catch (error) {
    console.error('❌ [TEST ADMIN NOTIF] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get site settings
app.get('/api/site-settings', async (req, res) => {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = new SiteSettings();
    await settings.save();
  }
  res.json(settings);
});

// Update site settings
app.post('/api/site-settings', async (req, res) => {
  const { logoText, logoImage } = req.body;
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = new SiteSettings({ logoText });
  } else {
    if (logoText !== undefined) settings.logoText = logoText;
  }

  // Handle logo image upload (base64)
  if (logoImage && logoImage.startsWith('data:image')) {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // Save image
    const ext = logoImage.startsWith('data:image/png') ? 'png' : 'jpg';
    const base64Data = logoImage.replace(/^data:image\/\w+;base64,/, '');
    const filename = `logo_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    settings.logoImageUrl = `/uploads/${filename}`;
  } else if (logoImage === '') {
    // If explicitly cleared
    settings.logoImageUrl = '';
  }
  // If both logoText and logoImage are blank, clear logoImageUrl
  if ((!logoText || logoText === '') && (!logoImage || logoImage === '')) {
    settings.logoImageUrl = '';
  }
  await settings.save();
  res.json({ logoText: settings.logoText, logoImageUrl: settings.logoImageUrl });
});

// Get payment settings
app.get('/api/payment-settings', async (req, res) => {
  let settings = await PaymentSettings.findOne();
  if (!settings) {
    settings = new PaymentSettings();
    await settings.save();
    console.log('🔄 Created new payment settings with defaults');
  }
  
  // Initialize classMembershipQrCodes if it doesn't exist
  if (!settings.classMembershipQrCodes) {
    console.log('🔧 Initializing classMembershipQrCodes field...');
    settings.classMembershipQrCodes = {
      'Boxing': '/images/gcashqr.png',
      'Muay Thai': '/images/gcashqr.png',
      'Kali': '/images/gcashqr.png',
      'Jiu Jitsu Adults': '/images/gcashqr.png',
      'Jiu Jitsu Kids': '/images/gcashqr.png',
      'MMA': '/images/gcashqr.png',
      'Judo': '/images/gcashqr.png',
      'Wrestling': '/images/gcashqr.png'
    };
    settings.markModified('classMembershipQrCodes');
    await settings.save();
    console.log('✅ classMembershipQrCodes field initialized');
  }

  // Initialize classPackageQrCodes if it doesn't exist
  if (!settings.classPackageQrCodes) {
    console.log('🔧 Initializing classPackageQrCodes field...');
    settings.classPackageQrCodes = {
      'Boxing': '/images/gcashqr.png',
      'Muay Thai': '/images/gcashqr.png',
      'Kali': '/images/gcashqr.png',
      'Jiu Jitsu Adults': '/images/gcashqr.png',
      'Jiu Jitsu Kids': '/images/gcashqr.png',
      'MMA': '/images/gcashqr.png',
      'Judo': '/images/gcashqr.png',
      'Wrestling': '/images/gcashqr.png'
    };
    settings.markModified('classPackageQrCodes');
    await settings.save();
    console.log('✅ classPackageQrCodes field initialized');
  }

  // Initialize packagePricing if it doesn't exist
  if (!settings.packagePricing) {
    console.log('🔧 Initializing packagePricing field...');
    settings.packagePricing = {
      'Boxing': { sessions: 10, price: 2500 },
      'Muay Thai': { sessions: 10, price: 3000 },
      'Kali': { sessions: 4, price: 1400 },
      'Jiu Jitsu Adults': { sessions: 12, price: 2500 },
      'Jiu Jitsu Kids': { sessions: 4, price: 1600 },
      'MMA': { sessions: 4, price: 1400 },
      'Judo': { sessions: 4, price: 1600 },
      'Wrestling': { sessions: 4, price: 1600 }
    };
    settings.markModified('packagePricing');
    await settings.save();
    console.log('✅ packagePricing field initialized');
  }
  
  console.log('📖 Fetching payment settings...');
  console.log('Current classMembershipQrCodes:', settings.classMembershipQrCodes);
  res.json(settings);
});

// Update payment settings
app.post('/api/payment-settings', async (req, res) => {
  try {
    const { classRates, membershipRate, classQrCodes, classMembershipQrCodes, classPackageQrCodes, packagePricing, membershipQrCode } = req.body;
    console.log('🔍 Payment settings update received:');
    console.log('classRates:', classRates);
    console.log('classMembershipQrCodes:', classMembershipQrCodes);
    console.log('membershipQrCode:', membershipQrCode);
    let settings = await PaymentSettings.findOne();
    if (!settings) {
      settings = new PaymentSettings();
    }
  
  // Update class rates
  if (classRates) {
    if (!settings.classRates) settings.classRates = {};
    Object.keys(classRates).forEach(className => {
      if (classRates[className] !== undefined) {
        settings.classRates[className] = classRates[className];
      }
    });
    settings.markModified('classRates');
  }
  
  // Update membership rate
  if (membershipRate !== undefined) {
    settings.membershipRate = membershipRate;
  }

  // Update package pricing
  if (packagePricing) {
    if (!settings.packagePricing) settings.packagePricing = {};
    Object.keys(packagePricing).forEach(className => {
      if (packagePricing[className] && 
          packagePricing[className].sessions !== undefined && 
          packagePricing[className].price !== undefined) {
        settings.packagePricing[className] = {
          sessions: parseInt(packagePricing[className].sessions) || 0,
          price: parseFloat(packagePricing[className].price) || 0
        };
      }
    });
    settings.markModified('packagePricing');
  }

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Handle class QR code uploads
  if (classQrCodes) {
    if (!settings.classQrCodes) settings.classQrCodes = {};
    
    Object.keys(classQrCodes).forEach(className => {
      const qrCodeData = classQrCodes[className];
      
      if (qrCodeData && qrCodeData.startsWith('data:image')) {
        // Save new QR code image
        const ext = qrCodeData.startsWith('data:image/png') ? 'png' : 'jpg';
        const base64Data = qrCodeData.replace(/^data:image\/\w+;base64,/, '');
        const filename = `qr_${className.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        settings.classQrCodes[className] = `/uploads/${filename}`;
      } else if (qrCodeData === '') {
        // Reset to default
        settings.classQrCodes[className] = '/images/gcashqr.png';
      }
    });
    settings.markModified('classQrCodes');
  }

  // Handle class membership QR code uploads
  if (classMembershipQrCodes) {
    console.log('🔍 Processing classMembershipQrCodes:', Object.keys(classMembershipQrCodes));
    if (!settings.classMembershipQrCodes) settings.classMembershipQrCodes = {};
    
    Object.keys(classMembershipQrCodes).forEach(className => {
      const qrCodeData = classMembershipQrCodes[className];
      console.log(`🔍 Processing ${className}:`, qrCodeData ? 'has data' : 'no data');
      
      if (qrCodeData && qrCodeData.startsWith('data:image')) {
        // Save new membership QR code image
        const ext = qrCodeData.startsWith('data:image/png') ? 'png' : 'jpg';
        const base64Data = qrCodeData.replace(/^data:image\/\w+;base64,/, '');
        const filename = `qr_member_${className.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        settings.classMembershipQrCodes[className] = `/uploads/${filename}`;
        console.log(`✅ Saved ${className} member QR code as:`, `/uploads/${filename}`);
      } else if (qrCodeData === '') {
        // Reset to default
        settings.classMembershipQrCodes[className] = '/images/gcashqr.png';
        console.log(`🔄 Reset ${className} member QR code to default`);
      }
    });
    settings.markModified('classMembershipQrCodes');
    console.log('✅ classMembershipQrCodes marked as modified');
  } else {
    console.log('❌ No classMembershipQrCodes received');
  }

  // Handle class package QR code uploads
  if (classPackageQrCodes) {
    console.log('🔍 Processing classPackageQrCodes:', Object.keys(classPackageQrCodes));
    if (!settings.classPackageQrCodes) settings.classPackageQrCodes = {};
    
    Object.keys(classPackageQrCodes).forEach(className => {
      const qrCodeData = classPackageQrCodes[className];
      console.log(`🔍 Processing ${className} package:`, qrCodeData ? 'has data' : 'no data');
      
      if (qrCodeData && qrCodeData.startsWith('data:image')) {
        // Save new package QR code image
        const ext = qrCodeData.startsWith('data:image/png') ? 'png' : 'jpg';
        const base64Data = qrCodeData.replace(/^data:image\/\w+;base64,/, '');
        const filename = `qr_package_${className.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        fs.writeFileSync(filepath, base64Data, 'base64');
        settings.classPackageQrCodes[className] = `/uploads/${filename}`;
        console.log(`✅ Saved ${className} package QR code as:`, `/uploads/${filename}`);
      } else if (qrCodeData === '') {
        // Reset to default
        settings.classPackageQrCodes[className] = '/images/gcashqr.png';
        console.log(`🔄 Reset ${className} package QR code to default`);
      }
    });
    settings.markModified('classPackageQrCodes');
    console.log('✅ classPackageQrCodes marked as modified');
  } else {
    console.log('❌ No classPackageQrCodes received');
  }

  // Handle membership QR code upload
  if (membershipQrCode && membershipQrCode.startsWith('data:image')) {
    const ext = membershipQrCode.startsWith('data:image/png') ? 'png' : 'jpg';
    const base64Data = membershipQrCode.replace(/^data:image\/\w+;base64,/, '');
    const filename = `qr_membership_${Date.now()}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    settings.membershipQrCode = `/uploads/${filename}`;
  } else if (membershipQrCode === '') {
    settings.membershipQrCode = '/images/gcashqr.png';
  }
  
  await settings.save();
  console.log('💾 Payment settings saved successfully');
  console.log('Final classMembershipQrCodes:', settings.classMembershipQrCodes);
  res.json(settings);
  } catch (error) {
    console.error('❌ Error saving payment settings:', error);
    res.status(500).json({ success: false, error: 'Failed to save payment settings' });
  }
});

// Send update code for profile changes
app.post('/send-update-code', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const updateVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
  user.updateVerificationCode = updateVerificationCode;
  user.updateVerificationCodeExpires = expires;
  await user.save();
  // SEND EMAIL CODE
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const brand = await EmailBrand.findOne() || await EmailBrand.create({});
  const { subject, html, text } = buildVerificationEmail({
    code: updateVerificationCode,
    purpose: 'Profile Update Verification',
    expiresMinutes: 3,
    brand
  });
  await transporter.sendMail({ from: 'SenJitsu <' + process.env.EMAIL_USER + '>', to: user.email, subject, html, text });
  return res.json({ success: true, message: 'Verification code sent for profile update.' });
});

// Verify update code for profile changes
app.post('/verify-update-code', async (req, res) => {
  const { email, code } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (!user.updateVerificationCodeExpires || user.updateVerificationCodeExpires < new Date()) {
    return res.status(400).json({ success: false, error: 'Verification code expired. Please resend code.' });
  }
  if (user.updateVerificationCode === code) {
    user.updateVerificationCode = undefined;
    user.updateVerificationCodeExpires = undefined;
    await user.save();
    return res.json({ success: true, message: 'Code verified. You can now update your profile.' });
  } else {
    return res.status(400).json({ success: false, error: 'Invalid code' });
  }
});

// Update user profile after code verification
app.post('/update-profile', async (req, res) => {
  const { email, password, ...fieldsToUpdate } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.updateVerificationCode || user.updateVerificationCodeExpires) {
    return res.status(403).json({ success: false, error: 'Profile update not allowed. Please verify code first.' });
  }
  // If password change is requested, just update it (no current password validation needed)
  if (password) {
    fieldsToUpdate.password = password;
  }
  // Remove undefined or empty string fields
  Object.keys(fieldsToUpdate).forEach(key => {
    if (fieldsToUpdate[key] === undefined || fieldsToUpdate[key] === '') {
      delete fieldsToUpdate[key];
    }
  });
  await User.updateOne({ email }, { $set: fieldsToUpdate });
  return res.json({ success: true, message: 'Profile updated successfully.' });
});

// REMOVED: Check current password endpoint - no longer needed since we simplified password change flow

// === Attendance Schema and Model ===
const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  confirmedBy: { type: String, required: true }, // admin name or id
  timestamp: { type: Date, default: Date.now }
});
const Attendance = mongoose.model('Attendance', attendanceSchema);

// === Attendance Endpoints ===
// Mark attendance (admin only)
app.post('/api/attendance', async (req, res) => {
  try {
    const { userId, date, status, confirmedBy } = req.body;
    if (!userId || !date || !status || !confirmedBy) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    // Use Philippine time for attendance
    const phDate = moment.tz(date, 'Asia/Manila').toDate();
    // Prevent duplicate attendance for same user/date
    const existing = await Attendance.findOne({ userId, date: phDate });
    let attendance;
    if (existing) {
      existing.status = status;
      existing.confirmedBy = confirmedBy;
      existing.timestamp = moment.tz('Asia/Manila').toDate();
      await existing.save();
      attendance = existing;
    } else {
      attendance = new Attendance({ userId, date: phDate, status, confirmedBy, timestamp: moment.tz('Asia/Manila').toDate() });
      await attendance.save();
    }
    // Save latest attendance info in user document
    await User.findByIdAndUpdate(userId, {
      $set: {
        lastAttendance: {
          date: phDate,
          status,
          confirmedBy,
          timestamp: attendance.timestamp
        }
      }
    });
    // Fallback: Ensure notifications array exists
    const userDoc = await User.findById(userId);
    if (!userDoc.notifications) {
      userDoc.notifications = [];
      await userDoc.save();
    }
    // Add notification to user
    const notifMsg = `Your attendance for ${moment(phDate).tz('Asia/Manila').format('MMMM D, YYYY')} has been marked as ${status.charAt(0).toUpperCase() + status.slice(1)}.`;
    await User.findByIdAndUpdate(userId, {
      $push: {
        notifications: {
          type: 'attendance',
          date: phDate,
          status,
          message: notifMsg,
          timestamp: attendance.timestamp
        }
      }
    });
    res.json({ success: true, message: 'Attendance marked.', attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while marking attendance.' });
  }
});
// Get all attendance (optionally filter by date/user)
app.get('/api/attendance', async (req, res) => {
  try {
    const { userId, date } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    const records = await Attendance.find(filter).populate('userId', 'firstname lastname username email');
    res.json(records);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while fetching attendance.' });
  }
});
// Get attendance history for a user
app.get('/api/attendance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const records = await Attendance.find({ userId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while fetching user attendance.' });
  }
});

// --- Notification endpoints ---
app.delete('/api/users/:username/notifications', async (req, res) => {
  try {
    const { username } = req.params;
    const { notifIds } = req.body;
    console.log('🔍 [DELETE NOTIF] Username:', username, 'NotifIds:', notifIds);
    
    if (!notifIds || !Array.isArray(notifIds)) {
      return res.status(400).json({ success: false, error: 'notifIds required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ [DELETE NOTIF] User not found:', username);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('🔍 [DELETE NOTIF] User found, total notifications before:', user.notifications.length);
    
    // Debug: Log all notification IDs in database
    const dbNotifIds = user.notifications.map(n => ({ 
      id: n._id?.toString(), 
      type: typeof n._id 
    }));
    console.log('🔍 [DELETE NOTIF] Database notification IDs:', dbNotifIds);
    console.log('🔍 [DELETE NOTIF] Received notification IDs to delete:', notifIds);
    
    const beforeCount = user.notifications.length;
    user.notifications = user.notifications.filter(n => {
      const nIdString = n._id?.toString();
      const shouldKeep = !notifIds.includes(nIdString);
      if (!shouldKeep) {
        console.log('🔍 [DELETE NOTIF] Deleting notification:', nIdString);
      }
      return shouldKeep;
    });
    const afterCount = user.notifications.length;
    const deletedCount = beforeCount - afterCount;
    
    console.log('🔍 [DELETE NOTIF] Deleted', deletedCount, 'notifications, remaining:', afterCount);
    
    user.markModified('notifications');
    await user.save();
    
    console.log('✅ [DELETE NOTIF] Successfully saved user notifications');
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('❌ [DELETE NOTIF] Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.put('/api/users/:username/notifications/read', async (req, res) => {
  try {
    const { username } = req.params;
    const { notifIds } = req.body;
    console.log('🔍 [MARK READ] Username:', username, 'NotifIds:', notifIds);
    
    if (!notifIds || !Array.isArray(notifIds)) {
      return res.status(400).json({ success: false, error: 'notifIds required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ [MARK READ] User not found:', username);
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    console.log('🔍 [MARK READ] User found, total notifications:', user.notifications.length);
    
    // Debug: Log all notification IDs in database
    const dbNotifIds = user.notifications.map(n => ({ 
      id: n._id?.toString(), 
      read: n.read,
      type: typeof n._id 
    }));
    console.log('🔍 [MARK READ] Database notification IDs:', dbNotifIds);
    console.log('🔍 [MARK READ] Received notification IDs to mark:', notifIds);
    
    let markedCount = 0;
    user.notifications.forEach(n => {
      const nIdString = n._id?.toString();
      if (notifIds.includes(nIdString)) {
        console.log('🔍 [MARK READ] Marking notification as read:', nIdString);
        n.read = true;
        markedCount++;
      }
    });
    
    console.log('🔍 [MARK READ] Marked', markedCount, 'notifications as read');
    
    user.markModified('notifications');
    await user.save();
    
    console.log('✅ [MARK READ] Successfully saved user notifications');
    res.json({ success: true, markedCount });
  } catch (error) {
    console.error('❌ [MARK READ] Error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});




// === FORGOT PASSWORD ENDPOINTS ===
// 1. Request reset code
app.post('/forgot-password-request', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, error: 'Email is required.' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
  user.verificationCode = code;
  user.verificationCodeExpires = expires;
  await user.save();
  // Send email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  const brand = await EmailBrand.findOne() || await EmailBrand.create({});
  const { subject, html, text } = buildVerificationEmail({
    code,
    purpose: 'Password Reset Code',
    expiresMinutes: 3,
    brand
  });
  await transporter.sendMail({ from: 'SenJitsu <' + process.env.EMAIL_USER + '>', to: user.email, subject, html, text });
  return res.json({ success: true, message: 'Reset code sent to email.' });
});

// 2. Verify reset code
app.post('/forgot-password-verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, error: 'Email and code are required.' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ success: false, error: 'Verification code expired. Please request again.' });
  }
  if (user.verificationCode !== code) {
    return res.status(400).json({ success: false, error: 'Invalid code.' });
  }
  return res.json({ success: true, message: 'Code verified.' });
});

// 3. Reset password
app.post('/forgot-password-reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ success: false, error: 'All fields are required.' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, error: 'User not found.' });
  if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
    return res.status(400).json({ success: false, error: 'Verification code expired. Please request again.' });
  }
  if (user.verificationCode !== code) {
    return res.status(400).json({ success: false, error: 'Invalid code.' });
  }
  user.password = newPassword;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save();
  return res.json({ success: true, message: 'Password reset successful.' });
});

// === Contact Info Schema and Model ===
const contactInfoSchema = new mongoose.Schema({
  phone: { type: String, default: '0956 092 8153' },
  email: { type: String, default: 'fist@fistgym.com.ph' },
  address: { type: String, default: 'Suite 301, Gil-Preciosa Bldg. 2, Timog Avenue, Quezon City, Philippines' },
  social: {
    messenger: {
      label: { type: String, default: 'Messenger' },
      url: { type: String, default: '' }
    },
    facebook: {
      label: { type: String, default: 'Facebook' },
      url: { type: String, default: '' }
    },
    instagram: {
      label: { type: String, default: 'Instagram' },
      url: { type: String, default: '' }
    },
    youtube: {
      label: { type: String, default: 'Youtube' },
      url: { type: String, default: '' }
    }
  },
  mapEmbedUrl: { type: String, default: '' }
});
const ContactInfo = mongoose.model('ContactInfo', contactInfoSchema);

// === Contact Info API Endpoints ===
// Get contact info
app.get('/api/contact-info', async (req, res) => {
  try {
    let info = await ContactInfo.findOne();
    if (!info) info = await ContactInfo.create({});
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Update contact info (admin only - add auth if needed)
app.put('/api/contact-info', async (req, res) => {
  try {
    const update = req.body;
    // Ensure all social keys are present and have label/url
    const defaultSocial = {
      messenger: { label: 'Messenger', url: '' },
      facebook: { label: 'Facebook', url: '' },
      instagram: { label: 'Instagram', url: '' },
      youtube: { label: 'Youtube', url: '' }
    };
    update.social = update.social || {};
    for (const key of Object.keys(defaultSocial)) {
      if (!update.social[key]) update.social[key] = defaultSocial[key];
      else {
        update.social[key].label = update.social[key].label || defaultSocial[key].label;
        update.social[key].url = update.social[key].url || '';
      }
    }
    let info = await ContactInfo.findOne();
    if (!info) {
      info = await ContactInfo.create(update);
    } else {
      Object.assign(info, update);
      await info.save();
    }
    res.json({ message: 'Contact info updated successfully', contactInfo: info });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// === Coaches Attendance Schema and Model ===
const coachesAttendanceSchema = new mongoose.Schema({
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  confirmedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const CoachesAttendance = mongoose.model('CoachesAttendance', coachesAttendanceSchema);

// === Coaches Attendance Endpoints ===
// Mark attendance for coach
app.post('/api/coaches-attendance', async (req, res) => {
  try {
    const { coachId, date, status, confirmedBy } = req.body;
    if (!coachId || !date || !status || !confirmedBy) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status.' });
    }
    const phDate = new Date(date);
    phDate.setHours(0,0,0,0);
    let attendance = await CoachesAttendance.findOne({ coachId, date: phDate });
    if (attendance) {
      attendance.status = status;
      attendance.confirmedBy = confirmedBy;
      attendance.timestamp = new Date();
      await attendance.save();
    } else {
      attendance = new CoachesAttendance({ coachId, date: phDate, status, confirmedBy });
      await attendance.save();
    }
    // Update lastAttendance field in Coach
    await Coach.findByIdAndUpdate(coachId, {
      $set: {
        lastAttendance: {
          date: phDate,
          status,
          confirmedBy,
          timestamp: attendance.timestamp
        }
      }
    });
    // Send notification to coach (push to notifications array)
    const notifMsg = `Your attendance for ${phDate.toLocaleDateString()} has been marked as ${status.charAt(0).toUpperCase() + status.slice(1)}.`;
    await Coach.findByIdAndUpdate(coachId, {
      $push: {
        notifications: {
          type: 'attendance',
          date: phDate,
          status,
          message: notifMsg,
          timestamp: attendance.timestamp
        }
      }
    });
    res.json({ success: true, message: 'Coach attendance marked.', attendance });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while marking coach attendance.' });
  }
});
// Get all coaches attendance for a date
app.get('/api/coaches-attendance', async (req, res) => {
  try {
    const { coachId, date } = req.query;
    const filter = {};
    if (coachId) filter.coachId = coachId;
    if (date) {
      const d = new Date(date);
      filter.date = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }
    const records = await CoachesAttendance.find(filter).populate('coachId', 'firstname lastname username email');
    res.json(records);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while fetching coach attendance.' });
  }
});
// Get attendance history for a coach
app.get('/api/coaches-attendance/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    const records = await CoachesAttendance.find({ coachId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while fetching coach attendance.' });
  }
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Apply error handling middleware
app.use(errorHandler);

// Function to move completed bookings to history (OPTIMIZED)
const moveCompletedBookingsToHistory = async (wss) => {
    try {
        console.log(`[${new Date().toLocaleString()}] 🔍 Checking for completed bookings (active users only)...`);
        
        // First, sync payment status from payments collection to users.bookings
        await syncPaymentStatusToUserBookings();
        
        // 🔥 OPTIMIZATION: Only get users who were active in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        
        const users = await User.find({ 
            bookings: { $exists: true, $not: { $size: 0 } },
            lastActive: { $gte: oneDayAgo } // Only recently active users
        }).select('username firstname lastname bookings bookingHistory lastActive');

        if (users.length === 0) {
            console.log(`✨ No active users to process.`);
            return;
        }

        console.log(`👥 Processing ${users.length} recently active users (instead of all users)`);

        let totalMoved = 0;
        const affectedUsers = [];

        for (const user of users) {
            const activeBookings = [];
            const historyBookings = [...(user.bookingHistory || [])];
            let hasChanges = false;

            for (const booking of user.bookings) {
                // 🔥 REMOVED: Verbose debug logging for performance
                // console.log(`🔍 Checking booking for ${user.username}:`, {...});

                // Check if booking is completed (verified payment + past time)
                const isCompleted = booking.paymentStatus === 'verified' && 
                                  isScheduleExpired(booking.date, booking.time);

                // 🔥 REMOVED: Detailed completion check logging for performance
                // console.log(`📊 Booking completion check: ...`);

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
                    hasChanges = true;
                    totalMoved++;
                    affectedUsers.push(user.username);
                    
                    // 🔥 KEEP: Important completion logs only
                    console.log(`✅ Moving completed booking to history: ${user.username} - ${booking.coachName} (${booking.date} ${booking.time})`);
                    
                    // Also add to coach's class history
                    try {
                        await Coach.findByIdAndUpdate(booking.coachId, {
                            $push: {
                                classHistory: {
                                    studentId: user._id.toString(),
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
                } else {
                    // Keep in active bookings
                    activeBookings.push(booking);
                }
            }

            // Update user if there are changes
            if (hasChanges) {
                await User.findByIdAndUpdate(user._id, {
                    bookings: activeBookings,
                    bookingHistory: historyBookings
                });
            }
        }

        if (totalMoved > 0) {
            console.log(`📚 Total bookings moved to history: ${totalMoved} (from ${users.length} active users)`);
            
            // Broadcast WebSocket message to all connected clients
            if (wss && wss.clients) {
                const message = JSON.stringify({
                    type: 'BOOKINGS_MOVED_TO_HISTORY',
                    data: {
                        totalMoved,
                        affectedUsers,
                        timestamp: new Date().toISOString()
                    }
                });

                wss.clients.forEach(client => {
                    if (client.readyState === 1) { // WebSocket.OPEN
                        client.send(message);
                        console.log(`📡 Sent real-time update to client`);
                    }
                });
            }
        } else {
            console.log(`✨ No completed bookings found to move from ${users.length} recently active users.`);
        }
    } catch (error) {
        console.error('❌ Error moving completed bookings to history:', error);
    }
};

// 🔥 NEW: Function to clean up expired coach availability (AUTOMATIC)
const cleanupExpiredCoachAvailability = async () => {
    try {
        console.log(`[${new Date().toLocaleString()}] 🧹 Cleaning up expired coach availability...`);
        
        // Find all coaches with availability
        const coaches = await Coach.find({ 
            availability: { $exists: true, $not: { $size: 0 } } 
        }).select('firstname lastname availability');
        
        if (coaches.length === 0) {
            console.log(`✨ No coaches with availability to process.`);
            return;
        }
        
        console.log(`👥 Processing ${coaches.length} coaches for availability cleanup`);
        
        let totalCleaned = 0;
        const affectedCoaches = [];
        
        for (const coach of coaches) {
            if (coach.availability && coach.availability.length > 0) {
                const originalCount = coach.availability.length;
                const filteredAvailability = filterExpiredSchedules(coach.availability);
                const newCount = filteredAvailability.length;
                
                if (newCount < originalCount) {
                    coach.availability = filteredAvailability;
                    await coach.save();
                    totalCleaned += (originalCount - newCount);
                    affectedCoaches.push(`${coach.firstname} ${coach.lastname}`);
                    
                    console.log(`🧹 Cleaned ${originalCount - newCount} expired slots from ${coach.firstname} ${coach.lastname}`);
                }
            }
        }
        
        if (totalCleaned > 0) {
            console.log(`✅ Total expired availability slots cleaned from database: ${totalCleaned} (from ${affectedCoaches.length} coaches)`);
            console.log(`👥 Affected coaches: ${affectedCoaches.join(', ')}`);
        } else {
            console.log(`✨ No expired availability slots found to clean from ${coaches.length} coaches.`);
        }
    } catch (error) {
        console.error('❌ Error cleaning up expired coach availability:', error);
    }
};

// Create HTTP server and attach Express app
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.send(JSON.stringify({ type: 'WELCOME', message: 'Welcome to Senjitsu WebSocket!' }));

  ws.on('message', (message) => {
    console.log('Received from client:', message);
    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'BROADCAST', message: message.toString() }));
      }
    });
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server (HTTP + WebSocket)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log('For Android emulator, use: http://10.0.2.2:3001');
  
  // Run initial cleanup for completed bookings
  moveCompletedBookingsToHistory(wss);
  
  // 🔥 NEW: Run initial cleanup for expired coach availability
  cleanupExpiredCoachAvailability();
  
  // Set up periodic cleanup every 5 minutes (for testing)
  setInterval(() => moveCompletedBookingsToHistory(wss), 5 * 60 * 1000);
  
  // 🔥 NEW: Set up periodic cleanup for expired coach availability every 30 minutes
  setInterval(() => cleanupExpiredCoachAvailability(), 30 * 60 * 1000);
  
  console.log('🧹 Automatic coach availability cleanup will run every 30 minutes');
  console.log('🔄 Automatic booking cleanup will run every 5 minutes');
  
  // Start membership expiration checker
  startMembershipExpirationChecker();
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// Get regular users count (excluding admin accounts)
app.get('/api/users/count', async (req, res) => {
  try {
    console.log('=== DEBUGGING USERS COUNT ===');
    console.log('Connected to database:', mongoose.connection.db.databaseName);
    console.log('User model collection:', User.collection.name);
    
    // Simple query: count all documents in User collection
    // Coaches are in separate collection, so they won't be counted
    const totalUsers = await User.countDocuments({});
    console.log('Total users found:', totalUsers);
    
    // Get some sample users to debug
    const sampleUsers = await User.find({}, {username: 1, isAdmin: 1, email: 1}).limit(5);
    console.log('Sample users:', sampleUsers);
    
    // Get count from previous month for growth calculation
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Count users who were active before current month
    const previousMonthUsers = await User.countDocuments({ 
      lastActive: { $lt: currentMonth }
    });
    
    // Count users who were active this month
    const currentMonthUsers = await User.countDocuments({ 
      lastActive: { $gte: currentMonth }
    });
    
    // Calculate growth percentage
    const growth = previousMonthUsers > 0 ? 
      ((currentMonthUsers - previousMonthUsers) / previousMonthUsers * 100).toFixed(1) : 
      (currentMonthUsers > 0 ? 100 : 0);
    
    console.log('Sending response:', {
      totalUsers,
      previousMonthUsers,
      currentMonthUsers,
      growth: parseFloat(growth)
    });
    
    res.json({
      totalUsers,
      previousMonthUsers,
      currentMonthUsers,
      growth: parseFloat(growth)
    });
  } catch (err) {
    console.error('Error fetching users count:', err);
    res.status(500).json({ error: 'Failed to fetch users count.' });
  }
});

// === Coach Notification Delete ===
app.delete('/api/coach-notifications', async (req, res) => {
  const { coachId, notifIds } = req.body;
  if (!coachId || !notifIds || !Array.isArray(notifIds)) return res.status(400).json({ success: false, error: 'coachId and notifIds required' });
  try {
    await CoachNotification.deleteMany({ coachId, _id: { $in: notifIds } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while deleting coach notifications.' });
  }
});
// === Coach Notification Mark as Read ===
app.put('/api/coach-notifications/read', async (req, res) => {
  const { coachId, notifIds } = req.body;
  if (!coachId || !notifIds || !Array.isArray(notifIds)) return res.status(400).json({ success: false, error: 'coachId and notifIds required' });
  try {
    await CoachNotification.updateMany({ coachId, _id: { $in: notifIds } }, { $set: { status: 'read' } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error while marking coach notifications as read.' });
  }
});

// === Coach Notifications Endpoints (array in coach doc) ===
app.get('/api/coaches/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const coach = await Coach.findOne({ username: new RegExp('^' + username + '$', 'i') });
    if (!coach) return res.status(404).json({ success: false, error: 'Coach not found' });

    // DEBUG: Log the raw notifications array
    console.log('RAW NOTIFICATIONS:', coach.notifications);

    const notifications = (coach.notifications || []).map(n => ({
      ...(n.toObject?.() || n),
      _id: n._id ? n._id.toString() : undefined
    }));

    // DEBUG: Log the mapped notifications array
    console.log('MAPPED NOTIFICATIONS:', notifications);

    res.json({ notifications });
  } catch (err) {
    console.error('Error in GET /api/coaches/:username:', err);
    res.status(500).json({ success: false, error: 'Server error', details: err && err.stack ? err.stack : err });
  }
});
app.delete('/api/coaches/:username/notifications', async (req, res) => {
  const { username } = req.params;
  const { notifIds } = req.body;
  if (!notifIds || !Array.isArray(notifIds)) return res.status(400).json({ success: false, error: 'notifIds required' });
  const coach = await Coach.findOne({ username });
  if (!coach) return res.status(404).json({ success: false, error: 'Coach not found' });
  coach.notifications = coach.notifications.filter(n => !notifIds.includes(n._id?.toString()));
  await coach.save();
  res.json({ success: true });
});
app.put('/api/coaches/:username/notifications/read', async (req, res) => {
  const { username } = req.params;
  const { notifIds } = req.body;
  if (!notifIds || !Array.isArray(notifIds)) return res.status(400).json({ success: false, error: 'notifIds required' });
  const coach = await Coach.findOne({ username });
  if (!coach) return res.status(404).json({ success: false, error: 'Coach not found' });
  coach.notifications.forEach(n => {
    if (notifIds.includes(n._id?.toString())) n.read = true;
  });
  coach.markModified('notifications');
  await coach.save();
  res.json({ success: true });
});

// ... existing code ...
app.get('/api/coaches/:username/attendance-notifications', async (req, res) => {
  try {
    const { username } = req.params;
    // Case-insensitive username search
    const coach = await Coach.findOne({ username: new RegExp('^' + username + '$', 'i') });
    if (!coach) return res.status(404).json({ success: false, error: 'Coach not found' });
    const attendances = await CoachesAttendance.find({ coachId: coach._id }).sort({ date: -1 });
    const notifications = attendances.map(a => ({
      _id: a._id.toString(),
      type: 'attendance',
      date: a.date,
      status: a.status,
      message: `Your attendance for ${a.date.toLocaleDateString()} has been marked as ${a.status.charAt(0).toUpperCase() + a.status.slice(1)}.`,
      confirmedBy: a.confirmedBy,
      timestamp: a.timestamp,
      read: false // You can enhance this if you want to track read status
    }));
    res.json({ notifications });
  } catch (err) {
    console.error('Error in GET /api/coaches/:username/attendance-notifications:', err);
    res.status(500).json({ success: false, error: 'Server error', details: err && err.stack ? err.stack : err });
  }
});
// ... existing code ...

// ... existing code ...
app.get('/api/coach-by-id/:id/notifications', async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const coach = await Coach.findById(id);
    if (!coach) return res.status(404).json({ success: false, error: 'Coach not found' });

    // Only return the notifications array, with stringified _id
    const allNotifications = (coach.notifications || []).map(n => ({
      ...(n.toObject?.() || n),
      _id: n._id ? n._id.toString() : undefined
    }));
    
            if (DEBUG_MODE) {
            console.log('🔍 [NOTIFICATION DEBUG] Coach:', coach.firstname, coach.lastname);
            console.log('🔍 [NOTIFICATION DEBUG] Total notifications:', allNotifications.length);
            console.log('🔍 [NOTIFICATION DEBUG] All notifications:', JSON.stringify(allNotifications, null, 2));
        }
    
    const total = allNotifications.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginated = allNotifications.slice(start, start + limit);

            if (DEBUG_MODE) {
            console.log('🔍 [NOTIFICATION DEBUG] Paginated notifications (page ' + page + '):', JSON.stringify(paginated, null, 2));
        }

    res.json({
      notifications: paginated,
      page,
      limit,
      total,
      totalPages
    });
  } catch (err) {
    console.error('Error in GET /api/coach-by-id/:id/notifications:', err);
    res.status(500).json({ success: false, error: 'Server error', details: err && err.stack ? err.stack : err });
  }
});

// Add notification to coach
app.post('/api/coaches/:id/add-notification', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, date, status, message, timestamp, read, paymentData } = req.body;
    
    if (!id || !message) {
      return res.status(400).json({ success: false, error: 'Coach ID and message are required' });
    }

    const coach = await Coach.findById(id);
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }

    const notification = {
      type: type || 'general',
      date: date || new Date(),
      status: status || 'unread',
      message: message,
      timestamp: timestamp || new Date(),
      read: read || false,
      paymentData: paymentData || null
    };

    coach.notifications = coach.notifications || [];
    coach.notifications.push(notification);
    const savedCoach = await coach.save();

    console.log('✅ Notification added to coach:', coach.firstname, coach.lastname);
    console.log('📋 Notification content:', message);
    console.log('🔍 Coach now has', savedCoach.notifications.length, 'notifications');

    res.json({ 
      success: true, 
      message: 'Notification added successfully',
      notificationCount: savedCoach.notifications.length 
    });
  } catch (err) {
    console.error('❌ Error adding notification to coach:', err);
    res.status(500).json({ success: false, error: 'Server error while adding notification' });
  }
});

// ... existing code ...
app.post('/api/coaches/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    console.log('🔍 VERIFICATION REQUEST:', { email, code });
    
    if (!email || !code) return res.status(400).json({ success: false, error: 'Email and code are required.' });
    
    const coach = await Coach.findOne({ email });
    console.log('🔍 COACH FOUND:', coach ? { 
      email: coach.email, 
      verified: coach.verified, 
      verificationCode: coach.verificationCode,
      verificationCodeExpires: coach.verificationCodeExpires 
    } : 'No coach found');
    
    if (!coach) return res.status(404).json({ success: false, error: 'Coach not found.' });
    if (coach.verified) return res.json({ success: true, message: 'Coach already verified.' });
    
    // Check if verification code has expired
    if (coach.verificationCodeExpires && new Date() > coach.verificationCodeExpires) {
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new one.' });
    }
    
    // Convert both codes to strings for comparison
    const inputCode = String(code).trim();
    const storedCode = String(coach.verificationCode).trim();
    console.log('🔍 CODE COMPARISON:', { inputCode, storedCode, match: inputCode === storedCode });
    
    if (storedCode !== inputCode) {
      return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    }
    
    // Update coach verification status
    coach.verified = true;
    coach.verificationCode = undefined;
    coach.verificationCodeExpires = undefined;
    
    const savedCoach = await coach.save();
    console.log('✅ COACH VERIFIED AND SAVED:', { 
      email: savedCoach.email, 
      verified: savedCoach.verified 
    });
    
    res.json({ success: true, message: 'Coach verified successfully.' });
  } catch (err) {
    console.error('❌ Error in /api/coaches/verify-code:', err);
    res.status(500).json({ success: false, error: 'Server error during verification.' });
  }
});
// ... existing code ...

// REMOVED: Check coach password endpoint - no longer needed since we simplified password change flow

// Send verification code for coach updates
app.post('/api/coaches/send-update-code', async (req, res) => {
  try {
    const { email } = req.body;
    const coach = await Coach.findOne({ email });
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    coach.updateVerificationCode = verificationCode;
    coach.updateVerificationCodeExpires = new Date(Date.now() + 15 * 60000); // 15 minutes
    await coach.save();

    // Send verification code to coach's email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '🥊 SenJitsu Coach Account Settings Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #2ecc40 0%, #27ae60 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🥊 FIST GYM</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Account Settings Verification</p>
          </div>
          
          <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #2ecc40; margin-bottom: 20px;">Hello Coach ${coach.firstname}!</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              You requested to update your account settings. To confirm this change, please enter the verification code below.
            </p>
            
            <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0; border-left: 4px solid #2ecc40;">
              <p style="color: #666; margin-bottom: 10px; font-size: 14px;">Your verification code is:</p>
              <h1 style="color: #2ecc40; font-size: 36px; letter-spacing: 8px; margin: 15px 0; font-family: 'Courier New', monospace; font-weight: bold;">${verificationCode}</h1>
              <p style="color: #e74c3c; font-size: 14px; margin-top: 15px;">⏰ This code expires in 15 minutes</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>🔒 Security Notice:</strong><br>
                If you didn't request this change, please ignore this email and contact support immediately.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <div style="text-align: center;">
              <p style="color: #2ecc40; font-weight: bold; margin-bottom: 5px;">FIST GYM - SenJitsu</p>
              <p style="color: #666; font-size: 12px; margin: 0;">Mixed Martial Arts • Boxing • Self Defense</p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Verification code sent!' });
  } catch (err) {
    console.error('Error sending coach update code:', err);
    res.status(500).json({ success: false, error: 'Server error while sending code.' });
  }
});

// Verify coach update code
app.post('/api/coaches/verify-update-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const coach = await Coach.findOne({ email });
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }

    if (!coach.updateVerificationCode || !coach.updateVerificationCodeExpires) {
      return res.status(400).json({ success: false, error: 'No verification code requested' });
    }

    if (new Date() > coach.updateVerificationCodeExpires) {
      return res.status(400).json({ success: false, error: 'Verification code expired' });
    }

    if (coach.updateVerificationCode !== code) {
      return res.status(400).json({ success: false, error: 'Invalid verification code' });
    }

    // Clear verification code after successful verification
    coach.updateVerificationCode = undefined;
    coach.updateVerificationCodeExpires = undefined;
    await coach.save();

    res.json({ success: true, message: 'Code verified successfully!' });
  } catch (err) {
    console.error('Error verifying coach update code:', err);
    res.status(500).json({ success: false, error: 'Server error while verifying code.' });
  }
});

// Update coach password after verification
app.post('/api/coaches/update-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const coach = await Coach.findOne({ email });
    if (!coach) {
      return res.status(404).json({ success: false, error: 'Coach not found' });
    }

    // Update password
    coach.password = password;
    await coach.save();

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Error updating coach password:', err);
    res.status(500).json({ success: false, error: 'Server error while updating password.' });
  }
});

// --- MEMBERSHIP APPLICATION SCHEMA & ENDPOINT ---
const membershipApplicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  userId: String,
  proof: String, // base64 string
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'pending' }, // pending, approved, rejected
  expirationDate: Date, // for approved memberships
  startDate: Date, // when membership starts
  archived: { type: Boolean, default: false },
  // Notification tracking for expiration alerts
  notificationsSent: {
    threeDayReminder: { type: Boolean, default: false },
    oneDayReminder: { type: Boolean, default: false },
    expirationNotice: { type: Boolean, default: false }
  }
});
const MembershipApplication = mongoose.model('MembershipApplication', membershipApplicationSchema);

app.post('/api/membership-application', async (req, res) => {
  try {
    const { name, email, userId, proof } = req.body;
    if (!proof) return res.status(400).json({ success: false, message: 'Proof of payment is required.' });
    
    // 🚀 VALIDATE IMAGE SIZE to prevent MarkBai23 issue
    const sizeValidation = validateImageSize(proof, 500); // 500KB limit
    if (!sizeValidation.valid) {
      return res.status(400).json({
        success: false,
        message: sizeValidation.error
      });
    }
    const application = new MembershipApplication({
      name,
      email,
      userId,
      proof // base64 string
    });
    await application.save();

    // Send notification to all admins
    const admins = await User.find({ isAdmin: true });
    console.log('🔍 [MEMBERSHIP NOTIF] Found admin users:', admins.length);
    console.log('🔍 [MEMBERSHIP NOTIF] Admin usernames:', admins.map(a => `${a.username}(${a.isAdmin})`));
    
    const notif = {
      type: 'membership',
      date: new Date(),
      status: 'unread',
      message: `New membership application submitted by ${name} (${email})`,
      read: false
    };
    for (const admin of admins) {
      admin.notifications = admin.notifications || [];
      admin.notifications.push(notif);
      await admin.save();
    }

    res.json({ success: true, message: 'Application received!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Membership application status endpoint
app.get('/api/membership-application/status', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });
    // Only return the latest non-archived application
    const application = await MembershipApplication.findOne({ userId, archived: { $ne: true } }).sort({ date: -1 });
    if (!application) return res.json({ success: true, application: null });
    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// List all membership applications (admin, or filtered by user)
app.get('/api/membership-applications', async (req, res) => {
  try {
    const { userId, email, includeArchived } = req.query;
    let filter = {};
    if (userId && email) {
      filter = { $or: [{ userId }, { email }] };
    } else if (userId) {
      filter.userId = userId;
    } else if (email) {
      filter.email = email;
    }
    if (!includeArchived) {
      filter.archived = { $ne: true };
    }
    const applications = await MembershipApplication.find(filter).sort({ date: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Approve membership application (admin)
app.post('/api/membership-application/:id/approve', async (req, res) => {
  try {
    // Set startDate to start of next day
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const expirationDate = new Date(startDate);
    expirationDate.setMonth(expirationDate.getMonth() + 1); // 1 month after startDate
    // 🚀 Approve membership application (preserve payment proof)
    const application = await MembershipApplication.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'approved', 
        startDate, 
        expirationDate
        // Payment proof image is now preserved after approval
      },
      { new: true }
    );
    
    console.log(`✅ Membership application approved for ${req.params.id} - payment proof preserved`);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Send notification to user
    let user = await User.findOne({ email: application.email });
    if (!user && application.userId) {
      user = await User.findOne({ $or: [ { _id: application.userId }, { username: application.userId } ] });
    }
    if (user) {
      user.notifications = user.notifications || [];
      user.notifications.push({
        type: 'membership',
        date: new Date(),
        status: 'unread',
        message: 'Your membership application has been approved! Welcome to SenJitsu.',
        read: false
      });
      await user.save();
    }

    // Fetch email template
    const template = await EmailTemplate.findOne({ type: 'membership-approval' });
    const subject = (template && template.subject) ? template.subject : 'Welcome to Senjitsu/Fist Gym – Membership Approved!';
    const logoUrl = (template && template.logoUrl) ? template.logoUrl : 'https://i.imgur.com/1Q9Z1Zm.png';
    const body = (template && template.body) ? template.body : `Congratulations {name}, your membership is approved!`;
    const buttonText = (template && template.buttonText) ? template.buttonText : 'View Promos';
    const buttonLink = (template && template.buttonLink) ? template.buttonLink : 'http://localhost:3000/promos';

    // Send email notification to user
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    const mailOptions = {
      from: 'Senjitsu/Fist Gym <' + process.env.EMAIL_USER + '>',
      to: application.email,
      subject: subject,
      html: `
        <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
          <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
            <div style="background:#232b36;padding:24px 0;text-align:center;">
              <img src="${logoUrl}" alt="Senjitsu/Fist Gym" style="height:48px;margin-bottom:8px;object-fit:contain;max-width:90%;background:#fff;border-radius:6px;" />
            </div>
            <div style="padding:36px 32px 32px 32px;text-align:center;">
              <h2 style="font-size:1.7rem;color:#181818;margin-bottom:18px;letter-spacing:1px;font-family:sans-serif;">${subject}</h2>
              <p style="font-size:1.1rem;color:#222;margin-bottom:18px;">${body.replace('{name}', `<b>${application.name}</b>`)}</p>
              <a href="http://localhost:3000/my-schedule" style="display:inline-block;margin-top:18px;padding:14px 36px;background:#2ecc40;color:#fff;font-weight:bold;font-size:1.1rem;border-radius:6px;text-decoration:none;letter-spacing:1px;">View My Schedule</a>
            </div>
          </div>
        </div>
      `
    };
    transporter.sendMail(mailOptions, (error, info) => {
      // Optionally log or handle error/info
    });

    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Reject membership application (admin)
app.post('/api/membership-application/:id/reject', async (req, res) => {
  try {
    // 🚀 Reject membership application (preserve payment proof for records)
    const application = await MembershipApplication.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected', 
        expirationDate: null, 
        archived: true
        // Payment proof image is now preserved even after rejection for audit purposes
      },
      { new: true }
    );
    
    console.log(`✅ Membership application rejected for ${req.params.id} - payment proof preserved for records`);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Send notification to user
    let user = await User.findOne({ email: application.email });
    if (!user && application.userId) {
      user = await User.findOne({ $or: [ { _id: application.userId }, { username: application.userId } ] });
    }
    if (user) {
      user.notifications = user.notifications || [];
      user.notifications.push({
        type: 'membership',
        date: new Date(),
        status: 'unread',
        message: 'Your membership application has been rejected. Please check your proof of payment and try again.',
        read: false
      });
      await user.save();
    }

    res.json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// --- MEMBERSHIP EXPIRATION NOTIFICATION SYSTEM ---

// Function to send notification to user
const sendUserNotification = async (user, message, type = 'membership') => {
  try {
    if (!user) return false;
    
    user.notifications = user.notifications || [];
    user.notifications.push({
      type: type,
      date: new Date(),
      status: 'unread',
      message: message,
      read: false
    });
    await user.save();
    return true;
  } catch (error) {
    console.error('Error sending notification to user:', error);
    return false;
  }
};

// Function to check for expiring memberships and send notifications
const checkExpiringMemberships = async () => {
  try {
    console.log('🔍 Checking for expiring memberships...');
    
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));
    
    // Find all approved memberships that haven't expired yet
    const activeMemberships = await MembershipApplication.find({
      status: 'approved',
      archived: { $ne: true },
      expirationDate: { $gt: now }
    });
    
    console.log(`📋 Found ${activeMemberships.length} active memberships to check`);
    
    let notificationsSent = 0;
    
    for (const membership of activeMemberships) {
      const expirationDate = new Date(membership.expirationDate);
      
      // Find the user for this membership
      let user = await User.findOne({ email: membership.email });
      if (!user && membership.userId) {
        try {
          // Check if membership.userId is a valid ObjectId
          if (mongoose.Types.ObjectId.isValid(membership.userId) && membership.userId.match(/^[0-9a-fA-F]{24}$/)) {
            // Search by ObjectId or username
            user = await User.findOne({ $or: [{ _id: membership.userId }, { username: membership.userId }] });
          } else {
            // Search only by username if not a valid ObjectId
            user = await User.findOne({ username: membership.userId });
          }
        } catch (error) {
          // If there's still an error with ObjectId casting, try username only
          user = await User.findOne({ username: membership.userId });
        }
      }
      
      if (!user) {
        console.log(`⚠️ User not found for membership: ${membership.email}`);
        continue;
      }
      
      // Check for 3-day reminder
      if (expirationDate <= threeDaysFromNow && !membership.notificationsSent.threeDayReminder) {
        const message = `⏰ Your SenJitsu membership will expire in 3 days (${expirationDate.toLocaleDateString()}). Renew now to continue enjoying our services!`;
        
        if (await sendUserNotification(user, message)) {
          membership.notificationsSent.threeDayReminder = true;
          await membership.save();
          notificationsSent++;
          console.log(`📨 Sent 3-day reminder to ${user.email}`);
        }
      }
      
      // Check for 1-day reminder
      if (expirationDate <= oneDayFromNow && !membership.notificationsSent.oneDayReminder) {
        const message = `🚨 Your SenJitsu membership expires tomorrow (${expirationDate.toLocaleDateString()})! Don't miss out - renew your membership today.`;
        
        if (await sendUserNotification(user, message)) {
          membership.notificationsSent.oneDayReminder = true;
          await membership.save();
          notificationsSent++;
          console.log(`📨 Sent 1-day reminder to ${user.email}`);
        }
      }
      
      // Check for expiration notice (for memberships that expire today)
      if (expirationDate.toDateString() === now.toDateString() && !membership.notificationsSent.expirationNotice) {
        const message = `❌ Your SenJitsu membership has expired today. Please submit a new membership application to continue using our services.`;
        
        if (await sendUserNotification(user, message)) {
          membership.notificationsSent.expirationNotice = true;
          await membership.save();
          notificationsSent++;
          console.log(`📨 Sent expiration notice to ${user.email}`);
        }
      }
    }
    
    console.log(`✅ Membership expiration check completed. ${notificationsSent} notifications sent.`);
    return { success: true, notificationsSent };
    
  } catch (error) {
    console.error('❌ Error checking expiring memberships:', error);
    return { success: false, error: error.message };
  }
};

// Endpoint to manually trigger membership expiration check (can be called by cron job)
app.post('/api/check-expiring-memberships', async (req, res) => {
  try {
    const result = await checkExpiringMemberships();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin endpoint to test notification system (sends test notifications)
app.post('/api/test-membership-notifications', async (req, res) => {
  try {
    const { userId, notificationType } = req.body;
    
    if (!userId || !notificationType) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId and notificationType are required' 
      });
    }
    
    // Find user by ObjectId or username
    let user;
    try {
      // Check if userId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(userId) && userId.match(/^[0-9a-fA-F]{24}$/)) {
        // Search by ObjectId or username
        user = await User.findOne({ $or: [{ _id: userId }, { username: userId }] });
      } else {
        // Search only by username if not a valid ObjectId
        user = await User.findOne({ username: userId });
      }
    } catch (error) {
      // If there's still an error with ObjectId casting, try username only
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found. Make sure the username or ObjectId is correct.' });
    }
    
    let message = '';
    switch (notificationType) {
      case '3day':
        message = '⏰ TEST: Your SenJitsu membership will expire in 3 days. This is a test notification.';
        break;
      case '1day':
        message = '🚨 TEST: Your SenJitsu membership expires tomorrow! This is a test notification.';
        break;
      case 'expired':
        message = '❌ TEST: Your SenJitsu membership has expired. This is a test notification.';
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid notification type. Use: 3day, 1day, or expired' });
    }
    
    const success = await sendUserNotification(user, message);
    
    if (success) {
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to send notification' });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to get membership expiration summary (for admin dashboard)
app.get('/api/membership-expiration-summary', async (req, res) => {
  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneWeekFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    // Count memberships expiring in different time frames
    const expiringToday = await MembershipApplication.countDocuments({
      status: 'approved',
      archived: { $ne: true },
      expirationDate: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      }
    });
    
    const expiringIn3Days = await MembershipApplication.countDocuments({
      status: 'approved',
      archived: { $ne: true },
      expirationDate: { $gte: now, $lte: threeDaysFromNow }
    });
    
    const expiringIn1Week = await MembershipApplication.countDocuments({
      status: 'approved',
      archived: { $ne: true },
      expirationDate: { $gte: now, $lte: oneWeekFromNow }
    });
    
    const totalActive = await MembershipApplication.countDocuments({
      status: 'approved',
      archived: { $ne: true },
      expirationDate: { $gt: now }
    });
    
    res.json({
      success: true,
      summary: {
        totalActive,
        expiringToday,
        expiringIn3Days,
        expiringIn1Week
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start periodic membership expiration checking (runs every hour)
const startMembershipExpirationChecker = () => {
  console.log('🚀 Starting membership expiration checker...');
  
  // Run immediately on startup
  setTimeout(() => {
    checkExpiringMemberships();
  }, 5000); // Wait 5 seconds for server to fully start
  
  // Then run every hour
  setInterval(() => {
    checkExpiringMemberships();
  }, 60 * 60 * 1000); // 1 hour = 60 * 60 * 1000 milliseconds
  
  console.log('✅ Membership expiration checker started - will run every hour');
};

// --- END MEMBERSHIP EXPIRATION NOTIFICATION SYSTEM ---

// ... existing code ...
const emailTemplateSchema = new mongoose.Schema({
  type: { type: String, default: 'membership-approval' },
  subject: { type: String, default: 'Welcome to Senjitsu/Fist Gym – Membership Approved!' },
  logoUrl: { type: String, default: '' },
  body: { type: String, default: 'Congratulations {name}, your membership is approved!' },
  buttonText: { type: String, default: 'View Promos' },
  buttonLink: { type: String, default: 'http://localhost:3000/promos' }
});
const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

// Get membership approval email template
app.get('/api/email-template/membership-approval', async (req, res) => {
  let template = await EmailTemplate.findOne({ type: 'membership-approval' });
  if (!template) {
    template = await EmailTemplate.create({});
  }
  res.json({ success: true, template });
});
// Update membership approval email template
app.post('/api/email-template/membership-approval', async (req, res) => {
  const { subject, logoUrl, body, buttonText, buttonLink } = req.body;
  let template = await EmailTemplate.findOne({ type: 'membership-approval' });
  if (!template) {
    template = new EmailTemplate({ type: 'membership-approval' });
  }
  template.subject = subject;
  template.logoUrl = logoUrl;
  template.body = body;
  template.buttonText = buttonText;
  template.buttonLink = buttonLink;
  await template.save();
  res.json({ success: true, template });
});

// Get booking approval email template
app.get('/api/email-template/booking-approval', async (req, res) => {
  try {
    let template = await EmailTemplate.findOne({ type: 'booking-approval' });
    if (!template) {
      console.log('📧 Creating default booking approval template');
      template = await EmailTemplate.create({
        type: 'booking-approval',
        logoUrl: 'https://i.imgur.com/1Q9Z1Zm.png'
      });
    }
    console.log('📧 Retrieved booking approval template:', { logoUrl: template.logoUrl ? 'URL exists' : 'No URL' });
    res.json({ success: true, template });
  } catch (error) {
    console.error('❌ Error getting booking approval template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update booking approval email template
app.post('/api/email-template/booking-approval', async (req, res) => {
  try {
    const { logoUrl } = req.body;
    console.log('📧 Received booking approval template update:', { logoUrl: logoUrl ? 'URL provided' : 'No URL' });
    
    let template = await EmailTemplate.findOne({ type: 'booking-approval' });
    if (!template) {
      console.log('📧 Creating new booking approval template');
      template = new EmailTemplate({ type: 'booking-approval' });
    }
    
    template.logoUrl = logoUrl;
    await template.save();
    console.log('✅ Booking approval template saved successfully');
    
    res.json({ success: true, template });
  } catch (error) {
    console.error('❌ Error updating booking approval template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ... existing code ...

// ... existing code ...
const holidays = [
  '2025-01-01', '2025-02-25', '2025-04-17', '2025-04-18', '2025-04-19',
  '2025-05-01', '2025-06-12', '2025-08-21', '2025-08-25', '2025-11-01',
  '2025-11-30', '2025-12-08', '2025-12-24', '2025-12-25', '2025-12-30', '2025-12-31'
];
function pad(n) { return n < 10 ? '0' + n : n; }
function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${pad(m)} ${ampm}`;
}
function getBoxingSlotsForDate(dateObj) {
  const day = dateObj.getDay();
  const slots = [];
  if (day >= 1 && day <= 6) { // Mon-Sat
    for (let h = 7; h < 21; h++) {
      const start = new Date(dateObj);
      start.setHours(h, 0, 0, 0);
      const end = new Date(dateObj);
      end.setHours(h + 1, 0, 0, 0);
      slots.push({
        date: `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`,
        class: 'Boxing',
        time: `${formatTime(start)} - ${formatTime(end)}`
      });
    }
  } else if (day === 0) { // Sunday
    for (let h = 7; h < 17; h++) {
      if (h === 12) continue; // skip 12-1pm
      const start = new Date(dateObj);
      start.setHours(h, 0, 0, 0);
      const end = new Date(dateObj);
      end.setHours(h + 1, 0, 0, 0);
      slots.push({
        date: `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`,
        class: 'Boxing',
        time: `${formatTime(start)} - ${formatTime(end)}`
      });
    }
  }
  return slots;
}

function getJiuJitsuAdultsSlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day === 1 || day === 3 || day === 5) { // Monday, Wednesday, Friday
    // 10:00 AM - 1:00 PM
    const morningStart = new Date(dateObj);
    morningStart.setHours(10, 0, 0, 0);
    const morningEnd = new Date(dateObj);
    morningEnd.setHours(13, 0, 0, 0);
    slots.push({
      date: dateStr,
      class: 'Jiu Jitsu Adults',
      time: `${formatTime(morningStart)} - ${formatTime(morningEnd)}`
    });
    
    // 7:00 PM - 9:00 PM
    const eveningStart = new Date(dateObj);
    eveningStart.setHours(19, 0, 0, 0);
    const eveningEnd = new Date(dateObj);
    eveningEnd.setHours(21, 0, 0, 0);
    slots.push({
      date: dateStr,
      class: 'Jiu Jitsu Adults',
      time: `${formatTime(eveningStart)} - ${formatTime(eveningEnd)}`
    });
  } else if (day === 2 || day === 4) { // Tuesday, Thursday
    // 7:00 PM - 9:00 PM
    const eveningStart = new Date(dateObj);
    eveningStart.setHours(19, 0, 0, 0);
    const eveningEnd = new Date(dateObj);
    eveningEnd.setHours(21, 0, 0, 0);
    slots.push({
      date: dateStr,
      class: 'Jiu Jitsu Adults',
      time: `${formatTime(eveningStart)} - ${formatTime(eveningEnd)}`
    });
  } else if (day === 6) { // Saturday
    // 4:30 PM - 6:30 PM
    const afternoonStart = new Date(dateObj);
    afternoonStart.setHours(16, 30, 0, 0);
    const afternoonEnd = new Date(dateObj);
    afternoonEnd.setHours(18, 30, 0, 0);
    slots.push({
      date: dateStr,
      class: 'Jiu Jitsu Adults',
      time: `${formatTime(afternoonStart)} - ${formatTime(afternoonEnd)}`
    });
  }
  // Sunday - no slots generated
  
  return slots;
}

function getJiuJitsuKidsSlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day === 6) { // Saturday only
    // 8:00 AM - 10:00 AM
    const morningStart = new Date(dateObj);
    morningStart.setHours(8, 0, 0, 0);
    const morningEnd = new Date(dateObj);
    morningEnd.setHours(10, 0, 0, 0);
    slots.push({
      date: dateStr,
      class: 'Jiu Jitsu Kids',
      time: `${formatTime(morningStart)} - ${formatTime(morningEnd)}`
    });
  }
  // Other days - no slots generated
  
  return slots;
}

function getJudoSlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day === 6) { // Saturday only
    // 3:00 PM - 4:30 PM
    const afternoonStart = new Date(dateObj);
    afternoonStart.setHours(15, 0, 0, 0); // 3:00 PM
    const afternoonEnd = new Date(dateObj);
    afternoonEnd.setHours(16, 30, 0, 0); // 4:30 PM
    slots.push({
      date: dateStr,
      class: 'Judo',
      time: `${formatTime(afternoonStart)} - ${formatTime(afternoonEnd)}`
    });
  }
  // Other days - no slots generated
  
  return slots;
}

function getKaliSlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day === 6) { // Saturday only
    // 10:00 AM - 12:00 PM
    const morningStart = new Date(dateObj);
    morningStart.setHours(10, 0, 0, 0); // 10:00 AM
    const morningEnd = new Date(dateObj);
    morningEnd.setHours(12, 0, 0, 0); // 12:00 PM
    slots.push({
      date: dateStr,
      class: 'Kali',
      time: `${formatTime(morningStart)} - ${formatTime(morningEnd)}`
    });
  }
  // Other days - no slots generated
  
  return slots;
}

function getMMASlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day >= 1 && day <= 5) { // Monday to Friday
    // 9:00 AM to 8:00 PM (hourly slots)
    for (let h = 9; h < 20; h++) { // 9 AM to 7 PM (last slot is 7-8 PM)
      const start = new Date(dateObj);
      start.setHours(h, 0, 0, 0);
      const end = new Date(dateObj);
      end.setHours(h + 1, 0, 0, 0);
      slots.push({
        date: dateStr,
        class: 'MMA',
        time: `${formatTime(start)} - ${formatTime(end)}`
      });
    }
  }
  // Saturday and Sunday - no slots generated
  
  return slots;
}

function getWrestlingSlotsForDate(dateObj) {
  const day = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const slots = [];
  const dateStr = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  
  if (day === 6) { // Saturday only
    // 1:30 PM - 3:00 PM
    const afternoonStart = new Date(dateObj);
    afternoonStart.setHours(13, 30, 0, 0); // 1:30 PM
    const afternoonEnd = new Date(dateObj);
    afternoonEnd.setHours(15, 0, 0, 0); // 3:00 PM
    slots.push({
      date: dateStr,
      class: 'Wrestling',
      time: `${formatTime(afternoonStart)} - ${formatTime(afternoonEnd)}`
    });
  }
  // Other days - no slots generated
  
  return slots;
}

app.post('/api/coach/:id/generate-boxing-availability', async (req, res) => {
  const { id } = req.params;
  const today = new Date();
  today.setHours(0,0,0,0);
  try {
    const coach = await Coach.findById(id);
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    // Check if coach has Boxing specialty
    const hasBoxing = coach.specialties && coach.specialties.some(
      spec => typeof spec === 'string' && spec.toLowerCase().includes('boxing')
    );
    if (!hasBoxing) return res.status(400).json({ error: 'Coach does not have Boxing specialty' });
    // Check if already generated for this week (any Boxing slot for today + next 6 days)
    const weekDates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Boxing' && weekDates.includes(slot.date);
    });
    if (alreadyGenerated) {
      return res.status(400).json({ error: 'Boxing schedule for this week already generated.' });
    }
    // Generate slots for this week
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      slots.push(...getBoxingSlotsForDate(new Date(d)));
    }
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ... existing code ...

// ... existing code ...
app.post('/api/coach/:id/generate-muaythai-availability', async (req, res) => {
  const { id } = req.params;
  const today = new Date();
  today.setHours(0,0,0,0);
  try {
    const coach = await Coach.findById(id);
    if (!coach) return res.status(404).json({ error: 'Coach not found' });
    // Check if coach has Muay Thai specialty
    const hasMuayThai = coach.specialties && coach.specialties.some(
      spec => typeof spec === 'string' && spec.toLowerCase().includes('muay thai')
    );
    if (!hasMuayThai) return res.status(400).json({ error: 'Coach does not have Muay Thai specialty' });
    // Check if already generated for this week (any Muay Thai slot for today + next 6 days)
    const weekDates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Muay Thai' && weekDates.includes(slot.date);
    });
    if (alreadyGenerated) {
      return res.status(400).json({ error: 'Muay Thai schedule for this week already generated.' });
    }
    // Generate slots for this week
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      // Per hour slots, same as boxing
      const day = d.getDay();
      if (day >= 1 && day <= 6) { // Mon-Sat
        for (let h = 7; h < 21; h++) {
          const start = new Date(d);
          start.setHours(h, 0, 0, 0);
          const end = new Date(d);
          end.setHours(h + 1, 0, 0, 0);
          slots.push({
            date: dateStr,
            class: 'Muay Thai',
            time: `${formatTime(start)} - ${formatTime(end)}`
          });
        }
      } else if (day === 0) { // Sunday
        for (let h = 7; h < 17; h++) {
          if (h === 12) continue; // skip 12-1pm
          const start = new Date(d);
          start.setHours(h, 0, 0, 0);
          const end = new Date(d);
          end.setHours(h + 1, 0, 0, 0);
          slots.push({
            date: dateStr,
            class: 'Muay Thai',
            time: `${formatTime(start)} - ${formatTime(end)}`
          });
        }
      }
    }
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/coach/:id/generate-jiujitsuadults-availability', async (req, res) => {
  const { id } = req.params;
  const today = new Date();
  today.setHours(0,0,0,0);
  try {
    console.log('🔍 Jiu Jitsu Adults generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has Jiu Jitsu Adults specialty
    const hasJiuJitsuAdults = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('jiu jitsu adults');
      }
    );
    
    console.log('🎯 Has Jiu Jitsu Adults specialty:', hasJiuJitsuAdults);
    
    if (!hasJiuJitsuAdults) {
      console.log('❌ Coach does not have Jiu Jitsu Adults specialty');
      return res.status(400).json({ error: 'Coach does not have Jiu Jitsu Adults specialty' });
    }
    // Check if already generated for this week (any Jiu Jitsu Adults slot for today + next 6 days)
    const weekDates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Jiu Jitsu Adults' && weekDates.includes(slot.date);
    });
    if (alreadyGenerated) {
      return res.status(400).json({ error: 'Jiu Jitsu Adults schedule for this week already generated.' });
    }
    // Generate slots for this week
    console.log('🗓️ Generating slots for this week...');
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      const daySlots = getJiuJitsuAdultsSlotsForDate(new Date(d));
      console.log(`📅 ${dateStr}: Generated ${daySlots.length} slots`);
      slots.push(...daySlots);
    }
    
    console.log(`📊 Total slots generated: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/coach/:id/generate-jiujitsukids-availability', async (req, res) => {
  const { id } = req.params;
  try {
    console.log('🔍 Jiu Jitsu Kids generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has Jiu Jitsu Kids specialty
    const hasJiuJitsuKids = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('jiu jitsu kids');
      }
    );
    
    console.log('🎯 Has Jiu Jitsu Kids specialty:', hasJiuJitsuKids);
    
    if (!hasJiuJitsuKids) {
      console.log('❌ Coach does not have Jiu Jitsu Kids specialty');
      return res.status(400).json({ error: 'Coach does not have Jiu Jitsu Kids specialty' });
    }
    
    // Check if already generated for 2025 (any Jiu Jitsu Kids slot for 2025)
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Jiu Jitsu Kids' && slot.date.startsWith('2025');
    });
    
    if (alreadyGenerated) {
      console.log('❌ Jiu Jitsu Kids schedule for 2025 already generated');
      return res.status(400).json({ error: 'Jiu Jitsu Kids schedule for 2025 already generated.' });
    }
    
    // Generate slots from today onwards until end of 2025
    console.log('🗓️ Generating slots from today until end of 2025...');
    const slots = [];
    
    // Start from today or January 1, 2025 (whichever is later)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(Math.max(currentDate.getTime(), new Date(2025, 0, 1).getTime()));
    const endDate = new Date(2025, 11, 31); // December 31, 2025
    
    console.log(`📅 Start date: ${startDate.toDateString()}`);
    console.log(`📅 End date: ${endDate.toDateString()}`);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      
      const daySlots = getJiuJitsuKidsSlotsForDate(new Date(d));
      if (daySlots.length > 0) {
        console.log(`📅 ${dateStr}: Generated ${daySlots.length} slots`);
        slots.push(...daySlots);
      }
    }
    
    console.log(`📊 Total slots generated from ${startDate.toDateString()} to ${endDate.toDateString()}: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error('❌ Error generating Jiu Jitsu Kids availability:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/coach/:id/generate-judo-availability', async (req, res) => {
  const { id } = req.params;
  try {
    console.log('🔍 Judo generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has Judo specialty
    const hasJudo = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('judo');
      }
    );
    
    console.log('🎯 Has Judo specialty:', hasJudo);
    
    if (!hasJudo) {
      console.log('❌ Coach does not have Judo specialty');
      return res.status(400).json({ error: 'Coach does not have Judo specialty' });
    }
    
    // Check if already generated for 2025 (any Judo slot for 2025)
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Judo' && slot.date.startsWith('2025');
    });
    
    if (alreadyGenerated) {
      console.log('❌ Judo schedule for 2025 already generated');
      return res.status(400).json({ error: 'Judo schedule for 2025 already generated.' });
    }
    
    // Generate slots from today onwards until end of 2025
    console.log('🗓️ Generating Judo slots from today until end of 2025...');
    const slots = [];
    
    // Start from today or January 1, 2025 (whichever is later)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(Math.max(currentDate.getTime(), new Date(2025, 0, 1).getTime()));
    const endDate = new Date(2025, 11, 31); // December 31, 2025
    
    console.log(`📅 Start date: ${startDate.toDateString()}`);
    console.log(`📅 End date: ${endDate.toDateString()}`);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      
      const daySlots = getJudoSlotsForDate(new Date(d));
      if (daySlots.length > 0) {
        console.log(`📅 ${dateStr}: Generated ${daySlots.length} Judo slots`);
        slots.push(...daySlots);
      }
    }
    
    console.log(`📊 Total Judo slots generated from ${startDate.toDateString()} to ${endDate.toDateString()}: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved Judo slots to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error('❌ Error generating Judo availability:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/coach/:id/generate-kali-availability', async (req, res) => {
  const { id } = req.params;
  try {
    console.log('🔍 Kali generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has Kali specialty
    const hasKali = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('kali');
      }
    );
    
    console.log('🎯 Has Kali specialty:', hasKali);
    
    if (!hasKali) {
      console.log('❌ Coach does not have Kali specialty');
      return res.status(400).json({ error: 'Coach does not have Kali specialty' });
    }
    
    // Check if already generated for 2025 (any Kali slot for 2025)
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Kali' && slot.date.startsWith('2025');
    });
    
    if (alreadyGenerated) {
      console.log('❌ Kali schedule for 2025 already generated');
      return res.status(400).json({ error: 'Kali schedule for 2025 already generated.' });
    }
    
    // Generate slots from today onwards until end of 2025
    console.log('🗓️ Generating Kali slots from today until end of 2025...');
    const slots = [];
    
    // Start from today or January 1, 2025 (whichever is later)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(Math.max(currentDate.getTime(), new Date(2025, 0, 1).getTime()));
    const endDate = new Date(2025, 11, 31); // December 31, 2025
    
    console.log(`📅 Start date: ${startDate.toDateString()}`);
    console.log(`📅 End date: ${endDate.toDateString()}`);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      
      const daySlots = getKaliSlotsForDate(new Date(d));
      if (daySlots.length > 0) {
        console.log(`📅 ${dateStr}: Generated ${daySlots.length} Kali slots`);
        slots.push(...daySlots);
      }
    }
    
    console.log(`📊 Total Kali slots generated from ${startDate.toDateString()} to ${endDate.toDateString()}: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved Kali slots to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error('❌ Error generating Kali availability:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/coach/:id/generate-mma-availability', async (req, res) => {
  const { id } = req.params;
  const today = new Date();
  today.setHours(0,0,0,0);
  try {
    console.log('🔍 MMA generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has MMA specialty
    const hasMMA = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('mma');
      }
    );
    
    console.log('🎯 Has MMA specialty:', hasMMA);
    
    if (!hasMMA) {
      console.log('❌ Coach does not have MMA specialty');
      return res.status(400).json({ error: 'Coach does not have MMA specialty' });
    }
    
    // Check if already generated for this week (any MMA slot for today + next 6 days)
    const weekDates = Array.from({length: 7}, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    });
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'MMA' && weekDates.includes(slot.date);
    });
    if (alreadyGenerated) {
      return res.status(400).json({ error: 'MMA schedule for this week already generated.' });
    }
    
    // Generate slots for this week
    console.log('🗓️ Generating MMA slots for this week...');
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      const daySlots = getMMASlotsForDate(new Date(d));
      console.log(`📅 ${dateStr}: Generated ${daySlots.length} MMA slots`);
      slots.push(...daySlots);
    }
    
    console.log(`📊 Total MMA slots generated: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved MMA slots to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error('❌ Error generating MMA availability:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/api/coach/:id/generate-wrestling-availability', async (req, res) => {
  const { id } = req.params;
  try {
    console.log('🔍 Wrestling generation request for coach:', id);
    const coach = await Coach.findById(id);
    if (!coach) {
      console.log('❌ Coach not found:', id);
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    console.log('✅ Coach found:', coach.firstname, coach.lastname);
    console.log('📋 Coach specialties:', coach.specialties);
    
    // Check if coach has Wrestling specialty
    const hasWrestling = coach.specialties && coach.specialties.some(
      spec => {
        console.log('🔍 Checking specialty:', spec, 'Type:', typeof spec);
        return typeof spec === 'string' && spec.toLowerCase().includes('wrestling');
      }
    );
    
    console.log('🎯 Has Wrestling specialty:', hasWrestling);
    
    if (!hasWrestling) {
      console.log('❌ Coach does not have Wrestling specialty');
      return res.status(400).json({ error: 'Coach does not have Wrestling specialty' });
    }
    
    // Check if already generated for 2025 (any Wrestling slot for 2025)
    const alreadyGenerated = coach.availability && coach.availability.some(slot => {
      return slot.class === 'Wrestling' && slot.date.startsWith('2025');
    });
    
    if (alreadyGenerated) {
      console.log('❌ Wrestling schedule for 2025 already generated');
      return res.status(400).json({ error: 'Wrestling schedule for 2025 already generated.' });
    }
    
    // Generate slots from today onwards until end of 2025
    console.log('🗓️ Generating Wrestling slots from today until end of 2025...');
    const slots = [];
    
    // Start from today or January 1, 2025 (whichever is later)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const startDate = new Date(Math.max(currentDate.getTime(), new Date(2025, 0, 1).getTime()));
    const endDate = new Date(2025, 11, 31); // December 31, 2025
    
    console.log(`📅 Start date: ${startDate.toDateString()}`);
    console.log(`📅 End date: ${endDate.toDateString()}`);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (holidays.includes(dateStr)) continue;
      
      const daySlots = getWrestlingSlotsForDate(new Date(d));
      if (daySlots.length > 0) {
        console.log(`📅 ${dateStr}: Generated ${daySlots.length} Wrestling slots`);
        slots.push(...daySlots);
      }
    }
    
    console.log(`📊 Total Wrestling slots generated from ${startDate.toDateString()} to ${endDate.toDateString()}: ${slots.length}`);
    coach.availability = [...(coach.availability || []), ...slots];
    await coach.save();
    console.log('✅ Successfully saved Wrestling slots to database');
    res.json({ success: true, added: slots.length });
  } catch (err) {
    console.error('❌ Error generating Wrestling availability:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Add endpoint for admin to verify payment
app.post('/api/book/verify-payment', async (req, res) => {
    try {
        const { bookingId, adminId, status } = req.body;
        if (!bookingId || !adminId || !status) {
            return res.status(400).json({
                success: false,
                error: 'Booking ID, admin ID, and status are required'
            });
        }

        // Update the booking status
        const booking = await Booking.findByIdAndUpdate(
            bookingId,
            {
                paymentStatus: status,
                verifiedBy: adminId,
                verificationDate: new Date()
            },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Booking not found'
            });
        }

        // 🚀 Also update the user's booking and clear payment proof image
        await User.updateOne(
            { 'bookings._id': bookingId },
            {
                $set: {
                    'bookings.$.paymentStatus': status,
                    'bookings.$.verifiedBy': adminId,
                    'bookings.$.verificationDate': new Date(),
                    'bookings.$.paymentProof': 'Image deleted after verification for storage optimization' // Clear image
                }
            }
        );
        
        console.log(`🗑️ Payment proof image cleared from user booking for ${status} status`);

        res.json({
            success: true,
            message: 'Payment status updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Error updating payment status'
        });
    }
});

// ... existing code ...
// GET all bookings (optionally filter by paymentStatus)
app.get('/api/bookings', async (req, res) => {
  try {
    const { paymentStatus } = req.query;
    const filter = {};
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    const bookings = await Booking.find(filter);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get all user bookings for Boxing, Muay Thai, and MMA (one-on-one classes)
app.get('/api/all-bookings/boxing-muaythai', async (req, res) => {
  try {
    console.log('📋 Fetching all Boxing, Muay Thai, and MMA bookings...');
    
    // Find all users who have bookings for Boxing, Muay Thai, or MMA
    const users = await User.find({
      'bookings.class': { $in: ['Boxing', 'Muay Thai', 'MMA'] }
    });
    
    // Extract all Boxing, Muay Thai, and MMA bookings
    const allBookings = [];
    users.forEach(user => {
      const oneOnOneBookings = user.bookings.filter(booking => 
        booking.class === 'Boxing' || booking.class === 'Muay Thai' || booking.class === 'MMA'
      );
      allBookings.push(...oneOnOneBookings);
    });
    
    console.log(`✅ Found ${allBookings.length} Boxing/Muay Thai/MMA bookings`);
    
    res.json({
      success: true,
      bookings: allBookings
    });
  } catch (error) {
    console.error('❌ Error fetching all Boxing/Muay Thai/MMA bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bookings'
    });
  }
});
// ... existing code ...

// ... existing code ...

// ... existing code ...

app.get('/api/test-log', (req, res) => {
  console.log('TEST LOG ENDPOINT HIT');
  res.json({ success: true });
});

// ... existing code ...
// Add Payment schema and model
// ... existing code ...
// Add Payment schema and model
const paymentSchema = new mongoose.Schema({
  userId: String,
  userName: String,
  coachId: String,
  coachName: String,
  date: String,
  time: String,
  className: String,
  amount: { type: Number, default: 500 },
  paymentProof: String,
  paymentDate: Date,
  status: { type: String, default: 'for approval' },
  submittedAt: { type: Date, default: Date.now },
  verifiedBy: String,
  verificationDate: Date,
  // Membership discount fields
  originalAmount: { type: Number },
  membershipDiscount: { type: Number, default: 0 },
  hasMembershipDiscount: { type: Boolean, default: false },
  qrCodeType: { type: String, enum: ['class', 'membership'], default: 'class' },
  // Package booking fields
  isPackage: { type: Boolean, default: false },
  packageType: String,
  packageSessions: Number,
  packagePrice: Number,
  packageBookings: [
    {
      coachId: String,
      coachName: String,
      date: String,
      time: String,
      class: String
    }
  ]
});

const Payment = mongoose.model('Payment', paymentSchema);

// ... existing code ...

// Replace the existing /api/updatePayment endpoint completely
app.post('/api/updatePayment', async (req, res) => {
  try {
    console.log('Payment submission received:', req.body);
    
    const { userId, coachId, date, time, paymentProof, amount, originalAmount, membershipDiscount, hasMembershipDiscount, qrCodeType, className } = req.body;
    
    if (!userId || !coachId || !date || !time || !paymentProof) {
      console.log('Missing required fields');
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    // 🚀 VALIDATE IMAGE SIZE to prevent MarkBai23 issue
    const sizeValidation = validateImageSize(paymentProof, 500); // 500KB limit
    if (!sizeValidation.valid) {
      console.log('Payment proof too large:', sizeValidation.actualSize, 'KB');
      return res.status(400).json({
        success: false,
        error: sizeValidation.error
      });
    }

    // Resolve class name (prefer body -> infer from user's booking)
    let resolvedClassName = className;
    if (!resolvedClassName) {
      try {
        const user = await User.findOne({ username: userId });
        const match = user?.bookings?.find(b => b.coachId === coachId && b.date === date && b.time === time);
        if (match?.class) resolvedClassName = match.class;
      } catch (e) {}
    }

    // Get coach details for notification
    let coachName = 'Unknown Coach';
    try {
      const coach = await Coach.findById(coachId);
      if (coach) {
        coachName = `${coach.firstname} ${coach.lastname}`;
      }
    } catch (e) {
      console.log('Could not fetch coach details');
    }

    // Create new payment document with membership discount information
            if (DEBUG_MODE) {
            console.log('🔍 [PAYMENT CREATION] Creating payment with coachId:', coachId);
            console.log('🔍 [PAYMENT CREATION] CoachId type:', typeof coachId);
            console.log('🔍 [PAYMENT CREATION] Amount:', amount, 'Original:', originalAmount, 'Discount:', membershipDiscount);
        }
    
    const newPayment = new Payment({
      userId: userId,
      coachId: coachId,
      coachName: coachName, // Add coach name to payment record
      date: date,
      time: time,
      className: resolvedClassName,
      paymentProof: paymentProof,
      status: 'for approval',
      submittedAt: new Date(),
      amount: amount || originalAmount || 500, // Use provided amount or fallback
      originalAmount: originalAmount,
      membershipDiscount: membershipDiscount || 0,
      hasMembershipDiscount: hasMembershipDiscount || false,
      qrCodeType: qrCodeType || 'class'
    });

    console.log('Saving payment to database...');
    const savedPayment = await newPayment.save();
    console.log('Payment saved successfully:', savedPayment._id);

    // 🔥 UPDATE USER'S BOOKING STATUS TO 'pending' (For Approval)
    try {
      console.log('🔄 Updating user booking status to pending...');
      console.log('📋 Payment data received:', { userId, coachId, date, time, coachName });
      
      const user = await User.findOne({ username: userId });
      
      if (user) {
        console.log('✅ User found:', user.username);
        console.log('📋 User has', user.bookings?.length || 0, 'bookings');
        
        // Find and update the specific booking
        let hasUpdates = false;
        console.log('🔍 Looking for booking with:', { coachId, date, time });
        
        user.bookings.forEach((booking, index) => {
          console.log(`📋 Checking booking ${index}:`, {
            bookingCoachId: booking.coachId,
            bookingDate: booking.date,
            bookingTime: booking.time,
            currentStatus: booking.paymentStatus,
            coachName: booking.coachName,
            class: booking.class
          });
          
          // More flexible matching - try multiple approaches
          const coachMatches = booking.coachId === coachId || 
                              booking.coachName?.includes(coachName) || 
                              coachName?.includes(booking.coachName);
          const dateMatches = booking.date === date;
          const timeMatches = booking.time === time;
          
          console.log('🔍 Matching results:', { coachMatches, dateMatches, timeMatches });
          
          if (coachMatches && dateMatches && timeMatches) {
            console.log('✅ Found matching booking! Updating status...');
            booking.paymentStatus = 'pending';
            booking.paymentProof = paymentProof;
            booking.paymentDate = new Date();
            hasUpdates = true;
            console.log(`✅ Updated booking status for ${user.username}: ${booking.coachName} (${booking.date}) to pending`);
          }
        });
        
        if (hasUpdates) {
          user.markModified('bookings');
          await user.save();
          console.log('💾 User booking updated successfully!');
        } else {
          console.log('⚠️ No exact matching booking found, trying fallback...');
          
          // Fallback: Find the most recent unpaid booking and update it
          const unpaidBookings = user.bookings.filter(b => b.paymentStatus === 'unpaid');
          console.log('🔍 Found', unpaidBookings.length, 'unpaid bookings');
          
          if (unpaidBookings.length > 0) {
            // Get the most recent unpaid booking
            const mostRecentUnpaid = unpaidBookings[unpaidBookings.length - 1];
            console.log('🔍 Updating most recent unpaid booking:', {
              coachName: mostRecentUnpaid.coachName,
              date: mostRecentUnpaid.date,
              time: mostRecentUnpaid.time
            });
            
            mostRecentUnpaid.paymentStatus = 'pending';
            mostRecentUnpaid.paymentProof = paymentProof;
            mostRecentUnpaid.paymentDate = new Date();
            
            user.markModified('bookings');
            await user.save();
            console.log('💾 Fallback: Updated most recent unpaid booking to pending');
            hasUpdates = true;
          } else {
            console.log('⚠️ No unpaid bookings found to update');
            console.log('🔍 All user bookings:', user.bookings.map(b => ({
              coachId: b.coachId,
              coachName: b.coachName,
              date: b.date,
              time: b.time,
              status: b.paymentStatus
            })));
          }
        }
        
        // Add notification to user
        const discountMessage = hasMembershipDiscount ? 
          ` with member discount (₱${originalAmount} - ₱${membershipDiscount} = ₱${amount})` : '';
        
        const notification = {
          type: 'payment',
          date: new Date(),
          status: 'unread',
          message: `Payment proof submitted successfully for ${coachName} class on ${date} at ${time}${discountMessage}. Your booking is now for approval.`,
          timestamp: new Date(),
          read: false
        };
        
        user.notifications = user.notifications || [];
        user.notifications.push(notification);
        user.markModified('notifications');
        await user.save();
        console.log('✅ Notification added to user:', userId);
      } else {
        console.log('❌ User not found for booking update:', userId);
      }
    } catch (error) {
      console.error('❌ Error updating user booking status:', error);
      // Don't fail the payment submission if this update fails
    }

    // Add notification to all admins with discount info
    try {
      console.log('🔍 [ADMIN NOTIF] Starting admin notification process...');
      const user = await User.findOne({ username: userId });
      const userName = user ? `${user.firstname} ${user.lastname}` : userId;
      console.log('🔍 [ADMIN NOTIF] User found:', userName);
      
      const qrInfo = qrCodeType === 'membership' ? ' using Member QR' : ' using Class QR';
      const discountInfo = hasMembershipDiscount ? 
        ` (Original: ₱${originalAmount}, Member discount: -₱${membershipDiscount}, Final: ₱${amount}${qrInfo})` : 
        ` (Amount: ₱${amount}${qrInfo})`;
      
      const admins = await User.find({ isAdmin: true });
      console.log('🔍 [ADMIN NOTIF] Found admin users:', admins.length);
      console.log('🔍 [ADMIN NOTIF] Admin details:', admins.map(a => ({ 
        username: a.username, 
        email: a.email, 
        isAdmin: a.isAdmin,
        notificationCount: a.notifications?.length || 0
      })));
      
      // 🚨 SECURITY CHECK: Verify all users are actually admins
      const nonAdmins = admins.filter(a => !a.isAdmin);
      if (nonAdmins.length > 0) {
        console.error('🚨 [SECURITY ALERT] Non-admin users found in admin query:', nonAdmins.map(a => a.username));
      }
      
      const adminNotification = {
        type: 'payment_submission',
        date: new Date(),
        status: 'unread',
        message: `New payment proof submitted by ${userName} for ${coachName} class on ${date} at ${time}${discountInfo}. Please review and approve.`,
        timestamp: new Date(),
        read: false
      };
      
      console.log('🔍 [ADMIN NOTIF] Notification message:', adminNotification.message);
      
      for (const admin of admins) {
        console.log('🔍 [ADMIN NOTIF] Adding notification to admin:', admin.username);
        admin.notifications = admin.notifications || [];
        admin.notifications.push(adminNotification);
        admin.markModified('notifications');
        await admin.save();
        console.log('✅ [ADMIN NOTIF] Notification saved for admin:', admin.username, 'Total notifications:', admin.notifications.length);
      }
      console.log('✅ Payment submission notification sent to all admins');
    } catch (error) {
      console.error('❌ Error adding notification to admins:', error);
      console.error('❌ Full error details:', error.stack);
      // Don't fail the payment submission if notification fails
    }

    res.json({ success: true, paymentId: savedPayment._id });
    
  } catch (error) {
    console.error('Error saving payment:', error);
    res.status(500).json({ success: false, error: 'Server error during payment submission.' });
  }
});

// Add endpoint to update user's booking status after payment submission
app.post('/api/update-user-booking', async (req, res) => {
  try {
    console.log('🔄 Update user booking request received:', req.body);
    const { userId, coachId, date, time, paymentStatus, paymentProof } = req.body;
    
    if (!userId || !coachId || !date || !time || !paymentStatus) {
      console.log('❌ Missing required fields:', { userId, coachId, date, time, paymentStatus });
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }

    // Find the user and update their specific booking
    console.log('🔍 Looking for user:', userId);
    const user = await User.findOne({ username: userId });
    
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    
    console.log('✅ User found:', user.username);
    console.log('📋 User has', user.bookings?.length || 0, 'bookings');

    // Find and update the specific booking
    console.log('🔍 Looking for booking with:', { coachId, date, time });
    let hasUpdates = false;
    
    user.bookings.forEach((booking, index) => {
      console.log(`📋 Booking ${index}:`, {
        bookingCoachId: booking.coachId,
        bookingDate: booking.date,
        bookingTime: booking.time,
        currentStatus: booking.paymentStatus
      });
      
      if (booking.coachId === coachId && 
          booking.date === date && 
          booking.time === time) {
        
        console.log('✅ Found matching booking!');
        booking.paymentStatus = paymentStatus;
        if (paymentProof) {
          booking.paymentProof = paymentProof;
        }
        booking.paymentDate = new Date();
        hasUpdates = true;
        console.log(`✅ Updated booking status for ${user.username}: ${booking.coachName} (${booking.date}) to ${paymentStatus}`);
      }
    });

    if (hasUpdates) {
      user.markModified('bookings');
      await user.save();
      console.log('💾 User booking updated successfully!');
      res.json({ success: true, message: 'Booking status updated successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Booking not found.' });
    }
    
  } catch (error) {
    console.error('Error updating user booking:', error);
    res.status(500).json({ success: false, error: 'Server error during booking update.' });
  }
});

// ... existing code ...

// Add endpoint to get payment status for user bookings
app.get('/api/user/:userId/payment-status', async (req, res) => {
  try {
    const { userId } = req.params;
    const payments = await Payment.find({ userId: userId });
    
    // Create a map of payment statuses keyed by booking identifier
    const paymentStatus = {};
    payments.forEach(payment => {
      // Handle package bookings differently
      if (payment.isPackage) {
        // Use package type as key for package bookings
        const packageKey = `${payment.packageType} Package`;
        paymentStatus[packageKey] = {
          status: payment.status,
          paymentStatus: payment.status,
          paymentId: payment._id,
          submittedAt: payment.submittedAt,
          isPackage: true,
          packageType: payment.packageType,
          packageSessions: payment.packageSessions,
          packagePrice: payment.packagePrice,
          coachName: payment.coachName || 'Coach TBD',
          date: payment.date || null,
          time: payment.time || 'Time TBD'
        };
      } else {
        // Handle individual bookings
        const key = `${payment.coachId}-${payment.date}-${payment.time}`;
        paymentStatus[key] = {
          status: payment.status,
          paymentStatus: payment.status,
          paymentId: payment._id,
          submittedAt: payment.submittedAt,
          isPackage: false
        };
      }
    });
    
    console.log('📦 Payment status response for', userId, ':', Object.keys(paymentStatus));
    console.log('📦 Full payment status data:', paymentStatus);
    
    // Debug: Log all payments found for this user
    console.log('🔍 DEBUG: All payments for user', userId, ':', payments.length);
    payments.forEach((payment, index) => {
      console.log(`  Payment ${index + 1}:`, {
        id: payment._id,
        userId: payment.userId,
        isPackage: payment.isPackage,
        packageType: payment.packageType,
        status: payment.status,
        coachId: payment.coachId,
        coachName: payment.coachName,
        date: payment.date,
        time: payment.time
      });
    });
    
    res.json({ success: true, paymentStatus });
  } catch (error) {
    console.error('Error fetching payment status:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Debug endpoint to check coach earnings after payment
app.get('/api/debug/coach-earnings/:coachId', async (req, res) => {
  try {
    const { coachId } = req.params;
    
    console.log(`🔍 [DEBUG] Checking earnings for coach: ${coachId}`);
    
    // Get latest payroll record
    const latestPayroll = await Payroll.findOne({ 
      coachId, 
      status: 'completed' 
    }).sort({ paidThrough: -1 });
    
    console.log(`🔍 [DEBUG] Latest payroll:`, latestPayroll);
    
    // Get all verified payments for this coach (use string format)
    const coachIdString = coachId.toString();
    const allPayments = await Payment.find({
      coachId: coachIdString,
      status: 'verified'
    }).sort({ verificationDate: 1 });
    
    console.log(`🔍 [DEBUG] All verified payments: ${allPayments.length}`);
    
    // If there's a cutoff, separate before and after
    let paymentsBeforeCutoff = [];
    let paymentsAfterCutoff = [];
    
    if (latestPayroll && latestPayroll.paidThrough) {
      const cutoff = latestPayroll.paidThrough;
      paymentsBeforeCutoff = allPayments.filter(p => new Date(p.verificationDate) <= cutoff);
      paymentsAfterCutoff = allPayments.filter(p => new Date(p.verificationDate) > cutoff);
      
      console.log(`🔍 [DEBUG] Cutoff date: ${cutoff}`);
      console.log(`🔍 [DEBUG] Payments before cutoff: ${paymentsBeforeCutoff.length}`);
      console.log(`🔍 [DEBUG] Payments after cutoff: ${paymentsAfterCutoff.length}`);
    } else {
      paymentsAfterCutoff = allPayments;
      console.log(`🔍 [DEBUG] No cutoff found, all payments count: ${paymentsAfterCutoff.length}`);
    }
    
    // Calculate earnings
    const totalBeforeCutoff = paymentsBeforeCutoff.reduce((sum, p) => sum + (p.amount || 500), 0);
    const totalAfterCutoff = paymentsAfterCutoff.reduce((sum, p) => sum + (p.amount || 500), 0);
    
    res.json({
      success: true,
      coachId,
      latestPayroll: latestPayroll || null,
      allPaymentsCount: allPayments.length,
      paymentsBeforeCutoff: paymentsBeforeCutoff.length,
      paymentsAfterCutoff: paymentsAfterCutoff.length,
      totalBeforeCutoff,
      totalAfterCutoff,
      coachShareAfterCutoff: totalAfterCutoff * 0.5,
      recentPayments: paymentsAfterCutoff.slice(-5).map(p => ({
        id: p._id,
        date: p.date,
        verificationDate: p.verificationDate,
        amount: p.amount || 500,
        className: p.className
      }))
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ... existing code ...

// Add endpoint to get all payments for admin verification
app.get('/api/admin/payments', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : { status: 'for approval' };
    
    const payments = await Payment.find(filter).sort({ submittedAt: -1 });
    
    // Enrich payments with coach and user details
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        // Get coach details
        let coachName = 'Unknown Coach';
        try {
          const coach = await Coach.findById(payment.coachId);
          if (coach) {
            coachName = `${coach.firstname} ${coach.lastname}`;
          }
        } catch (e) {
          // Coach not found, keep default
        }
        
        // Get user details
        let userName = payment.userId;
        try {
          const user = await User.findOne({ username: payment.userId });
          if (user) {
            userName = `${user.firstname} ${user.lastname}`;
          }
        } catch (e) {
          // User not found, keep userId as name
        }
        
        return {
          _id: payment._id,
          userId: payment.userId,
          userName: userName,
          coachId: payment.coachId,
          coachName: coachName,
          date: payment.date,
          time: payment.time,
          className: payment.className || payment.class || 'Unknown Class',
          paymentProof: payment.paymentProof,
          status: payment.status,
          submittedAt: payment.submittedAt,
          amount: payment.amount || 500, // Use stored amount or default
          isPackage: payment.isPackage || false,
          packageType: payment.packageType,
          packageSessions: payment.packageSessions,
          packagePrice: payment.packagePrice,
          packageBookings: payment.packageBookings
        };
      })
    );
    
    res.json({ success: true, payments: enrichedPayments });
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Add endpoint for admin to approve/reject payments from payments collection
app.post('/api/admin/payments/:paymentId/action', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action, adminId } = req.body; // action: 'approve' or 'reject'
    
    if (!paymentId || !action || !adminId) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    
    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    
    // 🚀 AUTO-DELETE PAYMENT PROOF: Clear image after verification to save storage
    const updateData = {
      status: newStatus,
      verifiedBy: adminId,
      verificationDate: new Date(),
      paymentProof: 'Image deleted after verification for storage optimization' // Replace large image with text
    };
    
    // Update payment status and clear image
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      updateData,
      { new: true }
    );
    
    console.log(`🗑️ Payment proof image deleted for payment ${paymentId} (${action}ed by admin)`);
    
    if (!updatedPayment) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }
    
    // 🔥 SYNC PAYMENT STATUS TO USER BOOKINGS
    if (action === 'approve') {
      console.log('💰 Payment approved, syncing to user bookings...');
      
      // 🔥 NEW: Create a Booking record for payroll calculation
      try {
        // Check if a booking record already exists
        const existingBooking = await Booking.findOne({
          coachId: updatedPayment.coachId,
          date: new Date(updatedPayment.date),
          time: updatedPayment.time
        });

        if (!existingBooking) {
          // Create new booking record for payroll
          const newBooking = new Booking({
            coachId: updatedPayment.coachId,
            coachName: updatedPayment.coachName,
            className: updatedPayment.className || 'Boxing',
            clientId: updatedPayment.userId,
            clientName: updatedPayment.userName,
            date: new Date(updatedPayment.date),
            time: updatedPayment.time,
            amount: updatedPayment.amount || 500,
            paymentStatus: 'verified',
            paymentProof: updatedPayment.paymentProof,
            paymentDate: updatedPayment.paymentDate,
            verifiedBy: adminId,
            verificationDate: new Date()
          });
          
          await newBooking.save();
          console.log('✅ Created new Booking record for payroll calculation');
        } else {
          console.log('📝 Booking record already exists, updating status...');
          existingBooking.paymentStatus = 'verified';
          existingBooking.verifiedBy = adminId;
          existingBooking.verificationDate = new Date();
          await existingBooking.save();
        }
      } catch (bookingError) {
        console.error('❌ Error creating/updating Booking record:', bookingError);
        // Don't fail the approval if booking creation fails
      }
      
      // Find and update the user's booking
      const user = await User.findOne({ 
        'bookings': {
          $elemMatch: {
            coachId: updatedPayment.coachId,
            date: updatedPayment.date,
            time: updatedPayment.time
          }
        }
      });
      
      if (user) {
        let hasUpdates = false;
        let coachName = 'Unknown Coach';
        
        user.bookings.forEach(booking => {
          if (booking.coachId === updatedPayment.coachId && 
              booking.date === updatedPayment.date && 
              booking.time === updatedPayment.time) {
            
                          booking.paymentStatus = 'verified';
              booking.paymentProof = 'Image deleted after verification for storage optimization'; // 🚀 Clear user booking image too
              booking.verifiedBy = adminId;
              booking.verificationDate = new Date();
            coachName = booking.coachName || coachName;
            hasUpdates = true;
            console.log(`✅ Updated payment status for ${user.username}: ${booking.coachName} (${booking.date})`);
          }
        });
        
        if (hasUpdates) {
          // Add approval notification to user
          const approvalNotification = {
            type: 'payment_approved',
            date: new Date(),
            status: 'unread',
            message: `Payment approved! Your booking for ${coachName} class on ${updatedPayment.date} at ${updatedPayment.time} has been confirmed.`,
            timestamp: new Date(),
            read: false
          };
          
          user.notifications = user.notifications || [];
          user.notifications.push(approvalNotification);
          
          user.markModified('bookings');
          await user.save();
          console.log('💾 User booking updated successfully!');
          console.log('✅ Payment approval notification added to user:', user.username);

          // 🔥 NEW: Send notification to the specific coach about the approved booking
          try {
            console.log('🔍 Looking for coach with ID:', updatedPayment.coachId);
            console.log('🔍 Coach ID type:', typeof updatedPayment.coachId);
            
            // Try finding coach by ID with better error handling
            let coach;
            if (typeof updatedPayment.coachId === 'string' && updatedPayment.coachId.length === 24) {
              coach = await Coach.findById(updatedPayment.coachId);
            } else {
              console.log('❌ Invalid coachId format:', updatedPayment.coachId);
              // Try alternative: find coach by name from booking
              if (coachName && coachName !== 'Unknown Coach') {
                const [firstname, lastname] = coachName.split(' ');
                coach = await Coach.findOne({ firstname, lastname });
                console.log('🔍 Alternative search by name result:', coach ? 'FOUND' : 'NOT FOUND');
              }
            }
            
            console.log('🔍 Coach found:', coach ? `${coach.firstname} ${coach.lastname} (${coach.username})` : 'NOT FOUND');
            
            if (coach) {
              const coachNotification = {
                type: 'new_booking',
                date: new Date(),
                status: 'unread',
                message: `New booking confirmed! ${user.firstname} ${user.lastname} has booked your ${coachName} class on ${updatedPayment.date} at ${updatedPayment.time}.`,
                timestamp: new Date(),
                read: false
              };
              
              coach.notifications = coach.notifications || [];
              coach.notifications.push(coachNotification);
              
              const savedCoach = await coach.save();
              console.log('✅ New booking notification sent to coach:', coach.username);
              console.log('🔍 Coach now has', savedCoach.notifications.length, 'notifications');
              console.log('🔍 Latest notification:', JSON.stringify(coachNotification, null, 2));
            } else {
              console.log('❌ Coach not found with ID:', updatedPayment.coachId);
              // Try to find coach by any alternative method
              const allCoaches = await Coach.find({});
              console.log('🔍 Available coaches:', allCoaches.map(c => ({ 
                id: c._id.toString(), 
                name: `${c.firstname} ${c.lastname}`,
                username: c.username 
              })));
              
              // Manual notification to ALL coaches for testing
              if (allCoaches.length > 0) {
                console.log('🔥 TESTING: Sending notification to ALL coaches');
                for (const testCoach of allCoaches) {
                  const testNotification = {
                    type: 'new_booking',
                    date: new Date(),
                    status: 'unread',
                    message: `[TEST] New booking confirmed! ${user.firstname} ${user.lastname} has booked a ${coachName} class on ${updatedPayment.date} at ${updatedPayment.time}.`,
                    timestamp: new Date(),
                    read: false
                  };
                  testCoach.notifications = testCoach.notifications || [];
                  testCoach.notifications.push(testNotification);
                  await testCoach.save();
                  console.log('🔥 Test notification sent to:', testCoach.username);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error sending notification to coach:', error);
            console.error('❌ Error stack:', error.stack);
            // Don't fail the approval if coach notification fails
          }
        }
      }
    } else if (action === 'reject') {
      // Remove booking completely from user's bookings and delete payment
      try {
        const user = await User.findOne({ username: updatedPayment.userId });
        if (user) {
          // Get coach name from user's booking before removing it
          let coachName = 'Unknown Coach';
          const bookingToRemove = user.bookings.find(b => 
            b.coachId === updatedPayment.coachId && 
            b.date === updatedPayment.date && 
            b.time === updatedPayment.time
          );
          if (bookingToRemove) {
            coachName = bookingToRemove.coachName || coachName;
          }

          // Remove the booking completely from user's bookings array
          if (updatedPayment.isPackage) {
            // For package bookings, remove all bookings related to this package
            user.bookings = user.bookings.filter(booking => 
              !(booking.isPackage && 
                booking.packageType === updatedPayment.packageType &&
                booking.paymentStatus === 'pending')
            );
            console.log(`✅ Removed package bookings for ${updatedPayment.packageType}`);
          } else {
            // For single bookings, remove the specific booking
            user.bookings = user.bookings.filter(booking => 
              !(booking.coachId === updatedPayment.coachId && 
                booking.date === updatedPayment.date && 
                booking.time === updatedPayment.time)
            );
            console.log(`✅ Removed booking: ${coachName} (${updatedPayment.date} at ${updatedPayment.time})`);
          }

          // Add rejection notification to user
          const rejectionNotification = {
            type: 'payment_rejected',
            date: new Date(),
            status: 'unread',
            message: `Payment rejected for ${coachName} class on ${paymentToReject.date} at ${paymentToReject.time}. Your booking has been cancelled and the schedule is now available again.`,
            timestamp: new Date(),
            read: false
          };
          
          user.notifications = user.notifications || [];
          user.notifications.push(rejectionNotification);
          user.markModified('bookings');
          user.markModified('notifications');
          await user.save();
          console.log('✅ Booking removed and rejection notification added to user:', user.username);

          // Delete the payment record completely
          await Payment.findByIdAndDelete(paymentId);
          console.log('✅ Payment record deleted completely');
        }
      } catch (error) {
        console.error('❌ Error removing booking and payment:', error);
      }
    }
    
    res.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Health check and rate limit status endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: isDevelopment ? 'development' : 'production',
        rateLimit: {
            windowMs: 15 * 60 * 1000,
            max: RATE_LIMIT_MAX,
            message: isDevelopment ? 
                'Ultra-high rate limit for development - supports auto-refresh + multiple windows + heavy testing' :
                'Standard production rate limit',
            calculation: `${RATE_LIMIT_MAX} requests per 15 minutes = ~${Math.round(RATE_LIMIT_MAX / 900)} requests per second`
        }
    });
});

// Debug endpoint to check user membership status
app.get('/api/debug/membership/:username', async (req, res) => {
    try {
        const { username } = req.params;
        console.log('🔍 [DEBUG] Checking membership for username:', username);
        
        // Find user
        const user = await User.findOne({ username: username });
        if (!user) {
            return res.json({ success: false, error: 'User not found', username });
        }
        
        console.log('✅ [DEBUG] User found:', user.username, 'email:', user.email);
        
        // Check membership application
        const membershipApp = await MembershipApplication.findOne({ 
            $or: [
                { userId: user._id.toString() },
                { userId: username },
                { email: user.email }
            ]
        }).sort({ submittedAt: -1 }); // Get latest application
        
        console.log('🔍 [DEBUG] Membership application found:', membershipApp ? 'YES' : 'NO');
        if (membershipApp) {
            console.log('🔍 [DEBUG] Membership details:', {
                status: membershipApp.status,
                expirationDate: membershipApp.expirationDate,
                isExpired: membershipApp.expirationDate ? new Date(membershipApp.expirationDate) <= new Date() : 'N/A',
                archived: membershipApp.archived
            });
        }
        
        const isActive = membershipApp && 
                        membershipApp.status === 'approved' &&
                        membershipApp.expirationDate &&
                        new Date(membershipApp.expirationDate) > new Date() &&
                        !membershipApp.archived;
        
        res.json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                _id: user._id
            },
            membershipApplication: membershipApp || null,
            hasActiveMembership: isActive
        });
    } catch (error) {
        console.error('❌ [DEBUG] Error checking membership:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Package booking endpoint for members
app.post('/api/book-package', async (req, res) => {
    try {
        const { userId, packageType, packageSessions, packagePrice, bookings, paymentProof, isPackage } = req.body;
        
        if (!userId || !packageType || !packageSessions || !packagePrice || !bookings || !paymentProof) {
            return res.status(400).json({
                success: false,
                error: 'All package booking fields are required'
            });
        }

        // Find the user first - try by _id (ObjectId), username, or email
        let user;
        
        // Try to find by ObjectId first
        if (userId && userId.length === 24) {
            try {
                user = await User.findById(userId);
            } catch (e) {
                console.log('Not a valid ObjectId, trying username...');
            }
        }
        
        // If not found by ObjectId, try by username
        if (!user) {
            user = await User.findOne({ username: userId });
        }
        
        // If still not found, try by email
        if (!user) {
            user = await User.findOne({ email: userId });
        }
        
        if (!user) {
            console.log('User not found with identifier:', userId);
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        console.log('✅ User found:', user.username, 'email:', user.email, '_id:', user._id);
        console.log('✅ User firstname:', user.firstname, 'lastname:', user.lastname);

        // Verify user has active membership - check by userId, email, and username
        console.log('Checking membership for user:', userId, 'user._id:', user._id, 'email:', user.email);
        
        const membershipApp = await MembershipApplication.findOne({ 
            $or: [
                { userId: user._id.toString() },  // Try by ObjectId as string
                { userId: userId },               // Try by username
                { email: user.email }            // Try by email
            ],
            status: 'approved',
            expirationDate: { $gt: new Date() },
            archived: { $ne: true }
        });

        console.log('Membership found:', membershipApp ? 'YES' : 'NO');

        if (!membershipApp) {
            console.log('Package booking denied - no active membership found for user:', userId);
            return res.status(403).json({
                success: false,
                error: 'Active membership required for package booking'
            });
        }

        // User already found above, no need to find again

        // Create package bookings with special package flag
        const packageBookings = bookings.map(booking => ({
            ...booking,
            paymentStatus: 'pending',
            paymentProof: paymentProof,
            paymentDate: new Date(),
            isPackage: true,
            packageType: packageType,
            packageSessions: packageSessions,
            packagePrice: packagePrice
        }));

        // Add all package bookings to user's bookings
        user.bookings.push(...packageBookings);
        await user.save();

        // Create a single payment record for the entire package
        console.log('🔧 Creating payment record with:');
        console.log('  - userId:', user.username);
        console.log('  - userName:', `${user.firstname} ${user.lastname}`);
        console.log('  - packagePrice:', packagePrice);
        console.log('  - amount will be set to:', packagePrice);
        
        const packagePayment = new Payment({
            userId: user.username, // Use the actual username from the user object
            userName: `${user.firstname} ${user.lastname}`, // This should already be correct
            coachId: bookings[0].coachId, // Use first coach for reference
            coachName: bookings[0].coachName,
            date: new Date().toISOString(),
            time: 'Package Booking',
            className: `${packageType} Package (${packageSessions} sessions)`,
            amount: packagePrice, // Make sure amount is set to packagePrice
            paymentProof: paymentProof,
            paymentDate: new Date(),
            status: 'for approval',
            isPackage: true,
            packageType: packageType,
            packageSessions: packageSessions,
            packagePrice: packagePrice,
            packageBookings: bookings
        });
        
        console.log('🔧 Payment object created:', {
            userId: packagePayment.userId,
            userName: packagePayment.userName,
            amount: packagePayment.amount,
            packagePrice: packagePayment.packagePrice
        });
        
        await packagePayment.save();

        // Send notifications to admins about package booking
        const admins = await User.find({ isAdmin: true });
        console.log('🔍 [PACKAGE NOTIF] Found admin users:', admins.length);
        console.log('🔍 [PACKAGE NOTIF] Admin usernames:', admins.map(a => `${a.username}(${a.isAdmin})`));
        
        const notif = {
            type: 'package_booking',
            date: new Date(),
            status: 'unread',
            message: `New package booking: ${user.firstname} ${user.lastname} booked ${packageType} package (${packageSessions} sessions) for ₱${packagePrice}`,
            read: false
        };
        
        for (const admin of admins) {
            admin.notifications = admin.notifications || [];
            admin.notifications.push(notif);
            await admin.save();
        }

        res.json({
            success: true,
            message: 'Package booking submitted successfully',
            packagePaymentId: packagePayment._id
        });
    } catch (err) {
        console.error('Package booking error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error during package booking'
        });
  }
});

// Add separate approve endpoint (like membership applications)
app.post('/api/admin/payments/:paymentId/approve', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // 🚀 AUTO-DELETE PAYMENT PROOF: Clear image after approval to save storage
    const updatedPayment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        status: 'verified',
        verificationDate: new Date(),
        paymentProof: 'Image deleted after verification for storage optimization' // Replace large image with text
      },
      { new: true }
    );
    
    console.log(`🗑️ Payment proof image deleted for payment ${paymentId} (approved by admin)`);
    
    if (!updatedPayment) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }
    
    // 🔥 SYNC PAYMENT STATUS TO USER BOOKINGS
    console.log('💰 Payment approved, syncing to user bookings...');
    
    // 🔥 NEW: Create Booking record for payroll calculation
    if (!updatedPayment.isPackage) {
      try {
        const existingBooking = await Booking.findOne({
          coachId: updatedPayment.coachId,
          date: new Date(updatedPayment.date),
          time: updatedPayment.time
        });

        if (!existingBooking) {
          const newBooking = new Booking({
            coachId: updatedPayment.coachId,
            coachName: updatedPayment.coachName,
            className: updatedPayment.className || 'Boxing',
            clientId: updatedPayment.userId,
            clientName: updatedPayment.userName,
            date: new Date(updatedPayment.date),
            time: updatedPayment.time,
            amount: updatedPayment.amount || 500,
            paymentStatus: 'verified',
            paymentProof: updatedPayment.paymentProof,
            paymentDate: updatedPayment.paymentDate,
            verificationDate: new Date()
          });
          
          await newBooking.save();
          console.log('✅ Created new Booking record for payroll calculation');
        }
      } catch (bookingError) {
        console.error('❌ Error creating Booking record:', bookingError);
      }
    }
    
    // Handle package bookings differently
    if (updatedPayment.isPackage) {
      console.log('📦 Processing package booking approval...');
      console.log(`📦 Looking for user: ${updatedPayment.userId}`);
      console.log(`📦 Package type: ${updatedPayment.packageType}`);
      
      // Find the user and update all package bookings
      const user = await User.findOne({ username: updatedPayment.userId });
      
      if (user) {
        console.log(`📦 Found user: ${user.username} with ${user.bookings.length} total bookings`);
        let hasUpdates = false;
        let packageBookingsFound = 0;
        let pendingPackageBookings = 0;
        
        // Debug: Check all bookings first
        user.bookings.forEach(booking => {
          if (booking.isPackage) {
            packageBookingsFound++;
            if (booking.packageType === updatedPayment.packageType && booking.paymentStatus === 'pending') {
              pendingPackageBookings++;
            }
          }
        });
        
        console.log(`📦 Package bookings found: ${packageBookingsFound}`);
        console.log(`📦 Pending package bookings for ${updatedPayment.packageType}: ${pendingPackageBookings}`);
        
        // Update all bookings that match the package
        user.bookings.forEach((booking, index) => {
          console.log(`📦 Checking booking ${index}:`, {
            isPackage: booking.isPackage,
            packageType: booking.packageType,
            paymentPackageType: updatedPayment.packageType,
            paymentStatus: booking.paymentStatus,
            coachName: booking.coachName,
            date: booking.date
          });
          
          if (booking.isPackage && 
              booking.packageType === updatedPayment.packageType &&
              booking.paymentStatus === 'pending') {
            
            console.log(`📦 ✅ MATCH FOUND! Updating booking: ${booking.coachName} (${booking.date}) - ${booking.class}`);
            booking.paymentStatus = 'verified';
            booking.paymentProof = updatedPayment.paymentProof;
            booking.verificationDate = new Date();
            hasUpdates = true;
            console.log(`✅ Updated package booking: ${booking.coachName} (${booking.date})`);
          } else {
            console.log(`📦 ❌ No match for booking ${index}:`, {
              isPackageMatch: booking.isPackage,
              packageTypeMatch: booking.packageType === updatedPayment.packageType,
              statusMatch: booking.paymentStatus === 'pending'
            });
          }
        });
        
        if (hasUpdates) {
          // Add package approval notification
          const approvalNotification = {
            type: 'package_approved',
            date: new Date(),
            status: 'unread',
            message: `Package booking approved! Your ${updatedPayment.packageType} package (${updatedPayment.packageSessions} sessions) for ₱${updatedPayment.packagePrice} has been confirmed.`,
            timestamp: new Date(),
            read: false
          };
          
          user.notifications = user.notifications || [];
          user.notifications.push(approvalNotification);
          user.markModified('bookings');
          user.markModified('notifications');
          await user.save();
          console.log('💾 Package bookings updated successfully!');

          // 🔥 NEW: Send package booking approval email to user
          try {
            // Fetch booking approval email template
            const template = await EmailTemplate.findOne({ type: 'booking-approval' });
            const logoUrl = (template && template.logoUrl) ? template.logoUrl : 'https://i.imgur.com/1Q9Z1Zm.png';
            
            // Generate automatic subject for package
            const subject = `Package Booking Confirmed! ${updatedPayment.packageType} Package - SenJitsu/Fist Gym`;

            // Generate automatic package email message
            const emailBody = `Congratulations ${user.firstname || user.username}! Your ${updatedPayment.packageType} package (${updatedPayment.packageSessions} sessions) has been confirmed. We look forward to seeing you!`;

            // Send email notification to user
            const transporter = nodemailer.createTransport({
              service: 'gmail',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
              }
            });
            
            const mailOptions = {
              from: 'Senjitsu/Fist Gym <' + process.env.EMAIL_USER + '>',
              to: user.email,
              subject: subject,
              html: `
                <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
                  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
                    <div style="background:#232b36;padding:24px 0;text-align:center;">
                      <img src="${logoUrl}" alt="Senjitsu/Fist Gym" style="height:48px;margin-bottom:8px;object-fit:contain;max-width:90%;background:#fff;border-radius:6px;" />
                    </div>
                    <div style="padding:36px 32px 32px 32px;text-align:center;">
                      <h2 style="font-size:1.7rem;color:#181818;margin-bottom:18px;letter-spacing:1px;font-family:sans-serif;">${subject}</h2>
                      <p style="font-size:1.1rem;color:#222;margin-bottom:18px;">${emailBody}</p>
                      <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;text-align:left;">
                        <h3 style="margin:0 0 10px 0;color:#333;font-size:1.1rem;">Package Details:</h3>
                        <p style="margin:5px 0;color:#666;"><strong>Package Type:</strong> ${updatedPayment.packageType}</p>
                        <p style="margin:5px 0;color:#666;"><strong>Sessions:</strong> ${updatedPayment.packageSessions}</p>
                        <p style="margin:5px 0;color:#666;"><strong>Amount:</strong> ₱${updatedPayment.packagePrice}</p>
                      </div>
                      <a href="http://localhost:3000/my-schedule" style="display:inline-block;margin-top:18px;padding:14px 36px;background:#2ecc40;color:#fff;font-weight:bold;font-size:1.1rem;border-radius:6px;text-decoration:none;letter-spacing:1px;">View My Schedule</a>
                    </div>
                  </div>
                </div>
              `
            };
            
            transporter.sendMail(mailOptions, (error, info) => {
              if (error) {
                console.error('❌ Error sending package booking approval email:', error);
              } else {
                console.log('✅ Package booking approval email sent successfully to:', user.email);
              }
            });
          } catch (emailError) {
            console.error('❌ Error in package booking approval email process:', emailError);
            // Don't fail the approval if email fails
          }
          
          // 🔥 IMPORTANT: Broadcast update to frontend
          // Since we don't have WebSocket, we'll use a simple notification system
          console.log(`📡 Package payment approved for user: ${user.username}`);
          console.log(`📡 Frontend should refresh user bookings for: ${user.username}`);
          
          // Notify coaches about package bookings
          if (updatedPayment.packageBookings && updatedPayment.packageBookings.length > 0) {
            for (const packageBooking of updatedPayment.packageBookings) {
              try {
                const coach = await Coach.findById(packageBooking.coachId);
                if (coach) {
                  const coachNotification = {
                    type: 'new_booking',
                    date: new Date(),
                    status: 'unread',
                    message: `New package booking confirmed! ${user.firstname} ${user.lastname} has booked your ${updatedPayment.packageType} class on ${packageBooking.date} at ${packageBooking.time}.`,
                    timestamp: new Date(),
                    read: false
                  };
                  
                  coach.notifications = coach.notifications || [];
                  coach.notifications.push(coachNotification);
                  await coach.save();
                  console.log(`✅ Package booking notification sent to coach: ${coach.username}`);

                  // 🔥 NEW: Send email notification to coach about the new package booking
                  try {
                    // Fetch booking approval email template for logo
                    const template = await EmailTemplate.findOne({ type: 'booking-approval' });
                    const logoUrl = (template && template.logoUrl) ? template.logoUrl : 'https://i.imgur.com/1Q9Z1Zm.png';
                    
                    const formattedDate = new Date(packageBooking.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });

                    // Generate email subject and content for coach (package booking)
                    const coachSubject = `You have a new package class! ${updatedPayment.packageType} with ${user.firstname} ${user.lastname} - SenJitsu/Fist Gym`;
                    const coachEmailBody = `Hello ${coach.firstname}! You have a new confirmed package booking for ${updatedPayment.packageType} with ${user.firstname} ${user.lastname} on ${formattedDate} at ${packageBooking.time}. This is part of their ${updatedPayment.packageSessions}-session package. Please prepare for the session!`;

                    // Send email notification to coach
                    const transporter = nodemailer.createTransport({
                      service: 'gmail',
                      auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                      }
                    });
                    
                    const coachMailOptions = {
                      from: 'Senjitsu/Fist Gym <' + process.env.EMAIL_USER + '>',
                      to: coach.email,
                      subject: coachSubject,
                      html: `
                        <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
                          <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
                            <div style="background:#232b36;padding:24px 0;text-align:center;">
                              <img src="${logoUrl}" alt="Senjitsu/Fist Gym" style="height:48px;margin-bottom:8px;object-fit:contain;max-width:90%;background:#fff;border-radius:6px;" />
                            </div>
                            <div style="padding:36px 32px 32px 32px;text-align:center;">
                              <h2 style="font-size:1.7rem;color:#181818;margin-bottom:18px;letter-spacing:1px;font-family:sans-serif;">New Package Class Booking!</h2>
                              <p style="font-size:1.1rem;color:#222;margin-bottom:18px;">${coachEmailBody}</p>
                              <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;text-align:left;">
                                <h3 style="margin:0 0 10px 0;color:#333;font-size:1.1rem;">Package Class Details:</h3>
                                <p style="margin:5px 0;color:#666;"><strong>Student:</strong> ${user.firstname} ${user.lastname}</p>
                                <p style="margin:5px 0;color:#666;"><strong>Package Type:</strong> ${updatedPayment.packageType}</p>
                                <p style="margin:5px 0;color:#666;"><strong>Total Sessions:</strong> ${updatedPayment.packageSessions}</p>
                                <p style="margin:5px 0;color:#666;"><strong>Date:</strong> ${formattedDate}</p>
                                <p style="margin:5px 0;color:#666;"><strong>Time:</strong> ${packageBooking.time}</p>
                                <p style="margin:5px 0;color:#666;"><strong>Package Amount:</strong> ₱${updatedPayment.packagePrice}</p>
                              </div>
                              <a href="http://localhost:3000/coach-schedule" style="display:inline-block;margin-top:18px;padding:14px 36px;background:#2ecc40;color:#fff;font-weight:bold;font-size:1.1rem;border-radius:6px;text-decoration:none;letter-spacing:1px;">View My Schedule</a>
                            </div>
                          </div>
                        </div>
                      `
                    };
                    
                    transporter.sendMail(coachMailOptions, (error, info) => {
                      if (error) {
                        console.error('❌ Error sending coach package booking notification email:', error);
                      } else {
                        console.log('✅ Coach package booking notification email sent successfully to:', coach.email);
                      }
                    });
                  } catch (emailError) {
                    console.error('❌ Error in coach package booking notification email process:', emailError);
                    // Don't fail the approval if email fails
                  }
                }
              } catch (error) {
                console.error('❌ Error notifying coach for package booking:', error);
              }
            }
          }
        }
      }
    } else {
      // Handle single bookings (existing logic)
    // Find and update the user's booking
    const user = await User.findOne({ 
      'bookings': {
        $elemMatch: {
          coachId: updatedPayment.coachId,
          date: updatedPayment.date,
          time: updatedPayment.time
        }
      }
    });
    
    if (user) {
      let hasUpdates = false;
      user.bookings.forEach(booking => {
        if (booking.coachId === updatedPayment.coachId && 
            booking.date === updatedPayment.date && 
            booking.time === updatedPayment.time) {
          
          booking.paymentStatus = 'verified';
          booking.paymentProof = updatedPayment.paymentProof;
          booking.verificationDate = new Date();
          hasUpdates = true;
          console.log(`✅ Updated payment status for ${user.username}: ${booking.coachName} (${booking.date})`);
        }
      });
      
      if (hasUpdates) {
        // Add approval notification to user
        const bookingMatch = user.bookings.find(b => b.coachId === updatedPayment.coachId && b.date === updatedPayment.date && b.time === updatedPayment.time);
        const coachName = bookingMatch?.coachName || updatedPayment.coachName || 'Unknown Coach';
        
        const approvalNotification = {
          type: 'payment_approved',
          date: new Date(),
          status: 'unread',
          message: `Payment approved! Your booking for ${coachName} class on ${updatedPayment.date} at ${updatedPayment.time} has been confirmed.`,
          timestamp: new Date(),
          read: false
        };
        
        user.notifications = user.notifications || [];
        user.notifications.push(approvalNotification);

        user.markModified('bookings');
        user.markModified('notifications');
        await user.save();
        console.log('💾 User booking updated successfully!');

        // 🔥 NEW: Send booking approval email to user
        try {
          // Fetch booking approval email template
          const template = await EmailTemplate.findOne({ type: 'booking-approval' });
          const logoUrl = (template && template.logoUrl) ? template.logoUrl : 'https://i.imgur.com/1Q9Z1Zm.png';
          
          // Generate automatic subject based on booking details
          const bookingMatch = user.bookings.find(b => b.coachId === updatedPayment.coachId && b.date === updatedPayment.date && b.time === updatedPayment.time);
          const coachName = bookingMatch?.coachName || updatedPayment.coachName || 'Unknown Coach';
          const className = bookingMatch?.class || updatedPayment.className || 'Boxing';
          const subject = `Booking Confirmed! ${className} with ${coachName} - SenJitsu/Fist Gym`;

          // Automatically get booking details (reuse from subject generation)
          const formattedDate = new Date(updatedPayment.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Generate automatic email message
          const emailBody = `Congratulations ${user.firstname || user.username}! Your booking for ${className} with ${coachName} on ${formattedDate} at ${updatedPayment.time} has been confirmed. We look forward to seeing you!`;

          // Send email notification to user
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
          
          const mailOptions = {
            from: 'Senjitsu/Fist Gym <' + process.env.EMAIL_USER + '>',
            to: user.email,
            subject: subject,
            html: `
              <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
                <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
                  <div style="background:#232b36;padding:24px 0;text-align:center;">
                    <img src="${logoUrl}" alt="Senjitsu/Fist Gym" style="height:48px;margin-bottom:8px;object-fit:contain;max-width:90%;background:#fff;border-radius:6px;" />
                  </div>
                  <div style="padding:36px 32px 32px 32px;text-align:center;">
                    <h2 style="font-size:1.7rem;color:#181818;margin-bottom:18px;letter-spacing:1px;font-family:sans-serif;">${subject}</h2>
                    <p style="font-size:1.1rem;color:#222;margin-bottom:18px;">${emailBody}</p>
                    <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;text-align:left;">
                      <h3 style="margin:0 0 10px 0;color:#333;font-size:1.1rem;">Booking Details:</h3>
                      <p style="margin:5px 0;color:#666;"><strong>Class:</strong> ${className}</p>
                      <p style="margin:5px 0;color:#666;"><strong>Coach:</strong> ${coachName}</p>
                      <p style="margin:5px 0;color:#666;"><strong>Date:</strong> ${formattedDate}</p>
                      <p style="margin:5px 0;color:#666;"><strong>Time:</strong> ${updatedPayment.time}</p>
                      <p style="margin:5px 0;color:#666;"><strong>Amount:</strong> ₱${updatedPayment.amount}</p>
                    </div>
                    <a href="http://localhost:3000/my-schedule" style="display:inline-block;margin-top:18px;padding:14px 36px;background:#2ecc40;color:#fff;font-weight:bold;font-size:1.1rem;border-radius:6px;text-decoration:none;letter-spacing:1px;">View My Schedule</a>
                  </div>
                </div>
              </div>
            `
          };
          
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error('❌ Error sending booking approval email:', error);
            } else {
              console.log('✅ Booking approval email sent successfully to:', user.email);
            }
          });
        } catch (emailError) {
          console.error('❌ Error in booking approval email process:', emailError);
          // Don't fail the approval if email fails
        }

        // 🔥 NEW: Send notification to the specific coach about the approved booking
        try {
          if (DEBUG_MODE) {
            console.log('🔍 [APPROVE ENDPOINT] Looking for coach with ID:', updatedPayment.coachId);
            console.log('🔍 [APPROVE ENDPOINT] Coach ID type:', typeof updatedPayment.coachId);
          }
          
          // Try finding coach by ID with better error handling
          let coach;
          if (typeof updatedPayment.coachId === 'string' && updatedPayment.coachId.length === 24) {
            coach = await Coach.findById(updatedPayment.coachId);
                      } else {
            if (DEBUG_MODE) {
              console.log('❌ [APPROVE ENDPOINT] Invalid coachId format:', updatedPayment.coachId);
            }
            // Try alternative: find coach by booking data
            const coachName = user.bookings.find(b => 
              b.coachId === updatedPayment.coachId && 
              b.date === updatedPayment.date && 
              b.time === updatedPayment.time
            )?.coachName;
            
            if (coachName && coachName !== 'Unknown Coach') {
              const [firstname, lastname] = coachName.split(' ');
              coach = await Coach.findOne({ firstname, lastname });
              if (DEBUG_MODE) {
                console.log('🔍 [APPROVE ENDPOINT] Alternative search by name result:', coach ? 'FOUND' : 'NOT FOUND');
              }
            }
          }
          
          if (DEBUG_MODE) {
            console.log('🔍 [APPROVE ENDPOINT] Coach found:', coach ? `${coach.firstname} ${coach.lastname} (${coach.username})` : 'NOT FOUND');
          }
          
          if (coach) {
            console.log('🔍 [EMAIL DEBUG] Coach found for email notification:', {
              name: `${coach.firstname} ${coach.lastname}`,
              username: coach.username,
              email: coach.email
            });

            const coachNotification = {
              type: 'new_booking',
              date: new Date(),
              status: 'unread',
              message: `New booking confirmed! ${user.firstname} ${user.lastname} has booked your class on ${updatedPayment.date} at ${updatedPayment.time}.`,
              timestamp: new Date(),
              read: false
            };
            
            coach.notifications = coach.notifications || [];
            coach.notifications.push(coachNotification);
            const savedCoach = await coach.save();
            if (DEBUG_MODE) {
              console.log('✅ [APPROVE ENDPOINT] New booking notification sent to coach:', coach.username);
              console.log('🔍 [APPROVE ENDPOINT] Coach now has', savedCoach.notifications.length, 'notifications');
            }

            // 🔥 NEW: Send email notification to coach about the new booking
            try {
              console.log('📧 [EMAIL DEBUG] Starting email process for coach:', coach.email);
              // Fetch booking approval email template for logo
              const template = await EmailTemplate.findOne({ type: 'booking-approval' });
              const logoUrl = (template && template.logoUrl) ? template.logoUrl : 'https://i.imgur.com/1Q9Z1Zm.png';
              
              // Get booking details
              const bookingMatch = user.bookings.find(b => b.coachId === updatedPayment.coachId && b.date === updatedPayment.date && b.time === updatedPayment.time);
              const className = bookingMatch?.class || updatedPayment.className || 'Boxing';
              const formattedDate = new Date(updatedPayment.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });

              // Generate email subject and content for coach
              const coachSubject = `You have a new class! ${className} with ${user.firstname} ${user.lastname} - SenJitsu/Fist Gym`;
              const coachEmailBody = `Hello ${coach.firstname}! You have a new confirmed booking for ${className} with ${user.firstname} ${user.lastname} on ${formattedDate} at ${updatedPayment.time}. Please prepare for the session!`;

              // Send email notification to coach
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS
                }
              });
              
              const coachMailOptions = {
                from: 'Senjitsu/Fist Gym <' + process.env.EMAIL_USER + '>',
                to: coach.email,
                subject: coachSubject,
                html: `
                  <div style="background:#f4f6f8;padding:32px 0;min-height:100vh;">
                    <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:8px;box-shadow:0 2px 16px rgba(0,0,0,0.07);overflow:hidden;">
                      <div style="background:#232b36;padding:24px 0;text-align:center;">
                        <img src="${logoUrl}" alt="Senjitsu/Fist Gym" style="height:48px;margin-bottom:8px;object-fit:contain;max-width:90%;background:#fff;border-radius:6px;" />
                      </div>
                      <div style="padding:36px 32px 32px 32px;text-align:center;">
                        <h2 style="font-size:1.7rem;color:#181818;margin-bottom:18px;letter-spacing:1px;font-family:sans-serif;">New Class Booking!</h2>
                        <p style="font-size:1.1rem;color:#222;margin-bottom:18px;">${coachEmailBody}</p>
                        <div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;text-align:left;">
                          <h3 style="margin:0 0 10px 0;color:#333;font-size:1.1rem;">Class Details:</h3>
                          <p style="margin:5px 0;color:#666;"><strong>Student:</strong> ${user.firstname} ${user.lastname}</p>
                          <p style="margin:5px 0;color:#666;"><strong>Class:</strong> ${className}</p>
                          <p style="margin:5px 0;color:#666;"><strong>Date:</strong> ${formattedDate}</p>
                          <p style="margin:5px 0;color:#666;"><strong>Time:</strong> ${updatedPayment.time}</p>
                          <p style="margin:5px 0;color:#666;"><strong>Amount:</strong> ₱${updatedPayment.amount}</p>
                        </div>
                        <a href="http://localhost:3000/coach-schedule" style="display:inline-block;margin-top:18px;padding:14px 36px;background:#2ecc40;color:#fff;font-weight:bold;font-size:1.1rem;border-radius:6px;text-decoration:none;letter-spacing:1px;">View My Schedule</a>
                      </div>
                    </div>
                  </div>
                `
              };
              
              console.log('📧 [EMAIL DEBUG] Sending email with options:', {
                from: coachMailOptions.from,
                to: coachMailOptions.to,
                subject: coachMailOptions.subject
              });

              transporter.sendMail(coachMailOptions, (error, info) => {
                if (error) {
                  console.error('❌ [EMAIL ERROR] Error sending coach booking notification email:', error);
                  console.error('❌ [EMAIL ERROR] Error details:', error.message);
                } else {
                  console.log('✅ [EMAIL SUCCESS] Coach booking notification email sent successfully to:', coach.email);
                  console.log('📧 [EMAIL SUCCESS] Email info:', info.messageId);
                }
              });
            } catch (emailError) {
              console.error('❌ Error in coach booking notification email process:', emailError);
              // Don't fail the approval if email fails
            }
          } else {
            if (DEBUG_MODE) {
              console.log('❌ [APPROVE ENDPOINT] Coach not found with ID:', updatedPayment.coachId);
            }
            // Try to find coach by any alternative method
            const allCoaches = await Coach.find({});
            if (DEBUG_MODE) {
              console.log('🔍 [APPROVE ENDPOINT] Available coaches:', allCoaches.map(c => ({ 
                id: c._id.toString(), 
                name: `${c.firstname} ${c.lastname}`,
                username: c.username 
              })));
            }
            
            // Manual notification to ALL coaches for testing
            if (allCoaches.length > 0 && DEBUG_MODE) {
              console.log('🔥 [APPROVE ENDPOINT] TESTING: Sending notification to ALL coaches');
              for (const testCoach of allCoaches) {
                const testNotification = {
                  type: 'new_booking',
                  date: new Date(),
                  status: 'unread',
                  message: `[TEST] New booking confirmed! ${user.firstname} ${user.lastname} has booked a class on ${updatedPayment.date} at ${updatedPayment.time}.`,
                  timestamp: new Date(),
                  read: false
                };
                testCoach.notifications = testCoach.notifications || [];
                testCoach.notifications.push(testNotification);
                await testCoach.save();
                if (DEBUG_MODE) {
                  console.log('🔥 [APPROVE ENDPOINT] Test notification sent to:', testCoach.username);
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ [APPROVE ENDPOINT] Error sending notification to coach:', error);
          console.error('❌ [APPROVE ENDPOINT] Error stack:', error.stack);
          // Don't fail the approval if coach notification fails
        }
        }
      }
    }
    
    res.json({ success: true, payment: updatedPayment });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Add separate reject endpoint (like membership applications)
app.post('/api/admin/payments/:paymentId/reject', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Find the payment first to get details
    const paymentToReject = await Payment.findById(paymentId);
    
    if (!paymentToReject) {
      return res.status(404).json({ success: false, error: 'Payment not found.' });
    }

    // Remove booking completely from user's bookings and delete payment
    try {
      const user = await User.findOne({ username: paymentToReject.userId });
      if (user) {
        // Get coach name from user's booking before removing it
        let coachName = 'Unknown Coach';
        const bookingToRemove = user.bookings.find(b => 
          b.coachId === paymentToReject.coachId && 
          b.date === paymentToReject.date && 
          b.time === paymentToReject.time
        );
        if (bookingToRemove) {
          coachName = bookingToRemove.coachName || coachName;
        }

        // Remove the booking completely from user's bookings array
        if (paymentToReject.isPackage) {
          // For package bookings, remove all bookings related to this package
          user.bookings = user.bookings.filter(booking => 
            !(booking.isPackage && 
              booking.packageType === paymentToReject.packageType &&
              booking.paymentStatus === 'pending')
          );
          console.log(`✅ Removed package bookings for ${paymentToReject.packageType}`);
        } else {
          // For single bookings, remove the specific booking
          user.bookings = user.bookings.filter(booking => 
            !(booking.coachId === paymentToReject.coachId && 
              booking.date === paymentToReject.date && 
              booking.time === paymentToReject.time)
          );
          console.log(`✅ Removed booking: ${coachName} (${paymentToReject.date} at ${paymentToReject.time})`);
        }

        // Add rejection notification to user
        const rejectionNotification = {
          type: 'payment_rejected',
          date: new Date(),
          status: 'unread',
          message: `Payment rejected for ${coachName} class on ${paymentToReject.date} at ${paymentToReject.time}. Your booking has been cancelled and the schedule is now available again.`,
          timestamp: new Date(),
          read: false
        };
        
        user.notifications = user.notifications || [];
        user.notifications.push(rejectionNotification);
        user.markModified('bookings');
        await user.save();
        console.log('✅ Booking removed and rejection notification added to user:', user.username);
      }
    } catch (error) {
      console.error('❌ Error removing booking and payment:', error);
    }
    
    // Delete the payment record completely
    await Payment.findByIdAndDelete(paymentId);
    console.log('✅ Payment record deleted completely');
    
    res.json({ success: true, message: 'Payment rejected and booking removed successfully' });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ success: false, error: 'Server error.' });
  }
});

// Get user booking history
app.get('/api/users/:username/booking-history', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            bookingHistory: user.bookingHistory || []
        });
    } catch (error) {
        console.error('Error fetching booking history:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching booking history'
        });
    }
});

// Get user payment history
app.get('/api/users/:username/payment-history', async (req, res) => {
    try {
        const { username } = req.params;
        if (DEBUG_MODE) {
      console.log(`🔍 [PAYMENT HISTORY] Fetching payment history for user: ${username}`);
    }
        
        // Get payments for this user from the Payment collection
        const payments = await Payment.find({ userId: username }).sort({ submittedAt: -1 });
        if (DEBUG_MODE) {
          console.log(`🔍 [PAYMENT HISTORY] Found ${payments.length} payments for user ${username}`);
        }
        
        // Also check for alternative payment sources
        const user = await User.findOne({ username });
        let userBookingsWithPayments = [];
        
        if (user && user.bookings) {
            userBookingsWithPayments = user.bookings.filter(booking => 
                booking.paymentStatus === 'verified' || booking.paymentStatus === 'rejected' || booking.paymentStatus === 'pending'
            );
            if (DEBUG_MODE) {
          console.log(`🔍 [PAYMENT HISTORY] Found ${userBookingsWithPayments.length} bookings with payment info in user.bookings`);
        }
        }
        
        // Combine Payment collection data with user bookings payment data
        let allPayments = [];
        
        // Add payments from Payment collection
        for (const payment of payments) {
            let coachName = 'Unknown Coach';
            try {
                if (DEBUG_MODE) {
                    console.log(`🔍 [COACH LOOKUP] Looking up coach with ID: ${payment.coachId}`);
                }
                const coach = await Coach.findById(payment.coachId);
                if (coach) {
                    coachName = `${coach.firstname} ${coach.lastname}`;
                    if (DEBUG_MODE) {
                        console.log(`✅ [COACH LOOKUP] Found coach: ${coachName}`);
                    }
                } else {
                    if (DEBUG_MODE) {
                        console.log(`❌ [COACH LOOKUP] No coach found with ID: ${payment.coachId}`);
                    }
                }
            } catch (e) {
                if (DEBUG_MODE) {
                    console.log(`❌ [COACH LOOKUP] Error finding coach ${payment.coachId}:`, e.message);
                }
                // Coach not found, keep default
            }
            
            allPayments.push({
                _id: payment._id,
                coachId: payment.coachId,
                coachName: coachName,
                date: payment.date,
                time: payment.time,
                className: payment.className || (payment.isPackage ? `${payment.packageType} Package` : 'Boxing'),
                amount: payment.amount || payment.packagePrice || 500,
                status: payment.status,
                submittedAt: payment.submittedAt,
                verificationDate: payment.verificationDate,
                isPackage: payment.isPackage || false,
                packageType: payment.packageType,
                packageSessions: payment.packageSessions,
                hasMembershipDiscount: payment.hasMembershipDiscount || false,
                membershipDiscount: payment.membershipDiscount || 0,
                originalAmount: payment.originalAmount,
                source: 'payment_collection'
            });
        }
        
        // Add payments from user.bookings if not already in Payment collection
        for (const booking of userBookingsWithPayments) {
            const exists = allPayments.some(p => 
                p.coachId === booking.coachId && 
                p.date === booking.date && 
                p.time === booking.time
            );
            
            if (!exists) {
                allPayments.push({
                    _id: booking._id,
                    coachId: booking.coachId,
                    coachName: booking.coachName || 'Unknown Coach',
                    date: booking.date,
                    time: booking.time,
                    className: booking.class || 'Boxing',
                    amount: 500, // Default amount
                    status: booking.paymentStatus,
                    submittedAt: booking.paymentDate || booking.verificationDate || new Date(),
                    verificationDate: booking.verificationDate,
                    isPackage: booking.isPackage || false,
                    packageType: booking.packageType,
                    packageSessions: booking.packageSessions,
                    hasMembershipDiscount: false,
                    membershipDiscount: 0,
                    originalAmount: 500,
                    source: 'user_bookings'
                });
            }
        }
        
        // Sort by submission date
        allPayments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        
        if (DEBUG_MODE) {
          console.log(`🔍 [PAYMENT HISTORY] Total payments to return: ${allPayments.length}`);
        }

        res.json({
            success: true,
            paymentHistory: allPayments
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while fetching payment history'
        });
    }
});

// Manually trigger moving completed bookings to history
app.post('/api/admin/move-completed-bookings', async (req, res) => {
    try {
        await moveCompletedBookingsToHistory(wss);
        res.json({
            success: true,
            message: 'Completed bookings moved to history successfully'
        });
    } catch (error) {
        console.error('Error in manual cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Error moving completed bookings'
        });
    }
});

// 🔥 NEW: User-triggered booking refresh for instant updates
app.get('/api/users/:username/refresh-bookings', async (req, res) => {
    try {
        const { username } = req.params;
        
        // Update user's lastActive time
        await User.findOneAndUpdate(
            { username },
            { lastActive: new Date() }
        );
        
        // Trigger immediate check for completed bookings
        await moveCompletedBookingsToHistory(wss);
        
        // Return updated user data
        const user = await User.findOne({ username }).select('username bookings bookingHistory');
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Bookings refreshed successfully',
            bookings: user.bookings,
            bookingHistory: user.bookingHistory 
        });
    } catch (error) {
        console.error('Error refreshing user bookings:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error refreshing bookings' 
        });
    }
});



// 🔥 NEW: Test endpoint to show optimization results
app.get('/api/admin/performance-stats', async (req, res) => {
    try {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        
        const totalUsers = await User.countDocuments({ bookings: { $exists: true, $not: { $size: 0 } } });
        const activeUsers = await User.countDocuments({ 
            bookings: { $exists: true, $not: { $size: 0 } },
            lastActive: { $gte: oneDayAgo }
        });
        
        const reductionPercentage = totalUsers > 0 ? Math.round((1 - activeUsers / totalUsers) * 100) : 0;
        
        res.json({
            success: true,
            stats: {
                totalUsersWithBookings: totalUsers,
                activeUsersLast24h: activeUsers,
                reductionPercentage: `${reductionPercentage}%`,
                optimizationBenefit: `${reductionPercentage}% fewer users scanned per cleanup cycle`
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🔥 MANUAL SYNC ENDPOINT - Force sync payment status
app.post('/api/admin/sync-payment-status', async (req, res) => {
    try {
        console.log('🔄 Manual sync payment status triggered...');
        await syncPaymentStatusToUserBookings();
        res.json({
            success: true,
            message: 'Payment status synced successfully!'
        });
    } catch (error) {
        console.error('❌ Error in manual sync:', error);
        res.status(500).json({
            success: false,
            error: 'Error syncing payment status'
        });
    }
});

// Initialize OpenAI
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to check if message is related to gym/martial arts
const checkIfGymRelated = (message) => {
  const gymKeywords = [
    // Gym names
    'fist gym', 'senjitsu', 'fist', 'gym',
    
    // Martial arts
    'boxing', 'muay thai', 'bjj', 'jiu jitsu', 'judo', 'kali', 'escrima', 
    'mma', 'mixed martial arts', 'wrestling', 'martial arts', 'fighting',
    
    // Gym services
    'class', 'classes', 'training', 'coach', 'coaches', 'instructor',
    'schedule', 'booking', 'book', 'membership', 'member', 'session',
    'package', 'deal', 'rate', 'rates', 'price', 'pricing', 'payment',
    
    // Gym-related activities
    'workout', 'fitness', 'exercise', 'self defense', 'self-defense',
    'sparring', 'grappling', 'striking', 'technique', 'belt', 'rank',
    
    // Location and contact
    'timog', 'quezon city', 'location', 'address', 'contact', 'phone',
    'gcash', 'payment', 'facility', 'equipment',
    
    // General gym questions
    'how to', 'what is', 'when', 'where', 'who', 'why', 'can i',
    'do you', 'are you', 'is there', 'available', 'open', 'hours'
  ];
  
  const messageLower = message.toLowerCase();
  
  // Check if message contains any gym-related keywords
  const hasGymKeywords = gymKeywords.some(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );
  
  // Check for common non-gym topics that should be rejected
  const nonGymKeywords = [
    'weather', 'politics', 'news', 'stock market', 'cryptocurrency',
    'recipe', 'cooking', 'movie', 'music', 'celebrity', 'sports' + ' ((?!martial arts|fighting|boxing|mma))',
    'programming', 'code', 'software', 'computer', 'technology' + ' ((?!gym|booking))',
    'medical advice', 'doctor', 'medicine', 'health' + ' ((?!fitness|workout))',
    'travel', 'vacation', 'hotel', 'restaurant' + ' ((?!gym|fist))',
    'shopping', 'fashion', 'beauty', 'makeup'
  ];
  
  const hasNonGymKeywords = nonGymKeywords.some(keyword => 
    messageLower.includes(keyword.toLowerCase())
  );
  
  // If it has gym keywords and no non-gym keywords, it's gym-related
  // If it's a general greeting or question, allow it through
  const isGreeting = /^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)$/i.test(messageLower.trim());
  
  return hasGymKeywords || isGreeting || (!hasNonGymKeywords && messageLower.length < 100);
};

// AI Chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // Check if the message is related to gym/martial arts topics
    const isGymRelated = checkIfGymRelated(message);
    
    if (!isGymRelated) {
      return res.json({
        success: true,
        response: "I'm sorry, but I can only help you with questions related to FIST GYM/SenJitsu, our martial arts classes, coaches, schedules, membership, and booking information. Please ask me something about our gym services! 🥋"
      });
    }

    // Fetch current coaches from database
    const coaches = await Coach.find({}, 'firstname lastname username specialties belt biography proRecord proWins proLosses');
    
    // Build coaches information for the prompt
    let coachesInfo = '';
    if (coaches && coaches.length > 0) {
      coachesInfo = '\n👥 **OUR EXPERT COACHES:**\n';
      coaches.forEach(coach => {
        coachesInfo += `- **${coach.firstname} ${coach.lastname}** (@${coach.username})\n`;
        if (coach.specialties && coach.specialties.length > 0) {
          coachesInfo += `  - Specialties: ${coach.specialties.join(', ')}\n`;
        }
        if (coach.belt) {
          coachesInfo += `  - Belt/Rank: ${coach.belt}\n`;
        }
        if (coach.proRecord && coach.proWins !== undefined && coach.proLosses !== undefined) {
          coachesInfo += `  - Professional Record: ${coach.proWins}W-${coach.proLosses}L\n`;
        }
        if (coach.biography) {
          coachesInfo += `  - Bio: ${coach.biography}\n`;
        }
        coachesInfo += '\n';
      });
    } else {
      // Fallback - use static coach list based on what we see in the website
      coachesInfo = '\n👥 **OUR EXPERT COACHES:**\n';
      coachesInfo += '- **Alan Permelo** (@alanpermelo) - Boxing Specialist\n';
      coachesInfo += '- **Andrei Amerkhan** (@andreiamerkhan) - Boxing/MMA\n';
      coachesInfo += '- **Rosete Rosenberg** (@roseterosenberg) - Boxing Coach\n';
      coachesInfo += '- **Norman Manalili** (@normanmanalili) - Boxing/MMA\n';
      coachesInfo += '- **Chris Fuentes** (@chrisfuentes) - Boxing/MMA Coach\n';
      coachesInfo += '- **Ramon Rapong III** (@ramonrapong) - Boxing/MMA\n';
      coachesInfo += '- **Gian Saquilon** (@giansaquilon) - Boxing Coach\n';
      coachesInfo += '- **Eric Dolendres** (@ericdolendres) - Boxing/MMA\n';
      coachesInfo += '- **Luan Jindani** (@luanjindani) - Boxing Coach\n';
      coachesInfo += '- **Sheraz Qureshi** (@sherazqureshi) - Boxing/MMA\n';
      coachesInfo += '- **Melchor Espinosa** (@melchorespinosa) - Boxing Coach\n\n';
    }

    // System prompt to make the AI knowledgeable about martial arts and FIST gym
    const systemPrompt = `You are a knowledgeable martial arts assistant for FIST GYM/SENJITSU, a premier martial arts facility located in Quezon City, Philippines that offers comprehensive training in multiple disciplines.

🚨 **IMPORTANT RESTRICTIONS:**
- You MUST ONLY respond to questions related to FIST GYM/SENJITSU, martial arts, our classes, coaches, schedules, membership, booking, and gym services
- DO NOT answer questions about other topics like general knowledge, other businesses, politics, etc.
- If asked about non-gym topics, politely redirect to gym-related questions

🏢 **GYM INFORMATION:**
- **Name**: FIST GYM (Fitness and Self-Defense Techniques) / SENJITSU
- **Location**: Suite 301, Gil-Preciosa Bldg. 2, 75 Timog Avenue, Quezon City, Philippines  
- **Contact**: 📞 0956 092 8153 | 📧 fist@fistgym.com.ph
- **Motto**: "Your journey to martial arts excellence starts here"

${coachesInfo}

🥋 **OUR MARTIAL ARTS PROGRAMS:**
- **Boxing**: Traditional Western boxing focusing on punches, footwork, and head movement (₱500/session)
- **Muay Thai**: "The Art of Eight Limbs" - Thai kickboxing using fists, elbows, knees, and shins (₱500/session)  
- **Brazilian Jiu Jitsu (BJJ)**: Ground fighting and submission grappling art
  - Adults Classes (₱600/session)
  - Kids Classes (₱400/session)
- **Judo**: Japanese throwing and grappling martial art (₱450/session)
- **Kali/Escrima**: Filipino martial arts focusing on weapon and empty-hand techniques (₱450/session)
- **MMA (Mixed Martial Arts)**: Combining multiple fighting disciplines (₱450/session)
- **Wrestling**: Grappling sport focusing on takedowns and ground control (₱400/session)

💰 **MEMBERSHIP BENEFITS (₱1,000/month):**
- **₱100 OFF** on every class booking (members pay less for each session!)
- **Access to EXCLUSIVE PACKAGE DEALS** with huge savings
- **Priority booking** for popular time slots
- **Member-only rates** and special promotions

🎁 **EXCLUSIVE MEMBER PACKAGE DEALS:**
- **Boxing Package**: 10 sessions for ₱2,500 (Save ₱2,500! Regular: ₱5,000)
- **Muay Thai Package**: 10 sessions for ₱3,000 (Save ₱2,000! Regular: ₱5,000)
- **BJJ Adults Package**: 12 sessions for ₱2,500 (Save ₱4,700! Regular: ₱7,200)
- **BJJ Kids Package**: 4 sessions for ₱1,600 (Save ₱0! Regular: ₱1,600)
- **Judo Package**: 4 sessions for ₱1,600 (Save ₱200! Regular: ₱1,800)
- **Kali Package**: 4 sessions for ₱1,400 (Save ₱400! Regular: ₱1,800)
- **MMA Package**: 4 sessions for ₱1,400 (Save ₱400! Regular: ₱1,800)
- **Wrestling Package**: 4 sessions for ₱1,600 (Save ₱0! Regular: ₱1,600)

💪 **WHAT MAKES FIST GYM SPECIAL:**
- Located in the heart of Quezon City for easy access
- Expert coaches with professional backgrounds
- Complete training facilities and equipment
- Welcoming community for all skill levels
- Both recreational and competitive training
- Kids and adult programs available
- Flexible class schedules

📱 **HOW TO BOOK CLASSES ON OUR WEBSITE:**

**STEP 1: CREATE ACCOUNT & LOGIN**
- Visit our website and create an account
- Login with your username and password
- Complete your profile information

**STEP 2: NAVIGATE TO SCHEDULES**
- Go to the "Schedules" section on our website
- You'll see all available coaches and their time slots
- Each coach specializes in different martial arts

**STEP 3: CHOOSE YOUR CLASS**
- Browse available time slots by coach
- Select your preferred martial art (Boxing, Muay Thai, BJJ, etc.)
- Pick a date and time that works for you
- Check if the slot is available (green = available, red = booked)

**STEP 4: BOOK YOUR SLOT**
- Click on an available time slot
- Confirm your booking details
- You'll be prompted to make payment

**STEP 5: PAYMENT PROCESS**
- Scan the GCash QR code provided
- Pay the class fee (₱400-₱600 depending on class)
- **MEMBERS get ₱100 OFF every class!**
- Upload a screenshot of your payment as proof
- Accept the terms and conditions

**STEP 6: CONFIRMATION**
- Wait for admin approval (usually within a few hours)
- You'll receive confirmation once payment is verified
- Your booking will appear in "My Bookings" section

**FOR MEMBERS: PACKAGE DEALS**
- Members can access exclusive package deals
- Book multiple sessions at discounted rates
- Save up to ₱4,700 with our packages!
- Same booking process but select "Package Deal" option

**IMPORTANT POLICIES:**
- ⏰ **Punctuality**: Late arrivals reduce your session time
- 💰 **Non-refundable**: All payments are final once approved
- 📱 **GCash only**: We only accept GCash payments
- ✅ **Confirmation required**: Booking confirmed after payment verification

Always be encouraging, informative, and supportive. For immediate assistance with bookings or technical issues, direct them to contact FIST GYM directly at 0956 092 8153 or visit the gym at Timog Avenue, Quezon City.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user", 
          content: message
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('Error in chatbot endpoint:', error);
    
    // Handle quota exceeded error with helpful fallback
    if (error.message.includes('429') || error.message.includes('quota')) {
      return res.json({
        success: true,
        response: "I'm currently experiencing high demand! While I work on getting back online, here are some quick martial arts tips from FIST GYM:\n\n🥊 **Boxing**: Focus on proper stance and footwork\n🥋 **Muay Thai**: Practice your kicks on heavy bags\n🤼 **BJJ**: Work on your guard game and submissions\n🥋 **Judo**: Master your throws and balance\n⚔️ **Kali**: Train with sticks and empty hand techniques\n🥊 **MMA**: Combine striking and grappling\n🤼 **Wrestling**: Focus on takedowns and ground control\n\n💰 **SPECIAL OFFERS**:\n• Membership: ₱1,000/month (₱100 OFF every class!)\n• Package Deals: Up to ₱4,700 savings for members!\n• Boxing Package: 10 sessions for ₱2,500 (Save ₱2,500!)\n\n📍 **Visit FIST GYM**: Suite 301, Gil-Preciosa Bldg. 2, Timog Avenue, Quezon City\n📞 **Contact**: 0956 092 8153 | 📧 fist@fistgym.com.ph"
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to get AI response. Please try again.'
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// Function to sync payment status from payments collection to users.bookings
const syncPaymentStatusToUserBookings = async () => {
    try {
        console.log('🔄 Syncing payment status from payments to user bookings...');
        
        // 🔥 OPTIMIZATION: Only get recent verified payments (last 7 days) to avoid timeout
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const verifiedPayments = await Payment.find({ 
            status: 'verified',
            verificationDate: { $gte: sevenDaysAgo }
        }).limit(50); // Limit to 50 recent payments per sync
        
        console.log(`📊 Found ${verifiedPayments.length} recent verified payments to sync`);
        
        for (const payment of verifiedPayments) {
            try {
                // Find the user and update their booking (with timeout)
                const user = await User.findOne({ 
                    'bookings': {
                        $elemMatch: {
                            coachId: payment.coachId,
                            date: payment.date,
                            time: payment.time
                        }
                    }
                }).maxTimeMS(5000); // 5 second timeout
            
                if (user) {
                    // Update the specific booking's payment status
                    let hasUpdates = false;
                    user.bookings.forEach(booking => {
                        if (booking.coachId === payment.coachId && 
                            booking.date === payment.date && 
                            booking.time === payment.time) {
                            
                                                          if (booking.paymentStatus !== 'verified') {
                                  booking.paymentStatus = 'verified';
                                  booking.paymentProof = 'Image deleted after verification for storage optimization'; // 🚀 Clear image in sync too
                                  booking.paymentDate = payment.paymentDate;
                                  booking.verifiedBy = payment.verifiedBy;
                                booking.verificationDate = payment.verificationDate;
                                hasUpdates = true;
                                console.log(`✅ Updated payment status for ${user.username}: ${booking.coachName} (${booking.date})`);
                            }
                        }
                    });
                    
                    if (hasUpdates) {
                        user.markModified('bookings');
                        await user.save({ timeout: 5000 }); // 5 second timeout for save
                    }
                }
            } catch (paymentError) {
                console.error(`⚠️ Error syncing payment ${payment._id}:`, paymentError.message);
                // Continue with next payment instead of crashing entire sync
            }
        }
        
        console.log('🔄 Payment status sync completed');
    } catch (error) {
        console.error('❌ Error syncing payment status:', error);
    }
};

// ... existing code ...
// Coach manually moves a booking to history (for fallback/manual completion)
app.post('/api/coach/move-booking-to-history', async (req, res) => {
    try {
        const { userId, coachId, date, time, class: className } = req.body;
        if (!userId || !coachId || !date || !time || !className) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        // Find the user
        const user = await User.findOne({ username: userId });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        // Find the booking in user's bookings
        const bookingIdx = user.bookings.findIndex(b => b.coachId === coachId && b.date === date && b.time === time && b.class === className);
        if (bookingIdx === -1) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }
        const booking = user.bookings[bookingIdx];

        // Remove from bookings and add to bookingHistory
        user.bookings.splice(bookingIdx, 1);
        user.bookingHistory = user.bookingHistory || [];
        user.bookingHistory.push({
            coachId: booking.coachId,
            coachName: booking.coachName,
            date: booking.date,
            time: booking.time,
            class: booking.class,
            paymentStatus: booking.paymentStatus,
            completedAt: new Date(),
            attendanceStatus: 'completed'
        });
        await user.save();

        // Add to coach's classHistory
        const coach = await Coach.findById(coachId);
        if (coach) {
            coach.classHistory = coach.classHistory || [];
            coach.classHistory.push({
                studentId: user._id.toString(),
                studentName: `${user.firstname} ${user.lastname}`,
                date: booking.date,
                time: booking.time,
                class: booking.class,
                completedAt: new Date(),
                attendanceStatus: 'completed'
            });
            await coach.save();
        }

        res.json({ success: true, message: 'Booking moved to history.' });
    } catch (error) {
        console.error('Error moving booking to history:', error);
        res.status(500).json({ success: false, error: 'Server error.' });
    }
});
// ... existing code ...



// Manual booking completion endpoint for coaches
app.post('/api/bookings/:id/complete', async (req, res) => {
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
});

// REMOVED: Duplicate coach verification email endpoint with boxing glove emoji
// This was causing duplicate emails to be sent
