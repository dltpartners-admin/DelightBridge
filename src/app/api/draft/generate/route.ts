import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { messages, document, categories, signature } = await req.json();

    // Build readable thread text
    const threadText = messages
      .map(
        (m: { direction: string; fromName: string; timestamp: string; body: string }) =>
          `[${m.direction === 'inbound' ? 'Customer' : 'Support (previous)'}] ${m.fromName} — ${new Date(m.timestamp).toLocaleString('en-US')}\n${m.body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}`
      )
      .join('\n\n---\n\n');

    const categoryList = categories
      .map((c: { id: string; name: string }) => `- id: "${c.id}", name: "${c.name}"`)
      .join('\n');

    const prompt = `You are a professional, empathetic customer support agent. Based on the email thread below, write a helpful reply draft.

## Reference Document
${document}

## Email Thread
${threadText}

## Available Categories
${categoryList}

## Instructions
1. Write ONLY the reply body in HTML (use <p>, <strong>, <em>, <ol>, <ul>, <li>, <a> as appropriate)
2. Be warm, empathetic, and solution-focused
3. Use the customer's first name
4. Do NOT include a greeting sign-off or signature — just the reply body content
5. Write in the SAME LANGUAGE as the customer's most recent message
6. Determine the most appropriate category from the list above
7. Keep it concise but complete

Respond with valid JSON only (no markdown code fences):
{
  "draft": "<p>...</p>",
  "categoryId": "the-id-here",
  "detectedLanguage": "en"
}`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    // Parse JSON from response (handle potential markdown code blocks)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    }
    const result = JSON.parse(jsonText);

    // Append signature to the generated draft
    if (signature && result.draft) {
      result.draft = result.draft + `<hr>${signature}`;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Draft generation error:', error instanceof Error ? error.message : error);
    console.error('Full error:', error);
    return NextResponse.json(
      { error: 'Failed to generate draft', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
