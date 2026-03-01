import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { drafts } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq } from 'drizzle-orm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { threadId } = await params;
  const [draft] = await db.select().from(drafts).where(eq(drafts.threadId, threadId));
  return NextResponse.json(draft ?? null);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { threadId } = await params;
  const { content, subject, translation, status } = await req.json();

  await db
    .insert(drafts)
    .values({
      id: `draft-${threadId}`,
      threadId,
      content: content ?? '',
      subject: subject ?? '',
      translation: translation ?? '',
      status: status ?? 'ready',
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: drafts.threadId,
      set: {
        ...(content !== undefined && { content }),
        ...(subject !== undefined && { subject }),
        ...(translation !== undefined && { translation }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
      },
    });

  return NextResponse.json({ ok: true });
}
