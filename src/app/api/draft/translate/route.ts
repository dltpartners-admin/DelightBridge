import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { draft } = await req.json();
    const draftText = draft.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    const prompt = `Translate the following customer support email draft into Korean. Preserve the professional and empathetic tone.

## Original Draft
${draftText}

Return ONLY valid JSON:
{ "translation": "<p>Korean translation here...</p>" }`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    const result = JSON.parse(jsonText);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
