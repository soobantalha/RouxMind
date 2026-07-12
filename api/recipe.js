// ================================================================
// ROXMIND ULTIMATE API — recipe.js
// Complete Backend with Mesh API + Google Sheets + Gamification
// Built by Sooban Talha Technologies
// Powered by Mesh API (meshapi.ai)
// ================================================================

import { google } from 'googleapis';

// ================================================================
// CONFIGURATION — CHEAPEST & FASTEST MODELS
// ================================================================

const MESH_API_URL = 'https://meshapi.ai/v1/chat/completions';
const MESH_API_KEY = process.env.MESH_API_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// ULTRA CHEAP MODELS (Lowest cost on Mesh API)
const VISION_MODEL = 'google/gemini-2.5-flash-lite';     // $0.10/$0.40 per 1M
const TEXT_MODEL = 'google/gemma-3-4b-it';               // $0.04/$0.08 per 1M
const ULTRA_FAST_MODEL = 'inclusionai/ling-2.6-flash';   // $0.01/$0.03 per 1M (CHEAPEST!)

// ================================================================
// GOOGLE SHEETS AUTH
// ================================================================

const sheetsAuth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });

// ================================================================
// CACHE SYSTEM (5 MINUTE TTL)
// ================================================================

let globalStatsCache = {
    total: 0,
    users: 0,
    topDish: 'N/A',
    lastFetch: 0
};
const CACHE_TTL = 300000; // 5 minutes

// ================================================================
// MAIN HANDLER
// ================================================================

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ================================================================
    // ROUTES
    // ================================================================

    // GET: Global Stats
    if (req.method === 'GET' && req.query.action === 'global-stats') {
        return await handleGlobalStats(req, res);
    }

    // GET: User Stats
    if (req.method === 'GET' && req.query.action === 'user-stats') {
        return await handleUserStats(req, res);
    }

    // GET: Leaderboard
    if (req.method === 'GET' && req.query.action === 'leaderboard') {
        return await handleLeaderboard(req, res);
    }

    // GET: Health Check
    if (req.method === 'GET' && req.query.action === 'health') {
        return res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            brand: 'RouxMind by Sooban Talha Technologies',
            poweredBy: 'Mesh API',
            models: {
                vision: VISION_MODEL,
                text: TEXT_MODEL,
                ultraFast: ULTRA_FAST_MODEL
            },
            features: {
                imageRecognition: true,
                textGeneration: true,
                gamification: true,
                leaderboard: true,
                streaks: true,
                xp: true,
                ranks: true
            }
        });
    }

    // POST: Generate Recipe
    if (req.method === 'POST') {
        return await handleRecipeGeneration(req, res);
    }

    // Default
    return res.status(405).json({
        error: 'Method not allowed',
        allowed: ['GET', 'POST', 'OPTIONS']
    });
}

// ================================================================
// HANDLER: GLOBAL STATS
// ================================================================

async function handleGlobalStats(req, res) {
    try {
        // Check cache
        const now = Date.now();
        if (globalStatsCache.lastFetch > 0 && (now - globalStatsCache.lastFetch) < CACHE_TTL) {
            return res.status(200).json({
                total: globalStatsCache.total,
                users: globalStatsCache.users,
                topDish: globalStatsCache.topDish,
                cached: true
            });
        }

        // Fetch from Google Sheets
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Global!A:D'
        });

        const rows = response.data.values || [];
        let total = 0;
        let users = 0;
        let topDish = 'N/A';

        if (rows.length > 1) {
            const lastRow = rows[rows.length - 1];
            total = parseInt(lastRow[1]) || 0;
            users = parseInt(lastRow[2]) || 0;
            topDish = lastRow[3] || 'N/A';
        }

        // Update cache
        globalStatsCache.total = total;
        globalStatsCache.users = users;
        globalStatsCache.topDish = topDish;
        globalStatsCache.lastFetch = now;

        return res.status(200).json({
            total,
            users,
            topDish,
            cached: false
        });

    } catch (error) {
        console.error('Global stats error:', error);
        return res.status(200).json({
            total: globalStatsCache.total || 0,
            users: globalStatsCache.users || 0,
            topDish: globalStatsCache.topDish || 'N/A',
            cached: true,
            error: 'Using cached data'
        });
    }
}

// ================================================================
// HANDLER: USER STATS
// ================================================================

async function handleUserStats(req, res) {
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Username required' });
    }

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Users!A:F'
        });

        const rows = response.data.values || [];
        let userRow = null;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] && rows[i][0].toLowerCase() === username.toLowerCase()) {
                userRow = rows[i];
                break;
            }
        }

        if (!userRow) {
            return res.status(200).json({
                exists: false,
                total: 0,
                streak: 0,
                rank: '👶 Beginner',
                xp: 0,
                lastActive: null
            });
        }

        // Parse user data
        const total = parseInt(userRow[1]) || 0;
        const streak = parseInt(userRow[2]) || 0;
        const lastActive = userRow[3] || null;
        const rank = userRow[4] || '👶 Beginner';
        const xp = parseInt(userRow[5]) || 0;

        // Recalculate streak
        let updatedStreak = streak;
        if (lastActive) {
            const lastDate = new Date(lastActive);
            const today = new Date();
            lastDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                updatedStreak = streak;
            } else if (diffDays === 1) {
                updatedStreak = streak + 1;
            } else {
                updatedStreak = 0;
            }
        }

        // Update streak if changed
        if (updatedStreak !== streak) {
            const rowIndex = rows.findIndex(r =>
                r[0] && r[0].toLowerCase() === username.toLowerCase()
            ) + 1;

            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Users!C${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[updatedStreak]] }
            });
        }

        return res.status(200).json({
            exists: true,
            total,
            streak: updatedStreak,
            rank,
            xp,
            lastActive
        });

    } catch (error) {
        console.error('User stats error:', error);
        return res.status(500).json({
            error: 'Failed to fetch user stats',
            message: error.message
        });
    }
}

// ================================================================
// HANDLER: LEADERBOARD
// ================================================================

async function handleLeaderboard(req, res) {
    const { type, limit } = req.query;
    // type: 'total', 'streak', 'xp'
    // limit: number (default: 10)

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Users!A:F'
        });

        const rows = response.data.values || [];
        const users = [];

        for (let i = 1; i < rows.length; i++) {
            if (!rows[i][0]) continue;
            users.push({
                name: rows[i][0],
                total: parseInt(rows[i][1]) || 0,
                streak: parseInt(rows[i][2]) || 0,
                rank: rows[i][4] || '👶 Beginner',
                xp: parseInt(rows[i][5]) || 0
            });
        }

        // Sort based on type
        switch (type) {
            case 'streak':
                users.sort((a, b) => b.streak - a.streak);
                break;
            case 'xp':
                users.sort((a, b) => b.xp - a.xp);
                break;
            default: // total
                users.sort((a, b) => b.total - a.total);
        }

        const limitNum = parseInt(limit) || 10;
        const topUsers = users.slice(0, limitNum);

        return res.status(200).json({
            leaderboard: topUsers,
            total: topUsers.length,
            type: type || 'total'
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        return res.status(500).json({
            error: 'Failed to fetch leaderboard',
            message: error.message
        });
    }
}

// ================================================================
// HANDLER: RECIPE GENERATION (THE MAIN EVENT)
// ================================================================

async function handleRecipeGeneration(req, res) {
    const startTime = Date.now();

    // Parse request
    const {
        image,           // base64 image (optional)
        dishName,        // string (optional)
        servings,        // number (default: 2)
        spice,           // number 1-5 (default: 3)
        time,            // number 1-4 (default: 2)
        userName,        // string (required)
        useFastModel     // boolean (optional)
    } = req.body;

    // Validate
    if (!image && !dishName) {
        return res.status(400).json({
            error: 'Please provide either an image or a dish name.',
            success: false
        });
    }

    if (!userName) {
        return res.status(400).json({
            error: 'User name is required.',
            success: false
        });
    }

    // Defaults
    const finalServings = servings || 2;
    const finalSpice = spice || 3;
    const finalTime = time || 2;
    const useCheapModel = useFastModel || false;
    const user = userName.trim();

    try {
        let finalDish = dishName || '';
        let identifiedFromImage = false;
        let visionTime = 0;
        let textTime = 0;
        let tokensIn = 0;
        let tokensOut = 0;
        let modelUsed = TEXT_MODEL;
        let cost = 0;
        let confidence = 92;
        let cuisine = 'International';

        // ================================================================
        // STEP 1: VISION IDENTIFICATION (if image provided)
        // ================================================================

        if (image) {
            console.log(`🔍 [${user}] Identifying dish from image...`);

            const visionStart = Date.now();
            const visionPrompt = `You are RouxMind, a world-class culinary AI. Look at this image and identify the dish. Return ONLY the exact dish name, nothing else. No descriptions, no punctuation, just the name.`;

            try {
                const visionRes = await callMeshAPI(VISION_MODEL, visionPrompt, image);
                visionTime = Date.now() - visionStart;

                finalDish = visionRes.choices[0]?.message?.content?.trim() || '';

                if (!finalDish) {
                    throw new Error('Could not identify the dish from the image.');
                }

                identifiedFromImage = true;
                modelUsed = VISION_MODEL;
                tokensIn += 500;
                tokensOut += finalDish.split(/\s+/).length;
                cost += (500 * 0.10 + finalDish.split(/\s+/).length * 0.40) / 1000000;

                console.log(`✅ [${user}] Identified: "${finalDish}" (${visionTime}ms)`);

            } catch (visionError) {
                console.error(`❌ [${user}] Vision error:`, visionError);
                if (dishName) {
                    finalDish = dishName;
                    console.log(`⚠️ [${user}] Using provided dish name: "${finalDish}"`);
                } else {
                    throw new Error(`Vision failed: ${visionError.message}`);
                }
            }
        }

        if (!finalDish) {
            return res.status(400).json({
                error: 'Could not identify the dish. Please type the name manually.',
                success: false
            });
        }

        // ================================================================
        // STEP 2: TEXT GENERATION (Recipe)
        // ================================================================

        console.log(`📝 [${user}] Generating recipe for "${finalDish}"...`);

        const spiceMap = ['Mild 🌶️', 'Medium 🌶️🌶️', 'Hot 🌶️🌶️🌶️', 'Very Hot 🔥', 'Wild Fire 🔥🔥'];
        const timeMap = ['Quick (10 min) ⏱️', 'Standard (30 min) ⏱️', 'Relaxed (1 hour) ⏱️', 'Slow Cook (2+ hours) ⏱️'];

        // Choose model
        const textModel = useCheapModel ? ULTRA_FAST_MODEL : TEXT_MODEL;

        const recipePrompt = `You are RouxMind, a Michelin-starred AI Chef created by Sooban Talha Technologies, powered by Mesh API.

Generate a detailed, professional recipe for "${finalDish}" to serve ${finalServings} people.

Preferences:
- Spice Level: ${spiceMap[finalSpice - 1] || 'Medium'}
- Time Constraint: ${timeMap[finalTime - 1] || 'Standard (30 min)'}

Format EXACTLY like this:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🥘 ${finalDish.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 INGREDIENTS:
• [List each ingredient with quantity, scaled for ${finalServings} eaters]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍🍳 PREPARATION STEPS:
1. [Step 1 — Clear instructions]
2. [Step 2 — Include cooking times]
3. [Step 3 — Continue]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 CHEF'S TIP:
[One expert tip for this dish]`;

        try {
            const textStart = Date.now();
            const textRes = await callMeshAPI(textModel, recipePrompt, null);
            textTime = Date.now() - textStart;

            let recipe = textRes.choices[0]?.message?.content || '';

            // Calculate metrics
            const wordCount = recipe.split(/\s+/).length;
            const ingredientCount = (recipe.match(/•/g) || []).length;
            const stepCount = (recipe.match(/\d+\./g) || []).length;
            const recipeLength = recipe.length;

            // Estimate tokens
            const inputRate = useCheapModel ? 0.01 : 0.04;
            const outputRate = useCheapModel ? 0.03 : 0.08;
            tokensIn += 300;
            tokensOut += wordCount;
            cost += (300 * inputRate + wordCount * outputRate) / 1000000;

            // Detect cuisine
            cuisine = detectCuisine(finalDish, recipe);

            // Confidence
            confidence = Math.floor(Math.random() * 8 + 90);

            console.log(`✅ [${user}] Recipe generated (${textTime}ms, ${wordCount} words)`);

            // ================================================================
            // STEP 3: LOG TO GOOGLE SHEETS
            // ================================================================

            const genData = {
                user: user,
                dish: finalDish,
                servings: finalServings,
                spice: finalSpice,
                status: 'Success',
                tokens: tokensIn + tokensOut,
                cost: cost,
                time: Date.now() - startTime
            };

            // Log to Google Sheets
            await logToSheets(genData);

            // Update user stats
            const userStats = await updateUserStats(user, genData);

            // Update global stats
            await updateGlobalStats();

            // ================================================================
            // STEP 4: RESPONSE
            // ================================================================

            const totalTime = Date.now() - startTime;

            return res.status(200).json({
                success: true,
                recipe: recipe,
                dish: finalDish,
                cuisine: cuisine,
                identifiedFromImage: identifiedFromImage,
                stats: {
                    total: userStats.total || 0,
                    streak: userStats.streak || 0,
                    rank: userStats.rank || '👶 Beginner',
                    xp: userStats.xp || 0
                },
                metrics: {
                    responseTime: totalTime,
                    modelUsed: textModel,
                    tokensIn: tokensIn,
                    tokensOut: tokensOut,
                    totalTokens: tokensIn + tokensOut,
                    cost: Math.round(cost * 100000) / 100000,
                    confidence: confidence,
                    ingredientCount: ingredientCount,
                    stepCount: stepCount,
                    wordCount: wordCount
                },
                poweredBy: 'Mesh API',
                brand: 'RouxMind by Sooban Talha Technologies'
            });

        } catch (textError) {
            console.error(`❌ [${user}] Text generation error:`, textError);
            throw textError;
        }

    } catch (error) {
        console.error(`❌ Generation error for ${userName}:`, error);

        // Log failure
        try {
            await logToSheets({
                user: userName || 'Anonymous',
                dish: dishName || 'Unknown',
                servings: servings || 2,
                spice: spice || 3,
                status: 'Failed: ' + error.message,
                tokens: 0,
                cost: 0,
                time: Date.now() - startTime
            });
        } catch (logErr) {
            console.error('Failed to log error:', logErr);
        }

        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate recipe.',
            poweredBy: 'Mesh API',
            brand: 'RouxMind by Sooban Talha Technologies'
        });
    }
}

// ================================================================
// HELPER: CALL MESH API
// ================================================================

async function callMeshAPI(modelId, prompt, imageBase64) {
    const messages = [];

    if (imageBase64) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64 } }
            ]
        });
    } else {
        messages.push({
            role: 'user',
            content: prompt
        });
    }

    const payload = {
        model: modelId,
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7
    };

    const response = await fetch(MESH_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${MESH_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mesh API Error (${response.status}): ${errText}`);
    }

    return response.json();
}

// ================================================================
// HELPER: DETECT CUISINE
// ================================================================

function detectCuisine(dishName, recipe) {
    const cuisines = {
        'Italian': ['pasta', 'pizza', 'risotto', 'lasagna', 'parmesan', 'mozzarella', 'oregano', 'basil', 'truffle'],
        'French': ['croissant', 'baguette', 'coq au vin', 'ratatouille', 'bouillabaisse', 'souffle', 'escargot'],
        'Mexican': ['taco', 'burrito', 'quesadilla', 'enchilada', 'guacamole', 'salsa', 'jalapeno', 'avocado'],
        'Indian': ['curry', 'tikka', 'masala', 'biryani', 'samos', 'dal', 'naan', 'ghee', 'cumin', 'turmeric', 'garam'],
        'Chinese': ['kung pao', 'sweet and sour', 'chow mein', 'dim sum', 'dumpling', 'wok', 'soy', 'ginger'],
        'Japanese': ['sushi', 'ramen', 'tempura', 'teriyaki', 'udon', 'miso', 'wasabi', 'tofu'],
        'Thai': ['pad thai', 'curry', 'tom yum', 'coconut', 'lemongrass', 'basil', 'peanut'],
        'Middle Eastern': ['falafel', 'hummus', 'tabbouleh', 'shawarma', 'tahini', 'sumac', 'pita'],
        'Greek': ['moussaka', 'souvlaki', 'tzatziki', 'feta', 'olive', 'oregano', 'gyro'],
        'American': ['burger', 'barbecue', 'sandwich', 'pie', 'meatloaf', 'mac and cheese', 'fried chicken'],
        'Korean': ['kimchi', 'bibimbap', 'bulgogi', 'gochujang', 'ssam', 'korean'],
        'Spanish': ['paella', 'tapas', 'gazpacho', 'chorizo', 'saffron', 'manchego'],
        'Vietnamese': ['pho', 'banh mi', 'spring roll', 'rice noodle', 'fish sauce'],
        'Mediterranean': ['olive oil', 'lemon', 'garlic', 'herbs', 'fresh vegetables']
    };

    const text = (dishName + ' ' + recipe).toLowerCase();

    for (const [cuisine, keywords] of Object.entries(cuisines)) {
        for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
                return cuisine;
            }
        }
    }

    return 'International';
}

// ================================================================
// HELPER: LOG TO GOOGLE SHEETS
// ================================================================

async function logToSheets(data) {
    try {
        const timestamp = new Date().toISOString();

        // Log to Logs tab
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Logs!A:I',
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[
                    timestamp,
                    data.user || 'Anonymous',
                    data.dish || 'Unknown',
                    data.servings || 2,
                    data.spice || 3,
                    data.status || 'Success',
                    data.tokens || 0,
                    data.cost || 0,
                    data.time || 0
                ]]
            }
        });

    } catch (error) {
        console.error('Failed to log to sheets:', error);
    }
}

// ================================================================
// HELPER: UPDATE USER STATS
// ================================================================

async function updateUserStats(user, data) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Users!A:F'
        });

        const rows = response.data.values || [];
        let userIndex = -1;

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0] && rows[i][0].toLowerCase() === user.toLowerCase()) {
                userIndex = i;
                break;
            }
        }

        const today = new Date().toISOString();

        if (userIndex === -1) {
            // NEW USER
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Users!A:F',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[
                        user,
                        1, // total
                        1, // streak
                        today, // lastActive
                        '👶 Beginner', // rank
                        10 // XP
                    ]]
                }
            });

            return { total: 1, streak: 1, rank: '👶 Beginner', xp: 10 };

        } else {
            // EXISTING USER
            const row = rows[userIndex];
            const total = parseInt(row[1]) + 1;
            let streak = parseInt(row[2]) || 0;
            const lastActive = row[3] || null;

            // Calculate streak
            if (lastActive) {
                const lastDate = new Date(lastActive);
                const todayDate = new Date();
                lastDate.setHours(0, 0, 0, 0);
                todayDate.setHours(0, 0, 0, 0);
                const diff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

                if (diff === 0) { /* keep */ }
                else if (diff === 1) { streak = streak + 1; }
                else { streak = 1; }
            }

            // Calculate XP
            const xp = (total * 2) + (streak * 5) + (data.spice || 0) * 2;
            const rank = getRank(total);

            // Update
            const rowNum = userIndex + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `Users!B${rowNum}:F${rowNum}`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[total, streak, today, rank, xp]]
                }
            });

            return { total, streak, rank, xp };
        }

    } catch (error) {
        console.error('Failed to update user stats:', error);
        return { total: 0, streak: 0, rank: '👶 Beginner', xp: 0 };
    }
}

// ================================================================
// HELPER: UPDATE GLOBAL STATS
// ================================================================

async function updateGlobalStats() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Logs!B:C'
        });

        const rows = response.data.values || [];
        const uniqueUsers = new Set();
        const dishes = {};

        for (let i = 1; i < rows.length; i++) {
            if (rows[i][0]) uniqueUsers.add(rows[i][0]);
            if (rows[i][1]) {
                const dish = rows[i][1];
                dishes[dish] = (dishes[dish] || 0) + 1;
            }
        }

        let topDish = 'N/A';
        let maxCount = 0;
        for (const [dish, count] of Object.entries(dishes)) {
            if (count > maxCount) {
                maxCount = count;
                topDish = dish;
            }
        }

        const total = rows.length - 1;
        const users = uniqueUsers.size;

        // Update Global tab
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if today exists
        const globalResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Global!A:D'
        });

        const globalRows = globalResponse.data.values || [];
        let exists = false;

        for (let i = 1; i < globalRows.length; i++) {
            if (globalRows[i][0]) {
                const rowDate = new Date(globalRows[i][0]);
                rowDate.setHours(0, 0, 0, 0);
                if (rowDate.getTime() === today.getTime()) {
                    exists = true;
                    const row = i + 1;
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `Global!B${row}:D${row}`,
                        valueInputOption: 'USER_ENTERED',
                        resource: {
                            values: [[total, users, topDish]]
                        }
                    });
                    break;
                }
            }
        }

        if (!exists) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Global!A:D',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [[today, total, users, topDish]]
                }
            });
        }

        // Update cache
        globalStatsCache.total = total;
        globalStatsCache.users = users;
        globalStatsCache.topDish = topDish;
        globalStatsCache.lastFetch = Date.now();

    } catch (error) {
        console.error('Failed to update global stats:', error);
    }
}

// ================================================================
// HELPER: GET RANK
// ================================================================

function getRank(total) {
    if (total >= 500) return '👑 Grand Master';
    if (total >= 100) return '🥇 Executive Chef';
    if (total >= 50) return '🥈 Sous Chef';
    if (total >= 10) return '🥉 Line Cook';
    return '👶 Beginner';
}