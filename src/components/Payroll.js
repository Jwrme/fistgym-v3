import React, { useState, useEffect } from 'react';
import '../designs/admin.css';

const Payroll = () => {
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [salary, setSalary] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [message, setMessage] = useState('');
  const [payrollHistory, setPayrollHistory] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [gymTotal, setGymTotal] = useState(0);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Pagination state for earnings table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Modal state for breakdown
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedCoachBreakdown, setSelectedCoachBreakdown] = useState(null);

  // Modal state for payslip history
  const [showPayslipHistoryModal, setShowPayslipHistoryModal] = useState(false);
  
  // Filter states for payslip history
  const [historyCoachFilter, setHistoryCoachFilter] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const historyItemsPerPage = 5;

  // Modal state for payment history
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  
  // Filter states for payment history modal
  const [paymentHistoryCoachFilter, setPaymentHistoryCoachFilter] = useState('');
  const [paymentHistoryDateFilter, setPaymentHistoryDateFilter] = useState('');
  const [paymentHistoryCurrentPage, setPaymentHistoryCurrentPage] = useState(1);
  const paymentHistoryItemsPerPage = 5;

  // Modal state for gym report history
  const [showGymReportHistoryModal, setShowGymReportHistoryModal] = useState(false);
  
  // Filter states for gym report history modal
  const [gymReportHistoryFilter, setGymReportHistoryFilter] = useState('');
  const [gymReportHistoryCurrentPage, setGymReportHistoryCurrentPage] = useState(1);
  const gymReportHistoryItemsPerPage = 5;

  // Mock gym report history data (in real implementation, this would come from backend)
  const [gymReportHistory, setGymReportHistory] = useState([
    {
      id: 1,
      period: 'June 2025',
      dateRange: 'June 1 - June 30, 2025',
      generatedDate: '2025-06-30',
      totalRevenue: 4975,
      totalCoachPayments: 2487,
      membershipEarnings: 2000,
      netGymEarnings: 4488,
      status: 'completed'
    }
    // More reports will be added here as months pass
    // This is just sample data showing what the history would look like
  ]);

  useEffect(() => {
    fetchCoaches();
    fetchPayrollHistory();
    // Check if admin (from localStorage or context)
    const user = JSON.parse(localStorage.getItem('user'));
    setAdmin(user && (user.isAdmin || user.userType === 'admin'));

    // Update date/time every second
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (coaches.length > 0) {
      setLoadingEarnings(true);
      Promise.all(
        coaches.map(coach =>
          fetch(`http://localhost:3001/api/payroll/data/${coach._id}?start=2024-01-01&end=2099-12-31`)
            .then(res => res.json())
            .then(data => ({ coach, ...data }))
        )
      ).then(results => {
        setEarnings(results);
        // Sum all class revenue and membership earnings (only count membershipEarnings once)
        const totalClassEarnings = results.reduce((sum, e) => sum + ((e.totalRevenue || 0) * 0.5), 0);
        // Membership earnings: get from the first result (all should be the same)
        const membershipEarnings = results.length > 0 && results[0].membershipEarnings ? results[0].membershipEarnings : 0;
        setGymTotal(totalClassEarnings + membershipEarnings);
        setLoadingEarnings(false);
      });
    }
  }, [coaches]);

  const fetchCoaches = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/coaches');
      if (!response.ok) throw new Error('Failed to fetch coaches');
      const data = await response.json();
      setCoaches(data);
    } catch (error) {
      setMessage('Error fetching coaches.');
    }
  };

  const fetchPayrollHistory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/payroll/history');
      if (!response.ok) throw new Error('Failed to fetch payroll history');
      const data = await response.json();
      setPayrollHistory(data);
    } catch (error) {
      setMessage('Error fetching payroll history.');
    }
  };

  // Function to get all remaining Fridays for payroll processing (future-proof with year selection)
  const getRemainingFridays = (year) => {
    const fridays = [];
    const today = new Date();
    const selectedYear = year || today.getFullYear();
    
    // Start from today and find all Fridays until end of selected year
    const startDate = new Date(today);
    const endDate = new Date(selectedYear, 11, 31); // December 31 of selected year
    
    // If selected year is in the future, start from January 1st of that year
    if (selectedYear > today.getFullYear()) {
      startDate.setFullYear(selectedYear, 0, 1); // January 1st of selected year
    }
    
    // Find the next Friday from start date
    const daysUntilFriday = (5 - startDate.getDay() + 7) % 7; // 5 = Friday
    const nextFriday = new Date(startDate);
    nextFriday.setDate(startDate.getDate() + daysUntilFriday);
    
    // If start date is Friday, start from start date
    const firstFriday = startDate.getDay() === 5 ? startDate : nextFriday;
    
    // Generate all Fridays from the first Friday until end of selected year
    const currentFriday = new Date(firstFriday);
    while (currentFriday <= endDate) {
      fridays.push(new Date(currentFriday));
      currentFriday.setDate(currentFriday.getDate() + 7); // Move to next Friday
    }
    
    return fridays;
  };

  const handleCoachSelect = (coach) => {
    setSelectedCoach(coach);
    // Get salary from earnings data (Coach Salary 50%)
    if (coach && earnings.length > 0) {
      const coachEarning = earnings.find(e => e.coach._id === coach._id);
      if (coachEarning && coachEarning.coachShare) {
        setSalary(coachEarning.coachShare.toString());
      } else {
        setSalary('');
      }
    } else {
      setSalary('');
    }
  };

  // Removed hasCoachBeenPaid function as payroll processing is no longer required for gym reports

  // Function to generate comprehensive gym earnings report
  const generateGymEarningsReport = async () => {
    try {
      // Removed payroll processing requirement - gym report can now be generated anytime
      // Fetch membership data
      let approvedMemberships = [];
      let membershipError = false;
      
      try {
        const membershipResponse = await fetch('http://localhost:3001/api/membership-applications');
        if (membershipResponse.ok) {
          const membershipData = await membershipResponse.json();
          if (membershipData.success && membershipData.applications) {
            // Filter approved memberships for current month
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            approvedMemberships = membershipData.applications.filter(app => {
              const appDate = new Date(app.date || app.submittedAt);
              return app.status === 'approved' && 
                     appDate.getMonth() === currentMonth && 
                     appDate.getFullYear() === currentYear;
            });
          }
        } else {
          membershipError = true;
          console.warn('Failed to fetch membership data');
        }
      } catch (membershipErr) {
        membershipError = true;
        console.warn('Error fetching membership data:', membershipErr);
      }

      // Calculate totals
      const totalMembershipEarnings = membershipError ? 0 : approvedMemberships.length * 1000;
      const totalClassRevenue = earnings.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
      const totalCoachPayments = earnings.reduce((sum, e) => sum + (e.coachShare || 0), 0);
      const netGymRevenue = totalClassRevenue - totalCoachPayments;
      const grandTotal = totalMembershipEarnings + netGymRevenue;

      const reportHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gym Earnings Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 210mm;
              margin: 0 auto;
              padding: 15mm;
              background: white;
              font-size: 14px;
              line-height: 1.4;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 3px solid #145a32;
              padding-bottom: 15px;
            }
            .gym-logo {
              font-size: 24px;
              font-weight: bold;
              color: #145a32;
              margin-bottom: 8px;
            }
            .report-title {
              font-size: 22px;
              font-weight: bold;
              color: #145a32;
              margin: 10px 0;
            }
            .period {
              font-size: 16px;
              color: #666;
              font-style: italic;
            }
            .summary-section {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #145a32;
            }
            .summary-title {
              font-size: 18px;
              font-weight: bold;
              color: #145a32;
              margin-bottom: 10px;
            }
            .summary-item {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              padding: 5px 0;
              border-bottom: 1px dotted #ddd;
            }
            .summary-item:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 16px;
              color: #145a32;
            }
            .section {
              margin: 25px 0;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #145a32;
              margin-bottom: 15px;
              border-bottom: 2px solid #145a32;
              padding-bottom: 5px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              font-size: 12px;
            }
            .data-table th,
            .data-table td {
              border: 1px solid #ddd;
              padding: 8px 10px;
              text-align: left;
            }
            .data-table th {
              background-color: #145a32;
              color: white;
              font-weight: bold;
            }
            .total-row {
              background: #e8f5e8;
              font-weight: bold;
            }
            .membership-list {
              columns: 2;
              column-gap: 20px;
              margin: 10px 0;
            }
            .membership-item {
              break-inside: avoid;
              margin: 5px 0;
              padding: 5px;
              background: #f0f8ff;
              border-radius: 3px;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #145a32;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 10mm; font-size: 12px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="gym-logo">🥊 FIST GYM</div>
            <div class="report-title">COMPREHENSIVE EARNINGS REPORT</div>
            <div class="period">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>

          <div class="summary-section">
            <div class="summary-title">💰 EARNINGS SUMMARY</div>
            <div class="summary-item">
              <span>Total Class Revenue (Gross):</span>
              <span>₱${totalClassRevenue.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <span>Less: Coach Payments (50%):</span>
              <span>-₱${totalCoachPayments.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <span>Net Class Revenue:</span>
              <span>₱${netGymRevenue.toLocaleString()}</span>
            </div>
            <div class="summary-item">
              <span>Membership Earnings ${membershipError ? '(data unavailable)' : `(${approvedMemberships.length} members)`}:</span>
              <span>${membershipError ? 'N/A' : `₱${totalMembershipEarnings.toLocaleString()}`}</span>
            </div>
            <div class="summary-item">
              <span>TOTAL GYM EARNINGS${membershipError ? ' (excluding membership data)' : ''}:</span>
              <span>₱${grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">👥 NEW MEMBERSHIPS (₱1,000 each)</div>
            ${membershipError ? `
              <div style="text-align: center; color: #e74c3c; font-style: italic; padding: 20px; background: #fdf2f2; border-radius: 5px; border: 1px solid #fadbd8;">
                ⚠️ Unable to fetch membership data. Membership earnings not included in totals.
              </div>
            ` : approvedMemberships.length > 0 ? `
              <div class="membership-list">
                ${approvedMemberships.map(member => `
                  <div class="membership-item">
                    <strong>${member.name || `${member.firstname || ''} ${member.lastname || ''}`.trim()}</strong><br>
                    Email: ${member.email}<br>
                    ${member.selectedPackage ? `Package: ${member.selectedPackage}<br>` : ''}
                    Approved: ${new Date(member.date || member.submittedAt).toLocaleDateString()}<br>
                    ${member.startDate ? `Start Date: ${new Date(member.startDate).toLocaleDateString()}<br>` : ''}
                    ${member.expirationDate ? `End Date: ${new Date(member.expirationDate).toLocaleDateString()}` : ''}
                  </div>
                `).join('')}
              </div>
              <div style="text-align: center; margin-top: 15px; font-weight: bold; color: #145a32;">
                Total Members: ${approvedMemberships.length} | Total Earnings: ₱${totalMembershipEarnings.toLocaleString()}
              </div>
            ` : `
              <div style="text-align: center; color: #666; font-style: italic; padding: 20px;">
                No new memberships approved this month
              </div>
            `}
          </div>

          <div class="section">
            <div class="section-title">🏃‍♂️ CLASS EARNINGS BREAKDOWN</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Coach</th>
                  <th>Classes</th>
                  <th>Total Clients</th>
                  <th>Gross Revenue</th>
                  <th>Coach Share (50%)</th>
                  <th>Gym Share (50%)</th>
                </tr>
              </thead>
              <tbody>
                ${earnings.map(e => `
                  <tr>
                    <td>${e.coach.firstname} ${e.coach.lastname}</td>
                    <td>${e.totalClasses || 0}</td>
                    <td>${e.totalClients || 0}</td>
                    <td>₱${(e.totalRevenue || 0).toLocaleString()}</td>
                    <td>₱${(e.coachShare || 0).toLocaleString()}</td>
                    <td>₱${((e.totalRevenue || 0) - (e.coachShare || 0)).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3"><strong>TOTALS</strong></td>
                  <td><strong>₱${totalClassRevenue.toLocaleString()}</strong></td>
                  <td><strong>₱${totalCoachPayments.toLocaleString()}</strong></td>
                  <td><strong>₱${netGymRevenue.toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">DETAILED CLASS BREAKDOWN</div>
            ${earnings.map(e => `
              <div style="margin-bottom: 20px;">
                <h4 style="color: #145a32; margin-bottom: 10px;">${e.coach.firstname} ${e.coach.lastname}</h4>
                ${e.classBreakdown && e.classBreakdown.length > 0 ? `
                  <table class="data-table" style="font-size: 11px;">
                    <thead>
                      <tr>
                        <th>Class Type</th>
                        <th>Date</th>
                        <th>Clients</th>
                        <th>Revenue</th>
                        <th>Coach Share</th>
                        <th>Gym Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${e.classBreakdown.map(c => `
                        <tr>
                          <td>${c.className}</td>
                          <td>${new Date(c.date).toLocaleDateString()}</td>
                          <td>${c.clientCount}</td>
                          <td>₱${c.revenue.toLocaleString()}</td>
                          <td>₱${c.coachShare.toLocaleString()}</td>
                          <td>₱${(c.revenue - c.coachShare).toLocaleString()}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                ` : `
                  <div style="text-align: center; color: #666; font-style: italic; padding: 10px;">
                    No classes conducted this month
                  </div>
                `}
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p><strong>Report Generated:</strong> ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
            <p><strong>Period:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            <p>This is an official earnings report generated by Fist Gym Management System</p>
          </div>

          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="
              background: #145a32;
              color: white;
              border: none;
              padding: 15px 30px;
              font-size: 16px;
              border-radius: 5px;
              cursor: pointer;
              margin-right: 10px;
            ">🖨️ Print Report</button>
            
            <button onclick="window.close()" style="
              background: #dc3545;
              color: white;
              border: none;
              padding: 15px 30px;
              font-size: 16px;
              border-radius: 5px;
              cursor: pointer;
            ">❌ Close</button>
          </div>
        </body>
        </html>
      `;

      const reportWindow = window.open('', '_blank');
      reportWindow.document.write(reportHTML);
      reportWindow.document.close();
      
      setTimeout(() => {
        reportWindow.focus();
      }, 500);

      // Auto-save the generated report to history
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const currentDate = new Date();
      const dateRange = `${currentMonth.split(' ')[0]} 1 - ${currentMonth.split(' ')[0]} ${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()}, ${currentMonth.split(' ')[1]}`;
      
      const newReportEntry = {
        id: Date.now(), // Simple ID generation
        period: currentMonth,
        dateRange: dateRange,
        generatedDate: currentDate.toISOString().split('T')[0],
        totalRevenue: totalClassRevenue,
        totalCoachPayments: totalCoachPayments,
        membershipEarnings: totalMembershipEarnings,
        netGymEarnings: grandTotal,
        status: 'completed'
      };

      // Add to history (remove any existing entry for this month first)
      setGymReportHistory(prev => {
        const filtered = prev.filter(report => report.period !== currentMonth);
        return [newReportEntry, ...filtered];
      });

      console.log(`Gym report for ${currentMonth} saved to history`);

    } catch (error) {
      console.error('Error generating gym earnings report:', error);
      setMessage('Error generating gym earnings report. Please try again.');
    }
  };

  // Function to generate and print payslip
  const generatePayslip = (coachData, paymentData, salaryBreakdown) => {
    console.log('🖨️ Generating payslip with data:', {
      coachData: coachData,
      paymentData: paymentData,
      salaryBreakdown: salaryBreakdown,
      hasAttendanceData: !!salaryBreakdown.attendanceData
    });
    
    const payslipWindow = window.open('', '_blank');
    const payslipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${coachData.firstname} ${coachData.lastname}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
            background: white;
            font-size: 12px;
            line-height: 1.3;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 2px solid #145a32;
            padding-bottom: 10px;
          }
          .gym-logo {
            margin-bottom: 10px;
          }
          .gym-logo img {
            height: 60px;
            width: auto;
            margin-bottom: 5px;
          }
          .payslip-title {
            font-size: 20px;
            font-weight: bold;
            color: #145a32;
            margin: 8px 0;
          }
          .coach-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
          }
          .breakdown-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 10px;
          }
          .breakdown-table th,
          .breakdown-table td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
          }
          .breakdown-table th {
            background-color: #145a32;
            color: white;
            font-weight: bold;
            font-size: 10px;
          }
          .total-salary {
            background: #e8f5e8;
            font-weight: bold;
            font-size: 12px;
          }
          .attendance-section {
            background: #f8f9fa;
            padding: 10px 12px;
            border-left: 3px solid #2ecc40;
            margin: 15px 0;
            border-radius: 4px;
          }
          .attendance-title {
            font-size: 12px;
            font-weight: bold;
            color: #145a32;
            margin-bottom: 8px;
          }
          .attendance-stats {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            font-size: 11px;
          }
          .attendance-stat {
            text-align: center;
            padding: 5px;
            border-radius: 3px;
            background: white;
            border: 1px solid #ddd;
          }
          .attendance-stat.present {
            border-color: #2ecc40;
            color: #2ecc40;
          }
          .attendance-stat.absent {
            border-color: #e74c3c;
            color: #e74c3c;
          }
          .attendance-records {
            margin-top: 10px;
            font-size: 9px;
          }
          .attendance-record {
            display: inline-block;
            margin: 2px;
            padding: 2px 4px;
            border-radius: 2px;
            font-size: 8px;
          }
          .attendance-record.present {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .attendance-record.absent {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .agreement {
            background: #f0f8ff;
            padding: 10px 12px;
            border-left: 3px solid #145a32;
            margin: 15px 0;
            line-height: 1.4;
            font-size: 10px;
          }
          .agreement h3 {
            font-size: 12px;
            margin: 0 0 8px 0;
          }
          .agreement p {
            margin: 6px 0;
          }
          .agreement ul {
            margin: 6px 0;
            padding-left: 16px;
          }
          .agreement li {
            margin: 2px 0;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 15px;
          }
          .signature-block {
            text-align: center;
            width: 40%;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            margin: 20px 0 8px 0;
            height: 25px;
          }
          .signature-label {
            font-weight: bold;
            margin-top: 5px;
            font-size: 11px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 9px;
          }
          @media print {
            body {
              margin: 0;
              padding: 8mm;
              font-size: 11px;
            }
            .no-print {
              display: none;
            }
            .agreement {
              font-size: 9px;
              padding: 8px 10px;
              margin: 10px 0;
            }
            .agreement h3 {
              font-size: 11px;
            }
            .breakdown-table {
              font-size: 9px;
              margin: 8px 0;
            }
            .breakdown-table th,
            .breakdown-table td {
              padding: 4px 6px;
            }
            .coach-info {
              font-size: 10px;
              padding: 6px 10px;
            }
            .signatures {
              margin-top: 15px;
              page-break-inside: avoid;
            }
            .signature-line {
              height: 20px;
              margin: 15px 0 5px 0;
            }
            .footer {
              font-size: 8px;
              margin-top: 10px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="gym-logo">
            <img src="/Fist gym logo.png" alt="Fist Gym Logo" />
          </div>
          <div class="payslip-title">OFFICIAL PAYSLIP</div>
        </div>

        <div class="coach-info">
          <div>
            <strong>Coach:</strong> ${coachData.firstname} ${coachData.lastname}<br>
            <strong>Specialities:</strong> ${coachData.specialties && coachData.specialties.length > 0 ? coachData.specialties.join(', ') : 'N/A'}<br>
            <strong>Payment Method:</strong> Cash
          </div>
          <div>
            <strong>Payment Date:</strong> ${new Date(paymentData.paymentDate).toLocaleDateString()}<br>
            <strong>Period:</strong> ${new Date().toLocaleDateString()}<br>
            <strong>Status:</strong> ${paymentData.status.toUpperCase()}
          </div>
        </div>

        ${salaryBreakdown.attendanceData ? `
        <div class="attendance-section">
          <div class="attendance-title">📅 ATTENDANCE RECORD</div>
          <div class="attendance-stats">
            <div class="attendance-stat present">
              <div style="font-weight: bold;">${salaryBreakdown.attendanceData.totalDaysPresent}</div>
              <div>Days Present</div>
            </div>
            <div class="attendance-stat absent">
              <div style="font-weight: bold;">${salaryBreakdown.attendanceData.totalDaysAbsent}</div>
              <div>Days Absent</div>
            </div>
            <div class="attendance-stat">
              <div style="font-weight: bold;">${salaryBreakdown.attendanceData.totalDaysMarked}</div>
              <div>Total Days Marked</div>
            </div>
          </div>
          ${salaryBreakdown.attendanceData.attendanceRecords && salaryBreakdown.attendanceData.attendanceRecords.length > 0 ? `
          <div class="attendance-records">
            <strong>Daily Attendance:</strong><br>
            ${salaryBreakdown.attendanceData.attendanceRecords.map(record => `
              <span class="attendance-record ${record.status}">
                ${new Date(record.date).toLocaleDateString()} - ${record.status.toUpperCase()}
              </span>
            `).join('')}
          </div>
          ` : ''}
        </div>
        ` : ''}

        <table class="breakdown-table">
          <thead>
            <tr>
              <th>Class Type</th>
              <th>Date</th>
              <th>Clients</th>
              <th>Total Revenue</th>
              <th>Coach Share (50%)</th>
            </tr>
          </thead>
          <tbody>
            ${salaryBreakdown.classBreakdown && salaryBreakdown.classBreakdown.length > 0 
              ? salaryBreakdown.classBreakdown.map(c => `
                <tr>
                  <td>${c.className}</td>
                  <td>${new Date(c.date).toLocaleDateString()}</td>
                  <td>${c.clientCount}</td>
                  <td>₱${c.revenue.toLocaleString()}</td>
                  <td>₱${c.coachShare.toLocaleString()}</td>
                </tr>
              `).join('')
              : `
                <tr>
                  <td colspan="5" style="text-align: center; color: #666;">
                    No class breakdown available for this payment period
                  </td>
                </tr>
              `
            }
            <tr class="total-salary">
              <td colspan="4"><strong>TOTAL SALARY</strong></td>
              <td><strong>₱${parseFloat(paymentData.amount).toLocaleString()}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="agreement">
          <h3 style="margin-top: 0; color: #145a32;">SALARY AGREEMENT & ACKNOWLEDGMENT</h3>
          <p>I, <strong>${coachData.firstname} ${coachData.lastname}</strong>, acknowledge receipt of salary payment of <strong>₱${parseFloat(paymentData.amount).toLocaleString()}</strong> representing my 50% share of class revenue for the specified period.</p>
          ${salaryBreakdown.attendanceData ? `
          <p><strong>Attendance Summary:</strong> I confirm my attendance record shows ${salaryBreakdown.attendanceData.totalDaysPresent} days present out of ${salaryBreakdown.attendanceData.totalDaysMarked} days marked during this payroll period.</p>
          ` : ''}
          <p>I confirm: (1) Received complete payment in cash, (2) Salary breakdown is accurate, (3) Attendance record is correct, (4) No outstanding claims for this period, (5) Payment covers all coaching fees and commissions.</p>
          <p>By signing below, I acknowledge this constitutes full settlement for the specified period.</p>
        </div>

        <div class="signatures">
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">${coachData.firstname} ${coachData.lastname}</div>
            <div>Coach Signature & Date</div>
          </div>
          <div class="signature-block">
            <div class="signature-line"></div>
            <div class="signature-label">Admin Senjitsu</div>
            <div>Authorized Representative</div>
          </div>
        </div>

        <div class="footer">
          <p>This is an official payslip generated by Fist Gym Management System</p>
          <p>Generated on: ${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
          <p>For inquiries, contact gym administration</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="
            background: #145a32;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
          ">🖨️ Print Payslip</button>
          
          <button onclick="window.close()" style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 16px;
            border-radius: 5px;
            cursor: pointer;
          ">❌ Close</button>
        </div>
      </body>
      </html>
    `;

    payslipWindow.document.write(payslipHTML);
    payslipWindow.document.close();
    
    // Auto-focus the print dialog after a short delay
    setTimeout(() => {
      payslipWindow.focus();
    }, 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCoach || !salary || !paymentDate) {
      setMessage('Please fill in all required fields.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/payroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coachId: selectedCoach._id,
          amount: parseFloat(salary),
          paymentDate,
          status: paymentStatus,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('✅ Payment processed successfully! Generating payslip and sending notification...');
        
        // Get coach earnings data for payslip
        const coachEarning = earnings.find(e => e.coach._id === selectedCoach._id);
        
        // Store coach name for success message before clearing
        const processedCoachName = `${selectedCoach.firstname} ${selectedCoach.lastname}`;
        
        // Fetch attendance history directly from the same API used by attendance modal
        setTimeout(async () => {
          try {
            console.log('🔍 Fetching attendance history for coach:', selectedCoach._id);
            
            // Use the exact same API that powers the attendance history modal
            const attendanceResponse = await fetch(`http://localhost:3001/api/coaches-attendance/${selectedCoach._id}`);
            const attendanceHistory = await attendanceResponse.json();
            
            console.log('📅 Attendance history received:', attendanceHistory);
            console.log('📅 Number of attendance records:', attendanceHistory.length);
            
            // Calculate attendance statistics from the history
            const totalDaysPresent = attendanceHistory.filter(record => record.status === 'present').length;
            const totalDaysAbsent = attendanceHistory.filter(record => record.status === 'absent').length;
            const totalDaysMarked = attendanceHistory.length;
            
            // Create attendance data object
            const attendanceData = {
              totalDaysPresent,
              totalDaysAbsent,
              totalDaysMarked,
              attendanceRecords: attendanceHistory.map(record => ({
                date: record.date,
                status: record.status,
                confirmedBy: record.confirmedBy,
                timestamp: record.timestamp
              }))
            };
            
            console.log('📊 Processed attendance data:', attendanceData);
            
            // Create salary breakdown with attendance data
            const salaryBreakdownWithAttendance = {
              ...coachEarning,
              attendanceData: attendanceData
            };
            
            generatePayslip(selectedCoach, {
              amount: parseFloat(salary),
              paymentDate,
              status: paymentStatus
            }, salaryBreakdownWithAttendance);
          } catch (error) {
            console.error('❌ Error fetching attendance history for payslip:', error);
            // Fallback to original data without attendance
            generatePayslip(selectedCoach, {
              amount: parseFloat(salary),
              paymentDate,
              status: paymentStatus
            }, coachEarning || {});
          }
        }, 1000);

        // Clear form immediately after successful processing
        setSalary('');
        setPaymentDate('');
        setPaymentStatus('completed');
        setSelectedCoach(null);
        
        // Reset the processed coach's earnings to zero in the table
        setEarnings(prevEarnings => 
          prevEarnings.map(earning => 
            earning.coach._id === selectedCoach._id
              ? {
                  ...earning,
                  totalClasses: 0,
                  totalClients: 0,
                  totalRevenue: 0,
                  coachShare: 0,
                  classBreakdown: []
                }
              : earning
          )
        );
        
        // Recalculate gym total after zeroing out the paid coach
        const updatedGymTotal = earnings
          .filter(e => e.coach._id !== selectedCoach._id)
          .reduce((sum, e) => sum + ((e.totalRevenue || 0) * 0.5), 0);
        setGymTotal(updatedGymTotal);
        
        fetchPayrollHistory();
        
        // Update success message with coach name
        setTimeout(() => {
          setMessage(`✅ Payment for ${processedCoachName} completed successfully! Payslip generated and coach notified.`);
        }, 2000);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setMessage('');
        }, 7000);
        
      } else {
        setMessage('❌ ' + (data.error || 'Failed to process payment.'));
      }
    } catch (error) {
      setMessage('Server error. Please try again later.');
    }
  };

  const formatPhilippineDateTime = (date) => {
    const options = {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    return date.toLocaleString('en-PH', options);
  };

  // Function to filter and paginate payroll history
  const getFilteredPayrollHistory = () => {
    console.log('📋 Payroll history data:', payrollHistory);
    console.log('📋 Total payroll records:', payrollHistory.length);
    
    let filtered = payrollHistory
      // Show all payments regardless of status for now
      // .filter(payment => payment.status === 'completed')
      // Sort by payment date (latest first)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      
    console.log('📋 All records (no status filter):', filtered.length);
    console.log('📋 Sample record status:', filtered.length > 0 ? filtered[0].status : 'No records');

    // Apply coach filter (exact match from dropdown)
    if (historyCoachFilter.trim()) {
      filtered = filtered.filter(payment => 
        payment.coachName === historyCoachFilter
      );
    }

    // Apply date filter
    if (historyDateFilter) {
      const filterDate = new Date(historyDateFilter);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.toDateString() === filterDate.toDateString();
      });
    }

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / historyItemsPerPage);
    const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
    const endIndex = startIndex + historyItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: historyCurrentPage
    };
  };

  // Reset filters when opening modal
  const openPayslipHistoryModal = () => {
    console.log('📋 Opening payslip history modal...');
    setHistoryCoachFilter('');
    setHistoryDateFilter('');
    setHistoryCurrentPage(1);
    setShowPayslipHistoryModal(true);
    
    // Refresh payroll history when opening modal
    fetchPayrollHistory();
  };

  // Function to filter and paginate payment history for modal
  const getFilteredPaymentHistory = () => {
    console.log('💰 Payment history data for modal:', payrollHistory);
    console.log('💰 Total payment records:', payrollHistory.length);
    
    let filtered = payrollHistory
      // Show all payments regardless of status for now
      // .filter(payment => payment.status === 'completed')
      // Sort by payment date (latest first)
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
      
    console.log('💰 All payment records (no status filter):', filtered.length);
    console.log('💰 Sample payment status:', filtered.length > 0 ? filtered[0].status : 'No records');

    // Apply coach filter (exact match from dropdown)
    if (paymentHistoryCoachFilter.trim()) {
      filtered = filtered.filter(payment => 
        payment.coachName === paymentHistoryCoachFilter
      );
    }

    // Apply date filter
    if (paymentHistoryDateFilter) {
      const filterDate = new Date(paymentHistoryDateFilter);
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.toDateString() === filterDate.toDateString();
      });
    }

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / paymentHistoryItemsPerPage);
    const startIndex = (paymentHistoryCurrentPage - 1) * paymentHistoryItemsPerPage;
    const endIndex = startIndex + paymentHistoryItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: paymentHistoryCurrentPage
    };
  };

  // Reset filters when opening payment history modal
  const openPaymentHistoryModal = () => {
    console.log('💰 Opening payment history modal...');
    setPaymentHistoryCoachFilter('');
    setPaymentHistoryDateFilter('');
    setPaymentHistoryCurrentPage(1);
    setShowPaymentHistoryModal(true);
    
    // Refresh payroll history when opening modal
    fetchPayrollHistory();
  };

  // Function to filter and paginate gym report history
  const getFilteredGymReportHistory = () => {
    let filtered = gymReportHistory
      // Sort by generated date (latest first)
      .sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));

    // Apply period filter
    if (gymReportHistoryFilter.trim()) {
      filtered = filtered.filter(report => 
        report.period.toLowerCase().includes(gymReportHistoryFilter.toLowerCase()) ||
        report.dateRange.toLowerCase().includes(gymReportHistoryFilter.toLowerCase())
      );
    }

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / gymReportHistoryItemsPerPage);
    const startIndex = (gymReportHistoryCurrentPage - 1) * gymReportHistoryItemsPerPage;
    const endIndex = startIndex + gymReportHistoryItemsPerPage;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage: gymReportHistoryCurrentPage
    };
  };

  // Reset filters when opening gym report history modal
  const openGymReportHistoryModal = () => {
    setGymReportHistoryFilter('');
    setGymReportHistoryCurrentPage(1);
    setShowGymReportHistoryModal(true);
  };

  // Function to clear all monthly data (for starting a new month)
  const clearMonthlyData = () => {
    const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const confirmClear = window.confirm(
      `⚠️ CLEAR MONTHLY DATA FOR ${currentMonth.toUpperCase()}?\n\n` +
      `This will:\n` +
      `• Clear all coach earnings data for this month\n` +
      `• Reset the current payroll table\n` +
      `• Prepare the system for the next month\n\n` +
      `⚠️ WARNING: This action cannot be undone!\n` +
      `Make sure you've generated and saved all necessary reports first.\n\n` +
      `Do you want to proceed?`
    );

    if (confirmClear) {
      const doubleConfirm = window.confirm(
        `🚨 FINAL CONFIRMATION 🚨\n\n` +
        `You are about to clear ALL data for ${currentMonth}.\n` +
        `This includes coach earnings, payroll records, and current calculations.\n\n` +
        `Are you absolutely sure you want to continue?`
      );

             if (doubleConfirm) {
         // Clear all earnings data
         setEarnings([]);
         
         // Clear selected coach
         setSelectedCoach(null);
         
         // Clear form data
         setSalary('');
         setPaymentDate('');
         setPaymentStatus('completed');
         
         // Clear any messages
         setMessage('');
         
         // Reset gym total
         setGymTotal(0);
         
         // Show success message
         alert(`✅ Monthly data for ${currentMonth} has been cleared successfully!\n\nThe system is now ready for the next month's data.`);
         
         console.log(`Monthly data cleared for ${currentMonth}`);
       }
    }
  };

  return (
    <div className="admin-container">
      {/* Real-time clock at top right */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        right: '20px',
        color: '#28a745', 
        fontWeight: 'bold', 
        fontSize: '16px',
        textAlign: 'right',
        lineHeight: '1.2',
        zIndex: 1000
      }}>
        {formatPhilippineDateTime(currentDateTime)}
      </div>

      <h2 style={{ marginBottom: '20px' }}>Payroll Management</h2>
      
      {/* Main layout: Left column (Process Payment + Payment History) and Right column (Earnings Breakdown) */}
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Left Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Process Payment Section */}
          <div className="payroll-section">
            <h3>Process Payment</h3>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>Select Coach:</label>
                <select
                  value={selectedCoach?._id || ''}
                  onChange={(e) => {
                    const coachId = e.target.value;
                    if (coachId) {
                      const coach = coaches.find(c => c._id === coachId);
                      handleCoachSelect(coach || null);
                    } else {
                      handleCoachSelect(null);
                    }
                  }}
                  required
                >
                  <option value="">Select a coach</option>
                  {coaches.map(coach => (
                    <option key={coach._id} value={coach._id}>
                      {coach.firstname} {coach.lastname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Salary Amount:</label>
                <input
                  type="text"
                  value={selectedCoach && salary ? `₱${parseFloat(salary).toLocaleString()}` : 'Select a coach to auto-calculate salary'}
                  readOnly
                  style={{
                    backgroundColor: '#f8f9fa',
                    color: selectedCoach && salary ? '#145a32' : '#6c757d',
                    fontWeight: selectedCoach && salary ? 'bold' : 'normal',
                    cursor: 'not-allowed',
                    border: '1px solid #e9ecef'
                  }}
                  title="Salary is automatically calculated based on selected coach's earnings (50% share)"
                />
                {selectedCoach && salary && (
                  <small style={{ color: '#28a745', fontSize: '12px', fontStyle: 'italic' }}>
                    ✅ Auto-calculated: 50% of coach's total revenue
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setPaymentDate(''); // Reset payment date when year changes
                  }}
                  required
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Date (Every Friday):</label>
                <select
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                >
                  <option value="">Select Friday</option>
                  {getRemainingFridays(selectedYear).map(friday => {
                    // Format date to YYYY-MM-DD ensuring the correct date is preserved
                    const year = friday.getFullYear();
                    const month = String(friday.getMonth() + 1).padStart(2, '0');
                    const day = String(friday.getDate()).padStart(2, '0');
                    const dateString = `${year}-${month}-${day}`;
                    
                    return (
                      <option key={dateString} value={dateString}>
                        {friday.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>Payment Status:</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  required
                >
                  <option value="completed">Completed</option>
                </select>
              </div>

              <button type="submit" className="admin-button">Process Payment</button>
            </form>
          </div>

          {message && <div className="message">{message}</div>}

          {/* Payment History Button */}
          <div className="payroll-section">
            <h3>Payment History</h3>
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <p style={{ color: '#666', marginBottom: '15px', fontSize: '14px' }}>
                View detailed payment history with advanced filtering options.
              </p>
              <button
                onClick={openPaymentHistoryModal}
                style={{
                  background: '#145a32',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                View Payment History
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Earnings Breakdown */}
        <div className="payroll-section" style={{ flex: 1 }}>
          <h3>Earnings Breakdown</h3>
          {loadingEarnings ? <div>Loading earnings...</div> : (
            <>
              {admin && (
                <div style={{ marginBottom: 16, fontWeight: 'bold', color: '#145a32', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    Total Gym Earnings for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}: ₱{gymTotal.toLocaleString()}
                    <div style={{ fontWeight: 400, color: '#219150', fontSize: 15, marginTop: 4 }}>
                      (Includes ₱1,000 x approved memberships)
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={generateGymEarningsReport}
                    style={{
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '10px 15px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Generate detailed gym earnings report"
                  >
                    Generate Gym Report
                  </button>
                    <button
                      onClick={openGymReportHistoryModal}
                      style={{
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="View previous gym reports"
                    >
                      View Report History
                    </button>
                    <button
                      onClick={clearMonthlyData}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        padding: '10px 15px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Clear all monthly data (use at end of month)"
                    >
                      🗑️ Clear Monthly Data
                  </button>
                  </div>
                </div>
              )}
              {/* Pagination logic */}
              {(() => {
                const totalPages = Math.ceil(earnings.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const endIndex = startIndex + itemsPerPage;
                const currentEarnings = earnings.slice(startIndex, endIndex);
                
                return (
                  <>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Coach</th>
                          <th>Total Classes</th>
                          <th>Total Clients</th>
                          <th>Total Revenue</th>
                          <th>Coach Salary (50%)</th>
                          <th>Breakdown (per class)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentEarnings.map(e => (
                          <tr key={e.coach._id}>
                            <td>{e.coach.firstname} {e.coach.lastname}</td>
                            <td>{e.totalClasses || 0}</td>
                            <td>{e.totalClients || 0}</td>
                            <td>₱{(e.totalRevenue || 0).toLocaleString()}</td>
                            <td>₱{(e.coachShare || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  setSelectedCoachBreakdown(e);
                                  setShowBreakdownModal(true);
                                }}
                                style={{
                                  background: '#145a32',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 15px',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                                title="View detailed breakdown"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        gap: '10px', 
                        marginTop: '20px',
                        padding: '10px' 
                      }}>
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          style={{
                            background: currentPage === 1 ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          ← Previous
                        </button>
                        
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: '#145a32',
                          fontSize: '16px'
                        }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          style={{
                            background: currentPage === totalPages ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* Admin Payslip Archive Button */}
      {admin && (
        <div style={{ 
          width: '100%', 
          marginTop: '20px', 
          textAlign: 'center',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '12px',
          border: '1px solid #e9ecef'
        }}>
                      <h3 style={{ color: '#145a32', marginBottom: '15px' }}>Payslip Archive (Admin Access)</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
            View complete payslip history for all coaches and reprint any previous payslips.
          </p>
          <button
            onClick={openPayslipHistoryModal}
            style={{
              background: '#145a32',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              margin: '0 auto',
              boxShadow: '0 2px 8px rgba(20, 90, 50, 0.2)'
            }}
          >
                          View Payslip History
          </button>
          </div>
      )}

      {/* Gym Report History Modal */}
      {showGymReportHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '1000px',
            width: '95%',
            maxHeight: '85%',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '2px solid #145a32',
              paddingBottom: '15px'
            }}>
              <h2 style={{ 
                color: '#145a32', 
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                Gym Report History
              </h2>
              <button
                onClick={() => setShowGymReportHistoryModal(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Historical gym earnings reports by month. View and regenerate previous reports.
              </p>

              {/* Filter Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '15px',
                marginBottom: '20px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold', 
                    color: '#145a32',
                    fontSize: '14px'
                  }}>
                    Filter by Period:
                  </label>
                  <input
                    type="text"
                    placeholder="Search by month/year (e.g., June 2025)..."
                    value={gymReportHistoryFilter}
                    onChange={(e) => {
                      setGymReportHistoryFilter(e.target.value);
                      setGymReportHistoryCurrentPage(1); // Reset to first page
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    onClick={() => {
                      setGymReportHistoryFilter('');
                      setGymReportHistoryCurrentPage(1);
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Clear Filter
                  </button>
                </div>
              </div>

              {(() => {
                const filteredData = getFilteredGymReportHistory();
                return filteredData.totalItems > 0 ? (
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
            <thead>
                        <tr style={{ background: '#145a32', color: 'white', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'left' }}>Period</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Date Range</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Generated</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'right' }}>Total Revenue</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'right' }}>Net Earnings</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
                        {filteredData.items.map((report, index) => (
                          <tr key={report.id} style={{ 
                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                            borderBottom: '1px solid #e9ecef'
                          }}>
                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '500' }}>
                              {report.period}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center', fontSize: '12px' }}>
                              {report.dateRange}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              {new Date(report.generatedDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#145a32' }}>
                              ₱{report.totalRevenue.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                              ₱{report.netGymEarnings.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: report.status === 'completed' ? '#28a745' : '#dc3545',
                                background: report.status === 'completed' ? '#d4edda' : '#f8d7da',
                                border: `1px solid ${report.status === 'completed' ? '#c3e6cb' : '#f5c6cb'}`
                              }}>
                                {report.status.toUpperCase()}
                    </span>
                  </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  // In real implementation, this would regenerate the specific report
                                  generateGymEarningsReport();
                                }}
                                style={{
                                  background: '#17a2b8',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}
                                title="View/Regenerate this report"
                              >
                                View Report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {filteredData.totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f8f9fa',
                        borderRadius: '8px'
                      }}>
                        <button
                          onClick={() => setGymReportHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={filteredData.currentPage === 1}
                          style={{
                            background: filteredData.currentPage === 1 ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: filteredData.currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          ← Previous
                        </button>

                        <span style={{
                          fontWeight: 'bold',
                          color: '#145a32',
                          fontSize: '16px',
                          padding: '0 15px'
                        }}>
                          Page {filteredData.currentPage} of {filteredData.totalPages}
                        </span>
                        <span style={{
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          ({filteredData.totalItems} total reports)
                        </span>

                        <button
                          onClick={() => setGymReportHistoryCurrentPage(prev => Math.min(prev + 1, filteredData.totalPages))}
                          disabled={filteredData.currentPage === filteredData.totalPages}
                          style={{
                            background: filteredData.currentPage === filteredData.totalPages ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: filteredData.currentPage === filteredData.totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#666',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    fontStyle: 'italic'
                  }}>
                    {gymReportHistoryFilter ? 
                      'No gym reports found matching your search. Try adjusting your filter.' :
                      'No gym reports found in history.'
                    }
                  </div>
                );
              })()}
            </div>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '25px',
              borderTop: '1px solid #e9ecef',
              paddingTop: '20px'
            }}>
              <button
                onClick={() => setShowGymReportHistoryModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showPaymentHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '900px',
            width: '95%',
            maxHeight: '85%',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '2px solid #145a32',
              paddingBottom: '15px'
            }}>
              <h2 style={{ 
                color: '#145a32', 
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                Payment History - All Coaches
              </h2>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Complete payment history overview. Showing latest 5 successful payments per page.
              </p>

              {/* Filter Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '15px',
                marginBottom: '20px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold', 
                    color: '#145a32',
                    fontSize: '14px'
                  }}>
                    Filter by Coach:
                  </label>
                  <select
                    value={paymentHistoryCoachFilter}
                    onChange={(e) => {
                      setPaymentHistoryCoachFilter(e.target.value);
                      setPaymentHistoryCurrentPage(1); // Reset to first page
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="">All Coaches</option>
                    {coaches.map(coach => (
                      <option key={coach._id} value={`${coach.firstname} ${coach.lastname}`}>
                        {coach.firstname} {coach.lastname}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold', 
                    color: '#145a32',
                    fontSize: '14px'
                  }}>
                    Filter by Date:
                  </label>
                  <input
                    type="date"
                    value={paymentHistoryDateFilter}
                    onChange={(e) => {
                      setPaymentHistoryDateFilter(e.target.value);
                      setPaymentHistoryCurrentPage(1); // Reset to first page
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    onClick={() => {
                      setPaymentHistoryCoachFilter('');
                      setPaymentHistoryDateFilter('');
                      setPaymentHistoryCurrentPage(1);
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {(() => {
                const filteredData = getFilteredPaymentHistory();
                return filteredData.totalItems > 0 ? (
                  <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{ background: '#145a32', color: 'white', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'left' }}>Coach</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Payment Date</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.items.map((payment, index) => (
                          <tr key={payment._id} style={{ 
                            backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                            borderBottom: '1px solid #e9ecef'
                          }}>
                            <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '500' }}>
                              {payment.coachName}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                              ₱{payment.amount.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: payment.status === 'completed' ? '#28a745' : '#dc3545',
                                background: payment.status === 'completed' ? '#d4edda' : '#f8d7da',
                                border: `1px solid ${payment.status === 'completed' ? '#c3e6cb' : '#f5c6cb'}`
                              }}>
                                {payment.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    {filteredData.totalPages > 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f8f9fa',
                        borderRadius: '8px'
                      }}>
                        <button
                          onClick={() => setPaymentHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={filteredData.currentPage === 1}
                          style={{
                            background: filteredData.currentPage === 1 ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: filteredData.currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          ← Previous
                        </button>

                        <span style={{
                          fontWeight: 'bold',
                          color: '#145a32',
                          fontSize: '16px',
                          padding: '0 15px'
                        }}>
                          Page {filteredData.currentPage} of {filteredData.totalPages}
                        </span>
                        <span style={{
                          color: '#666',
                          fontSize: '14px'
                        }}>
                          ({filteredData.totalItems} total records)
                        </span>

                        <button
                          onClick={() => setPaymentHistoryCurrentPage(prev => Math.min(prev + 1, filteredData.totalPages))}
                          disabled={filteredData.currentPage === filteredData.totalPages}
                          style={{
                            background: filteredData.currentPage === filteredData.totalPages ? '#ccc' : '#145a32',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '5px',
                            cursor: filteredData.currentPage === filteredData.totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#666',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    fontStyle: 'italic'
                  }}>
                    {paymentHistoryCoachFilter || paymentHistoryDateFilter ? 
                      'No payment records found matching your filters. Try adjusting your search criteria.' :
                      'No successful payment records found.'
                    }
                  </div>
                );
              })()}
            </div>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '25px',
              borderTop: '1px solid #e9ecef',
              paddingTop: '20px'
            }}>
              <button
                onClick={() => setShowPaymentHistoryModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History Modal */}
      {showPayslipHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '900px',
            width: '95%',
            maxHeight: '85%',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '2px solid #145a32',
              paddingBottom: '15px'
            }}>
              <h2 style={{ 
                color: '#145a32', 
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                Payslip History - All Coaches
              </h2>
              <button
                onClick={() => setShowPayslipHistoryModal(false)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Showing latest 5 successful payments per page. Use filters to search specific records.
              </p>

              {/* Filter Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr auto',
                gap: '15px',
                marginBottom: '20px',
                padding: '20px',
                background: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                                 <div>
                   <label style={{ 
                     display: 'block', 
                     marginBottom: '5px', 
                     fontWeight: 'bold', 
                     color: '#145a32',
                     fontSize: '14px'
                   }}>
                     Filter by Coach:
                   </label>
                   <select
                     value={historyCoachFilter}
                     onChange={(e) => {
                       setHistoryCoachFilter(e.target.value);
                       setHistoryCurrentPage(1); // Reset to first page
                     }}
                     style={{
                       width: '100%',
                       padding: '8px 12px',
                       border: '1px solid #ccc',
                       borderRadius: '6px',
                       fontSize: '14px',
                       backgroundColor: 'white'
                     }}
                   >
                     <option value="">All Coaches</option>
                     {coaches.map(coach => (
                       <option key={coach._id} value={`${coach.firstname} ${coach.lastname}`}>
                         {coach.firstname} {coach.lastname}
                       </option>
                     ))}
                   </select>
                 </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '5px', 
                    fontWeight: 'bold', 
                    color: '#145a32',
                    fontSize: '14px'
                  }}>
                    Filter by Date:
                  </label>
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => {
                      setHistoryDateFilter(e.target.value);
                      setHistoryCurrentPage(1); // Reset to first page
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    onClick={() => {
                      setHistoryCoachFilter('');
                      setHistoryDateFilter('');
                      setHistoryCurrentPage(1);
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '8px 15px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              </div>

              {(() => {
                const filteredData = getFilteredPayrollHistory();
                return filteredData.totalItems > 0 ? (
                <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: '#145a32', color: 'white', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'left' }}>Coach</th>
                        <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Payment Date</th>
                        <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'right' }}>Amount</th>
                        <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Status</th>
                        <th style={{ padding: '15px 12px', border: '1px solid #ddd', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                                         <tbody>
                       {filteredData.items.map((payment, index) => (
                        <tr key={payment._id} style={{ 
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '500' }}>
                            {payment.coachName}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                            {new Date(payment.paymentDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                            ₱{payment.amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              color: payment.status === 'completed' ? '#28a745' : '#dc3545',
                              background: payment.status === 'completed' ? '#d4edda' : '#f8d7da',
                              border: `1px solid ${payment.status === 'completed' ? '#c3e6cb' : '#f5c6cb'}`
                            }}>
                              {payment.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        const coach = coaches.find(c => `${c.firstname} ${c.lastname}` === payment.coachName);
                        if (coach) {
                          const coachEarning = earnings.find(e => e.coach._id === coach._id);
                          generatePayslip(coach, {
                            amount: payment.amount,
                            paymentDate: payment.paymentDate,
                            status: payment.status
                          }, coachEarning || {});
                        }
                      }}
                      style={{
                        background: '#145a32',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                margin: '0 auto'
                              }}
                              title="Generate and print payslip"
                            >
                              🖨️ View & Print
                            </button>
                          </td>
                        </tr>
                      ))}
                                         </tbody>
                   </table>

                   {/* Pagination Controls */}
                   {filteredData.totalPages > 1 && (
                     <div style={{
                       display: 'flex',
                       justifyContent: 'center',
                       alignItems: 'center',
                       gap: '10px',
                       marginTop: '20px',
                       padding: '15px',
                       background: '#f8f9fa',
                       borderRadius: '8px'
                     }}>
                       <button
                         onClick={() => setHistoryCurrentPage(prev => Math.max(prev - 1, 1))}
                         disabled={filteredData.currentPage === 1}
                         style={{
                           background: filteredData.currentPage === 1 ? '#ccc' : '#145a32',
                        color: 'white',
                        border: 'none',
                        padding: '8px 15px',
                           borderRadius: '5px',
                           cursor: filteredData.currentPage === 1 ? 'not-allowed' : 'pointer',
                           fontSize: '14px',
                           fontWeight: 'bold'
                         }}
                       >
                         ← Previous
                       </button>

                       <span style={{
                         fontWeight: 'bold',
                         color: '#145a32',
                         fontSize: '16px',
                         padding: '0 15px'
                       }}>
                         Page {filteredData.currentPage} of {filteredData.totalPages}
                       </span>
                       <span style={{
                         color: '#666',
                         fontSize: '14px'
                       }}>
                         ({filteredData.totalItems} total records)
                       </span>

                       <button
                         onClick={() => setHistoryCurrentPage(prev => Math.min(prev + 1, filteredData.totalPages))}
                         disabled={filteredData.currentPage === filteredData.totalPages}
                         style={{
                           background: filteredData.currentPage === filteredData.totalPages ? '#ccc' : '#145a32',
                           color: 'white',
                           border: 'none',
                           padding: '8px 15px',
                           borderRadius: '5px',
                           cursor: filteredData.currentPage === filteredData.totalPages ? 'not-allowed' : 'pointer',
                           fontSize: '14px',
                           fontWeight: 'bold'
                         }}
                       >
                         Next →
                       </button>
                     </div>
                   )}
                 </div>
               ) : (
                 <div style={{
                   textAlign: 'center',
                   padding: '40px',
                   color: '#666',
                   background: '#f8f9fa',
                   borderRadius: '8px',
                   fontStyle: 'italic'
                 }}>
                   {historyCoachFilter || historyDateFilter ? 
                     'No payroll records found matching your filters. Try adjusting your search criteria.' :
                     'No successful payroll records found.'
                   }
                 </div>
               );
              })()}
            </div>

            <div style={{ 
              textAlign: 'center', 
              marginTop: '25px',
              borderTop: '1px solid #e9ecef',
              paddingTop: '20px'
            }}>
              <button
                onClick={() => setShowPayslipHistoryModal(false)}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '6px',
                  fontSize: '14px',
                        cursor: 'pointer',
                  fontWeight: 'bold'
                      }}
                    >
                Close
                    </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Modal */}
      {showBreakdownModal && selectedCoachBreakdown && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80%',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px',
              borderBottom: '2px solid #145a32',
              paddingBottom: '15px'
            }}>
              <h2 style={{ 
                color: '#145a32', 
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                Class Breakdown: {selectedCoachBreakdown.coach.firstname} {selectedCoachBreakdown.coach.lastname}
              </h2>
              <button
                onClick={() => {
                  setShowBreakdownModal(false);
                  setSelectedCoachBreakdown(null);
                }}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close"
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '25px'
              }}>
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Classes</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#145a32' }}>
                    {selectedCoachBreakdown.totalClasses || 0}
                  </div>
                </div>
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Clients</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#145a32' }}>
                    {selectedCoachBreakdown.totalClients || 0}
                  </div>
                </div>
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Total Revenue</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#145a32' }}>
                    ₱{(selectedCoachBreakdown.totalRevenue || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  background: '#e8f5e8',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #d4edda'
                }}>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>Coach Salary (50%)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                    ₱{(selectedCoachBreakdown.coachShare || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <h3 style={{ color: '#145a32', marginBottom: '15px', fontSize: '18px' }}>Class-by-Class Breakdown</h3>
              {selectedCoachBreakdown.classBreakdown && selectedCoachBreakdown.classBreakdown.length > 0 ? (
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ background: '#145a32', color: 'white' }}>
                        <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'left' }}>Class Type</th>
                        <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                        <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'center' }}>Clients</th>
                        <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>Revenue</th>
                        <th style={{ padding: '12px 8px', border: '1px solid #ddd', textAlign: 'right' }}>Coach Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCoachBreakdown.classBreakdown.map((c, i) => (
                        <tr key={i} style={{ 
                          backgroundColor: i % 2 === 0 ? '#f8f9fa' : 'white',
                          borderBottom: '1px solid #e9ecef'
                        }}>
                          <td style={{ padding: '10px 8px', border: '1px solid #ddd', fontWeight: '500' }}>
                            {c.className}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #ddd' }}>
                            {new Date(c.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'center' }}>
                            {c.clientCount}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '500' }}>
                            ₱{c.revenue.toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold', color: '#28a745' }}>
                            ₱{c.coachShare.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: '#666',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontStyle: 'italic'
                }}>
                  No class breakdown available for this period.
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '25px' }}>
              <button
                onClick={() => {
                  setShowBreakdownModal(false);
                  setSelectedCoachBreakdown(null);
                }}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 25px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll; 