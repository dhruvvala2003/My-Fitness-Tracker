/**
 * Food-photo calorie estimation.
 *
 * The browser never calls the AI provider directly — the API key would be
 * visible to anyone who opens DevTools. Instead the image is sent to our own
 * serverless function (api/analyze-food.ts on Vercel), which checks the
 * Supabase session and holds the key (Gemini or Anthropic) server-side.
 */
import { supabase } from '../lib/supabase';

export interface FoodAnalysis {
  name: string;
  calories: number;
  confidence: 'low' | 'medium' | 'high';
  note?: string;
}

export async function analyzeFood(base64: string, mimeType: string, grams: number): Promise<FoodAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to use photo analysis.');

  let res: Response;
  try {
    res = await fetch('/api/analyze-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ image: base64, mimeType, grams }),
    });
  } catch {
    throw new Error('Could not reach the analysis service. Check your connection and try again.');
  }

  if (res.status === 404) {
    throw new Error(
      'Photo analysis is only available on the deployed (Vercel) site. ' +
      'Locally, run `npx vercel dev` instead of `npm run dev`, or log the meal manually.',
    );
  }

  const body = await res.json().catch(() => ({})) as Partial<FoodAnalysis> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Analysis failed (${res.status}).`);
  if (!body.name || typeof body.calories !== 'number') throw new Error('Unexpected response from the analysis service.');

  return {
    name: body.name,
    calories: Math.max(0, Math.round(body.calories)),
    confidence: body.confidence ?? 'medium',
    note: body.note,
  };
}

/**
 * Downscale + re-encode the photo before upload. Phone photos are 3–8 MB,
 * which blows past Vercel's 4.5 MB request limit once base64-encoded and
 * wastes tokens; 1024 px JPEG is plenty for recognising a plate of food.
 */
export function prepareImage(file: File, maxSide = 1024, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not process the image.')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image file.')); };
    img.src = url;
  });
}
