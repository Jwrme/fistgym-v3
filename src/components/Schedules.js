import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../designs/schedules.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Utility function to check if a class is a group class
function isGroupClass(classType) {
    if (!classType) return false;
    const groupClassList = [
        'jiu jitsu adults',
        'jiu jitsu kids',
        'judo',
        'wrestling',
        'kali'
    ];
    return groupClassList.some(gc => classType.toLowerCase().includes(gc));
}

const SLOTS_PER_PAGE = 6;
const BOOKINGS_PER_PAGE = 10;
const COACH_BOOKINGS_PER_PAGE = 3; // Show latest 3 coach bookings per page
const HISTORY_PER_PAGE = 5; // Show latest 5 history items per page
const itemsPerPage = 5; // Define itemsPerPage at the top of the component

const Schedules = () => {
    const [userType, setUserType] = useState(null);
    const [isInitializing, setIsInitializing] = useState(true);
    const [user, setUser] = useState(null);
    const [coachId, setCoachId] = useState(null);
    const [selectedAvailabilities, setSelectedAvailabilities] = useState([]);
    const [availabilityMessage, setAvailabilityMessage] = useState('');
    const [allAvailabilities, setAllAvailabilities] = useState([]);
    const [coaches, setCoaches] = useState([]);
    const [loading, setLoading] = useState(false); // Changed to false initially
    const [dateTime, setDateTime] = useState(null); // for new selection
    const [bookingMessage, setBookingMessage] = useState('');
    const [userBookings, setUserBookings] = useState([]);
    const [coachBookings, setCoachBookings] = useState([]);
    const [coachClassHistory, setCoachClassHistory] = useState([]);
    const [showCoachHistory, setShowCoachHistory] = useState(false);
    const [openClass, setOpenClass] = useState(null);
    const [boxingGenLoading, setBoxingGenLoading] = useState(false);
    const [boxingGenMsg, setBoxingGenMsg] = useState('');
    const [muayThaiGenLoading, setMuayThaiGenLoading] = useState(false);
    const [muayThaiGenMsg, setMuayThaiGenMsg] = useState('');
    const [jiuJitsuAdultsGenLoading, setJiuJitsuAdultsGenLoading] = useState(false);
    const [jiuJitsuAdultsGenMsg, setJiuJitsuAdultsGenMsg] = useState('');
    const [jiuJitsuKidsGenLoading, setJiuJitsuKidsGenLoading] = useState(false);
    const [jiuJitsuKidsGenMsg, setJiuJitsuKidsGenMsg] = useState('');
    const [judoGenLoading, setJudoGenLoading] = useState(false);
    const [judoGenMsg, setJudoGenMsg] = useState('');
    const [kaliGenLoading, setKaliGenLoading] = useState(false);
    const [kaliGenMsg, setKaliGenMsg] = useState('');
    const [mmaGenLoading, setMmaGenLoading] = useState(false);
    const [mmaGenMsg, setMmaGenMsg] = useState('');
    const [wrestlingGenLoading, setWrestlingGenLoading] = useState(false);
    const [wrestlingGenMsg, setWrestlingGenMsg] = useState('');
    const [slotPages, setSlotPages] = useState({});
    const [filteredSchedules, setFilteredSchedules] = useState([]);
    const [paymentProof, setPaymentProof] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [selectedCoach, setSelectedCoach] = useState(null);
    const [adminSelectedClass, setAdminSelectedClass] = useState('Boxing');
    const [pendingBooking, setPendingBooking] = useState(null);
    const [showBookingConfirm, setShowBookingConfirm] = useState(false);
    const [pendingCancel, setPendingCancel] = useState(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState({});
    const [bookingHistory, setBookingHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [allUserBookings, setAllUserBookings] = useState([]); // All bookings from all users for Boxing/Muay Thai/MMA
    // Pagination state for bookings and history
    const [bookingsPage, setBookingsPage] = useState(1);
    const [coachBookingsPage, setCoachBookingsPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const [membershipApproved, setMembershipApproved] = useState(false);
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [selectedPackageClass, setSelectedPackageClass] = useState(null);
    const [packageBookings, setPackageBookings] = useState([]);
    const [packageCoachLock, setPackageCoachLock] = useState(null);
    const [showClassModal, setShowClassModal] = useState(false);
    const [selectedClassForModal, setSelectedClassForModal] = useState(null);
    const [packageStep, setPackageStep] = useState(1); // 1: coach selection, 2: schedule selection
    const [selectedPackageCoach, setSelectedPackageCoach] = useState(null);
    // Guest filter state
    const [guestClassFilter, setGuestClassFilter] = useState('All');
    // NEW: State for current selected class (On-Demand loading)
    const [currentSelectedClass, setCurrentSelectedClass] = useState(null);
    const [classLoading, setClassLoading] = useState(false);
    const [paymentSettings, setPaymentSettings] = useState({ 
        classRates: {
            'Boxing': 500,
            'Muay Thai': 500,
            'Kali': 450,
            'Jiu Jitsu Adults': 600,
            'Jiu Jitsu Kids': 400,
            'MMA': 450,
            'Judo': 450,
            'Wrestling': 400
        },
        classQrCodes: {
            'Boxing': '/images/gcashqr.png',
            'Muay Thai': '/images/gcashqr.png',
            'Kali': '/images/gcashqr.png',
            'Jiu Jitsu Adults': '/images/gcashqr.png',
            'Jiu Jitsu Kids': '/images/gcashqr.png',
            'MMA': '/images/gcashqr.png',
            'Judo': '/images/gcashqr.png',
            'Wrestling': '/images/gcashqr.png'
        },
        classMembershipQrCodes: {
            'Boxing': '/images/gcashqr.png',
            'Muay Thai': '/images/gcashqr.png',
            'Kali': '/images/gcashqr.png',
            'Jiu Jitsu Adults': '/images/gcashqr.png',
            'Jiu Jitsu Kids': '/images/gcashqr.png',
            'MMA': '/images/gcashqr.png',
            'Judo': '/images/gcashqr.png',
            'Wrestling': '/images/gcashqr.png'
        },
        classPackageQrCodes: {
            'Boxing': '/images/gcashqr.png',
            'Muay Thai': '/images/gcashqr.png',
            'Kali': '/images/gcashqr.png',
            'Jiu Jitsu Adults': '/images/gcashqr.png',
            'Jiu Jitsu Kids': '/images/gcashqr.png',
            'MMA': '/images/gcashqr.png',
            'Judo': '/images/gcashqr.png',
            'Wrestling': '/images/gcashqr.png'
        },
        membershipRate: 1000,
        membershipQrCode: '/images/gcashqr.png' 
    });

    // Image Modal State (for viewing QR codes in full size)
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState('');

    // Terms and Conditions acceptance state
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [acceptPackageTerms, setAcceptPackageTerms] = useState(false);

    const [moveSuccessMsg, setMoveSuccessMsg] = useState('');

    // 🚀 CACHING STATES: For lazy loading and performance optimization
    const [coachesCache, setCoachesCache] = useState(null);
    const [cacheTimestamp, setCacheTimestamp] = useState(0);
    const [classAvailabilityCache, setClassAvailabilityCache] = useState({}); // Cache per class
    const [loadedClasses, setLoadedClasses] = useState(new Set()); // Track which classes have been loaded

    // Cache settings
    const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
    const CACHE_KEY_PREFIX = 'schedules_cache_';

    // Check if cache is still valid
    const isCacheValid = () => {
        return coachesCache && (Date.now() - cacheTimestamp) < CACHE_EXPIRY;
    };

    // Check if class data is cached
    const isClassCached = (classType) => {
        return classAvailabilityCache[classType] && isCacheValid();
    };

    const handleImageClick = (imageUrl) => {
        setSelectedImage(imageUrl);
        setShowImageModal(true);
    };

    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImage('');
    };

    // Get membership packages from payment settings (dynamic pricing)
    const membershipPackages = paymentSettings.packagePricing || {
        'Judo': { sessions: 4, price: 1600 },
        'Boxing': { sessions: 10, price: 2500 },
        'Muay Thai': { sessions: 10, price: 3000 },
        'Wrestling': { sessions: 4, price: 1600 },
        'Jiu Jitsu Adults': { sessions: 12, price: 2500 },
        'Kali': { sessions: 4, price: 1400 },
        'Jiu Jitsu Kids': { sessions: 4, price: 1600 }
    };
    const navigate = useNavigate();

    // Define available class types
    const classTypes = ['Boxing', 'Muay Thai', 'Kali', 'Jiu Jitsu Adults', 'Jiu Jitsu Kids', 'MMA', 'Judo', 'Wrestling'];

    // User is now managed via state instead of direct localStorage access

    // Filter function for guest view
    const filterCoachesByClass = (availabilities, filterClass) => {
        if (filterClass === 'All') return availabilities;
        
        return availabilities.filter(avail => {
            const coach = avail.coach;
            if (!coach) return false;
            
            // Check if coach has the specialty or has available slots for the class
            const hasSpecialty = coach.specialties && coach.specialties.some(
                spec => spec.toLowerCase().includes(filterClass.toLowerCase())
            );
            
            const hasAvailableSlots = avail.availability && avail.availability.some(
                slot => slot.class && slot.class.toLowerCase().includes(filterClass.toLowerCase())
            );
            
            return hasSpecialty || hasAvailableSlots;
        });
    };

    // Fetch payment settings
    const fetchPaymentSettings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/payment-settings');
            const data = await response.json();
            setPaymentSettings(data);
        } catch (error) {
            console.error('Error fetching payment settings:', error);
        }
    };

    // Add function to fetch payment status
    const fetchPaymentStatus = async () => {
        if (!user || !user.username) return;
        
        try {
            const response = await fetch(`http://localhost:3001/api/user/${user.username}/payment-status`);
            const data = await response.json();
            if (data.success) {
                setPaymentStatus(data.paymentStatus);
            }
        } catch (error) {
            console.error('Error fetching payment status:', error);
        }
    };

    // Add function to fetch booking history
    const fetchBookingHistory = async () => {
        if (!user || !user.username) return;
        
        try {
            const response = await fetch(`http://localhost:3001/api/users/${user.username}/booking-history`);
            const data = await response.json();
            if (data.success) {
                setBookingHistory(data.bookingHistory);
            }
        } catch (error) {
            console.error('Error fetching booking history:', error);
        }
    };

    // Add function to fetch all user bookings for Boxing, Muay Thai, and MMA (one-on-one classes)
    const fetchAllUserBookings = async () => {
        const DEBUG_MODE = process.env.NODE_ENV === 'development';
        try {
            if (DEBUG_MODE) {
                console.log('🔄 [FRONTEND] Fetching all user bookings for 1-on-1 classes...');
            }
            const response = await fetch('http://localhost:3001/api/all-bookings/boxing-muaythai');
            const data = await response.json();
            if (data.success) {
                if (DEBUG_MODE) {
                    console.log(`✅ [FRONTEND] Fetched ${data.bookings.length} bookings:`, data.bookings);
                }
                setAllUserBookings(data.bookings || []);
            } else {
                console.error('❌ [FRONTEND] Failed to fetch bookings:', data);
                setAllUserBookings([]);
            }
        } catch (error) {
            console.error('❌ [FRONTEND] Error fetching all user bookings:', error);
            setAllUserBookings([]);
        }
    };

    // Add function to fetch coach class history
    const fetchCoachClassHistory = async (coachId) => {
        if (!coachId) return;
        
        try {
            const response = await fetch(`http://localhost:3001/api/coach/${coachId}/class-history`);
            const data = await response.json();
            setCoachClassHistory(data);
        } catch (error) {
            console.error('Error fetching coach class history:', error);
        }
    };

    // Fetch membership status for user
    const fetchMembershipStatus = async () => {
        if (user && (user._id || user.username)) {
            try {
                console.log('🔍 [MEMBERSHIP CHECK] Checking membership for user:', user.username || user._id);
                const res = await fetch(`http://localhost:3001/api/membership-application/status?userId=${user._id || user.username}`);
                const data = await res.json();
                console.log('🔍 [MEMBERSHIP CHECK] Response data:', data);
                
                if (
                    data.success &&
                    data.application &&
                    data.application.status &&
                    data.application.status.toLowerCase() === 'approved' &&
                    data.application.expirationDate &&
                    new Date(data.application.expirationDate) > new Date()
                ) {
                    console.log('✅ [MEMBERSHIP CHECK] User has active membership!');
                    setMembershipApproved(true);
                } else {
                    console.log('❌ [MEMBERSHIP CHECK] User does NOT have active membership:', {
                        success: data.success,
                        hasApplication: !!data.application,
                        status: data.application?.status,
                        expirationDate: data.application?.expirationDate,
                        isExpired: data.application?.expirationDate ? new Date(data.application.expirationDate) <= new Date() : 'N/A'
                    });
                    setMembershipApproved(false);
                }
            } catch (error) {
                console.error('❌ [MEMBERSHIP CHECK] Error fetching membership status:', error);
                setMembershipApproved(false);
            }
        } else {
            console.log('❌ [MEMBERSHIP CHECK] No user data available');
            setMembershipApproved(false);
        }
    };

    // Handle opening class modal with instant modal and background loading
    const handleClassClick = (classType) => {
        setSelectedClassForModal(classType);
        setShowClassModal(true); // Show modal instantly
        if (currentSelectedClass !== classType || allAvailabilities.length === 0) {
            fetchAvailabilitiesByClass(classType); // Fetch in background
        }
    };

    // Add handleBookSlot function
    const handleBookSlot = async (coach, slot) => {
        if (!coach || !coach._id) return;
        setBookingMessage('');

        const now = new Date();
        let slotDateTime = new Date(slot.date);
        if (slot.time) {
            let timeStr = slot.time.split('to')[0].trim();
            let [time, ampm] = timeStr.split(' ');
            let [hour, minute] = time.split(':').map(Number);
            if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
            slotDateTime.setHours(hour, minute, 0, 0);
        }
        if (slotDateTime < now) {
            setBookingMessage('Cannot book a past date/time.');
            return;
        }

        if (isSlotBooked(coach._id, slot.date, slot.time, slot.class || openClass)) {
            const classType = slot.class || openClass;
            if (classType && (classType.toLowerCase() === 'boxing' || classType.toLowerCase() === 'muay thai' || classType.toLowerCase() === 'mma')) {
                setBookingMessage('This slot is already fully booked by another client.');
            } else {
                setBookingMessage('You have already booked this slot.');
            }
            return;
        }

        // Add booking as unpaid (no payment modal yet)
        const newBooking = {
            coachId: coach._id,
            coachName: `${coach.firstname} ${coach.lastname}`,
            date: slot.date,
            time: slot.time,
            class: slot.class || openClass,
            paymentStatus: 'unpaid',
            paymentProof: null
        };

        try {
            const res = await fetch('http://localhost:3001/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.username,
                    booking: newBooking
                })
            });
            const data = await res.json();
            if (data.success) {
                setUserBookings(prev => [...prev, newBooking]);
                setBookingMessage('Booking added. Please pay to confirm.');
                // Refresh current class data if available
                if (currentSelectedClass) {
                    await fetchAvailabilitiesByClass(currentSelectedClass);
                }
                fetchAllUserBookings(); // Refresh all bookings for one-on-one check
            } else {
                setBookingMessage(data.error || 'Booking failed.');
            }
        } catch (err) {
            setBookingMessage('Server error.');
        }
    };

    // Handle package booking for members
    const handlePackageBooking = (classType) => {
        console.log('🔍 handlePackageBooking called for:', classType);
        console.log('🔍 membershipApproved:', membershipApproved);
        console.log('🔍 user object:', user);
        
        if (!membershipApproved) {
            setBookingMessage('Package booking is only available for members with active membership.');
            return;
        }

        if (!membershipPackages[classType]) {
            setBookingMessage('No package available for this class type.');
            return;
        }

        setSelectedPackageClass(classType);
        setPackageStep(1); // Start with coach selection
        setSelectedPackageCoach(null);
        setPackageBookings([]);
        setShowPackageModal(true);
    };

    // Process package payment and create multiple bookings
    const handlePackagePayment = async (paymentProof) => {
        if (!selectedPackageClass || !membershipPackages[selectedPackageClass] || !paymentProof) return;

        if (!acceptPackageTerms) {
            setBookingMessage('Please accept the terms and conditions to proceed with payment.');
            return;
        }

        const packageInfo = membershipPackages[selectedPackageClass];
        const classAvailabilities = groupedAvailabilities[selectedPackageClass] || [];
        
        if (classAvailabilities.length === 0) {
            setBookingMessage('No available schedules for this class type.');
            return;
        }

        if (packageBookings.length === 0) {
            setBookingMessage('Please select at least one schedule to book.');
            return;
        }

        if (packageBookings.length > packageInfo.sessions) {
            setBookingMessage(`You can only book up to ${packageInfo.sessions} sessions in this package.`);
            return;
        }

        try {
            // Create package booking with special package flag
            const packageBookingData = {
                userId: user.username, // Always use username for consistency
                packageType: selectedPackageClass,
                packageSessions: packageInfo.sessions,
                packagePrice: packageInfo.price,
                bookings: packageBookings,
                paymentProof: paymentProof,
                isPackage: true
            };

            console.log('🚀 Sending package booking data:', packageBookingData);
            console.log('🚀 Using userId:', user.username);

            console.log('🚀 [PACKAGE BOOKING] Making request to /api/book-package...');
            const res = await fetch('http://localhost:3001/api/book-package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(packageBookingData)
            });
            
            console.log('📨 [PACKAGE BOOKING] Response status:', res.status);
            console.log('📨 [PACKAGE BOOKING] Response headers:', Object.fromEntries(res.headers.entries()));
            
            const data = await res.json();
            console.log('📨 [PACKAGE BOOKING] Response data:', data);
            if (data.success) {
                // Add all package bookings to user bookings
                setUserBookings(prev => [...prev, ...packageBookings.map(booking => ({
                    ...booking,
                    paymentStatus: 'pending',
                    isPackage: true,
                    packageType: selectedPackageClass
                }))]);
                
                setBookingMessage(`Package booking submitted for ${selectedPackageClass}! ${packageBookings.length} sessions booked for ₱${packageInfo.price}. Please wait for payment verification.`);
                setShowPackageModal(false);
                setSelectedPackageClass(null);
                setPackageBookings([]);
                setAcceptPackageTerms(false);
                // Refresh current class data if available
                if (currentSelectedClass) {
                    await fetchAvailabilitiesByClass(currentSelectedClass);
                }
                fetchAllUserBookings();
            } else {
                setBookingMessage(data.error || 'Package booking failed.');
            }
        } catch (err) {
            console.error('🚨 Package booking error:', err);
            if (err.response) {
                console.error('🚨 Response status:', err.response.status);
                console.error('🚨 Response data:', err.response.data);
                setBookingMessage(`Package booking failed: ${err.response.data?.error || err.response.statusText}`);
            } else if (err.request) {
                console.error('🚨 Request failed:', err.request);
                setBookingMessage('Network error: Could not connect to server. Please check if the backend is running.');
            } else {
                console.error('🚨 Error message:', err.message);
                setBookingMessage(`Error: ${err.message}`);
            }
        }
    };

    // Helper: check if slot is already booked by user or other users (for one-on-one classes)
    // Helper function to check if two time ranges overlap (frontend version)
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

    const isSlotBooked = (coachId, date, time, classType) => {
        const DEBUG_MODE = process.env.NODE_ENV === 'development';
        if (!coachId) return false;
        
        if (DEBUG_MODE) {
            console.log(`🔍 [FRONTEND isSlotBooked] Checking:`);
            console.log(`   - CoachId: ${coachId}`);
            console.log(`   - Date: ${date}`);
            console.log(`   - Time: ${time}`);
            console.log(`   - ClassType: ${classType}`);
        }
        
        // Check if this is a group class (unlimited capacity per time slot)
        const isGroup = isGroupClass(classType);
        
        // Define one-on-one classes (exclusive time slots)
        const oneOnOneClasses = ['boxing', 'muay thai', 'mma'];
        const isOneOnOneClass = classType && oneOnOneClasses.some(oc => classType.toLowerCase().includes(oc));
        
        if (DEBUG_MODE) {
            console.log(`📋 [FRONTEND] Class type analysis:`);
            console.log(`   - Is Group Class: ${isGroupClass}`);
            console.log(`   - Is One-on-One Class: ${isOneOnOneClass}`);
        }
        
        if (isOneOnOneClass) {
            // ONE-ON-ONE CLASSES: Check if ANY user has booked this coach at this exact time
            if (DEBUG_MODE) {
                console.log(`🥊 [FRONTEND ONE-ON-ONE] Checking if coach is available for exclusive session...`);
            }
            
            const isCoachBusy = allUserBookings.some(b => {
                const matchesBasic = b.coachId === coachId && b.date === date && b.time === time;
                const hasValidPayment = b.paymentStatus && ['verified', 'pending', 'unpaid'].includes(b.paymentStatus);
                
                if (matchesBasic && hasValidPayment) {
                    if (DEBUG_MODE) {
                        console.log(`❌ [FRONTEND ONE-ON-ONE] Coach is busy with another client:`, {
                            coachId: b.coachId,
                            date: b.date,
                            time: b.time,
                            class: b.class,
                            clientId: b.userId
                        });
                    }
                    return true;
                }
                return false;
            });
            
            return isCoachBusy;
        }
        
        if (isGroupClass) {
            // GROUP CLASSES: Only check if CURRENT USER already booked this specific slot
            if (DEBUG_MODE) {
                console.log(`👥 [FRONTEND GROUP CLASS] Checking if current user already booked this slot...`);
            }
            
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const currentUserId = currentUser._id;
            
            const userAlreadyBooked = userBookings.some(b => {
                const matchesCoach = b.coachId === coachId;
                const matchesDate = b.date === date;
                const matchesTime = b.time === time;
                const matchesClass = (b.class || '').toLowerCase() === classType.toLowerCase();
                
                // Only prevent booking if it's the EXACT same coach, date, time, and class
                const exactMatch = matchesCoach && matchesDate && matchesTime && matchesClass;
                
                if (DEBUG_MODE) {
                    console.log(`🔍 [FRONTEND GROUP CLASS] Checking booking:`, {
                        bookingCoachId: b.coachId,
                        requestedCoachId: coachId,
                        bookingDate: b.date,
                        requestedDate: date,
                        bookingTime: b.time,
                        requestedTime: time,
                        bookingClass: b.class,
                        requestedClass: classType,
                        matchesCoach,
                        matchesDate,
                        matchesTime,
                        matchesClass,
                        exactMatch
                    });
                }
                
                if (exactMatch) {
                    if (DEBUG_MODE) {
                        console.log(`✋ [FRONTEND GROUP CLASS] User already booked this EXACT slot with SAME coach:`, {
                            coachId: b.coachId,
                            date: b.date,
                            time: b.time,
                            class: b.class
                        });
                    }
                    return true;
                }
                return false;
            });
            
            return userAlreadyBooked;
        }
        
        // FALLBACK: For any unknown class types, treat as one-on-one
        if (DEBUG_MODE) {
            console.log(`⚠️ [FRONTEND FALLBACK] Unknown class type, treating as one-on-one`);
        }
        
        return allUserBookings.some(b => {
            return b.coachId === coachId && b.date === date && b.time === time &&
                   b.paymentStatus && ['verified', 'pending', 'unpaid'].includes(b.paymentStatus);
        });
    };

    // NEW: Get booking count for group classes
    const getBookingCount = (coachId, date, time, classType) => {
        if (!classType || !allUserBookings) return 0;
        
        // Only show count for group classes
        const isGroup = isGroupClass(classType);
        
        if (!isGroup) return 0;
        
        // Count all bookings for this specific slot
        const count = allUserBookings.filter(b => {
            const matchesBasic = b.coachId === coachId && b.date === date && b.time === time;
            const bookedClass = b.class || '';
            const matchesClass = bookedClass.toLowerCase() === classType.toLowerCase();
            const hasValidPayment = b.paymentStatus && ['verified', 'pending', 'unpaid'].includes(b.paymentStatus);
            return matchesBasic && matchesClass && hasValidPayment;
        }).length;
        
        return count;
    };

    // Group availabilities by class type (optimized for on-demand loading)
    const groupedAvailabilities = useMemo(() => {
        const grouped = {};
        
        // If we have a current selected class, populate only that class
        if (currentSelectedClass && allAvailabilities.length > 0) {
            grouped[currentSelectedClass] = allAvailabilities;
            // Initialize other classes as empty arrays
            classTypes.forEach(type => {
                if (type !== currentSelectedClass) {
                    grouped[type] = [];
                }
            });
        } else {
            // Fallback: group all availabilities by class type (for admin view)
        classTypes.forEach(type => {
            grouped[type] = allAvailabilities.filter(avail => {
                const coach = avail.coach;
                // Case-insensitive, partial match for specialties
                return coach && coach.specialties && coach.specialties.some(
                    spec => typeof spec === 'string' && spec.toLowerCase().includes(type.toLowerCase())
                );
            });
        });
        }
        
        return grouped;
    }, [allAvailabilities, classTypes, currentSelectedClass]);

    useEffect(() => {
        const storedUserType = localStorage.getItem('userType');
        const storedUser = JSON.parse(localStorage.getItem('user'));
        
        // Set user state
        setUser(storedUser);
        
        // If userType is not stored but user exists, determine userType based on user data
        let finalUserType = storedUserType;
        if (!finalUserType && storedUser) {
            if (storedUser.isAdmin) {
                finalUserType = 'admin';
            } else if (storedUser.userType === 'coach' || storedUser.role === 'coach') {
                finalUserType = 'coach';
            } else {
                finalUserType = 'user';
            }
            // Store the determined userType
            localStorage.setItem('userType', finalUserType);
        }
        
        setUserType(finalUserType);
        
        // Add a small delay to ensure smooth rendering and prevent flicker
        setTimeout(() => {
            setIsInitializing(false); // Mark initialization as complete
        }, 100);
        
        if (finalUserType === 'coach' && storedUser && storedUser._id) {
            setCoachId(storedUser._id);
            fetchCoachAvailability(storedUser._id);
            // Fetch coach bookings
            fetch(`http://localhost:3001/api/coach/${storedUser._id}/bookings`)
                .then(res => res.json())
                .then(data => setCoachBookings(data));
            // Fetch coach class history
            fetchCoachClassHistory(storedUser._id);
            // Fetch payment settings and membership status for coaches
            fetchPaymentSettings();
        } else if (finalUserType === 'user') {
            // For users, load essential data but not all availabilities (will load on-demand)
            fetchAllUserBookings(); // Fetch all bookings for Boxing/Muay Thai/MMA one-on-one check
            fetchPaymentSettings();
        } else if (finalUserType === 'admin') {
            // For admin, load first class by default
            fetchAvailabilitiesByClass(adminSelectedClass);
            fetchPaymentSettings();
        } else {
            // For guest users, don't load any data initially (will load on-demand when class is selected)
        }
    }, []);

    // Listen for payment settings updates
    useEffect(() => {
        const handlePaymentSettingsUpdated = () => {
            fetchPaymentSettings();
        };
        window.addEventListener('paymentSettingsUpdated', handlePaymentSettingsUpdated);
        return () => {
            window.removeEventListener('paymentSettingsUpdated', handlePaymentSettingsUpdated);
        };
    }, []);

    // Fetch membership status when user state changes
    useEffect(() => {
        if (user && (user._id || user.username)) {
            console.log('🔍 Fetching membership status for user:', user.username);
            fetchMembershipStatus();
        }
    }, [user]);

    // Function to refresh user bookings
    const refreshUserBookings = async () => {
        if (userType === 'user' && user && user.username) {
            try {
                // Clear localStorage to prevent caching issues
                localStorage.removeItem('user');
                
                // Add cache busting parameter
                const res = await fetch(`http://localhost:3001/api/users/${user.username}?cache=${Date.now()}`);
                if (!res.ok) throw new Error('Failed to fetch user data');
                const data = await res.json();
                
                if (data && Array.isArray(data.bookings)) {
                    setUserBookings(data.bookings);
                    localStorage.setItem('user', JSON.stringify(data));
                } else {
                    setUserBookings([]);
                }
            } catch (err) {
                setUserBookings([]);
                console.error('Error refreshing user bookings:', err);
            }
        }
    };

    useEffect(() => {
        if (userType === 'user' && user && user.username) {
            // Use the refresh function to ensure consistent loading with cache busting
            refreshUserBookings();
            
            // Also fetch payment status and booking history
            fetchPaymentStatus();
            fetchBookingHistory();
            fetchAllUserBookings(); // Fetch all bookings for one-on-one check
        }
    }, [userType, user && user.username]);

    // Listen for payment approval events
    useEffect(() => {
        const handlePaymentApproved = (event) => {
            console.log('💰 Payment approval event received:', event.detail);
            if (userType === 'user' && user && user.username === event.detail.username) {
                console.log('🔄 Refreshing bookings after payment approval...');
                refreshUserBookings();
            }
        };
        
        window.addEventListener('paymentApproved', handlePaymentApproved);
        return () => {
            window.removeEventListener('paymentApproved', handlePaymentApproved);
        };
    }, [userType, user]);



    useEffect(() => {
        const socket = new window.WebSocket('ws://localhost:3001');
        socket.onopen = () => {
            console.log('WebSocket connected!');
        };
        socket.onmessage = (event) => {
            console.log('WebSocket message:', event.data);
            
            try {
                const message = JSON.parse(event.data);
                
                // Handle booking history updates
                if (message.type === 'BOOKINGS_MOVED_TO_HISTORY') {
                    console.log('📱 Real-time update: Bookings moved to history!', message.data);
                    
                    // Auto-refresh user bookings and history if user is affected
                    if (user && user.username && message.data.affectedUsers.includes(user.username)) {
                        console.log('🔄 Auto-refreshing your bookings and history...');
                        
                        // Refresh user bookings
                        fetch(`http://localhost:3001/api/users/${user.username}`)
                            .then(res => res.json())
                            .then(data => {
                                if (data && Array.isArray(data.bookings)) {
                                    setUserBookings(data.bookings);
                                    localStorage.setItem('user', JSON.stringify(data));
                                    console.log('✅ Bookings refreshed automatically');
                                }
                            })
                            .catch(err => console.error('Error auto-refreshing bookings:', err));
                        
                        // Also refresh all user bookings for one-on-one check
                        fetchAllUserBookings();
                        
                        // Refresh booking history
                        fetchBookingHistory();
                        console.log('✅ History refreshed automatically');
                        
                        // Refresh all user bookings for one-on-one check
                        fetchAllUserBookings();
                        console.log('✅ All user bookings refreshed automatically');
                    }
                    
                    // Also refresh coach class history if user is a coach
                    if (userType === 'coach' && user && user._id) {
                        console.log('🔄 Auto-refreshing coach class history...');
                        fetchCoachClassHistory(user._id);
                        console.log('✅ Coach class history refreshed automatically');
                    }
                }
            } catch (err) {
                console.error('Error parsing WebSocket message:', err);
            }
        };
        socket.onclose = () => {
            console.log('WebSocket disconnected!');
        };
        socket.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
        return () => {
            socket.close();
        };
    }, [user]);

    // 🚀 CACHE INITIALIZATION & CLEANUP: Load from localStorage and cleanup on unmount
    useEffect(() => {
        // Load cache from localStorage on mount
        const cachedCoaches = localStorage.getItem(CACHE_KEY_PREFIX + 'coaches');
        if (cachedCoaches) {
            try {
                const parsed = JSON.parse(cachedCoaches);
                const age = Date.now() - parsed.timestamp;
                
                if (age < CACHE_EXPIRY) {
                    console.log('📦 Restored coaches cache from localStorage');
                    setCoachesCache(parsed.data);
                    setCacheTimestamp(parsed.timestamp);
                } else {
                    console.log('🗑️ Expired cache found, clearing...');
                    localStorage.removeItem(CACHE_KEY_PREFIX + 'coaches');
                }
            } catch (error) {
                console.error('Error loading cache:', error);
                localStorage.removeItem(CACHE_KEY_PREFIX + 'coaches');
            }
        }
        
        // Optional: Preload popular classes after a short delay (for better UX)
        const timer = setTimeout(() => {
            if (!loading && !classLoading) {
                // Only preload if user is not currently doing anything
                // preloadPopularClasses(); // Uncomment this line to enable preloading
            }
        }, 2000); // 2 second delay
        
        // Cleanup function
        return () => {
            clearTimeout(timer);
            console.log('🧹 Component unmounting, keeping cache for next visit');
            // Don't clear cache on unmount - keep it for next page visit
            // This helps with navigation between pages
        };
    }, []); // Run only once on mount

    // 🚀 OPTIMIZED: Lazy Loading + Caching for class-specific data
    const fetchAvailabilitiesByClass = async (classType) => {
        console.log(`🔍 Loading ${classType} data...`);
        
        // 🚀 INSTANT CACHE CHECK: If data is cached, load instantly!
        if (isClassCached(classType)) {
            console.log(`⚡ INSTANT: Using cached data for ${classType}`);
            setAllAvailabilities(classAvailabilityCache[classType]);
            setCurrentSelectedClass(classType);
            return; // No loading spinner, instant response!
        }
        
        // Show loading only for fresh data
        setClassLoading(true);
        
        try {
            // Get user from localStorage to check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('user'));
            
            // Skip booking status for guests (not logged in) to improve performance
            const skipBookingStatus = !currentUser ? '?skipBookingStatus=true' : '';
            
            let allCoachesData;
            
            // 🚀 STEP 1: Check if we have coaches data cached
            if (isCacheValid()) {
                console.log(`📦 Using cached coaches data`);
                allCoachesData = coachesCache;
            } else {
                console.log(`🌐 Fetching fresh coaches data from API...`);
                
                // Fetch coaches from API
                const res = await fetch(`http://localhost:3001/api/coaches${skipBookingStatus}`);
                allCoachesData = await res.json();
                
                // 🚀 CACHE: Store coaches data with timestamp
                setCoachesCache(allCoachesData);
                setCacheTimestamp(Date.now());
                
                // Optional: Also cache to localStorage for persistence
                localStorage.setItem(CACHE_KEY_PREFIX + 'coaches', JSON.stringify({
                    data: allCoachesData,
                    timestamp: Date.now()
                }));
                
                console.log(`💾 Coaches data cached (${allCoachesData.length} coaches)`);
            }
            
            // 🚀 STEP 2: Filter coaches by specialty (fast frontend filtering)
            const filteredCoaches = allCoachesData.filter(coach => {
                return coach && coach.specialties && coach.specialties.some(
                    spec => typeof spec === 'string' && spec.toLowerCase().includes(classType.toLowerCase())
                );
            });
            
            // 🚀 STEP 3: Filter availability slots by class type
            const availList = filteredCoaches.map(coach => ({
                coach,
                availability: Array.isArray(coach.availability) 
                    ? coach.availability.filter(slot => {
                        // Include slot if it matches the class or is legacy boxing
                        if (!slot.class && classType === 'Boxing') return true; // legacy boxing slot
                        return (slot.class || '').toLowerCase() === classType.toLowerCase();
                    })
                    : []
            }));
            
            // 🚀 STEP 4: Cache the filtered results per class
            setClassAvailabilityCache(prev => ({
                ...prev,
                [classType]: availList
            }));
            
            // Mark this class as loaded
            setLoadedClasses(prev => new Set([...prev, classType]));
            
            // Update UI
            setAllAvailabilities(availList);
            setCurrentSelectedClass(classType);
            setClassLoading(false);
            
            console.log(`✅ ${classType} loaded & cached (${filteredCoaches.length} coaches, ${availList.reduce((total, item) => total + item.availability.length, 0)} slots)`);
            
        } catch (err) {
            console.error('❌ Error fetching availabilities by class:', err);
            setClassLoading(false);
            setAvailabilityMessage('Error loading schedules. Please try again.');
        }
    };

    // 🚀 CACHE MANAGEMENT: Functions to handle cache
    const clearCache = () => {
        console.log('🗑️ Clearing all cache data');
        setCoachesCache(null);
        setCacheTimestamp(0);
        setClassAvailabilityCache({});
        setLoadedClasses(new Set());
        
        // Clear localStorage cache too
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    };

    // 🚀 CACHE STATS: Function to see cache status (for debugging)
    const getCacheStats = () => {
        const stats = {
            coachesLoaded: !!coachesCache,
            cacheAge: coachesCache ? Date.now() - cacheTimestamp : 0,
            cachedClasses: Object.keys(classAvailabilityCache),
            isExpired: !isCacheValid(),
            totalCachedSlots: Object.values(classAvailabilityCache).reduce((total, classList) => 
                total + classList.reduce((subtotal, item) => subtotal + item.availability.length, 0), 0
            )
        };
        console.log('📊 Cache Stats:', stats);
        return stats;
    };

    // 🚀 PRELOAD: Optional function to preload popular classes
    const preloadPopularClasses = async () => {
        const popularClasses = ['Boxing', 'Muay Thai', 'Jiu Jitsu Adults'];
        
        console.log('🔄 Preloading popular classes...');
        for (const classType of popularClasses) {
            if (!isClassCached(classType)) {
                console.log(`🔄 Preloading ${classType}...`);
                await fetchAvailabilitiesByClass(classType);
                // Small delay to prevent overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        console.log('✅ Popular classes preloaded');
    };

    // Fetch all coaches and their availabilities (fallback for admin/coach views)
    const fetchAllAvailabilities = async () => {
        setLoading(true);
        try {
            // Get user from localStorage to check if user is logged in
            const currentUser = JSON.parse(localStorage.getItem('user'));
            
            // Skip booking status for guests (not logged in) to improve performance
            const skipBookingStatus = !currentUser ? '?skipBookingStatus=true' : '';
            
            // Fetch all coaches
            const res = await fetch(`http://localhost:3001/api/coaches${skipBookingStatus}`);
            const data = await res.json();
            // Map to array of { coach, availability }
            const availList = data.map(coach => ({
                coach,
                availability: Array.isArray(coach.availability) ? coach.availability : []
            }));
            setAllAvailabilities(availList);
            setLoading(false);
        } catch (err) {
            setLoading(false);
        }
    };

    // Fetch coach's own availability
    const fetchCoachAvailability = async (coachId) => {
        try {
            // Fetch the coach document directly
            const res = await fetch(`http://localhost:3001/api/coaches/${coachId}`);
            const data = await res.json();
            if (Array.isArray(data.availability) && data.availability.length > 0) {
                const mapped = data.availability.map(d => ({
                    date: d.date,
                    time: d.time,
                    class: d.class
                }));
                setSelectedAvailabilities(mapped);
                console.log('DEBUG: selectedAvailabilities after fetch:', mapped);
            } else {
                setSelectedAvailabilities([]);
            }
        } catch (err) {
            setSelectedAvailabilities([]);
        }
    };

    // Add a new date+time
    const handleAddDateTime = () => {
        if (!dateTime) return;
        const now = new Date();
        if (dateTime < now) {
            setAvailabilityMessage('Cannot select a past date/time.');
            return;
        }
        // Format date and time in PH timezone
        const phDate = dateTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
        const phTime = dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' }); // hh:mm AM/PM
        const exists = selectedAvailabilities.some(av => av.date === phDate && av.time === phTime);
        if (exists) {
            setAvailabilityMessage('Duplicate date and time selected.');
            return;
        }
        setSelectedAvailabilities(prev => [...prev, { date: phDate, time: phTime }]);
        setDateTime(null);
        setAvailabilityMessage('');
    };

    // Remove a date+time
    const handleRemoveDateTime = (dateStr, timeStr) => {
        setSelectedAvailabilities(prev => prev.filter(av => !(av.date === dateStr && av.time === timeStr)));
    };

    // Validate before saving
    const validateAvailability = () => {
        if (!selectedAvailabilities.length) return 'Select at least one date/time.';
        for (const av of selectedAvailabilities) {
            if (!av.time) return 'Please select a time for each date.';
            // Check if the date+time is in the past (PH time)
            const now = new Date();
            const [year, month, day] = av.date.split('-');
            // Parse time (hh:mm AM/PM)
            let [time, ampm] = av.time.split(' ');
            let [hour, minute] = time.split(':').map(Number);
            if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
            if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
            const slotDate = new Date(Number(year), Number(month) - 1, Number(day), hour, minute);
            if (slotDate < now) {
                return 'Cannot select a past date/time.';
            }
        }
        // Prevent duplicate date+time
        const seen = new Set();
        for (const av of selectedAvailabilities) {
            const key = av.date + ' ' + av.time;
            if (seen.has(key)) return 'Duplicate date and time selected.';
            seen.add(key);
        }
        return null;
    };

    // Handle coach setting availability
    const handleSetAvailability = async () => {
        const validationError = validateAvailability();
        if (validationError) {
            setAvailabilityMessage(validationError);
            return;
        }
        if (!coachId) return;
        try {
            // No need to convert, already PH local
            const availability = selectedAvailabilities.map(av => ({ date: av.date, time: av.time }));
            // Log the payload for debugging
            console.log('Payload to backend:', { coachId, availability });
            const res = await fetch(`http://localhost:3001/api/coaches/${coachId}/availability`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ availability })
            });
            const data = await res.json();
            if (data.success) {
                setAvailabilityMessage('Availability updated!');
            } else {
                setAvailabilityMessage(data.error || 'Failed to update availability.');
            }
        } catch (err) {
            setAvailabilityMessage('Server error.');
        }
    };

    // For users and admin: fetch coach names for display
    useEffect(() => {
        if (userType === 'user' || userType === 'admin') {
            fetch('http://localhost:3001/api/coaches')
                .then(res => res.json())
                .then(data => setCoaches(data));
        }
    }, [userType]);

    // Update handleCancelAvailability to handle user booking cancellation via POST /api/book/cancel
    const handleCancelAvailability = async (av) => {
        if (userType === 'user') {
            // User booking cancellation
            try {
                const res = await fetch('http://localhost:3001/api/book/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.username,
                        booking: {
                            coachId: av.coachId,
                            date: av.date,
                            time: av.time
                        }
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setUserBookings(prev => prev.filter(x => !(x.coachId === av.coachId && x.date === av.date && x.time === av.time)));
                    // Refresh current class data if available
                    if (currentSelectedClass) {
                        await fetchAvailabilitiesByClass(currentSelectedClass);
                    }
                    fetchAllUserBookings(); // Refresh all bookings for one-on-one check
                } else {
                    setBookingMessage(data.error || 'Failed to cancel booking.');
                }
            } catch (err) {
                setBookingMessage('Server error.');
            }
            return;
        }
        if (!coachId) return;
        try {
            const res = await fetch(
                `http://localhost:3001/api/availability/${coachId}?date=${encodeURIComponent(av.date)}&time=${encodeURIComponent(av.time)}&class=${encodeURIComponent(av.class || '')}`,
                { method: 'DELETE' }
            );
            const data = await res.json();
            if (data.success) {
                setAvailabilityMessage('Availability cancelled!');
                // Remove from UI
                setSelectedAvailabilities(prev => prev.filter(x =>
                    !(x.date === av.date && x.time === av.time && (x.class || '') === (av.class || ''))
                ));
            } else {
                setAvailabilityMessage(data.error || 'Failed to cancel availability.');
            }
        } catch (err) {
            setAvailabilityMessage('Server error.');
        }
    };

    // Helper to paginate slots
    function paginate(array, page, perPage) {
        const start = (page - 1) * perPage;
        return array.slice(start, start + perPage);
    }

    // Helper to get current page for a coach
    const getSlotPage = (coachId) => slotPages[coachId] || 1;
    const setSlotPage = (coachId, page) => {
        setSlotPages(prev => ({ ...prev, [coachId]: page }));
    };

    // Function to filter out expired schedules
    const filterExpiredSchedules = (schedules) => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10); // 'YYYY-MM-DD'
        return schedules.filter(schedule => {
            const scheduleDate = new Date(schedule.date);
            const scheduleDateStr = schedule.date;
            if (scheduleDateStr < todayStr) {
                // Past date, hide
                return false;
            } else if (scheduleDateStr === todayStr) {
                // Today: check end time
                if (!schedule.time) return true;
                // Assume time format: '7:00 AM - 8:00 AM' or '7:00 AM'
                let endTimeStr = schedule.time.includes('-') ? schedule.time.split('-')[1].trim() : schedule.time;
                let [time, ampm] = endTimeStr.split(' ');
                let [hour, minute] = time.split(':').map(Number);
                if (ampm && ampm.toLowerCase() === 'pm' && hour !== 12) hour += 12;
                if (ampm && ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
                const slotEnd = new Date(schedule.date);
                slotEnd.setHours(hour, minute, 0, 0);
                return slotEnd > now;
            } else {
                // Future date, always show
                return true;
            }
        });
    };

    // Update schedules every minute
    useEffect(() => {
        const updateSchedules = () => {
            // Filter coach availabilities
            if (allAvailabilities.length > 0) {
                const filtered = allAvailabilities.map(avail => ({
                    ...avail,
                    availability: filterExpiredSchedules(avail.availability)
                }));
                setAllAvailabilities(filtered);
            }
            
            // Filter selected availabilities
            if (selectedAvailabilities.length > 0) {
                setSelectedAvailabilities(filterExpiredSchedules(selectedAvailabilities));
            }
            
            // Filter user bookings
            if (userBookings.length > 0) {
                setUserBookings(filterExpiredSchedules(userBookings));
            }
            
            // Filter coach bookings
            if (coachBookings.length > 0) {
                setCoachBookings(filterExpiredSchedules(coachBookings));
            }
        };

        // Initial update
        updateSchedules();

        // Set up interval for real-time updates
        const interval = setInterval(updateSchedules, 60000); // Update every minute

        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, []);

    // Show loading state while initializing to prevent flicker
    if (isInitializing) {
        return (
            <div style={{ 
                background: '#fff', 
                minHeight: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '18px',
                color: '#145a32'
            }}>
                <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #e3e3e3',
                    borderTop: '4px solid #2ecc40',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                }}></div>
                <div>Loading schedules...</div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // No user logged in: show only Coaches & Schedules (read-only, no booking/cancel buttons)
    if (!user) {
        return (
            <div style={{ background: '#fff', minHeight: '100vh' }}>
                <section className="hero" style={{
                    background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
                }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', borderLeft: '6px solid #2ecc40', paddingLeft: 16 }}>Coaches & Schedules</h1>
                </section>
                <main className="schedules-main">
                    <section className="schedules-section" style={{ maxWidth: 800, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
                        <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 24 }}>Coaches & Schedules</h2>
                        
                        {/* Filter Section for Guests */}
                        <div style={{ marginBottom: 24, padding: 16, background: '#f0f8f0', borderRadius: 8, border: '1px solid #2ecc40' }}>
                            <h3 style={{ color: '#145a32', fontWeight: 'bold', marginBottom: 12, fontSize: 16 }}>Filter by Class Type:</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {['All', ...classTypes].map(classType => (
                                    <button
                                        key={classType}
                                        onClick={async () => {
                                            setGuestClassFilter(classType);
                                            if (classType !== 'All' && currentSelectedClass !== classType) {
                                                await fetchAvailabilitiesByClass(classType);
                                            } else if (classType === 'All' && currentSelectedClass !== null) {
                                                // Clear data when "All" is selected for guests
                                                setAllAvailabilities([]);
                                                setCurrentSelectedClass(null);
                                            }
                                        }}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: 6,
                                            border: '2px solid #145a32',
                                            background: guestClassFilter === classType ? '#145a32' : '#fff',
                                            color: guestClassFilter === classType ? '#fff' : '#145a32',
                                            fontWeight: 'bold',
                                            fontSize: 14,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            fontFamily: 'Courier New, Courier, monospace'
                                        }}
                                        onMouseOver={(e) => {
                                            if (guestClassFilter !== classType) {
                                                e.target.style.background = '#e8f5e8';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (guestClassFilter !== classType) {
                                                e.target.style.background = '#fff';
                                            }
                                        }}
                                    >
                                        {classType}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(loading || classLoading) ? <div>Loading...</div> : (
                            <div>
                                {(() => {
                                    const filteredAvailabilities = filterCoachesByClass(allAvailabilities, guestClassFilter);
                                    return (
                                        <>
                                                                                {guestClassFilter === 'All' && allAvailabilities.length === 0 ? (
                                        <div style={{ padding: 20, textAlign: 'center', color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
                                            Please select a class above to view available coaches and schedules.
                                        </div>
                                    ) : filteredAvailabilities.length === 0 ? (
                                                <div style={{ padding: 20, textAlign: 'center', color: '#666', background: '#f9f9f9', borderRadius: 8 }}>
                                                    {guestClassFilter === 'All' ? 'No available coaches yet.' : `No coaches available for ${guestClassFilter}.`}
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ marginBottom: 16, color: '#145a32', fontWeight: 'bold' }}>
                                                        Showing {filteredAvailabilities.length} coach{filteredAvailabilities.length !== 1 ? 'es' : ''} 
                                                        {guestClassFilter !== 'All' ? ` for ${guestClassFilter}` : ''}
                                                    </div>
                                                    {filteredAvailabilities.map((avail, idx) => {
                                    const coach = avail.coach;
                                    if (!coach) return null;
                                    const specialties = coach.specialties && coach.specialties.length > 0 ? coach.specialties.join(', ') : '';
                                    return (
                                        <div key={coach._id || idx} style={{ border: '1px solid #2ecc40', borderRadius: 12, margin: '18px 0', padding: 20, background: '#f8fff8', boxShadow: '0 2px 8px rgba(44,204,64,0.06)' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: 20, color: '#145a32', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {coach && coach.firstname && coach.lastname ? `${coach.firstname} ${coach.lastname}` : 'Coach'}
                                                {/* Visual belt blocks for each belt, all same total width */}
                                                {coach && coach.belt && (
                                                  <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8, gap: 8 }}>
                                                    {/* Visual belt blocks for each belt, all same total width */}
                                                    {coach.belt.toLowerCase() === 'black' && (
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, width: 66, height: 12 }}>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: '#111', borderRadius: 2 }}></span>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: 'red', borderRadius: 2 }}></span>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: '#111', borderRadius: 2 }}></span>
                                                      </span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'blue' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#3498db', borderRadius: 2 }}></span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'purple' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#8e44ad', borderRadius: 2 }}></span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'brown' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#a0522d', borderRadius: 2 }}></span>
                                                    )}
                                                    <span style={{ fontSize: 15, color: '#222', fontWeight: 600, fontFamily: 'Courier New, Courier, monospace', letterSpacing: 1, marginLeft: 4 }}>
                                                      {coach.belt.toUpperCase()} BELT
                                                    </span>
                                                  </span>
                                                )}
                                            </div>
                                            {/* Specialties */}
                                            {specialties && (
                                                <div style={{ fontSize: 14, color: '#145a32', marginBottom: 4 }}>
                                                    Specialties: {specialties}
                                                </div>
                                            )}
                                            <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: 16, marginBottom: 8, color: '#181818' }}>
                                                Available Slots:
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                                                    {avail.availability.length > 0 ? (() => {
                                                        // Flatten all slots
                                                        const allSlots = avail.availability.flatMap((d, i) => {
                                                            if (d.slots && Array.isArray(d.slots)) {
                                                                return d.slots.map((slot, j) => ({
                                                                    key: `${d.date}-${slot.start}-${slot.end}-${j}`,
                                                                    display: `${formatDate(d.date)} - ${slot.start} to ${slot.end}`,
                                                                    date: d.date,
                                                                    time: `${slot.start} to ${slot.end}`
                                                                }));
                                                            } else if (d.date && d.time) {
                                                                return [{
                                                                    key: `${d.date}-${d.time}`,
                                                                    display: `${formatDate(d.date)} - ${d.time}`,
                                                                    date: d.date,
                                                                    time: d.time
                                                                }];
                                                            } else if (d.date) {
                                                                return [{
                                                                    key: `${d.date}-no-time`,
                                                                    display: `${formatDate(d.date)}`,
                                                                    date: d.date,
                                                                    time: ''
                                                                }];
                                                            } else {
                                                                return [];
                                                            }
                                                        });
                                                        const coachId = avail.coach?._id || idx;
                                                        const totalPages = Math.ceil(allSlots.length / SLOTS_PER_PAGE) || 1;
                                                        const currentPage = getSlotPage(coachId);
                                                        const pagedSlots = paginate(allSlots, currentPage, SLOTS_PER_PAGE);
                                                        return (
                                                            <>
                                                                {pagedSlots.map(slotObj => (
                                                                    <span
                                                                        key={slotObj.key}
                                                                        style={{
                                                                            background: '#fff',
                                                                            border: '2px solid #145a32',
                                                                            color: '#145a32',
                                                                            borderRadius: 8,
                                                                            padding: '8px 18px',
                                                                            fontWeight: 'bold',
                                                                            fontSize: 15,
                                                                            marginBottom: 6,
                                                                            minWidth: 180,
                                                                            display: 'inline-block',
                                                                            textAlign: 'center',
                                                                        }}
                                                                    >
                                                                        {slotObj.display}
                                                                    </span>
                                                                ))}
                                                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                    <button
                                                                        onClick={() => setSlotPage(coachId, Math.max(1, currentPage - 1))}
                                                                        disabled={currentPage === 1}
                                                                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #145a32', background: currentPage === 1 ? '#eee' : '#145a32', color: currentPage === 1 ? '#888' : '#fff', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        Previous
                                                                    </button>
                                                                    <span style={{ fontSize: 14, color: '#145a32', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
                                                                    <button
                                                                        onClick={() => setSlotPage(coachId, Math.min(totalPages, currentPage + 1))}
                                                                        disabled={currentPage === totalPages}
                                                                        style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #145a32', background: currentPage === totalPages ? '#eee' : '#145a32', color: currentPage === totalPages ? '#888' : '#fff', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                                                    >
                                                                        Next
                                                                    </button>
                                                                </div>
                                                            </>
                                                        );
                                                    })() : <span>No slots yet.</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        );
    }

    if (!userType && !isInitializing) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Please <Link to="/login">log in</Link> to view schedules.</div>;
    }

    // Coach view: set availability
    if (userType === 'coach') {
        // Check if coach has Boxing specialty
        const hasBoxing = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('boxing')
        );
        // Check if coach has Muay Thai specialty
        const hasMuayThai = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('muay thai')
        );
        // Check if coach has Jiu Jitsu Adults specialty
        const hasJiuJitsuAdults = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('jiu jitsu adults')
        );
        // Check if coach has Jiu Jitsu Kids specialty
        const hasJiuJitsuKids = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('jiu jitsu kids')
        );
        // Check if coach has Judo specialty
        const hasJudo = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('judo')
        );
        // Check if coach has Kali specialty
        const hasKali = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('kali')
        );
        // Check if coach has MMA specialty
        const hasMMA = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('mma')
        );
        // Check if coach has Wrestling specialty
        const hasWrestling = user && user.specialties && user.specialties.some(
          spec => typeof spec === 'string' && spec.toLowerCase().includes('wrestling')
        );
        // Handler for generating boxing slots
        const handleGenerateBoxing = async () => {
            setBoxingGenLoading(true);
            setBoxingGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-boxing-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setBoxingGenMsg(`Successfully generated ${data.added} Boxing slots for this week!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setBoxingGenMsg(data.error || 'Failed to generate Boxing slots.');
                }
            } catch (err) {
                setBoxingGenMsg('Server error.');
            } finally {
                setBoxingGenLoading(false);
            }
        };
        // Handler for generating Muay Thai slots
        const handleGenerateMuayThai = async () => {
            setMuayThaiGenLoading(true);
            setMuayThaiGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-muaythai-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setMuayThaiGenMsg(`Successfully generated ${data.added} Muay Thai slots for this week!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setMuayThaiGenMsg(data.error || 'Failed to generate Muay Thai slots.');
                }
            } catch (err) {
                setMuayThaiGenMsg('Server error.');
            } finally {
                setMuayThaiGenLoading(false);
            }
        };
        // Handler for generating Jiu Jitsu Adults slots
        const handleGenerateJiuJitsuAdults = async () => {
            setJiuJitsuAdultsGenLoading(true);
            setJiuJitsuAdultsGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-jiujitsuadults-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setJiuJitsuAdultsGenMsg(`Successfully generated ${data.added} Jiu Jitsu Adults slots for this week!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setJiuJitsuAdultsGenMsg(data.error || 'Failed to generate Jiu Jitsu Adults slots.');
                }
            } catch (err) {
                setJiuJitsuAdultsGenMsg('Server error.');
            } finally {
                setJiuJitsuAdultsGenLoading(false);
            }
        };
        // Handler for generating Jiu Jitsu Kids slots
        const handleGenerateJiuJitsuKids = async () => {
            setJiuJitsuKidsGenLoading(true);
            setJiuJitsuKidsGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-jiujitsukids-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setJiuJitsuKidsGenMsg(`Successfully generated ${data.added} Jiu Jitsu Kids slots from today until end of 2025!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setJiuJitsuKidsGenMsg(data.error || 'Failed to generate Jiu Jitsu Kids slots.');
                }
            } catch (err) {
                setJiuJitsuKidsGenMsg('Server error.');
            } finally {
                setJiuJitsuKidsGenLoading(false);
            }
        };
        // Handler for generating Judo slots
        const handleGenerateJudo = async () => {
            setJudoGenLoading(true);
            setJudoGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-judo-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setJudoGenMsg(`Successfully generated ${data.added} Judo slots from today until end of 2025!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setJudoGenMsg(data.error || 'Failed to generate Judo slots.');
                }
            } catch (err) {
                setJudoGenMsg('Server error.');
            } finally {
                setJudoGenLoading(false);
            }
        };
        // Handler for generating Kali slots
        const handleGenerateKali = async () => {
            setKaliGenLoading(true);
            setKaliGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-kali-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setKaliGenMsg(`Successfully generated ${data.added} Kali slots from today until end of 2025!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setKaliGenMsg(data.error || 'Failed to generate Kali slots.');
                }
            } catch (err) {
                setKaliGenMsg('Server error.');
            } finally {
                setKaliGenLoading(false);
            }
        };
        // Handler for generating MMA slots
        const handleGenerateMMA = async () => {
            setMmaGenLoading(true);
            setMmaGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-mma-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setMmaGenMsg(`Successfully generated ${data.added} MMA slots for this week!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setMmaGenMsg(data.error || 'Failed to generate MMA slots.');
                }
            } catch (err) {
                setMmaGenMsg('Server error.');
            } finally {
                setMmaGenLoading(false);
            }
        };
        // Handler for generating Wrestling slots
        const handleGenerateWrestling = async () => {
            setWrestlingGenLoading(true);
            setWrestlingGenMsg('');
            try {
                const res = await fetch(`http://localhost:3001/api/coach/${user._id}/generate-wrestling-availability`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    setWrestlingGenMsg(`Successfully generated ${data.added} Wrestling slots from today until end of 2025!`);
                    // Refresh availability
                    fetchCoachAvailability(user._id);
                } else {
                    setWrestlingGenMsg(data.error || 'Failed to generate Wrestling slots.');
                }
            } catch (err) {
                setWrestlingGenMsg('Server error.');
            } finally {
                setWrestlingGenLoading(false);
            }
        };
        return (
            <div style={{ background: '#fff', minHeight: '100vh' }}>
                <section className="hero" style={{
                    background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
                }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', borderLeft: '6px solid #2ecc40', paddingLeft: 16 }}>SET YOUR AVAILABILITY</h1>
                    <p style={{ color: '#fff', fontSize: 18 }}>Choose the days and times when you want to accept classes.</p>
                </section>
                <main className="schedules-main">
                    {/* Bookings List for Coach */}
                    <section className="schedules-section" style={{ maxWidth: 800, margin: '0 auto', background: '#f8fff8', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 24, marginBottom: 24 }}>
                        <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Your Bookings</h2>
                        
                        {(() => {
                            // Sort coach bookings by date (latest first)
                            const sortedCoachBookings = [...coachBookings].sort((a, b) => {
                                const dateA = new Date(a.date);
                                const dateB = new Date(b.date);
                                return dateB - dateA; // Latest first
                            });
                            
                            // Group package bookings by CLIENT and package type - separate packages per client
                            const groupCoachPackageBookings = (bookings) => {
                                const packages = new Map();
                                const nonPackageBookings = [];

                                bookings.forEach(booking => {
                                    if (booking.isPackage) {
                                        // Group by CLIENT, package type, AND payment date to keep separate purchases distinct
                                        const paymentDate = booking.paymentDate ? new Date(booking.paymentDate).toDateString() : 'unknown';
                                        const packageKey = `${booking.clientUsername || booking.clientName}-${booking.packageType}-${booking.packagePrice}-${paymentDate}`;
                                        if (!packages.has(packageKey)) {
                                            packages.set(packageKey, {
                                                type: booking.packageType,
                                                price: booking.packagePrice,
                                                sessions: booking.packageSessions,
                                                paymentStatus: booking.paymentStatus,
                                                paymentProof: booking.paymentProof,
                                                clientName: booking.clientName,
                                                clientUsername: booking.clientUsername,
                                                paymentDate: paymentDate,
                                                bookings: []
                                            });
                                        }
                                        packages.get(packageKey).bookings.push(booking);
                                    } else {
                                        nonPackageBookings.push(booking);
                                    }
                                });

                                // After grouping all bookings, determine the overall package payment status
                                packages.forEach((packageData, packageKey) => {
                                    const allBookings = packageData.bookings;
                                    const statuses = allBookings.map(b => b.paymentStatus);
                                    
                                    // Determine package status based on all individual booking statuses
                                    if (statuses.every(status => status === 'verified')) {
                                        packageData.paymentStatus = 'verified';
                                    } else if (statuses.some(status => status === 'pending')) {
                                        packageData.paymentStatus = 'pending';
                                    } else if (statuses.some(status => status === 'rejected')) {
                                        packageData.paymentStatus = 'rejected';
                                    } else {
                                        packageData.paymentStatus = 'unpaid';
                                    }
                                    
                                    // Use the payment proof from the most recent booking or first verified booking
                                    const verifiedBooking = allBookings.find(b => b.paymentStatus === 'verified');
                                    const pendingBooking = allBookings.find(b => b.paymentStatus === 'pending');
                                    if (verifiedBooking) {
                                        packageData.paymentProof = verifiedBooking.paymentProof;
                                    } else if (pendingBooking) {
                                        packageData.paymentProof = pendingBooking.paymentProof;
                                    } else {
                                        packageData.paymentProof = allBookings[0]?.paymentProof;
                                    }
                                });

                                return { packages, nonPackageBookings };
                            };
                            
                            const { packages, nonPackageBookings } = groupCoachPackageBookings(sortedCoachBookings);
                            
                            // Convert packages to array and combine with non-package bookings for pagination
                            const packageEntries = Array.from(packages.values()).map(pkg => ({
                                isPackageGroup: true,
                                ...pkg
                            }));
                            
                            const allEntries = [...packageEntries, ...nonPackageBookings];
                            const totalCoachBookingsPages = Math.ceil(allEntries.length / COACH_BOOKINGS_PER_PAGE);
                            const currentCoachBookingsPage = Math.min(coachBookingsPage, totalCoachBookingsPages || 1);
                            const startIdx = (currentCoachBookingsPage - 1) * COACH_BOOKINGS_PER_PAGE;
                            const paginatedEntries = allEntries.slice(startIdx, startIdx + COACH_BOOKINGS_PER_PAGE);
                            
                            return (
                                <>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {allEntries.length === 0 ? (
                                            <li>No bookings yet.</li>
                                        ) : (
                                            paginatedEntries.map((entry, i) => {
                                                if (entry.isPackageGroup) {
                                                    // Package group display for coaches - separate per client
                                                    return (
                                                        <li key={`package-${i}`} style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid #e9ecef' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 }}>
                                                                {entry.clientName || entry.clientUsername} - {entry.type} Package ({entry.bookings.length}/{entry.sessions} sessions)
                                                                <div style={{ fontSize: '0.9em', color: '#666' }}>
                                                                    Total Price: ₱{entry.price}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: 14, color: '#6c757d', marginBottom: 8 }}>
                                                                Sessions:
                                                                {entry.bookings.map((booking, bookingIdx) => (
                                                                    <div key={bookingIdx} style={{ marginLeft: 16, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <span style={{ flex: 1 }}>
                                                                            {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {booking.time}
                                                                        </span>
                                                                        {userType === 'coach' && (
                                                                            <button
                                                                                style={{
                                                                                    background: '#28a745',
                                                                                    color: '#fff',
                                                                                    border: 'none',
                                                                                    borderRadius: 4,
                                                                                    padding: '2px 8px',
                                                                                    fontWeight: 'bold',
                                                                                    fontSize: 12,
                                                                                    cursor: 'pointer',
                                                                                    marginLeft: 8
                                                                                }}
                                                                                onClick={async () => {
                                                                                    try {
                                                                                        await fetch(`/api/bookings/${booking._id}/complete`, {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ coachId: user._id })
                                                                                        });
                                                                                        window.location.reload();
                                                                                    } catch (error) {
                                                                                        console.error('Error completing booking:', error);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                Done
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                <span style={{
                                                                    background: 
                                                                        entry.paymentStatus === 'pending' ? '#f39c12' : 
                                                                        entry.paymentStatus === 'verified' ? '#27ae60' : 
                                                                        entry.paymentStatus === 'rejected' ? '#e74c3c' : '#95a5a6',
                                                                    color: '#fff',
                                                                    padding: '4px 12px',
                                                                    borderRadius: 6,
                                                                    fontSize: 14,
                                                                    fontWeight: 'bold',
                                                                    marginRight: 8
                                                                }}>
                                                                    {entry.paymentStatus === 'pending' ? 'Payment Verification Pending' : 
                                                                     entry.paymentStatus === 'verified' ? 'Paid & Verified' : 
                                                                     entry.paymentStatus === 'rejected' ? 'Payment Rejected' :
                                                                     entry.paymentStatus}
                                                                </span>
                                                                {userType === 'coach' && (
                                                                    <button
                                                                        style={{
                                                                            background: '#28a745',
                                                                            color: '#fff',
                                                                            border: 'none',
                                                                            borderRadius: 6,
                                                                            padding: '6px 14px',
                                                                            fontWeight: 'bold',
                                                                            fontSize: 14,
                                                                            cursor: 'pointer',
                                                                            marginLeft: 8
                                                                        }}
                                                                        onClick={async () => {
                                                                            try {
                                                                                // Move all package sessions to history
                                                                                for (const booking of entry.bookings) {
                                                                                    const res = await fetch('http://localhost:3001/api/coach/move-booking-to-history', {
                                                                                        method: 'POST',
                                                                                        headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({
                                                                                            userId: booking.clientId?.username,
                                                                                            coachId: coachId,
                                                                                            date: booking.date,
                                                                                            time: booking.time,
                                                                                            class: booking.className || booking.class
                                                                                        })
                                                                                    });
                                                                                    const data = await res.json();
                                                                                    if (!data.success) {
                                                                                        alert(data.error || 'Failed to move package session to history.');
                                                                                        return;
                                                                                    }
                                                                                }
                                                                                // Refresh bookings after moving all sessions
                                                                                fetch(`http://localhost:3001/api/coach/${coachId}/bookings`)
                                                                                    .then(res => res.json())
                                                                                    .then(data => setCoachBookings(data));
                                                                                fetchCoachClassHistory(coachId);
                                                                                setMoveSuccessMsg('Package completed!');
                                                                                setTimeout(() => setMoveSuccessMsg(''), 2500);
                                                                            } catch (err) {
                                                                                alert('Server error.');
                                                                            }
                                                                        }}
                                                                    >
                                                                        Done Package
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                } else {
                                                    // Regular booking display for coaches
                                                    const b = entry;
                                                    const clientName = b.clientInfo?.clientName || b.clientName || 'Client';
                                                    return (
                                                        <li key={i} style={{ background: '#fff', border: '1px solid #2ecc40', borderRadius: 8, margin: '8px 0', padding: '10px 16px', fontWeight: 'bold', color: '#145a32', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span>
                                                                {clientName} booked for {b.className || b.class} — {new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {b.time}
                                                            </span>
                                                            {userType === 'coach' && (
                                                                <button
                                                                    style={{
                                                                        background: '#28a745',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: 6,
                                                                        padding: '6px 14px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: 14,
                                                                        cursor: 'pointer',
                                                                        marginLeft: 16
                                                                    }}
                                                                    onClick={async () => {
                                                                        try {
                                                                            const res = await fetch('http://localhost:3001/api/coach/move-booking-to-history', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    userId: b.clientId?.username || b.clientInfo?.username,
                                                                                    coachId: coachId,
                                                                                    date: b.date,
                                                                                    time: b.time,
                                                                                    class: b.className || b.class
                                                                                })
                                                                            });
                                                                            const data = await res.json();
                                                                            if (data.success) {
                                                                                fetch(`http://localhost:3001/api/coach/${coachId}/bookings`)
                                                                                    .then(res => res.json())
                                                                                    .then(data => setCoachBookings(data));
                                                                                fetchCoachClassHistory(coachId);
                                                                                setMoveSuccessMsg('Booking successfully moved to history!');
                                                                                setTimeout(() => setMoveSuccessMsg(''), 2500);
                                                                            } else {
                                                                                alert(data.error || 'Failed to move booking to history.');
                                                                            }
                                                                        } catch (err) {
                                                                            alert('Server error.');
                                                                        }
                                                                    }}
                                                                >
                                                                    Done
                                                                </button>
                                                            )}
                                                        </li>
                                                    );
                                                }
                                            })
                                        )}
                                    </ul>
                                    
                                    {moveSuccessMsg && (
                                        <div style={{ color: '#28a745', fontWeight: 'bold', marginTop: 8, fontSize: 14, textAlign: 'center' }}>{moveSuccessMsg}</div>
                                    )}
                                    
                                    {/* Pagination controls for coach bookings */}
                                    {totalCoachBookingsPages > 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
                                            <button 
                                                onClick={() => setCoachBookingsPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentCoachBookingsPage === 1}
                                                style={{ 
                                                    background: currentCoachBookingsPage === 1 ? '#ccc' : '#2ecc40', 
                                                    color: '#fff', 
                                                    border: 'none', 
                                                    borderRadius: 6, 
                                                    padding: '8px 16px', 
                                                    fontWeight: 'bold', 
                                                    fontSize: 14, 
                                                    cursor: currentCoachBookingsPage === 1 ? 'not-allowed' : 'pointer' 
                                                }}
                                            >
                                                Previous
                                            </button>
                                            <span style={{ fontWeight: 'bold', color: '#145a32' }}>
                                                Page {currentCoachBookingsPage} of {totalCoachBookingsPages}
                                            </span>
                                            <button 
                                                onClick={() => setCoachBookingsPage(prev => Math.min(prev + 1, totalCoachBookingsPages))}
                                                disabled={currentCoachBookingsPage === totalCoachBookingsPages}
                                                style={{ 
                                                    background: currentCoachBookingsPage === totalCoachBookingsPages ? '#ccc' : '#2ecc40', 
                                                    color: '#fff', 
                                                    border: 'none', 
                                                    borderRadius: 6, 
                                                    padding: '8px 16px', 
                                                    fontWeight: 'bold', 
                                                    fontSize: 14, 
                                                    cursor: currentCoachBookingsPage === totalCoachBookingsPages ? 'not-allowed' : 'pointer' 
                                                }}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Coach Class History Section - moved directly below Your Bookings */}
                        <div style={{ borderTop: '2px solid #e9ecef', paddingTop: 20, marginTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h3 style={{ color: '#6c757d', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', margin: 0, fontSize: 18 }}>Your Class History</h3>
                                <button 
                                    onClick={() => setShowCoachHistory(!showCoachHistory)}
                                    style={{ 
                                        background: showCoachHistory ? '#28a745' : '#6c757d', 
                                        color: '#fff', 
                                        border: 'none', 
                                        borderRadius: 6, 
                                        padding: '8px 16px', 
                                        fontWeight: 'bold', 
                                        fontSize: 14, 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    {showCoachHistory ? 'Hide History' : 'Show History'}
                                </button>
                            </div>
                            
                            {showCoachHistory && (
                                <>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {coachClassHistory.length === 0 ? (
                                            <div style={{ color: '#888', fontStyle: 'italic' }}>No completed classes yet.</div>
                                        ) : (
                                            paginate(coachClassHistory, historyPage, itemsPerPage).map((h, idx) => (
                                                <li key={idx} style={{ background: '#e8f5e8', border: '1px solid #c3e6c3', borderRadius: 8, margin: '8px 0', padding: '10px 16px', fontWeight: 'bold', color: '#155724' }}>
                                                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                                        {h.studentName} - {h.class} - {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {h.time}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#155724', fontWeight: 'normal' }}>
                                                        Completed: {new Date(h.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
                                        <button onClick={() => setHistoryPage(historyPage - 1)} disabled={historyPage === 1} style={{ marginRight: 10 }}>Previous</button>
                                        <button onClick={() => setHistoryPage(historyPage + 1)} disabled={historyPage * itemsPerPage >= coachClassHistory.length}>Next</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>

                    {/* Fixed Muay Thai Schedule if coach has Muay Thai specialty */}
                    {hasMuayThai && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Muay Thai (one-on-one format)</h2>
                            <button
                                onClick={handleGenerateMuayThai}
                                disabled={muayThaiGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: muayThaiGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {muayThaiGenLoading ? 'Generating...' : 'Generate Muay Thai Schedules for this Week'}
                            </button>
                            {muayThaiGenMsg && <div style={{ marginTop: 10, color: muayThaiGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{muayThaiGenMsg.replace('this month', 'this week')}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Muay Thai Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Muay Thai').length === 0 ? (
                                    <li>No Muay Thai slots yet for this week.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Muay Thai').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Muay Thai slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed MMA Schedule if coach has MMA specialty */}
                    {hasMMA && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>MMA (one-on-one format)</h2>
                            <button
                                onClick={handleGenerateMMA}
                                disabled={mmaGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: mmaGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {mmaGenLoading ? 'Generating...' : 'Generate MMA Schedules for this Week'}
                            </button>
                            {mmaGenMsg && <div style={{ marginTop: 10, color: mmaGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{mmaGenMsg.replace('this month', 'this week')}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>MMA Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'MMA').length === 0 ? (
                                    <li>No MMA slots yet for this week.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'MMA').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>MMA slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Boxing Schedule if coach has Boxing specialty */}
                    {hasBoxing && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Boxing (one-on-one format)</h2>
                            <button
                                onClick={handleGenerateBoxing}
                                disabled={boxingGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: boxingGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {boxingGenLoading ? 'Generating...' : 'Generate Boxing Schedules for this Week'}
                            </button>
                            {boxingGenMsg && <div style={{ marginTop: 10, color: boxingGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{boxingGenMsg.replace('this month', 'this week')}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Boxing Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Boxing').length === 0 ? (
                                    <li>No Boxing slots yet for this week.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Boxing').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Boxing slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Jiu Jitsu Adults Schedule if coach has Jiu Jitsu Adults specialty */}
                    {hasJiuJitsuAdults && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Jiu Jitsu Adults</h2>
                            <button
                                onClick={handleGenerateJiuJitsuAdults}
                                disabled={jiuJitsuAdultsGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: jiuJitsuAdultsGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {jiuJitsuAdultsGenLoading ? 'Generating...' : 'Generate Jiu Jitsu Adults Schedules for this Week'}
                            </button>
                            {jiuJitsuAdultsGenMsg && <div style={{ marginTop: 10, color: jiuJitsuAdultsGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{jiuJitsuAdultsGenMsg.replace('this month', 'this week')}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Jiu Jitsu Adults Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Jiu Jitsu Adults').length === 0 ? (
                                    <li>No Jiu Jitsu Adults slots yet for this week.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Jiu Jitsu Adults').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Jiu Jitsu Adults slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Jiu Jitsu Kids Schedule if coach has Jiu Jitsu Kids specialty */}
                    {hasJiuJitsuKids && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Jiu Jitsu Kids</h2>
                            <button
                                onClick={handleGenerateJiuJitsuKids}
                                disabled={jiuJitsuKidsGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: jiuJitsuKidsGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {jiuJitsuKidsGenLoading ? 'Generating...' : 'Generate Jiu Jitsu Kids Schedules (Today onwards)'}
                            </button>
                            {jiuJitsuKidsGenMsg && <div style={{ marginTop: 10, color: jiuJitsuKidsGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{jiuJitsuKidsGenMsg}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Jiu Jitsu Kids Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Jiu Jitsu Kids').length === 0 ? (
                                    <li>No Jiu Jitsu Kids slots yet.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Jiu Jitsu Kids').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Jiu Jitsu Kids slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Judo Schedule if coach has Judo specialty */}
                    {hasJudo && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Judo</h2>
                            <button
                                onClick={handleGenerateJudo}
                                disabled={judoGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: judoGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {judoGenLoading ? 'Generating...' : 'Generate Judo Schedules (Today onwards)'}
                            </button>
                            {judoGenMsg && <div style={{ marginTop: 10, color: judoGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{judoGenMsg}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Judo Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Judo').length === 0 ? (
                                    <li>No Judo slots yet.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Judo').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Judo slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Kali Schedule if coach has Kali specialty */}
                    {hasKali && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Kali</h2>
                            <button
                                onClick={handleGenerateKali}
                                disabled={kaliGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: kaliGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {kaliGenLoading ? 'Generating...' : 'Generate Kali Schedules (Today onwards)'}
                            </button>
                            {kaliGenMsg && <div style={{ marginTop: 10, color: kaliGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{kaliGenMsg}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Kali Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Kali').length === 0 ? (
                                    <li>No Kali slots yet.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Kali').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Kali slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}
                    {/* Fixed Wrestling Schedule if coach has Wrestling specialty */}
                    {hasWrestling && (
                        <section className="schedules-section" style={{ maxWidth: 500, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 32, marginBottom: 24 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 16 }}>Wrestling</h2>
                            <button
                                onClick={handleGenerateWrestling}
                                disabled={wrestlingGenLoading}
                                style={{
                                    background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 'bold', fontSize: 18, cursor: wrestlingGenLoading ? 'not-allowed' : 'pointer', marginBottom: 18
                                }}
                            >
                                {wrestlingGenLoading ? 'Generating...' : 'Generate Wrestling Schedules for 2025'}
                            </button>
                            {wrestlingGenMsg && <div style={{ marginTop: 10, color: wrestlingGenMsg.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{wrestlingGenMsg}</div>}
                            <div style={{ fontSize: 18, color: '#222', marginBottom: 8, marginTop: 18 }}><b>Wrestling Slots (Read-only):</b></div>
                            <ul style={{
                                fontSize: 16,
                                color: '#222',
                                marginBottom: 0,
                                paddingLeft: 20,
                                maxHeight: 200,
                                overflowY: 'auto',
                                background: '#f8fff8',
                                borderRadius: 8,
                                border: '1px solid #2ecc40'
                            }}>
                                {selectedAvailabilities.filter(av => av.class === 'Wrestling').length === 0 ? (
                                    <li>No Wrestling slots yet for 2025.</li>
                                ) : (
                                    selectedAvailabilities.filter(av => av.class === 'Wrestling').map((slot, idx) => (
                                        <li key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                            <span>{slot.date} — {slot.time}</span>
                                            <button
                                                onClick={() => handleCancelAvailability(slot)}
                                                style={{ background: '#ff9800', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 'bold', fontSize: 14, cursor: 'pointer', marginLeft: 16 }}
                                            >
                                                Remove from Db
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                            <div style={{ fontSize: 15, color: '#888', marginTop: 12 }}><i>Wrestling slots are fixed and cannot be edited.</i></div>
                        </section>
                    )}

                </main>
            </div>
        );
    }

    // User view: see available coaches and their dates
    if (userType === 'user') {
        // Helper: check if slot is available for booking
        const isSlotAvailable = (coach, slot) => {
            const DEBUG_MODE = process.env.NODE_ENV === 'development';
            if (DEBUG_MODE) {
                console.log(`🔍 [FRONTEND] Checking slot availability:`);
                console.log(`   - Coach: ${coach.firstname} ${coach.lastname} (${coach._id})`);
                console.log(`   - Date: ${slot.date}`);
                console.log(`   - Time: ${slot.time}`);
                console.log(`   - Class: ${slot.class}`);
                console.log(`   - slot.isBooked: ${slot.isBooked}`);
            }
            
            // If it's not Muay Thai, Boxing, or MMA, always available
            if (slot.class !== 'Muay Thai' && slot.class !== 'Boxing' && slot.class !== 'MMA') {
                if (DEBUG_MODE) {
                    console.log(`✅ [FRONTEND] Not a 1-on-1 class, always available`);
                }
                return true;
            }
            
            // Check if the slot is marked as booked
            if (slot.isBooked) {
                if (DEBUG_MODE) {
                    console.log(`❌ [FRONTEND] Slot marked as BOOKED by backend`);
                }
                return false;
            }
            
            // Check if the current user has already booked this slot
            const userHasBooked = isSlotBooked(coach._id, slot.date, slot.time, slot.class);
            if (DEBUG_MODE) {
                console.log(`   - User has booked: ${userHasBooked}`);
            }
            
            const available = !userHasBooked;
            if (DEBUG_MODE) {
                console.log(`📊 [FRONTEND] Final availability: ${available}`);
            }
            
            return available;
        };

        // Function to handle file upload
        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPaymentProof(reader.result);
                };
                reader.readAsDataURL(file);
            }
        };

        // Add this function before the return statement
        const groupPackageBookings = (bookings) => {
            const packages = new Map();
            const nonPackageBookings = [];

            bookings.forEach(booking => {
                if (booking.isPackage) {
                    // Group by coach, package type, AND payment date to keep separate purchases distinct
                    const paymentDate = booking.paymentDate ? new Date(booking.paymentDate).toDateString() : 'unknown';
                    const packageKey = `${booking.coachId}-${booking.packageType}-${booking.packagePrice}-${paymentDate}`;
                    if (!packages.has(packageKey)) {
                        packages.set(packageKey, {
                            type: booking.packageType,
                            price: booking.packagePrice,
                            sessions: booking.packageSessions,
                            paymentStatus: booking.paymentStatus, // Use the first booking's status as default
                            paymentProof: booking.paymentProof,
                            coachName: booking.coachName,
                            coachId: booking.coachId,
                            paymentDate: paymentDate,
                            bookings: []
                        });
                    }
                    packages.get(packageKey).bookings.push(booking);
                } else {
                    nonPackageBookings.push(booking);
                }
            });

            // After grouping all bookings, determine the overall package payment status
            packages.forEach((packageData, packageKey) => {
                const allBookings = packageData.bookings;
                const statuses = allBookings.map(b => b.paymentStatus);
                
                // Determine package status based on all individual booking statuses
                if (statuses.every(status => status === 'verified')) {
                    packageData.paymentStatus = 'verified';
                } else if (statuses.some(status => status === 'pending')) {
                    packageData.paymentStatus = 'pending';
                } else if (statuses.some(status => status === 'rejected')) {
                    packageData.paymentStatus = 'rejected';
                } else {
                    packageData.paymentStatus = 'unpaid';
                }
                
                // Use the payment proof from the most recent booking or first verified booking
                const verifiedBooking = allBookings.find(b => b.paymentStatus === 'verified');
                const pendingBooking = allBookings.find(b => b.paymentStatus === 'pending');
                if (verifiedBooking) {
                    packageData.paymentProof = verifiedBooking.paymentProof;
                } else if (pendingBooking) {
                    packageData.paymentProof = pendingBooking.paymentProof;
                } else {
                    packageData.paymentProof = allBookings[0]?.paymentProof;
                }
            });

            return { packages, nonPackageBookings };
        };

        // Update handlePaymentSubmit function with detailed logging
        const handlePaymentSubmit = async () => {
          if (!paymentProof || !selectedCoach || !selectedSlot) {
            alert('Please upload a payment proof.');
            return;
          }

          if (!acceptTerms) {
            alert('Please accept the terms and conditions to proceed with payment.');
            return;
          }

          console.log('=== PAYMENT SUBMISSION DEBUG ===');
          console.log('selectedCoach:', selectedCoach);
          console.log('selectedSlot:', selectedSlot);
          console.log('paymentProof:', paymentProof);
          console.log('user:', user);

          // Calculate the final amount with membership discount
          const bookingClass = selectedSlot?.class || selectedClassForModal || currentSelectedClass || openClass || 'Boxing';
          const originalAmount = paymentSettings.classRates?.[bookingClass] || 500;
          const membershipDiscount = membershipApproved ? 100 : 0;
          const finalAmount = Math.max(originalAmount - membershipDiscount, 0);

          const payload = {
                        userId: user.username,
                        coachId: selectedCoach._id,
                        date: selectedSlot.date,
                        time: selectedSlot.time,
            className: bookingClass,
            paymentProof,
            amount: finalAmount,
            originalAmount: originalAmount,
            membershipDiscount: membershipDiscount,
            hasMembershipDiscount: membershipApproved,
            qrCodeType: membershipApproved && membershipDiscount > 0 ? 'membership' : 'class'
          };
          
          console.log('Payload to send:', payload);

          try {
            console.log('Making request to: http://localhost:3001/api/updatePayment');
            const res = await fetch('http://localhost:3001/api/updatePayment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
                });

            console.log('Response status:', res.status);
            console.log('Response headers:', res.headers);

                const data = await res.json();
            console.log('Response data:', data);

                if (data.success) {
              // Update payment status locally
              const key = `${selectedCoach._id}-${selectedSlot.date}-${selectedSlot.time}`;
              console.log('Updating local payment status with key:', key);
              setPaymentStatus(prev => ({
                ...prev,
                [key]: {
                  status: 'for approval',
                  paymentId: data.paymentId,
                  submittedAt: new Date()
                }
              }));
              
                    setShowPaymentModal(false);
                    setPaymentProof(null);
                    setAcceptTerms(false);
              setBookingMessage(membershipApproved ? 
                `Payment submitted with member discount! Original: ₱${originalAmount}, Final: ₱${finalAmount} (saved ₱${membershipDiscount}). Please wait for approval.` :
                'Please wait for a moment. Payment and booking is for approval. If successful payment is made, you will be notified.');
              setTimeout(() => setBookingMessage(''), 8000);
              
              console.log('Payment submission successful!');
                } else {
              console.error('Payment submission failed:', data);
              alert('Payment submission failed: ' + (data.error || 'Unknown error'));
                }
          } catch (error) {
            console.error('Payment submission error:', error);
            alert('Server error during payment submission.');
            }
        };

        // Function to show payment modal
        const showPaymentDialog = (coach, slot) => {
            const resolvedClass = slot?.class || selectedClassForModal || currentSelectedClass || openClass;
            setSelectedCoach(coach);
            setSelectedSlot({ ...slot, class: resolvedClass });
            setShowPaymentModal(true);
        };

        // Update PaymentModal component for responsiveness and image file type restriction
        const PaymentModal = () => {
            if (!showPaymentModal) return null;

            // Get the class being booked
            const bookingClass = selectedSlot?.class || selectedClassForModal || currentSelectedClass || openClass || 'Boxing';
            const originalAmount = paymentSettings.classRates?.[bookingClass] || 500;
            
            // Apply 100 PHP discount for members
            const membershipDiscount = membershipApproved ? 100 : 0;
            const finalAmount = Math.max(originalAmount - membershipDiscount, 0); // Ensure amount doesn't go below 0
            
            // Use class-specific membership QR code for discounted payments, regular class QR code otherwise
            const qrCodeUrl = membershipApproved && membershipDiscount > 0 
                ? paymentSettings.classMembershipQrCodes?.[bookingClass] || '/images/gcashqr.png'
                : paymentSettings.classQrCodes?.[bookingClass] || '/images/gcashqr.png';

    // Responsive: horizontal on desktop, vertical on mobile
            return (
        <div className="payment-modal" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            overflowY: 'auto',
        }}>
            <div className="payment-modal-content" style={{
                background: '#fff',
                borderRadius: 16,
                padding: '18px 8px',
                maxWidth: 650,
                width: '95vw',
                boxShadow: '0 2px 16px rgba(44,204,64,0.18)',
                textAlign: 'center',
                maxHeight: '90vh',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: window.innerWidth < 600 ? 'column' : 'row',
                alignItems: 'stretch',
                gap: 18,
            }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                    <h2 style={{ color: '#145a32', marginBottom: 8, fontSize: 20 }}>Payment Required</h2>
                    <p style={{ fontSize: 14, marginBottom: 4 }}>Class: <strong>{bookingClass}</strong></p>
                    {membershipApproved && membershipDiscount > 0 ? (
                        <p style={{ fontSize: 14, marginBottom: 8, color: '#2ecc40', fontWeight: 'bold' }}>
                            🎉 Scan the {bookingClass} Member QR code:
                        </p>
                    ) : (
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Scan the GCash QR code:</p>
                    )}
                    <img 
                        src={qrCodeUrl} 
                        alt="GCash QR Code" 
                        style={{ 
                            maxWidth: '140px', 
                            width: '100%', 
                            borderRadius: 8, 
                            margin: '0 auto', 
                            marginBottom: 8, 
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            ':hover': {
                                transform: 'scale(1.05)'
                            }
                        }} 
                        onClick={() => handleImageClick(qrCodeUrl)}
                        title="Click to view full size"
                    />
                    
                    {/* Show original amount and discount if member */}
                    {membershipApproved && membershipDiscount > 0 ? (
                        <div style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 14, color: '#888', textDecoration: 'line-through', margin: '0 0 4px 0' }}>
                                Original: ₱{originalAmount.toFixed(2)}
                            </p>
                            <p style={{ fontSize: 12, color: '#2ecc40', fontWeight: 'bold', margin: '0 0 4px 0' }}>
                                🎉 Member Discount: -₱{membershipDiscount.toFixed(2)}
                            </p>
                            <p style={{ fontWeight: 'bold', margin: '4px 0 0 0', fontSize: 16, color: '#2ecc40' }}>
                                Final Amount: ₱{finalAmount.toFixed(2)}
                            </p>
                        </div>
                    ) : (
                        <p style={{ fontWeight: 'bold', margin: '4px 0 0 0', fontSize: 15 }}>Amount: ₱{finalAmount.toFixed(2)}</p>
                    )}
                        </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 8px 0', color: '#145a32' }}>Upload Payment Proof</h3>
                            <input
                                type="file"
                        accept="image/png, image/jpeg, image/jpg"
                                onChange={handleFileUpload}
                        style={{ width: '100%', marginBottom: 8 }}
                            />
                            {paymentProof && (
                        <div className="preview" style={{ margin: '8px 0', width: '100%' }}>
                            <img src={paymentProof} alt="Payment Proof" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, boxShadow: '0 2px 8px rgba(44,204,64,0.08)' }} />
                                </div>
                            )}
                    {/* Terms and Conditions Section */}
                    <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 12, color: '#495057' }}>
                        <h4 style={{ color: '#145a32', fontSize: 14, marginBottom: 8, fontWeight: 'bold' }}>Terms and Conditions</h4>
                        <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
                            <p style={{ margin: '4px 0' }}>• <strong>Non-Refundable Policy:</strong> All payments are non-refundable once submitted and approved.</p>
                            <p style={{ margin: '4px 0' }}>• <strong>Punctuality Policy:</strong> If you arrive late to your booked session, your class time will be reduced accordingly. For example, if you're 20 minutes late for a 1-hour session, you will only receive 40 minutes of coaching.</p>
                            <p style={{ margin: '4px 0' }}>• <strong>Payment Method:</strong> GCash payments only. Cash payments are not accepted.</p>
                            <p style={{ margin: '4px 0' }}>• <strong>Booking Confirmation:</strong> Your booking is only confirmed after payment verification by our admin team.</p>
                            <p style={{ margin: '4px 0' }}>• <strong>Cancellation Policy:</strong> Bookings can only be cancelled before payment approval. Once approved, no cancellations or refunds are allowed.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <input
                                type="checkbox"
                                id="acceptTerms"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="acceptTerms" style={{ cursor: 'pointer', fontSize: 12, fontWeight: 'bold', color: '#145a32' }}>
                                By submitting a payment, you're agreeing to our terms and conditions
                            </label>
                        </div>
                    </div>
                    <div className="modal-buttons" style={{ display: 'flex', gap: 8, justifyContent: 'center', width: '100%' }}>
                            <button 
                                onClick={handlePaymentSubmit} 
                                disabled={!paymentProof || !acceptTerms}
                                style={{
                                    background: (paymentProof && acceptTerms) ? '#2ecc40' : '#ccc',
                                    color: '#fff',
                                    border: 'none',
                                borderRadius: 8,
                                padding: '7px 12px',
                                    fontWeight: 'bold',
                                    cursor: (paymentProof && acceptTerms) ? 'pointer' : 'not-allowed',
                                fontSize: 14,
                                flex: 1
                                }}
                            >
                                Submit Payment
                            </button>
                            <button 
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setPaymentProof(null);
                                    setAcceptTerms(false);
                                }}
                                style={{
                                    background: '#e74c3c',
                                    color: '#fff',
                                    border: 'none',
                                borderRadius: 8,
                                padding: '7px 12px',
                                    fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: 14,
                                flex: 1
                                }}
                            >
                                Cancel
                            </button>
                    </div>
                        </div>
                    </div>
                </div>
            );
        };

        return (
            <div style={{ background: '#fff', minHeight: '100vh' }}>
                <section className="hero" style={{
                    background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
                }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', borderLeft: '6px solid #2ecc40', paddingLeft: 16 }}>AVAILABLE COACHES</h1>
                    <p style={{ color: '#fff', fontSize: 18 }}>Select a class to view available coaches and schedules.</p>
                </section>
                <main className="schedules-main">
                    {/* Booked Schedules Section (user only) */}
                    {userType === 'user' && user && (
                    <section className="schedules-section" style={{ maxWidth: 800, margin: '0 auto', background: '#f8fff8', borderRadius: 16, boxShadow: '0 2px 16px rgba(44,204,64,0.08)', padding: 24, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', margin: 0 }}>Your Bookings</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ color: '#6c757d', fontSize: 14 }}>
                                    Latest bookings first
                                </span>
                            </div>
                        </div>
                        
                        {(() => {
                            // Sort bookings by date (latest first) and paginate
                            const sortedBookings = [...userBookings].sort((a, b) => {
                                const dateA = new Date(a.date);
                                const dateB = new Date(b.date);
                                return dateB - dateA; // Latest first
                            });
                            
                            const { packages, nonPackageBookings } = groupPackageBookings(sortedBookings);
                            
                            // Debug logging for package bookings
                            console.log('📦 Package bookings debug:', {
                                totalBookings: sortedBookings.length,
                                packageCount: packages.size,
                                nonPackageCount: nonPackageBookings.length,
                                packages: Array.from(packages.entries()),
                                packageBookings: sortedBookings.filter(b => b.isPackage),
                                packageBookingStatuses: sortedBookings.filter(b => b.isPackage).map(b => ({
                                    coach: b.coachName,
                                    date: b.date,
                                    status: b.paymentStatus,
                                    packageType: b.packageType,
                                    isPackage: b.isPackage
                                }))
                            });
                            
                            // Use individual bookings for pagination instead of grouped entries
                            // This way each booking session shows up individually in pagination
                            const totalBookingsPages = Math.ceil(sortedBookings.length / BOOKINGS_PER_PAGE);
                            const currentBookingsPage = Math.min(bookingsPage, totalBookingsPages || 1);
                            const startIdx = (currentBookingsPage - 1) * BOOKINGS_PER_PAGE;
                            const paginatedBookings = sortedBookings.slice(startIdx, startIdx + BOOKINGS_PER_PAGE);
                            
                            // Group the paginated bookings to maintain display structure
                            const { packages: paginatedPackages, nonPackageBookings: paginatedNonPackageBookings } = groupPackageBookings(paginatedBookings);
                            const paginatedPackageEntries = Array.from(paginatedPackages.values()).map(pkg => ({
                                isPackageGroup: true,
                                ...pkg
                            }));
                            const allEntries = [...paginatedPackageEntries, ...paginatedNonPackageBookings];
                            
                            // Debug pagination calculation
                            console.log('🔍 Pagination Debug:', {
                                totalBookings: sortedBookings.length,
                                paginatedBookings: paginatedBookings.length,
                                paginatedPackageEntries: paginatedPackageEntries.length,
                                paginatedNonPackageBookings: paginatedNonPackageBookings.length,
                                allEntries: allEntries.length,
                                BOOKINGS_PER_PAGE: BOOKINGS_PER_PAGE,
                                calculatedTotalPages: totalBookingsPages,
                                currentBookingsPage: bookingsPage
                            });
                            
                            const paginatedEntries = allEntries;
                            
                            return (
                                <>
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {allEntries.length === 0 ? (
                                            <div>No booked schedules yet.</div>
                                        ) : (
                                            paginatedEntries.map((entry, idx) => {
                                                if (entry.isPackageGroup) {
                                                    // Package group display
                                                    return (
                                                        <div key={`package-${idx}`} style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid #e9ecef' }}>
                                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 }}>
                                                                {entry.coachName} - {entry.type} Package ({entry.bookings.length}/{entry.sessions} sessions)
                                                                <div style={{ fontSize: '0.9em', color: '#666' }}>
                                                                    Total Price: ₱{entry.price}
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: 14, color: '#6c757d', marginBottom: 8 }}>
                                                                Sessions:
                                                                {entry.bookings.map((booking, bookingIdx) => (
                                                                    <div key={bookingIdx} style={{ marginLeft: 16, marginTop: 4 }}>
                                                                        {booking.coachName} - {formatDate(booking.date)} {booking.time}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                {entry.paymentStatus === 'unpaid' && (
                                                                    <button 
                                                                        onClick={() => { 
                                                                            setSelectedSlot(entry.bookings[0]); 
                                                                            setShowPaymentModal(true); 
                                                                        }} 
                                                                        style={{ 
                                                                            background: '#2ecc40', 
                                                                            color: '#fff', 
                                                                            border: 'none', 
                                                                            borderRadius: 6, 
                                                                            padding: '4px 12px', 
                                                                            fontWeight: 'bold', 
                                                                            fontSize: 14, 
                                                                            cursor: 'pointer', 
                                                                            marginRight: 8 
                                                                        }}
                                                                    >
                                                                        Pay Now
                                                                    </button>
                                                                )}
                                                                
                                                                {(entry.paymentStatus === 'unpaid' || entry.paymentStatus === 'for approval' || entry.paymentStatus === 'rejected') && (
                                                                    <button 
                                                                        onClick={() => { setPendingCancel(entry.bookings[0]); setShowCancelConfirm(true); }} 
                                                                        style={{ 
                                                                            background: '#e74c3c', 
                                                                            color: '#fff', 
                                                                            border: 'none', 
                                                                            borderRadius: 6, 
                                                                            padding: '4px 12px', 
                                                                            fontWeight: 'bold', 
                                                                            fontSize: 14, 
                                                                            cursor: 'pointer', 
                                                                            marginRight: 8 
                                                                        }}
                                                                    >
                                                                        Cancel Booking
                                                                    </button>
                                                                )}
                                                                
                                                                {entry.paymentStatus !== 'unpaid' && (
                                                                    <span style={{
                                                                        background: 
                                                                            entry.paymentStatus === 'pending' ? '#f39c12' : 
                                                                            entry.paymentStatus === 'verified' ? '#27ae60' : 
                                                                            entry.paymentStatus === 'rejected' ? '#e74c3c' : '#95a5a6',
                                                                        color: '#fff',
                                                                        padding: '4px 12px',
                                                                        borderRadius: 6,
                                                                        fontSize: 14,
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        {entry.paymentStatus === 'pending' ? 'Payment Verification Pending' : 
                                                                         entry.paymentStatus === 'verified' ? 'Paid & Verified' : 
                                                                         entry.paymentStatus === 'rejected' ? 'Payment Rejected' :
                                                                         entry.paymentStatus}
                                                                    </span>
                                                                )}
                                                                
                                                                {entry.paymentStatus === 'rejected' && (
                                                                    <button 
                                                                        onClick={() => { 
                                                                            setSelectedSlot(entry.bookings[0]); 
                                                                            setShowPaymentModal(true); 
                                                                        }} 
                                                                        style={{ 
                                                                            background: '#f39c12', 
                                                                            color: '#fff', 
                                                                            border: 'none', 
                                                                            borderRadius: 6, 
                                                                            padding: '4px 12px', 
                                                                            fontWeight: 'bold', 
                                                                            fontSize: 14, 
                                                                            cursor: 'pointer', 
                                                                            marginLeft: 8 
                                                                        }}
                                                                    >
                                                                        Resubmit Payment
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    // Regular booking display (keep existing code)
                                                    const key = `${entry.coachId}-${entry.date}-${entry.time}`;
                                    const payment = paymentStatus[key];
                                    const currentPaymentStatus = payment ? payment.status : 'unpaid';
                                    
                                    return (
                                        <div key={idx} style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid #e9ecef' }}>
                                            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 }}>
                                                                {entry.coachName} - {formatDate(entry.date)} at {entry.time}
                                            </div>
                                            <div style={{ fontSize: 14, color: '#6c757d', marginBottom: 8 }}>
                                                                Class: {entry.class || 'Boxing'}
                                            </div>
                                            
                                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {currentPaymentStatus === 'unpaid' && (
                                                  <button 
                                                    onClick={() => { 
                                                                            setSelectedCoach({ _id: entry.coachId, firstname: entry.coachName?.split(' ')[0], lastname: entry.coachName?.split(' ')[1] }); 
                                                                            setSelectedSlot(entry); 
                                                      setShowPaymentModal(true); 
                                                    }} 
                                                    style={{ 
                                                      background: '#2ecc40', 
                                                      color: '#fff', 
                                                      border: 'none', 
                                                      borderRadius: 6, 
                                                      padding: '4px 12px', 
                                                      fontWeight: 'bold', 
                                                      fontSize: 14, 
                                                      cursor: 'pointer', 
                                                      marginRight: 8 
                                                    }}
                                                  >
                                                    Pay Now
                                                  </button>
                                                )}
                                                
                                                {(currentPaymentStatus === 'unpaid' || currentPaymentStatus === 'for approval' || currentPaymentStatus === 'rejected') && (
                                                  <button 
                                                                        onClick={() => { setPendingCancel(entry); setShowCancelConfirm(true); }} 
                                                    style={{ 
                                                      background: '#e74c3c', 
                                                      color: '#fff', 
                                                      border: 'none', 
                                                      borderRadius: 6, 
                                                      padding: '4px 12px', 
                                                      fontWeight: 'bold', 
                                                      fontSize: 14, 
                                                      cursor: 'pointer', 
                                                      marginRight: 8 
                                                    }}
                                                  >
                                                    Cancel Booking
                                                  </button>
                                                )}
                                                
                                                {currentPaymentStatus !== 'unpaid' && (
                                                  <span style={{
                                                    background: 
                                                      currentPaymentStatus === 'for approval' ? '#f39c12' : 
                                                      currentPaymentStatus === 'verified' ? '#27ae60' : 
                                                      currentPaymentStatus === 'rejected' ? '#e74c3c' : '#95a5a6',
                                                    color: '#fff',
                                                    padding: '4px 12px',
                                                    borderRadius: 6,
                                                    fontSize: 14,
                                                    fontWeight: 'bold'
                                                  }}>
                                                    {currentPaymentStatus === 'for approval' ? 'For Approval' : 
                                                     currentPaymentStatus === 'verified' ? 'Paid & Verified' : 
                                                     currentPaymentStatus === 'rejected' ? 'Payment Rejected' :
                                                     currentPaymentStatus}
                                                  </span>
                                                )}
                                                
                                                {currentPaymentStatus === 'rejected' && (
                                                  <button 
                                                    onClick={() => { 
                                                                            setSelectedCoach({ _id: entry.coachId, firstname: entry.coachName?.split(' ')[0], lastname: entry.coachName?.split(' ')[1] }); 
                                                                            setSelectedSlot(entry); 
                                                      setShowPaymentModal(true); 
                                                    }} 
                                                    style={{ 
                                                      background: '#f39c12', 
                                                      color: '#fff', 
                                                      border: 'none', 
                                                      borderRadius: 6, 
                                                      padding: '4px 12px', 
                                                      fontWeight: 'bold', 
                                                      fontSize: 14, 
                                                      cursor: 'pointer', 
                                                      marginLeft: 8 
                                                    }}
                                                  >
                                                    Resubmit Payment
                                                  </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                                }
                                })
                            )}
                        </ul>
                        
                                    {/* Pagination controls */}
                        {totalBookingsPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 12 }}>
                                <button
                                    onClick={() => setBookingsPage(Math.max(1, currentBookingsPage - 1))}
                                    disabled={currentBookingsPage === 1}
                                    style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: 6, 
                                        border: '1px solid #145a32', 
                                        background: currentBookingsPage === 1 ? '#eee' : '#145a32', 
                                        color: currentBookingsPage === 1 ? '#888' : '#fff', 
                                        fontWeight: 'bold', 
                                        cursor: currentBookingsPage === 1 ? 'not-allowed' : 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    Previous
                                </button>
                                <span style={{ fontSize: 14, color: '#145a32', fontWeight: 'bold' }}>
                                    Page {currentBookingsPage} of {totalBookingsPages}
                                </span>
                                <button
                                    onClick={() => setBookingsPage(Math.min(totalBookingsPages, currentBookingsPage + 1))}
                                    disabled={currentBookingsPage === totalBookingsPages}
                                    style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: 6, 
                                        border: '1px solid #145a32', 
                                        background: currentBookingsPage === totalBookingsPages ? '#eee' : '#145a32', 
                                        color: currentBookingsPage === totalBookingsPages ? '#888' : '#fff', 
                                        fontWeight: 'bold', 
                                        cursor: currentBookingsPage === totalBookingsPages ? 'not-allowed' : 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                        </>
                            );
                        })()}
                        
                        {/* Booking History Section moved here */}
                        <div style={{ borderTop: '2px solid #e9ecef', paddingTop: 20, marginTop: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <h3 style={{ color: '#6c757d', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', margin: 0, fontSize: 18 }}>Your Class History</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: '#6c757d', fontSize: 12 }}>Latest completed first</span>
                                    <button 
                                        onClick={() => setShowHistory(!showHistory)}
                                        style={{ 
                                            background: showHistory ? '#28a745' : '#6c757d', 
                                            color: '#fff', 
                                            border: 'none', 
                                            borderRadius: 6, 
                                            padding: '8px 16px', 
                                            fontWeight: 'bold', 
                                            fontSize: 14, 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        {showHistory ? 'Hide History' : 'Show History'}
                                    </button>
                                </div>
                            </div>
                            
                            {showHistory && (() => {
                                // Sort history by completedAt date (latest first) and paginate
                                const sortedHistory = [...bookingHistory].sort((a, b) => {
                                    const dateA = new Date(a.completedAt || a.date);
                                    const dateB = new Date(b.completedAt || b.date);
                                    return dateB - dateA; // Latest first
                                });
                                
                                const totalHistoryPages = Math.ceil(sortedHistory.length / HISTORY_PER_PAGE);
                                const currentHistoryPage = Math.min(historyPage, totalHistoryPages || 1);
                                const startIdx = (currentHistoryPage - 1) * HISTORY_PER_PAGE;
                                const paginatedHistory = sortedHistory.slice(startIdx, startIdx + HISTORY_PER_PAGE);
                                
                                return (
                                    <>
                                        <ul style={{ listStyle: 'none', padding: 0 }}>
                                            {sortedHistory.length === 0 ? (
                                                <div style={{ color: '#888', fontStyle: 'italic' }}>No completed classes yet.</div>
                                            ) : (
                                                paginatedHistory.map((h, idx) => (
                                            <div key={idx} style={{ background: '#e8f5e8', padding: 12, borderRadius: 8, marginBottom: 8, border: '1px solid #c3e6c3' }}>
                                                <div style={{ fontWeight: 'bold', color: '#155724', marginBottom: 4 }}>
                                                    {h.coachName} - {h.date} at {h.time}
                                                </div>
                                                <div style={{ fontSize: 14, color: '#155724', marginBottom: 8 }}>
                                                    Class: {h.class || 'Boxing'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{
                                                        background: '#28a745',
                                                        color: '#fff',
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        fontSize: 12,
                                                        fontWeight: 'bold'
                                                    }}>
                                                        Completed
                                                    </span>
                                                    <span style={{ fontSize: 12, color: '#6c757d' }}>
                                                        Finished on {new Date(h.completedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                                                                        ))
                                            )}
                                        </ul>
                                        
                                        {/* Pagination controls for history */}
                                        {totalHistoryPages > 1 && (
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 12 }}>
                                                <button
                                                    onClick={() => setHistoryPage(Math.max(1, currentHistoryPage - 1))}
                                                    disabled={currentHistoryPage === 1}
                                                    style={{ 
                                                        padding: '6px 12px', 
                                                        borderRadius: 6, 
                                                        border: '1px solid #28a745', 
                                                        background: currentHistoryPage === 1 ? '#eee' : '#28a745', 
                                                        color: currentHistoryPage === 1 ? '#888' : '#fff', 
                                                        fontWeight: 'bold', 
                                                        cursor: currentHistoryPage === 1 ? 'not-allowed' : 'pointer',
                                                        fontSize: 14
                                                    }}
                                                >
                                                    Previous
                                                </button>
                                                <span style={{ fontSize: 14, color: '#28a745', fontWeight: 'bold' }}>
                                                    Page {currentHistoryPage} of {totalHistoryPages}
                                                </span>
                                                <button
                                                    onClick={() => setHistoryPage(Math.min(totalHistoryPages, currentHistoryPage + 1))}
                                                    disabled={currentHistoryPage === totalHistoryPages}
                                                    style={{ 
                                                        padding: '6px 12px', 
                                                        borderRadius: 6, 
                                                        border: '1px solid #28a745', 
                                                        background: currentHistoryPage === totalHistoryPages ? '#eee' : '#28a745', 
                                                        color: currentHistoryPage === totalHistoryPages ? '#888' : '#fff', 
                                                        fontWeight: 'bold', 
                                                        cursor: currentHistoryPage === totalHistoryPages ? 'not-allowed' : 'pointer',
                                                        fontSize: 14
                                                    }}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </section>
                    )}

                    {/* Class Buttons & Dropdowns */}
                    <section className="schedules-section" style={{ maxWidth: 1200, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
                        <Link to="/" className="return-home">&larr; RETURN HOME</Link>
                        <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 24, textAlign: 'center' }}>Book by Class</h2>
                        
                        {/* Responsive horizontal layout for class buttons */}
                        <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '16px', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            marginBottom: 32,
                            padding: '0 16px'
                        }}>
                          {classTypes.map(type => (
                            <button
                              key={type}
                              onClick={() => handleClassClick(type)}
                              style={{
                                background: '#111',
                                color: '#2ecc40',
                                border: 'none',
                                borderRadius: 12,
                                padding: '12px 20px',
                                fontWeight: 'bold',
                                fontSize: 16,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                minWidth: 'fit-content',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                transform: 'translateY(0)',
                                // Responsive sizing
                                '@media (max-width: 768px)': {
                                  fontSize: '14px',
                                  padding: '10px 16px'
                                }
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#2ecc40';
                                e.target.style.color = '#fff';
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = '0 4px 12px rgba(46,204,64,0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = '#111';
                                e.target.style.color = '#2ecc40';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
                              }}
                            >
                              {type}
                            </button>
                          ))}
                        </div>

                        {/* Membership Package Booking Section */}
                        {(() => {
                            console.log('🔍 Membership package display check:', {
                                membershipApproved,
                                user: user ? { username: user.username, _id: user._id } : null,
                                userType
                            });
                            return membershipApproved;
                        })() && (
                            <div style={{ 
                                background: '#fff',
                                border: '2px solid #2ecc40',
                                borderRadius: 12, 
                                padding: 20, 
                                marginBottom: 24,
                                boxShadow: '0 2px 8px rgba(46,204,64,0.1)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 16,
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            background: '#2ecc40',
                                            color: '#fff',
                                            borderRadius: '50%',
                                            width: '32px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '16px'
                                        }}>
                                            🎉
                                        </span>
                                        <h3 style={{ 
                                            color: '#145a32', 
                                            fontWeight: 'bold', 
                                            margin: 0,
                                            fontSize: 18
                                        }}>
                                            Member Exclusive Packages
                                        </h3>
                                    </div>
                                    <span style={{
                                        background: 'linear-gradient(135deg, #2ecc40, #27ae60)',
                                        color: '#fff',
                                        padding: '4px 12px',
                                        borderRadius: 20,
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                        SAVE UP TO 40%
                                    </span>
                                </div>
                                
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '12px'
                                }}>
                                    {Object.entries(membershipPackages).filter(([classType]) => classType !== 'Aikido').map(([classType, packageInfo]) => (
                                        <div 
                                            key={classType}
                                            style={{
                                                background: '#f8fff8',
                                                borderRadius: 8,
                                                padding: 16,
                                                border: '1px solid #e8f5e8',
                                                transition: 'all 0.2s ease',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 4px 12px rgba(46,204,64,0.15)';
                                                e.target.style.borderColor = '#2ecc40';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.transform = 'translateY(0)';
                                                e.target.style.boxShadow = 'none';
                                                e.target.style.borderColor = '#e8f5e8';
                                            }}
                                            onClick={() => handlePackageBooking(classType)}
                                        >
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                                marginBottom: 8
                                            }}>
                                                <h4 style={{ 
                                                    color: '#145a32', 
                                                    fontWeight: 'bold', 
                                                    margin: 0,
                                                    fontSize: 14,
                                                    lineHeight: 1.2
                                                }}>
                                                    {classType}
                                                </h4>
                                                <span style={{
                                                    background: '#ff6b35',
                                                    color: '#fff',
                                                    fontSize: 10,
                                                    fontWeight: 'bold',
                                                    padding: '2px 6px',
                                                    borderRadius: 12,
                                                    lineHeight: 1
                                                }}>
                                                    -₱{(packageInfo.sessions * (paymentSettings.classRates[classType] || 500)) - packageInfo.price}
                                                </span>
                                            </div>
                                            
                                            <div style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                marginBottom: 12
                                            }}>
                                                <div style={{ fontSize: 12, color: '#666' }}>
                                                    <div style={{ fontWeight: 'bold', color: '#145a32' }}>
                                                        {packageInfo.sessions} Sessions
                                                    </div>
                                                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                                                        ₱{Math.round(packageInfo.price / packageInfo.sessions)} per session
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ 
                                                        fontSize: 16, 
                                                        fontWeight: 'bold', 
                                                        color: '#2ecc40',
                                                        lineHeight: 1
                                                    }}>
                                                        ₱{packageInfo.price}
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: 10, 
                                                        color: '#999', 
                                                        textDecoration: 'line-through',
                                                        lineHeight: 1
                                                    }}>
                                                        ₱{packageInfo.sessions * (paymentSettings.classRates[classType] || 500)}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{
                                                background: '#2ecc40',
                                                color: '#fff',
                                                textAlign: 'center',
                                                padding: '8px 12px',
                                                borderRadius: 6,
                                                fontSize: 12,
                                                fontWeight: 'bold',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                Book Package
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <p style={{ 
                                    color: '#666', 
                                    textAlign: 'center', 
                                    margin: '12px 0 0 0',
                                    fontSize: 12,
                                    fontStyle: 'italic'
                                }}>
                                    💡 Click any package to book multiple sessions at once
                                </p>
                            </div>
                        )}

                        {!membershipApproved && userType === 'user' && (
                            <div style={{ 
                                background: '#f8f9fa', 
                                borderRadius: 12, 
                                padding: 20, 
                                marginBottom: 32,
                                border: '2px dashed #dee2e6',
                                textAlign: 'center'
                            }}>
                                <h4 style={{ color: '#6c757d', marginBottom: 12 }}>
                                    🔒 Membership Required for Package Deals
                                </h4>
                                <p style={{ color: '#6c757d', marginBottom: 16, fontSize: 14 }}>
                                    Become a member to access exclusive package deals with multiple sessions at discounted rates!
                                </p>
                                <Link 
                                    to="/membership" 
                                    style={{
                                        background: '#2ecc40',
                                        color: '#fff',
                                        textDecoration: 'none',
                                        padding: '8px 16px',
                                        borderRadius: 6,
                                        fontWeight: 'bold',
                                        fontSize: 14
                                    }}
                                >
                                    Apply for Membership
                                </Link>
                            </div>
                        )}

                        {/* Show helpful message when no class is selected */}
                        {!currentSelectedClass && allAvailabilities.length === 0 && (
                            <div style={{ 
                                marginTop: 24, 
                                padding: 20, 
                                background: '#f8fff8', 
                                borderRadius: 12, 
                                border: '1px solid #2ecc40',
                                textAlign: 'center',
                                color: '#145a32'
                            }}>
                                <h3 style={{ color: '#145a32', marginBottom: 8 }}>Welcome! 👋</h3>
                                <p style={{ margin: 0, fontSize: 16 }}>
                                    Click on any class button above to view available coaches and their schedules.
                                </p>
                            </div>
                        )}

                        {bookingMessage && userType === 'user' && <div style={{ marginTop: 16, color: bookingMessage.includes('success') ? 'green' : 'red', fontWeight: 'bold' }}>{bookingMessage}</div>}
                    </section>
                </main>
                <PaymentModal />
                
                {/* Class Selection Modal */}
                {showClassModal && selectedClassForModal && (
                    <div className="class-modal" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(4px)'
                    }}>
                        <div style={{
                            background: '#fff',
                            borderRadius: 20,
                            maxWidth: '90vw',
                            maxHeight: '85vh',
                            width: '800px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            border: '2px solid #2ecc40'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #2ecc40, #27ae60)',
                                padding: '20px 30px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: '#fff'
                            }}>
                                <h2 style={{
                                    margin: 0,
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
                                }}>
                                    🥊 {selectedClassForModal} - Available Coaches
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowClassModal(false);
                                        setSelectedClassForModal(null);
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '40px',
                                        height: '40px',
                                        color: '#fff',
                                        fontSize: '20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.3)';
                                        e.target.style.transform = 'scale(1.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'rgba(255,255,255,0.2)';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    ×
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div style={{
                                padding: '30px',
                                maxHeight: 'calc(85vh - 100px)',
                                overflowY: 'auto'
                            }}>
                                {groupedAvailabilities[selectedClassForModal]?.length === 0 ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '60px 20px',
                                        color: '#666'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>😔</div>
                                        <h3 style={{ color: '#666', marginBottom: '10px' }}>No Available Coaches</h3>
                                        <p>No coaches are available for {selectedClassForModal} at the moment.</p>
                                    </div>
                                ) : (
                                    groupedAvailabilities[selectedClassForModal]?.map((avail, idx) => {
                                        const coach = avail.coach;
                                        if (!coach) return null;
                                        const specialties = coach.specialties && coach.specialties.length > 0 ? coach.specialties.join(', ') : '';
                                        const filteredAvail = avail.availability.filter(slot => {
                                            if (!slot.class && selectedClassForModal === 'Boxing') return true; // legacy boxing slot
                                            return (slot.class || '').toLowerCase() === selectedClassForModal.toLowerCase();
                                        });
                                        const coachId = coach._id || idx;
                                        const totalPages = Math.ceil(filteredAvail.length / SLOTS_PER_PAGE) || 1;
                                        const currentPage = getSlotPage(coachId);
                                        const pagedSlots = paginate(filteredAvail, currentPage, SLOTS_PER_PAGE);
                                        
                                        return (
                                            <div key={coachId} style={{
                                                border: '2px solid #2ecc40',
                                                borderRadius: 16,
                                                margin: '20px 0',
                                                padding: 24,
                                                background: 'linear-gradient(135deg, #f8fff8, #f0fff0)',
                                                boxShadow: '0 4px 12px rgba(46,204,64,0.1)'
                                            }}>
                                                                                                 <div style={{
                                                     fontWeight: 'bold',
                                                     fontSize: 24,
                                                     color: '#145a32',
                                                     marginBottom: 8,
                                                     display: 'flex',
                                                     alignItems: 'center',
                                                     gap: 12
                                                 }}>
                                                     <div style={{
                                                         width: '50px',
                                                         height: '50px',
                                                         borderRadius: '50%',
                                                         overflow: 'hidden',
                                                         border: '3px solid #2ecc40',
                                                         boxShadow: '0 2px 8px rgba(46,204,64,0.3)',
                                                         background: '#f0f0f0'
                                                     }}>
                                                         <img 
                                                             src={coach.profilePic || '/images/placeholder.jpg'} 
                                                             alt={coach && coach.firstname && coach.lastname ? `${coach.firstname} ${coach.lastname}` : 'Coach'}
                                                             style={{
                                                                 width: '100%',
                                                                 height: '100%',
                                                                 objectFit: 'cover',
                                                                 display: 'block'
                                                             }}
                                                             onError={(e) => {
                                                                 e.target.src = '/images/placeholder.jpg';
                                                             }}
                                                         />
                                                     </div>
                                                     {coach && coach.firstname && coach.lastname ? `${coach.firstname} ${coach.lastname}` : 'Coach'}
                                                    {coach && coach.belt && (
                                                        <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8, gap: 8 }}>
                                                            {coach.belt.toLowerCase() === 'black' && (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, width: 66, height: 16 }}>
                                                                    <span style={{ display: 'inline-block', width: 22, height: 16, background: '#111', borderRadius: 2 }}></span>
                                                                    <span style={{ display: 'inline-block', width: 22, height: 16, background: 'red', borderRadius: 2 }}></span>
                                                                    <span style={{ display: 'inline-block', width: 22, height: 16, background: '#111', borderRadius: 2 }}></span>
                                                                </span>
                                                            )}
                                                            {coach.belt.toLowerCase() === 'blue' && (
                                                                <span style={{ display: 'inline-block', width: 66, height: 16, background: '#3498db', borderRadius: 2 }}></span>
                                                            )}
                                                            {coach.belt.toLowerCase() === 'purple' && (
                                                                <span style={{ display: 'inline-block', width: 66, height: 16, background: '#8e44ad', borderRadius: 2 }}></span>
                                                            )}
                                                            {coach.belt.toLowerCase() === 'brown' && (
                                                                <span style={{ display: 'inline-block', width: 66, height: 16, background: '#a0522d', borderRadius: 2 }}></span>
                                                            )}
                                                            <span style={{
                                                                fontSize: 14,
                                                                color: '#222',
                                                                fontWeight: 700,
                                                                fontFamily: 'Courier New, Courier, monospace',
                                                                letterSpacing: 1,
                                                                marginLeft: 4
                                                            }}>
                                                                {coach.belt.toUpperCase()} BELT
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                                {specialties && (
                                                    <div style={{
                                                        fontSize: 14,
                                                        color: '#666',
                                                        marginBottom: 16,
                                                        padding: '8px 12px',
                                                        background: 'rgba(46,204,64,0.1)',
                                                        borderRadius: 8,
                                                        border: '1px solid rgba(46,204,64,0.2)'
                                                    }}>
                                                        <strong>Specialties:</strong> {specialties}
                                                    </div>
                                                )}
                                                <div style={{
                                                    fontFamily: 'Courier New, Courier, monospace',
                                                    fontSize: 16,
                                                    marginBottom: 8,
                                                    color: '#145a32',
                                                    fontWeight: 'bold'
                                                }}>
                                                    📅 Available Time Slots:
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                                    gap: 12,
                                                    marginTop: 12
                                                }}>
                                                    {pagedSlots.length === 0 ? (
                                                        <div style={{
                                                            color: '#888',
                                                            fontStyle: 'italic',
                                                            textAlign: 'center',
                                                            padding: '20px',
                                                            background: '#f8f9fa',
                                                            borderRadius: 8,
                                                            gridColumn: '1 / -1'
                                                        }}>
                                                            No available slots for this coach in {selectedClassForModal}.
                                                        </div>
                                                    ) : (
                                                        pagedSlots.map((slot, slotIdx) => {
                                                            const isSelected = pendingBooking && pendingBooking.slot === slot && pendingBooking.coachId === coachId;
                                                            const isAlreadyBooked = isSlotBooked(coachId, slot.date, slot.time, selectedClassForModal);
                                                            return (
                                                                <button
                                                                    key={slotIdx}
                                                                    onClick={() => {
                                                                        if (!isAlreadyBooked) {
                                                                            setPendingBooking({ coach, coachId, slot });
                                                                            setShowBookingConfirm(true);
                                                                            setShowClassModal(false);
                                                                        }
                                                                    }}
                                                                    disabled={isAlreadyBooked}
                                                                    style={{
                                                                        background: isAlreadyBooked ? '#f1f3f4' : (isSelected ? '#2ecc40' : '#fff'),
                                                                        border: isAlreadyBooked ? '2px solid #dadce0' : '2px solid #2ecc40',
                                                                        color: isAlreadyBooked ? '#9aa0a6' : (isSelected ? '#fff' : '#145a32'),
                                                                        borderRadius: 12,
                                                                        padding: '12px 16px',
                                                                        fontWeight: 'bold',
                                                                        fontSize: 14,
                                                                        cursor: isAlreadyBooked ? 'not-allowed' : 'pointer',
                                                                        textAlign: 'center',
                                                                        boxShadow: isSelected ? '0 0 0 3px rgba(46,204,64,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                                                        transition: 'all 0.2s ease',
                                                                        opacity: isAlreadyBooked ? 0.6 : 1,
                                                                        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)'
                                                                    }}
                                                                    onMouseEnter={(e) => {
                                                                        if (!isAlreadyBooked && !isSelected) {
                                                                            e.target.style.background = '#2ecc40';
                                                                            e.target.style.color = '#fff';
                                                                            e.target.style.transform = 'translateY(-2px)';
                                                                            e.target.style.boxShadow = '0 4px 8px rgba(46,204,64,0.3)';
                                                                        }
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        if (!isAlreadyBooked && !isSelected) {
                                                                            e.target.style.background = '#fff';
                                                                            e.target.style.color = '#145a32';
                                                                            e.target.style.transform = 'translateY(0)';
                                                                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                                                        }
                                                                    }}
                                                                >
                                                                    {(() => {
                                                                        const bookingCount = getBookingCount(coachId, slot.date, slot.time, selectedClassForModal);
                                                                        const isGroup = isGroupClass(selectedClassForModal);
                                                                        
                                                                        return isAlreadyBooked ? (
                                                                            <>
                                                                                <div style={{ fontSize: '12px', opacity: 0.8 }}>
                                                                                    {selectedClassForModal && (selectedClassForModal.toLowerCase() === 'boxing' || selectedClassForModal.toLowerCase() === 'muay thai' || selectedClassForModal.toLowerCase() === 'mma') 
                                                                                        ? 'Fully Booked' 
                                                                                        : 'Already Booked'
                                                                                    }
                                                                                </div>
                                                                                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                                                                                    {formatDate(slot.date)}
                                                                                    {slot.time && <div>{slot.time}</div>}
                                                                                </div>
                                                                                {isGroup && bookingCount > 0 && (
                                                                                    <div style={{ fontSize: '9px', marginTop: '2px', color: '#666', opacity: 0.8 }}>
                                                                                        {bookingCount} enrolled
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                                                                    {formatDate(slot.date)}
                                                                                </div>
                                                                                {slot.time && (
                                                                                    <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                                                                                        {slot.time}
                                                                                    </div>
                                                                                )}
                                                                                {isGroup && bookingCount > 0 && (
                                                                                    <div style={{ fontSize: '9px', marginTop: '2px', color: '#2ecc40', fontWeight: 'bold' }}>
                                                                                        {bookingCount} enrolled
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                {/* Pagination controls for slots */}
                                                {totalPages > 1 && (
                                                    <div style={{
                                                        marginTop: 16,
                                                        display: 'flex',
                                                        gap: 8,
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '12px',
                                                        background: 'rgba(46,204,64,0.05)',
                                                        borderRadius: 8
                                                    }}>
                                                        <button
                                                            onClick={() => setSlotPage(coachId, Math.max(1, currentPage - 1))}
                                                            disabled={currentPage === 1}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: 6,
                                                                border: '1px solid #2ecc40',
                                                                background: currentPage === 1 ? '#f1f3f4' : '#2ecc40',
                                                                color: currentPage === 1 ? '#9aa0a6' : '#fff',
                                                                fontWeight: 'bold',
                                                                fontSize: '12px',
                                                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            ← Previous
                                                        </button>
                                                        <span style={{
                                                            fontSize: 12,
                                                            color: '#145a32',
                                                            fontWeight: 'bold',
                                                            padding: '0 12px'
                                                        }}>
                                                            Page {currentPage} of {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setSlotPage(coachId, Math.min(totalPages, currentPage + 1))}
                                                            disabled={currentPage === totalPages}
                                                            style={{
                                                                padding: '6px 12px',
                                                                borderRadius: 6,
                                                                border: '1px solid #2ecc40',
                                                                background: currentPage === totalPages ? '#f1f3f4' : '#2ecc40',
                                                                color: currentPage === totalPages ? '#9aa0a6' : '#fff',
                                                                fontWeight: 'bold',
                                                                fontSize: '12px',
                                                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                        >
                                                            Next →
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Package Booking Modal */}
                {showPackageModal && selectedPackageClass && (
                    <div className="package-modal" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        overflowY: 'auto',
                    }}>
                        <div style={{
                            background: '#fff',
                            borderRadius: 16,
                            padding: 24,
                            maxWidth: 800,
                            width: '95vw',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
                        }}>
                            <h2 style={{ color: '#145a32', marginBottom: 16, textAlign: 'center' }}>
                                {selectedPackageClass} Package Booking
                                {packageStep === 2 && selectedPackageCoach && (
                                    <div style={{ fontSize: 16, fontWeight: 'normal', color: '#666', marginTop: 8 }}>
                                        Coach: {selectedPackageCoach.firstname} {selectedPackageCoach.lastname}
                                    </div>
                                )}
                            </h2>
                            
                            <div style={{ background: '#f8fff8', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #2ecc40' }}>
                                <h4 style={{ color: '#145a32', marginBottom: 8 }}>Package Details:</h4>
                                <div style={{ color: '#666' }}>
                                    • <strong>{membershipPackages[selectedPackageClass]?.sessions} Sessions</strong> for {selectedPackageClass}
                                </div>
                                <div style={{ color: '#666' }}>
                                    • <strong>Total Price: ₱{membershipPackages[selectedPackageClass]?.price}</strong>
                                </div>
                                <div style={{ color: '#2ecc40', fontWeight: 'bold' }}>
                                    • Save ₱{(membershipPackages[selectedPackageClass]?.sessions * (paymentSettings.classRates[selectedPackageClass] || 500)) - membershipPackages[selectedPackageClass]?.price} compared to individual bookings!
                                </div>
                            </div>

                            {/* Step 1: Coach Selection */}
                            {packageStep === 1 && (
                                <>
                                    <h4 style={{ color: '#145a32', marginBottom: 12 }}>Step 1: Choose Your Coach</h4>
                                    <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
                                        Select the coach you want to book your package sessions with.
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
                                        {groupedAvailabilities[selectedPackageClass]?.map((avail, idx) => {
                                            const coach = avail.coach;
                                            if (!coach) return null;
                                            
                                            const filteredAvail = avail.availability.filter(slot => {
                                                if (!slot.class && selectedPackageClass === 'Boxing') return true;
                                                return (slot.class || '').toLowerCase() === selectedPackageClass.toLowerCase();
                                            });

                                            const availableSlots = filteredAvail.filter(slot => 
                                                !isSlotBooked(coach._id, slot.date, slot.time, selectedPackageClass)
                                            );

                                            return (
                                                <div 
                                                    key={coach._id || idx} 
                                                    onClick={() => {
                                                        setSelectedPackageCoach(coach);
                                                        setPackageStep(2);
                                                    }}
                                                    style={{ 
                                                        border: '2px solid #e9ecef', 
                                                        borderRadius: 12, 
                                                        padding: 20, 
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease',
                                                        background: '#fff',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                        ':hover': {
                                                            borderColor: '#2ecc40',
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                                                        }
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.borderColor = '#2ecc40';
                                                        e.target.style.transform = 'translateY(-2px)';
                                                        e.target.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.borderColor = '#e9ecef';
                                                        e.target.style.transform = 'translateY(0)';
                                                        e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                                                    }}
                                                >
                                                    <div style={{ textAlign: 'center' }}>
                                                        <h5 style={{ color: '#145a32', marginBottom: 8, fontSize: 18, fontWeight: 'bold' }}>
                                                            {coach.firstname} {coach.lastname}
                                                        </h5>
                                                        <div style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
                                                            <strong>{availableSlots.length}</strong> available slots
                                                        </div>
                                                        <div style={{ 
                                                            background: '#2ecc40', 
                                                            color: '#fff', 
                                                            padding: '8px 16px', 
                                                            borderRadius: 6, 
                                                            fontSize: 12, 
                                                            fontWeight: 'bold',
                                                            display: 'inline-block'
                                                        }}>
                                                            Select Coach
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            {/* Step 2: Schedule Selection */}
                            {packageStep === 2 && selectedPackageCoach && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                        <button
                                            onClick={() => {
                                                setPackageStep(1);
                                                setSelectedPackageCoach(null);
                                                setPackageBookings([]);
                                            }}
                                            style={{
                                                background: 'none',
                                                border: '1px solid #145a32',
                                                color: '#145a32',
                                                borderRadius: 6,
                                                padding: '6px 12px',
                                                fontSize: 12,
                                                cursor: 'pointer',
                                                marginRight: 12,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}
                                        >
                                            ← Back to Coach Selection
                                        </button>
                                        <h4 style={{ color: '#145a32', margin: 0 }}>Step 2: Select Your Sessions</h4>
                                    </div>
                                    <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>
                                        Choose up to {membershipPackages[selectedPackageClass]?.sessions} available time slots with {selectedPackageCoach.firstname} {selectedPackageCoach.lastname}.
                                    </p>

                                    <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 20 }}>
                                        {(() => {
                                            const coachAvail = groupedAvailabilities[selectedPackageClass]?.find(avail => 
                                                avail.coach._id === selectedPackageCoach._id
                                            );
                                            
                                            if (!coachAvail) return <p>No available sessions found for this coach.</p>;
                                            
                                            const filteredAvail = coachAvail.availability.filter(slot => {
                                                if (!slot.class && selectedPackageClass === 'Boxing') return true;
                                                return (slot.class || '').toLowerCase() === selectedPackageClass.toLowerCase();
                                            });

                                            return (
                                                <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                        {filteredAvail.map((slot, slotIdx) => {
                                                            const isSelected = packageBookings.some(b => 
                                                                b.coachId === selectedPackageCoach._id && 
                                                                b.date === slot.date && 
                                                                b.time === slot.time
                                                            );
                                                            const isBooked = isSlotBooked(selectedPackageCoach._id, slot.date, slot.time, selectedPackageClass);
                                                            const isMaxReached = packageBookings.length >= membershipPackages[selectedPackageClass]?.sessions;

                                                            return (
                                                                <button
                                                                    key={slotIdx}
                                                                    disabled={isBooked || (isMaxReached && !isSelected)}
                                                                    onClick={() => {
                                                                        const booking = {
                                                                            coachId: selectedPackageCoach._id,
                                                                            coachName: `${selectedPackageCoach.firstname} ${selectedPackageCoach.lastname}`,
                                                                            date: slot.date,
                                                                            time: slot.time,
                                                                            class: selectedPackageClass
                                                                        };

                                                                        if (isSelected) {
                                                                            // Remove booking
                                                                            const newBookings = packageBookings.filter(b => 
                                                                                !(b.coachId === selectedPackageCoach._id && b.date === slot.date && b.time === slot.time)
                                                                            );
                                                                            setPackageBookings(newBookings);
                                                                        } else {
                                                                            // Add booking
                                                                            setPackageBookings(prev => [...prev, booking]);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        background: isBooked ? '#f8f9fa' : (isSelected ? '#2ecc40' : '#fff'),
                                                                        color: isBooked ? '#6c757d' : (isSelected ? '#fff' : '#145a32'),
                                                                        border: isBooked ? '1px solid #6c757d' : (isSelected ? '1px solid #2ecc40' : '1px solid #145a32'),
                                                                        borderRadius: 6,
                                                                        padding: '10px 16px',
                                                                        fontSize: 14,
                                                                        fontWeight: isSelected ? 'bold' : 'normal',
                                                                        cursor: isBooked || (isMaxReached && !isSelected) ? 'not-allowed' : 'pointer',
                                                                        opacity: isBooked || (isMaxReached && !isSelected) ? 0.6 : 1,
                                                                        transition: 'all 0.2s ease'
                                                                    }}
                                                                >
                                                                    {(() => {
                                                                        const bookingCount = getBookingCount(selectedPackageCoach._id, slot.date, slot.time, selectedPackageClass);
                                                                        const isGroup = isGroupClass(selectedPackageClass);
                                                                        
                                                                        if (isBooked) {
                                                                            return (
                                                                                <div style={{ textAlign: 'center' }}>
                                                                                    <div>Booked</div>
                                                                                    {isGroup && bookingCount > 0 && (
                                                                                        <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
                                                                                            {bookingCount} enrolled
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        } else {
                                                                            return (
                                                                                <div style={{ textAlign: 'center' }}>
                                                                                    <div>{formatDate(slot.date)} - {slot.time}</div>
                                                                                    {isGroup && bookingCount > 0 && (
                                                                                        <div style={{ fontSize: '10px', marginTop: '2px', color: isSelected ? '#fff' : '#2ecc40', fontWeight: 'bold' }}>
                                                                                            {bookingCount} enrolled
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        }
                                                                    })()}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                                        <strong>Selected: {packageBookings.length} / {membershipPackages[selectedPackageClass]?.sessions} sessions</strong>
                                    </div>

                                    {packageBookings.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h5 style={{ color: '#145a32', marginBottom: 8 }}>Payment Required:</h5>
                                            {membershipApproved && (
                                                <p style={{ color: '#2ecc40', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                                                    🎉 Using {selectedPackageClass} Member QR Code (Package Deal)
                                                </p>
                                            )}
                                            <img 
                                                src={paymentSettings.classPackageQrCodes?.[selectedPackageClass] || '/images/gcashqr.png'} 
                                                alt="Package QR Code" 
                                                style={{ 
                                                    width: 150, 
                                                    height: 150, 
                                                    margin: '0 auto', 
                                                    display: 'block', 
                                                    borderRadius: 8, 
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s'
                                                }} 
                                                onClick={() => handleImageClick(paymentSettings.classPackageQrCodes?.[selectedPackageClass] || '/images/gcashqr.png')}
                                                title="Click to view full size"
                                            />
                                            <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 8 }}>
                                                Amount: ₱{membershipPackages[selectedPackageClass]?.price}
                                            </p>
                                            
                                            <label style={{ display: 'block', marginTop: 16, marginBottom: 8, fontWeight: 'bold' }}>
                                                Upload Payment Proof:
                                            </label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setPaymentProof(reader.result);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: 8,
                                                    borderRadius: 4,
                                                    border: '1px solid #ccc'
                                                }}
                                            />
                                            
                                            {/* Terms and Conditions Section for Package */}
                                            <div style={{ marginTop: 16, padding: 12, background: '#f8f9fa', borderRadius: 8, border: '1px solid #dee2e6', fontSize: 12, color: '#495057' }}>
                                                <h4 style={{ color: '#145a32', fontSize: 14, marginBottom: 8, fontWeight: 'bold' }}>Terms and Conditions</h4>
                                                <div style={{ marginBottom: 8, lineHeight: 1.4 }}>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Non-Refundable Policy:</strong> All package payments are non-refundable once submitted and approved.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Punctuality Policy:</strong> If you arrive late to any booked session, your class time will be reduced accordingly. For example, if you're 20 minutes late for a 1-hour session, you will only receive 40 minutes of coaching.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Package Validity:</strong> Package sessions must be used within 3 months from the date of booking confirmation.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Payment Method:</strong> GCash payments only. Cash payments are not accepted.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Booking Confirmation:</strong> Your package booking is only confirmed after payment verification by our admin team.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Session Transfer:</strong> Package sessions are non-transferable to other individuals.</p>
                                                    <p style={{ margin: '4px 0' }}>• <strong>Class Attendance:</strong> Failure to attend any booked session without prior notice will result in forfeiture of that session.</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                    <input
                                                        type="checkbox"
                                                        id="acceptPackageTerms"
                                                        checked={acceptPackageTerms}
                                                        onChange={(e) => setAcceptPackageTerms(e.target.checked)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <label htmlFor="acceptPackageTerms" style={{ cursor: 'pointer', fontSize: 12, fontWeight: 'bold', color: '#145a32' }}>
                                                        By submitting a payment, you're agreeing to our terms and conditions
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                        setShowPackageModal(false);
                                        setSelectedPackageClass(null);
                                        setPackageBookings([]);
                                        setPaymentProof(null);
                                        setAcceptPackageTerms(false);
                                        setPackageCoachLock(null);
                                        setPackageStep(1);
                                        setSelectedPackageCoach(null);
                                    }}
                                    style={{
                                        background: '#6c757d',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        padding: '10px 20px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                {packageStep === 2 && (
                                    <button
                                        onClick={() => handlePackagePayment(paymentProof)}
                                        disabled={packageBookings.length === 0 || !paymentProof || !acceptPackageTerms}
                                        style={{
                                            background: (packageBookings.length === 0 || !paymentProof || !acceptPackageTerms) ? '#ccc' : '#2ecc40',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            padding: '10px 20px',
                                            fontWeight: 'bold',
                                            cursor: (packageBookings.length === 0 || !paymentProof || !acceptPackageTerms) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Submit Package Booking
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {showBookingConfirm && pendingBooking && (
                    <div className="booking-confirm-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px rgba(44,204,64,0.18)', textAlign: 'center' }}>
                            <h2 style={{ color: '#145a32', marginBottom: 16 }}>Confirm Booking</h2>
                            <div style={{ marginBottom: 24, fontSize: 18 }}>
                                Are you sure you want to book this class schedule?
                                <br />
                                <b>{pendingBooking.coach.firstname} {pendingBooking.coach.lastname}</b><br />
                                {formatDate(pendingBooking.slot.date)}{pendingBooking.slot.time ? ` - ${pendingBooking.slot.time}` : ''}
                            </div>
                            <button
                                onClick={async () => {
                                    setShowBookingConfirm(false);
                                    await handleBookSlot(pendingBooking.coach, pendingBooking.slot);
                                    setPendingBooking(null);
                                }}
                                style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 16, marginRight: 16, cursor: 'pointer' }}
                            >
                                OK
                            </button>
                            <button
                                onClick={() => { setShowBookingConfirm(false); setPendingBooking(null); }}
                                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
                {showCancelConfirm && pendingCancel && (
                    <div className="cancel-confirm-modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                        <div style={{ background: '#fff', borderRadius: 12, padding: 32, minWidth: 320, boxShadow: '0 2px 16px rgba(44,204,64,0.18)', textAlign: 'center' }}>
                            <h2 style={{ color: '#145a32', marginBottom: 16 }}>Confirm Cancellation</h2>
                            <div style={{ marginBottom: 24, fontSize: 18 }}>
                                Are you sure you want to cancel this booking?
                                <br />
                                <b>{pendingCancel.coachName || pendingCancel.coachId}</b><br />
                                {formatDate(pendingCancel.date)}{pendingCancel.time ? ` - ${pendingCancel.time}` : ''}
                            </div>
                            <button
                                onClick={async () => {
                                    setShowCancelConfirm(false);
                                    await handleCancelAvailability(pendingCancel);
                                    setPendingCancel(null);
                                }}
                                style={{ background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 16, marginRight: 16, cursor: 'pointer' }}
                            >
                                OK
                            </button>
                            <button
                                onClick={() => { setShowCancelConfirm(false); setPendingCancel(null); }}
                                style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Image Modal for QR codes */}
                {showImageModal && (
                    <div 
                        style={{
                            position: 'fixed', 
                            top: 0, 
                            left: 0, 
                            width: '100vw', 
                            height: '100vh', 
                            background: 'rgba(0,0,0,0.7)', 
                            zIndex: 9999, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center'
                        }} 
                        onClick={closeImageModal}
                    >
                        <div 
                            style={{ 
                                position: 'relative', 
                                background: 'none', 
                                padding: 24, 
                                borderRadius: 16, 
                                boxShadow: '0 4px 32px rgba(0,0,0,0.25)', 
                                backgroundColor: '#fff' 
                            }} 
                            onClick={e => e.stopPropagation()}
                        >
                            <img 
                                src={selectedImage} 
                                alt="QR Code" 
                                style={{ 
                                    maxWidth: 540, 
                                    maxHeight: 540, 
                                    borderRadius: 12, 
                                    display: 'block', 
                                    margin: '0 auto' 
                                }} 
                            />
                            <button 
                                onClick={closeImageModal} 
                                style={{ 
                                    position: 'absolute', 
                                    top: 10, 
                                    right: 10, 
                                    background: '#fff', 
                                    color: '#181818', 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    width: 32, 
                                    height: 32, 
                                    fontSize: 20, 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer', 
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.18)' 
                                }}
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Admin view: show the same as user, but no booking/add/edit buttons
    if (userType === 'admin') {
        return (
            <div style={{ background: '#fff', minHeight: '100vh' }}>
                <section className="hero" style={{
                    background: "linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/images/cage22.png') center/cover no-repeat"
                }}>
                    <h1 style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', borderLeft: '6px solid #2ecc40', paddingLeft: 16 }}>AVAILABLE COACHES</h1>
                    <p style={{ color: '#fff', fontSize: 18 }}>Read-only: View all coaches and their available schedules.</p>
                </section>
                <main className="schedules-main">
                    <section className="schedules-section" style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', padding: 32 }}>
                        <h2 style={{ color: '#145a32', fontWeight: 'bold', fontFamily: 'Courier New, Courier, monospace', marginBottom: 24 }}>Coaches & Schedules (Admin View)</h2>
                        {/* Class filter buttons */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', marginBottom: 32 }}>
                            {classTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={async () => {
                                        setAdminSelectedClass(type);
                                        if (currentSelectedClass !== type) {
                                            await fetchAvailabilitiesByClass(type);
                                        }
                                    }}
                                    style={{
                                        background: adminSelectedClass === type ? '#111' : '#111',
                                        color: adminSelectedClass === type ? '#2ecc40' : '#2ecc40',
                                        border: adminSelectedClass === type ? '2px solid #2ecc40' : '2px solid #111',
                                        borderRadius: 28,
                                        padding: '18px 48px',
                                        fontWeight: 'bold',
                                        fontSize: 26,
                                        cursor: 'pointer',
                                        outline: adminSelectedClass === type ? '3px solid #2ecc40' : 'none',
                                        boxShadow: adminSelectedClass === type ? '0 0 8px #2ecc40' : 'none',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        {(loading || classLoading) ? <div>Loading...</div> : (
                            <div>
                                {groupedAvailabilities[adminSelectedClass] && groupedAvailabilities[adminSelectedClass].length === 0 && <div>No available coaches for {adminSelectedClass} yet.</div>}
                                {groupedAvailabilities[adminSelectedClass] && groupedAvailabilities[adminSelectedClass].map((avail, idx) => {
                                    const coach = avail.coach;
                                    if (!coach) return null;
                                    const specialties = coach.specialties && coach.specialties.length > 0 ? coach.specialties.join(', ') : '';
                                    // Filter only slots for the selected class
                                    const filteredAvail = avail.availability.filter(slot => {
                                        if (!slot.class && adminSelectedClass === 'Boxing') return true; // legacy boxing
                                        return (slot.class || '').toLowerCase() === adminSelectedClass.toLowerCase();
                                    });
                                    // Pagination for slots
                                    const coachId = coach._id || idx;
                                    const totalPages = Math.ceil(filteredAvail.length / SLOTS_PER_PAGE) || 1;
                                    const currentPage = getSlotPage(coachId);
                                    const pagedSlots = paginate(filteredAvail, currentPage, SLOTS_PER_PAGE);
                                    return (
                                        <div key={coachId} style={{ border: '1px solid #2ecc40', borderRadius: 12, margin: '18px 0', padding: 20, background: '#f8fff8', boxShadow: '0 2px 8px rgba(44,204,64,0.06)' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: 20, color: '#145a32', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {coach && coach.firstname && coach.lastname ? `${coach.firstname} ${coach.lastname}` : 'Coach'}
                                                {/* Visual belt blocks for each belt, all same total width */}
                                                {coach && coach.belt && (
                                                  <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8, gap: 8 }}>
                                                    {coach.belt.toLowerCase() === 'black' && (
                                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, width: 66, height: 12 }}>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: '#111', borderRadius: 2 }}></span>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: 'red', borderRadius: 2 }}></span>
                                                        <span style={{ display: 'inline-block', width: 22, height: 12, background: '#111', borderRadius: 2 }}></span>
                                                      </span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'blue' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#3498db', borderRadius: 2 }}></span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'purple' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#8e44ad', borderRadius: 2 }}></span>
                                                    )}
                                                    {coach.belt.toLowerCase() === 'brown' && (
                                                      <span style={{ display: 'inline-block', width: 66, height: 12, background: '#a0522d', borderRadius: 2 }}></span>
                                                    )}
                                                    <span style={{ fontSize: 15, color: '#222', fontWeight: 600, fontFamily: 'Courier New, Courier, monospace', letterSpacing: 1, marginLeft: 4 }}>
                                                      {coach.belt.toUpperCase()} BELT
                                                    </span>
                                                  </span>
                                                )}
                                            </div>
                                            {/* Specialties */}
                                            {specialties && (
                                                <div style={{ fontSize: 14, color: '#145a32', marginBottom: 4 }}>
                                                    Specialties: {specialties}
                                                </div>
                                            )}
                                            <div style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: 16, marginBottom: 8, color: '#181818' }}>
                                                Available Slots:
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                                                    {pagedSlots.length > 0 ? (
                                                        pagedSlots.map((slot, slotIdx) => (
                                                            <span
                                                                key={slotIdx}
                                                                style={{
                                                                    background: '#fff',
                                                                    border: '2px solid #145a32',
                                                                    color: '#145a32',
                                                                    borderRadius: 8,
                                                                    padding: '8px 18px',
                                                                    fontWeight: 'bold',
                                                                    fontSize: 15,
                                                                    marginBottom: 6,
                                                                    minWidth: 180,
                                                                    display: 'inline-block',
                                                                    textAlign: 'center'
                                                                }}
                                                            >
                                                                {formatDate(slot.date)}{slot.time ? ` - ${slot.time}` : ''}
                                                            </span>
                                                        ))
                                                    ) : <span>No slots yet.</span>}
                                                </div>
                                                {/* Pagination controls for slots */}
                                                {totalPages > 1 && (
                                                    <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <button
                                                            onClick={() => setSlotPage(coachId, Math.max(1, currentPage - 1))}
                                                            disabled={currentPage === 1}
                                                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #145a32', background: currentPage === 1 ? '#eee' : '#145a32', color: currentPage === 1 ? '#888' : '#fff', fontWeight: 'bold', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                                        >
                                                            Previous
                                                        </button>
                                                        <span style={{ fontSize: 14, color: '#145a32', fontWeight: 'bold' }}>Page {currentPage} of {totalPages}</span>
                                                        <button
                                                            onClick={() => setSlotPage(coachId, Math.min(totalPages, currentPage + 1))}
                                                            disabled={currentPage === totalPages}
                                                            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #145a32', background: currentPage === totalPages ? '#eee' : '#145a32', color: currentPage === totalPages ? '#888' : '#fff', fontWeight: 'bold', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                                        >
                                                            Next
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </main>
            </div>
        );
    }

    // Admin or other userType
    return <div style={{ padding: 40, textAlign: 'center' }}>This page is for coaches and users only.</div>;
};

// Helper function for formatting date
function formatDate(dateStr) {
  const dateObj = new Date(dateStr);
  return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default Schedules; 