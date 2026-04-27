import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

async function groq(systemPrompt: string, userMessage: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === 'your_groq_api_key_here') {
    throw new Error('GROQ_API_KEY is not configured. Add it to .env.local');
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { action, payload } = await req.json();

    if (action === 'generateDescription') {
      const { name, category, subcategory, tags } = payload as {
        name: string;
        category: string;
        subcategory?: string;
        tags?: string[];
      };

      const system = `You are a copywriter for Kentaz Emporium, a premium Nigerian fashion and lifestyle brand.
Write compelling, concise product descriptions (2-4 sentences, ~80-120 words) that highlight quality, fit, and occasion.
Use warm, aspirational language. Return only the description — no labels, no markdown.`;

      const user = `Product: ${name}
Category: ${category}${subcategory ? ` / ${subcategory}` : ''}${tags?.length ? `\nKeywords: ${tags.join(', ')}` : ''}`;

      const description = await groq(system, user);
      return NextResponse.json({ description });
    }

    if (action === 'suggestTags') {
      const { name, category, description } = payload as {
        name: string;
        category: string;
        description?: string;
      };

      const system = `You are a product tagging assistant for a Nigerian fashion and lifestyle e-commerce store.
Return exactly 6-8 concise, lowercase tags relevant to the product — no duplicates, no # symbols.
Format: comma-separated list on a single line. Nothing else.`;

      const user = `Product: ${name}
Category: ${category}${description ? `\nDescription: ${description}` : ''}`;

      const raw = await groq(system, user);
      const tags = raw
        .split(',')
        .map((t: string) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 8);

      return NextResponse.json({ tags });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
