import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailThreads } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq } from 'drizzle-orm';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json();

  const threadPatch: Partial<typeof emailThreads.$inferInsert> = {};
  if ('status' in body) threadPatch.status = body.status;
  if ('isRead' in body) threadPatch.isRead = body.isRead;
  if ('categoryId' in body) threadPatch.categoryId = body.categoryId;
  if ('detectedLanguage' in body) threadPatch.detectedLanguage = body.detectedLanguage;

  if (Object.keys(threadPatch).length > 0) {
    await db.update(emailThreads).set(threadPatch).where(eq(emailThreads.id, id));
  }

  return NextResponse.json({ ok: true });
}
