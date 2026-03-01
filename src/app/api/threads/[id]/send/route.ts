import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { drafts, emailThreads, emails, gmailAccounts } from '@/lib/db/schema';
import { sendGmailMessage } from '@/lib/gmail';
import { requirePermission } from '@/lib/session';

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function buildRawMime({
  from,
  to,
  subject,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];

  return toBase64Url(lines.join('\r\n'));
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized, forbidden } = await requirePermission(['send', 'admin']);
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const { id: threadId } = await params;

  const [thread] = await db
    .select()
    .from(emailThreads)
    .where(eq(emailThreads.id, threadId));
  if (!thread) {
    return NextResponse.json({ error: 'thread not found' }, { status: 404 });
  }

  const [account] = await db
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, thread.accountId));
  if (!account) {
    return NextResponse.json({ error: 'service account not found' }, { status: 404 });
  }

  if (!account.refreshToken) {
    return NextResponse.json({ error: 'service gmail not connected' }, { status: 400 });
  }

  const [draft] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.threadId, thread.id));

  const html = draft?.content ?? '';
  const subject = draft?.subject || `Re: ${thread.subject}`;

  if (!stripHtml(html)) {
    return NextResponse.json({ error: 'draft is empty' }, { status: 400 });
  }

  if (draft?.status === 'sent' && draft.sentAt && draft.updatedAt <= draft.sentAt) {
    return NextResponse.json({ error: 'already_sent' }, { status: 409 });
  }

  const [recentOutbound] = await db
    .select({ body: emails.body, sentAt: emails.sentAt })
    .from(emails)
    .where(and(eq(emails.threadId, thread.id), eq(emails.direction, 'outbound')))
    .orderBy(desc(emails.sentAt))
    .limit(1);

  if (
    recentOutbound &&
    stripHtml(recentOutbound.body) === stripHtml(html) &&
    Date.now() - recentOutbound.sentAt.getTime() < 90 * 1000
  ) {
    return NextResponse.json({ error: 'duplicate_send_blocked' }, { status: 409 });
  }

  const raw = buildRawMime({
    from: account.email,
    to: thread.customerEmail,
    subject,
    html,
  });

  const result = await sendGmailMessage({
    accountId: account.id,
    raw,
    threadId: thread.gmailThreadId,
  });

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(emailThreads)
      .set({
        status: 'sent',
        isRead: true,
        lastMessageAt: now,
        ...(result.threadId ? { gmailThreadId: result.threadId } : {}),
      })
      .where(eq(emailThreads.id, thread.id));

    await tx
      .insert(drafts)
      .values({
        id: `draft-${thread.id}`,
        threadId: thread.id,
        subject,
        content: html,
        translation: draft?.translation ?? '',
        status: 'sent',
        sentAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: drafts.threadId,
        set: {
          subject,
          content: html,
          status: 'sent',
          sentAt: now,
          updatedAt: now,
        },
      });

    await tx
      .insert(emails)
      .values({
        id: result.id ? `email-${thread.id}-${result.id}` : `email-${thread.id}-${now.getTime()}`,
        threadId: thread.id,
        gmailMessageId: result.id ?? null,
        fromEmail: account.email,
        fromName: account.name,
        toEmail: thread.customerEmail,
        body: html,
        direction: 'outbound',
        sentAt: now,
      })
      .onConflictDoNothing();
  });

  return NextResponse.json({ ok: true, gmailMessageId: result.id ?? null });
}
