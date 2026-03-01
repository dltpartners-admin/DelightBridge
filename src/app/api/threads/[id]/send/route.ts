import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
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
  await db
    .update(emailThreads)
    .set({
      status: 'sent',
      isRead: true,
      lastMessageAt: now,
      ...(result.threadId ? { gmailThreadId: result.threadId } : {}),
    })
    .where(eq(emailThreads.id, thread.id));

  await db
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
        status: 'sent',
        sentAt: now,
        updatedAt: now,
      },
    });

  await db.insert(emails).values({
    id: `email-${thread.id}-${now.getTime()}`,
    threadId: thread.id,
    gmailMessageId: result.id ?? null,
    fromEmail: account.email,
    fromName: account.name,
    toEmail: thread.customerEmail,
    body: html,
    direction: 'outbound',
    sentAt: now,
  });

  return NextResponse.json({ ok: true, gmailMessageId: result.id ?? null });
}
