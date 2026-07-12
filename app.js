'use strict';
/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   ROUXMIND v2.0 — app.js — WORLD CLASS ULTIMATE FRONTEND
   Where Every Plate Tells Your Story
   Built by Sooban Talha Tech | soobantalhatech.xyz
   Founder: Sooban Talha

   ═══════════════════════════════════════════════════════════════════════════════════════════════════
   ALL FEATURES:
   ✅ Welcome Screen (First visit) + Returning User Screen
   ✅ Sidebar with Stats (Total Recipes, Streak, Rank, XP)
   ✅ Recipe Wizard (6 steps: Tool, Ingredients, Language, Depth, Spice, Generate)
   ✅ Text Input + Camera + Image Upload
   ✅ SSE Streaming (live recipe generation)
   ✅ Recipe Output with Ingredients, Instructions, Nutrition
   ✅ PDF Download (Dark/Light theme)
   ✅ Copy/Save/Share
   ✅ History (last 60)
   ✅ Saved (up to 120)
   ✅ Settings (Theme, Font, PDF Theme, Language)
   ✅ Google Sheets logging
   ✅ Keyboard shortcuts
   ✅ Demo tour
   ✅ Export/Import data
   ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SECTION 1: CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const ROUXMIND = {
  VERSION: '2.0',
  BRAND: 'RouxMind',
  DEVELOPER: 'Sooban Talha Tech',
  DEVSITE: 'soobantalhatech.xyz',
  WEBSITE: 'rouxmind.vercel.app',
  FOUNDER: 'Sooban Talha',
  TAGLINE: 'Where Every Plate Tells Your Story',
  API_URL: '/api/recipe',
  MAX_HISTORY: 60,
  MAX_SAVED: 120,
  NTFY: 'rouxmind_new_users',
};

const TOOL_CONFIG = {
  recipe: {
    icon: 'fa-utensils',
    label: 'Generate Recipe',
    sfpName: 'Recipe',
    color: '#d4af37',
    placeholder: 'Enter ingredients like: tomatoes, onions, garlic, pasta...',
    sfpLabel: 'Cooking up your delicious recipe…',
    description: 'Turn your ingredients into a mouth-watering recipe with AI.',
  },
};

const DEPTH_CONFIG = {
  quick: { label: 'Quick', desc: '200–400 words', subDesc: 'Fast & simple', icon: 'fa-bolt', words: '200-400' },
  standard: { label: 'Standard', desc: '400–600 words', subDesc: 'Balanced', icon: 'fa-flag', words: '400-600' },
  detailed: { label: 'Detailed', desc: '600–1000 words', subDesc: 'Comprehensive', icon: 'fa-chart-line', words: '600-1000' },
  gourmet: { label: 'Gourmet', desc: '1000–1500 words', subDesc: 'Expert level', icon: 'fa-crown', words: '1000-1500' },
};

const SPICE_CONFIG = {
  1: { label: 'Mild', emoji: '🌶️', desc: 'No heat, beginner-friendly' },
  2: { label: 'Medium', emoji: '🌶️🌶️', desc: 'Gentle warmth' },
  3: { label: 'Spicy', emoji: '🌶️🌶️🌶️', desc: 'Noticeable kick' },
  4: { label: 'Hot', emoji: '🌶️🌶️🌶️🌶️', desc: 'Serious heat' },
  5: { label: 'Indian', emoji: '🌶️🌶️🌶️🌶️🌶️', desc: 'Maximum spice!' },
};

const RANK_CONFIG = [
  { min: 0, label: '🥄 Kitchen Apprentice', emoji: '🥄' },
  { min: 5, label: '🍳 Home Cook', emoji: '🍳' },
  { min: 15, label: '👨‍🍳 Sous Chef', emoji: '👨‍🍳' },
  { min: 30, label: '👩‍🍳 Chef', emoji: '👩‍🍳' },
  { min: 50, label: '🧑‍🍳 Executive Chef', emoji: '🧑‍🍳' },
  { min: 80, label: '⭐ Master Chef', emoji: '⭐' },
  { min: 120, label: '👑 Culinary Legend', emoji: '👑' },
];

const AVATAR_EMOJIS = ['🍳', '👨‍🍳', '🧑‍🍳', '👩‍🍳', '🍽️', '🌟', '🔥', '💎', '🚀', '🎯', '🏆', '💡', '🎨', '🌙', '⭐', '👑'];

const STAGE_MESSAGES = [
  '🎯 Analysing your ingredients…',
  '📝 Planning the recipe…',
  '👨‍🍳 Cooking up the dish…',
  '✨ Adding final touches…',
  '✅ Recipe ready!',
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SECTION 2: MAIN APPLICATION CLASS
// ─────────────────────────────────────────────────────────────────────────────────────────────────

class RouxMindApp {
  constructor() {
    this.tool = 'recipe';
    this.generating = false;
    this.currentData = null;
    this.confirmCb = null;
    this.thinkTimer = null;
    this.stageIdx = 0;
    this.streamCtrl = null;
    this.streamBuffer = '';
    this.focusMode = false;
    this.pdfTheme = 'dark';

    this.totalRecipes = this._loadNum('rm_total_recipes', 0);
    this.streak = this._loadStreak();
    this.sessions = this._loadNum('rm_sessions', 0);
    this.totalWords = this._loadNum('rm_total_words', 0);
    this.xp = this._loadNum('rm_xp', 0);
    this.lastActive = localStorage.getItem('rm_last_active') || null;
    this.avatarEmojiIdx = this._loadNum('rm_avatar_emoji', 0);

    this.wizardStep = 0;
    this.wizardData = {
      tool: 'recipe',
      ingredients: '',
      language: 'English',
      depth: 'standard',
      spice: 3,
      servings: 2,
      time: 2,
    };
    this.wizardFile = null;

    this.demoStep = 0;
    this.demoCanvas = null;
    this.demoTooltip = null;

    this.history = this._load('rm_history', []);
    this.saved = this._load('rm_saved', []);
    this.prefs = this._load('rm_prefs', {});
    this.userName = localStorage.getItem('rm_user') || '';

    this.pdfTheme = this.prefs.pdfTheme || 'dark';
    this.avatarEmojiIdx = this._loadNum('rm_avatar_emoji', 0);

    if (!this.prefs.theme) this.prefs.theme = 'dark';
    if (!this.prefs.fontSize) this.prefs.fontSize = 'small';

    this._incrementSession();
    this._cacheEl();
    this._applyPrefs();
    this._bindAll();
    this._initWelcome();
    this._updateAllStats();
    this._renderSidebarHistory();
    this._renderSidebarSaved();
    this._updateUserUI();
    this._initBackToTop();
    this._initSwipeGestures();
    this._initParticles();
    this._checkStreak();
    this._initDemoSystem();
    this._warmupAndTrack();

    console.log(`%c🍽️ ${ROUXMIND.BRAND} — ${ROUXMIND.TAGLINE}`, 'color:#d4af37;font-size:16px;font-weight:bold');
    console.log(`%c🔧 Built by ${ROUXMIND.DEVELOPER} | ${ROUXMIND.DEVSITE}`, 'color:#00d4ff;font-size:12px');
  }

  // ─── SESSION MANAGEMENT ─────────────────────────────────────────────────────

  _getISTDate() {
    const now = new Date();
    const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
    return ist.toISOString().split('T')[0];
  }

  _getYesterday() {
    const now = new Date();
    const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000 - 86400000);
    return ist.toISOString().split('T')[0];
  }

  _loadSessions() { return this._loadNum('rm_sessions', 0); }
  _saveSessions() { localStorage.setItem('rm_sessions', String(this.sessions)); }

  _incrementSession() {
    this.sessions++;
    this._saveSessions();
    const today = this._getISTDate();
    localStorage.setItem('rm_last_active', today);
    this.lastActive = today;
  }

  _warmupAndTrack() {
    const sessionId = this._genId();
    fetch(ROUXMIND.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'ping',
        userName: this.userName || 'Anonymous',
        sessionId: sessionId,
        options: { stream: false },
      }),
    }).catch(() => {});
    this._currentSessionId = sessionId;
  }

  // ─── STREAK MANAGEMENT ──────────────────────────────────────────────────────

  _loadStreak() {
    try { const s = localStorage.getItem('rm_streak'); if (s) return JSON.parse(s); } catch {}
    return { count: 0, lastDate: null, bestStreak: 0 };
  }

  _saveStreak() { localStorage.setItem('rm_streak', JSON.stringify(this.streak)); }

  _loadNum(key, def) {
    try { const v = localStorage.getItem(key); return v ? parseInt(v, 10) : def; } catch { return def; }
  }

  _saveNum(key, val) { localStorage.setItem(key, String(val)); }

  _checkStreak() {
    const today = this._getISTDate();
    const yesterday = this._getYesterday();
    const lastDate = this.streak.lastDate;

    if (!lastDate) {
      this.streak = { count: 1, lastDate: today, bestStreak: 1 };
      this._saveStreak();
      this._updateAllStats();
      this._toast('success', 'fa-fire', '🔥 Welcome! Your cooking streak starts today!');
      return;
    }

    if (lastDate === today) return;

    if (lastDate === yesterday) {
      this.streak.count++;
      this.streak.lastDate = today;
      if (this.streak.count > this.streak.bestStreak) {
        this.streak.bestStreak = this.streak.count;
        this._toast('success', 'fa-trophy', `🏆 New record! ${this.streak.count}-day streak!`);
        this._confetti();
      }
      if (this.streak.count === 7) { this._toast('success', 'fa-fire', '🔥 7-day streak! You\'re on fire!', 5000); this._confetti(); }
      if (this.streak.count === 30) { this._toast('success', 'fa-crown', '👑 30-day streak! Champion!', 5000); this._confetti(true); }
      if (this.streak.count === 100) { this._toast('success', 'fa-gem', '💎 100-day streak! Legendary!', 6000); this._confetti(true); }
    } else {
      if (this.streak.count > 0) {
        this._toast('info', 'fa-fire-extinguisher', `Your ${this.streak.count}-day streak ended. Start fresh!`);
      }
      this.streak.count = 1;
      this.streak.lastDate = today;
    }

    this._saveStreak();
    this._updateAllStats();
  }

  _confetti(intense = false) {
    if (typeof confetti === 'function') {
      confetti({ particleCount: intense ? 300 : 150, spread: intense ? 100 : 70, origin: { y: 0.6 } });
      if (intense) {
        setTimeout(() => confetti({ particleCount: 200, spread: 80, origin: { y: 0.5, x: 0.3 } }), 200);
        setTimeout(() => confetti({ particleCount: 200, spread: 80, origin: { y: 0.5, x: 0.7 } }), 400);
      }
    }
  }

  // ─── STATS DISPLAY ──────────────────────────────────────────────────────────

  _updateAllStats() {
    const e = this.el;
    const today = this._getISTDate();

    const rank = this._getRank();

    if (e.sidebarStreakValue) e.sidebarStreakValue.textContent = this.streak.count;
    if (e.sidebarBestStreak) e.sidebarBestStreak.textContent = this.streak.bestStreak;
    if (e.sidebarSessionsValue) e.sidebarSessionsValue.textContent = this.sessions;
    if (e.sidebarHistoryValue) e.sidebarHistoryValue.textContent = this.history.length;
    if (e.sidebarSavedValue) e.sidebarSavedValue.textContent = this.saved.length;
    if (e.sidebarWordsValue) e.sidebarWordsValue.textContent = this.totalWords.toLocaleString();
    if (e.sidebarRankValue) e.sidebarRankValue.textContent = rank.emoji + ' ' + rank.label;
    if (e.sidebarXpValue) e.sidebarXpValue.textContent = this.xp;
    if (e.sidebarTotalRecipes) e.sidebarTotalRecipes.textContent = this.totalRecipes;
    if (e.sidebarLastActive) {
      const yesterday = this._getYesterday();
      e.sidebarLastActive.textContent = !this.lastActive ? 'Never'
        : this.lastActive === today ? 'Today'
        : this.lastActive === yesterday ? 'Yesterday'
        : this.lastActive;
    }

    if (e.headerStreak) e.headerStreak.textContent = this.streak.count;
    if (e.statSessions) e.statSessions.textContent = this.sessions;
    if (e.statHistory) e.statHistory.textContent = this.history.length;
    if (e.statSaved) e.statSaved.textContent = this.saved.length;
    if (e.histBadge) e.histBadge.textContent = this.history.length;
  }

  _getRank() {
    for (let i = RANK_CONFIG.length - 1; i >= 0; i--) {
      if (this.totalRecipes >= RANK_CONFIG[i].min) {
        return RANK_CONFIG[i];
      }
    }
    return RANK_CONFIG[0];
  }

  // ─── DOM CACHE ──────────────────────────────────────────────────────────────

  _cacheEl() {
    const g = id => document.getElementById(id);
    this.el = {};
    const IDS = [
      'leftPanel', 'sbToggle', 'sbBackdrop', 'rightPanel', 'outArea', 'outToolbar',
      'resultArea', 'emptyState', 'thinkingWrap', 'backToTopBtn',
      'dashHdr', 'themeBtn', 'themeIcon', 'settingsBtn', 'wizardHeaderBtn', 'megaHeaderBtn',
      'avBtn', 'avDropdown', 'avInitials', 'avDropdownAvatar', 'avDropdownName',
      'avHist', 'avSaved', 'avSettings', 'avClear',
      'statSessions', 'statHistory', 'statSaved', 'headerStreak', 'dhGreeting',
      'copyBtn', 'pdfBtn', 'saveBtn', 'shareBtn', 'clearBtn', 'newWizardBtn', 'focusModeBtn',
      'wizardModal', 'wizardContent', 'histModal', 'savedModal',
      'settingsModal', 'confirmModal', 'confirmMsg', 'confirmOkBtn', 'demoModal', 'demoContent',
      'nameInput', 'saveNameBtn', 'dsStats',
      'exportDataBtn', 'importBackupBtn', 'clearDataBtn',
      'defaultLangSel', 'saveDefaultLangBtn',
      'histList', 'histEmpty', 'histSearchInput', 'clearHistBtn', 'exportHistBtn', 'histBadge',
      'savedList', 'savedEmpty', 'savedCount',
      'welcomeOverlay', 'welcomeBackOverlay', 'welcomeNameInput', 'welcomeBtn', 'welcomeSkip',
      'wbName', 'wbStreak', 'wbSessions', 'wbSaved', 'welcomeBackBtn',
      'navWizard', 'navAll', 'navHistory', 'navSaved', 'navSettings', 'navFocus',
      'demoReplayBtn', 'homeLink', 'dhLogo',
      'sidebarAvatar', 'sidebarUserName', 'sidebarAvatarPicker',
      'sidebarStreakValue', 'sidebarBestStreak', 'sidebarSessionsValue',
      'sidebarWordsValue', 'sidebarHistoryValue', 'sidebarSavedValue', 'sidebarLastActive',
      'sidebarTotalRecipes', 'sidebarRankValue', 'sidebarXpValue',
      'lpHistList', 'lpHistAll', 'lpSavedList', 'lpSavedAll',
      'aboutToggleBtn', 'aboutContent', 'aboutChevron',
      'streamFullpage', 'sfpText', 'sfpScroll', 'sfpToolIcon', 'sfpToolName',
      'sfpTopic', 'sfpLabel', 'sfpFact', 'sscProgressBar',
      'ts0', 'ts1', 'ts2', 'ts3', 'ts4', 'ss0', 'ss1', 'ss2', 'ss3', 'ss4',
      'particleCanvas', 'toastContainer',
    ];
    IDS.forEach(id => { this.el[id] = g(id); });
  }

  // ─── PARTICLES ──────────────────────────────────────────────────────────────

  _initParticles() {
    const canvas = this.el.particleCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    resize();
    const COLORS = ['#d4af37', '#ffae00', '#bf00ff', '#00d4ff', '#00ff88'];
    const pts = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.4,
      a: Math.random() * 0.22,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));
    const animate = () => {
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = p.a;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  _el(id) { return document.getElementById(id); }
  _qs(sel) { return document.querySelector(sel); }
  _qsa(sel) { return document.querySelectorAll(sel); }
  _load(key, def) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } }
  _save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
  _genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  _wordCount(text) { return text?.trim().split(/\s+/).filter(Boolean).length || 0; }
  _esc(s) {
    if (!s) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }
  _relTime(ts) {
    if (!ts) return '';
    const d = Date.now() - ts;
    const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), dy = Math.floor(d / 86400000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (dy < 7) return `${dy}d ago`;
    return new Date(ts).toLocaleDateString();
  }
  _dateGroup(ts) {
    if (!ts) return 'Unknown';
    const dy = Math.floor((Date.now() - ts) / 86400000);
    if (dy === 0) return 'Today';
    if (dy === 1) return 'Yesterday';
    if (dy < 7) return 'This Week';
    if (dy < 30) return 'This Month';
    return 'Older';
  }

  // ─── MARKDOWN RENDERER ──────────────────────────────────────────────────────

  _renderMd(text) {
    if (!text) return '';
    if (window.marked && window.DOMPurify) {
      try {
        if (window.marked.setOptions) {
          window.marked.setOptions({ breaks: true, gfm: true, mangle: false, headerIds: false });
        }
        return DOMPurify.sanitize(window.marked.parse(text));
      } catch (e) { /* fall through */ }
    }
    let h = String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    h = h.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    h = h.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    h = h.replace(/^---+$/gm, '<hr>');
    h = h.replace(/^- (.+)$/gm, '<li class="ul-li">$1</li>');
    h = h.replace(/^(\d+)\. (.+)$/gm, '<li class="ol-li"><span class="ol-num">$1.</span> $2</li>');
    h = h.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    if (!h.startsWith('<')) h = '<p>' + h + '</p>';
    return h;
  }

  _renderMdLive(text) {
    if (!text) return '<span class="typing-cursor">▊</span>';
    return this._renderMd(text) + '<span class="typing-cursor">▊</span>';
  }

  _stripMd(t) {
    if (!t) return '';
    return t
      .replace(/#{1,6} /g, '')
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^[-*] /gm, '')
      .replace(/^\d+\. /gm, '')
      .replace(/^> /gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ─── WELCOME SYSTEM ─────────────────────────────────────────────────────────

  _initWelcome() {
    if (!this.userName) {
      setTimeout(() => {
        if (!this.el.welcomeOverlay) return;
        this.el.welcomeOverlay.style.display = 'flex';
        setTimeout(() => this.el.welcomeOverlay.classList.add('visible'), 60);
        setTimeout(() => this.el.welcomeNameInput?.focus(), 450);
      }, 600);
    } else {
      setTimeout(() => {
        if (!this.el.welcomeBackOverlay) return;
        if (this.el.wbName) this.el.wbName.textContent = this.userName;
        if (this.el.wbStreak) this.el.wbStreak.textContent = this.streak.count;
        if (this.el.wbSessions) this.el.wbSessions.textContent = this.sessions;
        if (this.el.wbSaved) this.el.wbSaved.textContent = this.saved.length;
        this.el.welcomeBackOverlay.style.display = 'flex';
        setTimeout(() => this.el.welcomeBackOverlay.classList.add('visible'), 60);
      }, 700);
    }
  }

  _submitWelcome() {
    const name = this.el.welcomeNameInput?.value?.trim();
    if (!name || name.length < 2) {
      this.el.welcomeNameInput?.classList.add('input-shake');
      setTimeout(() => this.el.welcomeNameInput?.classList.remove('input-shake'), 500);
      return;
    }
    this.userName = name;
    localStorage.setItem('rm_user', name);
    if (!this.streak.lastDate) {
      this.streak = { count: 1, lastDate: this._getISTDate(), bestStreak: 1 };
      this._saveStreak();
    }
    try {
      fetch(`https://ntfy.sh/${ROUXMIND.NTFY}`, {
        method: 'POST',
        body: `New RouxMind user: ${name} — ${new Date().toISOString()}`,
        headers: { 'Title': 'RouxMind New User', 'Priority': '3' },
      }).catch(() => {});
    } catch {}

    this._dismissOverlay('welcomeOverlay');
    this._updateUserUI();
    this._updateAllStats();
    this._warmupAndTrack();
    this._toast('success', 'fa-hand-wave', `Welcome, ${name}! Let's cook something amazing 🍳`);
    setTimeout(() => this._openDemo(), 800);
  }

  _skipWelcome() {
    this.userName = 'Chef';
    localStorage.setItem('rm_user', 'Chef');
    if (!this.streak.lastDate) {
      this.streak = { count: 1, lastDate: this._getISTDate(), bestStreak: 1 };
      this._saveStreak();
    }
    this._dismissOverlay('welcomeOverlay');
    this._updateUserUI();
    this._warmupAndTrack();
  }

  _dismissOverlay(id) {
    const el = this._el(id);
    if (!el) return;
    el.classList.remove('visible');
    el.classList.add('dismissing');
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('dismissing'); }, 460);
  }

  _updateUserUI() {
    const name = this.userName || 'Chef';
    const emoji = AVATAR_EMOJIS[this.avatarEmojiIdx % AVATAR_EMOJIS.length] || '🍳';

    [this.el.avBtn, this.el.avDropdownAvatar, this.el.sidebarAvatar].forEach(el => {
      if (!el) return;
      el.textContent = emoji;
      el.style.background = 'transparent';
      el.style.color = '#ffffff';
      el.style.fontSize = '1.3rem';
      el.style.fontWeight = '400';
    });
    if (this.el.avInitials) { this.el.avInitials.textContent = emoji; }
    if (this.el.avDropdownAvatar) this.el.avDropdownAvatar.textContent = emoji;
    if (this.el.avDropdownName) this.el.avDropdownName.textContent = name;
    if (this.el.sidebarUserName) this.el.sidebarUserName.textContent = name;
    if (this.el.sidebarAvatar) this.el.sidebarAvatar.textContent = emoji;

    if (this.el.dhGreeting) {
      const hr = new Date().getHours();
      const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
      this.el.dhGreeting.textContent = `${greet}, ${name}`;
    }
  }

  // ─── AVATAR PICKER ──────────────────────────────────────────────────────────

  _renderAvatarPicker() {
    const container = this.el.sidebarAvatarPicker;
    if (!container) return;
    const currentEmoji = this.avatarEmojiIdx;
    container.innerHTML = `
      <div class="avatar-picker-label">Choose Avatar Emoji</div>
      <div class="avatar-picker-grid">
        ${AVATAR_EMOJIS.map((emoji, i) => `
          <button class="avatar-emoji-btn ${i === currentEmoji ? 'active' : ''}"
                  data-idx="${i}" title="${emoji}"
                  onclick="window._app._setAvatarEmoji(${i})">${emoji}</button>
        `).join('')}
      </div>`;
  }

  _setAvatarEmoji(idx) {
    this.avatarEmojiIdx = idx;
    localStorage.setItem('rm_avatar_emoji', String(idx));
    this._updateUserUI();
    this._renderAvatarPicker();
    this._renderAvatarPickerInSettings();
  }

  // ─── WIZARD SYSTEM ──────────────────────────────────────────────────────────

  _openWizard() {
    this.wizardData = {
      tool: 'recipe',
      ingredients: '',
      language: this.prefs.defaultLanguage || 'English',
      depth: 'standard',
      spice: 3,
      servings: 2,
      time: 2,
    };
    this.wizardStep = 0;
    this.wizardFile = null;
    this._renderWizardStep();
    this._openModal('wizardModal');
  }

  _renderWizardStep() {
    if (!this.el.wizardContent) return;

    const steps = [
      { name: 'Ingredients', icon: 'fa-utensils', desc: 'What to cook' },
      { name: 'Language', icon: 'fa-globe', desc: 'Output language' },
      { name: 'Depth', icon: 'fa-chart-line', desc: 'Detail level' },
      { name: 'Spice', icon: 'fa-pepper-hot', desc: 'Heat level' },
      { name: 'Servings', icon: 'fa-users', desc: 'How many' },
      { name: 'Generate', icon: 'fa-rocket', desc: 'Ready to cook!' },
    ];

    const pct = ((this.wizardStep + 1) / steps.length) * 100;

    const stepsHtml = steps.map((s, i) => {
      const state = i === this.wizardStep ? 'active' : i < this.wizardStep ? 'completed' : '';
      return `
        <div class="wizard-step ${state}">
          <div class="wizard-step-circle">
            ${i < this.wizardStep ? '<i class="fas fa-check"></i>' : (i + 1)}
          </div>
          <div class="wizard-step-label">${s.name}</div>
          <div class="wizard-step-desc">${s.desc}</div>
        </div>
        ${i < steps.length - 1 ? '<div class="wizard-step-line"></div>' : ''}`;
    }).join('');

    this.el.wizardContent.innerHTML = `
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="wizard-steps">${stepsHtml}</div>
      <div id="wizardBody" class="wizard-body"></div>
      <div class="wizard-footer">
        <button class="wizard-btn wizard-btn-secondary" id="wizPrev" ${this.wizardStep === 0 ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="wizard-step-info">${this.wizardStep + 1} / ${steps.length}</div>
        <button class="wizard-btn wizard-btn-primary" id="wizNext">
          ${this.wizardStep === steps.length - 1
            ? '<i class="fas fa-rocket"></i> Cook Now!'
            : 'Next <i class="fas fa-arrow-right"></i>'}
        </button>
      </div>`;

    const body = document.getElementById('wizardBody');
    if (body) {
      switch (this.wizardStep) {
        case 0: body.innerHTML = this._wStepIngredients(); this._bindWIngredients(); break;
        case 1: body.innerHTML = this._wStepLang(); this._bindWLang(); break;
        case 2: body.innerHTML = this._wStepDepth(); this._bindWDepth(); break;
        case 3: body.innerHTML = this._wStepSpice(); this._bindWSpice(); break;
        case 4: body.innerHTML = this._wStepServings(); this._bindWServings(); break;
        case 5: body.innerHTML = this._wStepReview(); break;
      }
    }

    const prev = this._el('wizPrev');
    const next = this._el('wizNext');

    if (prev) prev.onclick = () => {
      if (this.wizardStep > 0) { this.wizardStep--; this._renderWizardStep(); }
    };
    if (next) next.onclick = () => {
      if (this.wizardStep < steps.length - 1) {
        if (this._wValidate()) { this.wizardStep++; this._renderWizardStep(); }
      } else {
        this._closeModal('wizardModal');
        this._runWizard();
      }
    };
  }

  _wStepIngredients() {
    const fn = this.wizardFile ? this.wizardFile.name : '';
    return `
      <div class="wizard-topic-area">
        <label class="wizard-label"><i class="fas fa-utensils"></i> What ingredients do you have?</label>
        <textarea class="wizard-topic-input" id="wTopicInp" rows="4"
          placeholder="Enter ingredients separated by commas…
          
Examples:
• tomatoes, onions, garlic, pasta
• chicken, bell peppers, soy sauce
• eggs, butter, flour, sugar">${this._esc(this.wizardData.ingredients)}</textarea>
        <div class="wizard-char-count" id="wCharCount">${this.wizardData.ingredients.length} / 1000</div>
        <div class="wizard-file-zone" id="wFileZone">
          <i class="fas fa-cloud-upload-alt"></i>
          <span>Click or drag an image of your ingredients</span>
          <input type="file" id="wFileInp" accept="image/*" style="display:none">
          <div class="wizard-file-name" id="wFileName">${fn ? `📄 ${fn}` : ''}</div>
        </div>
        <div class="wizard-suggestions">
          <div class="wizard-sugg-label"><i class="fas fa-bolt"></i> Quick ingredient ideas:</div>
          <div class="wizard-sugg-pills">
            <button class="wizard-sugg-pill" data-topic="tomatoes, onions, garlic, pasta">🍝 Pasta</button>
            <button class="wizard-sugg-pill" data-topic="chicken, bell peppers, soy sauce">🍗 Chicken Stir-fry</button>
            <button class="wizard-sugg-pill" data-topic="eggs, butter, flour, sugar">🥞 Pancakes</button>
            <button class="wizard-sugg-pill" data-topic="rice, vegetables, soy sauce">🍚 Fried Rice</button>
            <button class="wizard-sugg-pill" data-topic="potatoes, cheese, cream">🥔 Potato Gratin</button>
            <button class="wizard-sugg-pill" data-topic="fish, lemon, herbs">🐟 Lemon Fish</button>
          </div>
        </div>
      </div>`;
  }

  _bindWIngredients() {
    const inp = this._el('wTopicInp');
    const cc = this._el('wCharCount');
    if (inp) {
      inp.oninput = e => {
        const v = e.target.value.slice(0, 1000);
        e.target.value = v;
        this.wizardData.ingredients = v;
        if (cc) cc.textContent = `${v.length} / 1000`;
      };
    }

    const fz = this._el('wFileZone');
    const fi = this._el('wFileInp');
    if (fz && fi) {
      fz.onclick = e => { if (e.target !== fi) fi.click(); };
      fi.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) {
          this._toast('error', 'fa-times', 'Please select an image file.');
          return;
        }
        const r = new FileReader();
        r.onload = ev => {
          this.wizardFile = f;
          this.wizardData.image = ev.target.result;
          const fn = this._el('wFileName');
          if (fn) fn.textContent = `📸 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
          this._toast('success', 'fa-image', 'Image loaded! AI will detect ingredients.');
        };
        r.readAsDataURL(f);
      };
      fz.ondragover = e => { e.preventDefault(); fz.classList.add('drag-over'); };
      fz.ondragleave = () => { fz.classList.remove('drag-over'); };
      fz.ondrop = e => {
        e.preventDefault(); fz.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f && fi) { fi.files = e.dataTransfer.files; fi.dispatchEvent(new Event('change')); }
      };
    }

    this._qsa('.wizard-sugg-pill').forEach(b => {
      b.onclick = () => {
        const t = b.dataset.topic;
        if (t && inp) {
          inp.value = t;
          this.wizardData.ingredients = t;
          if (cc) cc.textContent = `${t.length} / 1000`;
          setTimeout(() => {
            if (this.wizardStep < 5) { this.wizardStep++; this._renderWizardStep(); }
          }, 400);
        }
      };
    });
  }

  _wStepLang() {
    const LANGS = [
      ['English', '🇬🇧'], ['Urdu', '🇵🇰'], ['Hindi', '🇮🇳'], ['Arabic', '🇸🇦'],
      ['French', '🇫🇷'], ['German', '🇩🇪'], ['Spanish', '🇪🇸'], ['Portuguese', '🇧🇷'],
      ['Italian', '🇮🇹'], ['Russian', '🇷🇺'], ['Turkish', '🇹🇷'],
      ['Chinese (Simplified)', '🇨🇳'], ['Japanese', '🇯🇵'], ['Korean', '🇰🇷'],
      ['Bengali', '🇧🇩'], ['Vietnamese', '🇻🇳'], ['Thai', '🇹🇭'],
    ];
    return `
      <div class="wizard-step-heading"><i class="fas fa-globe"></i> Select output language:</div>
      <div class="wizard-language-grid">
        ${LANGS.map(([name, flag]) => `
          <div class="wizard-language-card ${this.wizardData.language === name ? 'selected' : ''}" data-lang="${name}">
            <span class="wlang-flag">${flag}</span>
            <span class="wlang-name">${name}</span>
          </div>
        `).join('')}
      </div>`;
  }

  _bindWLang() {
    this._qsa('.wizard-language-card').forEach(c => {
      c.onclick = () => {
        this.wizardData.language = c.dataset.lang;
        this._qsa('.wizard-language-card').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        setTimeout(() => {
          if (this.wizardStep < 5) { this.wizardStep++; this._renderWizardStep(); }
        }, 280);
      };
    });
  }

  _wStepDepth() {
    return `
      <div class="wizard-step-heading"><i class="fas fa-chart-line"></i> How much detail do you need?</div>
      <div class="wizard-depth-grid">
        ${Object.entries(DEPTH_CONFIG).map(([k, d]) => `
          <div class="wizard-depth-card ${this.wizardData.depth === k ? 'selected' : ''}" data-depth="${k}">
            <i class="fas ${d.icon} wdc-icon"></i>
            <div class="wizard-depth-name">${d.label}</div>
            <div class="wizard-depth-desc">${d.desc}</div>
            <div class="wizard-depth-words">📝 ${d.words} words</div>
          </div>
        `).join('')}
      </div>`;
  }

  _bindWDepth() {
    this._qsa('.wizard-depth-card[data-depth]').forEach(c => {
      c.onclick = () => {
        this.wizardData.depth = c.dataset.depth;
        this._qsa('.wizard-depth-card[data-depth]').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        setTimeout(() => {
          if (this.wizardStep < 5) { this.wizardStep++; this._renderWizardStep(); }
        }, 280);
      };
    });
  }

  _wStepSpice() {
    return `
      <div class="wizard-step-heading"><i class="fas fa-pepper-hot"></i> How spicy do you want it?</div>
      <div class="wizard-depth-grid">
        ${Object.entries(SPICE_CONFIG).map(([k, s]) => `
          <div class="wizard-depth-card ${this.wizardData.spice == k ? 'selected' : ''}" data-spice="${k}">
            <div style="font-size:1.8rem;margin-bottom:6px">${s.emoji}</div>
            <div class="wizard-depth-name">${s.label}</div>
            <div class="wizard-depth-desc">${s.desc}</div>
          </div>
        `).join('')}
      </div>`;
  }

  _bindWSpice() {
    this._qsa('.wizard-depth-card[data-spice]').forEach(c => {
      c.onclick = () => {
        this.wizardData.spice = Number(c.dataset.spice);
        this._qsa('.wizard-depth-card[data-spice]').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        setTimeout(() => {
          if (this.wizardStep < 5) { this.wizardStep++; this._renderWizardStep(); }
        }, 280);
      };
    });
  }

  _wStepServings() {
    return `
      <div class="wizard-step-heading"><i class="fas fa-users"></i> How many servings?</div>
      <div class="wizard-depth-grid">
        ${[1, 2, 3, 4, 6, 8, 10].map(n => `
          <div class="wizard-depth-card ${this.wizardData.servings === n ? 'selected' : ''}" data-servings="${n}">
            <i class="fas fa-user wdc-icon"></i>
            <div class="wizard-depth-name">${n}</div>
            <div class="wizard-depth-desc">${n === 1 ? 'Single serving' : n <= 4 ? 'Small family' : 'Large group'}</div>
          </div>
        `).join('')}
      </div>
      <div class="wizard-step-heading" style="margin-top:20px"><i class="fas fa-clock"></i> Time preference:</div>
      <div class="wizard-depth-grid">
        ${[
          {k:1, label:'Quick', desc:'Under 30 min', icon:'fa-bolt'},
          {k:2, label:'Medium', desc:'30-60 min', icon:'fa-clock'},
          {k:3, label:'Slow', desc:'1-2 hours', icon:'fa-hourglass-half'},
          {k:4, label:'Gourmet', desc:'2+ hours', icon:'fa-crown'},
        ].map(t => `
          <div class="wizard-depth-card ${this.wizardData.time === t.k ? 'selected' : ''}" data-time="${t.k}">
            <i class="fas ${t.icon} wdc-icon"></i>
            <div class="wizard-depth-name">${t.label}</div>
            <div class="wizard-depth-desc">${t.desc}</div>
          </div>
        `).join('')}
      </div>`;
  }

  _bindWServings() {
    this._qsa('.wizard-depth-card[data-servings]').forEach(c => {
      c.onclick = () => {
        this.wizardData.servings = Number(c.dataset.servings);
        this._qsa('.wizard-depth-card[data-servings]').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
      };
    });
    this._qsa('.wizard-depth-card[data-time]').forEach(c => {
      c.onclick = () => {
        this.wizardData.time = Number(c.dataset.time);
        this._qsa('.wizard-depth-card[data-time]').forEach(x => x.classList.remove('selected'));
        c.classList.add('selected');
        setTimeout(() => {
          if (this.wizardStep < 5) { this.wizardStep++; this._renderWizardStep(); }
        }, 280);
      };
    });
  }

  _wStepReview() {
    const depthCfg = DEPTH_CONFIG[this.wizardData.depth];
    const spiceCfg = SPICE_CONFIG[this.wizardData.spice];
    return `
      <div class="wizard-review-card">
        <div class="wizard-review-header"><i class="fas fa-clipboard-check"></i> Review Your Recipe Choices</div>
        ${[
          { icon: 'fa-utensils', label: 'Ingredients', val: (this.wizardData.ingredients || '<em class="dim">Not entered yet</em>').slice(0, 100) + (this.wizardData.ingredients?.length > 100 ? '…' : '') },
          { icon: 'fa-globe', label: 'Language', val: this.wizardData.language },
          { icon: 'fa-chart-line', label: 'Depth', val: depthCfg?.label, sub: depthCfg?.words + ' words' },
          { icon: 'fa-pepper-hot', label: 'Spice', val: spiceCfg?.label, sub: spiceCfg?.emoji + ' ' + spiceCfg?.desc },
          { icon: 'fa-users', label: 'Servings', val: this.wizardData.servings + ' people' },
          { icon: 'fa-clock', label: 'Time', val: ['Quick (30min)', 'Medium (1hr)', 'Slow (2hr)', 'Gourmet (2hr+)'][this.wizardData.time - 1] },
        ].map(r => `
          <div class="wizard-review-item">
            <div class="wizard-review-icon"><i class="fas ${r.icon}"></i></div>
            <div class="wizard-review-content">
              <div class="wizard-review-label">${r.label}</div>
              <div class="wizard-review-value">${r.val || '—'} ${r.sub ? `<span class="wizard-review-badge">${r.sub}</span>` : ''}</div>
            </div>
          </div>`).join('')}
      </div>
      ${this.wizardData.image ? `<div class="wizard-review-info"><i class="fas fa-image"></i> Image uploaded — AI will detect ingredients!</div>` : ''}
      <div class="wizard-review-tip">
        <i class="fas fa-lightbulb"></i>
        <strong>Pro tip:</strong> The more specific your ingredients, the better the recipe!
      </div>`;
  }

  _wValidate() {
    if (this.wizardStep === 0 && (!this.wizardData.ingredients || this.wizardData.ingredients.trim().length < 2)) {
      this._toast('error', 'fa-exclamation-circle', 'Please enter ingredients (at least 2 characters)');
      return false;
    }
    return true;
  }

  async _runWizard() {
    if (this.generating) return;
    const t = this.wizardData.ingredients?.trim();
    if (!t || t.length < 2) { this._toast('info', 'fa-lightbulb', 'Please enter ingredients.'); return; }
    this._checkStreak();
    await this._sendDirect(
      t,
      this.wizardData.language,
      this.wizardData.depth,
      this.wizardData.spice,
      this.wizardData.servings,
      this.wizardData.time,
      this.wizardData.image
    );
  }

  // ─── CORE GENERATION PIPELINE ───────────────────────────────────────────────

  async _sendDirect(text, lang, depth, spice, servings, time, image) {
    if (this.generating) return;
    this.generating = true;
    this.streamBuffer = '';

    this._showToolbar(false);
    this._showStreamOverlay(text);
    this._startStages();
    const t0 = Date.now();

    try {
      const data = await this._callAPI(text, {
        depth,
        language: lang,
        spice,
        servings,
        time,
        image,
      });
      this.currentData = data;
      this._hideStreamOverlay();
      this._renderResult(data);
      this.totalRecipes++;
      this.xp += 10 + Math.floor(Math.random() * 20);
      this._saveNum('rm_total_recipes', this.totalRecipes);
      this._saveNum('rm_xp', this.xp);
      this.totalWords += this._wordCount(data.ultra_long_notes || '');
      localStorage.setItem('rm_total_words', String(this.totalWords));
      this._addHistory({
        id: this._genId(),
        topic: data.topic || text,
        dish: data.dish || text,
        tool: 'recipe',
        data,
        ts: Date.now(),
        dur: Date.now() - t0
      });
      this._updateAllStats();
      this._showToolbar(true);
      this._toast('success', 'fa-check-circle', '🍽️ Recipe generated!');
      setTimeout(() => { if (this.el.outArea) this.el.outArea.scrollTop = 0; }, 200);
    } catch (err) {
      this._hideStreamOverlay();
      if (err.name === 'AbortError') {
        this._toast('info', 'fa-stop-circle', 'Generation cancelled.');
        this._showState('empty');
        this._showToolbar(false);
      } else {
        const msg = this._friendlyError(err.message);
        this._showState('error', msg);
        this._toast('error', 'fa-exclamation-circle', msg);
        this._showToolbar(false);
      }
    } finally {
      this.generating = false;
      this._stopStages();
    }
  }

  _friendlyError(msg) {
    if (!msg) return 'RouxMind is momentarily unavailable. Please try again.';
    if (msg.includes('401') || msg.includes('API key')) return 'RouxMind is experiencing a service issue. Please try again later.';
    if (msg.includes('timeout') || msg.includes('timed out')) return 'The AI took too long — please try again in a moment.';
    if (msg.includes('busy') || msg.includes('models')) return 'RouxMind is momentarily busy. Please try again in a few seconds.';
    if (msg.includes('fetch') || msg.includes('network')) return 'Network issue detected. Please check your connection and try again.';
    return 'RouxMind is momentarily unavailable. Please try again in a few seconds.';
  }

  _showToolbar(show) {
    if (this.el.outToolbar) {
      this.el.outToolbar.style.display = show ? 'flex' : 'none';
    }
  }

  async _callAPI(message, opts) {
    this.streamCtrl = new AbortController();
    return await this._streamSSE(message, opts);
  }

  async _streamSSE(message, opts) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        message,
        userName: this.userName || 'Anonymous',
        sessionId: this._currentSessionId || this._genId(),
        image: opts.image || '',
        options: {
          depth: opts.depth || 'standard',
          language: opts.language || 'English',
          spice: opts.spice || 3,
          servings: opts.servings || 2,
          time: opts.time || 2,
          stream: true,
        },
      });

      fetch(ROUXMIND.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: this.streamCtrl?.signal,
      }).then(async res => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          reject(new Error(d.error || `Server error (${res.status})`));
          return;
        }
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('text/event-stream')) {
          const d = await res.json();
          if (d.error) reject(new Error(d.error));
          else resolve(d);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuf = '', chars = 0, renderThrottle = 0;

        const renderLive = () => {
          const now = Date.now();
          if (now - renderThrottle < 16) return;
          renderThrottle = now;
          if (!this.el.sfpText) return;
          this.el.sfpText.innerHTML = this._renderMdLive(this.streamBuffer);
          this.el.sfpText.classList.add('live-md');
          if (this.el.sfpScroll) this.el.sfpScroll.scrollTop = this.el.sfpScroll.scrollHeight;
        };

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                if (lineBuf.trim()) {
                  const line = lineBuf.trim();
                  if (line.startsWith('data: ')) {
                    try {
                      const evt = JSON.parse(line.slice(6).trim());
                      if (evt.topic !== undefined || evt.ultra_long_notes !== undefined) {
                        if (!evt.ultra_long_notes && this.streamBuffer) evt.ultra_long_notes = this.streamBuffer;
                        resolve(evt);
                        return;
                      }
                    } catch { /* ignore */ }
                  }
                }
                reject(new Error('Stream closed unexpectedly. Please try again.'));
                return;
              }

              lineBuf += decoder.decode(value, { stream: true });
              const lines = lineBuf.split('\n');
              lineBuf = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('event: ')) continue;
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw) continue;
                try {
                  const evt = JSON.parse(raw);

                  if (evt.t !== undefined) {
                    this.streamBuffer += evt.t;
                    chars += evt.t.length;
                    renderLive();
                    this._updateStageByProgress(chars);
                  } else if (evt.idx !== undefined && evt.label !== undefined) {
                    this._activateStage(evt.idx);
                    if (this.el.sfpLabel) this.el.sfpLabel.textContent = evt.label;
                  } else if (evt.fact !== undefined) {
                    if (this.el.sfpFact) this.el.sfpFact.textContent = evt.fact;
                  } else if (evt.topic !== undefined || evt.ultra_long_notes !== undefined) {
                    if (this.el.sfpText) {
                      this.el.sfpText.classList.remove('live-md');
                      this.el.sfpText.classList.add('done');
                    }
                    if (!evt.ultra_long_notes && this.streamBuffer) {
                      evt.ultra_long_notes = this.streamBuffer;
                    }
                    resolve(evt);
                    return;
                  } else if (evt.error !== undefined) {
                    reject(new Error(evt.error));
                    return;
                  }
                } catch { /* ignore */ }
              }
            }
          } catch (pumpErr) {
            if (pumpErr.name === 'AbortError') { reject(pumpErr); return; }
            reject(new Error('Stream error: ' + pumpErr.message));
          }
        };

        pump();
      }).catch(err => reject(err));
    });
  }

  // ─── STREAM OVERLAY ─────────────────────────────────────────────────────────

  _showStreamOverlay(topic) {
    if (this.el.sfpTopic) this.el.sfpTopic.textContent = topic.length > 65 ? topic.slice(0, 65) + '…' : topic;
    if (this.el.sfpToolIcon) this.el.sfpToolIcon.className = 'fas fa-utensils';
    if (this.el.sfpToolName) this.el.sfpToolName.textContent = 'Recipe';
    if (this.el.sfpLabel) this.el.sfpLabel.textContent = 'Cooking up your recipe…';
    if (this.el.sfpText) {
      this.el.sfpText.innerHTML = '<span class="typing-cursor">▊</span>';
      this.el.sfpText.classList.remove('done');
      this.el.sfpText.classList.add('live-md');
    }
    if (this.el.sscProgressBar) this.el.sscProgressBar.style.width = '4%';
    if (this.el.streamFullpage) this.el.streamFullpage.style.display = 'flex';
    if (this.el.emptyState) this.el.emptyState.style.display = 'none';
    if (this.el.resultArea) this.el.resultArea.style.display = 'none';
    if (this.el.thinkingWrap) this.el.thinkingWrap.style.display = 'none';
  }

  _hideStreamOverlay() {
    if (this.el.streamFullpage) {
      this.el.streamFullpage.classList.add('fading-out');
      setTimeout(() => {
        this.el.streamFullpage.style.display = 'none';
        this.el.streamFullpage.classList.remove('fading-out');
      }, 300);
    }
  }

  // ─── STAGE SYSTEM ────────────────────────────────────────────────────────────

  _startStages() {
    this.stageIdx = 0;
    for (let i = 0; i < 5; i++) {
      const ts = this._el(`ts${i}`); if (ts) ts.className = 'ths';
      const ss = this._el(`ss${i}`); if (ss) ss.className = 'ssc-stage';
    }
    this._activateStage(0);
    this.thinkTimer = setInterval(() => {
      this.stageIdx++;
      if (this.stageIdx < 5) {
        this._doneStage(this.stageIdx - 1);
        this._activateStage(this.stageIdx);
      }
      const pct = Math.min(96, (this.stageIdx / 5) * 100);
      if (this.el.sscProgressBar) this.el.sscProgressBar.style.width = `${pct}%`;
    }, 5500);
  }

  _activateStage(i) {
    const ts = this._el(`ts${i}`); if (ts) { ts.classList.remove('done'); ts.classList.add('active'); }
    const ss = this._el(`ss${i}`); if (ss) { ss.classList.remove('done'); ss.classList.add('active'); }
    if (this.el.sfpLabel && STAGE_MESSAGES[i]) this.el.sfpLabel.textContent = STAGE_MESSAGES[i];
  }

  _doneStage(i) {
    const ts = this._el(`ts${i}`); if (ts) { ts.classList.remove('active'); ts.classList.add('done'); }
    const ss = this._el(`ss${i}`); if (ss) { ss.classList.remove('active'); ss.classList.add('done'); }
  }

  _stopStages() {
    if (this.thinkTimer) clearInterval(this.thinkTimer);
    for (let i = 0; i <= this.stageIdx && i < 5; i++) this._doneStage(i);
    if (this.el.sscProgressBar) this.el.sscProgressBar.style.width = '100%';
  }

  _updateStageByProgress(chars) {
    const thresholds = [0, 500, 1400, 2600, 4200];
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (chars >= thresholds[i] && this.stageIdx < i) {
        this._doneStage(this.stageIdx);
        this.stageIdx = i;
        this._activateStage(i);
        const pct = Math.min(96, (i / 5) * 100);
        if (this.el.sscProgressBar) this.el.sscProgressBar.style.width = `${pct}%`;
        break;
      }
    }
  }

  // ─── STATE MANAGEMENT ────────────────────────────────────────────────────────

  _showState(state, errMsg) {
    if (this.el.emptyState) this.el.emptyState.style.display = 'none';
    if (this.el.thinkingWrap) this.el.thinkingWrap.style.display = 'none';
    if (this.el.resultArea) this.el.resultArea.style.display = 'none';

    switch (state) {
      case 'result':
        if (this.el.resultArea) {
          this.el.resultArea.style.display = 'block';
          if (this.el.outArea) setTimeout(() => { this.el.outArea.scrollTop = 0; }, 80);
        }
        break;
      case 'error':
        if (this.el.resultArea) {
          this.el.resultArea.style.display = 'block';
          this.el.resultArea.innerHTML = `
            <div class="error-card">
              <div class="error-card-hdr"><i class="fas fa-exclamation-circle"></i> RouxMind — Temporarily Unavailable</div>
              <div class="error-card-body">${this._esc(errMsg || 'RouxMind is momentarily unavailable.')}</div>
              <div class="error-card-hint">AI models are occasionally busy. This usually resolves in a few seconds — please try again!</div>
              <div style="display:flex;gap:12px;justify-content:center;margin-top:20px;flex-wrap:wrap">
                <button class="btn btn-primary" onclick="window._app._openWizard()">
                  <i class="fas fa-magic"></i> Try Again with Wizard
                </button>
              </div>
            </div>`;
        }
        break;
      default:
        if (this.el.emptyState) this.el.emptyState.style.display = 'flex';
        break;
    }
  }

  // ─── RESULT RENDERING ───────────────────────────────────────────────────────

  _renderResult(data) {
    if (!this.el.resultArea) return;
    this.el.resultArea.innerHTML = this._buildResultHTML(data);
    this._showState('result');
  }

  _buildResultHTML(data) {
    const dish = this._esc(data.dish || data.topic || 'Recipe');
    const wc = this._wordCount(this._stripMd(data.ultra_long_notes || ''));

    const header = `
      <div class="result-hdr">
        <div class="rh-left">
          <div class="rh-tool-badge" style="color:#d4af37">
            <i class="fas fa-utensils"></i> Recipe
          </div>
          <div class="rh-topic">🍽️ ${dish}</div>
          <div class="rh-meta">
            <div class="rh-mi"><i class="fas fa-users"></i> ${data.servings || 2} servings</div>
            <div class="rh-mi"><i class="fas fa-pepper-hot"></i> Spice: ${SPICE_CONFIG[data.spice]?.label || 'Medium'}</div>
            <div class="rh-mi"><i class="fas fa-globe"></i> ${this._esc(data.language || 'English')}</div>
            ${wc > 0 ? `<div class="rh-mi"><i class="fas fa-file-word"></i> ~${wc.toLocaleString()} words</div>` : ''}
          </div>
          <div class="rh-powered">
            Generated by <strong>${ROUXMIND.BRAND}</strong> ·
            <a href="https://${ROUXMIND.DEVSITE}" target="_blank">${ROUXMIND.DEVELOPER}</a>
          </div>
        </div>
        <div class="score-ring-wrap">
          <div class="rh-score" style="--pct:96">
            <div class="rh-score-val">🍳</div>
          </div>
          <div class="score-ring-label">Recipe</div>
        </div>
      </div>`;

    let body = '';
    if (data.ultra_long_notes) {
      body += `<div class="study-sec section-anchor" id="sec-recipe">
        <div class="ss-hdr">
          <div class="ss-title"><i class="fas fa-utensils"></i> Your Recipe</div>
          <button class="ss-copy-btn" onclick="window._app._copyTxt(this.closest('.study-sec').querySelector('.md-content').innerText)">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
        <div class="ss-body"><div class="md-content">${this._renderMd(data.ultra_long_notes)}</div></div>
      </div>`;
    }

    const exportBar = `
      <div class="export-bar">
        <button class="exp-btn pdf" onclick="window._app._downloadPDF()">
          <i class="fas fa-file-pdf"></i><span>PDF</span>
        </button>
        <button class="exp-btn copy" onclick="window._app._copyResult()">
          <i class="fas fa-copy"></i><span>Copy</span>
        </button>
        <button class="exp-btn save" onclick="window._app._saveNote()">
          <i class="fas fa-star"></i><span>Save</span>
        </button>
        <button class="exp-btn share" onclick="window._app._shareResult()">
          <i class="fas fa-share-alt"></i><span>Share</span>
        </button>
        <button class="exp-btn new" onclick="window._app._openWizard()" style="color:#bf00ff;border-color:rgba(191,0,255,.3)">
          <i class="fas fa-magic"></i><span>New</span>
        </button>
        <span class="exp-brand">${ROUXMIND.BRAND}</span>
      </div>`;

    const footer = `
      <div class="result-branding-footer">
        <div class="rbf-left">
          <div class="rbf-logo">🍳</div>
          <div class="rbf-text">
            <a href="https://${ROUXMIND.WEBSITE}" target="_blank" style="font-family:'Orbitron',sans-serif;letter-spacing:.05em">${ROUXMIND.BRAND}</a> ·
            <a href="https://${ROUXMIND.DEVSITE}" target="_blank">${ROUXMIND.DEVELOPER}</a> ·
            Free forever.
          </div>
        </div>
        <div class="rbf-ts">${new Date().toLocaleString()}</div>
      </div>`;

    return `<div class="result-wrap">${header}${body}${exportBar}${footer}</div>`;
  }

  // ─── PDF GENERATION ─────────────────────────────────────────────────────────

  async _downloadPDF() {
    const data = this.currentData;
    if (!data) { this._toast('info', 'fa-info-circle', 'Generate a recipe first.'); return; }

    if (typeof window.jspdf === 'undefined' || !window.jspdf?.jsPDF) {
      this._toast('info', 'fa-spinner fa-pulse', 'Loading PDF library…');
      await new Promise((resolve) => {
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        sc.onload = resolve;
        sc.onerror = () => { this._toast('error', 'fa-times', 'Could not load PDF library.'); resolve(); };
        document.head.appendChild(sc);
      });
      if (!window.jspdf?.jsPDF) return;
    }
    this._generatePDF(data, this.pdfTheme);
  }

  _generatePDF(data, theme = 'dark') {
    this._toast('info', 'fa-spinner fa-pulse', `Generating ${theme === 'dark' ? '🌙 Dark' : '☀️ Light'} PDF…`);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

      const PW = 210, PH = 297, ML = 14, MR = 14, CW = PW - ML - MR, MT = 28, MB = 16;
      const isDark = theme !== 'light';
      let Y = 0, pageNum = 1;

      const C = isDark ? {
        bg: [7, 12, 32], gold: [212, 175, 55], blue: [0, 170, 220],
        text: [185, 188, 200], head: [238, 240, 255], muted: [115, 118, 138],
        card: [14, 20, 52], hdr: [20, 30, 72], border: [28, 40, 88],
      } : {
        bg: [255, 255, 255], gold: [170, 135, 30], blue: [0, 100, 190],
        text: [38, 40, 56], head: [10, 18, 56], muted: [100, 106, 126],
        card: [244, 246, 255], hdr: [228, 232, 252], border: [210, 215, 240],
      };

      const setFG = ([r, g, b]) => doc.setTextColor(r, g, b);
      const setBG = ([r, g, b]) => doc.setFillColor(r, g, b);
      const setDC = ([r, g, b]) => doc.setDrawColor(r, g, b);
      const fillBg = () => { if (isDark) { setBG(C.bg); doc.rect(0, 0, PW, PH, 'F'); } };

      const addFooter = () => {
        setBG(isDark ? [10, 16, 40] : [235, 238, 252]);
        doc.rect(0, PH - MB, PW, MB, 'F');
        setDC(C.gold); doc.setLineWidth(0.25); doc.line(ML, PH - MB, PW - MR, PH - MB);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); setFG(C.muted);
        doc.text(`${ROUXMIND.BRAND} · ${ROUXMIND.DEVSITE} · "${ROUXMIND.TAGLINE}"`, ML, PH - 6);
        doc.text(`Page ${pageNum}`, PW - MR, PH - 6, { align: 'right' });
      };

      const addHeader = (sub = '') => {
        setBG(C.hdr); doc.rect(0, 0, PW, MT - 4, 'F');
        setDC(C.gold); doc.setLineWidth(0.25); doc.line(0, MT - 4, PW, MT - 4);
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); setFG(C.gold);
        doc.text(ROUXMIND.BRAND, ML, MT - 9);
        doc.setFont('helvetica', 'normal'); setFG(C.muted);
        doc.text((sub || (data.topic || '')).slice(0, 72), PW - MR, MT - 9, { align: 'right' });
      };

      const newPage = (sub) => {
        addFooter(); doc.addPage(); pageNum++; Y = MT + 2;
        fillBg(); addHeader(sub);
      };

      const ck = (need = 12) => { if (Y + need > PH - MB - 2) newPage(); };

      const wt = (txt, x, maxW, sz, bold = false, color = C.text, lh = null) => {
        if (!txt) return;
        doc.setFontSize(sz); doc.setFont('helvetica', bold ? 'bold' : 'normal'); setFG(color);
        const lines = doc.splitTextToSize(String(txt), maxW);
        const h = lh || sz * 0.385;
        ck(lines.length * h + 1);
        doc.text(lines, x, Y);
        Y += lines.length * h + 0.5;
        return lines.length;
      };

      const secHdr = (label, color = C.gold) => {
        ck(14); setBG(C.hdr); doc.rect(ML, Y, CW, 9, 'F');
        setBG(color); doc.rect(ML, Y, 3, 9, 'F');
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); setFG(color);
        doc.text(label, ML + 6, Y + 6.2);
        Y += 13;
      };

      // COVER PAGE
      fillBg();
      setBG(C.gold); doc.rect(0, 0, PW, 4, 'F'); doc.rect(0, PH - 4, PW, 4, 'F');
      setBG([0, 140, 220]); doc.roundedRect(ML, 14, 22, 22, 4, 4, 'F');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); setFG([255, 255, 255]);
      doc.text('R', ML + 8, 30);
      doc.setFontSize(24); doc.setFont('helvetica', 'bold'); setFG(C.gold);
      doc.text('ROUXMIND', ML + 28, 22);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); setFG(C.muted);
      doc.text("v2.0 — Where Every Plate Tells Your Story", ML + 28, 29);
      doc.text(`${ROUXMIND.DEVELOPER} · ${ROUXMIND.DEVSITE} · Founder: ${ROUXMIND.FOUNDER}`, ML + 28, 36);
      setDC(C.gold); doc.setLineWidth(0.4); doc.line(ML, 43, PW - MR, 43);

      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); setFG(C.head);
      const titleLines = doc.splitTextToSize(data.dish || data.topic || 'Recipe', CW);
      doc.text(titleLines, ML, 67);
      let cy = 67 + titleLines.length * 8.5;

      const wc = this._wordCount(this._stripMd(data.ultra_long_notes || ''));
      const stats = [
        { l: 'Servings', v: `${data.servings || 2}` },
        { l: 'Spice', v: `${SPICE_CONFIG[data.spice]?.label || 'Medium'}` },
        { l: 'Words', v: `~${wc.toLocaleString()}` },
        { l: 'Lang', v: data.language || 'English' },
        { l: 'Date', v: new Date().toLocaleDateString() },
      ];
      const sw = CW / 3;
      stats.forEach((s, i) => {
        const sx = ML + (i % 3) * sw, sy = cy + Math.floor(i / 3) * 20;
        setBG(C.card); doc.roundedRect(sx, sy, sw - 2, 17, 2, 2, 'F');
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); setFG(C.gold);
        doc.text(s.v, sx + (sw - 2) / 2, sy + 9, { align: 'center' });
        doc.setFontSize(6.5); doc.setFont('helvetica', 'normal'); setFG(C.muted);
        doc.text(s.l, sx + (sw - 2) / 2, sy + 14.5, { align: 'center' });
      });
      cy += 44;

      doc.setFontSize(12); doc.setFont('helvetica', 'bolditalic'); setFG(C.gold);
      doc.text(`"${ROUXMIND.TAGLINE}"`, PW / 2, cy + 6, { align: 'center' });
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); setFG(C.muted);
      doc.text(`— ${ROUXMIND.FOUNDER}`, PW / 2, cy + 13, { align: 'center' });
      doc.text(`Generated: ${new Date().toLocaleString()} · Theme: ${isDark ? 'Dark' : 'Light'}`, PW / 2, PH - 22, { align: 'center' });
      addFooter();

      // CONTENT PAGES
      newPage('Recipe');

      if (data.ultra_long_notes) {
        secHdr('RECIPE', C.gold);
        const clean = this._stripMd(data.ultra_long_notes);
        let prevBlank = false;
        for (const raw of clean.split('\n')) {
          const tr = raw.trim();
          if (!tr) { if (!prevBlank) Y += 2; prevBlank = true; continue; }
          prevBlank = false; ck(9);
          if (tr.match(/^#{1,4}/)) {
            const lv = (tr.match(/^#+/) || [''])[0].length;
            const txt = tr.replace(/^#+\s*/, '').replace(/\*+/g, '').replace(/`/g, '');
            Y += lv <= 2 ? 4 : 2;
            const sz = lv === 1 ? 14 : lv === 2 ? 11.5 : lv === 3 ? 10 : 9;
            const col = lv <= 2 ? C.gold : lv === 3 ? C.blue : C.head;
            if (lv <= 2) { setBG(col); doc.rect(ML, Y - 1, 3, sz * 0.4, 'F'); wt(txt, ML + 5, CW - 5, sz, true, col); } else wt(txt, ML, CW, sz, true, col);
            Y += lv <= 2 ? 3 : 1;
          } else if (tr.match(/^[-•*]\s/)) {
            const txt = tr.replace(/^[-•*]\s*/, '');
            setBG(C.gold); doc.circle(ML + 2, Y - 1.5, 1, 'F');
            wt(txt, ML + 5, CW - 5, 8.5, false, C.text);
            Y += 0.5;
          } else if (tr.startsWith('>')) {
            ck(12); const qText = tr.replace(/^>\s*/, '');
            setBG(isDark ? [12, 20, 52] : [238, 242, 255]); doc.rect(ML, Y - 2, CW, 10, 'F');
            setBG(C.gold); doc.rect(ML, Y - 2, 2.5, 10, 'F');
            wt(qText, ML + 5, CW - 5, 8.5, false, isDark ? [220, 210, 160] : [75, 60, 10]);
            Y += 3;
          } else if (tr.startsWith('---')) {
            setDC(C.border); doc.setLineWidth(0.2); doc.line(ML, Y, PW - MR, Y);
            Y += 5;
          } else {
            wt(tr.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*/g, '').replace(/`(.+?)`/g, '[$1]'), ML, CW, 8.5, false, C.text);
            Y += 1;
          }
        }
        Y += 6;
      }

      addFooter();

      const safeName = (data.dish || data.topic || 'Recipe').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 40);
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`RouxMind_${safeName}_${dateStr}_${theme}.pdf`);
      this._toast('success', 'fa-file-pdf', `✓ PDF ready — ${pageNum} page${pageNum > 1 ? 's' : ''} · ${theme} theme`);

    } catch (err) {
      console.error('PDF error:', err);
      this._toast('error', 'fa-times', `PDF failed: ${err.message.slice(0, 60)}`);
    }
  }

  // ─── COPY / SAVE / SHARE / CLEAR ────────────────────────────────────────────

  _copyResult() {
    if (!this.currentData) { this._toast('info', 'fa-info-circle', 'Nothing to copy.'); return; }
    const parts = [];
    if (this.currentData.dish) parts.push(`# ${this.currentData.dish}\n`);
    if (this.currentData.ultra_long_notes) parts.push(this._stripMd(this.currentData.ultra_long_notes));
    parts.push(`\n\n---\nGenerated by ${ROUXMIND.BRAND} | ${ROUXMIND.DEVELOPER} | ${ROUXMIND.DEVSITE}`);
    navigator.clipboard.writeText(parts.join('\n'))
      .then(() => this._toast('success', 'fa-check', 'Copied to clipboard!'))
      .catch(() => {
        const ta = document.createElement('textarea');
        ta.value = parts.join('\n');
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        this._toast('success', 'fa-check', 'Copied!');
      });
  }

  _copyTxt(text) {
    navigator.clipboard.writeText(text || '')
      .then(() => this._toast('success', 'fa-check', 'Section copied!'))
      .catch(() => this._toast('error', 'fa-times', 'Copy failed.'));
  }

  _saveNote() {
    if (!this.currentData) { this._toast('info', 'fa-info-circle', 'Nothing to save.'); return; }
    if (this.saved.find(s => s.topic === this.currentData.topic && s.tool === this.tool)) {
      this._toast('info', 'fa-star', 'Already saved!');
      return;
    }
    if (this.saved.length >= ROUXMIND.MAX_SAVED) {
      this._toast('error', 'fa-archive', `Library full (max ${ROUXMIND.MAX_SAVED}).`);
      return;
    }
    const note = {
      id: this._genId(),
      topic: this.currentData.topic || this.currentData.dish || 'Untitled',
      dish: this.currentData.dish || 'Untitled',
      tool: this.tool,
      data: this.currentData,
      savedAt: Date.now(),
    };
    this.saved.unshift(note);
    this._save('rm_saved', this.saved);
    this._updateAllStats();
    this._renderSidebarSaved();
    this._renderSavedModal();
    this._toast('success', 'fa-star', 'Saved to your library!');
  }

  _shareResult() {
    if (!this.currentData) { this._toast('info', 'fa-info-circle', 'Nothing to share.'); return; }
    const sd = {
      title: `${this.currentData.dish || 'Recipe'} — ${ROUXMIND.BRAND}`,
      text: `My recipe for "${this.currentData.dish}" — generated with ${ROUXMIND.BRAND}`,
      url: `https://${ROUXMIND.WEBSITE}`,
    };
    if (navigator.share) {
      navigator.share(sd).catch(() => this._fallbackShare(sd));
    } else {
      this._fallbackShare(sd);
    }
  }

  _fallbackShare(sd) {
    navigator.clipboard.writeText(`${sd.title}\n${sd.url}`)
      .then(() => this._toast('success', 'fa-link', 'Link copied to clipboard!'))
      .catch(() => this._toast('info', 'fa-info-circle', `Share: ${ROUXMIND.WEBSITE}`));
  }

  _clearOutput() {
    if (!this.currentData) { this._showState('empty'); this._showToolbar(false); return; }
    this._confirm('Clear the current recipe?', () => {
      this.currentData = null;
      this._showState('empty');
      if (this.el.resultArea) this.el.resultArea.innerHTML = '';
      this._showToolbar(false);
      this._toast('info', 'fa-trash', 'Output cleared.');
    });
  }

  // ─── HISTORY & SAVED ─────────────────────────────────────────────────────────

  _addHistory(item) {
    this.history = this.history.filter(h => !(h.topic === item.topic && h.tool === item.tool));
    this.history.unshift(item);
    if (this.history.length > ROUXMIND.MAX_HISTORY) this.history = this.history.slice(0, ROUXMIND.MAX_HISTORY);
    this._save('rm_history', this.history);
    this._renderSidebarHistory();
    this._updateAllStats();
  }

  _renderSidebarHistory() {
    if (!this.el.lpHistList) return;
    if (!this.history.length) {
      this.el.lpHistList.innerHTML = '<div class="lp-hist-empty">No history yet — start cooking!</div>';
      return;
    }
    this.el.lpHistList.innerHTML = this.history.slice(0, 6).map(h => `
      <div class="lp-hist-item" onclick="window._app._loadHistory('${h.id}')">
        <i class="fas fa-utensils lp-hist-icon" style="color:#d4af37"></i>
        <div class="lp-hist-topic">${this._esc((h.dish || h.topic || '').slice(0, 28))}</div>
        <div class="lp-hist-time">${this._relTime(h.ts)}</div>
        <button class="lp-hist-delete" onclick="event.stopPropagation();window._app._delHistory('${h.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>`).join('');
  }

  _renderSidebarSaved() {
    if (!this.el.lpSavedList) return;
    if (!this.saved.length) {
      this.el.lpSavedList.innerHTML = '<div class="lp-hist-empty">No saved recipes yet.</div>';
      return;
    }
    this.el.lpSavedList.innerHTML = this.saved.slice(0, 5).map(s => `
      <div class="lp-hist-item" onclick="window._app._loadSaved('${s.id}')">
        <i class="fas fa-star lp-hist-icon" style="color:#d4af37"></i>
        <div class="lp-hist-topic">${this._esc((s.dish || s.topic || '').slice(0, 28))}</div>
        <div class="lp-hist-time">${this._relTime(s.savedAt)}</div>
        <button class="lp-hist-delete" onclick="event.stopPropagation();window._app._delSaved('${s.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>`).join('');
  }

  _openHistModal() { this._renderHistModal(); this._openModal('histModal'); }

  _renderHistModal(filter = 'all', query = '') {
    if (!this.el.histList) return;
    let filt = this.history;
    if (filter !== 'all') filt = filt.filter(h => h.tool === filter);
    if (query) filt = filt.filter(h => (h.dish || h.topic || '').toLowerCase().includes(query.toLowerCase()));

    if (!filt.length) {
      this.el.histList.innerHTML = '';
      if (this.el.histEmpty) this.el.histEmpty.style.display = 'flex';
      return;
    }
    if (this.el.histEmpty) this.el.histEmpty.style.display = 'none';

    const groups = {};
    filt.forEach(h => { const g = this._dateGroup(h.ts); if (!groups[g]) groups[g] = []; groups[g].push(h); });

    this.el.histList.innerHTML = Object.entries(groups).map(([g, items]) =>
      `<div class="hist-group-lbl">${g}</div>
       ${items.map(h => `
         <div class="hist-item" onclick="window._app._loadHistory('${h.id}')">
           <div class="hist-tool-av" style="color:#d4af37;background:rgba(212,175,55,.1)">
             <i class="fas fa-utensils"></i>
           </div>
           <div class="hist-info">
             <div class="hist-topic">${this._esc((h.dish || h.topic || '').slice(0, 65))}</div>
             <div class="hist-meta">
               <span class="hist-tag">${h.tool}</span>
               <span class="hist-time">${this._relTime(h.ts)}</span>
             </div>
           </div>
           <div class="hist-acts">
             <button class="hist-del" onclick="event.stopPropagation();window._app._delHistory('${h.id}')">
               <i class="fas fa-trash"></i>
             </button>
           </div>
         </div>`).join('')}`
    ).join('');
  }

  _loadHistory(id) { const h = this.history.find(x => x.id === id); if (!h?.data) return; this._closeModal('histModal'); this.currentData = h.data; this.tool = h.tool || 'recipe'; this._renderResult(h.data); this._showToolbar(true); this._toast('info', 'fa-history', `Loaded: ${(h.dish || h.topic || '').slice(0, 40)}`); }
  _delHistory(id) { this.history = this.history.filter(x => x.id !== id); this._save('rm_history', this.history); this._renderSidebarHistory(); this._updateAllStats(); this._renderHistModal(); }
  _openSavedModal() { this._renderSavedModal(); this._openModal('savedModal'); }

  _renderSavedModal() {
    if (!this.el.savedList) return;
    if (this.el.savedCount) this.el.savedCount.textContent = `${this.saved.length} recipe${this.saved.length !== 1 ? 's' : ''}`;
    if (!this.saved.length) {
      this.el.savedList.innerHTML = '';
      if (this.el.savedEmpty) this.el.savedEmpty.style.display = 'flex';
      return;
    }
    if (this.el.savedEmpty) this.el.savedEmpty.style.display = 'none';
    this.el.savedList.innerHTML = this.saved.map(s => `
      <div class="hist-item" onclick="window._app._loadSaved('${s.id}')">
        <div class="hist-tool-av" style="color:#d4af37;background:rgba(212,175,55,.1)">
          <i class="fas fa-star"></i>
        </div>
        <div class="hist-info">
          <div class="hist-topic">${this._esc((s.dish || s.topic || '').slice(0, 65))}</div>
          <div class="hist-meta">
            <span class="hist-tag">${s.tool}</span>
            <span class="hist-time">Saved ${this._relTime(s.savedAt)}</span>
          </div>
        </div>
        <div class="hist-acts">
          <button class="hist-del" onclick="event.stopPropagation();window._app._delSaved('${s.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`).join('');
  }

  _loadSaved(id) { const s = this.saved.find(x => x.id === id); if (!s?.data) return; this._closeModal('savedModal'); this.currentData = s.data; this.tool = s.tool || 'recipe'; this._renderResult(s.data); this._showToolbar(true); this._toast('success', 'fa-star', 'Loaded saved recipe!'); }
  _delSaved(id) { this.saved = this.saved.filter(x => x.id !== id); this._save('rm_saved', this.saved); this._updateAllStats(); this._renderSavedModal(); this._renderSidebarSaved(); }

  // ─── SETTINGS ────────────────────────────────────────────────────────────────

  _openSettingsModal() {
    if (this.el.nameInput) this.el.nameInput.value = this.userName;
    if (this.el.defaultLangSel) this.el.defaultLangSel.value = this.prefs.defaultLanguage || 'English';

    const theme = document.documentElement.dataset.theme || 'dark';
    this._qsa('[data-theme-btn]').forEach(b => b.classList.toggle('active', b.dataset.themeBtn === theme));

    const pdft = this.pdfTheme || 'dark';
    this._qsa('[data-pdf-theme]').forEach(b => b.classList.toggle('active', b.dataset.pdfTheme === pdft));

    const fs = document.documentElement.dataset.font || 'small';
    this._qsa('.font-sz').forEach(b => b.classList.toggle('active', b.dataset.size === fs));

    if (this.el.dsStats) {
      const kb = Math.round((JSON.stringify(this.history).length + JSON.stringify(this.saved).length) / 1024);
      this.el.dsStats.innerHTML = `
        <div class="ds-stat"><span class="ds-val">${this.history.length}</span><div class="ds-lbl">History</div></div>
        <div class="ds-stat"><span class="ds-val">${this.saved.length}</span><div class="ds-lbl">Saved</div></div>
        <div class="ds-stat"><span class="ds-val">${this.sessions}</span><div class="ds-lbl">Sessions</div></div>
        <div class="ds-stat"><span class="ds-val">${kb}KB</span><div class="ds-lbl">Storage</div></div>
        <div class="ds-stat"><span class="ds-val">${this.totalWords.toLocaleString()}</span><div class="ds-lbl">Words</div></div>
        <div class="ds-stat"><span class="ds-val">${this.streak.count}</span><div class="ds-lbl">Streak</div></div>
        <div class="ds-stat"><span class="ds-val">${this.streak.bestStreak}</span><div class="ds-lbl">Best</div></div>
        <div class="ds-stat"><span class="ds-val">${this.totalRecipes}</span><div class="ds-lbl">Recipes</div></div>
        <div class="ds-stat"><span class="ds-val">${this.xp}</span><div class="ds-lbl">XP</div></div>`;
    }

    this._renderAvatarPickerInSettings();
    this._openModal('settingsModal');
  }

  _renderAvatarPickerInSettings() {
    const container = this._el('avatarPickerSettings');
    if (!container) return;
    container.innerHTML = `
      <div style="margin-bottom:8px;font-size:.75rem;color:#d4af37;text-transform:uppercase;letter-spacing:.06em">Choose Emoji</div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;margin-bottom:12px">
        ${AVATAR_EMOJIS.map((emoji, i) => `
          <button style="width:36px;height:36px;border-radius:50%;border:2px solid ${i === this.avatarEmojiIdx ? '#d4af37' : 'rgba(255,255,255,.1)'};background:rgba(255,255,255,.05);font-size:1.1rem;cursor:pointer;transition:all .2s"
                  onclick="window._app._setAvatarEmoji(${i})">${emoji}</button>
        `).join('')}
      </div>`;
  }

  _saveName() {
    const name = this.el.nameInput?.value?.trim();
    if (!name || name.length < 2) { this._toast('error', 'fa-times', 'Name must be at least 2 characters.'); return; }
    this.userName = name;
    localStorage.setItem('rm_user', name);
    this._updateUserUI();
    this._warmupAndTrack();
    this._toast('success', 'fa-check', 'Name updated!');
  }

  _saveDefaultLang() {
    const lang = this.el.defaultLangSel?.value;
    if (!lang) return;
    this.prefs.defaultLanguage = lang;
    this._save('rm_prefs', this.prefs);
    this._toast('success', 'fa-check', `Default language: ${lang}`);
  }

  _setPdfTheme(theme) {
    this.pdfTheme = theme;
    this.prefs.pdfTheme = theme;
    this._save('rm_prefs', this.prefs);
    this._qsa('[data-pdf-theme]').forEach(b => b.classList.toggle('active', b.dataset.pdfTheme === theme));
    if (this.el.pdfBtn) this.el.pdfBtn.setAttribute('data-theme', theme === 'dark' ? '🌙' : '☀️');
    this._toast('info', 'fa-file-pdf', `PDF theme: ${theme === 'dark' ? '🌙 Dark' : '☀️ Light'}`);
  }

  _exportData() {
    const obj = {
      exported: new Date().toISOString(),
      app: ROUXMIND.BRAND,
      developer: ROUXMIND.DEVELOPER,
      website: ROUXMIND.WEBSITE,
      userName: this.userName,
      sessions: this.sessions,
      history: this.history,
      saved: this.saved,
      preferences: this.prefs,
      streak: this.streak,
      totalWords: this.totalWords,
      totalRecipes: this.totalRecipes,
      xp: this.xp,
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rouxmind-backup-${Date.now()}.json`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this._toast('success', 'fa-download', 'Backup exported!');
  }

  _importData(file) {
    const r = new FileReader();
    r.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        if (d.history) this.history = d.history;
        if (d.saved) this.saved = d.saved;
        if (d.preferences) this.prefs = d.preferences;
        if (d.streak) this.streak = d.streak;
        if (d.userName) this.userName = d.userName;
        if (d.totalWords) this.totalWords = d.totalWords;
        if (d.sessions) this.sessions = d.sessions;
        if (d.totalRecipes) this.totalRecipes = d.totalRecipes;
        if (d.xp) this.xp = d.xp;
        this._save('rm_history', this.history);
        this._save('rm_saved', this.saved);
        this._save('rm_prefs', this.prefs);
        this._saveStreak();
        this._saveSessions();
        localStorage.setItem('rm_total_words', String(this.totalWords));
        localStorage.setItem('rm_total_recipes', String(this.totalRecipes));
        localStorage.setItem('rm_xp', String(this.xp));
        if (d.userName) localStorage.setItem('rm_user', d.userName);
        this._updateAllStats();
        this._renderSidebarHistory();
        this._renderSidebarSaved();
        this._updateUserUI();
        this._toast('success', 'fa-check', 'Backup restored! Reloading…');
        setTimeout(() => location.reload(), 1600);
      } catch { this._toast('error', 'fa-times', 'Invalid backup file.'); }
    };
    r.readAsText(file);
  }

  _clearAllData() {
    this._confirm('⚠️ Delete ALL data? This cannot be undone.', () => {
      Object.keys(localStorage).filter(k => k.startsWith('rm_')).forEach(k => localStorage.removeItem(k));
      this._toast('info', 'fa-trash', 'All data cleared. Reloading…');
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  _toggleTheme() {
    const cur = document.documentElement.dataset.theme || 'dark';
    this._setTheme(cur === 'dark' ? 'light' : cur === 'light' ? 'golden' : 'dark');
  }

  _setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (this.el.themeIcon) {
      this.el.themeIcon.className = theme === 'dark' ? 'fas fa-moon' : theme === 'golden' ? 'fas fa-star' : 'fas fa-sun';
    }
    this._qsa('[data-theme-btn]').forEach(b => b.classList.toggle('active', b.dataset.themeBtn === theme));
    this.prefs.theme = theme;
    this._save('rm_prefs', this.prefs);
  }

  _setFontSize(size) {
    document.documentElement.setAttribute('data-font', size);
    this._qsa('.font-sz').forEach(b => b.classList.toggle('active', b.dataset.size === size));
    this.prefs.fontSize = size;
    this._save('rm_prefs', this.prefs);
  }

  _applyPrefs() {
    this._setTheme(this.prefs.theme || 'dark');
    this._setFontSize(this.prefs.fontSize || 'small');
    if (this.prefs.pdfTheme) this.pdfTheme = this.prefs.pdfTheme;
  }

  // ─── SIDEBAR & FOCUS MODE ────────────────────────────────────────────────────

  _toggleSidebar() {
    if (!this.el.leftPanel) return;
    if (window.innerWidth <= 1024) {
      const isOpen = this.el.leftPanel.classList.toggle('mobile-open');
      if (this.el.sbBackdrop) this.el.sbBackdrop.classList.toggle('visible', isOpen);
      if (this.el.sbToggle) this.el.sbToggle.setAttribute('aria-expanded', String(isOpen));
    } else {
      const isCollapsed = this.el.leftPanel.classList.toggle('collapsed');
      this.focusMode = isCollapsed;
      if (this.el.focusModeBtn) {
        this.el.focusModeBtn.innerHTML = isCollapsed
          ? '<i class="fas fa-compress-alt"></i> <span>Exit</span>'
          : '<i class="fas fa-expand-alt"></i> <span>Focus</span>';
      }
    }
  }

  _closeSidebar() {
    if (!this.el.leftPanel) return;
    this.el.leftPanel.classList.remove('mobile-open');
    if (this.el.sbBackdrop) this.el.sbBackdrop.classList.remove('visible');
    if (this.el.sbToggle) this.el.sbToggle.setAttribute('aria-expanded', 'false');
  }

  _toggleFocus() { this._toggleSidebar(); }

  _initSwipeGestures() {
    let startX = 0;
    document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', e => {
      if (window.innerWidth > 1024) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 60 && startX < 35) {
        if (this.el.leftPanel) { this.el.leftPanel.classList.add('mobile-open'); if (this.el.sbBackdrop) this.el.sbBackdrop.classList.add('visible'); }
      } else if (dx < -60) {
        this._closeSidebar();
      }
    }, { passive: true });
  }

  // ─── BACK TO TOP ─────────────────────────────────────────────────────────────

  _initBackToTop() {
    if (!this.el.outArea || !this.el.backToTopBtn) return;
    this.el.outArea.addEventListener('scroll', () => {
      if (this.el.outArea.scrollTop > 400) this.el.backToTopBtn.classList.add('is-visible');
      else this.el.backToTopBtn.classList.remove('is-visible');
    });
    this.el.backToTopBtn.onclick = () => {
      this.el.outArea.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // ─── ABOUT SECTION ───────────────────────────────────────────────────────────

  _toggleAbout() {
    const content = this.el.aboutContent;
    const chevron = this.el.aboutChevron;
    if (!content) return;
    const isOpen = content.classList.toggle('open');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  // ─── DEMO SYSTEM ─────────────────────────────────────────────────────────────

  _initDemoSystem() {
    this.demoCanvas = document.createElement('canvas');
    this.demoCanvas.id = 'demoCanvas';
    Object.assign(this.demoCanvas.style, {
      display: 'none', position: 'fixed', inset: '0',
      width: '100%', height: '100%',
      zIndex: '9990', pointerEvents: 'all', cursor: 'pointer',
    });
    document.body.appendChild(this.demoCanvas);

    this.demoTooltip = document.createElement('div');
    this.demoTooltip.id = 'demoTooltip';
    Object.assign(this.demoTooltip.style, {
      display: 'none', position: 'fixed', zIndex: '9999',
      background: 'rgba(5,10,30,.97)',
      border: '1.5px solid rgba(212,175,55,.5)',
      borderRadius: '18px',
      boxShadow: '0 24px 64px rgba(0,0,0,.7)',
      padding: '20px', maxWidth: '360px', minWidth: '260px',
      fontFamily: 'Inter,sans-serif',
    });
    document.body.appendChild(this.demoTooltip);

    window.addEventListener('resize', () => {
      if (this.demoCanvas.style.display !== 'none') this._drawDemoSpotlight();
    });
  }

  _drawDemoSpotlight(rect) {
    const canvas = this.demoCanvas;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,8,0.78)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (rect) {
      const pad = 10, r = 12;
      const x = rect.left - pad, y = rect.top - pad;
      const w = rect.width + pad * 2, h = rect.height + pad * 2;

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath(); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(212,175,55,0.9)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#d4af37';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath(); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  _openDemo() {
    this.demoStep = 0;
    this.demoCanvas.width = window.innerWidth;
    this.demoCanvas.height = window.innerHeight;
    this.demoCanvas.style.display = 'block';
    this.demoTooltip.style.display = 'block';

    let hint = this._el('demoCHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'demoCHint';
      hint.className = 'demo-canvas-hint';
      hint.innerHTML = '<i class="fas fa-hand-pointer"></i> Click dark area to advance · <kbd>→</kbd> or <kbd>Esc</kbd>';
      document.body.appendChild(hint);
    }
    hint.style.display = 'block';

    this.demoCanvas.onclick = () => {
      if (this.demoStep < 7) this._nextDemo();
      else this._closeDemo();
    };

    this._renderDemoStep();
  }

  _closeDemo() {
    if (this.demoCanvas) this.demoCanvas.style.display = 'none';
    if (this.demoTooltip) this.demoTooltip.style.display = 'none';
    const hint = this._el('demoCHint');
    if (hint) hint.style.display = 'none';
    this._qsa('.demo-highlighted').forEach(el => el.classList.remove('demo-highlighted'));
  }

  _renderDemoStep() {
    const steps = [
      { title: 'Welcome to RouxMind 🍳', desc: 'Generate delicious recipes from your ingredients using AI. Just enter what you have!', icon: 'fa-utensils', color: '#d4af37' },
      { title: 'Enter Ingredients 📝', desc: 'Type your ingredients or upload a photo. AI will detect everything!', icon: 'fa-pencil-alt', color: '#00d4ff', targetId: 'emptyWizardBtn' },
      { title: 'Choose Your Spice 🌶️', desc: 'Select your preferred spice level from Mild to Indian hot!', icon: 'fa-pepper-hot', color: '#ffae00' },
      { title: 'Set Servings 👥', desc: 'How many people are you cooking for? Adjust servings easily.', icon: 'fa-users', color: '#00ff88' },
      { title: 'Watch AI Cook 🔥', desc: 'Recipe streams live to your screen — see it being written in real-time!', icon: 'fa-stream', color: '#bf00ff' },
      { title: 'Get Your Recipe 📄', desc: 'Beautiful formatted recipe with ingredients, instructions, and nutrition.', icon: 'fa-file-alt', color: '#d4af37' },
      { title: 'Save & Share 💾', desc: 'Save to your library, download PDF, or share with friends!', icon: 'fa-share-alt', color: '#00d4ff' },
      { title: 'Keep Cooking! 🎯', desc: 'Track your cooking streak, earn XP, and become a Culinary Legend!', icon: 'fa-fire', color: '#ff4444', isLast: true },
    ];

    const step = steps[this.demoStep];
    if (!step) return;

    this._qsa('.demo-highlighted').forEach(el => el.classList.remove('demo-highlighted'));
    let targetRect = null;

    if (step.targetId) {
      const target = this._el(step.targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => {
          targetRect = target.getBoundingClientRect();
          this._drawDemoSpotlight(targetRect);
          this._placeDemoTooltip(targetRect);
          target.classList.add('demo-highlighted');
        }, 200);
      }
    } else {
      this._drawDemoSpotlight(null);
      this._placeDemoTooltipCenter();
    }

    const dotsHtml = steps.map((_, i) => {
      const s = i === this.demoStep ? 'active' : i < this.demoStep ? 'done' : 'pending';
      return `<button class="demo-tt-dot demo-dot-${s}" onclick="window._app._jumpDemo(${i})" title="Step ${i+1}">
        ${i < this.demoStep ? '<i class="fas fa-check"></i>' : (i + 1)}
      </button>`;
    }).join('');

    const pct = Math.round(((this.demoStep + 1) / steps.length) * 100);

    this.demoTooltip.innerHTML = `
      <div class="demo-tt-top">
        <div class="demo-tt-step-badge">Step ${this.demoStep + 1} of ${steps.length}</div>
        <button class="demo-tt-x" onclick="window._app._closeDemo()" title="Close (Esc)">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="demo-tt-icon-row">
        <div class="demo-tt-icon-wrap" style="--demo-color:${step.color};background:${step.color}18;border:2px solid ${step.color}44">
          <i class="fas ${step.icon}" style="color:${step.color};font-size:1.6rem"></i>
        </div>
        <div class="demo-tt-titles">
          <div class="demo-tt-title" style="color:${step.color}">${step.title}</div>
          <div class="demo-tt-subtitle">RouxMind v2.0</div>
        </div>
      </div>
      <div class="demo-tt-progress">
        <div class="demo-tt-prog-bar">
          <div class="demo-tt-prog-fill" style="width:${pct}%;background:${step.color}"></div>
        </div>
        <div class="demo-tt-dots">${dotsHtml}</div>
      </div>
      <div class="demo-tt-content">${step.desc}</div>
      <div class="demo-tt-footer">
        <button class="demo-btn-prev" onclick="window._app._prevDemo()" ${this.demoStep === 0 ? 'disabled' : ''} title="Previous (←)">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <div class="demo-tt-nav-info">
          <kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>Esc</kbd> close
        </div>
        ${step.isLast
          ? `<button class="demo-btn-finish" onclick="window._app._closeDemo();window._app._openWizard();">
               <i class="fas fa-rocket"></i> Start Cooking!
             </button>`
          : `<button class="demo-btn-next" onclick="window._app._nextDemo()">
               Next →
             </button>`}
      </div>`;
  }

  _nextDemo() { if (this.demoStep < 7) { this.demoStep++; this._renderDemoStep(); } }
  _prevDemo() { if (this.demoStep > 0) { this.demoStep--; this._renderDemoStep(); } }
  _jumpDemo(step) { this.demoStep = step; this._renderDemoStep(); }

  _placeDemoTooltip(rect) {
    if (!this.demoTooltip || !rect) { this._placeDemoTooltipCenter(); return; }
    if (window.innerWidth <= 640) { this._placeDemoTooltipCenter(); return; }
    const TW = 380, TH = 520, M = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = Math.min(TW, vw - M * 2);
    this.demoTooltip.style.width = w + 'px';
    this.demoTooltip.style.maxHeight = (vh - M * 2) + 'px';
    this.demoTooltip.style.overflowY = 'auto';
    this.demoTooltip.style.bottom = 'auto';
    this.demoTooltip.style.right = 'auto';

    const fits = {
      below: rect.bottom + TH + M < vh,
      above: rect.top - TH - M > 0,
      right: rect.right + w + M < vw,
      left: rect.left - w - M > 0,
    };

    let top, left, placed = false;
    const order = ['below', 'right', 'above', 'left'];
    for (const dir of order) {
      if (dir === 'below' && fits.below) { top = rect.bottom + M; left = Math.max(M, Math.min(vw - w - M, rect.left + rect.width / 2 - w / 2)); placed = true; break; }
      if (dir === 'right' && fits.right) { top = Math.max(M, Math.min(vh - TH - M, rect.top + rect.height / 2 - TH / 2)); left = rect.right + M; placed = true; break; }
      if (dir === 'above' && fits.above) { top = rect.top - TH - M; left = Math.max(M, Math.min(vw - w - M, rect.left + rect.width / 2 - w / 2)); placed = true; break; }
      if (dir === 'left' && fits.left) { top = Math.max(M, Math.min(vh - TH - M, rect.top + rect.height / 2 - TH / 2)); left = rect.left - w - M; placed = true; break; }
    }

    if (!placed) { this._placeDemoTooltipCenter(); return; }

    this.demoTooltip.style.top = top + 'px';
    this.demoTooltip.style.left = left + 'px';
  }

  _placeDemoTooltipCenter() {
    if (!this.demoTooltip) return;
    const isMobile = window.innerWidth <= 640;
    if (isMobile) {
      Object.assign(this.demoTooltip.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0', top: 'auto',
        transform: 'none', width: '100%', maxWidth: '100%',
        borderRadius: '24px 24px 0 0', padding: '20px',
        maxHeight: '70vh', overflowY: 'auto',
      });
    } else {
      const w = Math.min(380, window.innerWidth - 32);
      Object.assign(this.demoTooltip.style, {
        width: w + 'px', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', bottom: 'auto', right: 'auto',
        maxHeight: (window.innerHeight - 40) + 'px', overflowY: 'auto',
      });
    }
  }

  // ─── MODAL SYSTEM ────────────────────────────────────────────────────────────

  _openModal(id) {
    const el = this._el(id);
    if (!el) return;
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const f = el.querySelector('input, textarea, button, [tabindex]');
      if (f) f.focus();
    }, 120);
  }

  _closeModal(id) {
    const el = this._el(id);
    if (!el) return;
    el.style.display = 'none';
    if (!this._qs('.modal-overlay[style*="flex"]')) document.body.style.overflow = '';
  }

  _closeAllModals() {
    this._qsa('.modal-overlay').forEach(m => { m.style.display = 'none'; });
    document.body.style.overflow = '';
    this._closeDropdown();
    this._closeDemo();
  }

  _confirm(msg, cb) {
    if (this.el.confirmMsg) this.el.confirmMsg.textContent = msg;
    this.confirmCb = cb;
    this._openModal('confirmModal');
  }

  _toggleDropdown() { if (this.el.avDropdown) this.el.avDropdown.classList.toggle('open'); }
  _closeDropdown() { if (this.el.avDropdown) this.el.avDropdown.classList.remove('open'); }

  // ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────

  _toast(type, icon, msg, dur = 4200) {
    if (!this.el.toastContainer) return;
    while (this.el.toastContainer.children.length >= 4) {
      this.el.toastContainer.removeChild(this.el.toastContainer.firstChild);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icon}"></i><span>${this._esc(msg)}</span>`;
    t.setAttribute('role', 'alert');
    t.addEventListener('click', () => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); });
    this.el.toastContainer.appendChild(t);
    setTimeout(() => {
      if (t.parentNode) { t.classList.add('removing'); setTimeout(() => { if (t.parentNode) t.remove(); }, 300); }
    }, dur);
  }

  // ─── ALL EVENT BINDINGS ──────────────────────────────────────────────────────

  _bindAll() {
    const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

    on(this.el.sbToggle, 'click', () => this._toggleSidebar());
    on(this.el.sbBackdrop, 'click', () => this._closeSidebar());

    on(this.el.navWizard, 'click', () => this._openWizard());
    on(this.el.navHistory, 'click', () => this._openHistModal());
    on(this.el.navSaved, 'click', () => this._openSavedModal());
    on(this.el.navSettings, 'click', () => this._openSettingsModal());
    on(this.el.navFocus, 'click', () => this._toggleFocus());
    on(this.el.demoReplayBtn, 'click', () => this._openDemo());

    on(this.el.themeBtn, 'click', () => this._toggleTheme());
    on(this.el.settingsBtn, 'click', () => this._openSettingsModal());
    on(this.el.wizardHeaderBtn, 'click', () => this._openWizard());

    const emptyWizBtn = this._el('emptyWizardBtn');
    on(emptyWizBtn, 'click', () => this._openWizard());

    if (this.el.homeLink) this.el.homeLink.addEventListener('click', e => { e.preventDefault(); this._clearOutput(); this._showToolbar(false); });
    if (this.el.dhLogo) this.el.dhLogo.addEventListener('click', () => { this._clearOutput(); this._showToolbar(false); });

    on(this.el.lpHistAll, 'click', () => this._openHistModal());
    on(this.el.lpSavedAll, 'click', () => this._openSavedModal());
    on(this.el.aboutToggleBtn, 'click', () => this._toggleAbout());

    on(this.el.avBtn, 'click', e => { e.stopPropagation(); this._toggleDropdown(); });
    on(this.el.avHist, 'click', () => { this._closeDropdown(); this._openHistModal(); });
    on(this.el.avSaved, 'click', () => { this._closeDropdown(); this._openSavedModal(); });
    on(this.el.avSettings, 'click', () => { this._closeDropdown(); this._openSettingsModal(); });
    on(this.el.avClear, 'click', () => { this._closeDropdown(); this._confirm('Clear ALL data? Cannot be undone.', () => this._clearAllData()); });
    document.addEventListener('click', e => {
      if (!e.target.closest('#avBtn') && !e.target.closest('#avDropdown')) this._closeDropdown();
    });

    on(this.el.copyBtn, 'click', () => this._copyResult());
    on(this.el.pdfBtn, 'click', () => this._downloadPDF());
    on(this.el.saveBtn, 'click', () => this._saveNote());
    on(this.el.shareBtn, 'click', () => this._shareResult());
    on(this.el.clearBtn, 'click', () => this._clearOutput());
    on(this.el.newWizardBtn, 'click', () => this._openWizard());
    on(this.el.focusModeBtn, 'click', () => this._toggleFocus());

    on(this.el.histSearchInput, 'input', e => {
      const active = this._qs('.hist-filter.active')?.dataset?.filter || 'all';
      this._renderHistModal(active, e.target.value);
    });
    const hsc = this._el('histSearchClear');
    on(hsc, 'click', () => { if (this.el.histSearchInput) this.el.histSearchInput.value = ''; this._renderHistModal(); });
    on(this.el.clearHistBtn, 'click', () => {
      this._confirm('Clear all history?', () => {
        this.history = [];
        this._save('rm_history', this.history);
        this._renderHistModal();
        this._renderSidebarHistory();
        this._updateAllStats();
        this._toast('info', 'fa-trash', 'History cleared.');
      });
    });
    on(this.el.exportHistBtn, 'click', () => this._exportData());
    this._qsa('.hist-filter').forEach(b => {
      b.addEventListener('click', () => {
        this._qsa('.hist-filter').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        this._renderHistModal(b.dataset.filter, this.el.histSearchInput?.value || '');
      });
    });

    on(this.el.saveNameBtn, 'click', () => this._saveName());
    on(this.el.saveDefaultLangBtn, 'click', () => this._saveDefaultLang());
    on(this.el.exportDataBtn, 'click', () => this._exportData());
    on(this.el.importBackupBtn, 'click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.json';
      inp.onchange = e => { if (e.target.files[0]) this._importData(e.target.files[0]); };
      inp.click();
    });
    on(this.el.clearDataBtn, 'click', () => this._confirm('Delete ALL data? Cannot be undone.', () => this._clearAllData()));
    this._qsa('[data-theme-btn]').forEach(b => b.addEventListener('click', () => this._setTheme(b.dataset.themeBtn)));
    this._qsa('[data-pdf-theme]').forEach(b => b.addEventListener('click', () => this._setPdfTheme(b.dataset.pdfTheme)));
    this._qsa('.font-sz').forEach(b => b.addEventListener('click', () => this._setFontSize(b.dataset.size)));

    on(this.el.welcomeBtn, 'click', () => this._submitWelcome());
    on(this.el.welcomeSkip, 'click', () => this._skipWelcome());
    on(this.el.welcomeNameInput, 'keydown', e => { if (e.key === 'Enter') this._submitWelcome(); });
    on(this.el.welcomeBackBtn, 'click', () => this._dismissOverlay('welcomeBackOverlay'));

    this._qsa('[data-close]').forEach(b => b.addEventListener('click', () => this._closeModal(b.dataset.close)));
    this._qsa('.modal-close').forEach(b => {
      const ov = b.closest('.modal-overlay');
      if (ov) b.addEventListener('click', () => this._closeModal(ov.id));
    });
    this._qsa('.modal-overlay').forEach(ov => {
      ov.addEventListener('click', e => { if (e.target === ov) this._closeModal(ov.id); });
    });

    on(this.el.confirmOkBtn, 'click', () => {
      this._closeModal('confirmModal');
      if (typeof this.confirmCb === 'function') this.confirmCb();
      this.confirmCb = null;
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) this._closeSidebar();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { this._closeAllModals(); return; }
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k': e.preventDefault(); this._openWizard(); break;
          case 'h': e.preventDefault(); this._openHistModal(); break;
          case 'b': e.preventDefault(); this._toggleSidebar(); break;
          case 's': e.preventDefault(); this._saveNote(); break;
          case 'p': e.preventDefault(); this._downloadPDF(); break;
        }
      }

      if (this.demoCanvas?.style.display !== 'none') {
        if (e.key === 'ArrowRight') this._nextDemo();
        else if (e.key === 'ArrowLeft') this._prevDemo();
        return;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', () => {
  window._app = new RouxMindApp();
  window._app._renderAvatarPicker();
  console.log('%c✅ RouxMind v2.0 — All Systems Online', 'color:#d4af37;font-size:13px;font-weight:bold');
  console.log('%c🍳 Where Every Plate Tells Your Story', 'color:#00d4ff;font-size:11px');
});