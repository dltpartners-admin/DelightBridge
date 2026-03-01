import Anthropic from '@anthropic-ai/sdk';
import { isKorean, stripHtml } from '@/lib/utils';

const client = new Anthropic();

function parseJsonText(content: string) {
  let jsonText = content.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(jsonText) as { translation: string };
}

export async function translateDraftToKorean(draftHtml: string) {
  const draftText = stripHtml(draftHtml);
  if (!draftText || isKorean(draftText)) {
    return '';
  }

  const prompt = `Translate the following customer support email draft into Korean. Preserve the professional and empathetic tone.

## Original Draft
${draftText}

Return ONLY valid JSON with the translation as a plain text string (no HTML tags):
{ "translation": "Korean translation here..." }`;

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
  return `<p>${result.translation}</p>`;
}
