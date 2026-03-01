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

type DraftTranslationOptions = {
  referenceDocument?: string;
  toneGuide?: string;
  threadMessages?: Array<{
    direction: 'inbound' | 'outbound';
    fromName: string;
    timestamp: string;
    body: string;
  }>;
};

export async function translateDraftToKorean(
  draftHtml: string,
  options?: DraftTranslationOptions
) {
  const draftText = stripHtml(draftHtml);
  if (!draftText || isKorean(draftText)) {
    return '';
  }

  const referenceDocument = options?.referenceDocument?.trim() ?? '';
  const toneGuide = options?.toneGuide?.trim() ?? '';
  const threadMessages = options?.threadMessages ?? [];

  const threadContext = threadMessages
    .map(
      (m) =>
        `[${m.direction === 'inbound' ? 'Customer' : 'Support'}] ${m.fromName} — ${new Date(m.timestamp).toLocaleString('en-US')}\n${stripHtml(m.body)}`
    )
    .join('\n\n---\n\n');

  const guidanceSection =
    referenceDocument || toneGuide
      ? `\n## Project Reference\n${referenceDocument || '(none)'}\n\n## Tone Guide\n${toneGuide || 'Follow the style implied by the project reference document.'}\n\n`
      : '';

  const prompt = `Translate the following customer support email draft into Korean.
Preserve the professional and empathetic tone, and align wording with the project reference/tone guide if provided.

${guidanceSection}

${threadContext ? `## Full Thread Context\n${threadContext}\n\n` : ''}

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
