document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded - starting POS system');
    
    // --- Real-time Date & Time Function ---
    function updateDateTime() {
        
        const now = new Date();
        
        // Format date: "Wed 10/29/2025"
        const formattedDate = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }).replace(/,/g, '');
        
        // Format time: "5:28 PM"
        const formattedTime = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        // Update all datetime elements on the page (only in header)
        const datetimeElements = document.querySelectorAll('.datetime');
        datetimeElements.forEach(element => {
            element.innerHTML = `
                <span class="material-icons-round">today</span> ${formattedDate} - 
                <span class="material-icons-round">schedule</span> ${formattedTime}
            `;
        });
    }
    
    function formatInvoiceDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).replace(/,/g, '');
    }
    
    function updateInvoiceDateDisplay() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', {
            weekday: 'short',
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        }).replace(/,/g, '');
        
        const formattedTime = now.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        // Update the invoice date in order panel if it exists
        const invoiceDateElement = document.querySelector('.table-selector-group h3');
        if (invoiceDateElement) {
            invoiceDateElement.textContent = `Date: ${formattedDate} ${formattedTime}`;
        }
    }
    
    function updateInvoiceNumberDisplay(invoiceId = null, nextInvoiceId = null) {
        const invoiceNumberElement = document.getElementById('invoiceNumberDisplay');
        if (invoiceNumberElement) {
            if (invoiceId) {
                // Show the actual invoice ID when editing
                invoiceNumberElement.textContent = invoiceId;
                invoiceNumberElement.style.color = 'var(--primary-color)';
            } else if (nextInvoiceId) {
                // Show the next available invoice number when creating new
                invoiceNumberElement.textContent = nextInvoiceId;
                invoiceNumberElement.style.color = 'var(--primary-color)';
            } else {
                // Show "Creating new invoice" as fallback
                invoiceNumberElement.textContent = 'Creating New...';
                invoiceNumberElement.style.color = 'var(--text-muted)';
            }
        }
    }
    
    // Initialize datetime
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // --- API Configuration ---
    const API_BASE_URL = 'https://nodetest-backend-jwqo.onrender.com/api';

    // API Functions - FIXED VERSION
    const api = {
    // Settings API
        async getSettings() {
            try {
                const response = await fetch(`${API_BASE_URL}/settings`);
                if (!response.ok) throw new Error('Failed to fetch settings');
                return await response.json();
            } catch (error) {
                console.error('Error fetching settings:', error);
                return { exchangeRate: 4000 }; // Fallback
            }
        },
        // Menu API - FIXED with better error handling
       // In the api.getMenuItems function, remove the sample data fallback:

async getMenuItems() {
    try {
        console.log('📋 Fetching menu items from:', `${API_BASE_URL}/menu`);
        
        const response = await fetch(`${API_BASE_URL}/menu`);
        if (!response.ok) {
            console.error('❌ Menu API responded with error:', response.status);
            throw new Error(`Menu API failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Raw API response:', {
            length: data.length,
            isArray: Array.isArray(data)
        });
        
        if (!Array.isArray(data)) {
            console.error('❌ API response is not an array:', typeof data, data);
            throw new Error('Invalid response format from menu API');
        }
        
        // Transform data
        const transformedData = this.transformMenuData(data);
        console.log('✅ Transformed data:', transformedData.length, 'items');
        
        return transformedData;
        
    } catch (error) {
        console.error('❌ Failed to fetch menu items:', error);
        // Return empty array instead of sample data
        return [];
    }
},

// Remove the getSampleMenuData function entirely from pos.js

        // Helper method to transform menu data
        transformMenuData(data) {
            if (!Array.isArray(data)) {
                console.error('transformMenuData: data is not an array:', data);
                return [];
            }
            
            return data.map(item => {
                // Ensure we have both id and _id fields
                let itemId;
                
                if (item._id) {
                    itemId = typeof item._id === 'object' ? item._id.toString() : String(item._id);
                } else if (item.id) {
                    itemId = String(item.id);
                } else {
                    itemId = Math.random().toString(36).substr(2, 9);
                }
                
                return {
                    ...item,
                    id: itemId,
                    _id: itemId,
                    originalPrice: item.originalPrice || item.price || 0,
                    category: item.category || 'Uncategorized',
                    isPromo: item.isPromo || false,
                    isActive: item.isActive !== false // Default to true if not specified
                };
            });
        },

        async getMenuItemsByCategory(category) {
            try {
                console.log('Fetching items for category:', category);
                const response = await fetch(`${API_BASE_URL}/menu/category/${encodeURIComponent(category)}`);
                if (!response.ok) throw new Error(`Failed to fetch category: ${response.status}`);
                const data = await response.json();
                return this.transformMenuData(data);
            } catch (error) {
                console.error('Error fetching menu by category:', error);
                return [];
            }
        },

        // Invoices API
        async getInvoices() {
            try {
                const response = await fetch(`${API_BASE_URL}/invoices`);
                if (!response.ok) throw new Error('Failed to fetch invoices');
                return await response.json();
            } catch (error) {
                console.error('Error fetching invoices:', error);
                return [];
            }
        },

        // In the api object in pos.js, update the getInvoice function:
async getInvoice(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${id}`);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Invoice API error:', response.status, errorText);
            throw new Error(`Failed to fetch invoice: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching invoice:', error);
        throw error; // Re-throw so the caller can handle it
    }
},

        async createInvoice(invoiceData) {
            try {
                const response = await fetch(`${API_BASE_URL}/invoices`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(invoiceData)
                });
                if (!response.ok) throw new Error('Failed to create invoice');
                return await response.json();
            } catch (error) {
                console.error('Error creating invoice:', error);
                throw error;
            }
        },

        async updateInvoice(id, invoiceData) {
            try {
                const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(invoiceData)
                });
                if (!response.ok) throw new Error('Failed to update invoice');
                return await response.json();
            } catch (error) {
                console.error('Error updating invoice:', error);
                throw error;
            }
        },

        async deleteInvoice(id) {
            try {
                const response = await fetch(`${API_BASE_URL}/invoices/${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Failed to delete invoice');
                return await response.json();
            } catch (error) {
                console.error('Error deleting invoice:', error);
                throw error;
            }
        }
    };

    // Sample menu data for testing when server is down
    function getSampleMenuData() {
        console.log('⚠️ Using sample menu data');
        return [
            {
                _id: '1',
                id: '1',
                name: 'Coca-Cola',
                originalPrice: 2.50,
                category: 'Drink',
                type: 'Cold',
                isPromo: false,
                isActive: true,
                image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&h=130&fit=crop'
            },
            {
                _id: '2',
                id: '2',
                name: 'Pepsi',
                originalPrice: 2.50,
                category: 'Drink',
                type: 'Cold',
                isPromo: true,
                promoPrice: 2.00,
                badge: 'PROMO',
                isActive: true,
                image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&h=130&fit=crop'
            },
            {
                _id: '3',
                id: '3',
                name: 'Burger',
                originalPrice: 8.99,
                category: 'Food',
                type: 'Hot',
                isPromo: false,
                isActive: true,
                image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&h=130&fit=crop'
            },
            {
                _id: '4',
                id: '4',
                name: 'French Fries',
                originalPrice: 3.99,
                category: 'Food',
                type: 'Hot',
                isPromo: true,
                promoPrice: 2.99,
                badge: 'SALE',
                isActive: true,
                image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=200&h=130&fit=crop'
            },
            {
                _id: '5',
                id: '5',
                name: 'Coffee',
                originalPrice: 3.50,
                category: 'Drink',
                type: 'Hot',
                isPromo: false,
                isActive: true,
                image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=130&fit=crop'
            },
            {
                _id: '6',
                id: '6',
                name: 'Tea',
                originalPrice: 2.50,
                category: 'Drink',
                type: 'Hot',
                isPromo: false,
                isActive: true,
                image: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=200&h=130&fit=crop'
            }
        ];
    }

    // Helper function for MongoDB ObjectId comparison
    function isSameItemId(itemId1, itemId2) {
        if (!itemId1 || !itemId2) return false;
        
        // Convert both to strings for comparison
        const str1 = String(itemId1);
        const str2 = String(itemId2);
        
        return str1 === str2;
    }

    // --- 2. DOM Elements & State ---
    const orderList = document.querySelector('.order-list');
    const menuGrid = document.querySelector('.menu-items-grid');
    const menuCategoriesContainer = document.querySelector('.menu-categories');
    const totalUSDDisplay = document.querySelector('.total-usd');
    const totalKHRDisplay = document.querySelector('.total-khr');
    const subTotalDisplay = document.querySelector('.calc-row:nth-child(1) span:nth-child(2)');
    const discountDisplay = document.querySelector('.discount-row span:nth-child(2)');
    const emptyState = document.querySelector('.empty-state');
    
    // Table Modal Elements
    const changeTableBtn = document.querySelector('.edit-btn');
    const tableModal = document.getElementById('tableModal');
    const currentTableDisplay = document.querySelector('.table-selector-group h2');

    // Payment & Action Buttons
    const cashBtn = document.querySelector('.payment-btn.cash');
    const cardBtn = document.querySelector('.payment-btn.card');
    const deliveryBtn = document.querySelector('.payment-btn.delivery');

    // Cash Modal Elements
    const cashModal = document.getElementById('cashModal');
    const cashModalDue = document.getElementById('cashModalDue');
    const cashModalDueKHR = document.getElementById('cashModalDueKHR');
    const cashReceivedUSD = document.getElementById('cashReceivedUSD');
    const cashReceivedKHR = document.getElementById('cashReceivedKHR');
    const changeDisplayUSDContainer = document.getElementById('changeDisplayUSDContainer');
    const changeDisplayKHRContainer = document.getElementById('changeDisplayKHRContainer');
    
    // Delivery Modal Elements
    const deliveryModal = document.getElementById('deliveryModal');
    const deliveryAppBtns = deliveryModal ? deliveryModal.querySelectorAll('.app-btn') : [];
    const saveDeliveryAppBtn = document.getElementById('saveDeliveryApp');

    // Item Detail Modal Elements
    const itemDetailModal = document.getElementById('itemDetailModal');
    const itemModalName = document.getElementById('itemModalName');
    const itemModalUnitPrice = document.getElementById('itemModalUnitPrice');
    const itemModalQuantity = document.getElementById('itemModalQuantity');
    const itemNotesInput = document.getElementById('itemNotes');
    const discountValueInput = document.getElementById('discountValue');
    const discountTypeButtons = document.getElementById('discountTypeButtons');
    const discountTypeBtns = discountTypeButtons ? discountTypeButtons.querySelectorAll('.discount-type-btn') : [];
    const itemModalTotalPriceDisplay = document.getElementById('itemModalTotalPrice');
    const saveItemDetailsBtn = document.getElementById('saveItemDetailsBtn');
    const splitOrderItemBtn = document.getElementById('splitOrderItemBtn');
    const sugarSelectionBtns = document.getElementById('sugarSelection').querySelectorAll('.selection-btn');
    const modalQtyDecreaseBtn = itemDetailModal ? itemDetailModal.querySelector('.item-controls-modal .qty-btn[data-action="decrease"]') : null;
    const modalQtyIncreaseBtn = itemDetailModal ? itemDetailModal.querySelector('.item-controls-modal .qty-btn[data-action="increase"]') : null;
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');

    // Global Discount Modal Elements
    const btnDisAll = document.querySelector('.btn-dis-all');
    const discountModal = document.getElementById('discountModal');
    const globalDiscountValueInput = document.getElementById('globalDiscountValue');
    const globalDiscountTypeButtons = document.getElementById('globalDiscountTypeButtons');
    const globalDiscountTypeBtns = globalDiscountTypeButtons ? globalDiscountTypeButtons.querySelectorAll('.discount-type-btn') : [];
    const applyGlobalDiscountBtn = document.getElementById('applyGlobalDiscountBtn');
    const clearGlobalDiscountBtn = document.getElementById('clearGlobalDiscountBtn');

    // Search Elements
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    // Category Elements
    const viewAllCategories = document.getElementById('viewAllCategories');
    
    // Page Navigation Elements
    const menuPage = document.getElementById('menuPage');
    const invoicesPage = document.getElementById('invoicesPage');
    const navButtons = document.querySelectorAll('.nav-btn');
    const invoiceSearchInput = document.getElementById('invoiceSearchInput');
    const invoiceListBody = document.getElementById('invoiceListBody');
    const noInvoicesMessage = document.getElementById('noInvoicesMessage');

    // Application State
    let menuData = [];
    let invoices = [];
    let order = {};
    let currentTable = 0;
    let selectedPaymentMethod = 'none';
    let selectedDeliveryApp = 'Delivery';
    let currentItemForModal = null;
    let orderItemSequence = 0;
    let globalDiscount = 0;
    let globalDiscountType = 'percent';
    let currentEditingInvoiceId = null;

    // --- GLOBAL VARIABLES ---
let categories = [];
let systemSettings = {}; 

    let KHR_RATE = 4000;

    // --- 3. Utility Functions ---

    // --- Modal Control Functions ---
    function showModal(modal) {
        if (modal) {
            // Close any other open modals first
            document.querySelectorAll('.modal-overlay').forEach(m => {
                if (!m.classList.contains('hidden') && m !== modal) {
                    m.classList.add('hidden');
                }
            });
            
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        }
    }

    function hideModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            // Only remove modal-open class if no other modals are open
            const anyModalOpen = Array.from(document.querySelectorAll('.modal-overlay'))
                .some(modal => !modal.classList.contains('hidden'));
            if (!anyModalOpen) {
                document.body.classList.remove('modal-open');
            }
        }
    }
async function loadSystemSettings() {
    try {
        const response = await fetch('https://nodetest-backend-jwqo.onrender.com/settings');
        if (response.ok) {
            systemSettings = await response.json();
            
            // UPDATE THE GLOBAL EXCHANGE RATE
            if (systemSettings.exchangeRate) {
                KHR_RATE = systemSettings.exchangeRate;
                console.log("POS loaded Exchange Rate:", KHR_RATE);
            }
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
}
    function calculateChange() {
        const totalDue = parseFloat(totalUSDDisplay.textContent.replace('$', '')) || 0;
        const usdReceived = parseFloat(cashReceivedUSD.value) || 0;
        const khrReceived = parseFloat(cashReceivedKHR.value) || 0;

        const khrReceivedInUSD = khrReceived / KHR_RATE;
        const totalReceivedUSD = usdReceived + khrReceivedInUSD;

        const changeUSD = totalReceivedUSD - totalDue;

        const changeKHR = changeUSD * KHR_RATE;

        let displayChangeUSD = changeUSD.toFixed(2);
        let displayChangeKHR = Math.abs(changeKHR).toLocaleString('en-US', { maximumFractionDigits: 0 });

        let usdContainer = changeDisplayUSDContainer;
        let khrContainer = changeDisplayKHRContainer;

        if (changeUSD < -0.01) {
            usdContainer.classList.remove('positive');
            usdContainer.classList.add('negative');
            khrContainer.classList.remove('positive');
            khrContainer.classList.add('negative');
            changeDisplayUSD.textContent = `-$${Math.abs(changeUSD).toFixed(2)}`;
            changeDisplayKHR.textContent = `-${displayChangeKHR}៛`;
        } else if (changeUSD > 0.01) {
            usdContainer.classList.remove('negative');
            khrContainer.classList.remove('negative');
            usdContainer.classList.add('positive');
            khrContainer.classList.add('positive');
            changeDisplayUSD.textContent = `$${displayChangeUSD}`;
            changeDisplayKHR.textContent = `${displayChangeKHR}៛`;
        } else {
            changeDisplayUSD.textContent = `$0.00`;
            changeDisplayKHR.textContent = `0៛`;
            usdContainer.classList.remove('positive', 'negative');
            khrContainer.classList.remove('positive', 'negative');
        }
    }

    function updateTableDisplay() {
        const tableDisplay = document.getElementById('currentTableDisplay');
        if (tableDisplay) {
            tableDisplay.textContent = currentTable;
        }
    }

    function updatePaymentBtnActiveState() {
        [cashBtn, cardBtn, deliveryBtn].forEach(btn => btn.classList.remove('active'));

        if (selectedPaymentMethod === 'cash') cashBtn.classList.add('active');
        if (selectedPaymentMethod === 'card') cardBtn.classList.add('active');
        if (selectedPaymentMethod === 'delivery') deliveryBtn.classList.add('active');

        deliveryBtn.innerHTML = `<span class="material-icons-round">two_wheeler</span> ${selectedDeliveryApp}`;
    }
async function validateMenuItems() {
    try {
        console.log('🔍 Validating menu items...');
        
        // Get categories from database
        const categoriesResponse = await fetch(`${API_BASE_URL}/api/categories`);
        if (!categoriesResponse.ok) {
            console.warn('Cannot validate: Failed to fetch categories');
            return;
        }
        
        const dbCategories = await categoriesResponse.json();
        console.log('Database categories for validation:', dbCategories);
        
        // Check each menu item's category
        const invalidItems = [];
        const validItems = [];
        
        menuData.forEach(item => {
            const itemCategory = item.category;
            
            if (!itemCategory || itemCategory.trim() === '') {
                invalidItems.push({
                    name: item.name,
                    issue: 'No category assigned',
                    currentCategory: itemCategory
                });
            } else if (!dbCategories.includes(itemCategory)) {
                invalidItems.push({
                    name: item.name,
                    issue: 'Category not in database',
                    currentCategory: itemCategory,
                    validCategories: dbCategories
                });
            } else {
                validItems.push(item.name);
            }
        });
        
        console.log('📊 Validation results:');
        console.log(`- Total items: ${menuData.length}`);
        console.log(`- Valid items: ${validItems.length}`);
        console.log(`- Items with issues: ${invalidItems.length}`);
        
        if (invalidItems.length > 0) {
            console.warn('⚠️ Items with category issues:', invalidItems);
            
            // Show warning in console
            console.warn(`
            ============================================
            CATEGORY VALIDATION WARNING
            ============================================
            Some menu items have categories that don't exist 
            in the database. These items will NOT appear in 
            their category filters.
            
            Issues found: ${invalidItems.length} items
            Valid categories in database: ${dbCategories.join(', ')}
            
            Fix: Go to Admin Panel → Menu Items → Edit each item
            and select a category from the dropdown.
            ============================================
            `);
        }
        
    } catch (error) {
        console.error('Error validating menu items:', error);
    }
}
function generateMenuGrid(data) {
        console.log('Generating menu grid with', data.length, 'items');
        
        if (!menuGrid) {
            console.error('menuGrid element not found!');
            return;
        }
        
        // Clear existing content
        menuGrid.innerHTML = '';
        
        if (!data || data.length === 0) {
            console.log('No data to display');
            menuGrid.innerHTML = '<div class="no-items">No items found</div>';
            return;
        }
        
        data.forEach((item, index) => {
            const itemId = item._id || item.id;
            
            // 1. Determine USD Price
            const priceToDisplay = item.isPromo ? item.promoPrice : item.originalPrice;
            
            // 2. DYNAMIC CALCULATION: Calculate Riel using the latest Global KHR_RATE
            // This KHR_RATE comes from your Admin Settings
            const rawKhr = priceToDisplay * KHR_RATE;
            
            // Round to nearest 100 Riel (e.g. 4120 -> 4100)
            const khrPrice = Math.round(rawKhr / 100) * 100; 
            const khrPriceDisplay = khrPrice.toLocaleString('en-US');

            // 3. Generate HTML
            const priceHtml = item.isPromo
                ? `<span class="item-price">
                    <del style="color: var(--price-red);">${item.originalPrice.toFixed(2)}$</del>
                    <br>
                    ${priceToDisplay.toFixed(2)}$ | ${khrPriceDisplay}៛
                   </span>`
                : `<span class="item-price">${priceToDisplay.toFixed(2)}$ | ${khrPriceDisplay}៛</span>`;

            const typeClass = item.type ? item.type.toLowerCase().replace(' ', '-') : '';

            const itemHtml = `
                <div class="menu-item ${item.isPromo ? 'promo' : ''}" data-item-id="${itemId}">
                    ${item.badge ? `<div class="item-badge">${item.badge}</div>` : ''}
                    <div class="item-image-container">
                        <img src="${item.image || 'https://via.placeholder.com/200x130/F5F7FA/9E9E9E?text=No+Image'}" alt="${item.name}" class="item-image">
                    </div>
                    <p class="item-name">${item.name}</p>
                    <div class="item-details">
                        ${item.type ? `<span class="item-type ${typeClass}">${item.type}</span>` : ''}
                        ${priceHtml}
                    </div>
                </div>
            `;
            
            menuGrid.insertAdjacentHTML('beforeend', itemHtml);
        });

        // Re-attach click handlers to the new items
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            newItem.addEventListener('click', handleMenuItemClick);
        });
    }

    function calculateOrderItemPrice(item) {
        const originalPrice = item.originalPrice;
        const quantity = item.quantity;
        const itemSubtotal = originalPrice * quantity;
        let effectivePrice = itemSubtotal;

        // 1. Apply built-in promo discount
        if (item.isPromo) {
            const menuItem = menuData.find(m => 
                isSameItemId(m._id, item.id) || 
                isSameItemId(m.id, item.id)
            );
            if (menuItem && menuItem.promoPrice) {
                effectivePrice = menuItem.promoPrice * quantity;
            }
        }

        // 2. Apply custom discount
        let customDiscountAmount = 0;
        if (item.customDiscountType === 'percent') {
            customDiscountAmount = effectivePrice * (item.customDiscount / 100);
        } else if (item.customDiscountType === 'usd') {
            customDiscountAmount = item.customDiscount || 0;
        } else if (item.customDiscountType === 'khr') {
            customDiscountAmount = (item.customDiscount || 0) / KHR_RATE;
        }

        effectivePrice = effectivePrice - Math.min(customDiscountAmount, effectivePrice);

        return Math.max(0, effectivePrice);
    }
// Global variable for Rate (make sure this is declared at the top of your file)
    // let KHR_RATE = 4000; 

    // --- Rounding Function for Riel ---
    function roundRiel(amount) {
        // Round to nearest 100
        // 149 -> 100
        // 150 -> 200
        return Math.round(amount / 100) * 100;
    }

function calculateTotals() {
        let subTotal = 0;
        let totalItemDiscount = 0;

        // 1. Calculate Subtotal & Item Discounts
        for (const uniqueId in order) {
            const item = order[uniqueId];
            const originalPrice = item.originalPrice;
            const quantity = item.quantity;
            const itemSubtotal = originalPrice * quantity;

            subTotal += itemSubtotal;

            const itemFinalPrice = calculateOrderItemPrice(item);
            const itemDiscount = itemSubtotal - itemFinalPrice;
            totalItemDiscount += itemDiscount;
        }

        const totalBeforeGlobalDiscount = subTotal - totalItemDiscount;
        
        // 2. Calculate Global Discount
        let globalDiscountAmount = 0;
        if (globalDiscount > 0) {
            if (globalDiscountType === 'percent') {
                globalDiscountAmount = totalBeforeGlobalDiscount * (globalDiscount / 100);
            } else if (globalDiscountType === 'usd') {
                globalDiscountAmount = globalDiscount;
            } else if (globalDiscountType === 'khr') {
                // Convert KHR discount to USD using the rate
                globalDiscountAmount = globalDiscount / KHR_RATE;
            }
            globalDiscountAmount = Math.min(globalDiscountAmount, totalBeforeGlobalDiscount);
        }

        const totalAllDiscount = totalItemDiscount + globalDiscountAmount;
        const totalAmountUSD = totalBeforeGlobalDiscount - globalDiscountAmount;
        
        // 3. CRITICAL: Calculate Grand Total KHR using Admin Rate
        const rawKHR = totalAmountUSD * KHR_RATE;
        // Round to nearest 100 Riel
        const totalAmountKHR = Math.round(rawKHR / 100) * 100;

        // 4. Update UI Displays
        if (subTotalDisplay) subTotalDisplay.textContent = `$${subTotal.toFixed(2)}`;
        if (discountDisplay) discountDisplay.textContent = `-$${totalAllDiscount.toFixed(2)}`;
        
        // Ensure total is never negative
        const finalUSD = Math.max(0, totalAmountUSD);
        const finalKHR = Math.max(0, totalAmountKHR);

        if (totalUSDDisplay) totalUSDDisplay.textContent = `$${finalUSD.toFixed(2)}`;
        if (totalKHRDisplay) totalKHRDisplay.textContent = `${finalKHR.toLocaleString('en-US')}៛`;

        // 5. Update Cash Modal if Open
        if (typeof cashModal !== 'undefined' && cashModal && !cashModal.classList.contains('hidden')) {
            if (cashModalDue) cashModalDue.textContent = totalUSDDisplay.textContent;
            if (cashModalDueKHR) cashModalDueKHR.textContent = totalKHRDisplay.textContent;
            // Recalculate change if the total changed
            if (typeof calculateChange === 'function') calculateChange();
        }
    }

    function updateOrderDisplay() {
        orderList.innerHTML = '';
        let hasItems = false;

        for (const uniqueId in order) {
            const item = order[uniqueId];
            hasItems = true;

            const menuItemData = menuData.find(m => 
                isSameItemId(m._id, item.id) || 
                isSameItemId(m.id, item.id)
            );
            if (!menuItemData) {
                console.warn('Menu item data not found for order item:', item.id, 'Available:', menuData.map(m => m._id?.toString() || m.id));
                continue;
            }
            
            const unitPrice = menuItemData.originalPrice;
            const finalUnitPrice = item.isPromo ? (menuItemData.promoPrice || unitPrice) : unitPrice;
            
            const totalItemPrice = calculateOrderItemPrice(item);
            
            const imageUrl = menuItemData.image || 'https://via.placeholder.com/50x50/EBEBEB/9E9E9E?text=IMG';

            let customDiscText = '';
            if (item.customDiscount > 0) {
                if (item.customDiscountType === 'percent') {
                    customDiscText = ` (-${item.customDiscount}%)`;
                } else if (item.customDiscountType === 'usd') {
                    customDiscText = ` (-$${item.customDiscount.toFixed(2)})`;
                } else if (item.customDiscountType === 'khr') {
                    customDiscText = ` (-${item.customDiscount.toLocaleString('en-US', { maximumFractionDigits: 0 })}៛)`;
                }
            }

            const sugarText = item.sugarLevel && item.sugarLevel !== 'Default' ? ` / Sugar: ${item.sugarLevel}` : '';
            const notesText = item.notes ? ` / ${item.notes}` : '';

            const itemHtml = `
                <div class="order-item ${item.isPromo ? 'promo-item' : ''}" data-order-id="${uniqueId}">
                    <div class="item-image-small" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;"></div>
                    <div class="item-info">
                        <p class="name">${item.name}</p>
                        <div class="item-controls">
                            <span class="notes">${finalUnitPrice.toFixed(2)}$${customDiscText}${sugarText}${notesText}</span>
                            <button class="qty-btn" data-action="decrease" data-id="${uniqueId}">
                                <span class="material-icons-round">remove</span>
                            </button>
                            <span class="quantity">x${item.quantity}</span>
                            <button class="qty-btn" data-action="increase" data-id="${uniqueId}">
                                <span class="material-icons-round">add</span>
                            </button>
                        </div>
                    </div>
                    <span class="price-new">$${totalItemPrice.toFixed(2)}</span>
                </div>
            `;
            orderList.insertAdjacentHTML('beforeend', itemHtml);
        }

        if (hasItems) {
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
        } else {
            if (emptyState) {
                emptyState.classList.remove('hidden');
                selectedPaymentMethod = 'none';
                updatePaymentBtnActiveState();
                globalDiscount = 0;
                globalDiscountType = 'percent';
            }
        }
        calculateTotals();
        updateMobileCartCount();
    }

    // --- 4. Event Handlers ---

    // Global close for all modals
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            // Only close if clicking directly on the overlay (not on modal content)
            if (e.target === modal) {
                const closeOnBackdrop = modal.dataset.closeOnBackdrop !== 'false';
                if (closeOnBackdrop) {
                    hideModal(modal);
                }
            }
        });
    });

    document.querySelectorAll('.modal-header .close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                hideModal(modal);
            }
        });
    });

    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (!modal.classList.contains('hidden')) {
                    // If closing cash modal, reset payment method
                    if (modal === cashModal && selectedPaymentMethod === 'cash') {
                        selectedPaymentMethod = 'none';
                        updatePaymentBtnActiveState();
                    }
                    hideModal(modal);
                }
            });
        }
    });

    // Table Modal Handlers
    if (changeTableBtn) {
        changeTableBtn.addEventListener('click', () => showModal(tableModal));
    }

    if (tableModal) {
        tableModal.addEventListener('click', (e) => {
            const btn = e.target.closest('.table-btn');
            if (!btn) return;

            document.querySelectorAll('.table-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            const newTable = parseInt(btn.dataset.tableNumber);
            currentTable = newTable;
            updateTableDisplay();
            hideModal(tableModal);
        });
    }

    // Payment Button Handlers
    cashBtn.addEventListener('click', () => {
        if (Object.keys(order).length === 0) {
            showNotification('warning', 'Please add items to the order first!');
            return;
        }
        selectedPaymentMethod = 'cash';
        updatePaymentBtnActiveState();
        if (totalUSDDisplay) {
            cashModalDue.textContent = totalUSDDisplay.textContent;
            cashModalDueKHR.textContent = totalKHRDisplay.textContent;
            cashReceivedUSD.value = '';
            cashReceivedKHR.value = '';
            calculateChange();
            updateCashProcessButtonState(); // Initialize button state
            showModal(cashModal);
        }
    });

    cardBtn.addEventListener('click', () => {
        if (Object.keys(order).length === 0) {
    showNotification('warning', 'Please add items to the order first!');
    return;
}
        selectedPaymentMethod = 'card';
        updatePaymentBtnActiveState();
    });

    deliveryBtn.addEventListener('click', () => {
        if (Object.keys(order).length === 0) {
    showNotification('warning', 'Please add items to the order first!');
    return;
}
        selectedPaymentMethod = 'delivery';
        updatePaymentBtnActiveState();
        deliveryAppBtns.forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.app === selectedDeliveryApp) {
                btn.classList.add('selected');
            }
        });
        showModal(deliveryModal);
    });

    // Cash Modal Input Logic
    cashReceivedUSD.addEventListener('input', () => {
        calculateChange();
        updateCashProcessButtonState();
    });

    cashReceivedKHR.addEventListener('input', () => {
        calculateChange();
        updateCashProcessButtonState();
    });
    
    // Cash modal close handler with reset
    cashModal.addEventListener('click', (e) => {
        if (e.target === cashModal && cashModal.dataset.closeOnBackdrop !== 'false') {
            resetCashModal();
            if (selectedPaymentMethod === 'cash') {
                selectedPaymentMethod = 'none';
                updatePaymentBtnActiveState();
            }
            hideModal(cashModal);
        }
    });

    cashModal.querySelector('.close-btn').addEventListener('click', () => {
        resetCashModal();
        if (selectedPaymentMethod === 'cash') {
            selectedPaymentMethod = 'none';
            updatePaymentBtnActiveState();
        }
        hideModal(cashModal);
    });

    // Reset cash modal function
    function resetCashModal() {
        cashReceivedUSD.value = '';
        cashReceivedKHR.value = '';
        changeDisplayUSD.textContent = '$0.00';
        changeDisplayKHR.textContent = '0៛';
        changeDisplayUSDContainer.classList.remove('positive', 'negative');
        changeDisplayKHRContainer.classList.remove('positive', 'negative');
    }

    // Cash Modal Clear Buttons
    document.querySelectorAll('.btn-clear').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.clearTarget;
            if (targetId === 'cashReceivedUSD') {
                cashReceivedUSD.value = '';
                calculateChange();
                updateCashProcessButtonState();
            } else if (targetId === 'cashReceivedKHR') {
                cashReceivedKHR.value = '';
                calculateChange();
                updateCashProcessButtonState();
            }
        });
    });

    // Delivery App Modal Logic 
    if (deliveryAppBtns.length > 0) {
        deliveryAppBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                deliveryAppBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    if (saveDeliveryAppBtn) {
        saveDeliveryAppBtn.addEventListener('click', () => {
            const selectedBtn = Array.from(deliveryAppBtns).find(btn => btn.classList.contains('selected'));
            if (selectedBtn) {
                selectedDeliveryApp = selectedBtn.dataset.app;
                updatePaymentBtnActiveState();
                hideModal(deliveryModal);
            }
        });
    }

    // --- Global Discount Modal Handlers ---
    if (btnDisAll) {
        btnDisAll.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (Object.keys(order).length === 0) {
    showNotification('warning', 'Please add items to the order first!');
    return;
}

            // Close any other open modals first
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                if (!modal.classList.contains('hidden') && modal !== discountModal) {
                    hideModal(modal);
                }
            });

            // Set current values in the modal
            globalDiscountValueInput.value = globalDiscount;
            
            // Set the correct discount type button based on current discount type
            globalDiscountTypeBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.type === globalDiscountType) {
                    btn.classList.add('active');
                }
            });
            
            showModal(discountModal);
        });
    }

    // Global discount type button handlers
    if (globalDiscountTypeBtns.length > 0) {
        globalDiscountTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                globalDiscountTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    if (applyGlobalDiscountBtn) {
        applyGlobalDiscountBtn.addEventListener('click', () => {
            const value = parseFloat(globalDiscountValueInput.value) || 0;
            const type = Array.from(globalDiscountTypeBtns).find(btn => btn.classList.contains('active'))?.dataset.type || 'percent';

            if (value < 0) {
                alert('Discount value cannot be negative!');
                return;
            }

            globalDiscount = Math.max(0, value);
            globalDiscountType = type;

            hideModal(discountModal);
            updateOrderDisplay();
        });
    }

    if (clearGlobalDiscountBtn) {
        clearGlobalDiscountBtn.addEventListener('click', () => {
            globalDiscount = 0;
            globalDiscountType = 'percent';
            globalDiscountValueInput.value = 0;
            globalDiscountTypeBtns.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.type === 'percent') {
                    btn.classList.add('active');
                }
            });
            hideModal(discountModal);
            updateOrderDisplay();
        });
    }
    
    // --- ITEM DETAIL MODAL LOGIC ---

    function calculateModalTotalPrice(item, quantity) {
        const menuItemData = menuData.find(m => 
            isSameItemId(m._id, item.id) || 
            isSameItemId(m.id, item.id)
        );
        if (!menuItemData) return 0;
        
        const unitPrice = item.isPromo ? (menuItemData.promoPrice || menuItemData.originalPrice) : menuItemData.originalPrice;
        let currentTotal = unitPrice * quantity;

        let discountValue = parseFloat(discountValueInput.value) || 0;
        const discountType = Array.from(discountTypeBtns).find(btn => btn.classList.contains('active'))?.dataset.type || 'percent';

        let discountAmount = 0;
        if (discountType === 'percent') {
            discountAmount = currentTotal * (discountValue / 100);
        } else if (discountType === 'usd') {
            discountAmount = discountValue;
        } else if (discountType === 'khr') {
            discountAmount = discountValue / KHR_RATE;
        }

        currentTotal = currentTotal - Math.min(discountAmount, currentTotal);
        return Math.max(0, currentTotal);
    }

    function updateItemModalDisplay(item) {
        if (!item) return;

        const menuItemData = menuData.find(m => 
            isSameItemId(m._id, item.id) || 
            isSameItemId(m.id, item.id)
        );
        if (!menuItemData) return;
        
        const unitPrice = item.isPromo ? (menuItemData.promoPrice || menuItemData.originalPrice) : menuItemData.originalPrice;
        const imageUrl = menuItemData.image || 'https://via.placeholder.com/200x130/F5F7FA/9E9E9E?text=No+Image';
        
        itemModalName.textContent = item.name;
        itemModalUnitPrice.textContent = `$${unitPrice.toFixed(2)}`;
        itemModalQuantity.textContent = `x${item.quantity}`;
        itemNotesInput.value = item.notes || '';
        discountValueInput.value = item.customDiscount || 0;
        
        // Set image source
        const itemModalImg = document.querySelector('#itemDetailModal .item-modal-img');
        if (itemModalImg) {
            itemModalImg.src = imageUrl;
        }

        // Set discount type buttons
        discountTypeBtns.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === (item.customDiscountType || 'percent')) {
                btn.classList.add('active');
            }
        });

        // Set sugar level
        sugarSelectionBtns.forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.value === (item.sugarLevel || 'Default')) {
                btn.classList.add('selected');
            }
        });

        const totalPrice = calculateModalTotalPrice(item, item.quantity);
        itemModalTotalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
    }
    
    // MODIFIED: Handle Menu Item Click (for adding items to order)
    function handleMenuItemClick(e) {
        console.log('Menu item clicked', e.currentTarget);
        const menuItemEl = e.currentTarget;
        if (!menuItemEl) {
            console.log('Not a menu item');
            return;
        }

        const itemId = menuItemEl.dataset.itemId;
        console.log('Item ID from data attribute:', itemId);
        
        // First check if itemId exists
        if (!itemId) {
            console.log('No item ID found in data attribute');
            return;
        }
        
        // Find item data using our helper function
        const itemData = menuData.find(item => 
            isSameItemId(item._id, itemId) || 
            isSameItemId(item.id, itemId)
        );
        
        if (!itemData) {
            console.log('Item data not found for ID:', itemId);
            console.log('Available menu data IDs:', menuData.map(m => ({ 
                id: m.id, 
                _id: m._id,
                name: m.name 
            })));
            return;
        }

        console.log('Found item:', {
            name: itemData.name,
            id: itemData.id,
            _id: itemData._id,
            originalPrice: itemData.originalPrice
        });

        // 1. Try to find an existing item that can be consolidated (same ID, no custom notes/discounts/sugar)
        const existingItemKey = Object.keys(order).find(key => {
            const item = order[key];
            // Check for clean item (same ID, no custom notes/discount, default sugar level)
            return (isSameItemId(item.id, itemId)) && 
                   (!item.notes || item.notes === '') && 
                   (!item.customDiscount || item.customDiscount === 0) && 
                   (!item.sugarLevel || item.sugarLevel === 'Default');
        });

        if (existingItemKey) {
            // 2. If a clean, consolidatable item exists, just increment its quantity
            order[existingItemKey].quantity++;
            console.log('Incremented existing item:', existingItemKey);
        } else {
            // 3. Otherwise, create a new line item
            const newUniqueId = `${itemId}-${++orderItemSequence}`;
            const newItem = {
                id: itemId,
                name: itemData.name,
                originalPrice: itemData.originalPrice,
                quantity: 1,
                isPromo: itemData.isPromo || false,
                notes: '',
                customDiscount: 0,
                customDiscountType: 'percent',
                uniqueId: newUniqueId,
                sugarLevel: 'Default',
            };
            order[newUniqueId] = newItem;
            console.log('Created new item:', newItem);
        }
        
        // 4. Refresh the order list. The modal is intentionally NOT shown.
        updateOrderDisplay();
    }
    
    // Order Item Click (Open Modal for Edit)
    function handleOrderListItemClick(e) {
        const orderItemEl = e.target.closest('.order-item');
        if (!orderItemEl) return;

        const uniqueId = orderItemEl.dataset.orderId;
        const item = order[uniqueId];

        if (!item) return;

        // Handle quantity buttons in the order list
        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
            const action = qtyBtn.dataset.action;
            if (action === 'increase') {
                item.quantity++;
            } else if (action === 'decrease') {
                item.quantity--;
                if (item.quantity <= 0) {
                    delete order[uniqueId];
                }
            }
            updateOrderDisplay();
            return;
        }

        // If clicking anywhere else on the order item (not the quantity buttons), open modal for editing
        // Close any other open modals first
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (!modal.classList.contains('hidden') && modal !== itemDetailModal) {
                hideModal(modal);
            }
        });

        // Open modal for editing details
        currentItemForModal = uniqueId;
        updateItemModalDisplay(item);
        showModal(itemDetailModal);
    }

    function handleItemDetailSave(split = false) {
        if (!currentItemForModal) return;

        const currentItem = order[currentItemForModal];
        if (!currentItem) return;

        const newQuantity = parseInt(itemModalQuantity.textContent.replace('x', '')) || 1;
        
        const newNotes = itemNotesInput.value.trim();
        const newDiscountValue = parseFloat(discountValueInput.value) || 0;
        const newDiscountType = Array.from(discountTypeBtns).find(btn => btn.classList.contains('active'))?.dataset.type || 'percent';
        const newSugarLevel = Array.from(sugarSelectionBtns).find(btn => btn.classList.contains('selected'))?.dataset.value || 'Default';

        if (split) {
            // "Add New Item" logic: create a new item with current modal details
            const originalUniqueId = currentItem.uniqueId;
            const originalItemQuantity = currentItem.quantity;
            
            // The item being edited (in the modal) is now the NEW line item (quantity 1) with the customizations
            currentItem.quantity = 1;
            currentItem.notes = newNotes;
            currentItem.customDiscount = newDiscountValue;
            currentItem.customDiscountType = newDiscountType;
            currentItem.sugarLevel = newSugarLevel;

            // Restore the remainder as the original line item
            if (originalItemQuantity > 1) {
                const menuItemData = menuData.find(m => 
                    isSameItemId(m._id, currentItem.id) || 
                    isSameItemId(m.id, currentItem.id)
                );
                if (menuItemData) {
                    // Create a replacement item for the original line (reduced quantity, no notes/discount)
                    const newSplitItemUniqueId = `${currentItem.id}-${++orderItemSequence}`;
                    
                    const splitItem = {
                        id: currentItem.id,
                        name: currentItem.name,
                        originalPrice: menuItemData.originalPrice,
                        quantity: originalItemQuantity - 1, 
                        isPromo: menuItemData.isPromo || false,
                        notes: '', 
                        customDiscount: 0,
                        customDiscountType: 'percent',
                        uniqueId: newSplitItemUniqueId,
                        sugarLevel: 'Default',
                    };
                    
                    // Add the original item back with reduced quantity
                    order[newSplitItemUniqueId] = splitItem;
                }
            }
            
            // Note: If originalQuantity was 1, we just updated the single line item with new details.

        } else {
            // "Set/Save" logic: update the item in the order array
            currentItem.quantity = newQuantity;
            currentItem.notes = newNotes;
            currentItem.customDiscount = newDiscountValue;
            currentItem.customDiscountType = newDiscountType;
            currentItem.sugarLevel = newSugarLevel;
        }

        if (currentItem.quantity <= 0) {
            delete order[currentItemForModal];
        }

        currentItemForModal = null;
        hideModal(itemDetailModal);
        updateOrderDisplay();
    }
    
    // Attach event listeners for the modal controls
    if (modalQtyDecreaseBtn) {
        modalQtyDecreaseBtn.addEventListener('click', () => {
            const action = modalQtyDecreaseBtn.dataset.action;
            const currentQty = parseInt(itemModalQuantity.textContent.replace('x', '')) || 0;
            let newQty = currentQty;

            if (action === 'decrease' && currentQty > 1) {
                newQty--;
            }
            
            itemModalQuantity.textContent = `x${newQty}`;
            
            if (currentItemForModal) {
                const item = order[currentItemForModal];
                const totalPrice = calculateModalTotalPrice(item, newQty);
                itemModalTotalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
            }
        });
    }

    if (modalQtyIncreaseBtn) {
        modalQtyIncreaseBtn.addEventListener('click', () => {
            const action = modalQtyIncreaseBtn.dataset.action;
            const currentQty = parseInt(itemModalQuantity.textContent.replace('x', '')) || 0;
            let newQty = currentQty;

            if (action === 'increase') {
                newQty++;
            }
            
            itemModalQuantity.textContent = `x${newQty}`;
            
            if (currentItemForModal) {
                const item = order[currentItemForModal];
                const totalPrice = calculateModalTotalPrice(item, newQty);
                itemModalTotalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
            }
        });
    }

    const updateModalPreview = () => {
        if (!currentItemForModal) return;
        const item = order[currentItemForModal];
        const quantity = parseInt(itemModalQuantity.textContent.replace('x', '')) || 1;
        const totalPrice = calculateModalTotalPrice(item, quantity);
        itemModalTotalPriceDisplay.textContent = `$${totalPrice.toFixed(2)}`;
    };

    if (discountValueInput) {
        discountValueInput.addEventListener('input', updateModalPreview);
    }

    if (applyDiscountBtn) {
        applyDiscountBtn.addEventListener('click', (e) => {
            e.preventDefault();
            updateModalPreview();
        });
    }

    // Sugar selection button handlers
    sugarSelectionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sugarSelectionBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
    });

    // Discount type button handlers
    if (discountTypeBtns.length > 0) {
        discountTypeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                discountTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateModalPreview();
            });
        });
    }

    if (saveItemDetailsBtn) {
        saveItemDetailsBtn.addEventListener('click', () => handleItemDetailSave(false));
    }
    if (splitOrderItemBtn) {
        splitOrderItemBtn.addEventListener('click', () => handleItemDetailSave(true));
    }
    
    // --- Order List Click Listener (to edit existing items) ---
    if (orderList) {
        orderList.addEventListener('click', handleOrderListItemClick);
    }

    // --- Improved Category System ---

async function getAllCategories() {
    try {
        console.log('📋 POS: Getting categories...');
        
        // 1. Try to get explicit categories from the API first
        const dbCategories = await loadCategories();
        let categoriesSet = new Set();
        
        // Add "All" first
        categoriesSet.add('All');

        // Add categories from DB
        if (Array.isArray(dbCategories)) {
            dbCategories.forEach(cat => {
                // Handle both object {name: "Food"} and string "Food" formats
                const name = typeof cat === 'object' ? cat.name : cat;
                if (name && name.trim()) categoriesSet.add(name.trim());
            });
        }

        // 2. Also scan all loaded menu items to find any categories used that aren't in the DB list
        // This prevents items from being "orphaned" if their category was deleted from the DB but still exists on the item
        if (Array.isArray(menuData)) {
            menuData.forEach(item => {
                if (Array.isArray(item.categories)) {
                    item.categories.forEach(c => {
                        if (c && c.trim()) categoriesSet.add(c.trim());
                    });
                } else if (item.category) {
                    categoriesSet.add(item.category.trim());
                }
            });
        }
        
        const result = Array.from(categoriesSet).sort();
        
        // Ensure "All" is always first
        const allIndex = result.indexOf('All');
        if (allIndex > -1) {
            result.splice(allIndex, 1);
            result.unshift('All');
        }

        console.log('✅ POS: Final category list:', result);
        return result;
        
    } catch (error) {
        console.error('❌ POS: Error in getAllCategories:', error);
        return ['All'];
    }
}
async function generateCategoryButtons() {
    try {
        console.log('📋 POS: Generating category buttons...');
        
        if (!menuCategoriesContainer) {
            console.error('❌ POS: menuCategoriesContainer element not found!');
            return;
        }
        
        const categories = await getAllCategories();
        console.log('📊 POS: Final categories for buttons:', categories);
        
        // Clear container
        menuCategoriesContainer.innerHTML = '';
        
        // If no categories (should not happen with our updated getAllCategories)
        if (!categories || categories.length === 0) {
            console.warn('⚠️ POS: No categories to display');
            
            // Still show "All" button
            const allButton = document.createElement('button');
            allButton.className = 'category-btn active';
            allButton.textContent = 'All';
            allButton.dataset.category = 'All';
            menuCategoriesContainer.appendChild(allButton);
            
            // Show warning message
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = `
                background: #FFF3E0;
                border: 1px solid #FFB74D;
                padding: 10px;
                border-radius: 8px;
                margin-top: 10px;
                text-align: center;
                font-size: 0.9em;
                color: #5D4037;
            `;
            warningDiv.innerHTML = `
                <span class="material-icons-round" style="font-size: 16px; vertical-align: middle; color: #FF9800;">info</span>
                No categories defined. Showing all items.
            `;
            menuCategoriesContainer.appendChild(warningDiv);
            
            return;
        }
        
        // Create buttons for each category
        categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.textContent = category;
            button.dataset.category = category;
            
            // Make "All" active by default
            if (category === 'All') {
                button.classList.add('active');
            }
            
            menuCategoriesContainer.appendChild(button);
            console.log(`Created button: ${category}`);
        });
        
        console.log(`✅ POS: Generated ${categories.length} category buttons`);
        
    } catch (error) {
        console.error('❌ POS: Error generating category buttons:', error);
        
        if (menuCategoriesContainer) {
            // Show error but still provide "All" button
            menuCategoriesContainer.innerHTML = '';
            
            const allButton = document.createElement('button');
            allButton.className = 'category-btn active';
            allButton.textContent = 'All';
            allButton.dataset.category = 'All';
            menuCategoriesContainer.appendChild(allButton);
            
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                color: var(--price-red);
                padding: 10px;
                text-align: center;
                font-size: 0.9em;
                margin-top: 10px;
            `;
            errorDiv.textContent = `Error: ${error.message}`;
            menuCategoriesContainer.appendChild(errorDiv);
        }
    }
}

function filterMenu(category) {
    console.log(`📋 POS: Filtering menu by category: "${category}"`);
    
    if (!menuData || menuData.length === 0) {
        if (menuGrid) menuGrid.innerHTML = '<div class="no-items">No menu items available</div>';
        return;
    }
    
    // Update active button visual state
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === category) {
            btn.classList.add('active');
        }
    });
    
    let filteredData = [];
    
    if (category === 'All') {
        // Show all active items
        filteredData = menuData.filter(item => item.isActive !== false);
    } else {
        // Show items that belong to the selected category
        filteredData = menuData.filter(item => {
            const isActive = item.isActive !== false;
            
            // CHECK 1: Is it in the categories array? (New multi-category logic)
            const hasCategoryInList = item.categories && item.categories.includes(category);
            
            // CHECK 2: Is it the primary category? (Fallback for legacy data)
            const isPrimaryCategory = item.category === category;
            
            return isActive && (hasCategoryInList || isPrimaryCategory);
        });
    }
    
    console.log(`✅ POS: Filter found ${filteredData.length} items for "${category}"`);
    
    if (filteredData.length === 0) {
        if (menuGrid) {
            menuGrid.innerHTML = `
                <div class="no-items" style="text-align: center; padding: 40px;">
                    <span class="material-icons-round" style="font-size: 48px; color: var(--text-muted); opacity: 0.5;">search_off</span>
                    <h3 style="color: var(--text-dark); margin: 20px 0 10px 0;">No Items Found</h3>
                    <p style="color: var(--text-muted);">No menu items found in "${category}".</p>
                    <button onclick="filterMenu('All')" style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Show All Items
                    </button>
                </div>
            `;
        }
    } else {
        generateMenuGrid(filteredData);
    }
}

    function setupCategoryHandlers() {
        if (!menuCategoriesContainer) return;
        
        menuCategoriesContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.category-btn');
            if (!btn) return;

            // If we're in view-all mode, return to horizontal scroll
            if (menuCategoriesContainer.classList.contains('view-all-mode')) {
                menuCategoriesContainer.classList.remove('view-all-mode');
                if (viewAllCategories) {
                    viewAllCategories.textContent = 'View All';
                }
            }

            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.textContent.trim();
            
            // Clear search input when switching categories
            if (searchInput) {
                searchInput.value = '';
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = 'none';
                }
            }
            
            filterMenu(category);
        });
    }

    // --- View All Categories Toggle ---
    if (viewAllCategories) {
        viewAllCategories.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isViewAllMode = menuCategoriesContainer.classList.contains('view-all-mode');
            
            if (isViewAllMode) {
                // Switch back to horizontal scroll mode
                menuCategoriesContainer.classList.remove('view-all-mode');
                viewAllCategories.textContent = 'View All';
            } else {
                // Switch to view all (wrap) mode
                menuCategoriesContainer.classList.add('view-all-mode');
                viewAllCategories.textContent = 'Collapse';
            }
        });
    }

    // --- Search Function ---
    function searchMenuItems(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            // If search is empty, show current category filter
            const activeCategory = document.querySelector('.category-btn.active');
            if (activeCategory) {
                filterMenu(activeCategory.textContent.trim());
            } else {
                generateMenuGrid(menuData);
            }
            return;
        }

        const searchLower = searchTerm.toLowerCase().trim();
        
        const filteredData = menuData.filter(item => {
            // Search by name (case insensitive)
            const nameMatch = item.name.toLowerCase().includes(searchLower);
            
            // Search by ID (exact match)
            const idMatch = (item.id === searchTerm) || 
                           (item._id === searchTerm) || 
                           (item._id && item._id.toString() === searchTerm);
            
            // Search by category (case insensitive)
            const categoryMatch = item.category && item.category.toLowerCase().includes(searchLower);
            
            // Search by type (case insensitive)
            const typeMatch = item.type && item.type.toLowerCase().includes(searchLower);
            
            return nameMatch || idMatch || categoryMatch || typeMatch;
        });

        // When searching, deactivate category filters
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        
        generateMenuGrid(filteredData);
    }

    // --- Search Functionality ---
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value;
            
            // Show/hide clear button
            if (clearSearchBtn) {
                clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
            }
            
            // If search is active, clear category filter
            if (searchTerm.trim() !== '') {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                const allBtn = document.querySelector('.category-btn');
                if (allBtn) {
                    allBtn.classList.add('active');
                }
            }
            
            searchMenuItems(searchTerm);
        });

        // Also allow Enter key to search
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = e.target.value;
                searchMenuItems(searchTerm);
            }
        });
    }

    // Clear search button
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            
            // Reactivate current category filter
            const activeCategory = document.querySelector('.category-btn.active');
            if (activeCategory) {
                filterMenu(activeCategory.textContent.trim());
            } else {
                generateMenuGrid(menuData);
            }
        });
    }

    // --- Page Navigation Functions ---
    function showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.main-content-wrapper').forEach(page => {
            page.classList.add('hidden');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.remove('hidden');
        }
        
        // Update active nav button
        navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.page === pageId.replace('Page', '')) {
                btn.classList.add('active');
            }
        });
        
        // If switching to invoices page, generate the invoice list
        if (pageId === 'invoicesPage') {
            loadInvoices();
        }
    }

// --- Invoice Functions ---
    async function loadInvoices() {
        try {
            const allInvoices = await api.getInvoices();
            
            // FILTER: Only show active invoices (Pending or Paid)
            // Hide 'cancelled' ones from the POS view
            invoices = allInvoices.filter(inv => inv.status !== 'cancelled');
            
            generateInvoiceList();
            updateInvoiceStats(); 
        } catch (error) {
            console.error('Failed to load invoices:', error);
            // Don't alert on load error to avoid spamming user
        }
    }

    function generateInvoiceList(invoiceData = invoices) {
        if (!invoiceListBody) return;
        
        invoiceListBody.innerHTML = '';
        
        if (!invoiceData || invoiceData.length === 0) {
            if (noInvoicesMessage) {
                noInvoicesMessage.style.display = 'block';
            }
            return;
        }
        
        if (noInvoicesMessage) {
            noInvoicesMessage.style.display = 'none';
        }
        
        invoiceData.forEach(invoice => {
            const statusClass = `status-${invoice.status}`;
            const statusText = invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Pending';
            
            // Use formatted date
            const formattedDate = formatInvoiceDate(invoice.date || new Date());
            
            // Determine payment method display - hide for pending status
            const paymentMethodClass = `payment-${invoice.paymentMethod}`;
            const paymentMethodText = invoice.status === 'pending' ? 'Not Paid' : getPaymentMethodText(invoice.paymentMethod);
            const paymentMethodDisplay = invoice.status === 'pending' ? 'payment-pending' : paymentMethodClass;
            
// Inside the invoice row generation
const row = document.createElement('tr');
row.innerHTML = `
    <td><strong>${invoice.invoiceId || invoice._id?.substring(0, 8) || 'N/A'}</strong></td>
    <td><span class="invoice-date">${formattedDate}</span></td>
    <td><span class="payment-method ${paymentMethodDisplay}">${paymentMethodText}</span></td>
    <td><span class="invoice-amount">$${(invoice.total || 0).toFixed(2)}</span></td>
    <td><span class="invoice-status ${statusClass}">${statusText}</span></td>
    <td>
        <div class="invoice-actions">
            <button class="btn-view" data-invoice-id="${invoice.invoiceId || invoice._id || invoice.id}">
                <span class="material-icons-round" style="font-size: 16px;">visibility</span> View
            </button>
            ${invoice.status === 'pending' ? `
                <button class="btn-edit" data-invoice-id="${invoice.invoiceId || invoice._id || invoice.id}">
                    <span class="material-icons-round" style="font-size: 16px;">edit</span> Edit
                </button>
                <button class="btn-delete" data-invoice-id="${invoice.invoiceId || invoice._id || invoice.id}">
                    <span class="material-icons-round" style="font-size: 16px;">delete</span> Delete
                </button>
            ` : `
                <button class="btn-edit disabled" disabled title="Only admins can edit paid invoices">
                    <span class="material-icons-round" style="font-size: 16px; opacity: 0.5;">lock</span> Edit
                </button>
                <button class="btn-delete disabled" disabled title="Only admins can delete paid invoices">
                    <span class="material-icons-round" style="font-size: 16px; opacity: 0.5;">lock</span> Delete
                </button>
            `}
        </div>
    </td>
`;
            invoiceListBody.appendChild(row);
        });
        
        // Attach event listeners to invoice action buttons
        attachInvoiceActionHandlers();
    }
    
    function getPaymentMethodText(method) {
        if (!method) return 'Not Set';
        switch(method) {
            case 'cash': return 'Cash';
            case 'card': return 'ABA/Card';
            case 'delivery': return 'Delivery';
            default: return method;
        }
    }
    
    function attachInvoiceActionHandlers() {
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.currentTarget.dataset.invoiceId;
                viewInvoice(invoiceId);
            });
        });
        
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.currentTarget.dataset.invoiceId;
                editInvoice(invoiceId);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.currentTarget.dataset.invoiceId;
                deleteInvoice(invoiceId);
            });
        });
    }
    
    function viewInvoice(invoiceId) {
        const invoice = invoices.find(inv => 
            inv.invoiceId === invoiceId || 
            inv._id === invoiceId ||
            inv.id === invoiceId
        );
        if (invoice) {
            showInvoiceDetailModal(invoice);
        }
    }

async function showInvoiceDetailModal(invoice) {
    const invoiceDetailModal = document.getElementById('invoiceDetailModal');
    const modalContent = invoiceDetailModal.querySelector('.modal-content');
    
    // 1. Show Loading
    modalContent.innerHTML = `<div style="padding:40px; text-align:center;">Loading Receipt Details...</div>`;
    showModal(invoiceDetailModal);

    try {
        // 2. Setup Data
        const priceMap = {};
        if (typeof menuData !== 'undefined' && Array.isArray(menuData)) {
            menuData.forEach(item => { priceMap[item.name] = item.originalPrice; });
        }

        modalContent.className = 'modal-content receipt-modal';

        // 3. Header & Settings
        const settings = (typeof systemSettings !== 'undefined') ? systemSettings : {};
        const logoUrl = settings.receiptLogo || ""; 
        const headerText = settings.receiptHeader || "Paint Coffee\nART & BISTRO";
        const headerLines = headerText.split('\n');
        const shopName = headerLines[0];
        const subHeader = headerLines.slice(1).join('<br>');
        const footerText = (settings.receiptFooter || "Thank you!").replace(/\n/g, '<br>');

        // --- CRITICAL CHANGE: DETERMINE EXCHANGE RATE ---
        // If invoice has a saved rate, use it. Otherwise use current system rate.
        const invoiceRate = invoice.exchangeRate || KHR_RATE; 
        // ------------------------------------------------

        // 4. Time & Duration
        const dateObj = new Date(invoice.date);
        const dateStr = dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
        const startTime = dateObj.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        const endTimestamp = invoice.lastModifiedAt ? new Date(invoice.lastModifiedAt) : new Date();
        const endTime = endTimestamp.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        const durationMin = Math.max(0, Math.floor((endTimestamp - dateObj) / 60000));
        
        let cashierName = invoice.createdBy || 'Staff';
        if (typeof localStorage !== 'undefined' && !invoice.createdBy) {
             cashierName = localStorage.getItem('username') || 'Staff';
        }

        // 5. Build Items HTML
        let totalGross = 0;
        let itemsHtml = '';
        
        if (invoice.items) {
            invoice.items.forEach((item, index) => {
                const name = item.name || 'Unknown';
                const qty = item.quantity || 0;
                const soldPrice = item.price || 0;
                
                let originalPrice = priceMap[name]; 
                if (originalPrice === undefined) originalPrice = item.originalPrice || soldPrice;
                if (soldPrice > originalPrice) originalPrice = soldPrice;

                const lineTotalGross = originalPrice * qty;
                totalGross += lineTotalGross;

                itemsHtml += `
                    <tr>
                        <td style="text-align: left;">
                            <div style="font-weight: bold;">${index + 1}.${name}</div>
                            <div style="font-size: 10px; color: #555;">Regular</div>
                        </td>
                        <td style="text-align: right;">$${originalPrice.toFixed(2)}</td>
                        <td style="text-align: center;">${qty}</td>
                        <td style="text-align: right;">$${lineTotalGross.toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        // 6. Calculate Totals using HISTORICAL Rate
        const totalNet = invoice.total || 0;
        const totalDiscount = totalGross - totalNet;
        // Use invoiceRate here instead of global KHR_RATE
        const totalKHR = Math.round((totalNet * invoiceRate) / 100) * 100;
        
        const invoiceId = invoice.invoiceId || "0000";
        const waitingNum = invoiceId.slice(-4);

        // 7. Render HTML
        modalContent.innerHTML = `
            <div class="receipt-actions">
                <button class="receipt-close" onclick="hideModal(document.getElementById('invoiceDetailModal'))">
                    <span class="material-icons-round">close</span>
                </button>
                <button class="receipt-close" style="color: #d32f2f;" onclick="downloadReceiptPDF('${invoiceId}')" title="Download PDF">
                    <span class="material-icons-round">picture_as_pdf</span>
                </button>
            </div>

            <div class="receipt-paper" id="receipt-to-print">
                <div class="receipt-brand">
                    ${logoUrl ? `<img src="${logoUrl}" style="max-width: 80%; max-height: 80px; margin-bottom:5px; display:block; margin:auto;">` : `<div class="receipt-logo-text">${shopName}</div>`}
                    <div class="receipt-sub-header">${subHeader}</div>
                </div>

                <div style="font-size: 11px; line-height: 1.4; margin-bottom: 10px;">
                    <div>INV: <b>${invoiceId}</b> | ${dateStr}</div>
                    <div>Cashier: ${cashierName}</div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 5px;">
                        <div>Start: ${startTime}<br>End: ${endTime}</div>
                        <div style="text-align: right; font-weight: bold;">Duration: ${durationMin} mn</div>
                    </div>
                </div>

                <table class="receipt-table">
                    <thead>
                        <tr style="background: #333; color: white;">
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
                    <div style="font-weight: bold;">Pay by ${invoice.paymentMethod === 'card' ? 'ABA' : 'Cash'}</div>
                    <div style="font-weight: bold; font-size: 14px;">Table: ${invoice.table || 'N/A'}</div>
                    <div style="font-size: 24px; font-weight: 800; margin: 5px 0;">Waiting #${waitingNum}</div>
                    <div class="receipt-slogan">${footerText}</div>
                    <div style="text-align: center; margin-top: 5px; font-weight: bold; font-size: 10px;">1$=${invoiceRate.toLocaleString()}R</div>
                </div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button class="action-btn process" onclick="window.print()" style="padding: 10px 20px; width: 100%;">
                    <span class="material-icons-round">print</span> Print Receipt
                </button>
            </div>
        `;
        
        showModal(invoiceDetailModal);

    } catch (error) {
        console.error("Receipt Error:", error);
        modalContent.innerHTML = `<div style="color:red; padding:20px; text-align:center;">Error loading receipt</div>`;
    }
}
async function editInvoice(invoiceId) {
    try {
        const invoice = await api.getInvoice(invoiceId);
        if (invoice) {
            // Check if invoice is pending before allowing edit
            if (invoice.status !== 'pending') {
                alert('Cannot edit this invoice. Only pending invoices can be edited.\n\nPaid invoices can only be modified by administrators.');
                return;
            }
            
            // Rest of your edit logic...
            // Switch to menu page and load the invoice data into order panel
            showPage('menuPage');
            
            // Clear current order
            order = {};
            orderItemSequence = 0;
            
            // Load invoice items into order
            if (invoice.items && invoice.items.length > 0) {
                invoice.items.forEach((item, index) => {
                    const menuItem = menuData.find(m => m.name === item.name);
                    if (menuItem) {
                        const itemId = menuItem._id || menuItem.id;
                        const uniqueId = `${itemId}-${++orderItemSequence}`;
                        order[uniqueId] = {
                            id: itemId,
                            name: item.name,
                            originalPrice: menuItem.originalPrice,
                            quantity: item.quantity || 1,
                            isPromo: menuItem.isPromo || false,
                            notes: '',
                            customDiscount: 0,
                            customDiscountType: 'percent',
                            uniqueId: uniqueId,
                            sugarLevel: 'Default'
                        };
                    }
                });
            }
            
            // Set table if exists
            currentTable = invoice.table || 0;
            updateTableDisplay();
            
            // Set payment method
            selectedPaymentMethod = invoice.paymentMethod || 'none';
            updatePaymentBtnActiveState();
            
            // Update invoice number display with the actual ID
            updateInvoiceNumberDisplay(invoiceId);
            
            // Update order display
            updateOrderDisplay();
            
            // Store the invoice ID for updating later
            currentEditingInvoiceId = invoiceId;
            
            setTimeout(() => {
                showNotification('success', 'can be edited.');
            }, 500);
        }
    } catch (error) {
        console.error('Failed to load invoice for editing:', error);
        showNotification('error', 'Permission Denied: Only pending invoices can be edited.');
    }
}

async function deleteInvoice(invoiceId) {
    if (confirm(`Are you sure you want to delete invoice ${invoiceId}?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
                method: 'DELETE',
                headers: {
                    'x-user-role': 'cashier' // Default role for POS users
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 403) {
                    // Permission denied - show admin-only message
                    alert(`Cannot delete this invoice. ${errorData.error}\n\nOnly administrators can delete paid invoices.`);
                    return;
                }
                
                throw new Error(errorData.error || 'Failed to delete invoice');
            }
            
            invoices = invoices.filter(inv => 
                inv.invoiceId !== invoiceId && 
                inv._id !== invoiceId && 
                inv.id !== invoiceId
            );
            generateInvoiceList();
            showNotification('success', 'Invoice deleted successfully.');
            
        } catch (error) {
            console.error('Failed to delete invoice:', error);
            alert(`Failed to delete invoice: ${error.message}`);
        }
    }
}
    
    function searchInvoices(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            generateInvoiceList();
            return;
        }
        
        const searchLower = searchTerm.toLowerCase().trim();
        const filteredInvoices = invoices.filter(invoice => 
            (invoice.invoiceId && invoice.invoiceId.toLowerCase().includes(searchLower)) ||
            (invoice._id && invoice._id.toLowerCase().includes(searchLower)) ||
            (invoice.id && invoice.id.toLowerCase().includes(searchLower)) ||
            (invoice.table && invoice.table.toString().includes(searchTerm)) ||
            (invoice.total && invoice.total.toString().includes(searchTerm)) ||
            (invoice.status && invoice.status.toLowerCase().includes(searchLower)) ||
            (invoice.paymentMethod && invoice.paymentMethod.toLowerCase().includes(searchLower))
        );
        
        generateInvoiceList(filteredInvoices);
    }

    // Process & Print Button Handler
    const processBtn = document.querySelector('.action-btn.process');
                if (processBtn) {
                    processBtn.addEventListener('click', async () => {
                        if (Object.keys(order).length === 0) {
                showNotification('warning', 'Please add items to the order first!');
                return;
            }

            if (selectedPaymentMethod === 'none') {
                alert('Please select a payment method!');
                return;
            }

            // If cash payment is selected but modal hasn't been completed, show it
            if (selectedPaymentMethod === 'cash') {
                // Show cash modal for payment processing
                cashModalDue.textContent = totalUSDDisplay.textContent;
                cashModalDueKHR.textContent = totalKHRDisplay.textContent;
                cashReceivedUSD.value = '';
                cashReceivedKHR.value = '';
                calculateChange();
                showModal(cashModal);
                return; // Don't proceed until cash modal is completed
            }

            // Continue with normal processing for other payment methods
            try {
                // Prepare invoice data with status 'paid'
                const invoiceData = {
                    table: currentTable || null,
                    items: Object.values(order).map(item => {
                        const menuItem = menuData.find(m => 
                            isSameItemId(m._id, item.id) || 
                            isSameItemId(m.id, item.id)
                        );
                        return {
                            name: item.name,
                            quantity: item.quantity,
                            price: item.isPromo ? (menuItem.promoPrice || menuItem.originalPrice) : menuItem.originalPrice,
                            total: calculateOrderItemPrice(item)
                        };
                    }),
                    paymentMethod: selectedPaymentMethod,
                    subtotal: parseFloat(subTotalDisplay.textContent.replace('$', '')) || 0,
                    discount: globalDiscount,
                    total: parseFloat(totalUSDDisplay.textContent.replace('$', '')) || 0,
                    exchangeRate: KHR_RATE,
                    status: 'paid'
                };

                let newInvoice;
                if (currentEditingInvoiceId) {
                    // Update existing invoice with paid status
                    invoiceData.status = 'paid';
                    newInvoice = await api.updateInvoice(currentEditingInvoiceId, invoiceData);
                    showNotification('success', 'Payment successful! Invoice created.');
                    currentEditingInvoiceId = null;
                } else {
                    // Create new invoice with paid status
                    newInvoice = await api.createInvoice(invoiceData);
                    showNotification('success', 'Payment successful! Invoice created.');
                }

                // Clear the order
                clearOrder();
                
                // Reload invoices to update stats
                await loadInvoices();

                // Switch to invoices page
                showPage('invoicesPage');

            } catch (error) {
                console.error('Failed to process order:', error);
                alert('Failed to process order. Please try again.');
            }
        });
    }

    // Button save handler
    const saveBtn = document.querySelector('.action-btn.save');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (Object.keys(order).length === 0) {
    showNotification('warning', 'Please add items to the order first!');
    return;
}

            try {
                // Prepare invoice data with status 'pending'
                const invoiceData = {
                    table: currentTable || null,
                    items: Object.values(order).map(item => {
                        const menuItem = menuData.find(m => 
                            isSameItemId(m._id, item.id) || 
                            isSameItemId(m.id, item.id)
                        );
                        return {
                            name: item.name,
                            quantity: item.quantity,
                            price: item.isPromo ? (menuItem.promoPrice || menuItem.originalPrice) : menuItem.originalPrice,
                            total: calculateOrderItemPrice(item)
                        };
                    }),
                    paymentMethod: selectedPaymentMethod !== 'none' ? selectedPaymentMethod : 'cash', // Default to cash if none selected
                    subtotal: parseFloat(subTotalDisplay.textContent.replace('$', '')) || 0,
                    discount: globalDiscount,
                    total: parseFloat(totalUSDDisplay.textContent.replace('$', '')) || 0,
                    exchangeRate: KHR_RATE,
                    status: 'pending' // Set status to pending for save button
                };

                let newInvoice;
                if (currentEditingInvoiceId) {
                    // Update existing invoice with pending status
                    invoiceData.status = 'pending';
                    newInvoice = await api.updateInvoice(currentEditingInvoiceId, invoiceData);
                    showNotification('info', 'Order saved successfully.');
                    currentEditingInvoiceId = null;
                } else {
                    // Create new invoice with pending status
                    newInvoice = await api.createInvoice(invoiceData);
                    showNotification('success', 'Payment successful! Invoice created.');
                }

                // Clear the order
                clearOrder();
                
                // Reload invoices to update stats
                await loadInvoices();

                // Switch to invoices page
                showPage('invoicesPage');

            } catch (error) {
                console.error('Failed to save order:', error);
                alert('Failed to save order. Please try again.');
            }
        });
    }

    // Cash payment finalization handler
    if (document.getElementById('finalizeCashPayment')) {
        document.getElementById('finalizeCashPayment').addEventListener('click', async () => {
            if (Object.keys(order).length === 0) {
    showNotification('warning', 'Please add items to the order first!');
    return;
}

            const totalDue = parseFloat(totalUSDDisplay.textContent.replace('$', '')) || 0;
            const usdReceived = parseFloat(cashReceivedUSD.value) || 0;
            const khrReceived = parseFloat(cashReceivedKHR.value) || 0;

            const khrReceivedInUSD = khrReceived / KHR_RATE;
            const totalReceivedUSD = usdReceived + khrReceivedInUSD;

            // Check if received amount is sufficient
            if (totalReceivedUSD < totalDue - 0.01) { // Allow small floating point tolerance
                // Show visual feedback - red border flash
                const changeDisplays = [changeDisplayUSDContainer, changeDisplayKHRContainer];
                
                changeDisplays.forEach(display => {
                    display.classList.add('negative');
                    display.style.border = '2px solid var(--price-red)';
                });

                // Remove the effect after 1 second
                setTimeout(() => {
                    changeDisplays.forEach(display => {
                        display.classList.remove('negative');
                        display.style.border = '';
                    });
                }, 1000);

                showNotification('error', 'Insufficient payment! Please check amount.');
                return;
            }

            // If sufficient payment, process the order
            try {
                // Prepare invoice data with status 'paid'
                const invoiceData = {
                    table: currentTable || null,
                    items: Object.values(order).map(item => {
                        const menuItem = menuData.find(m => 
                            isSameItemId(m._id, item.id) || 
                            isSameItemId(m.id, item.id)
                        );
                        return {
                            name: item.name,
                            quantity: item.quantity,
                            price: item.isPromo ? (menuItem.promoPrice || menuItem.originalPrice) : menuItem.originalPrice,
                            total: calculateOrderItemPrice(item)
                        };
                    }),
                    paymentMethod: 'cash',
                    subtotal: parseFloat(subTotalDisplay.textContent.replace('$', '')) || 0,
                    discount: globalDiscount,
                    total: totalDue,
                    exchangeRate: KHR_RATE,
                    status: 'paid'
                };

                let newInvoice;
                if (currentEditingInvoiceId) {
                    // Update existing invoice with paid status
                    invoiceData.status = 'paid';
                    newInvoice = await api.updateInvoice(currentEditingInvoiceId, invoiceData);
                    showNotification('success', 'Payment successful! Invoice created.');
                    currentEditingInvoiceId = null;
                } else {
                    // Create new invoice with paid status
                    newInvoice = await api.createInvoice(invoiceData);
                    showNotification('success', 'Payment successful! Invoice created.');
                }

                // Clear the order
                clearOrder();
                
                // Reload invoices to update stats
                await loadInvoices();

                // Switch to invoices page
                showPage('invoicesPage');

                // Close the cash modal
                resetCashModal();
                hideModal(cashModal);

            } catch (error) {
                console.error('Failed to process order:', error);
                alert('Failed to process order. Please try again.');
            }
        });
    }
    
    function updateCashProcessButtonState() {
        const processBtn = document.getElementById('finalizeCashPayment');
        if (!processBtn) return;

        const totalDue = parseFloat(totalUSDDisplay.textContent.replace('$', '')) || 0;
        const usdReceived = parseFloat(cashReceivedUSD.value) || 0;
        const khrReceived = parseFloat(cashReceivedKHR.value) || 0;

        const khrReceivedInUSD = khrReceived / KHR_RATE;
        const totalReceivedUSD = usdReceived + khrReceivedInUSD;

        // Enable button only if received amount is sufficient
        if (totalReceivedUSD >= totalDue - 0.01) { // Allow small tolerance
            processBtn.disabled = false;
            processBtn.style.opacity = '1';
            processBtn.style.cursor = 'pointer';
        } else {
            processBtn.disabled = true;
            processBtn.style.opacity = '0.6';
            processBtn.style.cursor = 'not-allowed';
        }
    }

    // Helper function to clear order
    function clearOrder() {
        order = {};
        orderItemSequence = 0;
        currentTable = 0;
        selectedPaymentMethod = 'none';
        globalDiscount = 0;
        globalDiscountType = 'percent';
        currentEditingInvoiceId = null;
        updateOrderDisplay();
        updateTableDisplay();
        updatePaymentBtnActiveState();
        updateInvoiceNumberDisplay(); // Reset to "Creating new invoice"
    }

    // Page Navigation Handlers
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            
            // ✅ FIX: Intercept "reports" click to show the modal
            if (page === 'reports') {
                // Update active state visually
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Show the report popup
                showEndOfDayReport();
                return; 
            }

            // Normal navigation for Menu and Invoices
            const pageId = page + 'Page';
            showPage(pageId);
        });
    });
    
    // Invoice Search Handler
    if (invoiceSearchInput) {
        invoiceSearchInput.addEventListener('input', (e) => {
            searchInvoices(e.target.value);
        });
        
        invoiceSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchInvoices(e.target.value);
            }
        });
    }

    // Calculate stats
    function updateInvoiceStats() {
        if (!invoices || invoices.length === 0) {
            // Set all stats to 0 if no invoices
            document.querySelectorAll('.stat-card div:first-child').forEach((el, index) => {
                if (index === 0) el.textContent = '0';
                else if (index === 1) el.textContent = '0';
                else if (index === 2) el.textContent = '0';
                else if (index === 3) el.textContent = '$0.00';
            });
            return;
        }

        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
        const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
        
        // Calculate total revenue from paid invoices
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((sum, inv) => sum + parseFloat(inv.total || 0), 0);

        // Update the stats cards
        const statCards = document.querySelectorAll('.stat-card div:first-child');
        if (statCards.length >= 4) {
            statCards[0].textContent = totalInvoices; // Total Invoices
            statCards[1].textContent = paidInvoices; // Paid
            statCards[2].textContent = pendingInvoices; // Pending
            statCards[3].textContent = `$${totalRevenue.toFixed(2)}`; // Total Revenue
        }
    }

    // Initialize the application
// In pos.js, update the initializeApp function:

async function initializeApp() {
    try {
        console.log('🚀 POS: Starting initialization...');

        // 1. Fetch Settings & Update Global Rate
        try {
            const settings = await api.getSettings();
            if (settings) {
                systemSettings = settings; 
                // CRITICAL: Update the global KHR_RATE from database
                if (settings.exchangeRate) {
                    KHR_RATE = Number(settings.exchangeRate);
                    console.log(`💱 Exchange Rate Loaded: 1 USD = ${KHR_RATE} KHR`);
                }
            }
        } catch (e) { console.warn('Could not load settings', e); }
        
        // 2. Load menu data
        console.log('📋 POS: Loading menu items...');
        menuData = await api.getMenuItems();
        
        // 3. Generate category buttons
        await generateCategoryButtons();
        
        // 4. Setup category handlers
        setupCategoryHandlers();
        
        // 5. Generate menu grid (This will now use the updated KHR_RATE for prices)
        const activeItems = menuData.filter(item => item.isActive !== false);
        generateMenuGrid(activeItems);
        
        // 6. Initialize other components
        updateOrderDisplay();
        updateTableDisplay();
        updatePaymentBtnActiveState();
        updateInvoiceNumberDisplay();
        
    } catch (error) {
        console.error('❌ POS: Failed to initialize app:', error);
    }
}
async function loadCategories() {
    try {
        console.log('📋 POS: Loading categories from API...');
        
        // Test the endpoint first
        const testResponse = await fetch(`${API_BASE_URL}/api/categories/test`);
        if (testResponse.ok) {
            const testData = await testResponse.json();
            console.log('🔍 Categories test result:', testData);
        }
        
        // Now get the actual categories
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        
        if (!response.ok) {
            console.error(`❌ POS: API error: ${response.status} ${response.statusText}`);
            return [];
        }
        
        const data = await response.json();
        console.log('✅ POS: Categories API response:', data);
        console.log('Type:', typeof data, 'Is array?', Array.isArray(data));
        
        if (!Array.isArray(data)) {
            console.error('❌ POS: API did not return an array:', data);
            return [];
        }
        
        // Convert to array of objects
        const categories = data
            .filter(name => name && name.trim() !== '')
            .map(name => ({ name: name.trim() }));
        
        console.log('✅ POS: Processed categories:', categories);
        return categories;
        
    } catch (error) {
        console.error('❌ POS: Error loading categories:', error);
        console.error('Error details:', error.message);
        return [];
    }
}
// Manual refresh function for testing
function refreshPOS() {
    console.log('🔄 POS: Manual refresh triggered');
    
    // Clear current state
    if (menuGrid) menuGrid.innerHTML = '<div>Refreshing...</div>';
    if (menuCategoriesContainer) menuCategoriesContainer.innerHTML = '<div>Loading categories...</div>';
    
    // Reinitialize
    initializeApp();
}
// Force refresh categories (for testing)
async function forceRefreshCategories() {
    console.log('🔄 POS: Force refreshing categories...');
    
    if (menuCategoriesContainer) {
        menuCategoriesContainer.innerHTML = '<div style="padding: 10px; text-align: center;">Refreshing categories...</div>';
    }
    
    // Clear any cached data
    menuData = [];
    
    // Reinitialize
    await initializeApp();
    
    console.log('✅ POS: Force refresh complete');
}
function downloadReceiptPDF(invoiceId) {
    const element = document.getElementById('receipt-to-print');
    
    // PDF Configuration
    const opt = {
        margin:       0.2,
        filename:     `Receipt_${invoiceId}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: [3.15, 11], orientation: 'portrait' } 
        // 3.15 inches is the standard 80mm receipt width
    };

    // Show loading state (optional)
    const btn = event.currentTarget;
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<span class="material-icons-round">sync</span>';
    btn.disabled = true;

    // Generate PDF
    html2pdf().set(opt).from(element).save().then(() => {
        // Reset button
        btn.innerHTML = originalIcon;
        btn.disabled = false;
    });
}
async function showEndOfDayReport() {
    try {
        // 1. Fetch Invoices AND Menu Items (Source of Truth for Prices)
        // We load menu items to get the REAL original price (e.g. $3.00)
        const [invoices, menuItems] = await Promise.all([
            api.getInvoices(),
            api.getMenuItems()
        ]);

        // 2. Create Price Lookup Map
        const priceMap = {};
        if (menuItems && Array.isArray(menuItems)) {
            menuItems.forEach(item => {
                priceMap[item.name] = item.originalPrice; 
            });
        }
        
        // 3. Filter for TODAY (Paid only)
        const todayStr = new Date().toLocaleDateString('en-US');
        const todaysInvoices = invoices.filter(inv => {
            if (!inv.date) return false;
            const invDate = new Date(inv.date).toLocaleDateString('en-US');
            return invDate === todayStr && inv.status === 'paid';
        });

        // 4. Get Cashier Name
        // Safe check for localStorage
        const currentCashier = (typeof localStorage !== 'undefined') 
            ? (localStorage.getItem('username') || 'Staff') 
            : 'Staff';

        // 5. Basic Financials (Net Money Actually Collected)
        const cashRevenue = todaysInvoices.filter(i => i.paymentMethod === 'cash').reduce((sum, i) => sum + (i.total || 0), 0);
        const cardRevenue = todaysInvoices.filter(i => i.paymentMethod === 'card' || i.paymentMethod === 'aba').reduce((sum, i) => sum + (i.total || 0), 0);
        const totalNetRevenue = cashRevenue + cardRevenue; 
        const totalKHR = Math.round((totalNetRevenue * KHR_RATE) / 100) * 100;

        // 6. Item Analysis (Calculate Gross vs Net)
        const itemStats = {};

        todaysInvoices.forEach(inv => {
            if (inv.items) {
                inv.items.forEach(item => {
                    const name = item.name || 'Unknown';
                    const qty = item.quantity || 0;
                    
                    // A. Actual Revenue (What customer paid, e.g. $2.50)
                    const soldPrice = item.price || 0; 
                    const itemNetRevenue = item.total || (soldPrice * qty);

                    // B. Official Original Price (e.g. $3.00)
                    // Look up from menu. If not found, fallback to sold price.
                    let originalPrice = priceMap[name];
                    if (originalPrice === undefined) {
                        originalPrice = item.originalPrice || soldPrice;
                    }
                    
                    // Logic check: Original price should never be lower than sold price
                    if (soldPrice > originalPrice) {
                        originalPrice = soldPrice;
                    }
                    
                    const itemGrossRevenue = originalPrice * qty;

                    if (!itemStats[name]) {
                        itemStats[name] = { 
                            qty: 0, 
                            revenue: 0, // Net (Collected)
                            gross: 0,   // Gross (Expected)
                            unitPrice: originalPrice
                        };
                    }

                    itemStats[name].qty += qty;
                    itemStats[name].revenue += itemNetRevenue;
                    itemStats[name].gross += itemGrossRevenue;
                });
            }
        });

        // 7. Calculate Grand Totals
        let grandTotalGross = 0; // Subtotal (Before Disc)
        
        const sortedItems = Object.entries(itemStats)
            .map(([name, data]) => {
                grandTotalGross += data.gross;
                
                return { 
                    name, 
                    qty: data.qty, 
                    unitPrice: data.unitPrice, // ALWAYS shows Original Price ($3.00)
                    revenue: data.revenue
                };
            })
            .sort((a, b) => b.qty - a.qty);

        // Discount = Gross ($3.00) - Net ($2.50)
        const grandTotalDiscount = grandTotalGross - totalNetRevenue;

        // 8. Generate Item Rows
        const itemRowsHtml = sortedItems.map(item => `
            <tr>
                <td style="text-align:left;">${item.name}</td>
                <td style="text-align:right;">$${item.unitPrice.toFixed(2)}</td>
                <td style="text-align:center;">${item.qty}</td>
                <td style="text-align:right;">$${item.revenue.toFixed(2)}</td>
            </tr>
        `).join('');

        // 9. Build Receipt HTML
        const reportHtml = `
            <div class="receipt-paper" style="margin: 0 auto; box-shadow: none; border: 1px solid #eee;">
                <div class="receipt-brand">
                    <div class="receipt-logo-text" style="font-family: 'Brush Script MT', cursive; font-size: 28px;">Daily Report</div>
                    <div class="receipt-sub-header">${new Date().toLocaleDateString('en-GB')}</div>
                    
                    <div style="font-size: 12px; margin-top: 5px; font-weight: bold; border-bottom: 1px dashed #ccc; padding-bottom: 5px; display: inline-block; width: 100%;">
                        Cashier: ${currentCashier}
                    </div>
                </div>

                <div style="margin: 10px 0; font-size: 11px; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;"><span>Orders:</span> <b>${todaysInvoices.length}</b></div>
                    <div style="display: flex; justify-content: space-between;"><span>Cash:</span> <span>$${cashRevenue.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>ABA / Card:</span> <span>$${cardRevenue.toFixed(2)}</span></div>
                </div>

                <div style="font-weight: bold; text-align: center; margin-bottom: 5px; font-size: 11px;">ITEM SALES DETAILS</div>
                <table class="receipt-table" style="font-size: 10px;">
                    <thead>
                        <tr style="background: #333; color: white;">
                            <th style="text-align:left; width: 40%;">ITEM</th>
                            <th style="text-align:right; width: 20%;">PRICE</th>
                            <th style="text-align:center; width: 15%;">QTY</th>
                            <th style="text-align:right; width: 25%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRowsHtml || '<tr><td colspan="4" style="text-align:center">No sales today</td></tr>'}
                    </tbody>
                </table>

                <div class="receipt-totals" style="margin-top: 15px; border-top: 2px solid #000; padding-top: 5px; text-align: right; line-height: 1.6;">
                    <div style="font-size: 12px;">Subtotal: $${grandTotalGross.toFixed(2)}</div>
                    
                    ${grandTotalDiscount > 0.01 ? 
                        `<div style="font-size: 12px; color: red;">Discount: -$${grandTotalDiscount.toFixed(2)}</div>` 
                        : ''}
                    
                    <div class="receipt-big-total" style="font-size: 18px; border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
                        Total: $${totalNetRevenue.toFixed(2)}
                    </div>
                    <div style="font-weight: bold; font-size: 14px;">( ${totalKHR.toLocaleString()}៛ )</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="action-btn process" onclick="window.print()" style="padding: 10px 20px; width: 100%;">
                    <span class="material-icons-round">print</span> Print Report
                </button>
            </div>
        `;

        const modal = document.getElementById('invoiceDetailModal');
        const content = modal.querySelector('.modal-content');
        content.className = 'modal-content receipt-modal';
        content.innerHTML = `
            <div class="receipt-actions">
                <button class="receipt-close" onclick="hideModal(document.getElementById('invoiceDetailModal'))">
                    <span class="material-icons-round">close</span>
                </button>
            </div>
            ${reportHtml}
        `;
        showModal(modal);

    } catch (error) {
        console.error("Report Error", error);
        alert("Failed to generate report");
    }
}
// ================== NOTIFICATION SYSTEM ==================
function showNotification(type, message) {
    // 1. Remove existing notifications (Prevent stacking)
    const existing = document.querySelectorAll('.pos-notification');
    existing.forEach(n => n.remove());
    
    // 2. Create Icon based on type
    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';

    // 3. Create Element
    const notification = document.createElement('div');
    notification.className = `pos-notification ${type}`;
    notification.innerHTML = `
        <span class="material-icons-round">${icon}</span>
        <span style="font-weight: 500; font-size: 14px; color: #333;">${message}</span>
        <button style="margin-left: auto; background: none; border: none; cursor: pointer; opacity: 0.5;" onclick="this.parentElement.remove()">
            <span class="material-icons-round" style="font-size: 18px;">close</span>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // 4. Play Sound (Optional - nice for POS)
    if (type === 'error') {
        // You can add a beep sound here if desired
    }

    // 5. Auto Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            notification.style.transition = 'all 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}
// Mobile Cart Toggle Logic
const mobileCartBtn = document.getElementById('mobileCartBtn');
const orderPanel = document.querySelector('.order-panel');

if (mobileCartBtn) {
    mobileCartBtn.addEventListener('click', () => {
        orderPanel.classList.toggle('mobile-show');
        // Update icon based on state
        const icon = orderPanel.classList.contains('mobile-show') ? 'close' : 'shopping_cart';
        mobileCartBtn.querySelector('.material-icons-round').textContent = icon;
    });
}

// Update Cart Count for Mobile
function updateMobileCartCount() {
    const count = Object.values(order).reduce((sum, item) => sum + item.quantity, 0);
    const countBadge = document.getElementById('mobileCartCount');
    if (countBadge) {
        countBadge.textContent = count;
        // Show/Hide button based on if items exist (optional)
        // mobileCartBtn.style.display = count > 0 ? 'flex' : 'none';
    }
}



// Make it global so other scripts can use it
window.showNotification = showNotification;
// Add to window for testing
window.forceRefreshCategories = forceRefreshCategories;
window.debugCategories = async () => {
    console.log('🔍 Debugging categories...');
    const cats = await getAllCategories();
    console.log('Current categories:', cats);
    return cats;
};

// Add to window for console testing
window.refreshPOS = refreshPOS;
window.debugCategories = getAllCategories;
    // Start the application
    initializeApp();

    // Ensure item detail modal starts hidden
    hideModal(itemDetailModal);

    // Debug click events
    document.addEventListener('click', (e) => {
        // Log menu item clicks to debug
        const menuItem = e.target.closest('.menu-item');
        if (menuItem) {
            console.log('Menu item clicked - Debug:', {
                element: menuItem,
                dataset: menuItem.dataset,
                itemId: menuItem.dataset.itemId,
                name: menuItem.querySelector('.item-name')?.textContent
            });
        }
    });
});