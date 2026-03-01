import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { unauthorized } = await requireSession();
    if (unauthorized) return unauthorized;

    const { draft, instruction, messages } = await req.json();

    const draftText = draft.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    const lastMessage = messages?.[messages.length - 1];
    const customerLastMsg = lastMessage?.body?.replace(/<[^>]*>/g, '').trim() ?? '';

    const prompt = `You are a customer support email editor. Revise the following draft email based on the instruction.

## Customer's last message
${customerLastMsg}

## Current Draft (plain text)
${draftText}

## Instruction
${instruction}

## Requirements
- Keep the same general meaning and key information
- Return ONLY the revised draft in HTML format (use <p>, <strong>, <em>, <ol>, <ul>, <li>, <a> as appropriate)
- Do NOT include a signature
- Match the language of the original draft
- Return valid JSON only:
{ "draft": "<p>...</p>" }`;

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
    console.error('Talk to draft error:', error);
    return NextResponse.json({ error: 'Failed to revise draft' }, { status: 500 });
  }
}
