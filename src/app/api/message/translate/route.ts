import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { body } = await req.json();
    const plainText = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!plainText) {
      return NextResponse.json({ translation: '' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Translate the following email message into Korean. Keep it natural and preserve the original tone.\n\n${plainText}\n\nReturn ONLY valid JSON:\n{ "translation": "Korean translation here" }`,
        },
      ],
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
    console.error('Message translation error:', error);
    return NextResponse.json({ error: 'Failed to translate message' }, { status: 500 });
  }
}
