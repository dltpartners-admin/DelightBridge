import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailThreads, emails, drafts, categories } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId');
  if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 });

  const threads = await db
    .select()
    .from(emailThreads)
    .where(eq(emailThreads.accountId, serviceId))
    .orderBy(desc(emailThreads.lastMessageAt));

  if (threads.length === 0) return NextResponse.json([]);

  const allDrafts = await db.select().from(drafts);
  const allCats = await db.select().from(categories).where(eq(categories.accountId, serviceId));

  type MessageRow = typeof emails.$inferSelect;
  const messagesByThread: Record<string, MessageRow[]> = {};
  for (const thread of threads) {
    messagesByThread[thread.id] = await db
      .select()
      .from(emails)
      .where(eq(emails.threadId, thread.id))
      .orderBy(emails.sentAt);
  }

  const draftByThread = Object.fromEntries(allDrafts.map((d) => [d.threadId, d]));
  const catMap = Object.fromEntries(allCats.map((c) => [c.id, c]));

  const result = threads.map((thread) => {
    const draft = draftByThread[thread.id];
    const cat = thread.categoryId ? catMap[thread.categoryId] : null;
    return {
      id: thread.id,
      serviceId: thread.accountId,
      subject: thread.subject,
      customerEmail: thread.customerEmail,
      customerName: thread.customerName,
      categoryId: cat ? cat.id : (thread.categoryId ?? ''),
      status: thread.status,
      detectedLanguage: thread.detectedLanguage,
      isRead: thread.isRead,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      draft: draft?.content ?? '',
      draftSubject: draft?.subject ?? `Re: ${thread.subject}`,
      draftAttachments: [],
      translation: draft?.translation ?? '',
      messages: (messagesByThread[thread.id] ?? []).map((m) => ({
        id: m.id,
        fromEmail: m.fromEmail,
        fromName: m.fromName,
        toEmail: m.toEmail,
        body: m.body,
        direction: m.direction,
        timestamp: m.sentAt.toISOString(),
        attachments: [],
      })),
    };
  });

  return NextResponse.json(result);
}
