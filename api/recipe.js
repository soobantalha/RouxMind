/**
 * ============================================
 * ROUXMIND - API Recipe Generator
 * Where Every Plate Tells Your Story
 * ============================================
 * 
 * Built by Sooban Talha Tech
 * Founder: Sooban Talha
 * Website: soobantalhatech.xyz
 * App URL: rouxmind.vercel.app
 * 
 * World-class backend with:
 * - Mesh API integration (3 models racing)
 * - First-success racing (abort slow models)
 * - Google Sheets webhook logging
 * - SSE streaming (live recipe generation)
 * - Image recognition (photo to ingredients)
 * - Fallback recipes (offline)
 * - Cost optimization
 * ============================================
 */

'use strict';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const ROUXMIND = {
  BRAND: 'RouxMind',
  VERSION: '2.0',
  DEVELOPER: 'Sooban Talha Tech',
  DEVSITE: 'soobantalhatech.xyz',
  WEBSITE: 'rouxmind.vercel.app',
  FOUNDER: 'Sooban Talha',
  TAGLINE: 'Where Every Plate Tells Your Story',
};

const GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL || '';

// ─── MESH API CONFIG ──────────────────────────────────────────────────────

const MESH_BASE_URL = 'https://api.meshapi.ai/v1';
const MESH_TIMEOUT_MS = 60000;
let _meshFreeModelsCache = { ids: null, ts: 0 };
const MESH_CACHE_TTL_MS = 10 * 60 * 1000;

// Pinned paid models
const PINNED_MODELS = {
  vision: 'google/gemini-2.5-flash-lite',
  recipe: 'google/gemma-3-4b-it',
  ultraFast: 'inclusionai/ling-2.6-flash'
};

// ─── DEPTH MAPS ────────────────────────────────────────────────────────────

const DEPTH_MAP = {
  quick: { wordRange: '200–400 words', maxTokens: 1200 },
  standard: { wordRange: '400–600 words', maxTokens: 1800 },
  detailed: { wordRange: '600–1000 words', maxTokens: 2400 },
  gourmet: { wordRange: '1000–1500 words', maxTokens: 3600 },
};

const SPICE_MAP = {
  1: 'Mild - No heat, beginner-friendly',
  2: 'Medium - Gentle warmth',
  3: 'Spicy - Noticeable kick',
  4: 'Hot - Serious heat',
  5: 'Indian - Maximum spice!'
};

const TIME_MAP = {
  1: 'Quick (under 30 min)',
  2: 'Medium (30-60 min)',
  3: 'Slow (1-2 hours)',
  4: 'Gourmet (2+ hours)'
};

// ─── UTILITIES ──────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

function firstSuccessOrAllFail(taggedPromises) {
  return new Promise(resolve => {
    let remaining = taggedPromises.length;
    const failures = [];
    let settled = false;
    taggedPromises.forEach(p => {
      p.then(r => {
        if (settled) return;
        if (r && r.status === 'fulfilled') {
          settled = true;
          resolve({ successes: [r], failures });
        } else {
          failures.push(r);
          remaining--;
          if (remaining <= 0 && !settled) {
            settled = true;
            resolve({ successes: [], failures });
          }
        }
      });
    });
  });
}

const log = {
  info: (...a) => console.log(`[${new Date().toISOString()}] ℹ️`, ...a),
  ok: (...a) => console.log(`[${new Date().toISOString()}] ✅`, ...a),
  warn: (...a) => console.warn(`[${new Date().toISOString()}] ⚠️`, ...a),
  error: (...a) => console.error(`[${new Date().toISOString()}] ❌`, ...a),
};

function getISTDateTime() {
  const now = new Date();
  const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${ist.getFullYear()}-${p(ist.getMonth()+1)}-${p(ist.getDate())} ${p(ist.getHours())}:${p(ist.getMinutes())}:${p(ist.getSeconds())}`;
}
function getISTDate() { return getISTDateTime().split(' ')[0]; }

// ─── GOOGLE SHEETS WEBHOOK ────────────────────────────────────────────────

async function sendToGoogleSheets(data) {
  if (!GOOGLE_WEBHOOK_URL) return false;
  try {
    const payload = {
      timestamp: data.timestamp || getISTDateTime(),
      user: data.user || 'Anonymous',
      dish: String(data.dish || '').slice(0, 200),
      servings: Number(data.servings) || 2,
      spice: Number(data.spice) || 3,
      time: Number(data.time) || 2,
      status: data.status || 'Success',
      tokens: Number(data.tokens) || 0,
      cost: Number(data.cost) || 0,
      responseTime: Number(data.responseTime) || 0,
      model: String(data.model || 'unknown').slice(0, 100),
      ingredients: String(data.ingredients || '').slice(0, 500),
      instructions: String(data.instructions || '').slice(0, 1000),
      mode: String(data.mode || 'standard').slice(0, 50),
      sessionId: data.sessionId || '',
      language: String(data.language || 'English').slice(0, 50),
      istDate: getISTDate(),
      servingsCount: Number(data.servings) || 2,
      spiceLevel: Number(data.spice) || 3,
      timePreference: Number(data.time) || 2
    };
    const res = await fetch(GOOGLE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) log.ok(`📊 Sheets ← ${data.user} | ${data.dish}`);
    else log.warn(`Sheets HTTP ${res.status}`);
    return res.ok;
  } catch (err) {
    log.warn(`Sheets non-fatal: ${err.message}`);
    return false;
  }
}

// ─── PROMPT BUILDERS ───────────────────────────────────────────────────────

function buildVisionPrompt(imageBase64) {
  return {
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Identify all ingredients visible in this image. Return ONLY a comma-separated list of ingredient names. No extra text.' },
        { type: 'image_url', image_url: { url: imageBase64 } }
      ]
    }]
  };
}

function buildRecipePrompt(input, opts) {
  const depth = DEPTH_MAP[opts.depth] || DEPTH_MAP.standard;
  const spiceLabel = SPICE_MAP[opts.spice] || SPICE_MAP[3];
  const timeLabel = TIME_MAP[opts.time] || TIME_MAP[2];
  const lang = opts.language || 'English';

  return `You are ${ROUXMIND.BRAND}, the world's most advanced AI recipe generator.
Creator: ${ROUXMIND.DEVELOPER} | Founder: ${ROUXMIND.FOUNDER}

TASK: Generate a detailed, delicious recipe using the given ingredients and preferences.

${input.startsWith('http') ? `IMAGE DETECTED INGREDIENTS: ${input}` : `INGREDIENTS: ${input}`}

PREFERENCES:
- Servings: ${opts.servings || 2} people
- Spice Level: ${spiceLabel}
- Time Preference: ${timeLabel}
- Language: ${lang}
- Depth: ${depth.wordRange}

REQUIRED OUTPUT STRUCTURE (use exactly these headings):
## 🍽️ Recipe Title

### 📋 Ingredients
- List all ingredients with quantities

### 👨‍🍳 Instructions
1. Step-by-step instructions
2. Clear, numbered steps

### ⏱️ Time & Servings
- Prep time: X minutes
- Cook time: X minutes
- Total time: X minutes
- Servings: X

### 🌶️ Spice Level
- Rating: 1-5
- Description: ${spiceLabel}

### 💡 Tips & Variations
- Chef's tips
- Substitution ideas

### 📊 Nutrition (approx per serving)
- Calories: XXX
- Protein: Xg
- Carbs: Xg
- Fat: Xg

FORMATTING RULES:
• Use ## for all section headings
• Use **bold** for emphasis
• Use - for bullet lists
• Use numbered lists for instructions
• Write in ${lang} only
• Be specific and detailed

START NOW with first ## heading. Topic: "${input}"`;
}

function buildFallbackRecipe(input, opts) {
  const spice = opts.spice || 3;
  const servings = opts.servings || 2;
  const spiceLabels = ['Mild', 'Medium', 'Spicy', 'Hot', 'Indian'];
  const spiceLabel = spiceLabels[spice-1] || 'Medium';

  return `## 🍽️ ${input} Delight

### 📋 Ingredients
- ${servings * 2} cups of ${input} base
- 1 onion, finely chopped
- 2 cloves garlic, minced
- ${spice * 0.5} tsp of spice blend
- Salt to taste
- ${servings * 0.5} cup of broth
- 1 tbsp oil
- Fresh herbs for garnish

### 👨‍🍳 Instructions
1. Heat oil in a large pan over medium heat.
2. Add onions and garlic, sauté until golden (5-7 minutes).
3. Add ${input} and spice blend, cook for 5 minutes.
4. Pour in broth, bring to simmer.
5. Cover and cook for 20 minutes, stirring occasionally.
6. Season with salt to taste.
7. Garnish with fresh herbs and serve hot.

### ⏱️ Time & Servings
- Prep time: 10 minutes
- Cook time: 25 minutes
- Total time: 35 minutes
- Servings: ${servings}

### 🌶️ Spice Level
- Rating: ${spice}/5
- Description: ${spiceLabel}

### 💡 Tips & Variations
- Add your favorite vegetables for extra nutrition
- Adjust spice level to your preference
- Pair with rice or bread for a complete meal

### 📊 Nutrition (approx per serving)
- Calories: 250-350
- Protein: 15g
- Carbs: 30g
- Fat: 10g

---
*Generated by ${ROUXMIND.BRAND} | ${ROUXMIND.DEVELOPER}*`;
}

// ─── MESH MODEL FETCHING ──────────────────────────────────────────────────

async function getMeshFreeModelIds() {
  const now = Date.now();
  if (_meshFreeModelsCache.ids && _meshFreeModelsCache.ids.length && (now - _meshFreeModelsCache.ts) < MESH_CACHE_TTL_MS) {
    return _meshFreeModelsCache.ids;
  }
  try {
    const res = await fetch(`${MESH_BASE_URL}/models`, {
      headers: { 'Authorization': `Bearer ${process.env.MESH_API_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data?.data) ? data.data
               : Array.isArray(data?.models) ? data.models
               : Array.isArray(data) ? data
               : [];

    if (!list.length) {
      log.warn(`Mesh /models: response had 0 models. Raw keys: ${Object.keys(data || {}).join(',')}`);
      return _meshFreeModelsCache.ids || [];
    }

    const isFree = m => {
      if (!m || typeof m !== 'object') return false;
      if (m.is_free === true) return true;
      if (m.free === true) return true;
      const tier = String(m.tier ?? m.pricing_tier ?? '').toLowerCase();
      if (tier === 'free') return true;
      const p = m.pricing || m.price || {};
      const numericFields = [
        p.prompt_usd_per_1k, p.completion_usd_per_1k,
        p.prompt, p.completion,
        p.input_cost_per_token, p.output_cost_per_token,
        p.input_price_per_1k, p.output_price_per_1k,
        m.prompt_price, m.completion_price,
      ].filter(v => v !== undefined && v !== null);
      if (numericFields.length && numericFields.every(v => Number(v) === 0)) return true;
      if (typeof m.cost === 'number' && m.cost === 0) return true;
      if (String(m.id || '').toLowerCase().includes(':free')) return true;
      return false;
    };

    const freeModels = list.filter(isFree);
    const freeIds = freeModels.map(m => m.id || m.model || m.name).filter(Boolean);

    if (!freeIds.length) {
      const sample = list[0];
      log.warn(`Mesh /models: fetched ${list.length} models but matched 0 as free. Sample model keys: ${Object.keys(sample || {}).join(',')} | sample: ${JSON.stringify(sample).slice(0, 400)}`);
    } else {
      log.ok(`Mesh /models: ${freeIds.length} free models found (of ${list.length} total)`);
    }

    _meshFreeModelsCache = { ids: freeIds, ts: now };
    return freeIds;
  } catch (err) {
    log.warn(`Mesh /models fetch failed: ${err.message}`);
    return _meshFreeModelsCache.ids || [];
  }
}

// ─── PHASE 1: IMAGE RECOGNITION ──────────────────────────────────────────

async function recognizeImageOneModel(modelId, prompt, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MESH_TIMEOUT_MS);
  const t0 = Date.now();
  log.info(`Vision ⚡ starting Mesh:${modelId}`);
  try {
    const res = await fetch(`${MESH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MESH_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens || 1024,
        temperature: 0.3,
        stream: false,
        messages: prompt.messages,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content || content.length < 5) throw new Error('Empty or too short response');
    log.ok(`Vision Mesh:${modelId} WON in ${Date.now() - t0}ms — ${content.length}ch`);
    return content;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function recognizeImage(imageBase64) {
  const errors = [];

  if (!process.env.MESH_API_KEY) {
    log.error('FATAL: MESH_API_KEY not set');
    throw new Error('RouxMind is configured to use Mesh API, but MESH_API_KEY is not set.');
  }

  const prompt = buildVisionPrompt(imageBase64);
  const maxTokens = 1024;

  // Priority: pinned vision model
  try {
    log.info(`Vision priority: trying pinned model ${PINNED_MODELS.vision}`);
    const pinnedResult = await recognizeImageOneModel(PINNED_MODELS.vision, prompt, maxTokens);
    log.ok(`Vision priority: ${PINNED_MODELS.vision} succeeded — ${pinnedResult.length}ch`);
    return pinnedResult;
  } catch (err) {
    log.warn(`Vision priority: ${PINNED_MODELS.vision} failed (${err.message}) — falling back to free models`);
    errors.push(`[pinned] ${PINNED_MODELS.vision}: ${err.message}`);
  }

  for (let pass = 1; pass <= 3; pass++) {
    const freeIds = await getMeshFreeModelIds();
    if (!freeIds.length) {
      log.warn(`Vision pass ${pass}: no free Mesh models available`);
      errors.push(`[pass${pass}] no free Mesh models available`);
      if (pass < 3) { await sleep(pass * 1500); continue; }
      break;
    }

    const candidates = freeIds.slice(0, 8);
    log.info(`Vision pass ${pass}: racing ${candidates.length} free Mesh models in parallel`);

    const modelPromises = candidates.map(modelId =>
      recognizeImageOneModel(modelId, prompt, maxTokens)
        .then(result => ({ status: 'fulfilled', value: result, model: modelId }))
        .catch(err => ({ status: 'rejected', reason: err, model: modelId }))
    );

    const { successes, failures } = await firstSuccessOrAllFail(modelPromises);

    if (successes.length > 0) {
      const winner = successes[0];
      log.ok(`Vision pass ${pass}: WINNER ${winner.model} — returning ${winner.value.length}ch`);
      return winner.value;
    }

    const failReasons = failures.map(f => `${f.model || 'unknown'}: ${f.reason?.message || 'unknown'}`);
    errors.push(`[pass${pass}] ${failReasons.join('; ')}`);
    log.warn(`Vision pass ${pass}: ALL Mesh models failed — ${failReasons.length} failures`);

    if (pass < 3) {
      const backoff = pass * 1500;
      log.info(`Vision pass ${pass}: backing off ${backoff}ms before retry`);
      await sleep(backoff);
    }
  }

  log.error(`Vision ALL Mesh attempts failed: ${errors.join(' | ')}`);
  return null;
}

// ─── PHASE 2: RECIPE GENERATION (Streaming) ──────────────────────────────

async function streamRecipeOneModel(modelId, prompt, onChunk, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MESH_TIMEOUT_MS);
  const t0 = Date.now();
  log.info(`Recipe ⚡ starting Mesh:${modelId}`);
  try {
    const res = await fetch(`${MESH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MESH_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens || 4096,
        temperature: 0.75,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content || content.length < 80) throw new Error('Empty or too short response');
    const chunkSize = 300;
    for (let i = 0; i < content.length; i += chunkSize) {
      onChunk(content.slice(i, i + chunkSize));
      await sleep(5);
    }
    log.ok(`Recipe Mesh:${modelId} WON in ${Date.now() - t0}ms — ${content.length}ch`);
    const tokens = data?.usage?.total_tokens || 0;
    const inputTokens = data?.usage?.prompt_tokens || 0;
    const outputTokens = data?.usage?.completion_tokens || 0;
    const costPerInput = 0.00004;
    const costPerOutput = 0.00008;
    const cost = (inputTokens / 1000) * costPerInput + (outputTokens / 1000) * costPerOutput;
    return { content, tokens, cost, responseTime: Date.now() - t0, model: modelId };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function streamRecipe(prompt, onChunk, maxTokens) {
  const errors = [];

  if (!process.env.MESH_API_KEY) {
    log.error('FATAL: MESH_API_KEY not set');
    throw new Error('RouxMind is configured to use Mesh API, but MESH_API_KEY is not set.');
  }

  // Priority: pinned recipe model
  try {
    log.info(`Recipe priority: trying pinned model ${PINNED_MODELS.recipe}`);
    const pinnedResult = await streamRecipeOneModel(PINNED_MODELS.recipe, prompt, onChunk, maxTokens);
    log.ok(`Recipe priority: ${PINNED_MODELS.recipe} succeeded — ${pinnedResult.content.length}ch`);
    return pinnedResult;
  } catch (err) {
    log.warn(`Recipe priority: ${PINNED_MODELS.recipe} failed (${err.message}) — falling back to free models`);
    errors.push(`[pinned] ${PINNED_MODELS.recipe}: ${err.message}`);
  }

  for (let pass = 1; pass <= 3; pass++) {
    const freeIds = await getMeshFreeModelIds();
    if (!freeIds.length) {
      log.warn(`Recipe pass ${pass}: no free Mesh models available`);
      errors.push(`[pass${pass}] no free Mesh models available`);
      if (pass < 3) { await sleep(pass * 1500); continue; }
      break;
    }

    const candidates = freeIds.slice(0, 8);
    log.info(`Recipe pass ${pass}: racing ${candidates.length} free Mesh models in parallel`);

    const modelPromises = candidates.map(modelId =>
      streamRecipeOneModel(modelId, prompt, onChunk, maxTokens)
        .then(result => ({ status: 'fulfilled', value: result, model: modelId }))
        .catch(err => ({ status: 'rejected', reason: err, model: modelId }))
    );

    const { successes, failures } = await firstSuccessOrAllFail(modelPromises);

    if (successes.length > 0) {
      const winner = successes[0];
      log.ok(`Recipe pass ${pass}: WINNER ${winner.model} — returning ${winner.value.content.length}ch`);
      return winner.value;
    }

    const failReasons = failures.map(f => `${f.model || 'unknown'}: ${f.reason?.message || 'unknown'}`);
    errors.push(`[pass${pass}] ${failReasons.join('; ')}`);
    log.warn(`Recipe pass ${pass}: ALL Mesh models failed — ${failReasons.length} failures`);

    if (pass < 3) {
      const backoff = pass * 1500;
      log.info(`Recipe pass ${pass}: backing off ${backoff}ms before retry`);
      await sleep(backoff);
    }
  }

  log.error(`Recipe ALL Mesh attempts failed: ${errors.join(' | ')}`);
  throw new Error('All Mesh AI models are currently busy. Please try again in a moment.');
}

// ─── SSE HELPER ────────────────────────────────────────────────────────────

function makeSSE(res) {
  return (event, data) => {
    if (res.writableEnded) return;
    try {
      res.write(`event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch { /* ignore */ }
  };
}

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Powered-By', `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`);
  res.setHeader('X-Developer', ROUXMIND.DEVELOPER);
  res.setHeader('X-Founder', ROUXMIND.FOUNDER);
  res.setHeader('X-Version', ROUXMIND.VERSION);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

// ─── MAIN HANDLER ──────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const startTime = Date.now();
  log.info(`[${reqId}] ${req.method} /api/recipe`);

  setHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  if (!process.env.MESH_API_KEY) {
    log.error('[FATAL] MESH_API_KEY not set in environment variables!');
    return res.status(500).json({ error: 'RouxMind service is misconfigured — MESH_API_KEY missing. Get a free key at meshapi.ai and set it in your environment.' });
  }

  const body = req.body || {};
  const message = String(body.message || '').trim();
  const userName = String(body.userName || 'Anonymous').trim();
  const sessionId = String(body.sessionId || reqId);
  const image = String(body.image || '').trim();

  if (!message || message === 'ping') {
    log.info(`[${reqId}] PING — ${userName}`);
    sendToGoogleSheets({ user: userName, dish: 'ping', status: 'online' }).catch(() => {});
    return res.status(200).json({
      status: 'ok',
      service: ROUXMIND.BRAND,
      version: ROUXMIND.VERSION,
      tagline: ROUXMIND.TAGLINE,
      time: getISTDateTime(),
      requestId: reqId,
    });
  }

  if (message.length < 2) return res.status(400).json({ error: 'Please enter ingredients (minimum 2 characters).' });
  if (message.length > 20000) return res.status(400).json({ error: 'Input too long (max 20,000 characters).' });

  const rawOpts = body.options || {};
  const opts = {
    depth: ['quick', 'standard', 'detailed', 'gourmet'].includes(rawOpts.depth) ? rawOpts.depth : 'standard',
    spice: Math.min(Math.max(Number(rawOpts.spice) || 3, 1), 5),
    servings: Math.min(Math.max(Number(rawOpts.servings) || 2, 1), 10),
    time: Math.min(Math.max(Number(rawOpts.time) || 2, 1), 4),
    language: String(rawOpts.language || 'English').trim().slice(0, 60),
    stream: rawOpts.stream === true,
  };

  log.info(`[${reqId}] depth:${opts.depth} | spice:${opts.spice} | servings:${opts.servings} | lang:${opts.language} | image:${!!image} | user:${userName}`);

  if (!opts.stream) {
    return res.status(400).json({ error: 'Non-streaming mode is not supported. The client must send options.stream=true.' });
  }

  sendToGoogleSheets({ user: userName, dish: message, status: 'started', sessionId }).catch(() => {});

  // ─── SSE STREAMING RESPONSE ─────────────────────────────────────────────

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sse = makeSSE(res);

  const kap = setInterval(() => {
    if (res.writableEnded) { clearInterval(kap); return; }
    try {
      res.write(`: ping ${Date.now()}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch { clearInterval(kap); }
  }, 10000);

  sse('heartbeat', { ts: Date.now(), status: 'connected', service: ROUXMIND.BRAND, requestId: reqId });

  let ingredients = message;
  let recipeContent = '';
  let recipeData = null;

  try {
    // ── Step 1: Image Recognition ──────────────────────────────────────

    if (image && image.startsWith('data:image')) {
      sse('stage', { idx: 0, label: '📸 Analyzing ingredients from your photo…' });
      const visionResult = await recognizeImage(image);
      if (visionResult) {
        ingredients = visionResult;
        sse('stage', { idx: 1, label: `🔍 Detected: ${ingredients}` });
        sse('fact', { fact: `📸 Found: ${ingredients}` });
      } else {
        sse('stage', { idx: 1, label: '⚠️ Could not detect ingredients. Using your text…' });
      }
    } else {
      sse('stage', { idx: 0, label: '📝 Using your ingredients…' });
    }

    // ── Step 2: Generate Recipe ────────────────────────────────────────

    const recipePrompt = buildRecipePrompt(ingredients, opts);
    sse('stage', { idx: 2, label: '👨‍🍳 Cooking up your recipe…' });

    const maxTokens = DEPTH_MAP[opts.depth]?.maxTokens || 2400;

    try {
      const result = await streamRecipe(recipePrompt, chunk => sse('token', { t: chunk }), maxTokens);
      recipeContent = result.content;
      recipeData = result;
      log.ok(`[${reqId}] Recipe done — ${recipeContent.length}ch | cost: $${recipeData.cost?.toFixed(6)}`);
    } catch (e) {
      log.error(`[${reqId}] Recipe generation failed: ${e.message}`);
      recipeContent = buildFallbackRecipe(ingredients, opts);
      for (let i = 0; i < recipeContent.length; i += 300) {
        sse('token', { t: recipeContent.slice(i, i + 300) });
        await sleep(4);
      }
      recipeData = { content: recipeContent, tokens: 0, cost: 0, responseTime: Date.now() - startTime, model: 'fallback' };
    }

    sse('stage', { idx: 3, label: '✨ Finalizing your recipe…' });

    // ── Step 3: Parse recipe for logging ──────────────────────────────

    let dishName = ingredients.split(',').slice(0, 3).join(', ').slice(0, 50);
    const titleMatch = recipeContent.match(/## 🍽️\s*(.+)/);
    if (titleMatch) dishName = titleMatch[1].trim();

    // ── Step 4: Send final data ────────────────────────────────────────

    clearInterval(kap);

    const final = {
      topic: ingredients,
      dish: dishName,
      ultra_long_notes: recipeContent,
      servings: opts.servings,
      spice: opts.spice,
      time: opts.time,
      language: opts.language,
      depth: opts.depth,
      tokens: recipeData?.tokens || 0,
      cost: recipeData?.cost || 0,
      responseTime: recipeData?.responseTime || (Date.now() - startTime),
      model: recipeData?.model || 'fallback',
      status: 'Success',
      powered_by: `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`,
      generated_at: getISTDateTime(),
      _version: ROUXMIND.VERSION,
    };

    sse('stage', { idx: 4, label: '✅ Complete! Your recipe is ready.', done: true });
    sse('done', final);

    log.ok(`[${reqId}] ✅ COMPLETE — ${final.responseTime}ms | user:${userName} | dish:${dishName}`);

    // Log to Google Sheets
    sendToGoogleSheets({
      user: userName,
      dish: dishName,
      servings: opts.servings,
      spice: opts.spice,
      time: opts.time,
      status: 'Success',
      tokens: final.tokens,
      cost: final.cost,
      responseTime: final.responseTime,
      model: final.model,
      ingredients: ingredients,
      instructions: recipeContent.slice(0, 500),
      mode: 'standard',
      sessionId: sessionId,
      language: opts.language,
    }).catch(() => {});

  } catch (fatal) {
    clearInterval(kap);
    log.error(`[${reqId}] FATAL: ${fatal.message}`);
    const userMsg = fatal.message?.includes('API_KEY')
      ? 'Service configuration error. Please contact the administrator.'
      : 'RouxMind is momentarily unavailable. Please try again in a few seconds.';
    sse('error', { error: userMsg, requestId: reqId });
    sendToGoogleSheets({
      user: userName,
      dish: message,
      status: 'Failed',
      sessionId: sessionId,
    }).catch(() => {});
  }

  if (!res.writableEnded) res.end();
};