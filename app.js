/* ============================================================================
   RouxMind — app.js
   Handles: onboarding, localStorage stats/history, sidebar, generation,
   mouse glow / particles, PDF export
   ============================================================================ */

const RM = {
  KEYS: {
    username: "rouxmind_username",
    total: "rouxmind_total",
    streak: "rouxmind_streak",
    lastVisit: "rouxmind_last_visit",
    rank: "rouxmind_rank",
    xp: "rouxmind_xp",
    history: "rouxmind_history",
    saved: "rouxmind_saved"
  },

  RANKS: [
    { min: 0,    name: "Kitchen Newbie", icon: "🍳" },
    { min: 100,  name: "Sous Chef",      icon: "🥈" },
    { min: 300,  name: "Head Chef",      icon: "🥇" },
    { min: 700,  name: "Master Chef",    icon: "👨‍🍳" },
    { min: 1500, name: "Culinary Legend",icon: "🏆" }
  ],

  // ---- Storage helpers ----
  get(key, fallback = null) {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  },
  set(key, value) {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  },

  // ---- User state ----
  getUsername() { return this.get(this.KEYS.username, null); },
  setUsername(name) { this.set(this.KEYS.username, name); },

  getStats() {
    return {
      total: Number(this.get(this.KEYS.total, 0)),
      streak: Number(this.get(this.KEYS.streak, 0)),
      xp: Number(this.get(this.KEYS.xp, 0)),
      rank: this.get(this.KEYS.rank, this.RANKS[0].name)
    };
  },

  rankFor(xp) {
    let r = this.RANKS[0];
    for (const rank of this.RANKS) if (xp >= rank.min) r = rank;
    return r;
  },

  updateStreak() {
    const today = new Date().toDateString();
    const last = this.get(this.KEYS.lastVisit, null);
    let streak = Number(this.get(this.KEYS.streak, 0));

    if (last === today) {
      // already counted today
    } else if (last === new Date(Date.now() - 86400000).toDateString()) {
      streak += 1; // consecutive day
    } else {
      streak = 1; // streak broken or first visit
    }
    this.set(this.KEYS.streak, streak);
    this.set(this.KEYS.lastVisit, today);
    return streak;
  },

  recordGeneration(dishTitle) {
    const total = Number(this.get(this.KEYS.total, 0)) + 1;
    const xp = Number(this.get(this.KEYS.xp, 0)) + 25;
    const rank = this.rankFor(xp);

    this.set(this.KEYS.total, total);
    this.set(this.KEYS.xp, xp);
    this.set(this.KEYS.rank, rank.name);

    const history = this.get(this.KEYS.history, []);
    history.unshift({ title: dishTitle, date: new Date().toISOString() });
    this.set(this.KEYS.history, history.slice(0, 50)); // cap history

    return { total, xp, rank };
  },

  getHistory() { return this.get(this.KEYS.history, []); },

  saveRecipe(recipe) {
    const saved = this.get(this.KEYS.saved, []);
    saved.unshift({ ...recipe, savedAt: new Date().toISOString() });
    this.set(this.KEYS.saved, saved);
  },
  getSaved() { return this.get(this.KEYS.saved, []); },
  removeSaved(index) {
    const saved = this.get(this.KEYS.saved, []);
    saved.splice(index, 1);
    this.set(this.KEYS.saved, saved);
  }
};

// ============================================================================
// ONBOARDING
// ============================================================================
function initOnboarding() {
  const modalRoot = document.getElementById("onboarding-root");
  if (!modalRoot) return;

  const username = RM.getUsername();

  if (!username) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="glass-card modal-card" style="padding:2.5rem; max-width:420px; width:90%; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🧠</div>
          <h2 class="display" style="font-size:1.6rem; margin-bottom:0.4rem;">Welcome to RouxMind!</h2>
          <p style="margin-bottom:1.5rem;">Where every plate tells your story.</p>
          <input id="onboard-name" class="input-field" placeholder="Enter your name" style="margin-bottom:0.75rem;" />
          <p class="text-muted" style="font-size:0.8rem; margin-bottom:1.5rem;">🔒 Anonymous stats only — stored on this device</p>
          <button id="onboard-start" class="btn btn-primary" style="width:100%;">🚀 Start Cooking →</button>
        </div>
      </div>`;

    document.getElementById("onboard-start").addEventListener("click", () => {
      const val = document.getElementById("onboard-name").value.trim();
      if (!val) return;
      RM.setUsername(val);
      RM.updateStreak();
      modalRoot.innerHTML = "";
      renderSidebarStats();
    });
  } else {
    const streak = RM.updateStreak();
    const stats = RM.getStats();
    const rank = RM.rankFor(stats.xp);

    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="glass-card modal-card" style="padding:2.5rem; max-width:420px; width:90%; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔥</div>
          <h2 class="display" style="font-size:1.6rem; margin-bottom:1.25rem;">Welcome back, ${escapeHtml(username)}!</h2>
          <div style="display:flex; flex-direction:column; gap:0.6rem; text-align:left; margin-bottom:1.5rem;">
            <div class="stat-pill">📋 Total Recipes: ${stats.total}</div>
            <div class="stat-pill">🔥 Streak: ${streak} day${streak === 1 ? "" : "s"}</div>
            <div class="stat-pill">${rank.icon} Rank: ${rank.name}</div>
            <div class="stat-pill">⭐ XP: ${stats.xp}</div>
          </div>
          <button id="onboard-continue" class="btn btn-primary" style="width:100%;">Continue Cooking →</button>
        </div>
      </div>`;

    document.getElementById("onboard-continue").addEventListener("click", () => {
      modalRoot.innerHTML = "";
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================================
// SIDEBAR STATS + HISTORY
// ============================================================================
function renderSidebarStats() {
  const el = document.getElementById("sidebar-stats");
  if (!el) return;
  const stats = RM.getStats();
  const rank = RM.rankFor(stats.xp);

  el.innerHTML = `
    <div style="padding:1rem 1.1rem;">
      <div class="eyebrow" style="margin-bottom:0.5rem;">Signed in as</div>
      <div style="font-weight:600; margin-bottom:1rem;">${escapeHtml(RM.getUsername() || "Guest")}</div>
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        <div class="stat-pill">📋 ${stats.total} recipes</div>
        <div class="stat-pill">🔥 ${stats.streak}-day streak</div>
        <div class="stat-pill">${rank.icon} ${rank.name}</div>
        <div class="stat-pill">⭐ ${stats.xp} XP</div>
      </div>
    </div>`;

  renderHistory();
  renderSaved();
}

function renderHistory() {
  const el = document.getElementById("sidebar-history");
  if (!el) return;
  const history = RM.getHistory();
  el.innerHTML = history.length
    ? history.slice(0, 12).map(h => `
        <div class="sidebar-item" style="font-size:0.85rem;">
          <span>🕘</span><span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(h.title)}</span>
        </div>`).join("")
    : `<div class="text-muted" style="padding:0.5rem 1.1rem; font-size:0.85rem;">No recipes yet</div>`;
}

function renderSaved() {
  const el = document.getElementById("sidebar-saved");
  if (!el) return;
  const saved = RM.getSaved();
  el.innerHTML = saved.length
    ? saved.map((r, i) => `
        <div class="sidebar-item" style="font-size:0.85rem; justify-content:space-between;">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">⭐ ${escapeHtml(r.title || "Untitled")}</span>
          <span data-remove="${i}" style="cursor:pointer; opacity:0.5;">✕</span>
        </div>`).join("")
    : `<div class="text-muted" style="padding:0.5rem 1.1rem; font-size:0.85rem;">No saved recipes</div>`;

  el.querySelectorAll("[data-remove]").forEach(node => {
    node.addEventListener("click", () => {
      RM.removeSaved(Number(node.dataset.remove));
      renderSaved();
    });
  });
}

// ============================================================================
// RECIPE GENERATION
// ============================================================================
async function generateRecipe({ dishText, imageBase64, servings, spice, time }) {
  const res = await fetch("/api/recipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: RM.getUsername() || "Anonymous",
      dishText,
      imageBase64,
      servings,
      spice,
      time
    })
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Generation failed");

  RM.recordGeneration(data.recipe.title || dishText);
  renderSidebarStats();

  return data.recipe;
}

// ============================================================================
// PDF EXPORT (uses jsPDF — loaded via CDN in recipe.html)
// ============================================================================
function downloadRecipePDF(recipe) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;
  const lineHeight = 16;
  const pageWidth = doc.internal.pageSize.getWidth();

  function addText(text, size, weight = "normal", color = "#1a1a1a") {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
    lines.forEach(line => {
      if (y > 780) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += lineHeight;
    });
  }

  addText(recipe.title || "Recipe", 22, "bold", "#8B93FF");
  addText(recipe.description || "", 11, "italic", "#555");
  y += 6;
  addText(`Servings: ${recipe.servings || "-"}   Prep: ${recipe.prepTime || "-"}   Cook: ${recipe.cookTime || "-"}   Difficulty: ${recipe.difficulty || "-"}`, 10);
  y += 12;

  addText("Ingredients", 15, "bold");
  (recipe.ingredients || []).forEach(ing => addText(`• ${ing.amount} ${ing.item}`, 11));
  y += 8;

  addText("Steps", 15, "bold");
  (recipe.steps || []).forEach(s => addText(`${s.step}. ${s.instruction}${s.duration ? ` (${s.duration})` : ""}`, 11));
  y += 8;

  if (recipe.tips?.length) {
    addText("Chef's Tips", 15, "bold");
    recipe.tips.forEach(t => addText(`💡 ${t}`, 11));
  }

  y += 10;
  addText("Generated by RouxMind — by Sooban Talha Technologies · soobantalhatech.xyz", 9, "normal", "#999");

  doc.save(`${(recipe.title || "recipe").replace(/[^a-z0-9]/gi, "_")}.pdf`);
}

// ============================================================================
// AMBIENT FX — mouse glow + floating particles
// ============================================================================
function initAmbientFX() {
  const glow = document.getElementById("mouse-glow");
  if (glow) {
    window.addEventListener("mousemove", e => {
      glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
    });
  }

  const particleHost = document.body;
  const count = window.innerWidth < 768 ? 8 : 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = 4 + Math.random() * 8;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}vw`;
    p.style.bottom = `-20px`;
    p.style.animationDuration = `${14 + Math.random() * 12}s`;
    p.style.animationDelay = `${Math.random() * 10}s`;
    particleHost.appendChild(p);
  }
}

// ============================================================================
// SIDEBAR TOGGLE (mobile)
// ============================================================================
function initSidebarToggle() {
  const toggle = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  if (!toggle || !sidebar) return;
  toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
}

// ============================================================================
// INIT
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initAmbientFX();
  initSidebarToggle();
  initOnboarding();
  renderSidebarStats();
});