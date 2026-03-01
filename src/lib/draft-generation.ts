import Anthropic from '@anthropic-ai/sdk';

type DraftGenerationMessage = {
  direction: 'inbound' | 'outbound';
  fromName: string;
  timestamp: string;
  body: string;
};

type DraftGenerationCategory = {
  id: string;
  name: string;
};

type DraftGenerationInput = {
  messages: DraftGenerationMessage[];
  document: string;
  categories: DraftGenerationCategory[];
  signature: string;
};

type DraftGenerationResult = {
  draft: string;
  categoryId?: string;
  detectedLanguage?: string;
};

const client = new Anthropic();

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseJsonText(content: string) {
  let jsonText = content.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonText) as DraftGenerationResult;
}

export async function generateDraftFromContext(input: DraftGenerationInput) {
  const threadText = input.messages
    .map(
      (m) =>
        `[${m.direction === 'inbound' ? 'Customer' : 'Support (previous)'}] ${m.fromName} — ${new Date(m.timestamp).toLocaleString('en-US')}\n${stripHtml(m.body)}`
    )
    .join('\n\n---\n\n');

  const categoryList = input.categories
    .map((c) => `- id: "${c.id}", name: "${c.name}"`)
    .join('\n');

  const prompt = `You are a professional, empathetic customer support agent. Based on the email thread below, write a helpful reply draft.

## Reference Document
${input.document}

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
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  const result = parseJsonText(content.text);
  if (input.signature && result.draft) {
    result.draft = result.draft + `<hr>${input.signature}`;
  }

  return result;
}
