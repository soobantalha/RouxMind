# RouxMind

AI recipe generator — by Sooban Talha Technologies (founder: Sooban Talha).
Website: https://soobantalhatech.xyz

## What's here

```
RouxMind/
├── api/recipe.js     # Backend: Mesh API calls + Google Sheets logging
├── index.html         # Landing page
├── recipe.html         # Main app (generator)
├── style.css            # Design system
├── app.js                # Frontend logic (localStorage, generation, PDF)
├── package.json
├── vercel.json
└── logo.png / logowithname.png / ceo.png / clogo.png   ← add these yourself
```

## 1. Add your images

Place these files in the project root (not included — upload them yourself):
`logo.png`, `logowithname.png`, `ceo.png`, `clogo.png`

## 2. Get a Mesh API key

1. Go to https://link.meshapi.ai/landing/ and create an account.
2. Copy your key (starts with `mesh_sk_...`).

## 3. Set up Google Sheets logging (optional but recommended)

1. Create a new Google Sheet. Add two tabs: `GenerationLog` and `Analytics`.
2. In `GenerationLog`, row 1 headers: `Timestamp | User | Dish | Servings | Spice | Time | Status | Tokens | Cost | ResponseTime`
3. Go to https://console.cloud.google.com → create a project → enable **Google Sheets API**.
4. Create a **Service Account** → generate a JSON key.
5. Share your Google Sheet with the service account's email (found in the JSON, `client_email`) as **Editor**.
6. Copy the Sheet ID from its URL: `docs.google.com/spreadsheets/d/**THIS_PART**/edit`

## 4. Environment variables (Vercel → Settings → Environment Variables)

```
MESH_API_KEY=mesh_sk_...
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
(Keep the `\n` characters literal when pasting into Vercel — the code converts them back.)

## 5. Deploy

```bash
npm install
vercel --prod
```

## 6. Analytics tab

Add formulas in the `Analytics` tab referencing `GenerationLog`, e.g.:
- Total generations: `=COUNTA(GenerationLog!A2:A)`
- Success rate: `=COUNTIF(GenerationLog!G:G,"Success")/COUNTA(GenerationLog!G2:G)`
- Total cost: `=SUM(GenerationLog!I2:I)`
- Avg response time: `=AVERAGE(GenerationLog!J2:J)`