// =============================================================================
// RouxMind ULTIMATE API — Pro Max 7D Luxury Edition
// File: /api/recipe.js
// Brand: RouxMind by Sooban Talha Technologies
// Tech: Mesh API (meshapi.ai) + Google Sheets + Gamification Engine
// Aesthetic: Dark Premium Luxury — Every response tells a story
// =============================================================================
// ENV REQUIRED:
// - MESH_API_KEY
// - GOOGLE_SHEETS_SPREADSHEET_ID
// - GOOGLE_SHEETS_CREDENTIALS (JSON stringified service account)
// SHEETS TABS: Logs!A:I | Users!A:F | Global!A:D
// MODELS (cheapest + fastest, DO NOT CHANGE without cost analysis):
// - Vision: google/gemini-2.5-flash-lite — $0.10/$0.40 per 1M
// - Text: google/gemma-3-4b-it — $0.04/$0.08 per 1M
// - Ultra Fast: inclusionai/ling-2.6-flash — $0.01/$0.03 CHEAPEST
// =============================================================================

import { google } from 'googleapis';

// -----------------------------------------------------------------------------
// CONFIG — LOCKED, COST-OPTIMIZED
// -----------------------------------------------------------------------------
const MESH_API_URL = 'https://meshapi.ai/v1/chat/completions';
const MESH_API_KEY = process.env.MESH_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

const VISION_MODEL = 'google/gemini-2.5-flash-lite';
const TEXT_MODEL = 'google/gemma-3-4b-it';
const ULTRA_FAST_MODEL = 'inclusionai/ling-2.6-flash';

const ALLOWED_SPICE = [1, 2, 3, 4, 5];
const ALLOWED_TIME = [1, 2, 3, 4];

// Google Auth — lazy init to avoid cold start crashes
let sheetsClient = null;
async function getSheets() {
  if (sheetsClient) return sheetsClient;
  try {
    if (!process.env.GOOGLE_SHEETS_CREDENTIALS) throw new Error('Missing GOOGLE_SHEETS_CREDENTIALS');
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
    return sheetsClient;
  } catch (e) {
    console.warn('Sheets init failed, running in degraded mode:', e.message);
    return null;
  }
}

// Cache 5m
let globalStatsCache = { total: 0, users: 0, topDish: 'N/A', lastFetch: 0, dishes: {} };
const CACHE_TTL = 300_000;

// Rate limit in-memory (Vercel serverless: per instance)
const rateMap = new Map();
function checkRateLimit(ip, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count <= limit;
}

// -----------------------------------------------------------------------------
// MAIN HANDLER — Vercel Serverless
// -----------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Brand', 'RouxMind Pro Max 7D');
  res.setHeader('X-Powered-By', 'Mesh API + Sooban Talha Technologies');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip, 40)) {
    return res.status(429).json({ error: 'Rate limited — breathe, chef. Try in 30s.', success: false, brand: 'RouxMind' });
  }

  // ROUTES
  if (req.method === 'GET') {
    const { action } = req.query;
    if (action === 'global-stats') return handleGlobalStats(req, res);
    if (action === 'user-stats') return handleUserStats(req, res);
    if (action === 'leaderboard') return handleLeaderboard(req, res);
    if (action === 'health') {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        brand: 'RouxMind by Sooban Talha Technologies',
        aesthetic: 'Dark Premium Luxury Pro Max 7D',
        poweredBy: 'Mesh API meshapi.ai',
        models: { vision: VISION_MODEL, text: TEXT_MODEL, ultraFast: ULTRA_FAST_MODEL },
        sheetsConfigured: !!SPREADSHEET_ID,
        meshConfigured: !!MESH_API_KEY,
        features: {
          imageRecognition: true,
          textGeneration: true,
          gamification: true,
          leaderboard: true,
          streaks: true,
          xp: true,
          ranks: ['👶 Beginner', '🥉 Line Cook', '🥈 Sous Chef', '🥇 Executive Chef', '👑 Grand Master'],
          cacheTTL: CACHE_TTL,
          rateLimit: '40 req/min'
        }
      });
    }
    return res.status(405).json({ error: 'Invalid GET action. Allowed: global-stats, user-stats, leaderboard, health' });
  }

  if (req.method === 'POST') {
    return handleRecipeGeneration(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed', allowed: ['GET', 'POST', 'OPTIONS'] });
}

// -----------------------------------------------------------------------------
// GLOBAL STATS — Cached, Sheets source of truth
// -----------------------------------------------------------------------------
async function handleGlobalStats(req, res) {
  try {
    const now = Date.now();
    if (globalStatsCache.lastFetch && now - globalStatsCache.lastFetch < CACHE_TTL) {
      return res.status(200).json({ total: globalStatsCache.total, users: globalStatsCache.users, topDish: globalStatsCache.topDish, cached: true, dishes: globalStatsCache.dishes });
    }
    const sheets = await getSheets();
    if (!sheets) throw new Error('Sheets not configured');
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Global!A:D' });
    const rows = r.data.values || [];
    let total = 0, users = 0, topDish = 'N/A';
    if (rows.length > 1) {
      const last = rows[rows.length - 1];
      total = parseInt(last[1]) || 0;
      users = parseInt(last[2]) || 0;
      topDish = last[3] || 'N/A';
    }
    globalStatsCache = { total, users, topDish, lastFetch: now, dishes: globalStatsCache.dishes };
    return res.status(200).json({ total, users, topDish, cached: false });
  } catch (e) {
    console.error('Global stats err:', e);
    return res.status(200).json({ total: globalStatsCache.total, users: globalStatsCache.users, topDish: globalStatsCache.topDish, cached: true, degraded: true });
  }
}

// -----------------------------------------------------------------------------
// USER STATS — With streak recalculation (respects date midnight)
// -----------------------------------------------------------------------------
async function handleUserStats(req, res) {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username query required' });
  try {
    const sheets = await getSheets();
    if (!sheets) return res.status(200).json({ exists: false, total: 0, streak: 0, rank: '👶 Beginner', xp: 0, degraded: true });
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:F' });
    const rows = r.data.values || [];
    let row = null, idx = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]?.toLowerCase() === username.toLowerCase()) { row = rows[i]; idx = i + 1; break; }
    }
    if (!row) return res.status(200).json({ exists: false, total: 0, streak: 0, rank: '👶 Beginner', xp: 0, lastActive: null });

    let total = parseInt(row[1]) || 0;
    let streak = parseInt(row[2]) || 0;
    let lastActive = row[3] || null;
    let rank = row[4] || '👶 Beginner';
    let xp = parseInt(row[5]) || 0;

    // Streak logic: today = keep, yesterday = +1, else 0 (but not adding here unless new gen)
    if (lastActive) {
      const last = new Date(lastActive); last.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      const diff = Math.floor((today - last) / 86400000);
      if (diff === 0) {} else if (diff === 1) { /* will increment on next gen */ } else if (diff > 1) { streak = 0; }
    }

    // If streak reset needed, persist
    if (row && parseInt(row[2]) !== streak) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Users!C${idx}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[streak]] }
      });
    }

    return res.status(200).json({ exists: true, total, streak, rank, xp, lastActive });
  } catch (e) {
    console.error('User stats err:', e);
    return res.status(500).json({ error: 'Failed user stats', message: e.message });
  }
}

// -----------------------------------------------------------------------------
// LEADERBOARD — sorted total | streak | xp
// -----------------------------------------------------------------------------
async function handleLeaderboard(req, res) {
  const { type = 'total', limit = '10' } = req.query;
  try {
    const sheets = await getSheets();
    if (!sheets) return res.status(200).json({ leaderboard: [], total: 0, type, degraded: true });
    const r = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:F' });
    const rows = r.data.values || [];
    const users = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i][0]) continue;
      users.push({ name: rows[i][0], total: parseInt(rows[i][1]) || 0, streak: parseInt(rows[i][2]) || 0, rank: rows[i][4] || '👶 Beginner', xp: parseInt(rows[i][5]) || 0, lastActive: rows[i][3] || null });
    }
    if (type === 'streak') users.sort((a,b)=>b.streak-a.streak);
    else if (type === 'xp') users.sort((a,b)=>b.xp-a.xp);
    else users.sort((a,b)=>b.total-a.total);
    const lim = Math.min(Math.max(parseInt(limit)||10,1),50);
    return res.status(200).json({ leaderboard: users.slice(0,lim), total: users.length, type });
  } catch (e) {
    console.error('Leaderboard err:', e);
    return res.status(500).json({ error: 'Leaderboard failed', message: e.message });
  }
}

// -----------------------------------------------------------------------------
// RECIPE GENERATION — CORE LUXURY
// -----------------------------------------------------------------------------
async function handleRecipeGeneration(req, res) {
  const t0 = Date.now();
  const { image, dishName, servings = 2, spice = 3, time = 2, userName, useFastModel = false } = req.body || {};

  if (!image && !dishName) return res.status(400).json({ success:false, error:'Provide image or dishName' });
  if (!userName || typeof userName !== 'string' || userName.trim().length < 2) return res.status(400).json({ success:false, error:'userName required (min 2 chars)' });
  if (!ALLOWED_SPICE.includes(parseInt(spice))) return res.status(400).json({ success:false, error:'spice must be 1-5' });
  if (!ALLOWED_TIME.includes(parseInt(time))) return res.status(400).json({ success:false, error:'time must be 1-4' });

  const finalServings = Math.min(Math.max(parseInt(servings)||2,1),12);
  const finalSpice = parseInt(spice);
  const finalTime = parseInt(time);
  const user = userName.trim().slice(0,32);
  const useCheap = Boolean(useFastModel);

  let finalDish = (dishName||'').trim().slice(0,120);
  let identifiedFromImage = false;
  let tokensIn = 0, tokensOut = 0, cost = 0;
  let visionMs = 0, textMs = 0;
  let modelUsed = useCheap ? ULTRA_FAST_MODEL : TEXT_MODEL;
  let cuisine = 'International';
  let confidence = 92;

  try {
    // 1) VISION if image provided
    if (image) {
      if (typeof image !== 'string' || !image.startsWith('data:image/')) {
        // Allow also https url? but require base64 for Mesh
        if (!image.startsWith('http')) return res.status(400).json({ success:false, error:'image must be base64 data:image/... or URL' });
      }
      const vs = Date.now();
      const visionPrompt = `You are RouxMind — a Michelin-starred visual culinary AI. Identify ONLY the dish name in the image. Rules: Return 2-5 words, no adjectives, no explanation, no punctuation except spaces. Examples: Butter Chicken, Margherita Pizza, Miso Ramen. If unsure, guess closest.`;
      try {
        const vRes = await callMeshAPI(VISION_MODEL, visionPrompt, image);
        visionMs = Date.now() - vs;
        finalDish = vRes.choices?.[0]?.message?.content?.trim().replace(/["'.]/g,'').slice(0,80) || finalDish;
        identifiedFromImage = !!finalDish;
        tokensIn += 480; tokensOut += finalDish.split(/\s+/).length;
        cost += (480*0.10 + tokensOut*0.40)/1_000_000;
        modelUsed = VISION_MODEL;
      } catch (e) {
        console.warn('Vision failed, fallback to dishName:', e.message);
        if (!finalDish) throw new Error('Vision failed and no dishName provided: '+e.message);
      }
    }

    if (!finalDish) return res.status(400).json({ success:false, error:'Could not identify dish' });

    // 2) TEXT GENERATION — ULTRA PREMIUM PROMPT
    const spiceMap = {1:'Mild 🌶️ — gentle, family-friendly',2:'Medium 🌶️🌶️ — balanced warmth',3:'Hot 🌶️🌶️🌶️ — confident heat',4:'Very Hot 🔥 — bold, sweaty',5:'Wild Fire 🔥🔥 — challenge mode'};
    const timeMap = {1:'Quick — 15 min ⏱️',2:'Standard — 30-45 min ⏱️',3:'Relaxed — 1 hour 🍷',4:'Slow — 2+ hours ⏳ passion project'};
    const textModel = useCheap ? ULTRA_FAST_MODEL : TEXT_MODEL;

    const chefPrompt = `You are RouxMind — world's most refined AI chef, built by Sooban Talha Technologies, powered by Mesh API. Your voice: warm, precise, Michelin-level, with soul. You write recipes that scale perfectly.

TASK: Create a complete, luxury recipe for "${finalDish}" for ${finalServings} eater(s).

PREFERENCES:
- Spice: ${spiceMap[finalSpice]} (level ${finalSpice}/5)
- Time: ${timeMap[finalTime]}
- Servings: ${finalServings}
- Dietary: Consider ${userName}'s implicit taste — if unspecified, make universally beloved but note adaptable.

OUTPUT FORMAT — MUST FOLLOW EXACTLY, premium styling:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥘 ${finalDish.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuisine: [Detect] | Confidence: [88-98]% | For: ${finalServings} eaters

📋 INGREDIENTS — Scaled Michelin-Precise:
• [quantity] — [ingredient] — [note if needed]
• [continue, each on new line, 8-14 items]
• Finish with: To serve: [accompaniment]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍🍳 METHOD — Story + Science:
1. [Action verb] — [clear sensory cue] — [time/temp if relevant]
2. [Continue, 5-8 steps]
3. [Each step rich, concise]
4. [Last step: plating, story]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 CHEF'S TIP — RouxMind:
[One gold-level insight, technique secret, or story tie-in. 25-40 words. Warm, confident.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by RouxMind • Sooban Talha Technologies • Mesh API

STRICT RULES:
- Use • bullet for ingredients, numbered for steps
- No markdown tables
- No apologies, no preamble
- Quantities must reflect ${finalServings} servings precisely
- If spice is ${finalSpice}/5, adjust chili/pepper accordingly and mention heat balance
- Keep total under 500 words but rich
`;

    const ts = Date.now();
    const tRes = await callMeshAPI(textModel, chefPrompt, null);
    textMs = Date.now() - ts;
    let recipeText = tRes.choices?.[0]?.message?.content?.trim() || '';
    if (!recipeText) throw new Error('Empty recipe from model');

    const wordCount = recipeText.split(/\s+/).length;
    const ingredientCount = (recipeText.match(/•/g)||[]).length;
    const stepCount = (recipeText.match(/^\d+\./gm)||[]).length || (recipeText.match(/\n\d+\./g)||[]).length;

    const inputRate = useCheap ? 0.01 : 0.04;
    const outputRate = useCheap ? 0.03 : 0.08;
    tokensIn += 360; tokensOut += wordCount;
    cost += (360*inputRate + wordCount*outputRate)/1_000_000;

    cuisine = detectCuisine(finalDish, recipeText);
    confidence = 88 + Math.floor(Math.random()*10);
    if (identifiedFromImage) confidence = Math.min(98, confidence+3);

    // 3) LOG + GAMIFICATION (Sheets) — non-blocking but await for consistency
    const genData = { user, dish: finalDish, servings: finalServings, spice: finalSpice, status: 'Success', tokens: tokensIn+tokensOut, cost, time: Date.now()-t0 };
    // Fire and forget with safe await
    logToSheets(genData).catch(e=>console.warn('Log fail', e.message));
    let userStats = { total: 1, streak: 1, rank: '👶 Beginner', xp: 10 };
    try { userStats = await updateUserStats(user, genData); } catch(e){ console.warn('User stats fail', e.message); }
    updateGlobalStats().catch(e=>console.warn('Global fail', e.message));

    const totalTime = Date.now()-t0;

    return res.status(200).json({
      success: true,
      recipe: recipeText,
      dish: finalDish,
      cuisine,
      identifiedFromImage,
      stats: userStats,
      metrics: {
        responseTimeMs: totalTime,
        visionMs,
        textMs,
        modelUsed: textModel,
        modelVision: identifiedFromImage ? VISION_MODEL : null,
        tokensIn,
        tokensOut,
        totalTokens: tokensIn+tokensOut,
        cost: Math.round(cost*1000000)/1000000,
        confidence,
        ingredientCount,
        stepCount,
        wordCount,
        servings: finalServings,
        spice: finalSpice
      },
      poweredBy: 'Mesh API — meshapi.ai',
      brand: 'RouxMind Pro Max 7D • Sooban Talha Technologies'
    });

  } catch (err) {
    console.error(`Recipe gen failed [${userName}]:`, err);
    try { await logToSheets({ user: userName||'Anon', dish: dishName||'Unknown', servings: finalServings, spice: finalSpice, status: 'Failed: '+(err.message||'unknown').slice(0,120), tokens: 0, cost: 0, time: Date.now()-t0 }); } catch{}
    return res.status(500).json({ success:false, error: err.message||'Generation failed', dish: finalDish||null, poweredBy: 'Mesh API', brand: 'RouxMind' });
  }
}

// -----------------------------------------------------------------------------
// MESH API CALLER — UNIFIED
// -----------------------------------------------------------------------------
async function callMeshAPI(modelId, prompt, imageBase64) {
  if (!MESH_API_KEY) throw new Error('MESH_API_KEY not configured on server');
  const messages = [];
  if (imageBase64) {
    // Handle data URL or http url both as image_url
    messages.push({ role: 'user', content: [ { type:'text', text: prompt }, { type:'image_url', image_url:{ url: imageBase64 } } ] });
  } else {
    messages.push({ role:'user', content: prompt });
  }
  const payload = { model: modelId, messages, max_tokens: 1600, temperature: 0.72, top_p: 0.9 };
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(), 20000);
  try {
    const r = await fetch(MESH_API_URL, { method:'POST', headers:{ 'Authorization':`Bearer ${MESH_API_KEY}`, 'Content-Type':'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Mesh API ${r.status}: ${txt.slice(0,600)}`);
    }
    return await r.json();
  } finally { clearTimeout(timeout); }
}

// -----------------------------------------------------------------------------
// CUISINE DETECTION — Enhanced
// -----------------------------------------------------------------------------
function detectCuisine(dishName, recipe) {
  const map = {
    'Indian': ['curry','tikka','masala','biryani','samosa','dal','naan','ghee','cumin','turmeric','garam','butter chicken','paneer','dosa','idli'],
    'Italian': ['pasta','pizza','risotto','lasagna','parmesan','mozzarella','oregano','basil','truffle','tiramisu','gnocchi','prosciutto'],
    'Japanese': ['sushi','ramen','tempura','teriyaki','udon','miso','wasabi','tofu','dashi','mirin','nori'],
    'Mexican': ['taco','burrito','quesadilla','enchilada','guacamole','salsa','jalapeno','avocado','chipotle','al pastor'],
    'Thai': ['pad thai','tom yum','coconut','lemongrass','galangal','fish sauce','basil','peanut','green curry','red curry'],
    'French': ['croissant','baguette','ratatouille','bouillabaisse','souffle','escargot','beurre','coq au vin'],
    'Chinese': ['kung pao','chow mein','dim sum','dumpling','wok','soy','ginger','szechuan','mapo'],
    'Levantine': ['shakshuka','hummus','falafel','tahini','shawarma','tabbouleh','zaatar','pita'],
    'American': ['burger','barbecue','meatloaf','mac and cheese','fried chicken','bbq','cheeseburger']
  };
  const text = (dishName+' '+recipe).toLowerCase();
  let best = 'International', score = 0;
  for (const [cuisine, keys] of Object.entries(map)) {
    let s = 0; for (const k of keys) if (text.includes(k)) s++;
    if (s > score) { score = s; best = cuisine; }
  }
  return best;
}

// -----------------------------------------------------------------------------
// GOOGLE SHEETS LOGGERS — Keep tab names as per constraint
// -----------------------------------------------------------------------------
async function logToSheets(data) {
  try {
    const sheets = await getSheets(); if (!sheets) return;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Logs!A:I',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[ new Date().toISOString(), data.user, data.dish, data.servings, data.spice, data.status, data.tokens, data.cost, data.time ]] }
    });
  } catch (e) { console.warn('Sheets log failed', e.message); }
}

async function updateUserStats(user, data) {
  try {
    const sheets = await getSheets(); if (!sheets) return { total:1, streak:1, rank:'👶 Beginner', xp:10 };
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:F' });
    const rows = res.data.values || [];
    let idx = -1;
    for (let i=1;i<rows.length;i++) if (rows[i][0]?.toLowerCase()===user.toLowerCase()) { idx=i; break; }
    const nowIso = new Date().toISOString();
    if (idx===-1) {
      await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: 'Users!A:F', valueInputOption:'USER_ENTERED', resource:{ values:[[user,1,1,nowIso,'👶 Beginner',10]] } });
      return { total:1, streak:1, rank:'👶 Beginner', xp:10 };
    } else {
      const row = rows[idx]; let total = (parseInt(row[1])||0)+1; let streak = parseInt(row[2])||0;
      const lastActive = row[3];
      if (lastActive) {
        const last = new Date(lastActive); last.setHours(0,0,0,0);
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.floor((today-last)/86400000);
        if (diff===0) {} else if (diff===1) streak+=1; else streak=1;
      } else streak=1;
      const xp = total*3 + streak*7 + finalSafeSpiceXp(data.spice);
      const rank = getRank(total);
      const rowNum = idx+1;
      await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range:`Users!B${rowNum}:F${rowNum}`, valueInputOption:'USER_ENTERED', resource:{ values:[[total,streak,nowIso,rank,xp]] } });
      return { total, streak, rank, xp };
    }
  } catch(e){ console.warn('updateUserStats fail', e.message); return { total:0, streak:0, rank:'👶 Beginner', xp:0 }; }
}

function finalSafeSpiceXp(spice){ return (spice||3)*2; }

async function updateGlobalStats() {
  try {
    const sheets = await getSheets(); if (!sheets) return;
    const logs = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Logs!B:C' });
    const rows = logs.data.values||[];
    const users = new Set(); const dishes = {};
    for (let i=1;i<rows.length;i++){ if(rows[i][0]) users.add(rows[i][0]); if(rows[i][1]) dishes[rows[i][1]]=(dishes[rows[i][1]]||0)+1; }
    let topDish='N/A', max=0; for(const [d,c] of Object.entries(dishes)) if(c>max){max=c; topDish=d;}
    const total = Math.max(rows.length-1,0); const userCount = users.size;
    const globalResp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Global!A:D' });
    const gRows = globalResp.data.values||[]; const today = new Date(); today.setHours(0,0,0,0);
    let found=false;
    for(let i=1;i<gRows.length;i++){
      if(!gRows[i][0]) continue;
      const rd = new Date(gRows[i][0]); rd.setHours(0,0,0,0);
      if(rd.getTime()===today.getTime()){
        found=true;
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range:`Global!B${i+1}:D${i+1}`, valueInputOption:'USER_ENTERED', resource:{ values:[[total,userCount,topDish]] } });
        break;
      }
    }
    if(!found){
      await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range:'Global!A:D', valueInputOption:'USER_ENTERED', resource:{ values:[[today.toISOString(),total,userCount,topDish]] } });
    }
    globalStatsCache = { total, users:userCount, topDish, lastFetch:Date.now(), dishes };
  } catch(e){ console.warn('updateGlobal fail', e.message); }
}

function getRank(total){
  if(total>=500) return '👑 Grand Master';
  if(total>=100) return '🥇 Executive Chef';
  if(total>=50) return '🥈 Sous Chef';
  if(total>=10) return '🥉 Line Cook';
  return '👶 Beginner';
}
