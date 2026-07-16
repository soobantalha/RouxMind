/**
 * ============================================
 * ROUXMIND v4.0 — Ultra-Premium AI Recipe Generator
 * Where Every Plate Tells Your Story
 * ============================================
 * Built by Sooban Talha Tech
 * Founder: Sooban Talha
 * Website: soobantalhatech.xyz
 * App URL: rouxmind.vercel.app
 * Hackathon: Mesh API Hackathon 2026 (meshapi.ai)
 *
 * ALL BUGS FIXED:
 * ✅ Sidebar toggle & mobile overlay
 * ✅ Modal overlay click-to-close
 * ✅ Analytics panel toggle (class-based)
 * ✅ Camera/photo stream cleanup
 * ✅ Voice recognition error handling
 * ✅ Mobile responsive interactions
 * ✅ Toast notifications
 * ✅ Keyboard shortcuts
 * ✅ Theme toggle
 * ✅ History & saved recipes
 * ✅ SSE streaming client
 * ✅ PDF generation
 * ✅ Settings persistence
 * ✅ XP & rank system
 * ============================================
 */

// ============================================
// GLOBAL CONSTANTS & CONFIGURATION
// ============================================

const ROUXMIND = {
    BRAND: 'RouxMind',
    VERSION: '4.0.0',
    DEVELOPER: 'Sooban Talha Tech',
    DEVSITE: 'https://soobantalhatech.xyz',
    WEBSITE: 'https://rouxmind.vercel.app',
    FOUNDER: 'Sooban Talha',
    TAGLINE: 'Where Every Plate Tells Your Story',
    EMAIL: 'soobantalhatechnologies@gmail.com',
    HACKATHON: 'Mesh API Hackathon 2026',
    HACKATHON_URL: 'https://meshapi.ai'
};

const API_BASE = window.location.origin.includes('localhost') ? 'http://localhost:3000' : '';
const API_ENDPOINT = `${API_BASE}/api/recipe`;

// ============================================
// RANK SYSTEM
// ============================================

const RANK_SYSTEM = [
    { min: 0, max: 49, name: 'Kitchen Apprentice', icon: '🥄', color: '#8899aa' },
    { min: 50, max: 149, name: 'Home Cook', icon: '🍳', color: '#00ff88' },
    { min: 150, max: 349, name: 'Sous Chef', icon: '👨‍🍳', color: '#00d4ff' },
    { min: 350, max: 599, name: 'Chef', icon: '👩‍🍳', color: '#0099cc' },
    { min: 600, max: 999, name: 'Executive Chef', icon: '🧑‍🍳', color: '#00ffff' },
    { min: 1000, max: 1999, name: 'Master Chef', icon: '⭐', color: '#ffcc00' },
    { min: 2000, max: Infinity, name: 'Culinary Legend', icon: '👑', color: '#ff4466' }
];

function getRank(xp) {
    return RANK_SYSTEM.find(rank => xp >= rank.min && xp <= rank.max) || RANK_SYSTEM[0];
}

// ============================================
// QUICK INGREDIENTS
// ============================================

const QUICK_INGREDIENTS = [
    'Chicken', 'Beef', 'Fish', 'Eggs', 'Tomatoes', 'Potatoes', 'Onions', 'Garlic',
    'Rice', 'Pasta', 'Cheese', 'Milk', 'Flour', 'Sugar', 'Salt', 'Pepper',
    'Carrots', 'Broccoli', 'Spinach', 'Mushrooms', 'Bell Peppers', 'Lemon',
    'Butter', 'Oil', 'Vinegar', 'Honey', 'Soy Sauce', 'Yogurt'
];

// ============================================
// LANGUAGE MAP
// ============================================

const LANGUAGE_MAP = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali',
    'pa': 'Punjabi', 'tr': 'Turkish', 'nl': 'Dutch', 'sv': 'Swedish',
    'fi': 'Finnish', 'da': 'Danish', 'no': 'Norwegian', 'pl': 'Polish',
    'th': 'Thai', 'vi': 'Vietnamese'
};

// ============================================
// STATE MANAGEMENT
// ============================================

const state = {
    user: {
        name: localStorage.getItem('rouxmind_user_name') || 'Guest',
        avatar: localStorage.getItem('rouxmind_user_avatar') || '🥄',
        xp: parseInt(localStorage.getItem('rouxmind_user_xp') || '0'),
        streak: parseInt(localStorage.getItem('rouxmind_user_streak') || '0'),
        totalRecipes: parseInt(localStorage.getItem('rouxmind_user_totalRecipes') || '0'),
        lastActive: localStorage.getItem('rouxmind_user_lastActive') || null,
        sessions: parseInt(localStorage.getItem('rouxmind_user_sessions') || '0')
    },
    settings: {
        theme: localStorage.getItem('rouxmind_theme') || 'dark',
        defaultLanguage: localStorage.getItem('rouxmind_defaultLanguage') || 'English',
        defaultServings: parseInt(localStorage.getItem('rouxmind_defaultServings') || '4')
    },
    currentRecipe: {
        ingredients: '', dish: '', recipe: '',
        options: { spice: 3, servings: 4, time: 2, language: 'English', depth: 'standard' },
        metadata: { tokens: 0, cost: 0, responseTime: 0, model: '', generatedAt: null, requestId: null }
    },
    history: JSON.parse(localStorage.getItem('rouxmind_history') || '[]'),
    savedRecipes: JSON.parse(localStorage.getItem('rouxmind_savedRecipes') || '[]'),
    analytics: {
        totalRecipes: 0, successCount: 0, failureCount: 0,
        totalCost: 0, totalTokens: 0, totalResponseTime: 0,
        modelUsage: {}, spicePreferences: {}, timePreferences: {},
        languagePreferences: {}, depthPreferences: {}, topDishes: {}, dailyStats: {}
    },
    ui: {
        currentInputMethod: 'text', wizardStep: 1,
        isGenerating: false, isStreaming: false, currentStream: '',
        cameraStream: null, isRecording: false, recognition: null, abortController: null,
        sidebarOpen: window.innerWidth > 1024
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const then = new Date(date);
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatNumber(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatCost(cost) { return `$${cost.toFixed(4)}`; }

function formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

function truncate(str, length = 50) {
    if (!str) return '';
    return str.length > length ? str.slice(0, length) + '...' : str;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function saveState() {
    try {
        localStorage.setItem('rouxmind_user_name', state.user.name);
        localStorage.setItem('rouxmind_user_avatar', state.user.avatar);
        localStorage.setItem('rouxmind_user_xp', state.user.xp.toString());
        localStorage.setItem('rouxmind_user_streak', state.user.streak.toString());
        localStorage.setItem('rouxmind_user_totalRecipes', state.user.totalRecipes.toString());
        localStorage.setItem('rouxmind_user_lastActive', state.user.lastActive || '');
        localStorage.setItem('rouxmind_user_sessions', state.user.sessions.toString());
        localStorage.setItem('rouxmind_theme', state.settings.theme);
        localStorage.setItem('rouxmind_defaultLanguage', state.settings.defaultLanguage);
        localStorage.setItem('rouxmind_defaultServings', state.settings.defaultServings.toString());
        localStorage.setItem('rouxmind_history', JSON.stringify(state.history));
        localStorage.setItem('rouxmind_savedRecipes', JSON.stringify(state.savedRecipes));
    } catch (e) {
        console.warn('Failed to save state:', e);
    }
}

function loadState() {
    updateAnalytics();
}

// ============================================
// XP & STREAK SYSTEM
// ============================================

function addXP(amount = 10) {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = state.user.lastActive;
    
    if (lastActive && lastActive !== today) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diff = todayDate - lastDate;
        if (diff > 86400000 * 1.5) {
            state.user.streak = 0;
        }
    }
    
    if (lastActive !== today) {
        state.user.streak += 1;
        state.user.lastActive = today;
    }
    
    state.user.xp += amount;
    state.user.totalRecipes++;
    state.user.sessions++;
    
    saveState();
    updateUserStats();
    
    const rank = getRank(state.user.xp);
    showToast(`+${amount} XP!`, 'success', rank.icon);
}

function updateUserStats() {
    const rank = getRank(state.user.xp);
    
    // Nav stats
    const streakEl = document.getElementById('streakStat');
    const recipesEl = document.getElementById('recipesStat');
    const xpEl = document.getElementById('xpStat');
    
    if (streakEl) streakEl.querySelector('.stat-value').textContent = state.user.streak;
    if (recipesEl) recipesEl.querySelector('.stat-value').textContent = state.user.totalRecipes;
    if (xpEl) xpEl.querySelector('.stat-value').textContent = state.user.xp;
    
    // Sidebar stats
    const sidebarTotal = document.getElementById('sidebarTotalRecipes');
    const sidebarStreak = document.getElementById('sidebarStreak');
    const sidebarRank = document.getElementById('sidebarRank');
    
    if (sidebarTotal) sidebarTotal.textContent = state.user.totalRecipes;
    if (sidebarStreak) sidebarStreak.textContent = state.user.streak;
    if (sidebarRank) {
        sidebarRank.innerHTML = `${rank.icon} ${rank.name}`;
        sidebarRank.style.color = rank.color;
    }
    
    // User display
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarEl = document.querySelector('.lp-avatar .avatar-icon');
    
    if (userNameDisplay) userNameDisplay.textContent = state.user.name;
    if (userAvatarEl) userAvatarEl.textContent = state.user.avatar;
}

// ============================================
// ANALYTICS
// ============================================

function updateAnalytics() {
    const analytics = {
        totalRecipes: state.history.length,
        successCount: state.history.filter(h => h.status === 'Success').length,
        failureCount: state.history.filter(h => h.status === 'Failed').length,
        totalCost: state.history.reduce((sum, h) => sum + (h.cost || 0), 0),
        totalTokens: state.history.reduce((sum, h) => sum + (h.tokens || 0), 0),
        totalResponseTime: state.history.reduce((sum, h) => sum + (h.responseTime || 0), 0),
        modelUsage: {}, spicePreferences: {}, timePreferences: {},
        languagePreferences: {}, depthPreferences: {}, topDishes: {}, dailyStats: {}
    };
    
    state.history.forEach(item => {
        const model = item.model || 'unknown';
        analytics.modelUsage[model] = (analytics.modelUsage[model] || 0) + 1;
        
        const spice = item.spice || 3;
        analytics.spicePreferences[spice] = (analytics.spicePreferences[spice] || 0) + 1;
        
        const time = item.time || 2;
        analytics.timePreferences[time] = (analytics.timePreferences[time] || 0) + 1;
        
        const lang = item.language || 'English';
        analytics.languagePreferences[lang] = (analytics.languagePreferences[lang] || 0) + 1;
        
        const depth = item.depth || 'standard';
        analytics.depthPreferences[depth] = (analytics.depthPreferences[depth] || 0) + 1;
        
        if (item.dish) {
            const dish = item.dish.toLowerCase();
            analytics.topDishes[dish] = (analytics.topDishes[dish] || 0) + 1;
        }
        
        if (item.generatedAt) {
            const date = new Date(item.generatedAt).toISOString().split('T')[0];
            analytics.dailyStats[date] = (analytics.dailyStats[date] || 0) + 1;
        }
    });
    
    state.analytics = analytics;
}

function renderAnalytics() {
    const analyticsTotal = document.getElementById('analyticsTotal');
    const analyticsSuccess = document.getElementById('analyticsSuccess');
    const analyticsCost = document.getElementById('analyticsCost');
    const analyticsTime = document.getElementById('analyticsTime');
    const modelUsageChart = document.getElementById('modelUsageChart');
    const topDishes = document.getElementById('topDishes');
    
    if (analyticsTotal) analyticsTotal.textContent = formatNumber(state.analytics.totalRecipes);
    
    if (analyticsSuccess) {
        const successRate = state.analytics.totalRecipes > 0
            ? Math.round((state.analytics.successCount / state.analytics.totalRecipes) * 100)
            : 0;
        analyticsSuccess.textContent = `${successRate}%`;
    }
    
    if (analyticsCost) {
        const avgCost = state.analytics.totalRecipes > 0
            ? state.analytics.totalCost / state.analytics.totalRecipes : 0;
        analyticsCost.textContent = formatCost(avgCost);
    }
    
    if (analyticsTime) {
        const avgTime = state.analytics.totalRecipes > 0
            ? state.analytics.totalResponseTime / state.analytics.totalRecipes : 0;
        analyticsTime.textContent = formatTime(avgTime);
    }
    
    // Model usage chart
    if (modelUsageChart) {
        modelUsageChart.innerHTML = '';
        const models = Object.entries(state.analytics.modelUsage);
        const maxCount = Math.max(...models.map(([_, count]) => count), 1);
        
        models.forEach(([model, count]) => {
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.innerHTML = `
                <span class="chart-bar-label">${truncate(model, 15)}</span>
                <div class="chart-bar-fill"><span style="width:${(count / maxCount) * 100}%"></span></div>
                <span class="chart-bar-value">${count}</span>
            `;
            modelUsageChart.appendChild(bar);
        });
    }
    
    // Top dishes
    if (topDishes) {
        topDishes.innerHTML = '';
        const dishes = Object.entries(state.analytics.topDishes)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        dishes.forEach(([dish, count], index) => {
            const dishEl = document.createElement('div');
            dishEl.className = 'top-dish';
            dishEl.innerHTML = `
                <span class="dish-rank">${index + 1}</span>
                <span class="dish-name">${truncate(dish, 20)}</span>
                <span class="dish-count">${count}</span>
            `;
            topDishes.appendChild(dishEl);
        });
    }
}

// ============================================
// HISTORY MANAGEMENT
// ============================================

function addToHistory(item) {
    state.history.unshift({ ...item, id: generateId(), createdAt: new Date().toISOString() });
    if (state.history.length > 100) state.history = state.history.slice(0, 100);
    saveState();
    updateAnalytics();
    renderHistory();
}

function removeFromHistory(id) {
    state.history = state.history.filter(item => item.id !== id);
    saveState();
    updateAnalytics();
    renderHistory();
}

function clearHistory() {
    state.history = [];
    saveState();
    updateAnalytics();
    renderHistory();
    showToast('History cleared', 'success');
}

function renderHistory(filter = 'all', search = '') {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    let filtered = state.history;
    
    if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(item => item.createdAt && item.createdAt.startsWith(today));
    } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(item => item.createdAt && new Date(item.createdAt) >= weekAgo);
    } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(item => item.createdAt && new Date(item.createdAt) >= monthAgo);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(item =>
            (item.dish && item.dish.toLowerCase().includes(searchLower)) ||
            (item.ingredients && item.ingredients.toLowerCase().includes(searchLower)) ||
            (item.recipe && item.recipe.toLowerCase().includes(searchLower))
        );
    }
    
    if (filtered.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No recipes found</p>';
        return;
    }
    
    historyList.innerHTML = filtered.map(item => {
        const safeData = JSON.stringify(item).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        return `
        <div class="history-item" data-id="${item.id}" data-recipe='${safeData}'>
            <div class="item-header">
                <span class="item-title">${truncate(item.dish || 'Untitled Recipe', 30)}</span>
                <span class="item-date">${formatDate(item.createdAt)}</span>
            </div>
            <p class="item-preview">${truncate(item.recipe || item.ingredients || '', 100)}</p>
        </div>`;
    }).join('');
    
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            try {
                const recipeData = JSON.parse(item.dataset.recipe);
                loadRecipe(recipeData);
                closeModal('historyModal');
            } catch (e) {
                console.error('Failed to parse recipe data:', e);
            }
        });
    });
}

// ============================================
// SAVED RECIPES
// ============================================

function saveRecipeAction(recipeData) {
    const exists = state.savedRecipes.some(r => r.id === recipeData.id);
    if (exists) {
        showToast('Already saved!', 'warning');
        return;
    }
    state.savedRecipes.unshift({ ...recipeData, id: recipeData.id || generateId(), savedAt: new Date().toISOString() });
    saveState();
    showToast('Recipe saved!', 'success', '⭐');
    renderSavedRecipes();
}

function removeSavedRecipe(id) {
    state.savedRecipes = state.savedRecipes.filter(r => r.id !== id);
    saveState();
    renderSavedRecipes();
    showToast('Recipe removed from saved', 'success');
}

function renderSavedRecipes() {
    const savedList = document.getElementById('savedRecipesList');
    if (!savedList) return;
    
    if (state.savedRecipes.length === 0) {
        savedList.innerHTML = '<p class="empty-state">No saved recipes yet</p>';
        return;
    }
    
    savedList.innerHTML = state.savedRecipes.slice(0, 5).map(recipe => {
        const safeData = JSON.stringify(recipe).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        return `
        <div class="saved-item" data-id="${recipe.id}" data-recipe='${safeData}'>
            <span class="item-icon">⭐</span>
            <span class="item-title">${truncate(recipe.dish || 'Untitled Recipe', 25)}</span>
            <span class="item-time">${formatDate(recipe.savedAt)}</span>
        </div>`;
    }).join('');
    
    savedList.querySelectorAll('.saved-item').forEach(item => {
        item.addEventListener('click', () => {
            try {
                const recipeData = JSON.parse(item.dataset.recipe);
                loadRecipe(recipeData);
            } catch (e) {
                console.error('Failed to parse saved recipe:', e);
            }
        });
    });
}

// ============================================
// RECIPE LOADING & RENDERING
// ============================================

function loadRecipe(recipeData) {
    state.currentRecipe = {
        ingredients: recipeData.ingredients || recipeData.topic || '',
        dish: recipeData.dish || 'Untitled Recipe',
        recipe: recipeData.recipe || recipeData.ultra_long_notes || '',
        options: {
            spice: recipeData.spice || 3, servings: recipeData.servings || 4,
            time: recipeData.time || 2, language: recipeData.language || 'English',
            depth: recipeData.depth || 'standard'
        },
        metadata: {
            tokens: recipeData.tokens || 0, cost: recipeData.cost || 0,
            responseTime: recipeData.responseTime || 0, model: recipeData.model || '',
            generatedAt: recipeData.generatedAt || recipeData.timestamp || null,
            requestId: recipeData.requestId || null
        }
    };
    
    renderRecipe();
    
    const recipeArea = document.getElementById('recipeArea');
    const welcomeSection = document.getElementById('welcomeSection');
    const inputMethods = document.getElementById('inputMethods');
    
    if (recipeArea) recipeArea.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (inputMethods) inputMethods.style.display = 'none';
    
    if (recipeArea) recipeArea.scrollIntoView({ behavior: 'smooth' });
}

function renderRecipe() {
    const recipeTitle = document.getElementById('recipeTitle');
    const recipeBadges = document.getElementById('recipeBadges');
    const recipeContent = document.getElementById('recipeContent');
    
    if (recipeTitle) recipeTitle.textContent = state.currentRecipe.dish;
    
    if (recipeBadges) {
        const spiceLabel = getSpiceLabel(state.currentRecipe.options.spice);
        const timeLabel = getTimeLabel(state.currentRecipe.options.time);
        recipeBadges.innerHTML = `
            <span class="badge">${spiceLabel.icon} ${spiceLabel.label}</span>
            <span class="badge">👥 ${state.currentRecipe.options.servings} Servings</span>
            <span class="badge">${timeLabel.icon} ${timeLabel.label}</span>
            <span class="badge">📊 ${formatNumber(state.currentRecipe.metadata.tokens)} Tokens</span>
        `;
    }
    
    if (recipeContent) {
        if (typeof marked !== 'undefined') {
            const rawHtml = marked.parse(state.currentRecipe.recipe);
            recipeContent.innerHTML = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(rawHtml) : rawHtml;
        } else {
            recipeContent.innerHTML = `<pre style="white-space:pre-wrap">${state.currentRecipe.recipe}</pre>`;
        }
    }
}

function getSpiceLabel(spice) {
    const labels = [
        { label: 'Mild', icon: '🌶️', color: '#8899aa' },
        { label: 'Medium', icon: '🌶️🌶️', color: '#00d4ff' },
        { label: 'Spicy', icon: '🌶️🌶️🌶️', color: '#ffaa00' },
        { label: 'Hot', icon: '🌶️🌶️🌶️🌶️', color: '#ff6600' },
        { label: 'Indian', icon: '🌶️🌶️🌶️🌶️🌶️', color: '#ff4466' }
    ];
    return labels[spice - 1] || labels[2];
}

function getTimeLabel(time) {
    const labels = [
        { label: 'Quick (under 30 min)', icon: '⏱️' },
        { label: 'Medium (30-60 min)', icon: '⏰' },
        { label: 'Slow (1-2 hours)', icon: '⏳' },
        { label: 'Gourmet (2+ hours)', icon: '🕒' }
    ];
    return labels[time - 1] || labels[1];
}

// ============================================
// THEME MANAGEMENT
// ============================================

function applyTheme() {
    const theme = state.settings.theme;
    const html = document.documentElement;
    
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
        html.setAttribute('data-theme', theme);
    }
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const icon = themeToggle.querySelector('.action-icon') || themeToggle.querySelector('i');
        if (icon) {
            icon.className = currentTheme === 'dark' ? 'fas fa-sun action-icon' : 'fas fa-moon action-icon';
        }
    }
}

function toggleTheme() {
    const current = state.settings.theme;
    const next = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
    state.settings.theme = next;
    saveState();
    applyTheme();
    showToast(`Theme: ${next}`, 'success');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'info', icon = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon || icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => removeToast(toast));
    
    setTimeout(() => removeToast(toast), 3500);
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = 'toastOut 0.3s ease-out forwards';
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
}

// ============================================
// MODAL SYSTEM (FIXED)
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        // Only restore scroll if no other modals are open
        const anyOpen = document.querySelector('.modal-overlay.active');
        if (!anyOpen) document.body.style.overflow = '';
    }
}

function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        if (modal.classList.contains('active')) {
            closeModal(modalId);
        } else {
            openModal(modalId);
        }
    }
}

// ============================================
// SIDEBAR MANAGEMENT (FIXED)
// ============================================

function toggleSidebar() {
    const panel = document.getElementById('leftPanel');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (panel) {
        const isCollapsed = panel.classList.contains('collapsed');
        
        if (isCollapsed) {
            panel.classList.remove('collapsed');
            if (overlay) overlay.classList.add('active');
            state.ui.sidebarOpen = true;
        } else {
            panel.classList.add('collapsed');
            if (overlay) overlay.classList.remove('active');
            state.ui.sidebarOpen = false;
        }
    }
}

function closeSidebar() {
    const panel = document.getElementById('leftPanel');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (panel) panel.classList.add('collapsed');
    if (overlay) overlay.classList.remove('active');
    state.ui.sidebarOpen = false;
}

function initSidebar() {
    const panel = document.getElementById('leftPanel');
    const toggle = document.getElementById('sbToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    // On mobile, start collapsed
    if (window.innerWidth <= 1024) {
        if (panel) panel.classList.add('collapsed');
        state.ui.sidebarOpen = false;
    } else {
        if (panel) panel.classList.remove('collapsed');
        state.ui.sidebarOpen = true;
    }
    
    if (toggle) {
        toggle.addEventListener('click', toggleSidebar);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    
    // Close sidebar on window resize if mobile
    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth <= 1024 && state.ui.sidebarOpen) {
            closeSidebar();
        }
    }, 200));
}

// ============================================
// WIZARD SYSTEM
// ============================================

function initWizard() {
    const wizard = document.getElementById('recipeWizard');
    if (!wizard) return;
    
    const steps = wizard.querySelectorAll('.wizard-step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const generateBtn = document.getElementById('generateBtn');
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');
    
    let currentStep = 0;
    
    function updateWizardStep(step) {
        currentStep = step;
        
        steps.forEach((s, i) => s.classList.toggle('active', i === step));
        
        progressSteps.forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i === step) s.classList.add('active');
            else if (i < step) s.classList.add('completed');
        });
        
        progressLines.forEach((line, i) => line.classList.toggle('active', i < step));
        
        if (prevBtn) prevBtn.style.display = step > 0 ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.style.display = step < steps.length - 1 ? 'inline-flex' : 'none';
        if (generateBtn) generateBtn.style.display = step === steps.length - 1 ? 'inline-flex' : 'none';
        
        if (step === 2) updateReview();
    }
    
    function updateReview() {
        let ingredients = '';
        const activePanel = document.querySelector('.input-panel.active');
        if (activePanel) {
            const panelId = activePanel.dataset.panel;
            if (panelId === 'camera') {
                const thumbnail = document.getElementById('cameraThumbnail');
                if (thumbnail && thumbnail.style.display !== 'none') ingredients = 'Image captured';
            } else if (panelId === 'voice') {
                const transcript = document.getElementById('voiceTranscript');
                ingredients = transcript ? transcript.textContent.replace('Your voice input will appear here...', '').trim() : '';
            } else if (panelId === 'text') {
                const textInput = document.getElementById('textInput');
                ingredients = textInput ? textInput.value.trim() : '';
            } else if (panelId === 'upload') {
                const preview = document.getElementById('uploadPreview');
                if (preview && preview.style.display !== 'none') ingredients = 'Image uploaded';
            } else if (panelId === 'smart') {
                const smartInput = document.getElementById('smartInput');
                ingredients = smartInput ? smartInput.value.trim() : '';
            }
        }
        
        const reviewIngredients = document.getElementById('reviewIngredients');
        const reviewSpice = document.getElementById('reviewSpice');
        const reviewServings = document.getElementById('reviewServings');
        const reviewTime = document.getElementById('reviewTime');
        const reviewLanguage = document.getElementById('reviewLanguage');
        const reviewDepth = document.getElementById('reviewDepth');
        
        if (reviewIngredients) reviewIngredients.textContent = ingredients || 'Not set';
        
        const spiceValue = document.getElementById('spiceValue');
        if (reviewSpice && spiceValue) reviewSpice.textContent = `Spice: ${spiceValue.textContent}`;
        
        const servingsGrid = document.getElementById('servingsGrid');
        if (reviewServings && servingsGrid) {
            const activeServing = servingsGrid.querySelector('.serving-btn.active');
            reviewServings.textContent = `Servings: ${activeServing ? activeServing.dataset.servings : '4'}`;
        }
        
        const timeButtons = document.getElementById('timeButtons');
        if (reviewTime && timeButtons) {
            const activeTime = timeButtons.querySelector('.time-btn.active');
            reviewTime.textContent = `Time: ${activeTime ? activeTime.textContent.trim() : 'Medium'}`;
        }
        
        const languageSelect = document.getElementById('languageSelect');
        if (reviewLanguage && languageSelect) reviewLanguage.textContent = `Language: ${languageSelect.value}`;
        
        const depthSelect = document.getElementById('depthSelect');
        if (reviewDepth && depthSelect) reviewDepth.textContent = `Depth: ${depthSelect.options[depthSelect.selectedIndex].text}`;
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentStep > 0) updateWizardStep(currentStep - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                if (currentStep === 0) {
                    const activePanel = document.querySelector('.input-panel.active');
                    let hasInput = false;
                    
                    if (activePanel) {
                        const panelId = activePanel.dataset.panel;
                        if (panelId === 'camera') {
                            const thumbnail = document.getElementById('cameraThumbnail');
                            hasInput = thumbnail && thumbnail.style.display !== 'none';
                        } else if (panelId === 'voice') {
                            const transcript = document.getElementById('voiceTranscript');
                            hasInput = transcript && transcript.textContent.trim() !== 'Your voice input will appear here...' && transcript.textContent.trim() !== '';
                        } else if (panelId === 'text') {
                            const textInput = document.getElementById('textInput');
                            hasInput = textInput && textInput.value.trim().length > 0;
                        } else if (panelId === 'upload') {
                            const preview = document.getElementById('uploadPreview');
                            hasInput = preview && preview.style.display !== 'none';
                        } else if (panelId === 'smart') {
                            const smartInput = document.getElementById('smartInput');
                            hasInput = smartInput && smartInput.value.trim().length > 0;
                        }
                    }
                    
                    if (!hasInput) {
                        showToast('Please provide ingredients first', 'warning');
                        return;
                    }
                }
                updateWizardStep(currentStep + 1);
            }
        });
    }
    
    if (generateBtn) {
        generateBtn.addEventListener('click', () => {
            generateRecipeFromWizard();
        });
    }
    
    updateWizardStep(0);
    
    // Input tabs
    const inputTabs = document.querySelectorAll('.input-tab');
    const inputPanels = document.querySelectorAll('.input-panel');
    
    inputTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            inputTabs.forEach(t => t.classList.remove('active'));
            inputPanels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.querySelector(`.input-panel[data-panel="${tab.dataset.tab}"]`);
            if (panel) panel.classList.add('active');
            state.ui.currentInputMethod = tab.dataset.tab;
        });
    });
}

// ============================================
// CAMERA INPUT (FIXED - Stream cleanup)
// ============================================

function initCamera() {
    const startCamera = document.getElementById('startCamera');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const usePhotoBtn = document.getElementById('usePhotoBtn');
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const cameraOverlay = document.getElementById('cameraOverlay');
    const cameraControls = document.getElementById('cameraControls');
    const cameraThumbnail = document.getElementById('cameraThumbnail');
    const capturedImage = document.getElementById('capturedImage');
    const removeThumbnail = document.getElementById('removeThumbnail');
    
    let stream = null;
    let capturedData = null;
    
    function stopStream() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (state.ui.cameraStream) {
            state.ui.cameraStream.getTracks().forEach(track => track.stop());
            state.ui.cameraStream = null;
        }
    }
    
    if (startCamera) {
        startCamera.addEventListener('click', async () => {
            try {
                stopStream();
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' },
                    audio: false
                });
                
                cameraVideo.srcObject = stream;
                state.ui.cameraStream = stream;
                
                if (cameraOverlay) cameraOverlay.style.display = 'none';
                if (cameraControls) cameraControls.style.display = 'flex';
                if (cameraThumbnail) cameraThumbnail.style.display = 'none';
                
            } catch (err) {
                console.error('Camera error:', err);
                showToast('Could not access camera. Please check permissions.', 'error');
            }
        });
    }
    
    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            if (!cameraVideo || !cameraCanvas) return;
            
            cameraCanvas.width = cameraVideo.videoWidth || 640;
            cameraCanvas.height = cameraVideo.videoHeight || 480;
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(cameraVideo, 0, 0);
            
            capturedData = cameraCanvas.toDataURL('image/jpeg', 0.8);
            if (capturedImage) capturedImage.src = capturedData;
            
            if (cameraThumbnail) cameraThumbnail.style.display = 'block';
            if (cameraControls) cameraControls.style.display = 'none';
            
            stopStream();
        });
    }
    
    if (retakeBtn) {
        retakeBtn.addEventListener('click', async () => {
            capturedData = null;
            if (cameraThumbnail) cameraThumbnail.style.display = 'none';
            
            try {
                stopStream();
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }, audio: false
                });
                cameraVideo.srcObject = stream;
                state.ui.cameraStream = stream;
                if (cameraOverlay) cameraOverlay.style.display = 'none';
                if (cameraControls) cameraControls.style.display = 'flex';
            } catch (err) {
                console.error('Camera error:', err);
                showToast('Could not access camera', 'error');
            }
        });
    }
    
    if (usePhotoBtn) {
        usePhotoBtn.addEventListener('click', () => {
            if (capturedData) {
                state.currentRecipe.ingredients = capturedData;
                showToast('Photo selected', 'success', '📸');
            } else {
                showToast('Please capture a photo first', 'warning');
            }
        });
    }
    
    if (removeThumbnail) {
        removeThumbnail.addEventListener('click', () => {
            if (cameraThumbnail) cameraThumbnail.style.display = 'none';
            capturedData = null;
        });
    }
}

// ============================================
// VOICE INPUT
// ============================================

function initVoice() {
    const startVoice = document.getElementById('startVoice');
    const stopVoice = document.getElementById('stopVoice');
    const voiceTranscript = document.getElementById('voiceTranscript');
    const voiceVisualizer = document.getElementById('voiceVisualizer');
    
    let recognition = null;
    let isRecording = false;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        if (startVoice) startVoice.style.display = 'none';
        if (voiceTranscript) voiceTranscript.innerHTML = '<p style="color:var(--danger)">Voice recognition not supported in your browser</p>';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    state.ui.recognition = recognition;
    
    if (startVoice) {
        startVoice.addEventListener('click', () => {
            if (!isRecording) {
                try {
                    recognition.start();
                    isRecording = true;
                    startVoice.style.display = 'none';
                    if (stopVoice) stopVoice.style.display = 'inline-flex';
                    if (voiceVisualizer) voiceVisualizer.classList.add('recording');
                    if (voiceTranscript) voiceTranscript.innerHTML = '<p>Listening...</p>';
                    state.ui.isRecording = true;
                } catch (err) {
                    console.error('Voice start error:', err);
                    showToast('Could not start voice recognition', 'error');
                }
            }
        });
    }
    
    if (stopVoice) {
        stopVoice.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
                isRecording = false;
                if (startVoice) startVoice.style.display = 'inline-flex';
                stopVoice.style.display = 'none';
                if (voiceVisualizer) voiceVisualizer.classList.remove('recording');
                state.ui.isRecording = false;
            }
        });
    }
    
    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        if (finalTranscript && voiceTranscript) {
            voiceTranscript.innerHTML = `<p>${finalTranscript.trim()}</p>`;
            state.currentRecipe.ingredients = finalTranscript.trim();
        } else if (interimTranscript && voiceTranscript) {
            voiceTranscript.innerHTML = `<p>${finalTranscript.trim()} <em>${interimTranscript}</em></p>`;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
            showToast(`Voice error: ${event.error}`, 'error');
        }
        isRecording = false;
        if (startVoice) startVoice.style.display = 'inline-flex';
        if (stopVoice) stopVoice.style.display = 'none';
        if (voiceVisualizer) voiceVisualizer.classList.remove('recording');
        state.ui.isRecording = false;
    };
    
    recognition.onend = () => {
        if (!isRecording) {
            if (startVoice) startVoice.style.display = 'inline-flex';
            if (stopVoice) stopVoice.style.display = 'none';
            if (voiceVisualizer) voiceVisualizer.classList.remove('recording');
            state.ui.isRecording = false;
        }
    };
}

// ============================================
// TEXT INPUT
// ============================================

function initTextInput() {
    const textInput = document.getElementById('textInput');
    const textSuggestions = document.getElementById('textSuggestions');
    const ingredientChips = document.getElementById('ingredientChips');
    
    if (textInput) {
        textInput.addEventListener('input', () => {
            textInput.style.height = 'auto';
            textInput.style.height = Math.min(textInput.scrollHeight, 300) + 'px';
            state.currentRecipe.ingredients = textInput.value.trim();
        });
        
        textInput.addEventListener('input', debounce(() => {
            const value = textInput.value.trim().toLowerCase();
            if (value.length < 2 || !textSuggestions) {
                if (textSuggestions) textSuggestions.innerHTML = '';
                return;
            }
            
            const matches = QUICK_INGREDIENTS.filter(ing => ing.toLowerCase().includes(value));
            if (matches.length > 0) {
                textSuggestions.innerHTML = matches.slice(0, 5).map(ing =>
                    `<span class="suggestion-tag">${ing}</span>`
                ).join('');
                
                textSuggestions.querySelectorAll('.suggestion-tag').forEach(tag => {
                    tag.addEventListener('click', () => {
                        textInput.value = tag.textContent;
                        textInput.dispatchEvent(new Event('input'));
                        textSuggestions.innerHTML = '';
                    });
                });
            } else {
                textSuggestions.innerHTML = '';
            }
        }, 300));
    }
    
    if (ingredientChips) {
        ingredientChips.innerHTML = QUICK_INGREDIENTS.slice(0, 10).map(ing =>
            `<span class="ingredient-chip">${ing}</span>`
        ).join('');
        
        ingredientChips.querySelectorAll('.ingredient-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                if (textInput) {
                    const current = textInput.value.trim();
                    textInput.value = current ? `${current}, ${chip.textContent}` : chip.textContent;
                    textInput.dispatchEvent(new Event('input'));
                }
            });
        });
    }
}

// ============================================
// UPLOAD
// ============================================

function initUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadedImage = document.getElementById('uploadedImage');
    const removeUpload = document.getElementById('removeUpload');
    
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
        uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
        });
        uploadZone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
    }
    
    if (browseBtn) browseBtn.addEventListener('click', (e) => { e.stopPropagation(); if (fileInput) fileInput.click(); });
    
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) handleFileUpload(fileInput.files[0]);
        });
    }
    
    if (removeUpload) {
        removeUpload.addEventListener('click', (e) => {
            e.stopPropagation();
            if (uploadPreview) uploadPreview.style.display = 'none';
            state.currentRecipe.ingredients = '';
        });
    }
    
    function handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please upload an image file', 'warning');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            if (uploadedImage) uploadedImage.src = e.target.result;
            if (uploadPreview) uploadPreview.style.display = 'block';
            state.currentRecipe.ingredients = e.target.result;
            showToast('Image uploaded', 'success', '📁');
        };
        reader.readAsDataURL(file);
    }
}

// ============================================
// SMART INPUT
// ============================================

function initSmartInput() {
    const smartInput = document.getElementById('smartInput');
    const smartSuggestBtn = document.getElementById('smartSuggestBtn');
    const smartSuggestions = document.getElementById('smartSuggestions');
    
    if (smartInput) {
        smartInput.addEventListener('input', () => {
            state.currentRecipe.ingredients = smartInput.value.trim();
        });
    }
    
    if (smartSuggestBtn) {
        smartSuggestBtn.addEventListener('click', async () => {
            const input = smartInput ? smartInput.value.trim() : '';
            if (input.length < 2) {
                showToast('Please enter at least 2 characters', 'warning');
                return;
            }
            
            smartSuggestBtn.disabled = true;
            smartSuggestBtn.innerHTML = '<span>🔄 Processing...</span>';
            
            try {
                const response = await fetch(API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: input, action: 'smart-detect',
                        userName: state.user.name, sessionId: generateId()
                    })
                });
                
                const data = await response.json();
                
                if (data.suggestions && smartSuggestions) {
                    smartSuggestions.innerHTML = `
                        <h4 style="margin-bottom:8px;color:var(--ink)">Suggested Ingredients:</h4>
                        <p style="font-size:0.85rem;color:var(--ink-soft);margin-bottom:12px">${data.suggestions}</p>
                        <button class="btn-primary" id="useSmartSuggestion">Use These Ingredients</button>
                    `;
                    
                    const useBtn = document.getElementById('useSmartSuggestion');
                    if (useBtn) {
                        useBtn.addEventListener('click', () => {
                            if (smartInput) {
                                smartInput.value = data.suggestions;
                                smartInput.dispatchEvent(new Event('input'));
                            }
                            smartSuggestions.innerHTML = '';
                        });
                    }
                }
            } catch (err) {
                console.error('Smart detect error:', err);
                // Fallback: suggest from quick ingredients
                const fallback = QUICK_INGREDIENTS.filter(ing => ing.toLowerCase().includes(input.toLowerCase())).slice(0, 5);
                if (fallback.length > 0 && smartSuggestions) {
                    smartSuggestions.innerHTML = `<p style="font-size:0.85rem;color:var(--ink-soft)">Try: ${fallback.join(', ')}</p>`;
                } else {
                    showToast('Could not get suggestions', 'error');
                }
            } finally {
                smartSuggestBtn.disabled = false;
                smartSuggestBtn.innerHTML = '<span><i class="fas fa-bullseye"></i> Suggest Ingredients</span>';
            }
        });
    }
}

// ============================================
// PREFERENCES
// ============================================

function initPreferences() {
    const spiceSlider = document.getElementById('spiceSlider');
    const spiceValue = document.getElementById('spiceValue');
    const servingsGrid = document.getElementById('servingsGrid');
    const timeButtons = document.getElementById('timeButtons');
    const languageSelect = document.getElementById('languageSelect');
    const depthSelect = document.getElementById('depthSelect');
    
    if (spiceSlider && spiceValue) {
        const spiceLabels = [
            'Mild - No heat, beginner-friendly',
            'Medium - Gentle warmth',
            'Spicy - Noticeable kick',
            'Hot - Serious heat',
            'Indian - Maximum spice!'
        ];
        
        spiceSlider.addEventListener('input', () => {
            const value = parseInt(spiceSlider.value);
            spiceValue.textContent = spiceLabels[value - 1];
            state.currentRecipe.options.spice = value;
        });
        
        spiceValue.textContent = spiceLabels[spiceSlider.value - 1];
    }
    
    if (servingsGrid) {
        servingsGrid.querySelectorAll('.serving-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                servingsGrid.querySelectorAll('.serving-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentRecipe.options.servings = parseInt(btn.dataset.servings);
            });
        });
    }
    
    if (timeButtons) {
        timeButtons.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                timeButtons.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentRecipe.options.time = parseInt(btn.dataset.time);
            });
        });
    }
    
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            state.currentRecipe.options.language = languageSelect.value;
        });
    }
    
    if (depthSelect) {
        depthSelect.addEventListener('change', () => {
            state.currentRecipe.options.depth = depthSelect.value;
        });
    }
}

// ============================================
// RECIPE GENERATION
// ============================================

async function generateRecipeFromWizard() {
    const generateBtn = document.getElementById('generateBtn');
    const activePanel = document.querySelector('.input-panel.active');
    
    if (!activePanel) {
        showToast('Please select an input method', 'warning');
        return;
    }
    
    const panelId = activePanel.dataset.panel;
    let ingredients = '';
    let imageData = null;
    
    if (panelId === 'camera') {
        const capturedImage = document.getElementById('capturedImage');
        if (capturedImage && capturedImage.src && !capturedImage.src.endsWith('recipe.html')) {
            imageData = capturedImage.src;
        }
    } else if (panelId === 'voice') {
        const transcript = document.getElementById('voiceTranscript');
        ingredients = transcript ? transcript.textContent.replace('Your voice input will appear here...', '').trim() : '';
    } else if (panelId === 'text') {
        const textInput = document.getElementById('textInput');
        ingredients = textInput ? textInput.value.trim() : '';
    } else if (panelId === 'upload') {
        const uploadedImage = document.getElementById('uploadedImage');
        if (uploadedImage && uploadedImage.src && !uploadedImage.src.endsWith('recipe.html')) {
            imageData = uploadedImage.src;
        }
    } else if (panelId === 'smart') {
        const smartInput = document.getElementById('smartInput');
        ingredients = smartInput ? smartInput.value.trim() : '';
    }
    
    if (!ingredients && !imageData) {
        showToast('Please provide ingredients or an image', 'warning');
        return;
    }
    
    const spiceSlider = document.getElementById('spiceSlider');
    const servingsGrid = document.getElementById('servingsGrid');
    const timeButtons = document.getElementById('timeButtons');
    const languageSelect = document.getElementById('languageSelect');
    const depthSelect = document.getElementById('depthSelect');
    
    const options = {
        spice: parseInt(spiceSlider?.value || 3),
        servings: parseInt(servingsGrid?.querySelector('.serving-btn.active')?.dataset.servings || 4),
        time: parseInt(timeButtons?.querySelector('.time-btn.active')?.dataset.time || 2),
        language: languageSelect?.value || 'English',
        depth: depthSelect?.value || 'standard',
        stream: true
    };
    
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span>🔄 Generating...</span>';
    }
    
    closeModal('wizardModal');
    
    await generateRecipe(ingredients, imageData, options);
    
    if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Generate Recipe</span>';
    }
}

async function generateRecipe(ingredients, imageData = null, options = {}) {
    const recipeArea = document.getElementById('recipeArea');
    const welcomeSection = document.getElementById('welcomeSection');
    const inputMethods = document.getElementById('inputMethods');
    const generationProgress = document.getElementById('generationProgress');
    const streamingOutput = document.getElementById('streamingOutput');
    const streamingContent = document.getElementById('streamingContent');
    const cancelGeneration = document.getElementById('cancelGeneration');
    
    // Show generation UI
    if (recipeArea) recipeArea.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (inputMethods) inputMethods.style.display = 'none';
    if (generationProgress) generationProgress.style.display = 'block';
    if (streamingOutput) streamingOutput.style.display = 'block';
    if (streamingContent) streamingContent.textContent = '';
    
    state.ui.isGenerating = true;
    state.ui.isStreaming = true;
    state.ui.currentStream = '';
    
    const abortController = new AbortController();
    state.ui.abortController = abortController;
    
    if (cancelGeneration) {
        cancelGeneration.style.display = 'inline-flex';
        cancelGeneration.onclick = () => {
            abortController.abort();
            state.ui.isGenerating = false;
            state.ui.isStreaming = false;
            if (generationProgress) generationProgress.style.display = 'none';
            if (streamingOutput) streamingOutput.style.display = 'none';
            cancelGeneration.style.display = 'none';
            showToast('Generation cancelled', 'warning');
        };
    }
    
    try {
        const requestId = generateId();
        const sessionId = generateId();
        
        const requestBody = {
            message: ingredients,
            image: imageData,
            userName: state.user.name,
            sessionId,
            options: {
                spice: options.spice || 3, servings: options.servings || 4,
                time: options.time || 2, language: options.language || 'English',
                depth: options.depth || 'standard', stream: true
            },
            userStats: { xp: state.user.xp, streak: state.user.streak, totalRecipes: state.user.totalRecipes }
        };
        
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortController.signal
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        if (!response.body) throw new Error('No response body');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            while (buffer.includes('\n\n')) {
                const endIndex = buffer.indexOf('\n\n');
                const message = buffer.slice(0, endIndex);
                buffer = buffer.slice(endIndex + 2);
                
                if (!message) continue;
                
                const lines = message.split('\n');
                let event = 'message';
                let data = '';
                
                lines.forEach(line => {
                    if (line.startsWith('event: ')) event = line.slice(7);
                    else if (line.startsWith('data: ')) data = line.slice(6);
                });
                
                if (event === 'heartbeat') continue;
                
                if (event === 'stage') {
                    try {
                        const stageData = JSON.parse(data);
                        const progressStages = document.getElementById('progressStages');
                        const progressFill = document.getElementById('progressFill');
                        
                        if (progressStages) {
                            const stages = progressStages.querySelectorAll('.stage');
                            stages.forEach((s, i) => {
                                s.classList.remove('active', 'completed');
                                if (i === stageData.idx) s.classList.add('active');
                                else if (i < stageData.idx) s.classList.add('completed');
                            });
                        }
                        
                        if (progressFill) {
                            progressFill.style.width = `${((stageData.idx + 1) / 5) * 100}%`;
                        }
                    } catch (e) { /* ignore parse errors */ }
                }
                
                if (event === 'token') {
                    try {
                        const tokenData = JSON.parse(data);
                        if (tokenData.t && streamingContent) {
                            streamingContent.textContent += tokenData.t;
                            state.ui.currentStream += tokenData.t;
                        }
                    } catch (e) { /* ignore */ }
                }
                
                if (event === 'done') {
                    try {
                        const doneData = JSON.parse(data);
                        
                        const recipeData = {
                            id: doneData.requestId || requestId,
                            dish: doneData.dish || 'Untitled Recipe',
                            recipe: doneData.ultra_long_notes || doneData.recipe || state.ui.currentStream,
                            ingredients: doneData.topic || ingredients,
                            spice: doneData.spice || options.spice || 3,
                            servings: doneData.servings || options.servings || 4,
                            time: doneData.time || options.time || 2,
                            language: doneData.language || options.language || 'English',
                            depth: doneData.depth || options.depth || 'standard',
                            tokens: doneData.tokens || 0,
                            cost: doneData.cost || 0,
                            responseTime: doneData.responseTime || 0,
                            model: doneData.model || '',
                            generatedAt: doneData.generated_at || new Date().toISOString(),
                            requestId: doneData.requestId || requestId,
                            status: doneData.status || 'Success'
                        };
                        
                        addToHistory(recipeData);
                        loadRecipe(recipeData);
                        addXP(15);
                        updateAnalytics();
                        
                        if (generationProgress) generationProgress.style.display = 'none';
                        if (streamingOutput) streamingOutput.style.display = 'none';
                        if (cancelGeneration) cancelGeneration.style.display = 'none';
                        
                        showToast(`Recipe generated: ${doneData.dish || 'Success'}`, 'success', '🍳');
                        
                    } catch (e) {
                        console.error('Done parse error:', e);
                    }
                }
                
                if (event === 'error') {
                    try {
                        const errorData = JSON.parse(data);
                        throw new Error(errorData.error || 'Unknown error');
                    } catch (e) {
                        throw new Error('Generation error');
                    }
                }
            }
        }
        
    } catch (err) {
        console.error('Generation error:', err);
        
        if (err.name !== 'AbortError') {
            showToast(err.message || 'Generation failed. Please try again.', 'error');
        }
        
        state.ui.isGenerating = false;
        state.ui.isStreaming = false;
        
        if (generationProgress) generationProgress.style.display = 'none';
        if (streamingOutput) streamingOutput.style.display = 'none';
        if (cancelGeneration) cancelGeneration.style.display = 'none';
        
    } finally {
        state.ui.abortController = null;
    }
}

// ============================================
// DIRECT INPUT HANDLERS
// ============================================

function initDirectInputs() {
    const directCamera = document.getElementById('directCamera');
    const directVoice = document.getElementById('directVoice');
    const directText = document.getElementById('directText');
    const directUpload = document.getElementById('directUpload');
    const directSmart = document.getElementById('directSmart');
    
    if (directCamera) directCamera.addEventListener('click', () => {
        openModal('wizardModal');
        setTimeout(() => { const tab = document.querySelector('.input-tab[data-tab="camera"]'); if (tab) tab.click(); }, 100);
    });
    if (directVoice) directVoice.addEventListener('click', () => {
        openModal('wizardModal');
        setTimeout(() => { const tab = document.querySelector('.input-tab[data-tab="voice"]'); if (tab) tab.click(); }, 100);
    });
    if (directText) directText.addEventListener('click', () => {
        openModal('wizardModal');
        setTimeout(() => { const tab = document.querySelector('.input-tab[data-tab="text"]'); if (tab) tab.click(); }, 100);
    });
    if (directUpload) directUpload.addEventListener('click', () => {
        openModal('wizardModal');
        setTimeout(() => { const tab = document.querySelector('.input-tab[data-tab="upload"]'); if (tab) tab.click(); }, 100);
    });
    if (directSmart) directSmart.addEventListener('click', () => {
        openModal('wizardModal');
        setTimeout(() => { const tab = document.querySelector('.input-tab[data-tab="smart"]'); if (tab) tab.click(); }, 100);
    });
}

// ============================================
// RECIPE ACTIONS
// ============================================

function initRecipeActions() {
    const saveRecipeBtn = document.getElementById('saveRecipeBtn');
    const pdfRecipeBtn = document.getElementById('pdfRecipeBtn');
    const shareRecipeBtn = document.getElementById('shareRecipeBtn');
    const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');
    
    if (saveRecipeBtn) {
        saveRecipeBtn.addEventListener('click', () => {
            if (state.currentRecipe.dish) {
                saveRecipeAction(state.currentRecipe);
            } else {
                showToast('No recipe to save', 'warning');
            }
        });
    }
    
    if (pdfRecipeBtn) {
        pdfRecipeBtn.addEventListener('click', () => openModal('pdfModal'));
    }
    
    if (shareRecipeBtn) {
        shareRecipeBtn.addEventListener('click', () => {
            if (state.currentRecipe.recipe) {
                navigator.clipboard.writeText(state.currentRecipe.recipe)
                    .then(() => showToast('Recipe copied to clipboard!', 'success', '📋'))
                    .catch(() => showToast('Could not copy to clipboard', 'error'));
            } else {
                showToast('No recipe to share', 'warning');
            }
        });
    }
    
    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', () => {
            showConfirmation('Delete Recipe', 'Are you sure you want to delete this recipe?', () => {
                state.currentRecipe = {
                    ingredients: '', dish: '', recipe: '',
                    options: { spice: 3, servings: 4, time: 2, language: 'English', depth: 'standard' },
                    metadata: { tokens: 0, cost: 0, responseTime: 0, model: '', generatedAt: null, requestId: null }
                };
                
                const recipeArea = document.getElementById('recipeArea');
                const welcomeSection = document.getElementById('welcomeSection');
                const inputMethods = document.getElementById('inputMethods');
                
                if (recipeArea) recipeArea.style.display = 'none';
                if (welcomeSection) welcomeSection.style.display = 'flex';
                if (inputMethods) inputMethods.style.display = 'flex';
                
                showToast('Recipe deleted', 'success');
            });
        });
    }
}

// ============================================
// PDF GENERATION
// ============================================

function initPdfGeneration() {
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const pdfClose = document.getElementById('pdfClose');
    
    if (pdfClose) pdfClose.addEventListener('click', () => closeModal('pdfModal'));
    
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            if (!state.currentRecipe.recipe) {
                showToast('No recipe to download', 'warning');
                return;
            }
            
            try {
                if (typeof jsPDF === 'undefined') {
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                }
                generatePdf();
            } catch (err) {
                console.error('PDF error:', err);
                showToast('PDF generation failed', 'error');
            }
        });
    }
    
    function generatePdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pdfTheme = document.getElementById('pdfTheme');
        const isDark = pdfTheme ? pdfTheme.value === 'dark' : true;
        
        const bgColor = isDark ? [3, 5, 12] : [255, 255, 255];
        const textColor = isDark ? [238, 241, 248] : [13, 19, 48];
        const primaryColor = [212, 175, 55];
        
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('RouxMind', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Where Every Plate Tells Your Story', 105, 38, { align: 'center' });
        
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(state.currentRecipe.dish || 'Untitled Recipe', 105, 60, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const spiceLabel = getSpiceLabel(state.currentRecipe.options.spice);
        const timeLabel = getTimeLabel(state.currentRecipe.options.time);
        doc.text(`Spice: ${spiceLabel.label} | Servings: ${state.currentRecipe.options.servings} | Time: ${timeLabel.label}`, 105, 70, { align: 'center' });
        
        doc.line(20, 75, 190, 75);
        
        doc.setFontSize(11);
        let y = 85;
        const lineHeight = 7;
        const maxWidth = 170;
        
        const lines = doc.splitTextToSize(state.currentRecipe.recipe, maxWidth);
        lines.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
                doc.rect(0, 0, 210, 297, 'F');
                doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                doc.setFontSize(11);
            }
            doc.text(line, 20, y);
            y += lineHeight;
        });
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated by ${ROUXMIND.BRAND} | Built by ${ROUXMIND.FOUNDER} | ${ROUXMIND.DEVSITE}`, 105, 290, { align: 'center' });
        
        doc.save(`${(state.currentRecipe.dish || 'recipe').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        closeModal('pdfModal');
        showToast('PDF downloaded!', 'success', '📄');
    }
}

// ============================================
// CONFIRMATION MODAL
// ============================================

function showConfirmation(title, message, onConfirm) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOk = document.getElementById('confirmOk');
    const confirmCancel = document.getElementById('confirmCancel');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    
    const okClone = confirmOk.cloneNode(true);
    const cancelClone = confirmCancel.cloneNode(true);
    confirmOk.parentNode.replaceChild(okClone, confirmOk);
    confirmCancel.parentNode.replaceChild(cancelClone, confirmCancel);
    
    okClone.addEventListener('click', () => { closeModal('confirmModal'); onConfirm(); });
    cancelClone.addEventListener('click', () => closeModal('confirmModal'));
    
    openModal('confirmModal');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const tagName = document.activeElement.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
        
        if (isInput && !(e.ctrlKey || e.metaKey)) return;
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openModal('wizardModal');
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            renderHistory();
            openModal('historyModal');
        } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('saveRecipeBtn')?.click();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            document.getElementById('pdfRecipeBtn')?.click();
        }
        
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                closeModal(modal.id);
            });
            const analyticsPanel = document.getElementById('analyticsPanel');
            if (analyticsPanel) analyticsPanel.classList.remove('active');
        }
    });
}

// ============================================
// NAVIGATION ACTIONS (FIXED)
// ============================================

function initNavActions() {
    // Sidebar toggle
    document.getElementById('sbToggle')?.addEventListener('click', toggleSidebar);
    
    // Header buttons
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
    document.getElementById('newRecipeBtn')?.addEventListener('click', () => openModal('wizardModal'));
    document.getElementById('historyBtn')?.addEventListener('click', () => { renderHistory(); openModal('historyModal'); });
    document.getElementById('settingsBtn')?.addEventListener('click', () => { initSettings(); openModal('settingsModal'); });
    
    document.getElementById('analyticsBtn')?.addEventListener('click', () => {
        renderAnalytics();
        const analyticsPanel = document.getElementById('analyticsPanel');
        if (analyticsPanel) analyticsPanel.classList.toggle('active');
    });
    
    document.getElementById('closeAnalytics')?.addEventListener('click', () => {
        document.getElementById('analyticsPanel')?.classList.remove('active');
    });
    
    // Welcome generate
    document.getElementById('welcomeGenerateBtn')?.addEventListener('click', () => openModal('wizardModal'));
    document.getElementById('quickGenerate')?.addEventListener('click', () => openModal('wizardModal'));
    
    // Random recipe
    document.getElementById('randomRecipe')?.addEventListener('click', () => {
        const randomIngredients = QUICK_INGREDIENTS.sort(() => 0.5 - Math.random()).slice(0, 3).join(', ');
        generateRecipe(randomIngredients, null, {
            spice: Math.floor(Math.random() * 5) + 1,
            servings: [1, 2, 4, 6, 8][Math.floor(Math.random() * 5)],
            time: Math.floor(Math.random() * 4) + 1,
            language: 'English',
            depth: ['quick', 'standard', 'detailed', 'gourmet'][Math.floor(Math.random() * 4)]
        });
    });
    
    // Sidebar nav buttons
    document.getElementById('navGenerateBtn')?.addEventListener('click', () => { openModal('wizardModal'); if (window.innerWidth <= 1024) closeSidebar(); });
    document.getElementById('navSurpriseBtn')?.addEventListener('click', () => { document.getElementById('randomRecipe')?.click(); if (window.innerWidth <= 1024) closeSidebar(); });
    document.getElementById('navHistoryBtn')?.addEventListener('click', () => { renderHistory(); openModal('historyModal'); if (window.innerWidth <= 1024) closeSidebar(); });
    document.getElementById('navSavedBtn')?.addEventListener('click', () => { renderSavedRecipes(); if (window.innerWidth <= 1024) closeSidebar(); });
    document.getElementById('navAnalyticsBtn')?.addEventListener('click', () => { renderAnalytics(); document.getElementById('analyticsPanel')?.classList.add('active'); if (window.innerWidth <= 1024) closeSidebar(); });
    document.getElementById('navSettingsBtn')?.addEventListener('click', () => { initSettings(); openModal('settingsModal'); if (window.innerWidth <= 1024) closeSidebar(); });
    
    // User profile click -> settings
    document.getElementById('userAvatar')?.addEventListener('click', () => { initSettings(); openModal('settingsModal'); });
    
    // Modal close buttons
    document.getElementById('wizardCloseBtn')?.addEventListener('click', () => closeModal('wizardModal'));
    document.getElementById('historyClose')?.addEventListener('click', () => closeModal('historyModal'));
    document.getElementById('settingsClose')?.addEventListener('click', () => closeModal('settingsModal'));
    document.getElementById('pdfClose')?.addEventListener('click', () => closeModal('pdfModal'));
    document.getElementById('confirmClose')?.addEventListener('click', () => closeModal('confirmModal'));
    document.getElementById('confirmCancel')?.addEventListener('click', () => closeModal('confirmModal'));
    
    // Header search -> wizard
    document.getElementById('headerSearchInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = e.target.value.trim();
            if (val) {
                openModal('wizardModal');
                setTimeout(() => {
                    const textInput = document.getElementById('textInput');
                    if (textInput) {
                        textInput.value = val;
                        textInput.dispatchEvent(new Event('input'));
                    }
                }, 100);
                e.target.value = '';
            }
        }
    });
}

// ============================================
// SETTINGS
// ============================================

function initSettings() {
    const usernameSetting = document.getElementById('usernameSetting');
    const avatarOptions = document.getElementById('avatarOptions');
    const themeSetting = document.getElementById('themeSetting');
    const defaultLanguageSetting = document.getElementById('defaultLanguageSetting');
    const defaultServingsSetting = document.getElementById('defaultServingsSetting');
    const exportData = document.getElementById('exportData');
    const importDataBtn = document.getElementById('importDataBtn');
    const importData = document.getElementById('importData');
    const resetData = document.getElementById('resetData');
    
    if (usernameSetting) usernameSetting.value = state.user.name;
    if (themeSetting) themeSetting.value = state.settings.theme;
    if (defaultLanguageSetting) defaultLanguageSetting.value = state.settings.defaultLanguage;
    if (defaultServingsSetting) defaultServingsSetting.value = state.settings.defaultServings.toString();
    
    if (avatarOptions) {
        avatarOptions.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.avatar === state.user.avatar);
            opt.addEventListener('click', () => {
                avatarOptions.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                state.user.avatar = opt.dataset.avatar;
                saveState();
                updateUserStats();
            });
        });
    }
    
    if (usernameSetting) {
        usernameSetting.addEventListener('change', () => {
            state.user.name = usernameSetting.value || 'Guest';
            saveState();
            updateUserStats();
        });
    }
    
    if (themeSetting) {
        themeSetting.addEventListener('change', () => {
            state.settings.theme = themeSetting.value;
            saveState();
            applyTheme();
        });
    }
    
    if (defaultLanguageSetting) {
        defaultLanguageSetting.addEventListener('change', () => {
            state.settings.defaultLanguage = defaultLanguageSetting.value;
            saveState();
        });
    }
    
    if (defaultServingsSetting) {
        defaultServingsSetting.addEventListener('change', () => {
            state.settings.defaultServings = parseInt(defaultServingsSetting.value);
            saveState();
        });
    }
    
    if (exportData) {
        exportData.addEventListener('click', () => {
            const data = { user: state.user, settings: state.settings, history: state.history, savedRecipes: state.savedRecipes, exportedAt: new Date().toISOString(), version: ROUXMIND.VERSION };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rouxmind-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Data exported!', 'success', '📥');
        });
    }
    
    if (importDataBtn && importData) {
        importDataBtn.addEventListener('click', () => importData.click());
        importData.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.version && data.user && data.history) {
                        state.user = { ...state.user, ...data.user };
                        state.settings = { ...state.settings, ...data.settings };
                        state.history = data.history || [];
                        state.savedRecipes = data.savedRecipes || [];
                        saveState();
                        updateUserStats();
                        updateAnalytics();
                        renderHistory();
                        renderSavedRecipes();
                        showToast('Data imported!', 'success', '📤');
                    } else {
                        showToast('Invalid data file', 'error');
                    }
                } catch (err) {
                    showToast('Could not import data', 'error');
                }
            };
            reader.readAsText(file);
            importData.value = '';
        });
    }
    
    if (resetData) {
        resetData.addEventListener('click', () => {
            showConfirmation('Reset All Data', 'This will delete all your recipes, history, settings, and XP. This cannot be undone.', () => {
                Object.keys(localStorage).filter(k => k.startsWith('rouxmind_')).forEach(k => localStorage.removeItem(k));
                window.location.reload();
            });
        });
    }
}

// ============================================
// HISTORY FILTERS
// ============================================

function initHistoryFilters() {
    const historySearch = document.getElementById('historySearch');
    const historyFilter = document.getElementById('historyFilter');
    const clearHistoryBtn = document.getElementById('clearHistory');
    
    if (historySearch) {
        historySearch.addEventListener('input', () => {
            renderHistory(historyFilter?.value || 'all', historySearch.value);
        });
    }
    
    if (historyFilter) {
        historyFilter.addEventListener('change', () => {
            renderHistory(historyFilter.value, historySearch?.value || '');
        });
    }
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            showConfirmation('Clear History', 'Are you sure you want to clear all recipe history?', clearHistory);
        });
    }
}

// ============================================
// MODAL OVERLAY CLICK-TO-CLOSE (FIXED)
// ============================================

function initModalOverlays() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            // Only close if clicking directly on the overlay, not the modal itself
            if (e.target === overlay) {
                closeModal(overlay.id);
            }
        });
    });
}

// ============================================
// BACK TO TOP
// ============================================

function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    const outArea = document.getElementById('outArea');
    
    if (backToTop && outArea) {
        outArea.addEventListener('scroll', throttle(() => {
            if (outArea.scrollTop > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }, 100));
        
        backToTop.addEventListener('click', () => {
            outArea.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ============================================
// PARTICLES
// ============================================

function initParticles() {
    const particles = document.getElementById('particles');
    if (!particles) return;
    
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            width: ${Math.random() * 4 + 2}px;
            height: ${Math.random() * 4 + 2}px;
            animation-delay: ${Math.random() * 5}s;
            animation-duration: ${Math.random() * 10 + 10}s;
        `;
        particles.appendChild(particle);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    // Apply theme
    applyTheme();
    
    // Load state
    loadState();
    
    // Update user stats
    updateUserStats();
    updateAnalytics();
    
    // Render history & saved recipes
    renderHistory();
    renderSavedRecipes();
    
    // Initialize sidebar (FIXED)
    initSidebar();
    
    // Initialize all features
    initWizard();
    initCamera();
    initVoice();
    initTextInput();
    initUpload();
    initSmartInput();
    initPreferences();
    initDirectInputs();
    initRecipeActions();
    initPdfGeneration();
    initKeyboardShortcuts();
    initNavActions();
    initSettings();
    initHistoryFilters();
    initModalOverlays();
    initBackToTop();
    initParticles();
    
    // Hide loading
    setTimeout(() => {
        const loading = document.getElementById('dashboardLoading');
        if (loading) loading.classList.add('hidden');
    }, 600);
    
    console.log(`%c✨ ${ROUXMIND.BRAND} v${ROUXMIND.VERSION}`, 'color: #d4af37; font-size: 20px; font-weight: bold;');
    console.log(`%c👨‍💻 Developer: ${ROUXMIND.DEVELOPER}`, 'color: #8899aa; font-size: 12px;');
    console.log(`%c🌐 Website: ${ROUXMIND.DEVSITE}`, 'color: #8899aa; font-size: 12px;');
    console.log(`%c⚡ Powered by: Mesh API (${ROUXMIND.HACKATHON_URL})`, 'color: #00ff88; font-size: 12px;');
}

// Run initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.RouxMind = { state, generateRecipe, addXP, saveRecipe: saveRecipeAction, showToast, openModal, closeModal };
