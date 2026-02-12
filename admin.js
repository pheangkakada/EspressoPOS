// API Configuration
const API_BASE_URL = 'https://nodetest-backend-jwqo.onrender.com/api';

// Global State
let currentPage = 'dashboard';
let currentEditingId = null;
let allMenuItems = [];
let allUsers = [];
let allInvoices = [];
let validCategories = [];
let systemSettings = {};
let KHR_RATE = 4000;

// Initialize Admin Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
    loadDashboardData();
    setupEventListeners();
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            const sidebar = document.querySelector('.admin-sidebar');
            const toggleBtn = document.querySelector('.admin-mobile-toggle');
            if (sidebar.classList.contains('active') && 
                !sidebar.contains(e.target) && 
                !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
});

function initializeAdmin() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // FETCH SETTINGS ON LOAD
    fetch(`${API_BASE_URL}/settings`)
        .then(res => res.json())
        .then(settings => {
            systemSettings = settings; // Store globally
            if (settings.exchangeRate) {
                KHR_RATE = settings.exchangeRate; // Update global variable
                console.log("Admin loaded Exchange Rate:", KHR_RATE);
            }
            updateRateDisplay(settings);
        })
        .catch(err => console.error("Failed to load settings:", err));
    
    // Setup promo checkbox listener
    document.getElementById('item-is-promo')?.addEventListener('change', function() {
        const promoFields = document.getElementById('promo-fields');
        if (this.checked) {
            promoFields.classList.remove('hidden');
            promoFields.style.display = 'block';
        } else {
            promoFields.classList.add('hidden');
            promoFields.style.display = 'none';
        }
    });
}

function toggleSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    sidebar.classList.toggle('active');
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('current-time').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setupEventListeners() {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            navigateTo(page);
            if (window.innerWidth <= 1024) toggleSidebar();
        });
    });

    document.getElementById('search-orders')?.addEventListener('input', function(e) {
        searchOrders(e.target.value);
    });
}
function navigateTo(page) {
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector(`.admin-nav-item[data-page="${page}"]`);
    if (activeItem) activeItem.classList.add('active');

    document.getElementById('page-title').textContent = getPageTitle(page);
    currentPage = page;

    if (page === 'dashboard') {
        showDashboard();
    } else {
        loadPageContent(page);
    }
}

function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard Overview',
        'menu-items': 'Menu Items Management',
        'categories': 'Categories Management',
        'orders': 'All Orders',
        'invoices': 'Invoice Management',
        'sales': 'Sales Reports',
        'users': 'User Management',
        'settings': 'System Settings'
    };
    return titles[page] || 'Admin Dashboard';
}

async function loadDashboardData() {
    try {
        // Load recent orders
        await loadRecentOrders();
        
        // Load menu items count
        const menuResponse = await fetch(`${API_BASE_URL}/admin/menu`);
        if (menuResponse.ok) {
            const menuItems = await menuResponse.json();
            allMenuItems = menuItems;
            document.getElementById('stat-menu-items').textContent = menuItems.length;
        } else {
            console.error('Failed to fetch menu items:', menuResponse.status);
        }

        // Load invoices for stats
        const invoicesResponse = await fetch(`${API_BASE_URL}/invoices`);
        if (invoicesResponse.ok) {
            const invoices = await invoicesResponse.json();
            allInvoices = invoices;
            
            // Update stats
            document.getElementById('stat-total-orders').textContent = invoices.length;
            
            const totalRevenue = invoices
                .filter(inv => inv.status === 'paid')
                .reduce((sum, inv) => sum + (inv.total || 0), 0);
            document.getElementById('stat-total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('error', 'Failed to load dashboard data');
    }
}

async function loadRecentOrders() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices?limit=5`);
        if (response.ok) {
            const orders = await response.json();
            updateRecentOrdersTable(orders);
        }
    } catch (error) {
        console.error('Error loading recent orders:', error);
    }
}

function updateRecentOrdersTable(orders) {
    const tbody = document.getElementById('recent-orders-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    orders.slice(0, 5).forEach(order => {
        const row = document.createElement('tr');
        
        // Determine status badge
        let statusBadge = '';
        if (order.status === 'paid') {
            statusBadge = '<span class="admin-badge badge-success">Paid</span>';
        } else if (order.status === 'pending') {
            statusBadge = '<span class="admin-badge badge-warning">Pending</span>';
        } else {
            statusBadge = '<span class="admin-badge badge-danger">Deleted</span>';
        }

        // Format time
        const orderTime = new Date(order.date || new Date()).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Get correct ID
        const orderId = order.invoiceId || order._id?.substring(0, 8) || order.id?.substring(0, 8) || 'N/A';
        const uniqueId = order._id || order.id || order.invoiceId; // Use full ID for lookup

        row.innerHTML = `
            <td><strong>${orderId}</strong></td>
            <td>${order.table ? `Table ${order.table}` : 'Takeaway'}</td>
            <td>$${order.total?.toFixed(2) || '0.00'}</td>
            <td>${statusBadge}</td>
            <td>${orderTime}</td>
            <td>
                <button class="btn-admin btn-admin-secondary btn-small" onclick="viewInvoice('${uniqueId}')" title="View Receipt">
                    <span class="material-icons-round" style="font-size: 16px;">visibility</span>
                </button>
                <button class="btn-admin btn-admin-danger btn-small" onclick="deleteOrder('${uniqueId}')" title="Delete">
                    <span class="material-icons-round" style="font-size: 16px;">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function searchOrders(searchTerm) {
    const rows = document.querySelectorAll('#recent-orders-body tr');
    const searchLower = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchLower) ? '' : 'none';
    });
}

async function loadPageContent(page) {
    // Hide dashboard
    document.getElementById('dashboard-page').style.display = 'none';
    
    // Show loading state
    const contentDiv = document.getElementById('dynamic-content');
    contentDiv.innerHTML = `
        <div style="min-height: 400px; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center;">
                <span class="material-icons-round" style="font-size: 48px; color: var(--admin-primary); opacity: 0.5;">refresh</span>
                <p style="color: var(--text-muted); margin-top: 10px;">Loading ${getPageTitle(page)}...</p>
            </div>
        </div>
    `;

    try {
        let html = '';
        
        switch(page) {
            case 'menu-items':
                html = await loadMenuItemsPage();
                break;
            case 'categories':
                html = await loadCategoriesPage();
                break;
            case 'invoices':
                html = await loadInvoicesPage();
                break;
            case 'users':
                html = await loadUsersPage();
                break;
            case 'sales': 
                html = await loadReportsPage();
                break;
            case 'settings':
                html = await loadSettingsPage();
                break;
            default:
                html = `<div class="admin-form-container">
                    <h2 style="text-align: center; color: var(--text-muted); margin: 50px 0;">
                        <span class="material-icons-round" style="font-size: 48px;">construction</span>
                        <br>
                        Page under construction
                        <br>
                        <small style="font-weight: normal;">This feature is coming soon!</small>
                    </h2>
                </div>`;
        }
        
        contentDiv.innerHTML = html;
        
        // Initialize menu view if needed
        if (page === 'menu-items') {
            initializeMenuView();
        }
        if (page === 'sales') {
            generateReport(); 
        }
        
    } catch (error) {
        console.error(`Error loading ${page}:`, error);
        contentDiv.innerHTML = `
            <div class="admin-form-container">
                <div style="text-align: center; padding: 40px; color: var(--admin-danger);">
                    <span class="material-icons-round" style="font-size: 48px;">error</span>
                    <h3>Failed to load page</h3>
                    <p>${error.message}</p>
                    <button class="btn-admin btn-admin-primary" onclick="loadPageContent('${page}')">
                        <span class="material-icons-round">refresh</span>
                        Retry
                    </button>
                </div>
            </div>
        `;
    }
}
// ================== SALES REPORT LOGIC ==================

// ================== POWERFUL ANALYTICS REPORT ==================

// 1. Load Chart.js Library Dynamically (if not already loaded)
async function ensureChartLibrary() {
    if (typeof Chart !== 'undefined') return;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// 2. Main Page Loader
async function loadReportsPage() {
    await ensureChartLibrary(); // Wait for charts to load

    // Default to "This Month"
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

    // Fetch All Data Once
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`);
        window.allReportInvoices = await response.json();
    } catch (e) {
        console.error("Error fetching data", e);
    }

    return `
        <div class="report-toolbar">
            <div style="display:flex; align-items:center; gap:10px;">
                <h2 style="margin:0; font-size:20px;">Sales Analytics</h2>
                <div class="date-presets">
                    <button onclick="setReportDate('today')">Today</button>
                    <button onclick="setReportDate('week')">Last 7 Days</button>
                    <button class="active" onclick="setReportDate('month')">This Month</button>
                </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="date" id="report-start" class="admin-form-control" value="${firstDay}">
                <span style="color:#888;">to</span>
                <input type="date" id="report-end" class="admin-form-control" value="${lastDay}">
                <button class="btn-admin btn-admin-primary" onclick="generateReport()">
                    <span class="material-icons-round">filter_alt</span>
                </button>
                <button class="btn-admin btn-admin-secondary" onclick="exportToCSV()" title="Export to Excel">
                    <span class="material-icons-round">download</span>
                </button>
            </div>
        </div>

        <div id="report-content">
            </div>
    `;
}

// 3. Date Preset Helper
function setReportDate(range) {
    const today = new Date();
    let start, end;
    const endStr = today.toISOString().split('T')[0];

    document.querySelectorAll('.date-presets button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    if (range === 'today') {
        start = endStr;
    } else if (range === 'week') {
        const past = new Date();
        past.setDate(today.getDate() - 7);
        start = past.toISOString().split('T')[0];
    } else { // month
        start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    }

    document.getElementById('report-start').value = start;
    document.getElementById('report-end').value = endStr;
    generateReport();
}

// 4. Generate & Render Logic
function generateReport() {
    const startVal = document.getElementById('report-start').value;
    const endVal = document.getElementById('report-end').value;
    
    // Filter Data
    const startObj = new Date(startVal); startObj.setHours(0,0,0,0);
    const endObj = new Date(endVal); endObj.setHours(23,59,59,999);

    const filtered = window.allReportInvoices.filter(inv => {
        if (!inv.date) return false;
        const invDate = new Date(inv.date);
        return inv.status === 'paid' && invDate >= startObj && invDate <= endObj;
    });

    renderAnalytics(filtered);
}

function renderAnalytics(data) {
    const container = document.getElementById('report-content');
    
    // --- A. Calculate KPIs ---
    const totalRev = data.reduce((s, i) => s + (i.total || 0), 0);
    const totalOrders = data.length;
    const avgOrder = totalOrders ? (totalRev / totalOrders) : 0;
    
    // Calculate "Top Item"
    const itemCounts = {};
    data.forEach(inv => inv.items.forEach(i => {
        itemCounts[i.name] = (itemCounts[i.name] || 0) + (i.quantity || 1);
    }));
    const topItemName = Object.keys(itemCounts).sort((a,b) => itemCounts[b] - itemCounts[a])[0] || "N/A";

    // --- B. Prepare Chart Data ---
    // 1. Sales Over Time (Line Chart)
    const salesByDate = {};
    data.forEach(inv => {
        const d = new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        salesByDate[d] = (salesByDate[d] || 0) + inv.total;
    });
    
    // 2. Peak Hours (Bar Chart logic)
    const hours = Array(24).fill(0);
    data.forEach(inv => {
        const h = new Date(inv.date).getHours();
        hours[h]++;
    });

    // --- C. Render HTML Layout ---
    container.innerHTML = `
        <div class="report-grid">
            <div class="report-card">
                <h3>Total Revenue</h3>
                <div class="value" style="color:var(--admin-success);">$${totalRev.toFixed(2)}</div>
                <div class="trend">${data.length} transactions</div>
            </div>
            <div class="report-card">
                <h3>Orders</h3>
                <div class="value">${totalOrders}</div>
                <div class="trend">Completed</div>
            </div>
            <div class="report-card">
                <h3>Avg. Ticket</h3>
                <div class="value">$${avgOrder.toFixed(2)}</div>
                <div class="trend">Per customer</div>
            </div>
            <div class="report-card">
                <h3>Best Seller</h3>
                <div class="value" style="font-size:20px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${topItemName}</div>
                <div class="trend text-success">Most popular</div>
            </div>
        </div>

        <div class="charts-row">
            <div class="chart-container">
                <canvas id="salesChart"></canvas>
            </div>
            <div class="chart-container">
                <h4 style="margin:0 0 10px 0; color:#666;">Peak Hours (Traffic)</h4>
                <canvas id="hoursChart"></canvas>
            </div>
        </div>

        <div class="details-row">
            <div class="detail-box">
                <h3 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">Top Selling Items</h3>
                <div style="height:300px; overflow-y:auto;">
                    ${renderTopItemsList(itemCounts, data)}
                </div>
            </div>
            
            <div class="detail-box">
                <h3 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">Payment Methods</h3>
                <canvas id="paymentChart" style="max-height:250px;"></canvas>
            </div>
        </div>
    `;

    // --- D. Initialize Charts ---
    initCharts(salesByDate, hours, data);
}

// 5. Helper: Render Top Items List
function renderTopItemsList(counts, invoices) {
    // Calculate Revenue per item as well
    const revenuePerItem = {};
    invoices.forEach(inv => inv.items.forEach(i => {
        const itemTotal = i.total || (i.price * i.quantity);
        revenuePerItem[i.name] = (revenuePerItem[i.name] || 0) + itemTotal;
    }));

    // Sort by Qty
    const sorted = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, 10); // Top 10

    return sorted.map((name, index) => `
        <div class="top-item-row">
            <div style="display:flex; align-items:center;">
                <span class="rank-badge rank-${index+1}">${index+1}</span>
                <span style="font-weight:500;">${name}</span>
            </div>
            <div style="text-align:right;">
                <div style="font-weight:bold;">${counts[name]} sold</div>
                <div style="font-size:11px; color:#888;">$${revenuePerItem[name].toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

// 6. Helper: Initialize Chart.js
function initCharts(salesObj, hoursArr, allData) {
    // 1. Sales Chart
    new Chart(document.getElementById('salesChart'), {
        type: 'line',
        data: {
            labels: Object.keys(salesObj),
            datasets: [{
                label: 'Revenue ($)',
                data: Object.values(salesObj),
                borderColor: '#7C4DFF',
                backgroundColor: 'rgba(124, 77, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Sales Trend' }, legend: {display: false} }
        }
    });

    // 2. Hours Chart (When is shop busy?)
    // Filter out 0-5am usually closed
    const activeHours = hoursArr.slice(6, 23); 
    const activeLabels = Array.from({length: 17}, (_, i) => `${i+6}:00`);

    new Chart(document.getElementById('hoursChart'), {
        type: 'bar',
        data: {
            labels: activeLabels,
            datasets: [{
                label: 'Orders',
                data: activeHours,
                backgroundColor: '#FF9800',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, display: false }, x: { grid: {display: false} } }
        }
    });

    // 3. Payment Chart
    const payments = { 'Cash': 0, 'ABA/Card': 0, 'Delivery': 0 };
    allData.forEach(i => {
        let key = 'Cash';
        if(i.paymentMethod === 'card') key = 'ABA/Card';
        if(i.paymentMethod === 'delivery') key = 'Delivery';
        payments[key] += i.total;
    });

    new Chart(document.getElementById('paymentChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(payments),
            datasets: [{
                data: Object.values(payments),
                backgroundColor: ['#4CAF50', '#2196F3', '#FF5722']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'right' } }
        }
    });
}

// 7. Extra Feature: Export to CSV
function exportToCSV() {
    if (!window.allReportInvoices) return;
    
    // Get filter dates
    const startVal = document.getElementById('report-start').value;
    const endVal = document.getElementById('report-end').value;
    
    // Filter again to match view
    const startObj = new Date(startVal); startObj.setHours(0,0,0,0);
    const endObj = new Date(endVal); endObj.setHours(23,59,59,999);
    
    const data = window.allReportInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        return inv.status === 'paid' && invDate >= startObj && invDate <= endObj;
    });

    if (data.length === 0) {
        showNotification('warning', 'No data to export');
        return;
    }

    // Build CSV Content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Invoice ID,Items,Total,Method\n";

    data.forEach(row => {
        const date = new Date(row.date).toLocaleDateString();
        const items = row.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
        const line = `${date},${row.invoiceId},"${items}",${row.total},${row.paymentMethod}`;
        csvContent += line + "\n";
    });

    // Trigger Download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sales_Report_${startVal}_to_${endVal}.csv`);
    document.body.appendChild(link);
    link.click();
    
    showNotification('success', 'Report downloaded successfully!');
}

// --- Helper: Filter and Render Stats ---
function generateReport() {
    const start = document.getElementById('report-start').value;
    const end = document.getElementById('report-end').value;
    document.getElementById('report-content').innerHTML = renderReportData(start, end);
}

function renderReportData(startDate, endDate) {
    if (!window.allReportInvoices || window.allReportInvoices.length === 0) {
        return '<div class="error-state">No invoice data available.</div>';
    }

    const startObj = new Date(startDate); startObj.setHours(0,0,0,0);
    const endObj = new Date(endDate); endObj.setHours(23,59,59,999);

    const filtered = window.allReportInvoices.filter(inv => {
        if (!inv.date) return false;
        const invDate = new Date(inv.date);
        return inv.status === 'paid' && invDate >= startObj && invDate <= endObj;
    });

    if (filtered.length === 0) {
        return `<div style="text-align:center; padding:40px; color:#888;">No sales found in this period.</div>`;
    }

    // 1. Calculate Item Stats & Normal Prices
    const itemStats = {};
    const totalOrders = filtered.length;

    filtered.forEach(inv => {
        if (inv.items) {
            inv.items.forEach(item => {
                const name = item.name || 'Unknown';
                const qty = item.quantity || 0;
                const soldPrice = item.price || 0;
                const itemNet = item.total || (soldPrice * qty);

                if (!itemStats[name]) itemStats[name] = { qty: 0, revenue: 0, normalPrice: 0 };
                
                itemStats[name].qty += qty;
                itemStats[name].revenue += itemNet;
                
                // TRACK NORMAL PRICE (Highest seen)
                if (soldPrice > itemStats[name].normalPrice) {
                    itemStats[name].normalPrice = soldPrice;
                }
            });
        }
    });

    // 2. Compute Totals based on Normal Price
    let grandTotalGross = 0;
    let grandTotalRevenue = 0;

    const topItems = Object.entries(itemStats)
        .map(([name, data]) => {
            const gross = data.normalPrice * data.qty;
            grandTotalGross += gross;
            grandTotalRevenue += data.revenue;

            return { 
                name, 
                qty: data.qty, 
                revenue: data.revenue,
                unitPrice: data.normalPrice, // Uses Normal Price
                discount: gross - data.revenue
            };
        })
        .sort((a, b) => b.revenue - a.revenue);

    const grandTotalDiscount = grandTotalGross - grandTotalRevenue;

    // 3. Render HTML
    return `
        <div class="admin-dashboard-stats" style="margin-bottom: 25px;">
            <div class="admin-stat-card">
                <span class="material-icons-round admin-stat-icon" style="background:#E8F5E9; color:#2E7D32;">payments</span>
                <div class="admin-stat-value">$${grandTotalRevenue.toFixed(2)}</div>
                <div class="admin-stat-label">Net Sales</div>
            </div>
            
            <div class="admin-stat-card">
                <span class="material-icons-round admin-stat-icon" style="background:#FFEBEE; color:#D32F2F;">local_offer</span>
                <div class="admin-stat-value">-$${grandTotalDiscount.toFixed(2)}</div>
                <div class="admin-stat-label">Total Discount</div>
            </div>

            <div class="admin-stat-card">
                <span class="material-icons-round admin-stat-icon" style="background:#E3F2FD; color:#1565C0;">receipt</span>
                <div class="admin-stat-value">${totalOrders}</div>
                <div class="admin-stat-label">Total Orders</div>
            </div>
        </div>

        <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: var(--shadow-soft); margin-bottom: 25px;">
            <h3 style="margin-top:0;">Item Sales Breakdown</h3>
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width:100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="position: sticky; top: 0; background: white; border-bottom: 2px solid #eee;">
                        <tr>
                            <th style="text-align:left; padding:10px;">Item Name</th>
                            <th style="text-align:right; padding:10px;">Normal Price</th>
                            <th style="text-align:center; padding:10px;">Qty Sold</th>
                            <th style="text-align:right; padding:10px;">Net Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topItems.map(item => `
                            <tr style="border-bottom: 1px solid #f5f5f5;">
                                <td style="padding: 10px;">${item.name}</td>
                                <td style="text-align:right; padding: 10px;">$${item.unitPrice.toFixed(2)}</td>
                                <td style="text-align:center; padding: 10px;">${item.qty}</td>
                                <td style="text-align:right; padding: 10px; font-weight: bold;">$${item.revenue.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
// ================== MENU ITEMS PAGE ==================
async function loadMenuItemsPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu`);
        if (!response.ok) throw new Error('Failed to fetch menu items');
        
        validCategories = [];
        // 1. Get Data
        const menuItems = await response.json();

        // 2. SORTING: Active First, then Inactive (Applied to BOTH Table and Grid)
        menuItems.sort((a, b) => {
            // Put Active (true) before Inactive (false)
            if (a.isActive === b.isActive) {
                return 0; // If status is same, keep original order
            }
            return a.isActive ? -1 : 1;
        });

        // 3. Update Global State
        allMenuItems = menuItems;
        try {
            const categoriesResponse = await fetch(`${API_BASE_URL}/admin/categories`);
            if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json();
                validCategories = categoriesData.map(cat => cat.name || cat);
                allCategories = [...validCategories];
            }
        } catch (error) {
            console.error('Failed to fetch categories for validation:', error);
        }
        
        // Extract unique categories from menu items (including invalid ones)
        const menuItemCategories = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
        
        // Combine valid categories with menu item categories (remove duplicates)
        allCategories = [...new Set([...validCategories, ...menuItemCategories])].sort();
        
        // Find items with invalid/missing categories
        const itemsWithIssues = menuItems.filter(item => {
            // 1. Get categories (handle both array and single string)
            const cats = Array.isArray(item.categories) && item.categories.length > 0 
                ? item.categories 
                : (item.category ? [item.category] : []);

            // 2. If no categories exist at all -> Issue
            if (cats.length === 0) return true;

            // 3. Check if AT LEAST ONE category matches the valid list
            // (This prevents warnings if an item has 2 categories and 1 was deleted)
            const hasAtLeastOneValid = cats.some(cat => validCategories.includes(cat));

            return !hasAtLeastOneValid;
        });
        
        // Count items per category
       // Count items per category (Updated for Multiple Categories)
const itemsByCategory = {};
menuItems.forEach(item => {
    // 1. Determine the primary category
    let primaryCategory = 'Uncategorized';
    
    if (Array.isArray(item.categories) && item.categories.length > 0) {
        primaryCategory = item.categories[0]; // Use first category from array
    } else if (item.category) {
        primaryCategory = item.category; // Fallback to old field
    }

    // 2. Increment count
    if (!itemsByCategory[primaryCategory]) {
        itemsByCategory[primaryCategory] = 0;
    }
    itemsByCategory[primaryCategory]++;
});
        
        // Build warning message if needed
        let warningHtml = '';
        if (itemsWithIssues.length > 0 && validCategories.length > 0) {
            warningHtml = `
                <div style="background: #FFF3E0; border: 1px solid #FFB74D; border-left: 4px solid #FF9800; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                    <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
                        <span class="material-icons-round" style="color: #FF9800; flex-shrink: 0;">warning</span>
                        <div style="flex: 1;">
                            <strong style="color: #E65100; display: block; margin-bottom: 5px;">Category Validation Warning</strong>
                            <p style="color: #5D4037; margin: 0 0 10px 0; font-size: 0.95em;">
                                ${itemsWithIssues.length} item(s) have invalid or missing categories. 
                                These items will not appear in POS category filters until fixed.
                            </p>
                            <div style="background: rgba(255, 255, 255, 0.7); padding: 10px; border-radius: 4px; font-size: 0.9em;">
                                <strong>Available categories:</strong> ${validCategories.join(', ')}
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <button class="btn-admin btn-admin-warning" onclick="showInvalidItemsModal(${JSON.stringify(itemsWithIssues).replace(/"/g, '&quot;')}, ${JSON.stringify(validCategories).replace(/"/g, '&quot;')})" style="padding: 8px 16px; font-size: 0.9em;">
                            <span class="material-icons-round" style="font-size: 16px; margin-right: 5px;">list</span>
                            View Problem Items (${itemsWithIssues.length})
                        </button>
                    </div>
                </div>
            `;
        }
        
        if (menuItems.length === 0) {
            return `
                <div class="admin-form-container">
                    <div style="text-align: center; padding: 60px 20px;">
                        <span class="material-icons-round" style="font-size: 64px; color: var(--text-muted); opacity: 0.5;">restaurant_menu</span>
                        <h2 style="color: var(--text-dark); margin: 20px 0 10px 0;">No Menu Items Yet</h2>
                        <p style="color: var(--text-muted); margin-bottom: 30px;">Start by adding your first menu item</p>
                        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
                            <button class="btn-admin btn-admin-primary" onclick="showAddMenuItemModal()" style="padding: 12px 30px;">
                                <span class="material-icons-round" style="margin-right: 8px;">add_circle</span>
                                Add First Item
                            </button>
                            <button class="btn-admin btn-admin-secondary" onclick="addDefaultItems()" style="padding: 12px 30px;">
                                <span class="material-icons-round" style="margin-right: 8px;">add_box</span>
                                Add Sample Items
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Build the HTML for the page
        return `
            ${warningHtml}
            <div class="admin-table-container">
                <div class="admin-table-header">
                    <div class="admin-table-title">
                        Menu Items Management
                        <span style="font-size: 0.9em; color: var(--text-muted); margin-left: 10px;">(${menuItems.length} items)</span>
                        ${itemsWithIssues.length > 0 ? `
                            <span style="font-size: 0.85em; background: var(--admin-warning); color: white; padding: 2px 8px; border-radius: 10px; margin-left: 10px;">
                                ${itemsWithIssues.length} need category fix
                            </span>
                        ` : ''}
                    </div>
                    <div class="admin-table-actions">
                        <div class="admin-view-options">
                            <button class="admin-view-btn active" onclick="switchMenuView('table')" id="table-view-btn" title="Table View">
                                <span class="material-icons-round">table_rows</span>
                                Table
                            </button>
                            <button class="admin-view-btn" onclick="switchMenuView('grid')" id="grid-view-btn" title="Grid View">
                                <span class="material-icons-round">grid_view</span>
                                Grid
                            </button>
                        </div>
                        <div class="admin-search-box">
                            <span class="material-icons-round">search</span>
                            <input type="text" class="admin-search-input" placeholder="Search menu items..." id="menu-search" oninput="searchMenuItems(this.value)">
                        </div>
                        <button class="btn-admin btn-admin-secondary" onclick="addDefaultItems()" title="Add sample items">
                            <span class="material-icons-round">add_box</span>
                            Add Defaults
                        </button>
                        <button class="btn-admin btn-admin-primary" onclick="showAddMenuItemModal()">
                            <span class="material-icons-round">add</span>
                            Add Item
                        </button>
                    </div>
                </div>
                
                <!-- Category Filter Section -->
                <div class="category-filter-container" id="category-filter-container">
                    ${buildCategoryFilterButtons(allCategories, itemsByCategory, validCategories, menuItems.length)}
                </div>
                
                <div id="menu-items-table-view">
                    ${buildMenuItemsTableView(menuItems, validCategories)}
                </div>
                
                <div id="menu-items-grid-view" style="display: none;">
                    ${buildMenuItemsGridView(menuItems, validCategories)}
                </div>
                
                ${itemsWithIssues.length > 0 ? `
                    <div style="padding: 15px 20px; background: var(--background-light); border-top: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="color: var(--admin-warning); font-size: 0.9em;">
                                <span class="material-icons-round" style="font-size: 16px; vertical-align: middle; margin-right: 5px;">warning</span>
                                ${itemsWithIssues.length} item(s) have invalid categories
                            </div>
                            <button class="btn-admin btn-admin-warning" onclick="showInvalidItemsModal(${JSON.stringify(itemsWithIssues).replace(/"/g, '&quot;')}, ${JSON.stringify(validCategories).replace(/"/g, '&quot;')})" style="padding: 6px 12px; font-size: 0.85em;">
                                View & Fix All
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        throw error;
    }
}

// Helper function to build category filter buttons
function buildCategoryFilterButtons(allCategories, itemsByCategory, validCategories, totalItems) {
    // Add "All" category first
    let buttons = `
        <button class="category-filter-btn active" onclick="filterByCategory('all')" data-category="all" title="Show all items">
            <span class="material-icons-round">all_inclusive</span>
            All (${totalItems})
        </button>
    `;
    
    // Add "Uncategorized" if there are items without category
 if (itemsByCategory['Uncategorized']) {
    const isInvalid = !validCategories.includes('Uncategorized');
    buttons += `
        <button class="category-filter-btn ${isInvalid ? 'invalid' : ''}" ...>
            <span class="material-icons-round">help</span>
            Uncategorized (${itemsByCategory['Uncategorized']})  </button>
    `;
}
    
    // Add all other categories
    allCategories.forEach(category => {
        if (category !== 'Uncategorized') {
            const count = itemsByCategory[category] || 0;
            if (count > 0) {
                const isInvalid = !validCategories.includes(category);
                buttons += `
                    <button class="category-filter-btn ${isInvalid ? 'invalid' : ''}" onclick="filterByCategory('${category.replace(/'/g, "\\'")}')" data-category="${category}" title="${category} category">
                        <span class="material-icons-round">${isInvalid ? 'error_outline' : 'category'}</span>
                        ${category} (${count})
                    </button>
                `;
            }
        }
    });
    
    // Add search for categories
    
    const statsHtml = `
        <div class="category-filter-stats" style="margin-left: auto; flex-shrink: 0; background: white; position: sticky; right: 0; box-shadow: -5px 0 10px -5px rgba(0,0,0,0.1); padding-left: 15px;">
            <div class="category-filter-search">
                <span class="material-icons-round">search</span>
                <input type="text" placeholder="Filter categories..." oninput="filterCategories(this.value)" id="category-search">
            </div>
            <span id="category-stats" style="font-size: 0.8em; color: var(--text-muted); white-space: nowrap;">${allCategories.length} cats, ${totalItems} items</span>
        </div>
    `;
    
    return buttons+statsHtml;
}

// Helper function to build table view
function buildMenuItemsTableView(menuItems, validCategories) {
    return `
    <table class="admin-table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Categories</th>
                <th>Price</th>
                <th>Promo Price</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody id="menu-items-body">
            ${menuItems.map(item => {
                const categories = item.categories || [item.category || 'Uncategorized'];
                const validCount = categories.filter(cat => validCategories.includes(cat)).length;
                const hasValidCategories = validCount > 0;
                
                return `
                    <tr class="menu-item-row" data-categories="${categories.join(',')}">
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">` : ''}
                                <div style="flex: 1;">
                                    <strong>${item.name}</strong>
                                    ${item.type ? `<div style="font-size: 0.85em; color: var(--text-muted);">${item.type}</div>` : ''}
                                    ${!hasValidCategories ? `
                                        <div style="font-size: 0.75em; color: var(--admin-danger); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                                            <span class="material-icons-round" style="font-size: 12px;">error_outline</span>
                                            Invalid categories: ${invalidCategories.join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </td>
                        <td style="${!hasValidCategories ? 'color: var(--admin-danger); font-weight: 600;' : ''}">
                            ${categories.map(cat => `
                                <span style="display: inline-block; background: ${validCategories.includes(cat) ? '#E8F5E8' : '#FFEBEE'}; 
                                    color: ${validCategories.includes(cat) ? 'var(--admin-success)' : 'var(--admin-danger)'}; 
                                    padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 0.85em;">
                                    ${cat}
                                    ${!validCategories.includes(cat) ? `
                                        <span class="material-icons-round" style="font-size: 12px; vertical-align: middle;" title="Invalid category">error</span>
                                    ` : ''}
                                </span>
                            `).join('')}
                        </td>
                        <td>$${item.originalPrice?.toFixed(2) || '0.00'}</td>
                        <td>${item.isPromo ? `$${item.promoPrice?.toFixed(2)}` : '-'}</td>
                        <td>
                            <span class="admin-badge ${item.isActive ? 'badge-success' : 'badge-danger'}">
                                ${item.isActive ? 'Active' : 'Inactive'}
                            </span>
                            ${item.isPromo ? '<span class="admin-badge badge-warning" style="margin-left: 5px;">Promo</span>' : ''}
                        </td>
                        <td>
                            <button class="btn-admin btn-admin-secondary btn-small" onclick="editMenuItem('${item._id || item.id}')" title="Edit">
                                <span class="material-icons-round" style="font-size: 16px;">edit</span>
                            </button>
                            <button class="btn-admin ${item.isActive ? 'btn-admin-warning' : 'btn-admin-success'} btn-small" onclick="toggleMenuItemStatus('${item._id || item.id}', ${item.isActive})" title="${item.isActive ? 'Deactivate' : 'Activate'}">
                                <span class="material-icons-round" style="font-size: 16px;">${item.isActive ? 'toggle_off' : 'toggle_on'}</span>
                            </button>
                            <button class="btn-admin btn-admin-danger btn-small" onclick="deleteMenuItem('${item._id || item.id}')" title="Delete">
                                <span class="material-icons-round" style="font-size: 16px;">delete</span>
                            </button>
                            ${!hasValidCategories ? `
                                <button class="btn-admin btn-admin-info btn-small" onclick="quickFixCategories('${item._id || item.id}', '${item.name}', ${JSON.stringify(validCategories).replace(/"/g, '&quot;')})" title="Fix Categories">
                                    <span class="material-icons-round" style="font-size: 16px;">build</span>
                                </button>
                            ` : ''}
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>
`;
}

// Helper function to build grid view
function buildMenuItemsGridView(menuItems, validCategories) {
    return `
        <div class="menu-items-grid" id="menu-items-grid">
            ${menuItems.map(item => {
                // Get categories array (support both single and multiple categories)
                const categories = item.categories || [item.category || 'Uncategorized'];
                const categoriesString = categories.join(',');
                
                // Check if all categories are valid
                const invalidCategories = categories.filter(cat => 
                    !validCategories.includes(cat)
                );
                const hasValidCategories = invalidCategories.length === 0;
                
                const imageUrl = item.image || 'https://via.placeholder.com/280x180/F5F7FA/9E9E9E?text=No+Image';
                const itemCategoryDisplay = categories.length > 1 
                    ? `${categories[0]} +${categories.length - 1}` 
                    : categories[0];
                
                return `
                    <div class="menu-item-card" 
                         data-categories="${categoriesString}" 
                         data-search="${item.name.toLowerCase()} ${categories.join(' ').toLowerCase()} ${item.type ? item.type.toLowerCase() : ''}"
                         data-id="${item._id || item.id}"
                         data-active="${item.isActive}">
                        
                        <!-- Image Section -->
                        <img src="${imageUrl}" alt="${item.name}" class="menu-item-image">
                        
                        <!-- Badge Overlay -->
                        ${!hasValidCategories ? `
                            <span class="menu-item-invalid-badge" title="Invalid categories">
                                <span class="material-icons-round" style="font-size: 16px;">warning</span>
                            </span>
                        ` : ''}
                        
                        <div class="menu-item-details">
                            <!-- Header with name and promo badge -->
                            <div class="menu-item-header">
                                <h3 class="menu-item-name">${item.name}</h3>
                                ${item.isPromo ? '<span class="menu-item-promo-badge">PROMO</span>' : ''}
                            </div>
                            
                            <!-- Categories Display -->
                            <div class="menu-item-categories ${!hasValidCategories ? 'invalid' : ''}">
                                <span class="material-icons-round" style="font-size: 14px;">category</span>
                                <span class="categories-list">
                                    ${categories.map(cat => `
                                        <span class="category-tag ${validCategories.includes(cat) ? 'valid' : 'invalid'}" 
                                              title="${validCategories.includes(cat) ? cat : `Invalid: ${cat}`}">
                                            ${cat}
                                            ${!validCategories.includes(cat) ? `
                                                <span class="material-icons-round" style="font-size: 12px;">error</span>
                                            ` : ''}
                                        </span>
                                    `).join('')}
                                </span>
                                ${categories.length > 1 ? `
                                    <span class="category-count" title="${categories.length} categories">+${categories.length - 1}</span>
                                ` : ''}
                            </div>
                            
                            <!-- Item Type -->
                            ${item.type ? `
                                <div class="menu-item-type">
                                    <span class="material-icons-round" style="font-size: 14px;">restaurant</span>
                                    ${item.type}
                                </div>
                            ` : ''}
                            
                            <!-- Prices -->
                            <div class="menu-item-prices">
                                ${item.isPromo ? `
                                    <span class="menu-item-promo-price">$${item.originalPrice?.toFixed(2)}</span>
                                    <span class="menu-item-price">$${item.promoPrice?.toFixed(2)}</span>
                                ` : `
                                    <span class="menu-item-price">$${item.originalPrice?.toFixed(2)}</span>
                                `}
                            </div>
                            
                            <!-- Status Badges -->
                            <div class="menu-item-status">
                                <span class="menu-item-status-badge ${item.isActive ? 'badge-success' : 'badge-danger'}">
                                    ${item.isActive ? 'Active' : 'Inactive'}
                                </span>
                                ${!hasValidCategories ? '<span class="menu-item-status-badge badge-danger">Category Issue</span>' : ''}
                            </div>
                            
                            <!-- Action Buttons -->
                            <div class="menu-item-actions">
                                <button class="menu-item-action-btn edit" onclick="editMenuItem('${item._id || item.id}')">
                                    <span class="material-icons-round" style="font-size: 16px;">edit</span>
                                    Edit
                                </button>
                                <button class="menu-item-action-btn toggle" onclick="toggleMenuItemStatus('${item._id || item.id}', ${item.isActive})">
                                    <span class="material-icons-round" style="font-size: 16px;">${item.isActive ? 'toggle_off' : 'toggle_on'}</span>
                                    ${item.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                                <button class="menu-item-action-btn delete" onclick="deleteMenuItem('${item._id || item.id}')">
                                    <span class="material-icons-round" style="font-size: 16px;">delete</span>
                                    Delete
                                </button>
                                ${!hasValidCategories ? `
                                    <button class="menu-item-action-btn fix" onclick="quickFixCategories('${item._id || item.id}', '${item.name}', ${JSON.stringify(validCategories).replace(/"/g, '&quot;')})">
                                        <span class="material-icons-round" style="font-size: 16px;">build</span>
                                        Fix
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ================== VIEW AND FILTER FUNCTIONS ==================
function switchMenuView(viewType) {
    const tableView = document.getElementById('menu-items-table-view');
    const gridView = document.getElementById('menu-items-grid-view');
    const tableBtn = document.getElementById('table-view-btn');
    const gridBtn = document.getElementById('grid-view-btn');
    
    if (!tableView || !gridView || !tableBtn || !gridBtn) return;
    
    if (viewType === 'table') {
        tableView.style.display = 'block';
        gridView.style.display = 'none';
        tableBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        tableView.style.display = 'none';
        gridView.style.display = 'block';
        tableBtn.classList.remove('active');
        gridBtn.classList.add('active');
    }
    
    // Save preference to local storage
    localStorage.setItem('menuView', viewType);
}

function filterByCategory(category) {
    // Update active filter button
    const filterButtons = document.querySelectorAll('.category-filter-btn');
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    // Filter items in table view
    const tableRows = document.querySelectorAll('.menu-item-row');
    let visibleCount = 0;
    
    tableRows.forEach(row => {
        const categories = row.dataset.categories ? row.dataset.categories.split(',') : [];
        
        if (category === 'all' || categories.includes(category)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Filter items in grid view
    const gridItems = document.querySelectorAll('.menu-item-card');
    gridItems.forEach(item => {
        const categories = item.dataset.categories ? item.dataset.categories.split(',') : [];
        
        if (category === 'all' || categories.includes(category)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update stats
    updateCategoryStats(category, visibleCount);
    
    // Clear search if any
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.value = '';
    }
}

function filterCategories(searchTerm) {
    const filterButtons = document.querySelectorAll('.category-filter-btn');
    const searchLower = searchTerm.toLowerCase();
    
    filterButtons.forEach(btn => {
        const categoryText = btn.textContent.toLowerCase();
        if (categoryText.includes(searchLower) || btn.dataset.category === 'all') {
            btn.style.display = '';
        } else {
            btn.style.display = 'none';
        }
    });
}

function searchMenuItems(searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    const activeCategory = getActiveCategory();
    
    // Search in table view
    const tableRows = document.querySelectorAll('.menu-item-row');
    let visibleCount = 0;
    
    tableRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchLower);
        const matchesCategory = activeCategory === 'all' || row.dataset.category === activeCategory;
        
        if (matchesSearch && matchesCategory) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Search in grid view
    const gridItems = document.querySelectorAll('.menu-item-card');
    gridItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matchesSearch = text.includes(searchLower);
        const matchesCategory = activeCategory === 'all' || item.dataset.category === activeCategory;
        
        item.style.display = matchesSearch && matchesCategory ? '' : 'none';
    });
    
    // Update stats with search info
    const statsElement = document.getElementById('category-stats');
    if (statsElement) {
        if (searchLower) {
            statsElement.textContent = `${visibleCount} items match "${searchTerm}"`;
        } else {
            updateCategoryStats(activeCategory, visibleCount);
        }
    }
}

function getActiveCategory() {
    const activeButton = document.querySelector('.category-filter-btn.active');
    return activeButton ? activeButton.dataset.category : 'all';
}

function updateCategoryStats(category, visibleCount) {
    const statsElement = document.getElementById('category-stats');
    if (!statsElement) return;
    
    if (category === 'all') {
        const totalItems = document.querySelectorAll('.menu-item-row').length;
        statsElement.textContent = `${totalItems} items`;
    } else {
        statsElement.textContent = `${visibleCount} items in "${category}"`;
    }
}

function initializeMenuView() {
    const savedView = localStorage.getItem('menuView') || 'table';
    
    // Wait for DOM to be ready
    setTimeout(() => {
        switchMenuView(savedView);
    }, 100);
}

// ================== UPDATED CATEGORIES PAGE LOGIC ==================

async function loadCategoriesPage() {
    try {
        // 1. Fetch BOTH Categories and Menu Items (to check usage)
        const [catsResponse, menuResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/categories`),
            fetch(`${API_BASE_URL}/admin/menu`)
        ]);

        if (!catsResponse.ok) throw new Error('Failed to fetch categories');
        
        let categories = await catsResponse.json();
        const menuItems = menuResponse.ok ? await menuResponse.json() : [];

        // 2. Count Usage per Category
        const categoryCounts = {};
        
        menuItems.forEach(item => {
            // Handle both array (new) and string (old) category formats
            const itemCats = Array.isArray(item.categories) && item.categories.length > 0 
                ? item.categories 
                : (item.category ? [item.category] : []);

            itemCats.forEach(catName => {
                categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
            });
        });

        // 3. Render Page
        return `
            <div class="admin-form-container">
                <div class="admin-form-section">
                    <div class="admin-form-title">
                        <span class="material-icons-round">category</span>
                        Manage Categories
                        <span style="font-size: 0.9em; color: var(--text-muted); margin-left: 10px;">
                            (${categories.length} total)
                        </span>
                    </div>
                    
                    <div class="admin-form-row">
                        <div class="admin-form-group">
                            <label class="admin-form-label">Create New Category</label>
                            <div style="display: flex; gap: 10px;">
                                <input type="text" class="admin-form-control" id="new-category" placeholder="e.g. Breakfast, Coffee, Special">
                                <button class="btn-admin btn-admin-primary" onclick="addNewCategory()">
                                    <span class="material-icons-round">add</span> Add
                                </button>
                            </div>
                        </div>
                    </div>

                    <div id="categories-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; margin-top: 25px;">
                        ${categories.map(category => {
                            const catName = category.name || category;
                            const catId = category._id || category.id;
                            const itemCount = categoryCounts[catName] || 0;
                            const isInUse = itemCount > 0;
                            
                            // CONDITIONAL CLASS: Add 'in-use' if it has items
                            const activeClass = isInUse ? 'in-use' : '';

                            return `
                                <div class="category-item ${activeClass}">
                                    <div style="display: flex; justify-content: space-between; align-items: start;">
                                        <div>
                                            <div class="category-name" style="font-size: 1.1em; font-weight: 600; margin-bottom: 5px;">
                                                ${catName}
                                            </div>
                                            <div style="font-size: 0.85em; ${isInUse ? 'color: #2E7D32;' : 'color: var(--text-muted);'}">
                                                ${isInUse 
                                                    ? `<span style="font-weight:600;">${itemCount} items</span> linked` 
                                                    : 'Not currently in use'}
                                            </div>
                                        </div>
                                        
                                        ${isInUse 
                                            ? `<span class="material-icons-round category-status-icon" title="Active">check_circle</span>`
                                            : `<button class="btn-admin btn-admin-danger btn-small" onclick="deleteCategory('${catId}')" title="Delete Empty Category">
                                                 <span class="material-icons-round" style="font-size: 18px;">delete</span>
                                               </button>`
                                        }
                                    </div>
                                    
                                    ${isInUse ? `
                                        <div style="margin-top: 10px; font-size: 0.75em; color: #4CAF50; display:flex; align-items:center; gap:4px;">
                                            <span class="material-icons-round" style="font-size:14px;">lock</span> Cannot delete while in use
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading categories:', error);
        return `<div class="error-state">Failed to load categories</div>`;
    }
}

async function loadInvoicesPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices`);
        if (!response.ok) throw new Error('Failed to fetch invoices');
        
        const invoices = await response.json();
        allInvoices = invoices;
        
        // Calculate totals
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + (inv.total || 0), 0);
        const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
        
        return `
            <div class="admin-dashboard-stats" style="margin-bottom: 30px;">
                <div class="admin-stat-card">
                    <span class="admin-stat-icon material-icons-round">receipt_long</span>
                    <div class="admin-stat-value">${invoices.length}</div>
                    <div class="admin-stat-label">Total Invoices</div>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-icon material-icons-round">attach_money</span>
                    <div class="admin-stat-value">$${totalRevenue.toFixed(2)}</div>
                    <div class="admin-stat-label">Total Revenue</div>
                </div>
                <div class="admin-stat-card">
                    <span class="admin-stat-icon material-icons-round">pending</span>
                    <div class="admin-stat-value">${pendingInvoices}</div>
                    <div class="admin-stat-label">Pending</div>
                </div>
            </div>
            
            <div class="admin-table-container">
                <div class="admin-table-header">
                    <div class="admin-table-title">All Invoices</div>
                    <div class="admin-table-actions">
                        <div class="admin-search-box">
                            <span class="material-icons-round">search</span>
                            <input type="text" class="admin-search-input" placeholder="Search invoices..." id="invoice-search" oninput="searchInvoices(this.value)">
                        </div>
                        <button class="btn-admin btn-admin-primary" onclick="exportInvoices()">
                            <span class="material-icons-round">download</span>
                            Export
                        </button>
                    </div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Table</th>
                            <th>Payment</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="invoices-body">
                   ${invoices.map(invoice => {
            const date = new Date(invoice.date).toLocaleDateString();
            let statusBadge = '';
            if (invoice.status === 'paid') {
                statusBadge = '<span class="admin-badge badge-success">Paid</span>';
            } else if (invoice.status === 'pending') {
                statusBadge = '<span class="admin-badge badge-warning">Pending</span>';
            } else {
                // NEW LINE: Show "Deleted" instead of Cancelled
                statusBadge = '<span class="admin-badge badge-danger">Deleted</span>';
            }
                            
                            return `
                                <tr>
                                    <td><strong>${invoice.invoiceId || invoice._id?.substring(0, 8) || 'N/A'}</strong></td>
                                    <td>${date}</td>
                                    <td>${invoice.table || 'Takeaway'}</td>
                                    <td>${invoice.paymentMethod || 'Cash'}</td>
                                    <td>$${invoice.total?.toFixed(2) || '0.00'}</td>
                                    <td>${statusBadge}</td>
                                    <td>
                                        <button class="btn-admin btn-admin-secondary btn-small" onclick="viewInvoice('${invoice._id || invoice.id || invoice.invoiceId}')">
                                            <span class="material-icons-round" style="font-size: 16px;">visibility</span>
                                        </button>
                                        <button class="btn-admin btn-admin-danger btn-small" onclick="deleteInvoice('${invoice._id || invoice.id || invoice.invoiceId}')">
                                            <span class="material-icons-round" style="font-size: 16px;">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        throw error;
    }
}

async function loadUsersPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const users = await response.json();
        allUsers = users;
        
        return `
            <div class="admin-table-container">
                <div class="admin-table-header">
                    <div class="admin-table-title">User Management</div>
                    <div class="admin-table-actions">
                        <button class="btn-admin btn-admin-primary" onclick="showAddUserModal()">
                            <span class="material-icons-round">person_add</span>
                            Add User
                        </button>
                    </div>
                </div>
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Operator ID</th>
                            <th>Role</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td><strong>${user.fullName || user.username}</strong></td>
                                <td>${user.username}</td>
                                <td>
                                    <span class="admin-badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}">
                                        ${user.role?.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-admin btn-admin-secondary btn-small" onclick="editUser('${user._id || user.id}')">
                                        <span class="material-icons-round" style="font-size: 16px;">edit</span>
                                    </button>
                                    <button class="btn-admin btn-admin-danger btn-small" onclick="deleteUser('${user._id || user.id}')">
                                        <span class="material-icons-round" style="font-size: 16px;">delete</span>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        return `<div class="error-state">Failed to load users</div>`;
    }
}

async function loadSettingsPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        const settings = await response.json();

        // 1. Parse existing data to fill our new separate fields
        // We assume the stored format was: "Name\nSubtitle\nContact"
        const headerParts = (settings.receiptHeader || "").split('\n');
        const shopName = headerParts[0] || "My Coffee Shop";
        const shopSubtitle = headerParts[1] || "";
        const shopContact = headerParts.slice(2).join('\n') || "Tel: 012-345-678";
        const footerMsg = settings.receiptFooter || "Thank you!\nPlease come again.";

        return `
            <div class="admin-dashboard-header">
                <h2>System Settings</h2>
            </div>

            <div class="admin-form-container" style="max-width: 1000px;">
                
                <div class="admin-form-section">
                    <div class="admin-form-title">General Configuration</div>
                    <div class="admin-form-row">
                        <div class="admin-form-group">
                            <label class="admin-form-label">Exchange Rate (1 USD = ? KHR)</label>
                            <input type="number" id="exchange-rate" class="admin-form-control" value="${settings.exchangeRate || 4000}">
                        </div>
                        <div class="admin-form-group">
                            <label class="admin-form-label">Currency Symbol</label>
                            <select id="currency" class="admin-form-control">
                                <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
                                <option value="KHR" ${settings.currency === 'KHR' ? 'selected' : ''}>KHR (៛)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="admin-form-section" style="border-left: 4px solid var(--primary-color);">
                    <div class="admin-form-title">
                        <span class="material-icons-round">receipt</span> Custom Receipt Design
                    </div>
                    
                    <div class="receipt-builder-container">
                        <div class="receipt-form-side">
                            <div class="admin-form-group">
                                <label class="admin-form-label">Shop Name (Big Title)</label>
                                <input type="text" id="shop-name" class="admin-form-control" value="${shopName}" oninput="updatePreview()" placeholder="e.g. Paint Coffee">
                            </div>
                            
                            <div class="admin-form-group">
                                <label class="admin-form-label">Subtitle / Tagline</label>
                                <input type="text" id="shop-subtitle" class="admin-form-control" value="${shopSubtitle}" oninput="updatePreview()" placeholder="e.g. ART & BISTRO">
                            </div>

                            <div class="admin-form-group">
                                <label class="admin-form-label">Contact Info (Tel, Address, Wifi)</label>
                                <textarea id="shop-contact" class="admin-form-control" rows="3" oninput="updatePreview()" placeholder="Tel: 012...\nPhnom Penh">${shopContact}</textarea>
                            </div>

                            <div class="admin-form-group">
                                <label class="admin-form-label">Footer Message</label>
                                <textarea id="shop-footer" class="admin-form-control" rows="3" oninput="updatePreview()" placeholder="Thank you for visiting!">${footerMsg}</textarea>
                            </div>
                        </div>

                        <div class="receipt-preview-side">
                            <div style="color:#ccc; font-size:10px; margin-bottom:10px;">PREVIEW</div>
                            
                            <div id="preview-name" class="preview-logo">${shopName}</div>
                            <div id="preview-subtitle" class="preview-subtitle">${shopSubtitle}</div>
                            <div id="preview-contact" class="preview-contact">${shopContact}</div>

                            <div class="preview-divider"></div>
                            <div style="display:flex; justify-content:space-between; font-size:11px; font-weight:bold;">
                                <span>ITEM</span>
                                <span>AMT</span>
                            </div>
                            <div class="preview-dummy-items">
                                1x Ice Latte ................. 2.50$<br>
                                1x Croissant ................. 1.50$
                            </div>
                            <div class="preview-divider"></div>
                            <div style="font-size:14px; font-weight:bold; margin:10px 0;">TOTAL: $4.00</div>
                            <div class="preview-divider"></div>

                            <div id="preview-footer" class="preview-footer">${footerMsg}</div>
                        </div>
                    </div>
                </div>

                <div class="admin-form-actions">
                    <button class="btn-admin btn-admin-primary" onclick="saveVisualSettings()">
                        <span class="material-icons-round">save</span> Save Receipt Design
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading settings:', error);
        return `<div class="error-state">Failed to load settings</div>`;
    }
}

// --- HELPER: Update the Live Preview ---
function updatePreview() {
    document.getElementById('preview-name').textContent = document.getElementById('shop-name').value;
    document.getElementById('preview-subtitle').textContent = document.getElementById('shop-subtitle').value;
    document.getElementById('preview-contact').textContent = document.getElementById('shop-contact').value;
    document.getElementById('preview-footer').textContent = document.getElementById('shop-footer').value;
}

// --- ACTION: Save Combined Settings ---
async function saveVisualSettings() {
    // 1. Get Values
    const currency = document.getElementById('currency').value;
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value);
    
    // 2. Combine Inputs into standard format for Server
    const name = document.getElementById('shop-name').value;
    const subtitle = document.getElementById('shop-subtitle').value;
    const contact = document.getElementById('shop-contact').value;
    
    // Combine Name + Subtitle + Contact into one "receiptHeader" string
    // This keeps compatibility with your server
    const combinedHeader = `${name}\n${subtitle}\n${contact}`;
    
    const receiptFooter = document.getElementById('shop-footer').value;

    const settingsData = {
        currency,
        exchangeRate,
        receiptHeader: combinedHeader,
        receiptFooter: receiptFooter
    };

    try {
        const response = await fetch(`${API_BASE_URL}/admin/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        if (response.ok) {
            showNotification('success', 'Receipt Design Saved!');
        } else {
            showNotification('error', 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('error', 'Network error');
    }
}

function showDashboard() {
    document.getElementById('dashboard-page').style.display = 'block';
    document.getElementById('dynamic-content').innerHTML = '';
}

// ================== MODAL FUNCTIONS ==================
function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

async function showAddMenuItemModal(itemId = null) {
    const modal = document.getElementById('add-menu-item-modal');
    if (!modal) return;

    // 1. Ensure categories are loaded (Fix for Dashboard/Quick Actions)
    if (!validCategories || validCategories.length === 0) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/categories`);
            if (response.ok) {
                const data = await response.json();
                // Handle both array of objects or array of strings
                validCategories = data.map(cat => cat.name || cat);
            }
        } catch (error) {
            console.error('Error loading categories for modal:', error);
        }
    }

    // Reset validation styles
    document.querySelectorAll('.admin-form-control').forEach(el => el.classList.remove('error'));
    
    if (itemId) {
        // === EDIT MODE ===
        currentEditingId = itemId;
        // Search in allMenuItems (loaded by dashboard) or fetch fresh if needed
        let item = allMenuItems.find(i => i._id === itemId || i.id === itemId);
        
        // Safety: If item isn't in memory, try to fetch it
        if (!item) {
             try {
                const res = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`);
                if (res.ok) item = await res.json();
             } catch(e) { console.error(e); }
        }

        if (!item) {
            showNotification('error', 'Item not found');
            return;
        }

        // Fill standard inputs
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-price').value = item.originalPrice || 0;
        document.getElementById('item-type').value = item.type || '';
        document.getElementById('item-is-active').checked = item.isActive !== false;
        
        // Promo fields
        document.getElementById('item-is-promo').checked = item.isPromo || false;
        document.getElementById('item-promo-price').value = item.promoPrice || '';
        document.getElementById('item-promo-badge').value = item.badge || '';
        
        // Toggle promo visibility
        const promoFields = document.getElementById('promo-fields');
        if (promoFields) {
            promoFields.style.display = item.isPromo ? 'block' : 'none';
            promoFields.classList.remove('hidden'); 
            if(!item.isPromo) promoFields.classList.add('hidden');
        }

        // Image Preview
        document.getElementById('item-image').value = item.image || '';
        if (typeof updateImagePreview === 'function') {
            updateImagePreview(item.image || '');
        }

        // Render Categories
        let itemCats = [];
        if (Array.isArray(item.categories) && item.categories.length > 0) {
            itemCats = item.categories;
        } else if (item.category) {
            itemCats = [item.category];
        }
        
        renderCategoryChips(itemCats);
        
        document.querySelector('.admin-modal-title').textContent = 'Edit Menu Item';
        
    } else {
        // === ADD NEW MODE ===
        currentEditingId = null;
        resetMenuItemForm();
        
        // Clear Image Preview
        if (typeof updateImagePreview === 'function') {
            updateImagePreview('');
        }
        
        // Render Empty Chips
        renderCategoryChips([]);
        
        document.querySelector('.admin-modal-title').textContent = 'Add New Menu Item';
    }
    
    // Show Modal
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Ensure flex is added for centering
}

function resetMenuItemForm() {
    document.getElementById('menu-item-form').reset();
    document.getElementById('edit-menu-item-id').value = '';
    document.getElementById('promo-fields').style.display = 'none';
    currentEditingId = null;
}

async function saveMenuItem() {
    // 1. Get values from the form
    const name = document.getElementById('item-name').value.trim();
    const type = document.getElementById('item-type').value.trim();
    const price = parseFloat(document.getElementById('item-price').value);
    const isActive = document.getElementById('item-is-active').checked;
    const isPromo = document.getElementById('item-is-promo').checked;
    const promoPrice = parseFloat(document.getElementById('item-promo-price').value) || 0;
    const badge = document.getElementById('item-promo-badge').value.trim();
    const image = document.getElementById('item-image').value.trim();
    
    // 2. === NEW: Collect Categories from Chips ===
    let categories = [];
    const selectedChips = document.querySelectorAll('.category-chip.selected');
    
    selectedChips.forEach(chip => {
        // Find the text inside the span (ignoring the icon)
        const spans = chip.querySelectorAll('span');
        // The text is usually in the second span, or simply textContent
        // Let's iterate to find the text node or the non-icon span
        spans.forEach(span => {
            if (!span.classList.contains('material-icons-round')) {
                categories.push(span.textContent.trim());
            }
        });
    });

    // 3. Validation
    if (!name) {
        showNotification('error', 'Please enter an item name');
        return;
    }
    
    if (isNaN(price)) {
        showNotification('error', 'Please enter a valid price');
        return;
    }

    // Validate Categories
    if (categories.length === 0) {
        showNotification('error', 'Please tap at least one category to select it');
        return;
    }
    
    // 4. Construct the data object
    const menuItemData = {
        name,
        originalPrice: price,
        categories: categories, // Send Array
        category: categories[0], // Legacy support: set primary as first selected
        type: type || null,
        isActive,
        isPromo,
        promoPrice: isPromo ? promoPrice : null,
        badge: isPromo && badge ? badge : null,
        image: image || null
    };
    
    try {
        let response;
        let endpoint = `${API_BASE_URL}/admin/menu`;
        
        // 5. Send Request (PUT if editing, POST if new)
        if (currentEditingId) {
            // Update existing item
            response = await fetch(`${endpoint}/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(menuItemData)
            });
        } else {
            // Add new item
            response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(menuItemData)
            });
        }
        
        // 6. Handle Response
        if (response.ok) {
            showNotification('success', `Menu item ${currentEditingId ? 'updated' : 'added'} successfully!`);
            hideModal('add-menu-item-modal');
            
            // Refresh logic
            if (typeof loadMenuItemsPage === 'function' && currentPage === 'menu-items') {
                loadMenuItemsPage();
            } else if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            } else {
                // Fallback reload
                window.location.reload();
            }
        } else {
            const errorData = await response.json();
            showNotification('error', errorData.error || 'Failed to save menu item');
        }
    } catch (error) {
        console.error('Error saving menu item:', error);
        showNotification('error', 'Failed to save menu item. Please try again.');
    }
}

async function deleteMenuItem(itemId) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'Menu item deleted successfully!');
            
            // Refresh data
            if (currentPage === 'menu-items') {
                navigateTo('menu-items');
            } else if (currentPage === 'dashboard') {
                loadDashboardData();
            }
        } else {
            showNotification('error', 'Failed to delete menu item');
        }
    } catch (error) {
        console.error('Error deleting menu item:', error);
        showNotification('error', 'Failed to delete menu item');
    }
}

function editMenuItem(itemId) {
    showAddMenuItemModal(itemId);
}

async function toggleMenuItemStatus(itemId, currentStatus) {
    // 1. Calculate new status
    const newStatus = !currentStatus;

    try {
        // 2. Send request to server
        const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isActive: newStatus })
        });
        
        if (response.ok) {
            showNotification('success', `Item ${newStatus ? 'activated' : 'deactivated'} successfully!`);
            
            // 3. Update Local Data (The "No Refresh" Magic)
            const itemIndex = allMenuItems.findIndex(i => i._id === itemId || i.id === itemId);
            if (itemIndex > -1) {
                allMenuItems[itemIndex].isActive = newStatus;
            }

            // 4. Re-draw the Table and Grid immediately
            // We use the global 'validCategories' we set up in Step 1 & 2
            if (typeof validCategories !== 'undefined') {
                const tableContainer = document.getElementById('menu-items-table-view');
                const gridContainer = document.getElementById('menu-items-grid-view');
                
                // Regenerate HTML with new status
                if (tableContainer) tableContainer.innerHTML = buildMenuItemsTableView(allMenuItems, validCategories);
                if (gridContainer) gridContainer.innerHTML = buildMenuItemsGridView(allMenuItems, validCategories);
                
                // 5. Re-apply current category filter (so you don't lose your place)
                if (typeof getActiveCategory === 'function' && typeof filterByCategory === 'function') {
                    const currentCat = getActiveCategory();
                    if (currentCat && currentCat !== 'all') {
                        filterByCategory(currentCat);
                    }
                }
            } else {
                // Fallback if Step 1/2 wasn't done: reload page
                navigateTo('menu-items');
            }

        } else {
            const errorData = await response.json();
            showNotification('error', errorData.error || 'Failed to update item status');
        }
    } catch (error) {
        console.error('Error toggling item status:', error);
        showNotification('error', 'Failed to update item status');
    }
}
// ================== OTHER MODAL FUNCTIONS ==================
function showAddUserModal(userId = null) {
    const modal = document.getElementById('add-user-modal');
    const form = document.getElementById('add-user-form');
    const title = modal.querySelector('.admin-modal-title');
    
    // Reset form first
    form.reset();
    document.getElementById('edit-user-id').value = '';

    if (userId) {
        // Edit Mode
        currentEditingId = userId;
        title.textContent = 'Edit Operator';
        const user = allUsers.find(u => (u._id === userId || u.id === userId));
        
        if (user) {
            document.getElementById('edit-user-id').value = userId;
            document.getElementById('user-fullname').value = user.fullName || '';
            document.getElementById('user-username').value = user.username || '';
            document.getElementById('user-role').value = user.role || 'cashier';
            document.getElementById('user-pin').placeholder = "Enter new PIN to reset";
        }
    } else {
        // Create Mode
        currentEditingId = null;
        title.textContent = 'Create New Operator';
        document.getElementById('user-pin').placeholder = "e.g. 1234";
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function resetUserForm() {
    document.getElementById('user-form').reset();
    document.getElementById('edit-user-id').value = '';
}

async function saveUser() {
    // 1. Get Values directly from the specific inputs we created
    const id = document.getElementById('edit-user-id').value;
    const fullName = document.getElementById('user-fullname').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-pin').value;
    const role = document.getElementById('user-role').value;

    // 2. Validation
    if (!username) {
        showNotification('error', 'Operator ID is required');
        return;
    }
    
    // Require PIN only for new users
    if (!id && !password) {
        showNotification('error', 'Security PIN is required');
        return;
    }

    const userData = {
        fullName,
        username,
        role,
        // Only send password if it was entered
        ...(password && { password }) 
    };

    try {
        let response;
        if (id) {
            // UPDATE
            response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        } else {
            // CREATE
            response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        }

        if (response.ok) {
            showNotification('success', `User ${id ? 'updated' : 'created'} successfully!`);
            hideModal('add-user-modal');
            loadPageContent('users'); // Refresh List
        } else {
            const err = await response.json();
            showNotification('error', err.error || 'Failed to save');
        }
    } catch (e) {
        console.error(e);
        showNotification('error', 'Server Error');
    }
}

function editUser(id) {
    showAddUserModal(id);
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
        await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
        showNotification('success', 'User deleted');
        loadPageContent('users');
    } catch (e) {
        showNotification('error', 'Delete failed');
    }
}

function resetPassword(userId) {
    showNotification('info', `Password reset for user ${userId}`);
}

function searchUsers(searchTerm) {
    const rows = document.querySelectorAll('#users-body tr');
    const searchLower = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchLower) ? '' : 'none';
    });
}

function searchInvoices(searchTerm) {
    const rows = document.querySelectorAll('#invoices-body tr');
    const searchLower = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchLower) ? '' : 'none';
    });
}

function viewOrder(orderId) {
    showNotification('info', `Viewing order ${orderId}`);
}

JavaScript
// ================== PROTECTED DELETE LOGIC ==================

async function deleteInvoice(invoiceId) {
    // 1. Find the invoice in local memory to check its status
    const invoice = allInvoices.find(inv => 
        String(inv._id) === String(invoiceId) || 
        String(inv.id) === String(invoiceId) || 
        String(inv.invoiceId) === String(invoiceId)
    );

    // 2. CHECK STATUS: If Pending, do not allow delete
    if (invoice && invoice.status === 'pending') {
        showNotification('warning', 'Cannot delete! This invoice is still active on the POS system.'); //
        return;
    }

    // 3. If Paid or Cancelled, ask for confirmation
    if (!confirm('Are you sure you want to delete this invoice record?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'Invoice deleted successfully!');
            if (currentPage === 'invoices') navigateTo('invoices');
        } else {
            showNotification('error', 'Failed to delete invoice');
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('error', 'Network error while deleting');
    }
}

// Update the Dashboard Recent Orders delete function too
async function deleteOrder(orderId) {
    const order = allInvoices.find(inv => 
        String(inv._id) === String(orderId) || 
        String(inv.id) === String(orderId) || 
        String(inv.invoiceId) === String(orderId)
    );

    if (order && order.status === 'pending') {
        showNotification('warning', 'Order is currently active. Please close it in POS before deleting.'); //
        return;
    }

    if (!confirm('Delete this order?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${orderId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'Order deleted!');
            loadDashboardData();
        }
    } catch (error) {
        showNotification('error', 'Error deleting order');
    }
}

function viewInvoice(invoiceId) {
    showNotification('info', `Viewing invoice ${invoiceId}`);
}

async function deleteInvoice(invoiceId) {
    // 1. Find the invoice in local memory to check its status
    const invoice = allInvoices.find(inv => 
        String(inv._id) === String(invoiceId) || 
        String(inv.id) === String(invoiceId) || 
        String(inv.invoiceId) === String(invoiceId)
    );

    // 2. CHECK STATUS: If Pending, do not allow delete
    if (invoice && invoice.status === 'pending') {
        showNotification('warning', 'Cannot delete! This invoice is still active on the POS system.'); //
        return;
    }

    // 3. If Paid or Cancelled, ask for confirmation
    if (!confirm('Are you sure you want to delete this invoice record?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'Invoice deleted successfully!');
            if (currentPage === 'invoices') navigateTo('invoices');
        } else {
            showNotification('error', 'Failed to delete invoice');
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('error', 'Network error while deleting');
    }
}

function exportInvoices() {
    showNotification('info', 'Exporting invoices...');
}

async function addNewCategory() {
    const newCategory = document.getElementById('new-category').value.trim();
    if (!newCategory) {
        showNotification('error', 'Please enter a category name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newCategory })
        });
        
        if (response.ok) {
            showNotification('success', `Category "${newCategory}" added`);
            document.getElementById('new-category').value = '';
            
            // Refresh categories page
            if (currentPage === 'categories') {
                navigateTo('categories');
            }
        } else {
            const errorData = await response.json();
            showNotification('error', errorData.error || 'Failed to add category');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('error', 'Failed to add category');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/categories/${categoryId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('success', 'Category deleted');
            
            // Refresh categories page
            if (currentPage === 'categories') {
                navigateTo('categories');
            }
        } else {
            showNotification('error', 'Failed to delete category');
        }
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification('error', 'Failed to delete category');
    }
}

async function addDefaultItems() {
    if (!confirm('Add default menu items? This will only add items that don\'t already exist.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu/add-defaults`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('success', result.message);
            
            // Refresh the menu items list
            if (currentPage === 'menu-items') {
                navigateTo('menu-items');
            }
        } else {
            const errorData = await response.json();
            showNotification('error', errorData.error || 'Failed to add default items');
        }
    } catch (error) {
        console.error('Error adding default items:', error);
        showNotification('error', 'Failed to add default items');
    }
}
function updateRateDisplay(settings) {
    const rateInput = document.querySelector('input[name="exchangeRate"]');
    const container = rateInput.parentElement;
    
    // Remove existing pending message if any
    const existingMsg = container.querySelector('.pending-rate-msg');
    if (existingMsg) existingMsg.remove();

    // If there is a pending rate, show it
    if (settings.pendingExchangeRate) {
        const msg = document.createElement('div');
        msg.className = 'pending-rate-msg';
        msg.style.color = '#FF9800'; // Orange warning color
        msg.style.fontSize = '12px';
        msg.style.marginTop = '5px';
        msg.innerHTML = `
            <span class="material-icons-round" style="font-size:12px; vertical-align:middle;">schedule</span>
            Pending: <b>${settings.pendingExchangeRate}៛</b> (Effective 12:00 AM)
        `;
        container.appendChild(msg);
        
        // OPTIONAL: Keep the input showing the CURRENT rate, not the pending one
        rateInput.value = settings.exchangeRate;
    }
}
async function saveSettings() {
    const form = document.getElementById('settings-form');
    const formData = new FormData(form);
    const updates = Object.fromEntries(formData.entries());

    // Convert numeric fields
    if (updates.exchangeRate) updates.exchangeRate = Number(updates.exchangeRate);

    try {
        const res = await fetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'x-admin-token': 'admin_secret_key' // Or your token logic
            },
            body: JSON.stringify(updates)
        });

        if (res.ok) {
            const newSettings = await res.json();
            systemSettings = newSettings;
            
            // CHECK IF RATE WAS SCHEDULED
            if (newSettings.pendingExchangeRate) {
                showNotification('success', `Rate change saved! Will apply automatically at 12:00 AM.`);
                
                // Update the UI to show the pending status
                updateRateDisplay(newSettings);
            } else {
                showNotification('success', 'Settings saved successfully');
            }
        } else {
            showNotification('error', 'Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('error', 'Error connecting to server');
    }
}

function resetSettings() {
    if (!confirm('Reset all settings to default?')) return;
    
    showNotification('success', 'Settings reset to default');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        window.location.href = 'pos.html';
    }
}

// ================== NOTIFICATION FUNCTION ==================
function showNotification(type, message) {
    const n = document.createElement('div');
    n.className = `admin-notification notification-${type}`;
    n.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// ================== INVALID ITEMS MODAL ==================
function showInvalidItemsModal(invalidItems, validCategories) {
    console.log('Showing invalid items modal:', invalidItems);
    
    // Create modal HTML
    const modalHtml = `
        <div id="invalid-items-modal" class="admin-modal">
            <div class="admin-modal-content" style="max-width: 700px;">
                <div class="admin-modal-header">
                    <h3 class="admin-modal-title">
                        <span class="material-icons-round" style="color: var(--admin-warning); margin-right: 10px;">warning</span>
                        Fix Invalid Categories
                    </h3>
                    <button class="admin-modal-close" onclick="hideModal('invalid-items-modal')">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="admin-modal-body">
                    <div style="margin-bottom: 20px; padding: 15px; background: #FFF3E0; border-radius: 8px;">
                        <p style="margin: 0 0 10px 0; color: #5D4037;">
                            <strong>Note:</strong> Items with invalid categories will not appear in POS category filters.
                            Select a valid category for each item below.
                        </p>
                        <p style="margin: 0; color: #5D4037; font-size: 0.9em;">
                            Available categories: <strong>${validCategories.join(', ')}</strong>
                        </p>
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table class="admin-table" style="font-size: 0.9em;">
                            <thead>
                                <tr>
                                    <th>Item Name</th>
                                    <th>Current Category</th>
                                    <th>New Category</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invalidItems.map((item, index) => `
                                    <tr>
                                        <td>
                                            <strong>${item.name}</strong>
                                            ${item.type ? `<div style="font-size: 0.85em; color: var(--text-muted);">${item.type}</div>` : ''}
                                        </td>
                                        <td style="color: var(--admin-danger);">
                                            ${item.category || '<span style="color: var(--text-muted); font-style: italic;">Not set</span>'}
                                        </td>
                                        <td>
                                            <select class="admin-form-control" id="new-category-${index}" style="font-size: 0.9em; padding: 8px;">
                                                <option value="">Select Category</option>
                                                ${validCategories.map(cat => `
                                                    <option value="${cat}">${cat}</option>
                                                `).join('')}
                                            </select>
                                        </td>
                                        <td>
                                            <button class="btn-admin btn-admin-info btn-small" onclick="applyCategoryFix('${item._id || item.id}', ${index})" style="padding: 6px 12px;">
                                                Apply
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    ${invalidItems.length > 5 ? `
                        <div style="margin-top: 20px; text-align: center;">
                            <button class="btn-admin btn-admin-primary" onclick="applyAllCategoryFixes(${invalidItems.length}, ${JSON.stringify(validCategories).replace(/"/g, '&quot;')})">
                                <span class="material-icons-round" style="margin-right: 5px;">check_circle</span>
                                Apply to All Items
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="admin-modal-footer">
                    <button class="btn-admin btn-admin-secondary" onclick="hideModal('invalid-items-modal')">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    document.getElementById('invalid-items-modal').classList.remove('hidden');
}

// Apply category fix for a single item
async function applyCategoryFix(itemId, index) {
    const selectElement = document.getElementById(`new-category-${index}`);
    const newCategory = selectElement.value;
    
    if (!newCategory) {
        showNotification('error', 'Please select a category');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ category: newCategory })
        });
        
        if (response.ok) {
            showNotification('success', 'Category updated successfully');
            
            // Update the select element to show success
            selectElement.disabled = true;
            selectElement.style.backgroundColor = '#E8F5E8';
            
            // Update the button
            const button = selectElement.closest('tr').querySelector('button');
            button.innerHTML = '<span class="material-icons-round" style="font-size: 16px; color: var(--admin-success);">check_circle</span>';
            button.disabled = true;
            button.style.backgroundColor = '#E8F5E8';
            
            // Refresh the menu items list after a delay
            setTimeout(() => {
                navigateTo('menu-items');
            }, 1500);
            
        } else {
            const errorData = await response.json();
            showNotification('error', errorData.error || 'Failed to update category');
        }
    } catch (error) {
        console.error('Error updating category:', error);
        showNotification('error', 'Failed to update category');
    }
}

// Apply category fixes to all items
async function applyAllCategoryFixes(itemCount, validCategories) {
    if (!confirm(`Apply the same category to all ${itemCount} items?`)) return;
    
    const newCategory = prompt('Enter the category to apply to all items:', validCategories[0]);
    
    if (!newCategory || !validCategories.includes(newCategory)) {
        showNotification('error', `Please enter a valid category from: ${validCategories.join(', ')}`);
        return;
    }
    
    try {
        // Get all invalid items
        const response = await fetch(`${API_BASE_URL}/admin/menu`);
        if (!response.ok) throw new Error('Failed to fetch menu items');
        
        const allItems = await response.json();
        
        // Filter invalid items
        const invalidItems = allItems.filter(item => 
            !item.category || 
            item.category.trim() === '' || 
            !validCategories.includes(item.category)
        );
        
        if (invalidItems.length === 0) {
            showNotification('info', 'No items need category fixes');
            return;
        }
        
        // Update all invalid items
        showNotification('info', `Updating ${invalidItems.length} items...`);
        
        const updatePromises = invalidItems.map(item => 
            fetch(`${API_BASE_URL}/admin/menu/${item._id || item.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ category: newCategory })
            })
        );
        
        const results = await Promise.all(updatePromises);
        const successCount = results.filter(r => r.ok).length;
        
        showNotification('success', `Updated ${successCount} items to "${newCategory}" category`);
        
        // Close modal and refresh
        hideModal('invalid-items-modal');
        setTimeout(() => {
            navigateTo('menu-items');
        }, 1000);
        
    } catch (error) {
        console.error('Error applying bulk category fix:', error);
        showNotification('error', 'Failed to update categories');
    }
}

// Quick fix category from table row
function quickFixCategories(itemId, itemName, validCategories) {
    const newCategory = prompt(`Set category for "${itemName}":\n\nAvailable categories: ${validCategories.join(', ')}`, validCategories[0]);
    
    if (!newCategory || !validCategories.includes(newCategory)) {
        showNotification('error', `Please enter a valid category from: ${validCategories.join(', ')}`);
        return;
    }
    
    // Call API to update
    fetch(`${API_BASE_URL}/admin/menu/${itemId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category: newCategory })
    })
    .then(response => {
        if (response.ok) {
            showNotification('success', `Category updated to "${newCategory}"`);
            setTimeout(() => {
                navigateTo('menu-items');
            }, 1000);
        } else {
            throw new Error('Failed to update');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('error', 'Failed to update category');
    });
}
// --- Image Preview Logic ---
function updateImagePreview(url) {
    const img = document.getElementById('image-preview-img');
    const placeholder = document.getElementById('image-preview-placeholder');
    
    if (url && url.trim() !== '') {
        img.src = url;
        img.onload = function() {
            img.classList.remove('hidden');
            placeholder.style.display = 'none';
        };
        img.onerror = function() {
            // Handle broken link
            img.classList.add('hidden');
            placeholder.style.display = 'block';
        };
    } else {
        img.classList.add('hidden');
        placeholder.style.display = 'block';
    }
}
// --- Helper: Render Category Chips ---
function renderCategoryChips(selectedCategories = []) {
    const container = document.getElementById('category-chips-container');
    if (!container) return;

    // Clear loading state
    container.innerHTML = '';
    
    // Check if we have categories to display
    // 'validCategories' is a global variable from loadCategories()
    if (!validCategories || validCategories.length === 0) {
        container.innerHTML = `
            <div style="width:100%; text-align:center; padding:10px; color:var(--text-muted);">
                <span class="material-icons-round" style="font-size:24px; display:block;">warning</span>
                No categories found. <br>Go to the Categories page to add some.
            </div>`;
        return;
    }

    // Loop through all available categories
    validCategories.forEach(cat => {
        const chip = document.createElement('div');
        chip.className = 'category-chip';
        
        // If this category is in the item's list, mark it as selected
        // Handle explicit string match
        if (selectedCategories.includes(cat)) {
            chip.classList.add('selected');
        }
        
        // Create the HTML inside the chip (Checkmark icon + Name)
        chip.innerHTML = `
            <span class="material-icons-round check-icon">check</span>
            <span>${cat}</span>
        `;
        
        // Add Click Listener to toggle selection
        chip.onclick = () => {
            chip.classList.toggle('selected');
        };
        
        container.appendChild(chip);
    });
}
async function quickAddCategory() {
    // 1. Ask for the new category name
    const newCategoryName = prompt("Enter new category name:");
    
    if (!newCategoryName || newCategoryName.trim() === "") return;

    const formattedName = newCategoryName.trim();

    // 2. Optimistic check (prevent duplicates before API call)
    if (validCategories.includes(formattedName)) {
        showNotification('warning', 'Category already exists!');
        return;
    }

    try {
        // 3. Save to Server
        const response = await fetch(`${API_BASE_URL}/admin/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: formattedName })
        });

        if (response.ok) {
            // 4. Update Local State
            validCategories.push(formattedName);
            validCategories.sort(); // Keep list alphabetical
            
            // 5. Re-render chips (preserving currently selected ones)
            // Get currently selected items first
            const currentSelected = [];
            document.querySelectorAll('.category-chip.selected span:last-child').forEach(span => {
                currentSelected.push(span.textContent);
            });
            
            // Auto-select the new one
            currentSelected.push(formattedName);
            
            // Re-render
            renderCategoryChips(currentSelected);
            
            showNotification('success', `Category "${formattedName}" created!`);
        } else {
            const error = await response.json();
            showNotification('error', error.error || 'Failed to create category');
        }
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification('error', 'Network error. Could not add category.');
    }
}
// ================== RECEIPT VIEW LOGIC ==================

// 1. Triggered by the "Eye" Icon in Invoice List
// ================== ROBUST VIEW INVOICE LOGIC ==================

// ================== VIEW INVOICE (IDENTICAL TO POS) ==================

async function viewInvoice(invoiceId) {
    // 1. Setup Modal
    const modal = document.getElementById('invoiceDetailModal');
    const modalContent = modal.querySelector('.admin-modal-content');
    modalContent.className = 'admin-modal-content receipt-mode'; 
    showModal('invoiceDetailModal');
    modalContent.innerHTML = `<div style="text-align:center; padding:20px; color:white;">Loading Receipt...</div>`;

    // 2. Find Invoice Data
    let invoice = allInvoices.find(inv => inv.invoiceId === invoiceId || inv._id === invoiceId || inv.id === invoiceId);
    
    // Fallback: fetch if not in local list
    if (!invoice) {
        try {
            const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`);
            if(res.ok) invoice = await res.json();
        } catch(e) { console.error(e); }
    }

    if (!invoice) {
        modalContent.innerHTML = '<div style="color:white; text-align:center;">Invoice not found</div>';
        return;
    }

    // 3. Prepare Settings & Rate
    const settings = systemSettings || {};
    const logoUrl = settings.receiptLogo || ""; 
    const headerLines = (settings.receiptHeader || "Paint Coffee\nART & BISTRO").split('\n');
    const shopName = headerLines[0];
    const subHeader = headerLines.slice(1).join('<br>');
    const footerText = (settings.receiptFooter || "Thank you!").replace(/\n/g, '<br>');
    
    // --- CRITICAL CHANGE: USE SAVED RATE ---
    // Use stored rate, otherwise fallback to admin setting, otherwise 4000
    const invoiceRate = invoice.exchangeRate || settings.exchangeRate || 4000;
    // ---------------------------------------

    // 4. Time Logic
    const dateObj = new Date(invoice.date);
    const dateStr = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
    const startTime = dateObj.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    const endTimestamp = invoice.lastModifiedAt ? new Date(invoice.lastModifiedAt) : new Date();
    const endTime = endTimestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
    const durationMin = Math.max(0, Math.floor((endTimestamp - dateObj) / 60000));
    
    const cashierName = invoice.createdBy || 'Staff';
    const waitingNum = (invoice.invoiceId || "0000").slice(-4);

    // 5. Build Items
    let totalGross = 0;
    let itemsHtml = '';

    if (invoice.items) {
        invoice.items.forEach((item, index) => {
            const name = item.name || 'Unknown';
            const qty = item.quantity || 0;
            
            // Just use the price stored in the invoice for admin view simplicity
            const originalPrice = item.price || 0;
            const lineTotalGross = item.total || (originalPrice * qty);
            totalGross += lineTotalGross;

            itemsHtml += `
                <tr>
                    <td style="text-align: left;">
                        <div style="font-weight: bold;">${index + 1}. ${name}</div>
                        <div style="font-size: 10px; color: #555;">Regular</div>
                    </td>
                    <td style="text-align: right;">$${originalPrice.toFixed(2)}</td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: right;">$${lineTotalGross.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // 6. Totals
    const totalNet = invoice.total || 0;
    const totalDiscount = invoice.discount || (totalGross - totalNet);
    // Use the HISTORICAL rate
    const totalKHR = Math.round((totalNet * invoiceRate) / 100) * 100;

    // 7. Inject HTML
    modalContent.innerHTML = `
        <div class="receipt-actions">
            <button class="receipt-close" style="color: #d32f2f;" onclick="downloadReceiptPDF('${invoice.invoiceId}')" title="Download PDF">
                <span class="material-icons-round">picture_as_pdf</span>
            </button>
            <button class="receipt-close" style="color: #333;" onclick="hideModal('invoiceDetailModal')">
                <span class="material-icons-round">close</span>
            </button>
        </div>

        <div class="receipt-paper" id="receipt-to-print">
            <div class="receipt-brand">
                ${logoUrl 
                    ? `<img src="${logoUrl}" style="max-width: 80%; max-height: 80px; margin-bottom:5px; display:block; margin:auto;">` 
                    : `<div class="receipt-logo-text">${shopName}</div>`
                }
                <div class="receipt-sub-header">${subHeader}</div>
            </div>

            <div style="font-size: 11px; line-height: 1.4; margin-bottom: 10px;">
                <div>INV: <b>${invoice.invoiceId || 'N/A'}</b> | ${dateStr}</div>
                <div>Cashier: ${cashierName}</div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 5px;">
                    <div>Start: ${startTime} - ${endTime}</div>
                    <div style="text-align: right; font-weight: bold;">Duration: ${durationMin} mn</div>
                </div>
            </div>

            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="text-align: left;">DESC</th>
                        <th style="text-align: right;">PRICE</th>
                        <th style="text-align: center;">QTY</th>
                        <th style="text-align: right;">AMT</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align: right; font-size: 12px; line-height: 1.6; margin-top: 10px;">
                <div>Subtotal: $${totalGross.toFixed(2)}</div>
                ${totalDiscount > 0.01 ? `<div style="color: #d32f2f; font-weight: bold;">Discount: -$${totalDiscount.toFixed(2)}</div>` : ''}
                
                <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 5px; padding-top: 5px; border-top: 2px solid #000;">
                    <span style="font-size: 14px; margin-right: 10px;">TOTAL $:</span>
                    <span style="font-size: 20px; font-weight: 800;">$${totalNet.toFixed(2)}</span>
                </div>
                <div style="font-weight: bold; font-size: 14px;">Total ៛: ${totalKHR.toLocaleString()}៛</div>
            </div>

            <div style="margin-top: 15px;">
                <div style="font-weight: bold;">Pay by ${invoice.paymentMethod === 'card' ? 'ABA/Card' : (invoice.paymentMethod || 'Cash')}</div>
                <div style="font-weight: bold; font-size: 14px;">Table: ${invoice.table || 'N/A'}</div>
                <div style="font-size: 24px; font-weight: 800; margin: 5px 0; text-align:center;">Waiting #${waitingNum}</div>
                <div class="receipt-slogan">${footerText}</div>
                <div style="text-align: center; margin-top: 5px; font-weight: bold; font-size: 10px;">1$=${invoiceRate.toLocaleString()}R</div>
            </div>
        </div>

        <div style="text-align: center; margin-top: 20px;">
            <button class="btn-admin btn-admin-primary" onclick="printReceiptArea()" style="width: 100%; justify-content: center; padding: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <span class="material-icons-round">print</span> Print Receipt
            </button>
        </div>
    `;
}

// Helper function to handle print
function printReceiptArea() {
    const content = document.getElementById('receipt-to-print').outerHTML;
    const win = window.open('', '', 'height=700,width=450');
    win.document.write('<html><head><title>Print Receipt</title>');
    // Add critical basic styles for print window
    win.document.write(`
        <style>
            body { font-family: 'Courier New', monospace; padding: 20px; }
            .receipt-paper { width: 100%; max-width: 380px; margin: 0 auto; }
            .receipt-table { width: 100%; border-collapse: collapse; }
            .receipt-table th { border-top: 1px solid #000; border-bottom: 1px solid #000; }
            .receipt-table td { border-bottom: 1px dashed #ccc; }
            .receipt-logo-text { font-family: sans-serif; font-size: 24px; font-weight: bold; }
            .receipt-totals { text-align: right; }
            .receipt-brand, .receipt-footer { text-align: center; }
        </style>
    `);
    win.document.write('</head><body>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => {
        win.print();
        win.close();
    }, 500);
}

// 2. Generate the Receipt HTML (Exact copy of POS logic)
// ================== EXACT POS RECEIPT RENDERER ==================

async function showInvoiceDetailModal(invoice) {
    const modal = document.getElementById('invoiceDetailModal');
    // We target the inner content div
    const modalContent = modal.querySelector('.admin-modal-content');
    
    // 1. Reset Modal Classes to match POS styling
    modalContent.className = 'admin-modal-content receipt-modal-container';
    
    // 2. Show Loading
    showModal('invoiceDetailModal');
    modalContent.innerHTML = `<div style="padding:40px; text-align:center; color:white;">Loading Receipt...</div>`;

    try {
        // --- DATA PREPARATION ---
        
        // A. Create Price Map from loaded menu items (to show Regular vs Sold price)
        const priceMap = {};
        if (typeof allMenuItems !== 'undefined' && Array.isArray(allMenuItems)) {
            allMenuItems.forEach(item => {
                priceMap[item.name] = item.originalPrice; 
            });
        }

        // B. Get System Settings (Logo, Headers)
        // Ensure systemSettings exists (admin.js normally loads this on init)
        const settings = (typeof systemSettings !== 'undefined') ? systemSettings : {};
        const logoUrl = settings.receiptLogo || ""; 
        const headerText = settings.receiptHeader || "Paint Coffee\nART & BISTRO";
        const headerLines = headerText.split('\n');
        const shopName = headerLines[0];
        const subHeader = headerLines.slice(1).join('<br>');
        const footerText = (settings.receiptFooter || "Thank you!\nPlease come again.").replace(/\n/g, '<br>');
        const exchangeRate = settings.exchangeRate || 4000;

        // C. Format Dates & Time
        const dateObj = new Date(invoice.date);
        const dateStr = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
        const startTime = dateObj.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        
        // Duration Logic (Mock if lastModifiedAt is missing)
        const endTimestamp = invoice.lastModifiedAt ? new Date(invoice.lastModifiedAt) : new Date();
        const endTime = endTimestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        const durationMin = Math.max(0, Math.floor((endTimestamp - dateObj) / 60000));

        // --- HTML GENERATION ---

        // D. Build Items Rows
        let totalGross = 0;
        let itemsHtml = '';

        if (invoice.items) {
            invoice.items.forEach((item, index) => {
                const name = item.name || 'Unknown';
                const qty = item.quantity || 0;
                const soldPrice = item.price || 0;
                
                // Logic: Find the highest known price to display as "Regular"
                let originalPrice = priceMap[name]; 
                if (originalPrice === undefined) originalPrice = item.originalPrice || soldPrice;
                if (soldPrice > originalPrice) originalPrice = soldPrice;

                const lineTotalGross = originalPrice * qty;
                totalGross += lineTotalGross;

                itemsHtml += `
                    <tr>
                        <td style="text-align: left;">
                            <div style="font-weight: bold;">${index + 1}. ${name}</div>
                            <div style="font-size: 10px; color: #555;">Regular</div>
                        </td>
                        <td style="text-align: right;">$${originalPrice.toFixed(2)}</td>
                        <td style="text-align: center;">${qty}</td>
                        <td style="text-align: right; font-weight: bold;">$${lineTotalGross.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        // E. Calculate Totals
        const totalNet = invoice.total || 0;
        const totalDiscount = totalGross - totalNet;
        const totalKHR = Math.round((totalNet * exchangeRate) / 100) * 100;
        const invoiceId = invoice.invoiceId || invoice._id.substring(0,6) || "0000";
        const waitingNum = invoiceId.slice(-4); // Last 4 digits
        const cashierName = invoice.createdBy || 'Staff';

        // F. Final Template
        modalContent.innerHTML = `
            <div class="receipt-actions">
                <button class="receipt-close-btn" onclick="downloadReceiptPDF('${invoiceId}')" title="Download PDF" style="color: #d32f2f;">
                    <span class="material-icons-round">picture_as_pdf</span>
                </button>
                <button class="receipt-close-btn" onclick="hideModal('invoiceDetailModal')" title="Close">
                    <span class="material-icons-round">close</span>
                </button>
            </div>

            <div class="receipt-paper" id="receipt-to-print">
                <div class="receipt-brand">
                    ${logoUrl 
                        ? `<img src="${logoUrl}" style="max-width: 60%; height: auto; margin:0 auto 5px auto; display:block;">` 
                        : `<div class="receipt-logo-text">${shopName}</div>`
                    }
                    <div class="receipt-sub-header">${subHeader}</div>
                </div>

                <div style="font-size: 11px; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
                    <div style="display:flex; justify-content:space-between;">
                        <span>INV: <b>${invoiceId}</b></span>
                        <span>${dateStr}</span>
                    </div>
                    <div>Cashier: ${cashierName}</div>
                    <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                        <span>Time: ${startTime} - ${endTime}</span>
                        <span style="font-weight:bold;">${durationMin} mn</span>
                    </div>
                </div>

                <table class="receipt-table">
                    <thead>
                        <tr>
                            <th style="text-align: left; width: 45%;">ITEM</th>
                            <th style="text-align: right; width: 20%;">PRICE</th>
                            <th style="text-align: center; width: 10%;">QTY</th>
                            <th style="text-align: right; width: 25%;">AMT</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>

                <div class="receipt-totals">
                    <div>Subtotal: $${totalGross.toFixed(2)}</div>
                    ${totalDiscount > 0.01 ? `<div style="font-weight:bold;">Discount: -$${totalDiscount.toFixed(2)}</div>` : ''}
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #000;">
                        <span style="font-size: 14px; font-weight:bold;">TOTAL:</span>
                        <span class="receipt-big-total">$${totalNet.toFixed(2)}</span>
                    </div>
                    <div style="font-weight: bold; font-size: 16px;">( ${totalKHR.toLocaleString()}៛ )</div>
                </div>

                <div style="text-align: center; margin-top: 15px;">
                    <div style="border-top: 1px dashed #000; padding-top:10px; margin-bottom:10px;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
                        <span>Pay: ${invoice.paymentMethod === 'card' ? 'ABA/Card' : (invoice.paymentMethod || 'Cash')}</span>
                        <span>Table: ${invoice.table || 'N/A'}</span>
                    </div>
                    
                    <div style="font-size: 26px; font-weight: 900; margin: 10px 0;">Waiting #${waitingNum}</div>
                    
                    <div class="receipt-footer-text">${footerText}</div>
                    <div style="margin-top: 8px; font-weight: bold; font-size: 11px;">1 USD = ${exchangeRate.toLocaleString()} KHR</div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button class="btn-admin btn-admin-primary" onclick="printReceiptArea()" style="width: 100%; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <span class="material-icons-round">print</span> Print Receipt
                </button>
            </div>
        `;

    } catch (err) {
        console.error("Receipt Render Error:", err);
        modalContent.innerHTML = `<div style="padding:20px; color:white; text-align:center;">Error: ${err.message}</div>`;
    }
}

// 3. PDF Download Function
function downloadReceiptPDF(invoiceId) {
    const element = document.getElementById('receipt-to-print');
    const opt = {
        margin: 0.1,
        filename: `Receipt_${invoiceId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: [3.15, 11], orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}
// ================== USER MANAGEMENT LOGIC ==================

// 1. Show Modal
function showAddUserModal() {
    const modal = document.getElementById('add-user-modal');
    document.getElementById('add-user-form').reset(); // Clear previous inputs
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Ensure it uses flex display
}

// 2. Save New User
async function saveUser() {
    const form = document.getElementById('add-user-form');
    const formData = new FormData(form);
    const userData = Object.fromEntries(formData.entries());

    // Basic Validation
    if (!userData.username || !userData.password) {
        showNotification('error', 'Username and PIN are required');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const data = await res.json();

        if (res.ok) {
            showNotification('success', 'User created successfully');
            hideModal('add-user-modal');
            loadUsers(); // Refresh the table
        } else {
            showNotification('error', data.error || 'Failed to create user');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        showNotification('error', 'Server connection error');
    }
}

// 3. Load Users into Table
async function loadUsers() {
    try {
        const res = await fetch(`${API_BASE_URL}/users`);
        const users = await res.json();
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No users found. Create one!</td></tr>';
            return;
        }

        users.forEach(user => {
            const roleBadge = user.role === 'admin' 
                ? '<span style="background:#E91E63; color:white; padding:2px 8px; border-radius:4px; font-size:11px;">ADMIN</span>' 
                : '<span style="background:#4CAF50; color:white; padding:2px 8px; border-radius:4px; font-size:11px;">CASHIER</span>';

            const row = `
                <tr>
                    <td><strong>${user.fullName || 'Unknown'}</strong></td>
                    <td>${user.username}</td>
                    <td>${roleBadge}</td>
                    <td>••••</td>
                    <td>
                        <button class="btn-icon delete" onclick="deleteUser('${user._id}')" style="color:#F44336;">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// 4. Delete User
async function deleteUser(id) {
    if(!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        await fetch(`${API_BASE_URL}/users/${id}`, { method: 'DELETE' });
        showNotification('success', 'User deleted');
        loadUsers();
    } catch (e) {
        showNotification('error', 'Failed to delete');
    }
}



// 4. Print Helper
function printReceiptArea() {
    // Basic window print - browser usually handles current view or you can specifically target the div via CSS media queries if needed
    // For admin panel, we might want to pop this into a new window to print cleanly
    const content = document.getElementById('receipt-to-print').innerHTML;
    const win = window.open('', '', 'height=700,width=400');
    win.document.write('<html><head><title>Print Receipt</title>');
    win.document.write('</head><body>');
    win.document.write(content);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
}

// ================== MAKE FUNCTIONS GLOBAL ==================
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.showNotification = showNotification;
window.hideModal = hideModal;
window.showAddMenuItemModal = showAddMenuItemModal;
window.showAddUserModal = showAddUserModal;
window.saveMenuItem = saveMenuItem;
window.deleteMenuItem = deleteMenuItem;
window.editMenuItem = editMenuItem;
window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.resetPassword = resetPassword;
window.addNewCategory = addNewCategory;
window.deleteCategory = deleteCategory;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;
window.logout = logout;
window.viewOrder = viewOrder;
window.deleteOrder = deleteOrder;
window.viewInvoice = viewInvoice;
window.deleteInvoice = deleteInvoice;
window.exportInvoices = exportInvoices;
window.addDefaultItems = addDefaultItems;
window.toggleMenuItemStatus = toggleMenuItemStatus;
window.switchMenuView = switchMenuView;
window.filterByCategory = filterByCategory;
window.filterCategories = filterCategories;
window.searchMenuItems = searchMenuItems;
window.showInvalidItemsModal = showInvalidItemsModal;
window.applyCategoryFix = applyCategoryFix;
window.applyAllCategoryFixes = applyAllCategoryFixes;
window.quickFixCategories = quickFixCategories;
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.showAddUserModal = showAddUserModal;
window.saveUser = saveUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.hideModal = hideModal;
window.logout = () => window.location.href = 'pos.html';