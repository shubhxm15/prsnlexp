// Configuration
const API_BASE_URL = 'http://localhost:3000/api'; // Change to your Node.js server URL

// DOM Elements
const elements = {
    // Forms
    personalForm: document.getElementById('personal-transaction-form'),
    businessForm: document.getElementById('business-transaction-form'),
    loanForm: document.getElementById('loan-transaction-form'),
    
    // Tables
    allTransactionsTable: document.getElementById('all-transactions-table'),
    personalTable: document.getElementById('personal-transactions-table'),
    businessTable: document.getElementById('business-transactions-table'),
    loanTable: document.getElementById('loan-transactions-table'),
    
    // Search
    searchInput: document.getElementById('all-transactions-search')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    const isLoginPage = window.location.pathname.includes('login.html');
    const isRegisterPage = window.location.pathname.includes('register.html');

    // Modal click handler
    document.getElementById('edit-modal')?.addEventListener('click', function(e) {
        if (e.target === this) {
            closeEditModal();
        }
    });
    
    if (!isLoginPage && !isRegisterPage) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/check`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Not authenticated');
            }
            
            const data = await response.json();
            
            if (!data.authenticated) {
                window.location.href = 'login.html';
                return;
            }
            
            // Load initial data
            if (document.querySelector('.tab-content.active-tab')) {
                const activeTab = document.querySelector('.tab-content.active-tab').id;
                loadTabData(activeTab);
            }

            await loadCategories();

            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            const dueDateInput = document.getElementById('loan-due-date');
            if (dueDateInput) {
                dueDateInput.value = today;
            }
            
            // Setup event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'login.html';
            return;
        }
    } else {
        // Setup event listeners for auth pages
        setupAuthEventListeners();
    }
});

// Tab Management
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active-tab');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabContent = document.getElementById(tabId);
    const tabButton = document.querySelector(`.tab-btn[onclick="openTab('${tabId}')"]`);
    
    if (tabContent) tabContent.classList.add('active-tab');
    if (tabButton) tabButton.classList.add('active');
    
    loadTabData(tabId);
}

async function loadTabData(tabId) {
    try {
        let url = `${API_BASE_URL}/expenses`;
        let summaryPrefix = 'all';
        
        switch(tabId) {
            case 'personal':
                url += '?type=personal';
                summaryPrefix = 'personal';
                break;
            case 'business':
                url += '?type=business';
                summaryPrefix = 'business';
                break;
            case 'loan':
                url += '?type=loan';
                summaryPrefix = 'loan';
                break;
            default:
                summaryPrefix = 'all';
        }

        const response = await fetch(url, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const expenses = result.data || [];
        
        const tableId = tabId === 'all-transactions' 
            ? 'all-transactions-table' 
            : `${tabId}-transactions-table`;
        
        displayTransactions(expenses, tableId);
        updateTabSummary(expenses, summaryPrefix);
        
    } catch (error) {
        console.error(`Failed to load ${tabId} data:`, error);
        showError(`Failed to load ${tabId} transactions`);
    }
}

function updateTabSummary(expenses, prefix) {
    const credited = expenses.filter(e => e.transaction_type === 'credit')
                     .reduce((sum, e) => sum + Number(e.amount), 0);
    const debited = expenses.filter(e => e.transaction_type === 'debit')
                     .reduce((sum, e) => sum + Number(e.amount), 0);
    const balance = credited - debited;
    
    if (prefix === 'loan') {
        document.getElementById('loan-received').textContent = `₹${credited.toFixed(2)}`;
        document.getElementById('loan-paid').textContent = `₹${debited.toFixed(2)}`;
        document.getElementById('loan-balance').textContent = `₹${balance.toFixed(2)}`;
        return;
    }
    
    document.getElementById(`${prefix}-credited`).textContent = `₹${credited.toFixed(2)}`;
    document.getElementById(`${prefix}-debited`).textContent = `₹${debited.toFixed(2)}`;
    document.getElementById(`${prefix}-balance`).textContent = `₹${balance.toFixed(2)}`;
}

// Data Loading Functions
async function loadCategories() {
    try {
        const responses = await Promise.all([
            fetch(`${API_BASE_URL}/categories?type=personal`, {
                credentials: 'include'
            }),
            fetch(`${API_BASE_URL}/categories?type=business`, {
                credentials: 'include'
            }),
            fetch(`${API_BASE_URL}/categories?type=loan`, {
                credentials: 'include'
            })
        ]);
        
        const [personal, business, loan] = await Promise.all(
            responses.map(async r => {
                if (!r.ok) throw new Error('Failed to fetch categories');
                const data = await r.json();
                return data.data || [];
            })
        );
        
        populateCategoryDropdowns(personal, business, loan);
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

function populateCategoryDropdowns(personalCategories, businessCategories, loanCategories) {
    // Personal categories
    const personalDropdown = document.getElementById('personal-category');
    if (personalDropdown) {
        personalDropdown.innerHTML = personalCategories.map(cat => 
            `<option value="${cat._id || cat.id}">${cat.name}</option>`
        ).join('');
    }
    
    // Business categories
    const businessDropdown = document.getElementById('business-category');
    if (businessDropdown) {
        businessDropdown.innerHTML = businessCategories.map(cat => 
            `<option value="${cat._id || cat.id}">${cat.name}</option>`
        ).join('');
    }
    
    // Loan categories
    const loanDropdown = document.getElementById('loan-type');
    if (loanDropdown) {
        loanDropdown.innerHTML = loanCategories.map(cat => 
            `<option value="${cat._id || cat.id}">${cat.name}</option>`
        ).join('');
    }
}

// Display Functions
function displayTransactions(expenses, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const tbody = table.querySelector('tbody') || table.createTBody();
    tbody.innerHTML = '';
    
    if (!expenses || expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 2rem;">
                    <i class="fas fa-wallet" style="font-size: 2rem; opacity: 0.3;"></i>
                    <p>No transactions found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    expenses.forEach(expense => {
        const row = tbody.insertRow();
        const amountClass = expense.transaction_type === 'credit' ? 'credit-amount' : 'debit-amount';
        const amountSign = expense.transaction_type === 'credit' ? '+' : '-';
        const amount = Number(expense.amount).toFixed(2);
        
        // Common cells for all tables
        let cells = [
            new Date(expense.date).toLocaleDateString(),
            expense.payment_mode || 'Cash',
            expense.description,
            `<span class="${amountClass}">${amountSign}₹${amount}</span>`,
            expense.transaction_type.charAt(0).toUpperCase() + expense.transaction_type.slice(1),
            `<div class="action-buttons">
                <button class="edit-btn" onclick="editExpense('${expense._id || expense.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-btn" onclick="deleteExpense('${expense._id || expense.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`
        ];
        
        // Special handling based on table type
        if (tableId === 'all-transactions-table') {
            cells.splice(1, 0, 
                expense.category_id?.type?.charAt(0).toUpperCase() + expense.category_id?.type?.slice(1) || 'N/A',
                expense.category_id?.name || 'N/A'
            );
        } 
        else if (tableId === 'personal-transactions-table' || tableId === 'business-transactions-table') {
            cells.splice(1, 0, expense.category_id?.name || 'N/A');
        }
        else if (tableId === 'loan-transactions-table') {
            cells.splice(1, 0, expense.category_id?.name || 'N/A');
            cells.splice(6, 0, expense.due_date ? new Date(expense.due_date).toLocaleDateString() : 'N/A');
        }
        
        row.innerHTML = cells.map(cell => `<td>${cell}</td>`).join('');
    });
}

// Form Handling
async function addPersonalExpense() {
    const formData = {
        amount: parseFloat(document.getElementById('personal-amount').value),
        description: document.getElementById('personal-description').value.trim(),
        category_id: document.getElementById('personal-category').value,
        transaction_type: document.getElementById('personal-transaction-type').value,
        payment_mode: document.getElementById('personal-payment-mode').value.trim() || 'Cash',
        date: new Date().toISOString().split('T')[0]
    };
    
    if (!formData.description || isNaN(formData.amount)) {
        alert('Please enter valid description and amount');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            await loadTabData('personal');
            // Reset form fields
            document.getElementById('personal-amount').value = '';
            document.getElementById('personal-description').value = '';
            document.getElementById('personal-payment-mode').value = 'Cash';
        } else {
            throw new Error(data.error || 'Failed to add expense');
        }
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense. Please try again.');
    }
}

async function addBusinessExpense() {
    const formData = {
        amount: parseFloat(document.getElementById('business-amount').value),
        description: document.getElementById('business-description').value.trim(),
        category_id: document.getElementById('business-category').value,
        transaction_type: document.getElementById('business-transaction-type').value,
        payment_mode: document.getElementById('business-payment-mode').value.trim() || 'Cash',
        date: new Date().toISOString().split('T')[0]
    };

    if (!formData.description || isNaN(formData.amount)) {
        alert('Please enter valid description and amount');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            await loadTabData('business');
            document.getElementById('business-amount').value = '';
            document.getElementById('business-description').value = '';
            document.getElementById('business-payment-mode').value = 'Cash';
        } else {
            throw new Error(data.error || 'Failed to add business expense');
        }
    } catch (error) {
        console.error('Error adding business expense:', error);
        alert('Failed to add business expense. Please try again.');
    }
}

async function addLoanExpense() {
    const formData = {
        amount: parseFloat(document.getElementById('loan-amount').value),
        description: document.getElementById('loan-description').value.trim(),
        category_id: document.getElementById('loan-type').value,
        transaction_type: document.getElementById('loan-transaction-type').value,
        payment_mode: document.getElementById('loan-payment-mode').value.trim() || 'Cash',
        date: new Date().toISOString().split('T')[0],
        due_date: document.getElementById('loan-due-date').value || null
    };

    if (!formData.description || isNaN(formData.amount)) {
        alert('Please enter valid description and amount');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/expenses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            await loadTabData('loan');
            document.getElementById('loan-amount').value = '';
            document.getElementById('loan-description').value = '';
            document.getElementById('loan-payment-mode').value = 'Cash';
            document.getElementById('loan-due-date').value = new Date().toISOString().split('T')[0];
        } else {
            throw new Error(data.error || 'Failed to add loan transaction');
        }
    } catch (error) {
        console.error('Error adding loan transaction:', error);
        alert('Failed to add loan transaction. Please try again.');
    }
}

// Expense Actions
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            const activeTab = document.querySelector('.tab-content.active-tab').id;
            loadTabData(activeTab);
        } else {
            throw new Error(data.error || 'Failed to delete expense');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense. Please try again.');
    }
}

function editExpense(id) {
    openEditModal(id);
}

// Modal Functions
function openEditModal(id) {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;
    
    modal.style.display = 'block';
    document.getElementById('edit-id').value = id;
    
    // Show loading state
    const form = document.getElementById('edit-expense-form');
    form.style.opacity = '0.5';
    form.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = true;
    });
    
    fetchExpenseDetails(id);
}

async function fetchExpenseDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch expense details');
        }
        
        populateEditForm(data.data);
        
    } catch (error) {
        console.error('Error fetching expense:', error);
        alert(`Error: ${error.message}`);
        closeEditModal();
    }
}

function populateEditForm(expense) {
    const modal = document.getElementById('edit-modal');
    const form = document.getElementById('edit-expense-form');
    
    // Reset form state
    form.style.opacity = '1';
    form.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
    });
    
    // Populate form fields
    document.getElementById('edit-id').value = expense._id || expense.id;
    document.getElementById('edit-type').value = expense.category_id?.type || '';
    document.getElementById('edit-amount').value = expense.amount;
    document.getElementById('edit-description').value = expense.description;
    document.getElementById('edit-transaction-type').value = expense.transaction_type;
    document.getElementById('edit-payment-mode').value = expense.payment_mode || 'Cash';
    
    // Load categories
    loadEditCategories(expense.category_id?.type, expense.category_id?._id || expense.category_id?.id);
    
    // Handle due date for loans
    const dueDateGroup = document.getElementById('edit-due-date-group');
    const dueDateInput = document.getElementById('edit-due-date');
    
    if (expense.category_id?.type === 'loan') {
        dueDateGroup.style.display = 'block';
        dueDateInput.value = expense.due_date || '';
    } else {
        dueDateGroup.style.display = 'none';
    }
}

async function loadEditCategories(type, selectedCategoryId) {
    try {
        if (!type) return;
        
        const response = await fetch(`${API_BASE_URL}/categories?type=${type}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to load categories');
        }
        
        const dropdown = document.getElementById('edit-category');
        dropdown.innerHTML = '';
        
        (data.data || []).forEach(cat => {
            const option = document.createElement('option');
            option.value = cat._id || cat.id;
            option.textContent = cat.name;
            option.selected = (cat._id === selectedCategoryId || cat.id === selectedCategoryId);
            dropdown.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        alert('Failed to load categories. Please try again.');
    }
}

async function updateExpense(event) {
    event.preventDefault();
    
    const form = document.getElementById('edit-expense-form');
    const id = document.getElementById('edit-id').value;
    
    const formData = {
        amount: parseFloat(document.getElementById('edit-amount').value),
        description: document.getElementById('edit-description').value.trim(),
        category_id: document.getElementById('edit-category').value,
        transaction_type: document.getElementById('edit-transaction-type').value,
        payment_mode: document.getElementById('edit-payment-mode').value.trim() || 'Cash'
    };
    
    const expenseType = document.getElementById('edit-type').value;
    if (expenseType === 'loan') {
        formData.due_date = document.getElementById('edit-due-date').value || null;
    }
    
    if (!formData.description || isNaN(formData.amount)) {
        alert('Please enter valid description and amount');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Failed to update expense');
        }
        
        closeEditModal();
        const activeTab = document.querySelector('.tab-content.active-tab').id;
        await loadTabData(activeTab);
        
    } catch (error) {
        console.error('Error updating expense:', error);
        alert(`Error: ${error.message}`);
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (!modal) return;
    
    modal.style.display = 'none';
    
    // Reset form
    const form = document.getElementById('edit-expense-form');
    form.reset();
    form.style.opacity = '1';
    form.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
    });
    
    // Clear category dropdown
    const dropdown = document.getElementById('edit-category');
    if (dropdown) dropdown.innerHTML = '';
}

// Search Functionality
function searchExpenses() {
    const searchTerm = document.getElementById('all-transactions-search').value.toLowerCase();
    const rows = document.getElementById('all-transactions-table').querySelectorAll('tbody tr');
    
    rows.forEach(row => {
        if (row.cells.length === 1 && row.cells[0].colSpan > 1) {
            return; // Skip "no transactions" row
        }
        
        const description = row.cells[3].textContent.toLowerCase();
        const type = row.cells[1].textContent.toLowerCase();
        const category = row.cells[2].textContent.toLowerCase();
        const amount = row.cells[4].textContent.toLowerCase();
        const transactionType = row.cells[5].textContent.toLowerCase();
        
        const match = description.includes(searchTerm) || 
                     type.includes(searchTerm) || 
                     category.includes(searchTerm) || 
                     amount.includes(searchTerm) ||
                     transactionType.includes(searchTerm);
        
        row.style.display = match ? '' : 'none';
    });
}

function clearSearch() {
    document.getElementById('all-transactions-search').value = '';
    searchExpenses();
}

// Authentication Functions
async function login(event) {
    if (event) event.preventDefault();
    
    const username = document.getElementById('username')?.value;
    const password = document.getElementById('password')?.value;
    const errorElement = document.getElementById('error-message');
    
    if (errorElement) errorElement.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            await new Promise(resolve => setTimeout(resolve, 100));
            window.location.href = 'index.html';
        } else {
            throw new Error(data.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        if (errorElement) {
            errorElement.textContent = error.message || 'Login failed. Please try again.';
        }
    }
}

async function register(event) {
    if (event) event.preventDefault();
    
    const username = document.getElementById('reg-username')?.value.trim();
    const email = document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('reg-password')?.value;
    const confirmPassword = document.getElementById('reg-confirm-password')?.value;
    const errorElement = document.getElementById('error-message');
    const successElement = document.getElementById('success-message');
    
    if (errorElement) errorElement.textContent = '';
    if (successElement) successElement.textContent = '';
    
    if (!username || !email || !password || !confirmPassword) {
        if (errorElement) errorElement.textContent = 'All fields are required!';
        return;
    }
    
    if (password !== confirmPassword) {
        if (errorElement) errorElement.textContent = 'Passwords do not match!';
        return;
    }
    
    if (password.length < 6) {
        if (errorElement) errorElement.textContent = 'Password must be at least 6 characters!';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
            body: JSON.stringify(registrationData),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (successElement) {
                successElement.textContent = data.message || 'Registration successful!';
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (errorElement) {
            errorElement.textContent = error.message || 'Registration failed. Please try again.';
        }
    }
}

async function logout() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = 'login.html';
        } else {
            throw new Error(data.error || 'Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Helper Functions
function showError(message) {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = message;
    } else {
        alert(message);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.querySelector(".sidebar-overlay");
    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const activeTab = document.querySelector('.tab-content.active-tab').id;
    let title = "All Transactions";
    let tableId = "all-transactions-table";
    
    if (activeTab === "personal") {
        title = "Personal Transactions";
        tableId = "personal-transactions-table";
    } else if (activeTab === "business") {
        title = "Business Transactions";
        tableId = "business-transactions-table";
    } else if (activeTab === "loan") {
        title = "Loan Transactions";
        tableId = "loan-transactions-table";
    }
    
    doc.text(title, 14, 15);
    const today = new Date().toLocaleDateString();
    doc.text(`Generated on: ${today}`, 14, 25);
    
    const table = document.getElementById(tableId);
    if (table) {
        doc.autoTable({ html: table });
        doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${today}.pdf`);
    } else {
        alert("No data available to export");
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Edit form submission
    const editForm = document.getElementById('edit-expense-form');
    if (editForm) {
        editForm.addEventListener('submit', updateExpense);
    }
    
    // Close modal button
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
    }
    
    // Search input
    const searchInput = document.getElementById('all-transactions-search');
    if (searchInput) {
        searchInput.addEventListener('input', searchExpenses);
    }
    
    // Form buttons
    if (document.getElementById('personal-amount')) {
        document.querySelector('.btn.primary-btn[onclick="addPersonalExpense()"]')
            ?.addEventListener('click', addPersonalExpense);
    }
    
    if (document.getElementById('business-amount')) {
        document.querySelector('.btn.primary-btn[onclick="addBusinessExpense()"]')
            ?.addEventListener('click', addBusinessExpense);
    }
    
    if (document.getElementById('loan-amount')) {
        document.querySelector('.btn.primary-btn[onclick="addLoanExpense()"]')
            ?.addEventListener('click', addLoanExpense);
    }
}

function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', login);
    }
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', register);
    }
}

// Make functions available globally
window.openTab = openTab;
window.addPersonalExpense = addPersonalExpense;
window.addBusinessExpense = addBusinessExpense;
window.addLoanExpense = addLoanExpense;
window.deleteExpense = deleteExpense;
window.editExpense = editExpense;
window.searchExpenses = searchExpenses;
window.clearSearch = clearSearch;
window.generatePDF = generatePDF;
window.toggleSidebar = toggleSidebar;
window.closeEditModal = closeEditModal;