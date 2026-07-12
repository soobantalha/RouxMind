// ============================================================================
// RouxMind Backend API — api/recipe.js
// Handles: text/image recipe generation via Mesh API + Google Sheets logging
// Deploy target: Vercel serverless function
// ============================================================================

import { google } from "googleapis";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const MESH_API_KEY = process.env.MESH_API_KEY; // mesh_sk_...
const MESH_BASE_URL = "https://api.meshapi.ai/v1";

// Model routing — pick the cheapest model that fits the job
const MODELS = {
  VISION: "google/gemini-2.5-flash-lite", // image -> dish identification
  RECIPE: "google/gemma-3-4b-it",          // main recipe generation
  ULTRA_FAST: "inclusionai/ling-2.6-flash" // quick mode / retries
};

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_TAB_LOG = "GenerationLog";
const SHEET_TAB_ANALYTICS = "Analytics";

// ----------------------------------------------------------------------------
// GOOGLE SHEETS CLIENT
// ----------------------------------------------------------------------------
function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      // Vercel env vars store \n literally — convert back to real newlines
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  return google.sheets({ version: "v4", auth });
}

async function logToSheet(row) {
  if (!SHEET_ID) return; // sheets logging optional if not configured
  try {
    const sheets = getSheetsClient();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_TAB_LOG}!A:J`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: [
          [
            row.timestamp,
            row.user,
            row.dish,
            row.servings,
            row.spice,
            row.time,
            row.status,
            row.tokens,
            row.cost,
            row.responseTimeMs
          ]
        ]
      }
    });
  } catch (err) {
    // Never let a logging failure break the user's recipe response
    console.error("Sheets logging failed:", err.message);
  }
}

// ----------------------------------------------------------------------------
// MESH API CALL (OpenAI-compatible — /chat/completions)
// ----------------------------------------------------------------------------
async function callMesh({ model, messages, maxTokens = 1500 }) {
  const res = await fetch(`${MESH_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MESH_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mesh API error ${res.status}: ${errText}`);
  }

  return res.json();
}

// ----------------------------------------------------------------------------
// STEP 1: Vision — identify dish from image (if imageBase64 provided)
// ----------------------------------------------------------------------------
async function identifyDishFromImage(imageBase64) {
  const data = await callMesh({
    model: MODELS.VISION,
    maxTokens: 150,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Identify the dish in this image. Reply with ONLY the dish name, nothing else. If ingredients are shown instead of a finished dish, reply with a comma-separated list of the visible ingredients prefixed by 'INGREDIENTS:'."
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      }
    ]
  });

  return {
    text: data.choices?.[0]?.message?.content?.trim() || "",
    tokens: data.usage?.total_tokens || 0
  };
}

// ----------------------------------------------------------------------------
// STEP 2: Recipe generation
// ----------------------------------------------------------------------------
function buildRecipePrompt({ dish, servings, spice, time }) {
  const spiceLabels = ["Mild", "Light", "Medium", "Hot", "Extra Hot"];
  const timeLabels = ["Quick (<15 min)", "Fast (15–30 min)", "Standard (30–60 min)", "Slow (60+ min)"];

  return `You are a professional chef. Generate a complete, well-structured recipe.

Dish / ingredients: ${dish}
Servings: ${servings}
Spice level: ${spiceLabels[spice - 1] || "Medium"}
Time preference: ${timeLabels[time - 1] || "Standard"}

Respond ONLY with valid JSON in this exact shape, no markdown fences, no extra text:
{
  "title": "string",
  "description": "one-sentence enticing description",
  "servings": number,
  "prepTime": "string e.g. 15 min",
  "cookTime": "string e.g. 25 min",
  "difficulty": "Easy | Medium | Hard",
  "cuisine": "string",
  "ingredients": [{"item": "string", "amount": "string"}],
  "steps": [{"step": number, "instruction": "string", "duration": "string or null"}],
  "nutrition": {"calories": "string", "protein": "string", "carbs": "string", "fat": "string"},
  "tips": ["string"],
  "tags": ["string"]
}`;
}

async function generateRecipe(promptText) {
  const data = await callMesh({
    model: MODELS.RECIPE,
    maxTokens: 1800,
    messages: [{ role: "user", content: promptText }]
  });

  const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Failed to parse recipe JSON from model output");
  }

  return {
    recipe: parsed,
    tokens: data.usage?.total_tokens || 0
  };
}

// ----------------------------------------------------------------------------
// COST ESTIMATION (per model, $/1M tokens — input/output blended estimate)
// ----------------------------------------------------------------------------
const COST_PER_1M = {
  [MODELS.VISION]: { in: 0.1, out: 0.4 },
  [MODELS.RECIPE]: { in: 0.04, out: 0.08 },
  [MODELS.ULTRA_FAST]: { in: 0.01, out: 0.03 }
};

function estimateCost(model, tokens) {
  const rate = COST_PER_1M[model] || { in: 0.05, out: 0.1 };
  // Rough blended estimate: assume 40% input / 60% output split
  const avgRate = rate.in * 0.4 + rate.out * 0.6;
  return +((tokens / 1_000_000) * avgRate).toFixed(6);
}

// ----------------------------------------------------------------------------
// MAIN HANDLER
// ----------------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const startTime = Date.now();
  const { user = "Anonymous", dishText, imageBase64, servings = 2, spice = 3, time = 2 } = req.body || {};

  let dish = dishText;
  let totalTokens = 0;
  let modelUsed = MODELS.RECIPE;

  try {
    // Step 1: if image provided, identify dish first
    if (imageBase64) {
      const vision = await identifyDishFromImage(imageBase64);
      dish = vision.text;
      totalTokens += vision.tokens;
      modelUsed = MODELS.VISION;
    }

    if (!dish || !dish.trim()) {
      throw new Error("No dish name or image provided");
    }

    // Step 2: generate the recipe
    const prompt = buildRecipePrompt({ dish, servings, spice, time });
    const { recipe, tokens } = await generateRecipe(prompt);
    totalTokens += tokens;

    const responseTimeMs = Date.now() - startTime;
    const cost = estimateCost(MODELS.RECIPE, totalTokens);

    // Fire-and-forget sheet logging (doesn't block response)
    logToSheet({
      timestamp: new Date().toISOString(),
      user,
      dish: recipe.title || dish,
      servings,
      spice,
      time,
      status: "Success",
      tokens: totalTokens,
      cost,
      responseTimeMs
    });

    return res.status(200).json({
      success: true,
      recipe,
      meta: { tokens: totalTokens, cost, responseTimeMs, model: modelUsed }
    });
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;

    logToSheet({
      timestamp: new Date().toISOString(),
      user,
      dish: dish || "unknown",
      servings,
      spice,
      time,
      status: "Failed",
      tokens: totalTokens,
      cost: 0,
      responseTimeMs
    });

    console.error("Recipe generation error:", err);
    return res.status(500).json({ success: false, error: err.message || "Generation failed" });
  }
}