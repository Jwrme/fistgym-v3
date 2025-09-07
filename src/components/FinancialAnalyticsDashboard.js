import React, { useState, useEffect, useRef } from 'react';
import { FaChartLine, FaChartBar, FaChartPie, FaCalendarAlt, FaUsers, FaMoneyBillWave, FaTrophy, FaDownload, FaSync, FaHistory, FaTimes, FaEye } from 'react-icons/fa';

const FinancialAnalyticsDashboard = () => {
  // State for all data
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [membershipData, setMembershipData] = useState({});
  const [timeFilter, setTimeFilter] = useState('month'); // week, month, year
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // 0 = current month, -1 = previous month, etc.
  const [hasDataForPreviousMonth, setHasDataForPreviousMonth] = useState(false);
  const [pdfHistory, setPdfHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalRevenue: 0,
    totalProfit: 0,
    activeMembers: 0,
    totalClasses: 0,
    topCoach: null,
    popularClass: null,
    revenueGrowth: 0,
    membershipGrowth: 0
  });

  // Chart canvas refs
  const revenueChartRef = useRef(null);
  const classChartRef = useRef(null);
  const coachChartRef = useRef(null);
  const membershipChartRef = useRef(null);

  // Helper function to check if there's data for previous months
  const checkDataAvailability = async () => {
    try {
      // Check if there's any earnings data for the previous month
      const prevMonthRange = getDateRangeForOffset(-1);
      
      const coachesRes = await fetch('http://localhost:3001/api/coaches');
      const coachesData = await coachesRes.json();
      
      if (!coachesData || coachesData.length === 0) {
        setHasDataForPreviousMonth(false);
        return;
      }

      // Check earnings for previous month
      const earningsPromises = coachesData.map(coach =>
        fetch(`http://localhost:3001/api/payroll/data/${coach._id}?start=${prevMonthRange.startDate}&end=${prevMonthRange.endDate}`)
          .then(res => res.json())
          .then(data => data.totalRevenue || 0)
      );
      
      const earningsResults = await Promise.all(earningsPromises);
      const hasEarningsData = earningsResults.some(revenue => revenue > 0);
      
      // Check membership applications for previous month
      const membershipRes = await fetch('http://localhost:3001/api/membership-applications');
      const membershipData = await membershipRes.json();
      
      const prevMonthStartDate = new Date(prevMonthRange.startDate);
      const prevMonthEndDate = new Date(prevMonthRange.endDate);
      
      const hasMembershipData = (membershipData.applications || []).some(app => {
        if (!app.date) return false;
        const appDate = new Date(app.date);
        return appDate >= prevMonthStartDate && appDate <= prevMonthEndDate;
      });
      
      setHasDataForPreviousMonth(hasEarningsData || hasMembershipData);
      
    } catch (error) {
      console.error('Error checking data availability:', error);
      setHasDataForPreviousMonth(false);
    }
  };

  // Helper function to get date range for specific offset
  const getDateRangeForOffset = (offset) => {
    const now = new Date();
    const targetMonth = now.getMonth() + offset;
    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
    const adjustedMonth = ((targetMonth % 12) + 12) % 12;
    
    const startDate = new Date(targetYear, adjustedMonth, 1);
    const endDate = new Date(targetYear, adjustedMonth + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Helper function to get date range based on timeFilter
  const getDateRange = (filter) => {
    const now = new Date();
    let startDate, endDate;

    switch (filter) {
      case 'week':
        // Get start of current week (Monday)
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'month':
        // Get start and end of current month (with offset)
        const targetMonth = now.getMonth() + currentMonthOffset;
        const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
        const adjustedMonth = ((targetMonth % 12) + 12) % 12;
        
        startDate = new Date(targetYear, adjustedMonth, 1);
        endDate = new Date(targetYear, adjustedMonth + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      case 'year':
        // Get start and end of current year
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      
      default:
        // Default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Load PDF history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('pdfExportHistory');
    if (savedHistory) {
      setPdfHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Fetch all data
  useEffect(() => {
    fetchDashboardData();
    if (timeFilter === 'month') {
      checkDataAvailability();
    }
  }, [timeFilter, currentMonthOffset]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Calculate date range based on timeFilter
      const { startDate, endDate } = getDateRange(timeFilter);
      
      // Fetch coaches
      const coachesRes = await fetch('http://localhost:3001/api/coaches');
      const coachesData = await coachesRes.json();
      setCoaches(coachesData || []);

      // Fetch earnings for all coaches with date filtering
      const earningsPromises = (coachesData || []).map(coach =>
        fetch(`http://localhost:3001/api/payroll/data/${coach._id}?start=${startDate}&end=${endDate}`)
          .then(res => res.json())
          .then(data => ({ coach, ...data }))
      );
      const earningsData = await Promise.all(earningsPromises);
      setEarnings(earningsData);

      // Fetch membership data
      const membershipRes = await fetch('http://localhost:3001/api/membership-applications');
      const membershipData = await membershipRes.json();
      setMembershipData(membershipData);
      
      // Calculate dashboard metrics
      calculateDashboardMetrics(earningsData, membershipData);
      
      // Generate charts
      setTimeout(() => {
        generateCharts(earningsData, membershipData);
      }, 100);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardMetrics = (earningsData, membershipData) => {
    const { startDate, endDate } = getDateRange(timeFilter);
    const filterStartDate = new Date(startDate);
    const filterEndDate = new Date(endDate);
    
    const totalRevenue = earningsData.reduce((sum, e) => sum + (e.totalRevenue || 0), 0);
    const totalCoachPayments = earningsData.reduce((sum, e) => sum + (e.coachShare || 0), 0);
    
    // Filter membership applications by date range
    const filteredApps = (membershipData.applications || []).filter(app => {
      if (!app.date) return false;
      const appDate = new Date(app.date);
      return appDate >= filterStartDate && appDate <= filterEndDate;
    });
    
    const membershipEarnings = filteredApps.filter(app => 
      app.status === 'approved' && 
      app.expirationDate && 
      new Date(app.expirationDate) > new Date()
    ).length * 1000;
    const totalProfit = totalRevenue - totalCoachPayments + membershipEarnings;
    const activeMembers = filteredApps.filter(app => 
      app.status === 'approved' && 
      app.expirationDate && 
      new Date(app.expirationDate) > new Date()
    ).length;
    const totalClasses = earningsData.reduce((sum, e) => sum + (e.totalClasses || 0), 0);
    
    // Find top performing coach
    const topCoach = earningsData.reduce((top, current) => 
      (current.totalRevenue || 0) > (top.totalRevenue || 0) ? current : top, earningsData[0]);

    // Find most popular class
    const classPopularity = {};
    earningsData.forEach(e => {
      if (e.classBreakdown) {
        e.classBreakdown.forEach(c => {
          const className = c.className.replace(' Package', '');
          classPopularity[className] = (classPopularity[className] || 0) + c.clientCount;
        });
      }
    });
    const popularClass = Object.keys(classPopularity).reduce((a, b) => 
      classPopularity[a] > classPopularity[b] ? a : b, Object.keys(classPopularity)[0]);

    setDashboardData({
      totalRevenue,
      totalProfit,
      activeMembers,
      totalClasses,
      topCoach: topCoach?.coach,
      popularClass,
      revenueGrowth: 12.5, // You can calculate this from historical data
      membershipGrowth: 8.3,
    });
  };

  const generateCharts = (earningsData, membershipData) => {
    // Generate Revenue Trend Chart
    generateRevenueChart(earningsData);
    
    // Generate Class Performance Chart
    generateClassChart(earningsData);
    
    // Generate Coach Performance Chart
    generateCoachChart(earningsData);
    
    // Generate Membership Chart
    generateMembershipChart(membershipData);
  };

  const generateRevenueChart = (earningsData) => {
    const canvas = revenueChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    ctx.clearRect(0, 0, width, height);
    
    // Sample revenue data by month (you can make this dynamic)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const revenueData = [45000, 52000, 48000, 61000, 55000, 67000];
    const profitData = [22500, 26000, 24000, 30500, 27500, 33500];
    
    // Draw chart
    drawLineChart(ctx, width, height, months, [
      { label: 'Revenue', data: revenueData, color: '#2ecc40' },
      { label: 'Profit', data: profitData, color: '#3498db' }
    ]);
  };

  const generateClassChart = (earningsData) => {
    const canvas = classChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    ctx.clearRect(0, 0, width, height);
    
    // Aggregate class data
    const classData = {};
    earningsData.forEach(e => {
      if (e.classBreakdown) {
        e.classBreakdown.forEach(c => {
          const className = c.className.replace(' Package', '');
          classData[className] = (classData[className] || 0) + c.revenue;
        });
      }
    });
    
    const labels = Object.keys(classData).slice(0, 6);
    const values = labels.map(label => classData[label]);
    const colors = ['#e74c3c', '#3498db', '#2ecc40', '#f39c12', '#9b59b6', '#1abc9c'];
    
    drawBarChart(ctx, width, height, labels, values, colors);
  };

  const generateCoachChart = (earningsData) => {
    const canvas = coachChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    ctx.clearRect(0, 0, width, height);
    
    const coachRevenues = earningsData.map(e => ({
      name: `${e.coach?.firstname || ''} ${e.coach?.lastname || ''}`.trim(),
      revenue: e.totalRevenue || 0
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    
    const labels = coachRevenues.map(c => c.name);
    const values = coachRevenues.map(c => c.revenue);
    const colors = ['#2ecc40', '#3498db', '#e74c3c', '#f39c12', '#9b59b6'];
    
    drawPieChart(ctx, width, height, labels, values, colors);
  };

  const generateMembershipChart = (membershipData) => {
    const canvas = membershipChartRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 300;
    
    ctx.clearRect(0, 0, width, height);
    
    const apps = membershipData.applications || [];
    // Only count active memberships (approved + not expired) and pending applications
    const activeMemberships = apps.filter(app => 
      app.status === 'approved' && 
      app.expirationDate && 
      new Date(app.expirationDate) > new Date()
    ).length;
    const pendingApplications = apps.filter(app => app.status === 'pending').length;
    
    const data = [
      { label: 'Active Memberships', value: activeMemberships, color: '#2ecc40' },
      { label: 'Pending Applications', value: pendingApplications, color: '#f39c12' }
    ];
    
    drawDoughnutChart(ctx, width, height, data);
  };

  // Chart drawing functions
  const drawLineChart = (ctx, width, height, labels, datasets) => {
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Get max value
    const maxValue = Math.max(...datasets.flatMap(d => d.data));
    const step = chartWidth / (labels.length - 1);
    
    // Draw grid
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();
    }
    
    // Draw datasets
    datasets.forEach(dataset => {
      ctx.strokeStyle = dataset.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      dataset.data.forEach((value, index) => {
        const x = margin.left + step * index;
        const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        // Draw points
        ctx.fillStyle = dataset.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.stroke();
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
      const x = margin.left + step * index;
      ctx.fillText(label, x, height - 10);
    });
  };

  const drawBarChart = (ctx, width, height, labels, values, colors) => {
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const barWidth = chartWidth / labels.length * 0.8;
    const maxValue = Math.max(...values);
    
    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * chartHeight;
      const x = margin.left + (chartWidth / labels.length) * index + (chartWidth / labels.length - barWidth) / 2;
      const y = margin.top + chartHeight - barHeight;
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw value on top
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('₱' + value.toLocaleString(), x + barWidth/2, y - 5);
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    labels.forEach((label, index) => {
      const x = margin.left + (chartWidth / labels.length) * index + (chartWidth / labels.length) / 2;
      ctx.fillText(label, x, height - 10);
    });
  };

  const drawPieChart = (ctx, width, height, labels, values, colors) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;
    const total = values.reduce((sum, val) => sum + val, 0);
    
    let currentAngle = -Math.PI / 2;
    
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;
      
      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();
      
      // Draw label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(labels[index], labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  };

  const drawDoughnutChart = (ctx, width, height, data) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius * 0.6;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    let currentAngle = -Math.PI / 2;
    
    data.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fill();
      
      currentAngle += sliceAngle;
    });
    
    // Draw center text
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Total: ${total}`, centerX, centerY);
  };

  const exportToPDF = () => {
    // Save to history
    const exportRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      period: timeFilter,
      monthOffset: currentMonthOffset,
      data: {
        totalRevenue: dashboardData.totalRevenue,
        totalProfit: dashboardData.totalProfit,
        activeMembers: dashboardData.activeMembers,
        totalClasses: dashboardData.totalClasses,
        popularClass: dashboardData.popularClass
      }
    };
    
    const updatedHistory = [exportRecord, ...pdfHistory.slice(0, 49)]; // Keep last 50 exports
    setPdfHistory(updatedHistory);
    localStorage.setItem('pdfExportHistory', JSON.stringify(updatedHistory));

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const { startDate, endDate } = getDateRange(timeFilter);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Analytics Report - ${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: white; }
                     .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2ecc40; padding-bottom: 20px; }
           .header h1 { color: #2c3e50; font-size: 24px; margin-bottom: 10px; }
           .header img { max-height: 60px; height: auto; width: auto; }
          .header p { color: #7f8c8d; font-size: 14px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #2ecc40; }
          .metric-card h3 { color: #2c3e50; font-size: 14px; margin-bottom: 10px; }
          .metric-card .value { font-size: 20px; font-weight: bold; color: #2c3e50; }
          .metric-card .growth { font-size: 12px; color: #27ae60; margin-top: 5px; }
          .table-section { margin: 30px 0; }
          .table-section h3 { color: #2c3e50; margin-bottom: 15px; font-size: 18px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
          th { background: #f8f9fa; font-weight: bold; color: #2c3e50; }
          .status-approved { color: #27ae60; font-weight: bold; }
          .status-pending { color: #f39c12; font-weight: bold; }
          .status-rejected { color: #e74c3c; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #dee2e6; padding-top: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .metric-card { page-break-inside: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
                 <div class="header">
           <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
             <img src="/Fist gym logo.png" alt="Fist Gym Logo" style="height: 60px; margin-right: 15px;" />
             <h1 style="margin: 0; color: #2c3e50; font-size: 24px;">FIST GYM - Financial Analytics Report</h1>
           </div>
           <p>Period: ${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)} (${startDate} to ${endDate})</p>
           <p>Generated on: ${new Date().toLocaleDateString('en-US', { 
             year: 'numeric', 
             month: 'long', 
             day: 'numeric',
             hour: '2-digit',
             minute: '2-digit'
           })}</p>
         </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Revenue</h3>
            <div class="value">₱${dashboardData.totalRevenue.toLocaleString()}</div>
            <div class="growth">↗ +${dashboardData.revenueGrowth}% vs last period</div>
          </div>
          <div class="metric-card">
            <h3>Net Profit</h3>
            <div class="value">₱${dashboardData.totalProfit.toLocaleString()}</div>
            <div class="growth">↗ +15.2% vs last period</div>
          </div>
          <div class="metric-card">
            <h3>Active Members</h3>
            <div class="value">${dashboardData.activeMembers}</div>
            <div class="growth">↗ +${dashboardData.membershipGrowth}% vs last period</div>
          </div>
          <div class="metric-card">
            <h3>Total Classes</h3>
            <div class="value">${dashboardData.totalClasses}</div>
            <div class="growth">Top: ${dashboardData.popularClass || 'N/A'}</div>
          </div>
        </div>

        <div class="table-section">
          <h3>Coach Performance Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Coach Name</th>
                <th>Total Classes</th>
                <th>Total Clients</th>
                <th>Revenue</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              ${earnings.map(earning => `
                <tr>
                  <td>${earning.coach?.firstname || ''} ${earning.coach?.lastname || ''}</td>
                  <td>${earning.totalClasses || 0}</td>
                  <td>${earning.totalClients || 0}</td>
                  <td>₱${(earning.totalRevenue || 0).toLocaleString()}</td>
                  <td>${earning.totalRevenue > 30000 ? 'Excellent' : earning.totalRevenue > 15000 ? 'Good' : 'Average'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-section">
          <h3>Membership Applications</h3>
          <table>
            <thead>
              <tr>
                <th>Member Name</th>
                <th>Status</th>
                <th>Application Date</th>
                <th>Expiration Date</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${(membershipData.applications || [])
                .filter(app => 
                  app.status === 'approved' && 
                  app.expirationDate && 
                  new Date(app.expirationDate) > new Date()
                )
                .map(app => `
                <tr>
                  <td>${app.name || 'N/A'}</td>
                  <td class="status-approved">Active</td>
                  <td>${app.date ? new Date(app.date).toLocaleDateString() : 'N/A'}</td>
                  <td>${app.expirationDate ? new Date(app.expirationDate).toLocaleDateString() : 'N/A'}</td>
                  <td>₱1,000</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="table-section">
          <h3>Revenue Summary</h3>
          <table>
            <tr>
              <td><strong>Coach Training Revenue</strong></td>
              <td><strong>₱${earnings.reduce((sum, e) => sum + (e.totalRevenue || 0), 0).toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td><strong>Membership Revenue</strong></td>
              <td><strong>₱${((membershipData.applications || []).filter(app => 
                app.status === 'approved' && 
                app.expirationDate && 
                new Date(app.expirationDate) > new Date()
              ).length * 1000).toLocaleString()}</strong></td>
            </tr>
            <tr>
              <td><strong>Coach Payments</strong></td>
              <td><strong>₱${earnings.reduce((sum, e) => sum + (e.coachShare || 0), 0).toLocaleString()}</strong></td>
            </tr>
            <tr style="background: #f8f9fa; font-weight: bold; border-top: 2px solid #2ecc40;">
              <td><strong>Total Net Profit</strong></td>
              <td style="color: #27ae60;"><strong>₱${dashboardData.totalProfit.toLocaleString()}</strong></td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>This report was generated automatically by FIST GYM Financial Analytics System</p>
          <p>For questions or clarifications, please contact the administration.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Close window after printing
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };

  // Function to regenerate PDF from history data
  const viewHistoryPDF = (historyRecord) => {
    const printWindow = window.open('', '_blank');
    
    // Calculate date range from history record
    const exportDate = new Date(historyRecord.date);
    const period = historyRecord.period;
    const monthOffset = historyRecord.monthOffset || 0;
    
    let startDate, endDate;
    
    if (period === 'month') {
      const targetMonth = exportDate.getMonth() + monthOffset;
      const targetYear = exportDate.getFullYear() + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12;
      
      startDate = new Date(targetYear, adjustedMonth, 1).toISOString().split('T')[0];
      endDate = new Date(targetYear, adjustedMonth + 1, 0).toISOString().split('T')[0];
    } else if (period === 'week') {
      // For week, use the week of the export date
      const day = exportDate.getDay();
      const diff = exportDate.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(exportDate.setDate(diff));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      startDate = weekStart.toISOString().split('T')[0];
      endDate = weekEnd.toISOString().split('T')[0];
    } else {
      // For year
      startDate = new Date(exportDate.getFullYear(), 0, 1).toISOString().split('T')[0];
      endDate = new Date(exportDate.getFullYear(), 11, 31).toISOString().split('T')[0];
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Analytics Report - ${period.charAt(0).toUpperCase() + period.slice(1)} (${new Date(historyRecord.date).toLocaleDateString()})</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; background: white; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2ecc40; padding-bottom: 20px; }
          .header h1 { color: #2c3e50; font-size: 24px; margin-bottom: 10px; }
          .header img { max-height: 60px; height: auto; width: auto; }
          .header p { color: #7f8c8d; font-size: 14px; }
          .archived-notice { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center; }
          .archived-notice h3 { color: #856404; margin-bottom: 5px; }
          .archived-notice p { color: #856404; font-size: 14px; margin: 0; }
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #2ecc40; }
          .metric-card h3 { color: #2c3e50; font-size: 14px; margin-bottom: 10px; }
          .metric-card .value { font-size: 20px; font-weight: bold; color: #2c3e50; }
          .metric-card .growth { font-size: 12px; color: #27ae60; margin-top: 5px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #dee2e6; padding-top: 20px; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .metric-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
            <img src="/Fist gym logo.png" alt="Fist Gym Logo" style="height: 60px; margin-right: 15px;" />
            <h1 style="margin: 0; color: #2c3e50; font-size: 24px;">FIST GYM - Financial Analytics Report (ARCHIVED)</h1>
          </div>
          <p>Period: ${period.charAt(0).toUpperCase() + period.slice(1)} (${startDate} to ${endDate})</p>
          <p>Originally Generated: ${new Date(historyRecord.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p>Viewed Again: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="archived-notice">
          <h3>📋 Archived Report</h3>
          <p>This is a historical snapshot of data from ${new Date(historyRecord.date).toLocaleDateString()}. Current data may differ.</p>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Revenue</h3>
            <div class="value">₱${historyRecord.data.totalRevenue.toLocaleString()}</div>
            <div class="growth">Historical Data</div>
          </div>
          <div class="metric-card">
            <h3>Net Profit</h3>
            <div class="value">₱${historyRecord.data.totalProfit.toLocaleString()}</div>
            <div class="growth">Historical Data</div>
          </div>
          <div class="metric-card">
            <h3>Active Members</h3>
            <div class="value">${historyRecord.data.activeMembers}</div>
            <div class="growth">Historical Data</div>
          </div>
          <div class="metric-card">
            <h3>Total Classes</h3>
            <div class="value">${historyRecord.data.totalClasses}</div>
            <div class="growth">Top: ${historyRecord.data.popularClass || 'N/A'}</div>
          </div>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-bottom: 15px;">📊 Report Summary</h3>
          <p><strong>Export Period:</strong> ${period.charAt(0).toUpperCase() + period.slice(1)}</p>
          <p><strong>Date Range:</strong> ${startDate} to ${endDate}</p>
          <p><strong>Total Revenue:</strong> ₱${historyRecord.data.totalRevenue.toLocaleString()}</p>
          <p><strong>Net Profit:</strong> ₱${historyRecord.data.totalProfit.toLocaleString()}</p>
          <p><strong>Active Members:</strong> ${historyRecord.data.activeMembers}</p>
          <p><strong>Total Classes:</strong> ${historyRecord.data.totalClasses}</p>
          <p><strong>Most Popular Class:</strong> ${historyRecord.data.popularClass || 'N/A'}</p>
        </div>

        <div class="footer">
          <p>This archived report was generated automatically by FIST GYM Financial Analytics System</p>
          <p>Original export date: ${new Date(historyRecord.date).toLocaleDateString()}</p>
          <p>For current data, please generate a new report from the dashboard.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then show
    setTimeout(() => {
      printWindow.focus();
    }, 500);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading Financial Analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 'bold', color: '#2c3e50', margin: 0, display: 'flex', alignItems: 'center' }}>
            <FaChartLine style={{ marginRight: 12, color: '#2ecc40' }} />
            Financial Analytics Dashboard
          </h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Month Navigation - only show for month filter */}
            {timeFilter === 'month' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fa', padding: '4px', borderRadius: 6, border: '1px solid #ddd' }}>
                <button
                  onClick={() => setCurrentMonthOffset(currentMonthOffset - 1)}
                  disabled={!hasDataForPreviousMonth && currentMonthOffset === 0}
                  style={{ 
                    background: (!hasDataForPreviousMonth && currentMonthOffset === 0) ? '#f5f5f5' : 'white', 
                    border: '1px solid #ddd', 
                    borderRadius: 4, 
                    padding: '6px 10px', 
                    cursor: (!hasDataForPreviousMonth && currentMonthOffset === 0) ? 'not-allowed' : 'pointer', 
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    color: (!hasDataForPreviousMonth && currentMonthOffset === 0) ? '#ccc' : '#666'
                  }}
                  title={(!hasDataForPreviousMonth && currentMonthOffset === 0) ? "No data available for previous months" : "Previous Month"}
                >
                  ← Prev
                </button>
                <span style={{ 
                  fontSize: 13, 
                  fontWeight: 'bold', 
                  color: '#2c3e50', 
                  minWidth: '100px', 
                  textAlign: 'center',
                  padding: '0 8px'
                }}>
                  {(() => {
                    const now = new Date();
                    const targetMonth = now.getMonth() + currentMonthOffset;
                    const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
                    const adjustedMonth = ((targetMonth % 12) + 12) % 12;
                    const date = new Date(targetYear, adjustedMonth, 1);
                    
                    if (currentMonthOffset === 0) {
                      return 'This Month';
                    } else if (currentMonthOffset === -1) {
                      return 'Last Month';
                    } else {
                      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    }
                  })()}
                </span>
                <button
                  onClick={() => setCurrentMonthOffset(currentMonthOffset + 1)}
                  disabled={currentMonthOffset >= 0}
                  style={{ 
                    background: currentMonthOffset >= 0 ? '#f5f5f5' : 'white', 
                    border: '1px solid #ddd', 
                    borderRadius: 4, 
                    padding: '6px 10px', 
                    cursor: currentMonthOffset >= 0 ? 'not-allowed' : 'pointer', 
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    color: currentMonthOffset >= 0 ? '#ccc' : '#666'
                  }}
                  title="Next Month"
                >
                  Next →
                </button>
              </div>
            )}

            <select 
              value={timeFilter} 
              onChange={(e) => {
                setTimeFilter(e.target.value);
                setCurrentMonthOffset(0); // Reset month offset when changing filter
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button 
              onClick={fetchDashboardData}
              style={{ background: '#3498db', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FaSync /> Refresh
            </button>
            <button 
              onClick={exportToPDF}
              style={{ background: '#2ecc40', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FaDownload /> Export PDF
            </button>
            <button 
              onClick={() => setShowHistoryModal(true)}
              style={{ background: '#9b59b6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FaHistory /> History ({pdfHistory.length})
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'linear-gradient(135deg, #2ecc40, #27ae60)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(46,204,64,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Total Revenue</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 'bold' }}>₱{dashboardData.totalRevenue.toLocaleString()}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>↗ +{dashboardData.revenueGrowth}% vs last month</p>
              </div>
              <FaMoneyBillWave style={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(52,152,219,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Net Profit</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 'bold' }}>₱{dashboardData.totalProfit.toLocaleString()}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>↗ +15.2% vs last month</p>
              </div>
              <FaChartLine style={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(231,76,60,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Active Members</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 'bold' }}>{dashboardData.activeMembers}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>↗ +{dashboardData.membershipGrowth}% vs last month</p>
              </div>
              <FaUsers style={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(243,156,18,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>Total Classes</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 'bold' }}>{dashboardData.totalClasses}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.8 }}>Top: {dashboardData.popularClass}</p>
              </div>
              <FaTrophy style={{ fontSize: 32, opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 20 }}>
        {/* Class Performance Chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
            <FaChartBar style={{ marginRight: 8, color: '#3498db' }} />
            Class Revenue Performance
          </h3>
          <canvas ref={classChartRef} style={{ width: '100%', height: '300px' }}></canvas>
        </div>

        {/* Coach Performance Chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
            <FaChartPie style={{ marginRight: 8, color: '#e74c3c' }} />
            Top Coach Performance
          </h3>
          <canvas ref={coachChartRef} style={{ width: '100%', height: '300px' }}></canvas>
        </div>

        {/* Membership Status Chart */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
            <FaUsers style={{ marginRight: 8, color: '#9b59b6' }} />
            Membership Applications
          </h3>
          <canvas ref={membershipChartRef} style={{ width: '100%', height: '300px' }}></canvas>
        </div>
      </div>

      {/* Membership Revenue Breakdown Section */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginTop: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
          <FaMoneyBillWave style={{ marginRight: 8, color: '#2ecc40' }} />
          Membership Revenue Breakdown
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Approved Memberships */}
          <div style={{ background: 'linear-gradient(135deg, #2ecc40, #27ae60)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(46,204,64,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Active Memberships</h4>
              <p style={{ margin: '10px 0', fontSize: 32, fontWeight: 'bold' }}>
                {(membershipData.applications || []).filter(app => 
                  app.status === 'approved' && 
                  app.expirationDate && 
                  new Date(app.expirationDate) > new Date()
                ).length}
              </p>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                <div>₱1,000 per membership</div>
                <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 5 }}>
                  Total: ₱{((membershipData.applications || []).filter(app => 
                    app.status === 'approved' && 
                    app.expirationDate && 
                    new Date(app.expirationDate) > new Date()
                  ).length * 1000).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Memberships */}
          <div style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(243,156,18,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Pending Memberships</h4>
              <p style={{ margin: '10px 0', fontSize: 32, fontWeight: 'bold' }}>
                {(membershipData.applications || []).filter(app => app.status === 'pending').length}
              </p>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                <div>₱1,000 per membership</div>
                <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 5 }}>
                  Potential: ₱{((membershipData.applications || []).filter(app => app.status === 'pending').length * 1000).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Total Membership Revenue */}
          <div style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)', color: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(52,152,219,0.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: 16, opacity: 0.9 }}>Total Membership Revenue</h4>
              <p style={{ margin: '10px 0', fontSize: 32, fontWeight: 'bold' }}>
                ₱{((membershipData.applications || []).filter(app => 
                  app.status === 'approved' && 
                  app.expirationDate && 
                  new Date(app.expirationDate) > new Date()
                ).length * 1000).toLocaleString()}
              </p>
              <div style={{ fontSize: 14, opacity: 0.8 }}>
                <div>From {(membershipData.applications || []).filter(app => 
                  app.status === 'approved' && 
                  app.expirationDate && 
                  new Date(app.expirationDate) > new Date()
                ).length} active members</div>
                <div style={{ fontWeight: 'bold', fontSize: 16, marginTop: 5 }}>
                  Monthly recurring revenue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Membership Table */}
        <div style={{ marginTop: 30 }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Membership Details</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Member Name</th>
                  <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Application Date</th>
                  <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Expiration Date</th>
                  <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {(membershipData.applications || [])
                  .filter(app => 
                    app.status === 'approved' && 
                    app.expirationDate && 
                    new Date(app.expirationDate) > new Date()
                  )
                  .map((app, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: 12 }}>
                      <strong>{app.name || 'N/A'}</strong>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 'bold',
                        background: '#d4edda',
                        color: '#155724'
                      }}>
                        Active
                      </span>
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {app.date ? new Date(app.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      {app.expirationDate ? new Date(app.expirationDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: 12, textAlign: 'right' }}>
                      <strong style={{ color: '#2ecc40' }}>
                        ₱1,000
                      </strong>
                    </td>
                  </tr>
                ))}
                {(!(membershipData.applications || []).filter(app => 
                    app.status === 'approved' && 
                    app.expirationDate && 
                    new Date(app.expirationDate) > new Date()
                  ).length) && (
                  <tr>
                    <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                      No active memberships found
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8f9fa', fontWeight: 'bold' }}>
                  <td style={{ padding: 12 }}>TOTAL</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>
                    {(membershipData.applications || []).filter(app => 
                      app.status === 'approved' && 
                      app.expirationDate && 
                      new Date(app.expirationDate) > new Date()
                    ).length} Active
                  </td>
                  <td style={{ padding: 12, textAlign: 'center' }}>-</td>
                  <td style={{ padding: 12, textAlign: 'center' }}>-</td>
                  <td style={{ padding: 12, textAlign: 'right', color: '#2ecc40', fontSize: 16 }}>
                    ₱{((membershipData.applications || []).filter(app => 
                      app.status === 'approved' && 
                      app.expirationDate && 
                      new Date(app.expirationDate) > new Date()
                    ).length * 1000).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Stats Table */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginTop: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <h3 style={{ margin: '0 0 20px 0', color: '#2c3e50' }}>Quick Performance Stats</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Coach</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Classes</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Clients</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Revenue</th>
                <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((earning, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: 12 }}>
                    <strong>{earning.coach?.firstname} {earning.coach?.lastname}</strong>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{earning.totalClasses || 0}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>{earning.totalClients || 0}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>₱{(earning.totalRevenue || 0).toLocaleString()}</td>
                  <td style={{ padding: 12, textAlign: 'right' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 'bold',
                      background: earning.totalRevenue > 30000 ? '#d4edda' : earning.totalRevenue > 15000 ? '#fff3cd' : '#f8d7da',
                      color: earning.totalRevenue > 30000 ? '#155724' : earning.totalRevenue > 15000 ? '#856404' : '#721c24'
                    }}>
                      {earning.totalRevenue > 30000 ? 'Excellent' : earning.totalRevenue > 15000 ? 'Good' : 'Average'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Export History Modal */}
      {showHistoryModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
                <FaHistory style={{ marginRight: 8, color: '#9b59b6' }} />
                PDF Export History
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <FaTimes /> Close
              </button>
            </div>

            {pdfHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#7f8c8d' }}>
                <FaHistory style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                <p style={{ fontSize: 16, margin: 0 }}>No PDF exports yet</p>
                <p style={{ fontSize: 14, margin: '8px 0 0 0', opacity: 0.7 }}>Export your first PDF report to see history here</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: 12, textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Export Date</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Period</th>
                      <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Revenue</th>
                      <th style={{ padding: 12, textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Profit</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Members</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Classes</th>
                      <th style={{ padding: 12, textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pdfHistory.map((record, index) => (
                      <tr key={record.id} style={{ borderBottom: '1px solid #dee2e6', ':hover': { background: '#f8f9fa' } }}>
                        <td style={{ padding: 12 }}>
                          <div>
                            <strong>{new Date(record.date).toLocaleDateString()}</strong>
                            <div style={{ fontSize: 12, color: '#7f8c8d' }}>
                              {new Date(record.date).toLocaleTimeString()}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span style={{
                            background: record.period === 'month' ? '#3498db' : record.period === 'week' ? '#2ecc40' : '#f39c12',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}>
                            {record.period.charAt(0).toUpperCase() + record.period.slice(1)}
                            {record.monthOffset && record.monthOffset !== 0 && (
                              <span style={{ marginLeft: 4 }}>
                                ({record.monthOffset > 0 ? '+' : ''}{record.monthOffset})
                              </span>
                            )}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold', color: '#2ecc40' }}>
                          ₱{record.data.totalRevenue.toLocaleString()}
                        </td>
                        <td style={{ padding: 12, textAlign: 'right', fontWeight: 'bold', color: '#3498db' }}>
                          ₱{record.data.totalProfit.toLocaleString()}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          {record.data.activeMembers}
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <div>
                            <strong>{record.data.totalClasses}</strong>
                            {record.data.popularClass && (
                              <div style={{ fontSize: 11, color: '#7f8c8d' }}>
                                Top: {record.data.popularClass}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <button
                            onClick={() => viewHistoryPDF(record)}
                            style={{
                              background: '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              cursor: 'pointer',
                              fontSize: 12,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              margin: '0 auto'
                            }}
                            title="View PDF Report"
                          >
                            <FaEye /> View PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pdfHistory.length > 0 && (
                  <div style={{ marginTop: 20, padding: 16, background: '#f8f9fa', borderRadius: 8, textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#7f8c8d' }}>
                      📊 Total Exports: <strong>{pdfHistory.length}</strong> | 
                      Latest: <strong>{new Date(pdfHistory[0]?.date).toLocaleDateString()}</strong>
                    </p>
                    {pdfHistory.length >= 50 && (
                      <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#e67e22' }}>
                        ⚠️ History limited to last 50 exports
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAnalyticsDashboard; 