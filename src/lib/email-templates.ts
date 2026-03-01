import type { EmailTemplate } from './types';

function isEmailTemplate(value: unknown): value is EmailTemplate {
  return !!value
    && typeof value === 'object'
    && typeof (value as { id?: unknown }).id === 'string'
    && typeof (value as { name?: unknown }).name === 'string'
    && typeof (value as { body?: unknown }).body === 'string';
}

export function parseTemplates(raw: string | null | undefined): EmailTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEmailTemplate);
  } catch {
    return [];
  }
}

export function stringifyTemplates(templates: unknown): string {
  if (!Array.isArray(templates)) return '[]';
  const normalized = templates.filter(isEmailTemplate);
  return JSON.stringify(normalized);
}
