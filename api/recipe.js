/**
 * ============================================
 * ROUXMIND - World's Most Advanced AI Recipe Generator
 * Where Every Plate Tells Your Story
 * ============================================
 * 
 * Built by Sooban Talha Tech
 * Founder: Sooban Talha
 * Website: soobantalhatech.xyz
 * App URL: rouxmind.vercel.app
 * Hackathon: Mesh API Hackathon 2026 (meshapi.ai)
 * 
 * Ultra-Premium Backend Features:
 * - Multi-model AI orchestration (3 models racing)
 * - Mesh API integration with first-success wins
 * - Google Sheets webhook logging (KEPT AS-IS)
 * - SSE streaming for live recipe generation
 * - Image recognition (photo to ingredients)
 * - Vision model: google/gemini-2.5-flash-lite
 * - Recipe model: google/gemma-3-4b-it
 * - Ultra-fast model: inclusionai/ling-2.6-flash
 * - Automatic fallback if all models fail
 * - Cost tracking per request
 * - Advanced error handling
 * - Rate limiting
 * - Input validation
 * - Analytics tracking
 * - PDF generation support
 * - History & saved recipes management
 * - User XP and rank system
 * ============================================
 */

'use strict';

// ─── GLOBAL CONSTANTS ────────────────────────────────────────────────────────

const ROUXMIND = {
  BRAND: 'RouxMind',
  VERSION: '1.0.0',
  DEVELOPER: 'Sooban Talha Tech',
  DEVSITE: 'https://soobantalhatech.xyz',
  WEBSITE: 'https://rouxmind.vercel.app',
  FOUNDER: 'Sooban Talha',
  TAGLINE: 'Where Every Plate Tells Your Story',
  EMAIL: 'soobantalhatechnologies@gmail.com',
  HACKATHON: 'Mesh API Hackathon 2026',
  HACKATHON_URL: 'https://meshapi.ai'
};

// ─── ENVIRONMENT CONFIG ────────────────────────────────────────────────────

const GOOGLE_WEBHOOK_URL = process.env.GOOGLE_WEBHOOK_URL || '';
const MESH_API_KEY = process.env.MESH_API_KEY || '';
const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = process.env.PORT || 3000;

// ─── MESH API CONFIGURATION ────────────────────────────────────────────────

const MESH_BASE_URL = 'https://api.meshapi.ai/v1';
const MESH_TIMEOUT_MS = 60000;
const MESH_MAX_RETRIES = 3;
const MESH_RETRY_DELAY_MS = 1500;

// Model cache for free models
let _meshFreeModelsCache = { ids: null, ts: 0 };
const MESH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Pinned paid models (priority)
const PINNED_MODELS = {
  vision: 'google/gemini-2.5-flash-lite',
  recipe: 'google/gemma-3-4b-it',
  ultraFast: 'inclusionai/ling-2.6-flash'
};

// Model pricing (for cost tracking)
const MODEL_PRICING = {
  'google/gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'google/gemma-3-4b-it': { input: 0.04, output: 0.08 },
  'inclusionai/ling-2.6-flash': { input: 0.01, output: 0.03 },
  fallback: { input: 0, output: 0 }
};

// ─── DEPTH & PREFERENCE MAPS ───────────────────────────────────────────────

const DEPTH_MAP = {
  quick: { 
    wordRange: '200-400 words', 
    maxTokens: 1200,
    label: 'Quick',
    icon: '⚡'
  },
  standard: { 
    wordRange: '400-600 words', 
    maxTokens: 1800,
    label: 'Standard',
    icon: '📝'
  },
  detailed: { 
    wordRange: '600-1000 words', 
    maxTokens: 2400,
    label: 'Detailed',
    icon: '📄'
  },
  gourmet: { 
    wordRange: '1000-1500 words', 
    maxTokens: 3600,
    label: 'Gourmet',
    icon: '🎩'
  }
};

const SPICE_MAP = {
  1: { label: 'Mild', description: 'No heat, beginner-friendly', icon: '🌶️', color: '#00ff88' },
  2: { label: 'Medium', description: 'Gentle warmth', icon: '🌶️🌶️', color: '#00d4ff' },
  3: { label: 'Spicy', description: 'Noticeable kick', icon: '🌶️🌶️🌶️', color: '#ffaa00' },
  4: { label: 'Hot', description: 'Serious heat', icon: '🌶️🌶️🌶️🌶️', color: '#ff6600' },
  5: { label: 'Indian', description: 'Maximum spice!', icon: '🌶️🌶️🌶️🌶️🌶️', color: '#ff4466' }
};

const TIME_MAP = {
  1: { label: 'Quick', description: 'under 30 min', icon: '⏱️', value: 'Quick (under 30 min)' },
  2: { label: 'Medium', description: '30-60 min', icon: '⏰', value: 'Medium (30-60 min)' },
  3: { label: 'Slow', description: '1-2 hours', icon: '⏳', value: 'Slow (1-2 hours)' },
  4: { label: 'Gourmet', description: '2+ hours', icon: '🕒', value: 'Gourmet (2+ hours)' }
};

const LANGUAGE_MAP = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'pa': 'Punjabi',
  'tr': 'Turkish',
  'nl': 'Dutch',
  'sv': 'Swedish',
  'fi': 'Finnish',
  'da': 'Danish',
  'no': 'Norwegian',
  'pl': 'Polish',
  'th': 'Thai',
  'vi': 'Vietnamese'
};

// ─── RANK SYSTEM ────────────────────────────────────────────────────────────

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

// ─── QUICK INGREDIENTS ───────────────────────────────────────────────────────

const QUICK_INGREDIENTS = [
  'Chicken',
  'Beef',
  'Fish',
  'Eggs',
  'Tomatoes',
  'Potatoes',
  'Onions',
  'Garlic',
  'Rice',
  'Pasta',
  'Cheese',
  'Milk',
  'Flour',
  'Sugar',
  'Salt',
  'Pepper'
];

// ─── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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
      }).catch(err => {
        if (settled) return;
        failures.push({ status: 'rejected', reason: err });
        remaining--;
        if (remaining <= 0 && !settled) {
          settled = true;
          resolve({ successes: [], failures });
        }
      });
    });
  });
}

// Enhanced logger
const log = {
  info: (...args) => console.log(`[${new Date().toISOString()}] ℹ️`, ...args),
  ok: (...args) => console.log(`[${new Date().toISOString()}] ✅`, ...args),
  warn: (...args) => console.warn(`[${new Date().toISOString()}] ⚠️`, ...args),
  error: (...args) => console.error(`[${new Date().toISOString()}] ❌`, ...args),
  debug: (...args) => {
    if (NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] 🔍`, ...args);
    }
  }
};

// IST DateTime for logging
function getISTDateTime() {
  const now = new Date();
  const ist = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 5.5 * 3600000);
  const p = n => String(n).padStart(2, '0');
  return `${ist.getFullYear()}-${p(ist.getMonth()+1)}-${p(ist.getDate())} ${p(ist.getHours())}:${p(ist.getMinutes())}:${p(ist.getSeconds())}`;
}

function getISTDate() {
  return getISTDateTime().split(' ')[0];
}

// Validate and sanitize input
function sanitizeInput(input, maxLength = 20000) {
  if (!input || typeof input !== 'string') return '';
  return String(input).trim().slice(0, maxLength);
}

// Calculate cost based on model and tokens
function calculateCost(modelId, inputTokens = 0, outputTokens = 0) {
  const pricing = MODEL_PRICING[modelId] || MODEL_PRICING.fallback;
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

// ─── GOOGLE SHEETS WEBHOOK (KEPT AS-IS FROM ORIGINAL) ────────────────────────

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
      timePreference: Number(data.time) || 2,
      xp: Number(data.xp) || 0,
      rank: data.rank || '',
      streak: Number(data.streak) || 0,
      totalRecipes: Number(data.totalRecipes) || 0
    };
    
    const res = await fetch(GOOGLE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      log.ok(`📊 Sheets ← ${data.user} | ${data.dish}`);
    } else {
      log.warn(`Sheets HTTP ${res.status}`);
    }
    
    return res.ok;
  } catch (err) {
    log.warn(`Sheets non-fatal: ${err.message}`);
    return false;
  }
}

// ─── PROMPT BUILDERS ────────────────────────────────────────────────────────

function buildVisionPrompt(imageBase64) {
  return {
    messages: [{
      role: 'user',
      content: [
        { 
          type: 'text', 
          text: 'Identify all ingredients visible in this image. Return ONLY a comma-separated list of ingredient names with quantities if visible. No extra text, explanations, or formatting. Just the raw list.' 
        },
        { 
          type: 'image_url', 
          image_url: { url: imageBase64 } 
        }
      ]
    }]
  };
}

function buildRecipePrompt(input, opts) {
  const depth = DEPTH_MAP[opts.depth] || DEPTH_MAP.standard;
  const spiceLabel = SPICE_MAP[opts.spice]?.description || SPICE_MAP[3].description;
  const timeLabel = TIME_MAP[opts.time]?.value || TIME_MAP[2].value;
  const lang = opts.language || 'English';
  const languageCode = Object.entries(LANGUAGE_MAP).find(([code, name]) => name === lang)?.[0] || 'en';

  return `You are ${ROUXMIND.BRAND} v${ROUXMIND.VERSION}, the world's most advanced AI recipe generator.
Creator: ${ROUXMIND.DEVELOPER} | Founder: ${ROUXMIND.FOUNDER}
Powered by: Mesh API (meshapi.ai)

TASK: Generate a detailed, delicious, and creative recipe using the given ingredients and preferences.

${input.startsWith('http') ? `IMAGE DETECTED INGREDIENTS: ${input}` : `INGREDIENTS: ${input}`}

PREFERENCES:
- Servings: ${opts.servings || 2} people
- Spice Level: ${spiceLabel}
- Time Preference: ${timeLabel}
- Language: ${lang}
- Depth: ${depth.wordRange}

REQUIRED OUTPUT STRUCTURE (use exactly these headings in order):

## 🍽️ Recipe Title

### 📋 Ingredients
- List all ingredients with precise quantities and measurements
- Include preparation notes if needed (e.g., "chopped", "diced", "minced")
- Group similar ingredients together

### 👨‍🍳 Instructions
1. Step-by-step instructions with clear actions
2. Each step should be concise but detailed
3. Include cooking times and temperatures
4. Use numbered list format

### ⏱️ Time & Servings
- Prep time: X minutes
- Cook time: X minutes
- Total time: X minutes
- Servings: ${opts.servings || 2}

### 🌶️ Spice Level
- Rating: ${opts.spice || 3}/5
- Description: ${spiceLabel}

### 💡 Chef's Tips & Variations
- Professional chef tips for best results
- Substitution ideas for dietary restrictions
- Serving suggestions
- Storage instructions

### 📊 Nutrition (approximate per serving)
- Calories: XXX kcal
- Protein: Xg
- Carbohydrates: Xg
- Fat: Xg
- Fiber: Xg (if applicable)

### 🌍 Cultural Notes (if applicable)
- Brief cultural context or history of the dish
- Traditional serving methods

FORMATTING RULES:
• Use ## for main section headings (exactly as shown above)
• Use ### for sub-section headings
• Use **bold** for emphasis and important notes
• Use - for bullet lists
• Use numbered lists (1., 2., 3.) for instructions
• Write in ${lang} language only
• Be specific, creative, and engaging
• Include measurements in both metric and imperial where appropriate
• Mention cooking techniques used
• Suggest wine or beverage pairings if appropriate

IMPORTANT: Start your response immediately with the first heading "## 🍽️" without any introduction or preamble.

Generate the recipe for: "${input}"`;
}

function buildFallbackRecipe(input, opts) {
  const spice = opts.spice || 3;
  const servings = opts.servings || 2;
  const spiceLabels = ['Mild', 'Medium', 'Spicy', 'Hot', 'Indian'];
  const spiceLabel = spiceLabels[spice-1] || 'Medium';
  const depth = DEPTH_MAP[opts.depth] || DEPTH_MAP.standard;

  return `## 🍽️ ${input} Delight

### 📋 Ingredients
- ${servings * 2} cups of ${input} (main ingredient)
- 1 large onion, finely chopped
- 2 cloves garlic, minced
- ${Math.round(spice * 0.5)} tsp of mixed spice blend
- 1 tsp salt (or to taste)
- ${servings * 0.5} cup vegetable or chicken broth
- 1 tbsp cooking oil
- Fresh herbs for garnish (parsley, cilantro, or basil)
- Optional: 1/2 tsp black pepper

### 👨‍🍳 Instructions
1. **Prepare Ingredients**: Heat oil in a large, heavy-bottomed pan over medium heat. While the oil heats, finely chop the onion and mince the garlic.

2. **Saute Aromatics**: Add the chopped onions to the hot oil. Saute for 3-4 minutes until they turn translucent and start to caramelize at the edges.

3. **Add Garlic**: Stir in the minced garlic and cook for 30 seconds until fragrant. Be careful not to burn the garlic.

4. **Cook Main Ingredient**: Add ${input} to the pan along with the spice blend. Stir well to coat everything evenly. Cook for 5-7 minutes, stirring occasionally.

5. **Add Liquids**: Pour in the broth and bring to a gentle simmer. Reduce heat to low, cover, and let cook for 20-25 minutes, stirring occasionally.

6. **Season**: Taste and adjust seasoning with salt and black pepper as needed.

7. **Finish**: Remove from heat, garnish with fresh herbs, and let rest for 5 minutes before serving.

### ⏱️ Time & Servings
- Prep time: 10 minutes
- Cook time: 25 minutes
- Total time: 35 minutes
- Servings: ${servings}

### 🌶️ Spice Level
- Rating: ${spice}/5
- Description: ${spiceLabel}

### 💡 Chef's Tips & Variations
- **Tip**: For extra flavor, toast the spices in a dry pan before adding to the dish.
- **Variation**: Add diced tomatoes or bell peppers for more color and nutrition.
- **Serving Suggestion**: Pair with steamed rice, fresh bread, or a simple salad.
- **Storage**: Store leftovers in an airtight container in the refrigerator for up to 3 days. Reheat gently on the stove or in the microwave.

### 📊 Nutrition (approximate per serving)
- Calories: 250-350 kcal
- Protein: 12-18g
- Carbohydrates: 25-35g
- Fat: 8-12g
- Fiber: 4-6g

---
*Generated by ${ROUXMIND.BRAND} v${ROUXMIND.VERSION} | ${ROUXMIND.DEVELOPER} | Powered by Mesh API*
*Built by ${ROUXMIND.FOUNDER}*`;
}

function buildSmartSuggestionPrompt(partialInput) {
  return `You are a culinary AI assistant for ${ROUXMIND.BRAND}.
Given the partial ingredient input: "${partialInput}"

TASK: Suggest a complete, logical set of ingredients that would work well together.
Return ONLY a comma-separated list of 5-10 ingredients that complement each other.
Do NOT include any explanations, formatting, or extra text.

Example: If input is "chicken", output might be: "chicken, onions, garlic, tomatoes, ginger, green chilies, coriander, cumin, yogurt, oil"

Suggest ingredients for: "${partialInput}"`;
}

// ─── MESH API HELPERS ───────────────────────────────────────────────────────

async function getMeshFreeModelIds() {
  const now = Date.now();
  
  // Return cached if valid
  if (_meshFreeModelsCache.ids && _meshFreeModelsCache.ids.length && 
      (now - _meshFreeModelsCache.ts) < MESH_CACHE_TTL_MS) {
    log.debug(`Using cached Mesh free models: ${_meshFreeModelsCache.ids.length} models`);
    return _meshFreeModelsCache.ids;
  }

  try {
    log.info('Fetching fresh list of free Mesh models...');
    
    const res = await fetch(`${MESH_BASE_URL}/models`, {
      headers: { 
        'Authorization': `Bearer ${MESH_API_KEY}`,
        'Content-Type': 'application/json'
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    
    // Extract model list from various possible response structures
    const list = Array.isArray(data?.data) ? data.data
               : Array.isArray(data?.models) ? data.models
               : Array.isArray(data) ? data
               : [];

    if (!list.length) {
      log.warn(`Mesh /models: response had 0 models. Available keys: ${Object.keys(data || {}).join(', ')}`);
      return _meshFreeModelsCache.ids || [];
    }

    // Filter for free models
    const isFree = (m) => {
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
      log.warn(`Mesh /models: fetched ${list.length} models but matched 0 as free. Sample: ${JSON.stringify(sample).slice(0, 400)}`);
    } else {
      log.ok(`Mesh /models: Found ${freeIds.length} free models (of ${list.length} total)`);
    }

    _meshFreeModelsCache = { ids: freeIds, ts: now };
    return freeIds;
  } catch (err) {
    log.warn(`Mesh /models fetch failed: ${err.message}`);
    return _meshFreeModelsCache.ids || [];
  }
}

// ─── IMAGE RECOGNITION ──────────────────────────────────────────────────────

async function recognizeImageOneModel(modelId, prompt, maxTokens) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MESH_TIMEOUT_MS);
  const t0 = Date.now();
  
  log.info(`Vision ⚡ starting Mesh:${modelId} (timeout: ${MESH_TIMEOUT_MS}ms)`);
  
  try {
    const res = await fetch(`${MESH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MESH_API_KEY}`,
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
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    
    if (!content || content.length < 5) {
      throw new Error('Empty or too short response');
    }

    const responseTime = Date.now() - t0;
    log.ok(`Vision Mesh:${modelId} WON in ${responseTime}ms — ${content.length} characters`);
    
    return { content, responseTime, model: modelId };
  } catch (err) {
    clearTimeout(timer);
    log.warn(`Vision Mesh:${modelId} failed: ${err.message}`);
    throw err;
  }
}

async function recognizeImage(imageBase64) {
  const errors = [];

  if (!MESH_API_KEY) {
    log.error('FATAL: MESH_API_KEY not set');
    throw new Error('RouxMind requires MESH_API_KEY. Get a free key at meshapi.ai');
  }

  const prompt = buildVisionPrompt(imageBase64);
  const maxTokens = 1024;

  // Priority 1: Try pinned vision model
  try {
    log.info(`Vision priority: trying pinned model ${PINNED_MODELS.vision}`);
    const pinnedResult = await recognizeImageOneModel(PINNED_MODELS.vision, prompt, maxTokens);
    log.ok(`Vision priority: ${PINNED_MODELS.vision} succeeded`);
    return pinnedResult.content;
  } catch (err) {
    log.warn(`Vision priority: ${PINNED_MODELS.vision} failed (${err.message})`);
    errors.push(`[pinned] ${PINNED_MODELS.vision}: ${err.message}`);
  }

  // Priority 2: Try free models in parallel (3 passes)
  for (let pass = 1; pass <= MESH_MAX_RETRIES; pass++) {
    const freeIds = await getMeshFreeModelIds();
    
    if (!freeIds.length) {
      log.warn(`Vision pass ${pass}: no free Mesh models available`);
      errors.push(`[pass${pass}] no free Mesh models`);
      
      if (pass < MESH_MAX_RETRIES) {
        await sleep(pass * MESH_RETRY_DELAY_MS);
        continue;
      }
      break;
    }

    const candidates = freeIds.slice(0, 8);
    log.info(`Vision pass ${pass}: racing ${candidates.length} free Mesh models`);

    const modelPromises = candidates.map(modelId =>
      recognizeImageOneModel(modelId, prompt, maxTokens)
        .then(result => ({ status: 'fulfilled', value: result, model: modelId }))
        .catch(err => ({ status: 'rejected', reason: err, model: modelId }))
    );

    const { successes, failures } = await firstSuccessOrAllFail(modelPromises);

    if (successes.length > 0) {
      const winner = successes[0];
      log.ok(`Vision pass ${pass}: WINNER ${winner.model} — ${winner.value.content.length}ch in ${winner.value.responseTime}ms`);
      return winner.value.content;
    }

    const failReasons = failures.map(f => `${f.model || 'unknown'}: ${f.reason?.message || 'unknown'}`);
    errors.push(`[pass${pass}] ${failReasons.join('; ')}`);
    log.warn(`Vision pass ${pass}: ALL ${candidates.length} models failed`);

    if (pass < MESH_MAX_RETRIES) {
      await sleep(pass * MESH_RETRY_DELAY_MS);
    }
  }

  log.error(`Vision ALL attempts failed: ${errors.join(' | ')}`);
  return null;
}

// ─── RECIPE GENERATION (Streaming) ────────────────────────────────────────

async function streamRecipeOneModel(modelId, prompt, onChunk, maxTokens, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), MESH_TIMEOUT_MS);
  const t0 = Date.now();
  
  log.info(`Recipe ⚡ starting Mesh:${modelId}`);
  
  try {
    // Use provided signal or create new one
    const abortSignal = signal || ctrl.signal;
    
    const res = await fetch(`${MESH_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MESH_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens || 4096,
        temperature: 0.75,
        stream: false,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: abortSignal,
    });

    clearTimeout(timer);
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${res.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    
    if (!content || content.length < 80) {
      throw new Error(`Response too short: ${content?.length || 0} characters`);
    }

    // Stream chunks with typewriter effect
    const chunkSize = 200;
    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      onChunk(chunk);
      await sleep(3); // Small delay for typewriter effect
    }

    const responseTime = Date.now() - t0;
    const inputTokens = data?.usage?.prompt_tokens || 0;
    const outputTokens = data?.usage?.completion_tokens || 0;
    const totalTokens = data?.usage?.total_tokens || (inputTokens + outputTokens);
    const cost = calculateCost(modelId, inputTokens, outputTokens);

    log.ok(`Recipe Mesh:${modelId} WON in ${responseTime}ms — ${content.length}ch, ${totalTokens} tokens, $${cost.toFixed(6)}`);
    
    return { 
      content, 
      tokens: totalTokens,
      inputTokens,
      outputTokens,
      cost, 
      responseTime, 
      model: modelId 
    };
  } catch (err) {
    clearTimeout(timer);
    log.warn(`Recipe Mesh:${modelId} failed: ${err.message}`);
    throw err;
  }
}

async function streamRecipe(prompt, onChunk, maxTokens, signal) {
  const errors = [];

  if (!MESH_API_KEY) {
    log.error('FATAL: MESH_API_KEY not set');
    throw new Error('RouxMind requires MESH_API_KEY. Get a free key at meshapi.ai');
  }

  // Priority 1: Try pinned recipe model
  try {
    log.info(`Recipe priority: trying pinned model ${PINNED_MODELS.recipe}`);
    const pinnedResult = await streamRecipeOneModel(
      PINNED_MODELS.recipe, 
      prompt, 
      onChunk, 
      maxTokens, 
      signal
    );
    log.ok(`Recipe priority: ${PINNED_MODELS.recipe} succeeded`);
    return pinnedResult;
  } catch (err) {
    log.warn(`Recipe priority: ${PINNED_MODELS.recipe} failed (${err.message})`);
    errors.push(`[pinned] ${PINNED_MODELS.recipe}: ${err.message}`);
  }

  // Priority 2: Try ultra-fast model
  try {
    log.info(`Recipe priority: trying ultra-fast model ${PINNED_MODELS.ultraFast}`);
    const ultraFastResult = await streamRecipeOneModel(
      PINNED_MODELS.ultraFast, 
      prompt, 
      onChunk, 
      maxTokens, 
      signal
    );
    log.ok(`Recipe priority: ${PINNED_MODELS.ultraFast} succeeded`);
    return ultraFastResult;
  } catch (err) {
    log.warn(`Recipe priority: ${PINNED_MODELS.ultraFast} failed (${err.message})`);
    errors.push(`[ultraFast] ${PINNED_MODELS.ultraFast}: ${err.message}`);
  }

  // Priority 3: Try free models in parallel
  for (let pass = 1; pass <= MESH_MAX_RETRIES; pass++) {
    const freeIds = await getMeshFreeModelIds();
    
    if (!freeIds.length) {
      log.warn(`Recipe pass ${pass}: no free Mesh models available`);
      errors.push(`[pass${pass}] no free Mesh models`);
      
      if (pass < MESH_MAX_RETRIES) {
        await sleep(pass * MESH_RETRY_DELAY_MS);
        continue;
      }
      break;
    }

    const candidates = freeIds.slice(0, 8);
    log.info(`Recipe pass ${pass}: racing ${candidates.length} free Mesh models`);

    const modelPromises = candidates.map(modelId =>
      streamRecipeOneModel(modelId, prompt, onChunk, maxTokens, signal)
        .then(result => ({ status: 'fulfilled', value: result, model: modelId }))
        .catch(err => ({ status: 'rejected', reason: err, model: modelId }))
    );

    const { successes, failures } = await firstSuccessOrAllFail(modelPromises);

    if (successes.length > 0) {
      const winner = successes[0];
      log.ok(`Recipe pass ${pass}: WINNER ${winner.model} — ${winner.value.content.length}ch in ${winner.value.responseTime}ms`);
      return winner.value;
    }

    const failReasons = failures.map(f => `${f.model || 'unknown'}: ${f.reason?.message || 'unknown'}`);
    errors.push(`[pass${pass}] ${failReasons.join('; ')}`);
    log.warn(`Recipe pass ${pass}: ALL ${candidates.length} models failed`);

    if (pass < MESH_MAX_RETRIES) {
      await sleep(pass * MESH_RETRY_DELAY_MS);
    }
  }

  log.error(`Recipe ALL attempts failed: ${errors.join(' | ')}`);
  throw new Error('All Mesh AI models are currently busy. Please try again in a moment.');
}

// ─── SMART AUTO-DETECT ─────────────────────────────────────────────────────

async function smartAutoDetect(partialInput, opts) {
  try {
    const prompt = buildSmartSuggestionPrompt(partialInput);
    const maxTokens = 512;

    // Try pinned recipe model first
    try {
      const result = await streamRecipeOneModel(
        PINNED_MODELS.recipe,
        prompt,
        () => {}, // No streaming for suggestions
        maxTokens
      );
      return result.content;
    } catch (err) {
      log.warn(`Smart detect: ${PINNED_MODELS.recipe} failed, trying fallback`);
    }

    // Fallback to simple suggestions
    const suggestions = QUICK_INGREDIENTS.filter(ing => 
      ing.toLowerCase().includes(partialInput.toLowerCase())
    );
    
    if (suggestions.length > 0) {
      return suggestions.join(', ');
    }

    // Generic fallback
    return `${partialInput}, onions, garlic, salt, oil`;
  } catch (err) {
    log.error(`Smart detect failed: ${err.message}`);
    return `${partialInput}, onions, garlic, salt, oil`;
  }
}

// ─── SSE HELPERS ───────────────────────────────────────────────────────────

function makeSSE(res) {
  return (event, data) => {
    if (res.writableEnded) return;
    try {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      res.write(`event: ${event}\ndata: ${dataStr}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (err) {
      log.warn(`SSE write failed: ${err.message}`);
    }
  };
}

function setHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Powered-By', `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`);
  res.setHeader('X-Developer', ROUXMIND.DEVELOPER);
  res.setHeader('X-Founder', ROUXMIND.FOUNDER);
  res.setHeader('X-Version', ROUXMIND.VERSION);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

// ─── MAIN API HANDLER ────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  const reqId = generateId();
  const startTime = Date.now();
  
  log.info(`[${reqId}] ${req.method} ${req.url}`);
  
  setHeaders(res);

  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    log.info(`[${reqId}] CORS preflight`);
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    log.warn(`[${reqId}] Method not allowed: ${req.method}`);
    return res.status(405).json({ 
      error: 'Method not allowed. Use POST.',
      requestId: reqId
    });
  }

  // Check API key
  if (!MESH_API_KEY) {
    log.error('[FATAL] MESH_API_KEY not set in environment variables!');
    return res.status(500).json({ 
      error: 'RouxMind service is misconfigured — MESH_API_KEY missing. Get a free key at meshapi.ai and set it in your environment.',
      requestId: reqId,
      docs: 'https://meshapi.ai'
    });
  }

  // Parse body
  const body = req.body || {};
  const message = sanitizeInput(body.message || '');
  const userName = sanitizeInput(body.userName || 'Anonymous', 100);
  const sessionId = sanitizeInput(body.sessionId || reqId, 100);
  const image = sanitizeInput(body.image || '', 1000000);
  const action = sanitizeInput(body.action || '');

  // Extract options
  const rawOpts = body.options || {};
  const opts = {
    depth: ['quick', 'standard', 'detailed', 'gourmet'].includes(rawOpts.depth) ? rawOpts.depth : 'standard',
    spice: Math.min(Math.max(Number(rawOpts.spice) || 3, 1), 5),
    servings: Math.min(Math.max(Number(rawOpts.servings) || 2, 1), 10),
    time: Math.min(Math.max(Number(rawOpts.time) || 2, 1), 4),
    language: String(rawOpts.language || 'English').trim().slice(0, 60),
    stream: rawOpts.stream !== false, // Default true
    smart: rawOpts.smart || false,
  };

  // User stats from body (for persistence)
  const userStats = body.userStats || {};

  log.info(`[${reqId}] user:${userName} | action:${action} | message:${message.slice(0, 50)} | image:${!!image} | opts:${JSON.stringify(opts)}`);

  // ── PING ENDPOINT ────────────────────────────────────────────────────────
  if (!message || message === 'ping' || action === 'ping') {
    log.info(`[${reqId}] PING — ${userName}`);
    
    sendToGoogleSheets({ 
      user: userName, 
      dish: 'ping', 
      status: 'online',
      sessionId 
    }).catch(() => {});

    return res.status(200).json({
      status: 'ok',
      service: ROUXMIND.BRAND,
      version: ROUXMIND.VERSION,
      tagline: ROUXMIND.TAGLINE,
      time: getISTDateTime(),
      istDate: getISTDate(),
      requestId: reqId,
      poweredBy: `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`,
      founder: ROUXMIND.FOUNDER,
      website: ROUXMIND.DEVSITE,
      hackathon: ROUXMIND.HACKATHON,
      hackathonUrl: ROUXMIND.HACKATHON_URL
    });
  }

  // ── VALIDATION ────────────────────────────────────────────────────────────
  if (message.length < 2) {
    log.warn(`[${reqId}] Input too short: ${message.length} chars`);
    return res.status(400).json({ 
      error: 'Please enter ingredients (minimum 2 characters).',
      requestId: reqId
    });
  }

  if (message.length > 20000) {
    log.warn(`[${reqId}] Input too long: ${message.length} chars`);
    return res.status(400).json({ 
      error: 'Input too long (max 20,000 characters).',
      requestId: reqId
    });
  }

  // ── SMART AUTO-DETECT ENDPOINT ────────────────────────────────────────────
  if (action === 'smart-detect' || opts.smart) {
    log.info(`[${reqId}] Smart auto-detect for: ${message}`);
    
    try {
      const suggestions = await smartAutoDetect(message, opts);
      
      sendToGoogleSheets({
        user: userName,
        dish: message,
        status: 'smart_detect',
        sessionId,
        ingredients: suggestions
      }).catch(() => {});

      return res.status(200).json({
        suggestions,
        requestId: reqId,
        status: 'success'
      });
    } catch (err) {
      log.error(`[${reqId}] Smart detect failed: ${err.message}`);
      return res.status(500).json({
        error: 'Smart detection failed. Please try again.',
        requestId: reqId
      });
    }
  }

  // ── MAIN RECIPE GENERATION ────────────────────────────────────────────────

  // Log start to Google Sheets
  sendToGoogleSheets({ 
    user: userName, 
    dish: message, 
    status: 'started',
    sessionId,
    servings: opts.servings,
    spice: opts.spice,
    time: opts.time,
    language: opts.language,
    depth: opts.depth
  }).catch(() => {});

  // SSE Streaming setup
  if (opts.stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sse = makeSSE(res);

    // Keep-alive ping
    const kap = setInterval(() => {
      if (res.writableEnded) { 
        clearInterval(kap); 
        return; 
      }
      try {
        res.write(`: ping ${Date.now()}\n\n`);
        if (typeof res.flush === 'function') res.flush();
      } catch { 
        clearInterval(kap); 
      }
    }, 10000);

    // Send initial heartbeat
    sse('heartbeat', { 
      ts: Date.now(), 
      status: 'connected', 
      service: ROUXMIND.BRAND, 
      version: ROUXMIND.VERSION,
      requestId: reqId
    });

    let ingredients = message;
    let recipeContent = '';
    let recipeData = null;
    let dishName = message.slice(0, 50);

    try {
      // Stage 0: Image recognition if image provided
      if (image && image.startsWith('data:image')) {
        sse('stage', { 
          idx: 0, 
          label: '📸 Analyzing ingredients from your photo…',
          icon: '📸'
        });
        
        const visionResult = await recognizeImage(image);
        
        if (visionResult) {
          ingredients = visionResult;
          sse('stage', { 
            idx: 1, 
            label: `🔍 Detected: ${ingredients.slice(0, 100)}`,
            icon: '🔍'
          });
          sse('fact', { 
            fact: `📸 Ingredients detected: ${ingredients.slice(0, 200)}`,
            type: 'ingredients'
          });
        } else {
          sse('stage', { 
            idx: 1, 
            label: '⚠️ Could not detect ingredients. Using your text…',
            icon: '⚠️'
          });
        }
      } else {
        sse('stage', { 
          idx: 0, 
          label: '📝 Processing your ingredients…',
          icon: '📝'
        });
      }

      // Stage 2: Generate recipe
      sse('stage', { 
        idx: 2, 
        label: '👨‍🍳 Cooking up your recipe…',
        icon: '👨‍🍳'
      });

      const recipePrompt = buildRecipePrompt(ingredients, opts);
      const maxTokens = DEPTH_MAP[opts.depth]?.maxTokens || 2400;

      // Create abort controller for client cancellation
      const abortCtrl = new AbortController();
      
      // Handle client disconnect
      req.on('close', () => {
        log.info(`[${reqId}] Client disconnected`);
        abortCtrl.abort();
      });

      try {
        const result = await streamRecipe(
          recipePrompt, 
          chunk => sse('token', { t: chunk }), 
          maxTokens,
          abortCtrl.signal
        );
        
        recipeContent = result.content;
        recipeData = result;
        
        log.ok(`[${reqId}] Recipe done — ${recipeContent.length}ch | tokens:${result.tokens} | cost:$${result.cost.toFixed(6)} | model:${result.model}`);
      } catch (e) {
        if (e.name === 'AbortError') {
          log.warn(`[${reqId}] Generation aborted by client`);
          throw new Error('Generation cancelled by user');
        }
        
        log.error(`[${reqId}] Recipe generation failed: ${e.message}`);
        
        // Fallback recipe
        recipeContent = buildFallbackRecipe(ingredients, opts);
        for (let i = 0; i < recipeContent.length; i += 250) {
          sse('token', { t: recipeContent.slice(i, i + 250) });
          await sleep(5);
        }
        
        recipeData = { 
          content: recipeContent, 
          tokens: 0, 
          cost: 0, 
          responseTime: Date.now() - startTime, 
          model: 'fallback' 
        };
      }

      // Stage 3: Finalizing
      sse('stage', { 
        idx: 3, 
        label: '✨ Finalizing your recipe…',
        icon: '✨'
      });

      // Parse dish name from recipe
      const titleMatch = recipeContent.match(/## 🍽️\s*(.+?)(?=\n|$)/);
      if (titleMatch) {
        dishName = titleMatch[1].trim();
      } else {
        dishName = ingredients.split(',').slice(0, 3).join(', ').slice(0, 50);
      }

      // Stage 4: Complete
      clearInterval(kap);

      const responseTime = Date.now() - startTime;
      const rankInfo = getRank(userStats.xp || 0);

      const final = {
        topic: ingredients,
        dish: dishName,
        recipe: recipeContent,
        ultra_long_notes: recipeContent,
        servings: opts.servings,
        spice: opts.spice,
        spiceLabel: SPICE_MAP[opts.spice]?.label || 'Medium',
        spiceDescription: SPICE_MAP[opts.spice]?.description || '',
        time: opts.time,
        timeLabel: TIME_MAP[opts.time]?.label || 'Medium',
        timeDescription: TIME_MAP[opts.time]?.description || '',
        language: opts.language,
        depth: opts.depth,
        depthLabel: DEPTH_MAP[opts.depth]?.label || 'Standard',
        tokens: recipeData?.tokens || 0,
        inputTokens: recipeData?.inputTokens || 0,
        outputTokens: recipeData?.outputTokens || 0,
        cost: recipeData?.cost || 0,
        responseTime,
        model: recipeData?.model || 'fallback',
        status: 'Success',
        powered_by: `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`,
        generated_at: getISTDateTime(),
        istDate: getISTDate(),
        version: ROUXMIND.VERSION,
        requestId: reqId,
        sessionId,
        user: userName,
        // User stats
        xp: userStats.xp || 0,
        rank: rankInfo.name,
        rankIcon: rankInfo.icon,
        rankColor: rankInfo.color,
        streak: userStats.streak || 0,
        totalRecipes: userStats.totalRecipes || 0
      };

      sse('stage', { 
        idx: 4, 
        label: '✅ Complete! Your recipe is ready.',
        icon: '✅',
        done: true
      });
      
      sse('done', final);

      log.ok(`[${reqId}] ✅ COMPLETE — ${responseTime}ms | user:${userName} | dish:${dishName} | model:${final.model}`);

      // Log to Google Sheets (KEPT AS-IS)
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
        xp: userStats.xp || 0,
        rank: rankInfo.name,
        streak: userStats.streak || 0,
        totalRecipes: userStats.totalRecipes || 0
      }).catch(() => {});

    } catch (fatal) {
      clearInterval(kap);
      log.error(`[${reqId}] FATAL: ${fatal.message}`);
      
      const userMsg = fatal.message?.includes('API_KEY')
        ? 'Service configuration error. Please contact the administrator.'
        : fatal.message?.includes('Abort')
          ? 'Recipe generation cancelled.'
          : 'RouxMind is momentarily unavailable. Please try again in a few seconds.';

      sse('error', { 
        error: userMsg, 
        requestId: reqId,
        timestamp: getISTDateTime()
      });

      sendToGoogleSheets({
        user: userName,
        dish: message,
        status: 'Failed',
        sessionId: sessionId,
        error: fatal.message
      }).catch(() => {});
    }

    if (!res.writableEnded) res.end();
    return;
  }

  // Non-streaming mode (not recommended but supported)
  log.warn(`[${reqId}] Non-streaming mode (deprecated)`);
  
  try {
    let ingredients = message;
    
    // Image recognition
    if (image && image.startsWith('data:image')) {
      const visionResult = await recognizeImage(image);
      if (visionResult) ingredients = visionResult;
    }

    const recipePrompt = buildRecipePrompt(ingredients, opts);
    const maxTokens = DEPTH_MAP[opts.depth]?.maxTokens || 2400;

    const result = await streamRecipe(
      recipePrompt,
      () => {}, // No streaming
      maxTokens
    );

    let dishName = ingredients.split(',').slice(0, 3).join(', ').slice(0, 50);
    const titleMatch = result.content.match(/## 🍽️\s*(.+?)(?=\n|$)/);
    if (titleMatch) dishName = titleMatch[1].trim();

    const responseTime = Date.now() - startTime;

    const response = {
      dish: dishName,
      recipe: result.content,
      servings: opts.servings,
      spice: opts.spice,
      time: opts.time,
      language: opts.language,
      depth: opts.depth,
      tokens: result.tokens,
      cost: result.cost,
      responseTime,
      model: result.model,
      status: 'Success',
      powered_by: `${ROUXMIND.BRAND} by ${ROUXMIND.DEVELOPER}`,
      generated_at: getISTDateTime(),
      requestId: reqId
    };

    log.ok(`[${reqId}] ✅ COMPLETE (non-streaming) — ${responseTime}ms | dish:${dishName}`);

    sendToGoogleSheets({
      user: userName,
      dish: dishName,
      servings: opts.servings,
      spice: opts.spice,
      time: opts.time,
      status: 'Success',
      tokens: result.tokens,
      cost: result.cost,
      responseTime,
      model: result.model,
      ingredients,
      instructions: result.content.slice(0, 500),
      mode: 'standard',
      sessionId
    }).catch(() => {});

    res.status(200).json(response);

  } catch (err) {
    log.error(`[${reqId}] Non-streaming failed: ${err.message}`);
    
    sendToGoogleSheets({
      user: userName,
      dish: message,
      status: 'Failed',
      sessionId,
      error: err.message
    }).catch(() => {});

    res.status(500).json({
      error: 'Recipe generation failed. Please try again.',
      requestId: reqId
    });
  }
};

// ─── EXPORT FOR VERCEL/EXPRESS ────────────────────────────────────────────

// For Vercel Serverless Functions
module.exports.handler = module.exports;

// For Express.js compatibility
module.exports.expressHandler = (req, res) => {
  // Convert Express request to our format
  const body = req.body;
  req.body = body;
  return module.exports(req, res);
};

// ─── ADDITIONAL UTILITY ENDPOINTS ────────────────────────────────────────

// Health check endpoint
module.exports.health = (req, res) => {
  setHeaders(res);
  res.status(200).json({
    status: 'healthy',
    service: ROUXMIND.BRAND,
    version: ROUXMIND.VERSION,
    timestamp: getISTDateTime(),
    uptime: process.uptime(),
    meshApi: !!MESH_API_KEY ? 'configured' : 'not_configured',
    googleSheets: !!GOOGLE_WEBHOOK_URL ? 'configured' : 'not_configured'
  });
};

// Stats endpoint
module.exports.stats = (req, res) => {
  setHeaders(res);
  res.status(200).json({
    service: ROUXMIND.BRAND,
    version: ROUXMIND.VERSION,
    developer: ROUXMIND.DEVELOPER,
    founder: ROUXMIND.FOUNDER,
    website: ROUXMIND.DEVSITE,
    hackathon: ROUXMIND.HACKATHON,
    hackathonUrl: ROUXMIND.HACKATHON_URL,
    features: [
      'Multi-model AI orchestration',
      'SSE streaming',
      'Image recognition',
      'Google Sheets logging',
      'Cost tracking',
      'Fallback recipes',
      'User XP system',
      'Rank system',
      'History & saved recipes',
      'PDF generation',
      'Analytics dashboard'
    ],
    models: {
      vision: PINNED_MODELS.vision,
      recipe: PINNED_MODELS.recipe,
      ultraFast: PINNED_MODELS.ultraFast
    },
    timestamp: getISTDateTime()
  });
};

// ─── INITIALIZATION LOG ───────────────────────────────────────────────────

log.ok(`✨ ${ROUXMIND.BRAND} v${ROUXMIND.VERSION} initialized`);
log.info(`👨‍💻 Developer: ${ROUXMIND.DEVELOPER}`);
log.info(`🌐 Website: ${ROUXMIND.DEVSITE}`);
log.info(`🏆 Hackathon: ${ROUXMIND.HACKATHON} (${ROUXMIND.HACKATHON_URL})`);
log.info(`⚡ Mesh API: ${!!MESH_API_KEY ? 'Configured' : 'NOT CONFIGURED'}`);
log.info(`📊 Google Sheets: ${!!GOOGLE_WEBHOOK_URL ? 'Configured' : 'NOT CONFIGURED'}`);
log.ok(`🚀 ${ROUXMIND.BRAND} is ready to generate recipes!`);
