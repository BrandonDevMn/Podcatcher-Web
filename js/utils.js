function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays <= 365) return `${Math.ceil(diffDays / 30)} months ago`;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
}

function stripHtml(html) {
    if (!html) return '';

    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function truncateText(text, maxLength = 150) {
    if (!text || text.length <= maxLength) return text;

    return text.substr(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message, container = null) {
    console.error('Error:', message);

    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
}

function showLoading(container, message = 'Loading...') {
    if (container) {
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner small"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function sanitizeInput(input) {
    if (!input) return '';

    return input.trim().replace(/[<>]/g, '');
}

function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        return defaultValue;
    }
}

function getCachedData(key, maxAge = 3600000) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > maxAge) {
            localStorage.removeItem(key);
            return null;
        }

        return data.value;
    } catch (error) {
        console.error('Error getting cached data:', error);
        return null;
    }
}

function setCachedData(key, value) {
    try {
        const data = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Error setting cached data:', error);
    }
}

function parseXMLFromString(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parsing error');
        }

        return xmlDoc;
    } catch (error) {
        console.error('Error parsing XML:', error);
        return null;
    }
}

function getImageWithFallback(imageUrl, fallbackUrl = '') {
    return new Promise((resolve) => {
        if (!imageUrl) {
            resolve(fallbackUrl);
            return;
        }

        const img = new Image();
        img.onload = () => resolve(imageUrl);
        img.onerror = () => resolve(fallbackUrl);
        img.src = imageUrl;
    });
}

function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';

    document.body.appendChild(announcement);

    setTimeout(() => {
        announcement.textContent = message;
    }, 100);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 3000);
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function extractErrorMessage(error) {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'An unexpected error occurred';
}