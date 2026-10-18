/**
 * POST /api/analyze-food   (Vercel serverless function)
 *
 * Body:    { image: <base64 jpeg/png/webp>, mimeType: string, grams: number }
 * Headers: Authorization: Bearer <supabase access token>
 * Reply:   { name, calories, confidence, note }
 *
 * Provider is chosen from the environment (Vercel → Project → Settings →
 * Environment Variables). Set ONE of these — never with a VITE_ prefix:
 *
 *   GEMINI_API_KEY      – preferred. Free key from https://aistudio.google.com/apikey
 *   GEMINI_MODEL        – optional, defaults to "gemini-3.8-flash"
 *   ANTHROPIC_API_KEY   – alternative provider (Claude)
 *
 * Also reused from the front-end config: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedMime = typeof ALLOWED_MIME[number];
const MAX_IMAGE_CHARS = 4_000_000; // ≈ 3 MB once decoded — well under Vercel's 4.5 MB body limit

const SYSTEM_PROMPT =
  'You are a nutritionist helping someone log meals in a fitness tracker. ' +
  'Identify the food in the photo and estimate its energy content for the portion size the user gives. ' +
  'Use typical Indian and international recipes when relevant, account for visible oil, ghee, sauces and sides, ' +
  'and give a realistic single number rather than a range. If the photo is not food, name it "Not food" with 0 calories and low confidence.';

const FOOD_SCHEMA = {
  type: 'object',
  properties: {
    name:       { type: 'string', description: 'Short dish name, e.g. "Paneer butter masala with 2 rotis"' },
    calories:   { type: 'integer', description: 'Estimated kcal for the requested portion' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    note:       { type: 'string', description: 'One short sentence on what drove the estimate, or empty' },
  },
  required: ['name', 'calories', 'confidence', 'note'],
} as const;

interface FoodResult {
  name: string;
  calories: number;
  confidence: 'low' | 'medium' | 'high';
  note: string;
}

/** An error we want to show to the user with a specific HTTP status. */
class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

async function verifySupabaseUser(token: string): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch {
    return false;
  }
}

function isAllowedMime(m: unknown): m is AllowedMime {
  return typeof m === 'string' && (ALLOWED_MIME as readonly string[]).includes(m);
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

/** Parse the model's JSON, tolerating stray text around it. */
function parseFood(text: string): FoodResult {
  let parsed = safeJson(text) as Partial<FoodResult> | null;
  if (!parsed) {
    const m = text.match(/\{[\s\S]*\}/);
    parsed = m ? (safeJson(m[0]) as Partial<FoodResult> | null) : null;
  }
  if (!parsed || typeof parsed.name !== 'string' || typeof parsed.calories !== 'number') {
    throw new ProviderError(502, 'The analysis service returned an unexpected answer. Please try again.');
  }
  return {
    name: parsed.name,
    calories: Math.max(0, Math.round(parsed.calories)),
    confidence: ['low', 'medium', 'high'].includes(String(parsed.confidence)) ? parsed.confidence as FoodResult['confidence'] : 'medium',
    note: typeof parsed.note === 'string' ? parsed.note : '',
  };
}

/* ── Provider: Gemini (REST, no SDK needed) ──────────────────────────── */

async function analyzeWithGemini(apiKey: string, image: string, mimeType: AllowedMime, grams: number): Promise<FoodResult> {
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: image } },
          { text: `Estimate the calories for a ${Math.round(grams)} g portion of what is shown. Reply as JSON with keys name, calories, confidence, note.` },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseJsonSchema: FOOD_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
    const msg = body.error?.message ?? '';
    if (res.status === 400 && /api key/i.test(msg)) throw new ProviderError(500, 'The server\'s GEMINI_API_KEY is invalid.');
    if (res.status === 403) throw new ProviderError(500, 'The GEMINI_API_KEY is not allowed to use this model. Check the key in Google AI Studio.');
    if (res.status === 404) throw new ProviderError(500, `Gemini model "${model}" was not found. Set GEMINI_MODEL in Vercel to a current model.`);
    if (res.status === 429) throw new ProviderError(429, 'Daily free Gemini quota reached. Try again tomorrow or log the meal manually.');
    throw new ProviderError(502, `Gemini error ${res.status}${msg ? `: ${msg}` : ''}.`);
  }

  const data = await res.json() as {
    promptFeedback?: { blockReason?: string };
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };

  if (data.promptFeedback?.blockReason) {
    throw new ProviderError(422, 'The analysis service declined to process this image. Please log the meal manually.');
  }
  const cand = data.candidates?.[0];
  if (!cand || (cand.finishReason && cand.finishReason !== 'STOP' && cand.finishReason !== 'MAX_TOKENS')) {
    throw new ProviderError(422, 'The analysis service could not describe this image. Please try another photo.');
  }
  const text = (cand.content?.parts ?? []).map(p => p.text ?? '').join('');
  return parseFood(text);
}

/* ── Provider: Anthropic (Claude) ────────────────────────────────────── */

async function analyzeWithAnthropic(image: string, mimeType: AllowedMime, grams: number): Promise<FoodResult> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: { ...FOOD_SCHEMA, additionalProperties: false } },
      },
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: image } },
          { type: 'text', text: `Estimate the calories for a ${Math.round(grams)} g portion of what is shown.` },
        ],
      }],
    });

    if (response.stop_reason === 'refusal') {
      throw new ProviderError(422, 'The analysis service declined to process this image. Please log the meal manually.');
    }
    const text = response.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map(b => b.text)
      .join('');
    return parseFood(text);
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new ProviderError(500, 'The server\'s ANTHROPIC_API_KEY is invalid.');
    if (err instanceof Anthropic.RateLimitError) throw new ProviderError(429, 'Analysis service is busy. Please try again in a moment.');
    if (err instanceof Anthropic.APIError) throw new ProviderError(502, `Analysis service error (${err.status ?? 'unknown'}).`);
    throw err;
  }
}

/* ── Handler ─────────────────────────────────────────────────────────── */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    return res.status(500).json({ error: 'Photo analysis is not configured: add GEMINI_API_KEY (or ANTHROPIC_API_KEY) in Vercel environment variables.' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Supabase environment variables are missing on the server.' });
  }

  // ── Auth: only signed-in FitTrack users may spend API quota ──
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !(await verifySupabaseUser(token))) {
    return res.status(401).json({ error: 'Please sign in again to use photo analysis.' });
  }

  // ── Input validation ──
  const body = (typeof req.body === 'string' ? safeJson(req.body) : req.body ?? {}) as Record<string, unknown>;
  const image = body.image;
  const mimeType = body.mimeType;
  const grams = Number(body.grams);

  if (typeof image !== 'string' || image.length === 0) return res.status(400).json({ error: 'Missing image.' });
  if (image.length > MAX_IMAGE_CHARS) return res.status(413).json({ error: 'Image is too large. Please use a smaller photo.' });
  if (!isAllowedMime(mimeType)) return res.status(400).json({ error: 'Unsupported image type.' });
  if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) return res.status(400).json({ error: 'Portion size must be between 1 and 5000 g.' });

  try {
    const result = geminiKey
      ? await analyzeWithGemini(geminiKey, image, mimeType, grams)
      : await analyzeWithAnthropic(image, mimeType, grams);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof ProviderError) return res.status(err.status).json({ error: err.message });
    console.error('analyze-food failed:', err);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
