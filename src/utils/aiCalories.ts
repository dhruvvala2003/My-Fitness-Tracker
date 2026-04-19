const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

export interface FoodAnalysis {
  name: string;
  calories: number;
}

export async function analyzeFood(base64: string, mimeType: string, grams: number): Promise<FoodAnalysis> {
  if (!API_KEY) {
    throw new Error('API key not set. Create a .env file with VITE_ANTHROPIC_API_KEY=your_key');
  }

  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-request-from-browser': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 128,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            {
              type: 'text',
              text: `Identify this food and estimate calories for ${grams}g.\nReply ONLY with valid JSON — no extra text:\n{"name":"<food name>","calories":<integer>}`,
            },
          ],
        }],
      }),
    });
  } catch {
    throw new Error(
      'Network request failed. Possible causes:\n' +
      '• Ad blocker blocking api.anthropic.com\n' +
      '• No internet connection\n' +
      '• CORS restriction in your browser'
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const msg = err?.error?.message ?? `API error ${res.status}`;
    if (res.status === 401) throw new Error('Invalid API key. Check your VITE_ANTHROPIC_API_KEY.');
    throw new Error(msg);
  }

  const data = await res.json() as { content: { text: string }[] };
  const raw = data.content[0].text.trim();

  // Extract JSON even if AI adds extra text
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI returned unexpected format. Try again.');

  const parsed = JSON.parse(match[0]) as { name?: string; calories?: number };
  if (!parsed.name || typeof parsed.calories !== 'number') {
    throw new Error('AI returned incomplete data. Try again.');
  }
  return { name: parsed.name, calories: parsed.calories };
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      resolve({ base64: result.split(',')[1], mimeType: file.type });
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
