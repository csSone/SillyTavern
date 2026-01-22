const logContainer = document.getElementById('log-container');
const autoScrollCheckbox = document.getElementById('auto-scroll');
const clearButton = document.getElementById('clear');
const exportButton = document.getElementById('export');
const logFilter = document.getElementById('log-filter');
const searchInput = document.getElementById('search-input');
const statsSpan = document.getElementById('stats');

let logs = [];
let currentFilter = 'all';
let currentSearch = '';

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (info, success, error, warning)
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="关闭">×</button>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    const autoRemove = setTimeout(() => {
        removeToast(toast);
    }, 5000);

    // Manual close
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoRemove);
        removeToast(toast);
    });
}

/**
 * Remove toast with animation
 */
function removeToast(toast) {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

/**
 * Format timestamp
 */
function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

/**
 * Create log entry element
 */
function createLogEntry(log) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    div.dataset.type = log.type;
    div.dataset.message = log.message.toLowerCase();

    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = `[${formatTimestamp(log.timestamp)}]`;

    const message = document.createElement('span');
    message.className = `log-${log.type}`;
    message.textContent = log.message;

    div.appendChild(timestamp);
    div.appendChild(message);

    return div;
}

/**
 * Render logs
 */
function renderLogs() {
    logContainer.innerHTML = '';

    // Filter logs
    let filteredLogs = logs;

    if (currentFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.type === currentFilter);
    }

    if (currentSearch) {
        filteredLogs = filteredLogs.filter(log =>
            log.message.toLowerCase().includes(currentSearch.toLowerCase())
        );
    }

    // Update stats
    statsSpan.textContent = `${filteredLogs.length} / ${logs.length} logs`;

    // Show empty state
    if (filteredLogs.length === 0) {
        logContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width:48px;height:48px;margin-bottom:16px;opacity:0.5;">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <p>${logs.length === 0 ? 'Waiting for logs...' : 'No matching logs'}</p>
            </div>
        `;
        return;
    }

    // Render log entries
    const fragment = document.createDocumentFragment();
    for (const log of filteredLogs) {
        fragment.appendChild(createLogEntry(log));
    }
    logContainer.appendChild(fragment);

    // Auto scroll to bottom
    if (autoScrollCheckbox.checked) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

/**
 * Add new log
 */
function addLog(log) {
    logs.push(log);
    // 日志限制已在主进程中处理，这里不需要重复限制
    renderLogs();
}

/**
 * Clear logs
 */
function clearLogs() {
    logs = [];
    renderLogs();
}

/**
 * Export logs via IPC
 */
function exportLogs() {
    if (logs.length === 0) {
        showToast('没有可导出的日志', 'warning');
        return;
    }

    // Request main process to show save dialog
    window.electronAPI.sendShowSaveDialog({
        title: 'Export Logs',
        defaultPath: `SillyTavern-logs-${new Date().toISOString().split('T')[0]}.txt`,
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
        ],
    });
}

// Register IPC event listeners using preload API
window.electronAPI.onInitLogs((initialLogs) => {
    logs = initialLogs;
    renderLogs();
});

window.electronAPI.onNewLog((log) => {
    addLog(log);
});

window.electronAPI.onClearLogs(() => {
    clearLogs();
});

window.electronAPI.onExportResult(({ success, message }) => {
    if (success) {
        showToast(message, 'success');
    } else {
        showToast(message, 'error');
    }
});

// Toolbar event handlers
clearButton.addEventListener('click', clearLogs);
exportButton.addEventListener('click', exportLogs);

logFilter.addEventListener('change', () => {
    currentFilter = logFilter.value;
    renderLogs();
});

searchInput.addEventListener('input', () => {
    currentSearch = searchInput.value;
    renderLogs();
});

// Initialize
renderLogs();
