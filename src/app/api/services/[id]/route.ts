import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gmailAccounts, categories } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq } from 'drizzle-orm';
import { stringifyTemplates } from '@/lib/email-templates';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json();

  const allowed = ['name', 'email', 'color', 'signature', 'document'] as const;
  const patch: Partial<typeof gmailAccounts.$inferInsert> = {};
  for (const key of allowed) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key];
  }
  if ('templates' in body) {
    patch.templates = stringifyTemplates(body.templates);
  }

  if (Object.keys(patch).length > 0) {
    await db.update(gmailAccounts).set(patch).where(eq(gmailAccounts.id, id));
  }

  // Handle categories upsert if provided
  if (Array.isArray(body.categories)) {
    await db.delete(categories).where(eq(categories.accountId, id));
    if (body.categories.length > 0) {
      await db.insert(categories).values(
        body.categories.map((c: { id: string; name: string; color: string; textColor: string }) => ({
          id: c.id,
          accountId: id,
          name: c.name,
          color: c.color,
          textColor: c.textColor,
        }))
      );
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await db.delete(gmailAccounts).where(eq(gmailAccounts.id, id));
  return NextResponse.json({ ok: true });
}
