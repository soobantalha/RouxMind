/**
 * ============================================
 * ROUXMIND - Ultra-Premium AI Recipe Generator
 * World's Most Advanced AI Recipe Generator
 * Where Every Plate Tells Your Story
 * ============================================
 * 
 * Built by Sooban Talha Tech
 * Founder: Sooban Talha
 * Website: soobantalhatech.xyz
 * App URL: rouxmind.vercel.app
 * Hackathon: Mesh API Hackathon 2026 (meshapi.ai)
 * 
 * Frontend Features:
 * - SSE Streaming Client for real-time recipe generation
 * - 5 Input Methods: Camera, Voice, Text, Upload, Smart
 * - User System: XP, Streaks, Ranks, Local Storage
 * - History & Saved Recipes Management
 * - PDF Generation with jsPDF
 * - Analytics Dashboard
 * - Ultra-Premium Animations & Interactions
 * - Keyboard Shortcuts
 * - Theme Toggle (Dark/Light)
 * - Responsive Design
 * - Toast Notifications
 * - Modal System
 * - Form Validation
 * - Error Handling
 * ============================================
 */

// ============================================
// GLOBAL CONSTANTS & CONFIGURATION
// ============================================

const ROUXMIND = {
    BRAND: 'RouxMind',
    VERSION: '3.0.0',
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
    return RANK_SYSTEM.find(rank => xp >= rank.min && xp <= rank.max) || RANK_SYSTEM[RANK_SYSTEM.length - 1];
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
    // User data
    user: {
        name: localStorage.getItem('rouxmind_user_name') || 'Guest',
        avatar: localStorage.getItem('rouxmind_user_avatar') || '👤',
        xp: parseInt(localStorage.getItem('rouxmind_user_xp') || '0'),
        streak: parseInt(localStorage.getItem('rouxmind_user_streak') || '0'),
        totalRecipes: parseInt(localStorage.getItem('rouxmind_user_totalRecipes') || '0'),
        lastActive: localStorage.getItem('rouxmind_user_lastActive') || null,
        sessions: parseInt(localStorage.getItem('rouxmind_user_sessions') || '0')
    },
    
    // Settings
    settings: {
        theme: localStorage.getItem('rouxmind_theme') || 'system',
        defaultLanguage: localStorage.getItem('rouxmind_defaultLanguage') || 'English',
        defaultServings: parseInt(localStorage.getItem('rouxmind_defaultServings') || '4')
    },
    
    // Current recipe
    currentRecipe: {
        ingredients: '',
        dish: '',
        recipe: '',
        options: {
            spice: 3,
            servings: 4,
            time: 2,
            language: 'English',
            depth: 'standard'
        },
        metadata: {
            tokens: 0,
            cost: 0,
            responseTime: 0,
            model: '',
            generatedAt: null,
            requestId: null
        }
    },
    
    // History
    history: JSON.parse(localStorage.getItem('rouxmind_history') || '[]'),
    savedRecipes: JSON.parse(localStorage.getItem('rouxmind_savedRecipes') || '[]'),
    
    // Analytics
    analytics: {
        totalRecipes: 0,
        successCount: 0,
        failureCount: 0,
        totalCost: 0,
        totalTokens: 0,
        totalResponseTime: 0,
        modelUsage: {},
        spicePreferences: {},
        timePreferences: {},
        languagePreferences: {},
        depthPreferences: {},
        topDishes: {},
        dailyStats: {}
    },
    
    // UI State
    ui: {
        currentInputMethod: 'text',
        wizardStep: 1,
        isGenerating: false,
        isStreaming: false,
        currentStream: '',
        cameraStream: null,
        isRecording: false,
        recognition: null,
        abortController: null
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
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatCost(cost) {
    return `$${cost.toFixed(4)}`;
}

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
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
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

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function saveState() {
    localStorage.setItem('rouxmind_user_name', state.user.name);
    localStorage.setItem('rouxmind_user_avatar', state.user.avatar);
    localStorage.setItem('rouxmind_user_xp', state.user.xp.toString());
    localStorage.setItem('rouxmind_user_streak', state.user.streak.toString());
    localStorage.setItem('rouxmind_user_totalRecipes', state.user.totalRecipes.toString());
    localStorage.setItem('rouxmind_user_lastActive', state.user.lastActive);
    localStorage.setItem('rouxmind_user_sessions', state.user.sessions.toString());
    
    localStorage.setItem('rouxmind_theme', state.settings.theme);
    localStorage.setItem('rouxmind_defaultLanguage', state.settings.defaultLanguage);
    localStorage.setItem('rouxmind_defaultServings', state.settings.defaultServings.toString());
    
    localStorage.setItem('rouxmind_history', JSON.stringify(state.history));
    localStorage.setItem('rouxmind_savedRecipes', JSON.stringify(state.savedRecipes));
}

function loadState() {
    // Already loaded in initial state
    // Update analytics from history
    updateAnalytics();
}

// ============================================
// XP & STREAK SYSTEM
// ============================================

function addXP(amount = 10) {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = state.user.lastActive;
    
    // Check if streak should be reset
    if (lastActive && lastActive !== today) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diff = todayDate - lastDate;
        
        // Reset streak if more than 1 day gap
        if (diff > 86400000 * 1.5) { // 36 hours
            state.user.streak = 0;
        }
    }
    
    // Update streak
    if (lastActive !== today) {
        state.user.streak += 1;
        state.user.lastActive = today;
    }
    
    // Add XP
    state.user.xp += amount;
    state.user.totalRecipes++;
    state.user.sessions++;
    
    // Save state
    saveState();
    
    // Update UI
    updateUserStats();
    
    // Show level up notification
    const rank = getRank(state.user.xp);
    showToast(`+${amount} XP!`, 'success', rank.icon);
}

function updateUserStats() {
    const rank = getRank(state.user.xp);
    
    // Update nav stats
    const streakEl = document.getElementById('streakStat');
    const recipesEl = document.getElementById('recipesStat');
    const xpEl = document.getElementById('xpStat');
    
    if (streakEl) {
        streakEl.querySelector('.stat-value').textContent = state.user.streak;
    }
    if (recipesEl) {
        recipesEl.querySelector('.stat-value').textContent = state.user.totalRecipes;
    }
    if (xpEl) {
        xpEl.querySelector('.stat-value').textContent = state.user.xp;
    }
    
    // Update sidebar stats
    const sidebarTotal = document.getElementById('sidebarTotalRecipes');
    const sidebarStreak = document.getElementById('sidebarStreak');
    const sidebarRank = document.getElementById('sidebarRank');
    
    if (sidebarTotal) sidebarTotal.textContent = state.user.totalRecipes;
    if (sidebarStreak) sidebarStreak.textContent = state.user.streak;
    if (sidebarRank) {
        sidebarRank.innerHTML = `${rank.icon} ${rank.name}`;
        sidebarRank.style.color = rank.color;
    }
    
    // Update user avatar
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    
    if (userNameDisplay) userNameDisplay.textContent = state.user.name;
    if (userAvatar) {
        userAvatar.querySelector('.avatar-icon').textContent = state.user.avatar;
    }
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
        modelUsage: {},
        spicePreferences: {},
        timePreferences: {},
        languagePreferences: {},
        depthPreferences: {},
        topDishes: {},
        dailyStats: {}
    };
    
    // Process each history item
    state.history.forEach(item => {
        // Model usage
        const model = item.model || 'unknown';
        analytics.modelUsage[model] = (analytics.modelUsage[model] || 0) + 1;
        
        // Spice preferences
        const spice = item.spice || 3;
        analytics.spicePreferences[spice] = (analytics.spicePreferences[spice] || 0) + 1;
        
        // Time preferences
        const time = item.time || 2;
        analytics.timePreferences[time] = (analytics.timePreferences[time] || 0) + 1;
        
        // Language preferences
        const lang = item.language || 'English';
        analytics.languagePreferences[lang] = (analytics.languagePreferences[lang] || 0) + 1;
        
        // Depth preferences
        const depth = item.depth || 'standard';
        analytics.depthPreferences[depth] = (analytics.depthPreferences[depth] || 0) + 1;
        
        // Top dishes
        if (item.dish) {
            const dish = item.dish.toLowerCase();
            analytics.topDishes[dish] = (analytics.topDishes[dish] || 0) + 1;
        }
        
        // Daily stats
        if (item.generatedAt) {
            const date = new Date(item.generatedAt).toISOString().split('T')[0];
            analytics.dailyStats[date] = (analytics.dailyStats[date] || 0) + 1;
        }
    });
    
    state.analytics = analytics;
    saveState();
}

function renderAnalytics() {
    const analyticsTotal = document.getElementById('analyticsTotal');
    const analyticsSuccess = document.getElementById('analyticsSuccess');
    const analyticsCost = document.getElementById('analyticsCost');
    const analyticsTime = document.getElementById('analyticsTime');
    const modelUsageChart = document.getElementById('modelUsageChart');
    const topDishes = document.getElementById('topDishes');
    
    if (analyticsTotal) {
        analyticsTotal.textContent = formatNumber(state.analytics.totalRecipes);
    }
    
    if (analyticsSuccess) {
        const successRate = state.analytics.totalRecipes > 0 
            ? Math.round((state.analytics.successCount / state.analytics.totalRecipes) * 100)
            : 0;
        analyticsSuccess.textContent = `${successRate}%`;
    }
    
    if (analyticsCost) {
        const avgCost = state.analytics.totalRecipes > 0
            ? state.analytics.totalCost / state.analytics.totalRecipes
            : 0;
        analyticsCost.textContent = formatCost(avgCost);
    }
    
    if (analyticsTime) {
        const avgTime = state.analytics.totalRecipes > 0
            ? state.analytics.totalResponseTime / state.analytics.totalRecipes
            : 0;
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
                <div class="chart-bar-fill" style="--width: ${(count / maxCount) * 100}%">
                    <span style="width: var(--width)"></span>
                </div>
                <span class="chart-bar-value">${count}</span>
            `;
            modelUsageChart.appendChild(bar);
        });
    }
    
    // Top dishes
    if (topDishes) {
        topDishes.innerHTML = '';
        const dishes = Object.entries(state.analytics.topDishes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
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
    state.history.unshift({
        ...item,
        id: generateId(),
        createdAt: new Date().toISOString()
    });
    
    // Keep only last 100 items
    if (state.history.length > 100) {
        state.history = state.history.slice(0, 100);
    }
    
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
    
    // Apply filter
    if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(item => 
            item.createdAt && item.createdAt.startsWith(today)
        );
    } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];
        filtered = filtered.filter(item => 
            item.createdAt && item.createdAt >= weekAgoStr
        );
    } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const monthAgoStr = monthAgo.toISOString().split('T')[0];
        filtered = filtered.filter(item => 
            item.createdAt && item.createdAt >= monthAgoStr
        );
    }
    
    // Apply search
    if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(item => 
            (item.dish && item.dish.toLowerCase().includes(searchLower)) ||
            (item.ingredients && item.ingredients.toLowerCase().includes(searchLower)) ||
            (item.recipe && item.recipe.toLowerCase().includes(searchLower))
        );
    }
    
    // Render
    if (filtered.length === 0) {
        historyList.innerHTML = '<p class="empty-state">No recipes found</p>';
        return;
    }
    
    historyList.innerHTML = filtered.map(item => `
        <div class="history-item" data-id="${item.id}" data-recipe='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
            <div class="item-header">
                <span class="item-title">${truncate(item.dish || 'Untitled Recipe', 30)}</span>
                <span class="item-date">${formatDate(item.createdAt)}</span>
            </div>
            <p class="item-preview">${truncate(item.recipe || item.ingredients || '', 100)}</p>
        </div>
    `).join('');
    
    // Add click handlers
    historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const recipeData = JSON.parse(item.dataset.recipe);
            loadRecipe(recipeData);
            closeModal('historyModal');
        });
    });
}

// ============================================
// SAVED RECIPES
// ============================================

function saveRecipe(recipeData) {
    // Check if already saved
    const exists = state.savedRecipes.some(r => r.id === recipeData.id);
    if (exists) {
        showToast('Already saved!', 'warning');
        return;
    }
    
    state.savedRecipes.unshift({
        ...recipeData,
        id: recipeData.id || generateId(),
        savedAt: new Date().toISOString()
    });
    
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
    
    savedList.innerHTML = state.savedRecipes.slice(0, 5).map(recipe => `
        <div class="saved-item" data-id="${recipe.id}" data-recipe='${JSON.stringify(recipe).replace(/'/g, "&apos;")}'>
            <span class="item-icon">⭐</span>
            <span class="item-title">${truncate(recipe.dish || 'Untitled Recipe', 25)}</span>
            <span class="item-time">${formatDate(recipe.savedAt)}</span>
        </div>
    `).join('');
    
    // Add click handlers
    savedList.querySelectorAll('.saved-item').forEach(item => {
        item.addEventListener('click', () => {
            const recipeData = JSON.parse(item.dataset.recipe);
            loadRecipe(recipeData);
        });
    });
}

// ============================================
// RECIPE LOADING
// ============================================

function loadRecipe(recipeData) {
    state.currentRecipe = {
        ingredients: recipeData.ingredients || recipeData.topic || '',
        dish: recipeData.dish || 'Untitled Recipe',
        recipe: recipeData.recipe || recipeData.ultra_long_notes || '',
        options: {
            spice: recipeData.spice || 3,
            servings: recipeData.servings || 4,
            time: recipeData.time || 2,
            language: recipeData.language || 'English',
            depth: recipeData.depth || 'standard'
        },
        metadata: {
            tokens: recipeData.tokens || 0,
            cost: recipeData.cost || 0,
            responseTime: recipeData.responseTime || 0,
            model: recipeData.model || '',
            generatedAt: recipeData.generatedAt || recipeData.timestamp || null,
            requestId: recipeData.requestId || null
        }
    };
    
    // Update UI
    renderRecipe();
    
    // Show recipe area
    const recipeArea = document.getElementById('recipeArea');
    const welcomeSection = document.getElementById('welcomeSection');
    const inputMethods = document.getElementById('inputMethods');
    
    if (recipeArea) recipeArea.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (inputMethods) inputMethods.style.display = 'none';
    
    // Scroll to recipe
    if (recipeArea) {
        recipeArea.scrollIntoView({ behavior: 'smooth' });
    }
}

function renderRecipe() {
    const recipeTitle = document.getElementById('recipeTitle');
    const recipeBadges = document.getElementById('recipeBadges');
    const recipeContent = document.getElementById('recipeContent');
    
    if (recipeTitle) {
        recipeTitle.textContent = state.currentRecipe.dish;
    }
    
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
        // Render markdown
        if (typeof marked !== 'undefined') {
            recipeContent.innerHTML = marked.parse(state.currentRecipe.recipe);
        } else {
            recipeContent.innerHTML = `<pre>${state.currentRecipe.recipe}</pre>`;
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
    
    // Update theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = theme === 'dark' ? '☀️' : theme === 'light' ? '🌙' : '🌓';
        themeToggle.querySelector('.action-icon').textContent = icon;
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

function showToast(message, type = 'info', icon = 'ℹ️') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon || icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    });
}

// ============================================
// MODAL SYSTEM
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
        document.body.style.overflow = '';
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

// Close all modals on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            closeModal(modal.id);
        });
    }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
        closeModal(overlay.parentElement.id);
    });
});

// ============================================
// WIZARD SYSTEM
// ============================================

function initWizard() {
    const wizard = document.getElementById('recipeWizard');
    const steps = wizard.querySelectorAll('.wizard-step');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const generateBtn = document.getElementById('generateBtn');
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressLines = document.querySelectorAll('.progress-line');
    
    let currentStep = 0;
    
    function updateWizardStep(step) {
        currentStep = step;
        
        // Update step visibility
        steps.forEach((s, i) => {
            s.classList.toggle('active', i === step);
        });
        
        // Update progress
        progressSteps.forEach((s, i) => {
            s.classList.remove('active', 'completed');
            if (i === step) {
                s.classList.add('active');
            } else if (i < step) {
                s.classList.add('completed');
            }
        });
        
        progressLines.forEach((line, i) => {
            line.classList.toggle('active', i < step);
        });
        
        // Update buttons
        prevBtn.style.display = step > 0 ? 'flex' : 'none';
        nextBtn.style.display = step < steps.length - 1 ? 'flex' : 'none';
        generateBtn.style.display = step === steps.length - 1 ? 'flex' : 'none';
        
        // Update review on step 3
        if (step === 2) {
            updateReview();
        }
    }
    
    function updateReview() {
        const reviewIngredients = document.getElementById('reviewIngredients');
        const reviewSpice = document.getElementById('reviewSpice');
        const reviewServings = document.getElementById('reviewServings');
        const reviewTime = document.getElementById('reviewTime');
        const reviewLanguage = document.getElementById('reviewLanguage');
        const reviewDepth = document.getElementById('reviewDepth');
        
        // Get current input
        let ingredients = '';
        const activePanel = document.querySelector('.input-panel.active');
        if (activePanel) {
            const panelId = activePanel.dataset.panel;
            if (panelId === 'camera') {
                const thumbnail = document.getElementById('cameraThumbnail');
                if (thumbnail && thumbnail.style.display !== 'none') {
                    ingredients = 'Image captured';
                }
            } else if (panelId === 'voice') {
                const transcript = document.getElementById('voiceTranscript');
                ingredients = transcript.textContent.replace('Your voice input will appear here...', '').trim();
            } else if (panelId === 'text') {
                const textInput = document.getElementById('textInput');
                ingredients = textInput.value.trim();
            } else if (panelId === 'upload') {
                const preview = document.getElementById('uploadPreview');
                if (preview && preview.style.display !== 'none') {
                    ingredients = 'Image uploaded';
                }
            } else if (panelId === 'smart') {
                const smartInput = document.getElementById('smartInput');
                ingredients = smartInput.value.trim();
            }
        }
        
        if (reviewIngredients) {
            reviewIngredients.textContent = ingredients || 'Not set';
        }
        
        // Get preferences
        const spiceSlider = document.getElementById('spiceSlider');
        const spiceValue = document.getElementById('spiceValue');
        const servingsGrid = document.getElementById('servingsGrid');
        const timeButtons = document.getElementById('timeButtons');
        const languageSelect = document.getElementById('languageSelect');
        const depthSelect = document.getElementById('depthSelect');
        
        if (reviewSpice && spiceValue) {
            reviewSpice.textContent = `Spice: ${spiceValue.textContent}`;
        }
        
        if (reviewServings && servingsGrid) {
            const activeServing = servingsGrid.querySelector('.serving-btn.active');
            reviewServings.textContent = `Servings: ${activeServing ? activeServing.dataset.servings : '4'}`;
        }
        
        if (reviewTime && timeButtons) {
            const activeTime = timeButtons.querySelector('.time-btn.active');
            reviewTime.textContent = `Time: ${activeTime ? activeTime.textContent : 'Medium'}`;
        }
        
        if (reviewLanguage && languageSelect) {
            reviewLanguage.textContent = `Language: ${languageSelect.value}`;
        }
        
        if (reviewDepth && depthSelect) {
            reviewDepth.textContent = `Depth: ${depthSelect.options[depthSelect.selectedIndex].text}`;
        }
    }
    
    // Navigation
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            updateWizardStep(currentStep - 1);
        }
    });
    
    nextBtn.addEventListener('click', () => {
        if (currentStep < steps.length - 1) {
            // Validate step 1
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
                        hasInput = transcript.textContent.trim() !== 'Your voice input will appear here...';
                    } else if (panelId === 'text') {
                        const textInput = document.getElementById('textInput');
                        hasInput = textInput.value.trim().length > 0;
                    } else if (panelId === 'upload') {
                        const preview = document.getElementById('uploadPreview');
                        hasInput = preview && preview.style.display !== 'none';
                    } else if (panelId === 'smart') {
                        const smartInput = document.getElementById('smartInput');
                        hasInput = smartInput.value.trim().length > 0;
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
    
    generateBtn.addEventListener('click', () => {
        generateRecipeFromWizard();
    });
    
    // Initialize
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
// INPUT HANDLERS
// ============================================

// Camera
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
    
    if (startCamera) {
        startCamera.addEventListener('click', async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' },
                    audio: false
                });
                
                cameraVideo.srcObject = stream;
                cameraOverlay.style.display = 'none';
                cameraControls.style.display = 'flex';
                
                // Stop previous stream
                if (state.ui.cameraStream) {
                    state.ui.cameraStream.getTracks().forEach(track => track.stop());
                }
                state.ui.cameraStream = stream;
                
            } catch (err) {
                console.error('Camera error:', err);
                showToast('Could not access camera. Please check permissions.', 'error');
            }
        });
    }
    
    if (captureBtn) {
        captureBtn.addEventListener('click', () => {
            cameraCanvas.width = cameraVideo.videoWidth;
            cameraCanvas.height = cameraVideo.videoHeight;
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(cameraVideo, 0, 0);
            
            capturedData = cameraCanvas.toDataURL('image/jpeg', 0.8);
            capturedImage.src = capturedData;
            
            cameraThumbnail.style.display = 'block';
            cameraControls.style.display = 'none';
            
            // Stop stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                stream = null;
            }
        });
    }
    
    if (retakeBtn) {
        retakeBtn.addEventListener('click', async () => {
            cameraThumbnail.style.display = 'none';
            cameraControls.style.display = 'flex';
            capturedData = null;
            
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' },
                    audio: false
                });
                cameraVideo.srcObject = stream;
                state.ui.cameraStream = stream;
            } catch (err) {
                console.error('Camera error:', err);
            }
        });
    }
    
    if (usePhotoBtn) {
        usePhotoBtn.addEventListener('click', () => {
            if (capturedData) {
                state.currentRecipe.ingredients = capturedData;
                cameraThumbnail.style.display = 'none';
                showToast('Photo selected', 'success', '📸');
            } else {
                showToast('Please capture a photo first', 'warning');
            }
        });
    }
    
    if (removeThumbnail) {
        removeThumbnail.addEventListener('click', () => {
            cameraThumbnail.style.display = 'none';
            capturedData = null;
        });
    }
}

// Voice
function initVoice() {
    const startVoice = document.getElementById('startVoice');
    const stopVoice = document.getElementById('stopVoice');
    const voiceTranscript = document.getElementById('voiceTranscript');
    const voiceVisualizer = document.getElementById('voiceVisualizer');
    const voiceWave = document.getElementById('voiceWave');
    
    let recognition = null;
    let isRecording = false;
    
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        if (startVoice) {
            startVoice.style.display = 'none';
            voiceTranscript.innerHTML = '<p style="color: var(--danger);">Voice recognition not supported in your browser</p>';
        }
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
                    stopVoice.style.display = 'flex';
                    voiceVisualizer.classList.add('recording');
                    voiceTranscript.innerHTML = '<p>Listening...</p>';
                    state.ui.isRecording = true;
                } catch (err) {
                    console.error('Voice recognition error:', err);
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
                startVoice.style.display = 'flex';
                stopVoice.style.display = 'none';
                voiceVisualizer.classList.remove('recording');
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
        
        if (finalTranscript) {
            voiceTranscript.innerHTML = `<p>${finalTranscript.trim()}</p>`;
            state.currentRecipe.ingredients = finalTranscript.trim();
        } else if (interimTranscript) {
            voiceTranscript.innerHTML = `<p>${finalTranscript.trim()} <em>${interimTranscript}</em></p>`;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showToast(`Voice recognition error: ${event.error}`, 'error');
        
        isRecording = false;
        startVoice.style.display = 'flex';
        stopVoice.style.display = 'none';
        voiceVisualizer.classList.remove('recording');
        state.ui.isRecording = false;
    };
    
    recognition.onend = () => {
        if (isRecording) {
            // Auto-restart if we want continuous listening
            // recognition.start();
        } else {
            isRecording = false;
            startVoice.style.display = 'flex';
            stopVoice.style.display = 'none';
            voiceVisualizer.classList.remove('recording');
            state.ui.isRecording = false;
        }
    };
}

// Text Input
function initTextInput() {
    const textInput = document.getElementById('textInput');
    const textSuggestions = document.getElementById('textSuggestions');
    const ingredientChips = document.getElementById('ingredientChips');
    
    if (textInput) {
        // Auto-grow textarea
        textInput.addEventListener('input', () => {
            textInput.style.height = 'auto';
            textInput.style.height = textInput.scrollHeight + 'px';
            state.currentRecipe.ingredients = textInput.value.trim();
        });
        
        // Initial height
        textInput.style.height = textInput.scrollHeight + 'px';
        
        // Smart suggestions
        textInput.addEventListener('input', debounce(() => {
            const value = textInput.value.trim().toLowerCase();
            if (value.length < 2) {
                textSuggestions.innerHTML = '';
                return;
            }
            
            const matches = QUICK_INGREDIENTS.filter(ing => 
                ing.toLowerCase().includes(value)
            );
            
            if (matches.length > 0) {
                textSuggestions.innerHTML = matches.slice(0, 5).map(ing => `
                    <span class="suggestion-tag">${ing}</span>
                `).join('');
                
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
    
    // Quick ingredient chips
    if (ingredientChips) {
        ingredientChips.innerHTML = QUICK_INGREDIENTS.slice(0, 8).map(ing => `
            <span class="ingredient-chip">${ing}</span>
        `).join('');
        
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

// Upload
function initUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const uploadPreview = document.getElementById('uploadPreview');
    const uploadedImage = document.getElementById('uploadedImage');
    const removeUpload = document.getElementById('removeUpload');
    
    if (uploadZone) {
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                handleFileUpload(e.dataTransfer.files[0]);
            }
        });
        
        // Click to browse
        uploadZone.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }
    
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFileUpload(fileInput.files[0]);
            }
        });
    }
    
    if (removeUpload) {
        removeUpload.addEventListener('click', () => {
            uploadPreview.style.display = 'none';
            uploadedImage.src = '';
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
            uploadedImage.src = e.target.result;
            uploadPreview.style.display = 'block';
            state.currentRecipe.ingredients = e.target.result;
            showToast('Image uploaded', 'success', '📁');
        };
        reader.readAsDataURL(file);
    }
}

// Smart Input
function initSmartInput() {
    const smartInput = document.getElementById('smartInput');
    const smartSuggestBtn = document.getElementById('smartSuggestBtn');
    const smartSuggestions = document.getElementById('smartSuggestions');
    
    if (smartSuggestBtn) {
        smartSuggestBtn.addEventListener('click', async () => {
            const input = smartInput.value.trim();
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
                        message: input,
                        action: 'smart-detect',
                        userName: state.user.name,
                        sessionId: generateId()
                    })
                });
                
                const data = await response.json();
                
                if (data.suggestions) {
                    smartSuggestions.innerHTML = `
                        <h4>Suggested Ingredients:</h4>
                        <p style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--space-sm);">
                            ${data.suggestions}
                        </p>
                        <button class="btn btn-primary" id="useSmartSuggestion">
                            <span>Use These Ingredients</span>
                        </button>
                    `;
                    
                    const useBtn = document.getElementById('useSmartSuggestion');
                    if (useBtn) {
                        useBtn.addEventListener('click', () => {
                            smartInput.value = data.suggestions;
                            state.currentRecipe.ingredients = data.suggestions;
                            smartSuggestions.innerHTML = '';
                        });
                    }
                }
            } catch (err) {
                console.error('Smart detect error:', err);
                showToast('Could not get suggestions. Please try again.', 'error');
            } finally {
                smartSuggestBtn.disabled = false;
                smartSuggestBtn.innerHTML = '<span>🎯 Suggest Ingredients</span>';
            }
        });
    }
}

// Preferences
function initPreferences() {
    const spiceSlider = document.getElementById('spiceSlider');
    const spiceValue = document.getElementById('spiceValue');
    const servingsGrid = document.getElementById('servingsGrid');
    const timeButtons = document.getElementById('timeButtons');
    const languageSelect = document.getElementById('languageSelect');
    const depthSelect = document.getElementById('depthSelect');
    
    // Spice slider
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
        
        // Initialize
        spiceValue.textContent = spiceLabels[spiceSlider.value - 1];
    }
    
    // Servings grid
    if (servingsGrid) {
        servingsGrid.querySelectorAll('.serving-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                servingsGrid.querySelectorAll('.serving-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentRecipe.options.servings = parseInt(btn.dataset.servings);
            });
        });
    }
    
    // Time buttons
    if (timeButtons) {
        timeButtons.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                timeButtons.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentRecipe.options.time = parseInt(btn.dataset.time);
            });
        });
    }
    
    // Language select
    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            state.currentRecipe.options.language = languageSelect.value;
        });
    }
    
    // Depth select
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
    
    // Get ingredients based on panel
    if (panelId === 'camera') {
        const capturedImage = document.getElementById('capturedImage');
        if (capturedImage && capturedImage.src && capturedImage.src !== '') {
            imageData = capturedImage.src;
        }
    } else if (panelId === 'voice') {
        const transcript = document.getElementById('voiceTranscript');
        ingredients = transcript.textContent.replace('Your voice input will appear here...', '').trim();
    } else if (panelId === 'text') {
        const textInput = document.getElementById('textInput');
        ingredients = textInput.value.trim();
    } else if (panelId === 'upload') {
        const uploadedImage = document.getElementById('uploadedImage');
        if (uploadedImage && uploadedImage.src && uploadedImage.src !== '') {
            imageData = uploadedImage.src;
        }
    } else if (panelId === 'smart') {
        const smartInput = document.getElementById('smartInput');
        ingredients = smartInput.value.trim();
    }
    
    if (!ingredients && !imageData) {
        showToast('Please provide ingredients or an image', 'warning');
        return;
    }
    
    // Get preferences
    const spiceSlider = document.getElementById('spiceSlider');
    const servingsGrid = document.getElementById('servingsGrid');
    const timeButtons = document.getElementById('timeButtons');
    const languageSelect = document.getElementById('languageSelect');
    const depthSelect = document.getElementById('depthSelect');
    
    const options = {
        spice: parseInt(spiceSlider.value) || 3,
        servings: parseInt(servingsGrid.querySelector('.serving-btn.active')?.dataset.servings || 4),
        time: parseInt(timeButtons.querySelector('.time-btn.active')?.dataset.time || 2),
        language: languageSelect.value || 'English',
        depth: depthSelect.value || 'standard',
        stream: true
    };
    
    // Disable button
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>🔄 Generating...</span>';
    
    // Close wizard
    closeModal('wizardModal');
    
    // Start generation
    await generateRecipe(ingredients, imageData, options);
    
    // Re-enable button
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="btn-icon">🚀</span><span>Generate Recipe</span>';
}

async function generateRecipe(ingredients, imageData = null, options = {}) {
    const recipeArea = document.getElementById('recipeArea');
    const welcomeSection = document.getElementById('welcomeSection');
    const inputMethods = document.getElementById('inputMethods');
    const generationProgress = document.getElementById('generationProgress');
    const streamingOutput = document.getElementById('streamingOutput');
    const streamingContent = document.getElementById('streamingContent');
    const progressFill = document.getElementById('progressFill');
    const progressStages = document.getElementById('progressStages');
    const cancelGeneration = document.getElementById('cancelGeneration');
    
    // Show generation UI
    if (recipeArea) recipeArea.style.display = 'flex';
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (inputMethods) inputMethods.style.display = 'none';
    if (generationProgress) generationProgress.style.display = 'block';
    if (streamingOutput) streamingOutput.style.display = 'block';
    
    // Reset streaming content
    if (streamingContent) streamingContent.textContent = '';
    
    // Set state
    state.ui.isGenerating = true;
    state.ui.isStreaming = true;
    state.ui.currentStream = '';
    
    // Create abort controller
    const abortController = new AbortController();
    state.ui.abortController = abortController;
    
    // Show cancel button
    if (cancelGeneration) cancelGeneration.style.display = 'flex';
    
    // Cancel handler
    if (cancelGeneration) {
        cancelGeneration.onclick = () => {
            abortController.abort();
            state.ui.isGenerating = false;
            state.ui.isStreaming = false;
            
            if (generationProgress) generationProgress.style.display = 'none';
            if (streamingOutput) streamingOutput.style.display = 'none';
            if (cancelGeneration) cancelGeneration.style.display = 'none';
            
            showToast('Generation cancelled', 'warning');
        };
    }
    
    try {
        // Prepare request
        const requestId = generateId();
        const sessionId = generateId();
        
        const requestBody = {
            message: ingredients,
            image: imageData,
            userName: state.user.name,
            sessionId,
            options: {
                spice: options.spice || 3,
                servings: options.servings || 4,
                time: options.time || 2,
                language: options.language || 'English',
                depth: options.depth || 'standard',
                stream: true
            },
            userStats: {
                xp: state.user.xp,
                streak: state.user.streak,
                totalRecipes: state.user.totalRecipes
            }
        };
        
        // Start SSE connection
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
            signal: abortController.signal
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        if (!response.body) {
            throw new Error('No response body');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete messages
            while (buffer.includes('\n\n')) {
                const endIndex = buffer.indexOf('\n\n');
                const message = buffer.slice(0, endIndex);
                buffer = buffer.slice(endIndex + 2);
                
                if (!message) continue;
                
                // Parse SSE event
                const lines = message.split('\n');
                let event = 'message';
                let data = '';
                
                lines.forEach(line => {
                    if (line.startsWith('event: ')) {
                        event = line.slice(7);
                    } else if (line.startsWith('data: ')) {
                        data = line.slice(6);
                    }
                });
                
                // Handle different events
                if (event === 'heartbeat') {
                    // Keep connection alive
                    continue;
                }
                
                if (event === 'stage') {
                    try {
                        const stageData = JSON.parse(data);
                        const stages = progressStages.querySelectorAll('.stage');
                        
                        if (stages[stageData.idx]) {
                            stages.forEach((s, i) => {
                                s.classList.remove('active', 'completed');
                                if (i === stageData.idx) {
                                    s.classList.add('active');
                                } else if (i < stageData.idx) {
                                    s.classList.add('completed');
                                }
                            });
                        }
                        
                        // Update progress bar
                        if (progressFill) {
                            progressFill.style.width = `${((stageData.idx + 1) / 5) * 100}%`;
                        }
                        
                        if (stageData.done) {
                            // Generation complete
                            state.ui.isGenerating = false;
                            state.ui.isStreaming = false;
                        }
                    } catch (e) {
                        console.error('Stage parse error:', e);
                    }
                }
                
                if (event === 'token') {
                    try {
                        const tokenData = JSON.parse(data);
                        if (tokenData.t && streamingContent) {
                            streamingContent.textContent += tokenData.t;
                            state.ui.currentStream += tokenData.t;
                            
                            // Auto-scroll
                            streamingContent.scrollTop = streamingContent.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Token parse error:', e);
                    }
                }
                
                if (event === 'done') {
                    try {
                        const doneData = JSON.parse(data);
                        
                        // Save recipe
                        const recipeData = {
                            id: doneData.requestId || generateId(),
                            dish: doneData.dish || 'Untitled Recipe',
                            recipe: doneData.ultra_long_notes || doneData.recipe || state.ui.currentStream,
                            ingredients: doneData.topic || ingredients,
                            options: {
                                spice: doneData.spice || options.spice || 3,
                                servings: doneData.servings || options.servings || 4,
                                time: doneData.time || options.time || 2,
                                language: doneData.language || options.language || 'English',
                                depth: doneData.depth || options.depth || 'standard'
                            },
                            metadata: {
                                tokens: doneData.tokens || 0,
                                cost: doneData.cost || 0,
                                responseTime: doneData.responseTime || 0,
                                model: doneData.model || '',
                                generatedAt: doneData.generated_at || new Date().toISOString(),
                                requestId: doneData.requestId || requestId
                            },
                            status: doneData.status || 'Success'
                        };
                        
                        // Add to history
                        addToHistory(recipeData);
                        
                        // Load recipe
                        loadRecipe(recipeData);
                        
                        // Add XP
                        addXP(15);
                        
                        // Update analytics
                        updateAnalytics();
                        
                        // Hide generation UI
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
                
                if (event === 'fact') {
                    try {
                        const factData = JSON.parse(data);
                        // Could show as toast or in UI
                        if (factData.fact) {
                            console.log('Fact:', factData.fact);
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
            }
        }
        
    } catch (err) {
        console.error('Generation error:', err);
        
        if (err.name !== 'AbortError') {
            showToast(err.message || 'Generation failed. Please try again.', 'error');
        }
        
        // Reset state
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
    
    if (directCamera) {
        directCamera.addEventListener('click', () => {
            state.ui.currentInputMethod = 'camera';
            openModal('wizardModal');
            document.querySelector('.input-tab[data-tab="camera"]').click();
        });
    }
    
    if (directVoice) {
        directVoice.addEventListener('click', () => {
            state.ui.currentInputMethod = 'voice';
            openModal('wizardModal');
            document.querySelector('.input-tab[data-tab="voice"]').click();
        });
    }
    
    if (directText) {
        directText.addEventListener('click', () => {
            state.ui.currentInputMethod = 'text';
            openModal('wizardModal');
            document.querySelector('.input-tab[data-tab="text"]').click();
        });
    }
    
    if (directUpload) {
        directUpload.addEventListener('click', () => {
            state.ui.currentInputMethod = 'upload';
            openModal('wizardModal');
            document.querySelector('.input-tab[data-tab="upload"]').click();
        });
    }
    
    if (directSmart) {
        directSmart.addEventListener('click', () => {
            state.ui.currentInputMethod = 'smart';
            openModal('wizardModal');
            document.querySelector('.input-tab[data-tab="smart"]').click();
        });
    }
}

// ============================================
// RECIPE ACTIONS
// ============================================

function initRecipeActions() {
    const saveRecipeBtn = document.getElementById('saveRecipeBtn');
    const pdfRecipeBtn = document.getElementById('pdfRecipeBtn');
    const shareRecipeBtn = document.getElementById('shareRecipeBtn');
    const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');
    
    // Save
    if (saveRecipeBtn) {
        saveRecipeBtn.addEventListener('click', () => {
            if (state.currentRecipe.dish) {
                saveRecipe(state.currentRecipe);
            } else {
                showToast('No recipe to save', 'warning');
            }
        });
    }
    
    // PDF
    if (pdfRecipeBtn) {
        pdfRecipeBtn.addEventListener('click', () => {
            openModal('pdfModal');
        });
    }
    
    // Share
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
    
    // Delete
    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', () => {
            showConfirmation(
                'Delete Recipe',
                'Are you sure you want to delete this recipe?',
                () => {
                    state.currentRecipe = {
                        ingredients: '',
                        dish: '',
                        recipe: '',
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
                }
            );
        });
    }
}

// ============================================
// PDF GENERATION
// ============================================

function initPdfGeneration() {
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    const pdfClose = document.getElementById('pdfClose');
    const pdfTheme = document.getElementById('pdfTheme');
    
    if (pdfClose) {
        pdfClose.addEventListener('click', () => {
            closeModal('pdfModal');
        });
    }
    
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async () => {
            if (!state.currentRecipe.recipe) {
                showToast('No recipe to download', 'warning');
                return;
            }
            
            try {
                // Check if jsPDF is loaded
                if (typeof jsPDF !== 'undefined') {
                    generatePdf();
                } else {
                    // Load jsPDF dynamically
                    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                    generatePdf();
                }
            } catch (err) {
                console.error('PDF generation error:', err);
                showToast('PDF generation failed', 'error');
            }
        });
    }
    
    function generatePdf() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const theme = pdfTheme.value;
        const isDark = theme === 'dark';
        
        // Set colors based on theme
        const bgColor = isDark ? [10, 10, 18] : [255, 255, 255];
        const textColor = isDark ? [232, 240, 248] : [26, 26, 37];
        const primaryColor = [0, 212, 255];
        const accentColor = [0, 255, 136];
        
        // Set background
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(0, 0, 210, 297, 'F');
        
        // Set text color
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('RouxMind', 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Where Every Plate Tells Your Story', 105, 38, { align: 'center' });
        
        // Divider
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, 45, 190, 45);
        
        // Recipe title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(state.currentRecipe.dish || 'Untitled Recipe', 105, 60, { align: 'center' });
        
        // Metadata
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const spiceLabel = getSpiceLabel(state.currentRecipe.options.spice);
        const timeLabel = getTimeLabel(state.currentRecipe.options.time);
        
        doc.text(`Spice: ${spiceLabel.label} | Servings: ${state.currentRecipe.options.servings} | Time: ${timeLabel.label}`, 105, 70, { align: 'center' });
        
        // Divider
        doc.line(20, 75, 190, 75);
        
        // Recipe content
        doc.setFontSize(11);
        let y = 85;
        const lineHeight = 7;
        const maxWidth = 170;
        const margin = 20;
        
        // Split recipe into lines
        const lines = doc.splitTextToSize(state.currentRecipe.recipe, maxWidth);
        lines.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 20;
                doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                doc.setFontSize(11);
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });
        
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generated by ${ROUXMIND.BRAND} | Built by ${ROUXMIND.FOUNDER} | ${ROUXMIND.DEVSITE}`, 105, 290, { align: 'center' });
        
        // Save PDF
        doc.save(`${state.currentRecipe.dish || 'recipe'}.pdf`);
        
        closeModal('pdfModal');
        showToast('PDF downloaded!', 'success', '📄');
    }
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
// CONFIRMATION MODAL
// ============================================

function showConfirmation(title, message, onConfirm) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOk = document.getElementById('confirmOk');
    const confirmCancel = document.getElementById('confirmCancel');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    
    // Remove old handlers
    const okClone = confirmOk.cloneNode(true);
    const cancelClone = confirmCancel.cloneNode(true);
    confirmOk.parentNode.replaceChild(okClone, confirmOk);
    confirmCancel.parentNode.replaceChild(cancelClone, confirmCancel);
    
    // Add new handlers
    okClone.addEventListener('click', () => {
        closeModal('confirmModal');
        onConfirm();
    });
    
    cancelClone.addEventListener('click', () => {
        closeModal('confirmModal');
    });
    
    openModal('confirmModal');
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input
        const tagName = document.activeElement.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            // Allow some shortcuts
            if (e.ctrlKey || e.metaKey) {
                // Ctrl+S, Ctrl+P, etc.
                if (e.key === 's') {
                    e.preventDefault();
                    document.getElementById('saveRecipeBtn')?.click();
                }
                if (e.key === 'p') {
                    e.preventDefault();
                    document.getElementById('pdfRecipeBtn')?.click();
                }
                if (e.key === 'n') {
                    e.preventDefault();
                    document.getElementById('newRecipeBtn')?.click();
                }
                if (e.key === 'k') {
                    e.preventDefault();
                    openModal('wizardModal');
                }
                if (e.key === 'h') {
                    e.preventDefault();
                    openModal('historyModal');
                }
            }
            return;
        }
        
        // Ctrl+K or Cmd+K - Open Wizard
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openModal('wizardModal');
        }
        
        // Ctrl+H or Cmd+H - History
        if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
            e.preventDefault();
            openModal('historyModal');
        }
        
        // Ctrl+S or Cmd+S - Save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            document.getElementById('saveRecipeBtn')?.click();
        }
        
        // Ctrl+P or Cmd+P - PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            document.getElementById('pdfRecipeBtn')?.click();
        }
        
        // Ctrl+N or Cmd+N - New Recipe
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            document.getElementById('newRecipeBtn')?.click();
        }
        
        // Enter - Generate (if wizard is open)
        if (e.key === 'Enter' && document.getElementById('wizardModal')?.classList.contains('active')) {
            e.preventDefault();
            document.getElementById('generateBtn')?.click();
        }
    });
}

// ============================================
// NAVIGATION ACTIONS
// ============================================

function initNavActions() {
    const themeToggle = document.getElementById('themeToggle');
    const newRecipeBtn = document.getElementById('newRecipeBtn');
    const historyBtn = document.getElementById('historyBtn');
    const analyticsBtn = document.getElementById('analyticsBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const userAvatar = document.getElementById('userAvatar');
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // New recipe
    if (newRecipeBtn) {
        newRecipeBtn.addEventListener('click', () => {
            openModal('wizardModal');
        });
    }
    
    // History
    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            renderHistory();
            openModal('historyModal');
        });
    }
    
    // Analytics
    if (analyticsBtn) {
        analyticsBtn.addEventListener('click', () => {
            renderAnalytics();
            const analyticsPanel = document.getElementById('analyticsPanel');
            if (analyticsPanel) {
                analyticsPanel.style.display = analyticsPanel.style.display === 'block' ? 'none' : 'block';
            }
        });
    }
    
    // Settings
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            initSettings();
            openModal('settingsModal');
        });
    }
    
    // User avatar
    if (userAvatar) {
        userAvatar.addEventListener('click', () => {
            initSettings();
            openModal('settingsModal');
        });
    }
    
    // Close analytics panel
    const closeAnalytics = document.getElementById('closeAnalytics');
    if (closeAnalytics) {
        closeAnalytics.addEventListener('click', () => {
            const analyticsPanel = document.getElementById('analyticsPanel');
            if (analyticsPanel) {
                analyticsPanel.style.display = 'none';
            }
        });
    }
    
    // History close
    const historyClose = document.getElementById('historyClose');
    if (historyClose) {
        historyClose.addEventListener('click', () => {
            closeModal('historyModal');
        });
    }
    
    // Settings close
    const settingsClose = document.getElementById('settingsClose');
    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            closeModal('settingsModal');
        });
    }
    
    // PDF close
    const pdfClose = document.getElementById('pdfClose');
    if (pdfClose) {
        pdfClose.addEventListener('click', () => {
            closeModal('pdfModal');
        });
    }
    
    // Confirm close
    const confirmClose = document.getElementById('confirmClose');
    if (confirmClose) {
        confirmClose.addEventListener('click', () => {
            closeModal('confirmModal');
        });
    }
    
    // Confirm cancel
    const confirmCancel = document.getElementById('confirmCancel');
    if (confirmCancel) {
        confirmCancel.addEventListener('click', () => {
            closeModal('confirmModal');
        });
    }
    
    // Welcome generate button
    const welcomeGenerateBtn = document.getElementById('welcomeGenerateBtn');
    if (welcomeGenerateBtn) {
        welcomeGenerateBtn.addEventListener('click', () => {
            openModal('wizardModal');
        });
    }
    
    // Quick generate
    const quickGenerate = document.getElementById('quickGenerate');
    if (quickGenerate) {
        quickGenerate.addEventListener('click', () => {
            openModal('wizardModal');
        });
    }
    
    // Random recipe
    const randomRecipe = document.getElementById('randomRecipe');
    if (randomRecipe) {
        randomRecipe.addEventListener('click', () => {
            const randomIngredients = QUICK_INGREDIENTS.sort(() => 0.5 - Math.random()).slice(0, 3).join(', ');
            generateRecipe(randomIngredients, null, {
                spice: Math.floor(Math.random() * 5) + 1,
                servings: [1, 2, 4, 6, 8, 10][Math.floor(Math.random() * 6)],
                time: Math.floor(Math.random() * 4) + 1,
                language: 'English',
                depth: ['quick', 'standard', 'detailed', 'gourmet'][Math.floor(Math.random() * 4)]
            });
        });
    }
    
    // Saved recipes button
    const savedRecipesBtn = document.getElementById('savedRecipes');
    if (savedRecipesBtn) {
        savedRecipesBtn.addEventListener('click', () => {
            renderSavedRecipes();
            // Could open a saved recipes modal or show in sidebar
        });
    }
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
    
    // Initialize form values
    if (usernameSetting) usernameSetting.value = state.user.name;
    if (themeSetting) themeSetting.value = state.settings.theme;
    if (defaultLanguageSetting) defaultLanguageSetting.value = state.settings.defaultLanguage;
    if (defaultServingsSetting) defaultServingsSetting.value = state.settings.defaultServings.toString();
    
    // Avatar options
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
    
    // Username
    if (usernameSetting) {
        usernameSetting.addEventListener('change', () => {
            state.user.name = usernameSetting.value || 'Guest';
            saveState();
            updateUserStats();
        });
    }
    
    // Theme
    if (themeSetting) {
        themeSetting.addEventListener('change', () => {
            state.settings.theme = themeSetting.value;
            saveState();
            applyTheme();
        });
    }
    
    // Default language
    if (defaultLanguageSetting) {
        defaultLanguageSetting.addEventListener('change', () => {
            state.settings.defaultLanguage = defaultLanguageSetting.value;
            saveState();
        });
    }
    
    // Default servings
    if (defaultServingsSetting) {
        defaultServingsSetting.addEventListener('change', () => {
            state.settings.defaultServings = parseInt(defaultServingsSetting.value);
            saveState();
        });
    }
    
    // Export data
    if (exportData) {
        exportData.addEventListener('click', () => {
            const data = {
                user: state.user,
                settings: state.settings,
                history: state.history,
                savedRecipes: state.savedRecipes,
                analytics: state.analytics,
                exportedAt: new Date().toISOString(),
                version: ROUXMIND.VERSION
            };
            
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
    
    // Import data
    if (importDataBtn && importData) {
        importDataBtn.addEventListener('click', () => {
            importData.click();
        });
        
        importData.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Validate
                    if (data.version && data.user && data.history) {
                        // Import user data
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
                    console.error('Import error:', err);
                    showToast('Could not import data', 'error');
                }
            };
            reader.readAsText(file);
            
            // Reset input
            importData.value = '';
        });
    }
    
    // Reset data
    if (resetData) {
        resetData.addEventListener('click', () => {
            showConfirmation(
                'Reset All Data',
                'This will delete all your recipes, history, settings, and XP. This cannot be undone.',
                () => {
                    // Reset to defaults
                    localStorage.removeItem('rouxmind_user_name');
                    localStorage.removeItem('rouxmind_user_avatar');
                    localStorage.removeItem('rouxmind_user_xp');
                    localStorage.removeItem('rouxmind_user_streak');
                    localStorage.removeItem('rouxmind_user_totalRecipes');
                    localStorage.removeItem('rouxmind_user_lastActive');
                    localStorage.removeItem('rouxmind_user_sessions');
                    localStorage.removeItem('rouxmind_theme');
                    localStorage.removeItem('rouxmind_defaultLanguage');
                    localStorage.removeItem('rouxmind_defaultServings');
                    localStorage.removeItem('rouxmind_history');
                    localStorage.removeItem('rouxmind_savedRecipes');
                    
                    // Reload page
                    window.location.reload();
                }
            );
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
            renderHistory(historyFilter.value, historySearch.value);
        });
    }
    
    if (historyFilter) {
        historyFilter.addEventListener('change', () => {
            renderHistory(historyFilter.value, historySearch.value);
        });
    }
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            showConfirmation(
                'Clear History',
                'Are you sure you want to clear all recipe history?',
                clearHistory
            );
        });
    }
}

// ============================================
// BACK TO TOP
// ============================================

function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', throttle(() => {
            if (window.pageYOffset > 300) {
                backToTop.classList.add('show');
            } else {
                backToTop.classList.remove('show');
            }
        }, 100));
        
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ============================================
// SMOOTH SCROLL
// ============================================

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============================================
// AOS-LIKE ANIMATIONS
// ============================================

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('[data-aos]').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// PARTICLES
// ============================================

function initParticles() {
    const particles = document.getElementById('particles');
    if (!particles) return;
    
    for (let i = 0; i < 30; i++) {
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
    
    // Update analytics
    updateAnalytics();
    
    // Render history and saved recipes
    renderHistory();
    renderSavedRecipes();
    
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
    initBackToTop();
    initSmoothScroll();
    initScrollAnimations();
    initParticles();
    
    // Hide loading
    setTimeout(() => {
        const loading = document.getElementById('dashboardLoading');
        if (loading) loading.classList.add('hidden');
    }, 500);
    
    console.log(`%c✨ ${ROUXMIND.BRAND} v${ROUXMIND.VERSION}`, 'color: #00d4ff; font-size: 20px; font-weight: bold;');
    console.log(`%c👨‍💻 Developer: ${ROUXMIND.DEVELOPER}`, 'color: #8899aa; font-size: 12px;');
    console.log(`%c🌐 Website: ${ROUXMIND.DEVSITE}`, 'color: #8899aa; font-size: 12px;');
    console.log(`%c⚡ Powered by: Mesh API (${ROUXMIND.HACKATHON_URL})`, 'color: #00ff88; font-size: 12px;');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.RouxMind = {
    state,
    generateRecipe,
    addXP,
    saveRecipe,
    showToast,
    openModal,
    closeModal
};
