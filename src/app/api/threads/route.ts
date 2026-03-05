import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailThreads, emails, drafts, categories } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { desc, eq, inArray } from 'drizzle-orm';
import { stripHtml } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get('serviceId');
  const includeMessages = searchParams.get('includeMessages') === '1';
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') ?? '100') || 100));
  if (!serviceId) return NextResponse.json({ error: 'serviceId required' }, { status: 400 });

  const threads = await db
    .select()
    .from(emailThreads)
    .where(eq(emailThreads.accountId, serviceId))
    .orderBy(desc(emailThreads.lastMessageAt))
    .limit(limit);

  if (threads.length === 0) return NextResponse.json([]);

  const threadIds = threads.map((thread) => thread.id);
  const allDrafts = await db.select().from(drafts).where(inArray(drafts.threadId, threadIds));
  const allCats = await db.select().from(categories).where(eq(categories.accountId, serviceId));

  const allMessages = await db
    .select()
    .from(emails)
    .where(inArray(emails.threadId, threadIds))
    .orderBy(emails.sentAt);

  type MessageRow = typeof emails.$inferSelect;
  const messagesByThread = new Map<string, MessageRow[]>();
  for (const message of allMessages) {
    const bucket = messagesByThread.get(message.threadId) ?? [];
    bucket.push(message);
    messagesByThread.set(message.threadId, bucket);
  }

  const draftByThread = Object.fromEntries(allDrafts.map((d) => [d.threadId, d]));
  const catMap = Object.fromEntries(allCats.map((c) => [c.id, c]));

  const result = threads.map((thread) => {
    const draft = draftByThread[thread.id];
    const cat = thread.categoryId ? catMap[thread.categoryId] : null;
    const threadMessages = messagesByThread.get(thread.id) ?? [];
    const lastMessage = threadMessages[threadMessages.length - 1];
    return {
      id: thread.id,
      serviceId: thread.accountId,
      subject: thread.subject,
      customerEmail: thread.customerEmail,
      customerName: thread.customerName,
      categoryId: cat ? cat.id : (thread.categoryId ?? ''),
      replyFromEmail: thread.replyFromEmail ?? '',
      status: thread.status,
      detectedLanguage: thread.detectedLanguage,
      isRead: thread.isRead,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      draft: draft?.content ?? '',
      draftSubject: draft?.subject ?? `Re: ${thread.subject}`,
      draftAttachments: [],
      translation: draft?.translation ?? '',
      lastMessagePreview: lastMessage ? stripHtml(lastMessage.body) : '',
      messageCount: threadMessages.length,
      messages: includeMessages ? threadMessages.map((m) => ({
        id: m.id,
        fromEmail: m.fromEmail,
        fromName: m.fromName,
        toEmail: m.toEmail,
        body: m.body,
        direction: m.direction,
        timestamp: m.sentAt.toISOString(),
        attachments: [],
      })) : [],
    };
  });

  return NextResponse.json(result);
}
