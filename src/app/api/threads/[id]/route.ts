import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { categories, drafts, emails, emailThreads, gmailAccounts, serviceSenderIdentities } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { and, eq } from 'drizzle-orm';
import { markGmailThreadAsRead, markGmailThreadAsUnread } from '@/lib/gmail';
import { stripHtml } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, id));
  if (!thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }

  const [draft] = await db.select().from(drafts).where(eq(drafts.threadId, id));
  const threadMessages = await db
    .select()
    .from(emails)
    .where(eq(emails.threadId, id))
    .orderBy(emails.sentAt);

  const allCats = await db.select().from(categories).where(eq(categories.accountId, thread.accountId));
  const catMap = Object.fromEntries(allCats.map((c) => [c.id, c]));
  const cat = thread.categoryId ? catMap[thread.categoryId] : null;
  const lastMessage = threadMessages[threadMessages.length - 1];

  return NextResponse.json({
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
    messages: threadMessages.map((m) => ({
      id: m.id,
      fromEmail: m.fromEmail,
      fromName: m.fromName,
      toEmail: m.toEmail,
      body: m.body,
      direction: m.direction,
      timestamp: m.sentAt.toISOString(),
      attachments: [],
    })),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const [thread] = await db.select().from(emailThreads).where(eq(emailThreads.id, id));
  if (!thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }

  const body = await req.json();

  const threadPatch: Partial<typeof emailThreads.$inferInsert> = {};
  if ('status' in body) threadPatch.status = body.status;
  if ('isRead' in body) threadPatch.isRead = body.isRead;
  if ('categoryId' in body) threadPatch.categoryId = body.categoryId;
  if ('replyFromEmail' in body) threadPatch.replyFromEmail = body.replyFromEmail;
  if ('detectedLanguage' in body) threadPatch.detectedLanguage = body.detectedLanguage;

  if ('replyFromEmail' in body) {
    const nextReplyFromEmail = (body.replyFromEmail ?? '').trim().toLowerCase();
    if (!nextReplyFromEmail) {
      threadPatch.replyFromEmail = null;
    } else {
      const [matchedIdentity] = await db
        .select({ email: serviceSenderIdentities.email, isEnabled: serviceSenderIdentities.isEnabled })
        .from(serviceSenderIdentities)
        .where(
          and(
            eq(serviceSenderIdentities.accountId, thread.accountId),
            eq(serviceSenderIdentities.email, nextReplyFromEmail)
          )
        )
        .limit(1);

      if (!matchedIdentity || !matchedIdentity.isEnabled) {
        return NextResponse.json({ error: 'invalid_reply_from_email' }, { status: 400 });
      }
      threadPatch.replyFromEmail = matchedIdentity.email;
    }
  }

  if ((typeof body.isRead === 'boolean' || body.status === 'archived') && thread.gmailThreadId) {
    const [account] = await db
      .select({ refreshToken: gmailAccounts.refreshToken })
      .from(gmailAccounts)
      .where(eq(gmailAccounts.id, thread.accountId));

    if (account?.refreshToken) {
      if (body.status === 'archived' || body.isRead === true) {
        await markGmailThreadAsRead({ accountId: thread.accountId, threadId: thread.gmailThreadId });
      } else if (body.isRead === false) {
        await markGmailThreadAsUnread({ accountId: thread.accountId, threadId: thread.gmailThreadId });
      }
    }
  }

  if (Object.keys(threadPatch).length > 0) {
    await db.update(emailThreads).set(threadPatch).where(eq(emailThreads.id, id));
  }

  return NextResponse.json({ ok: true });
}
