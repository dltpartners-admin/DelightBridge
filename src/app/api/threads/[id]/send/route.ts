import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, isNotNull, isNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { drafts, emailThreads, emails, gmailAccounts, sendOutbox } from '@/lib/db/schema';
import { markGmailThreadAsRead, sendGmailMessage } from '@/lib/gmail';
import { requirePermission } from '@/lib/session';

const PENDING_TIMEOUT_MS = 2 * 60 * 1000;

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function normalizeHeaderValue(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\r?\n[ \t]*/g, ' ');
  return normalized ? normalized : null;
}

function mergeReferences(current: string | null, inReplyTo: string | null) {
  if (!inReplyTo) return current;
  if (!current) return inReplyTo;
  return current.includes(inReplyTo) ? current : `${current} ${inReplyTo}`;
}

function buildRawMime({
  from,
  to,
  subject,
  html,
  inReplyTo,
  references,
}: {
  from: string;
  to: string;
  subject: string;
  html: string;
  inReplyTo?: string | null;
  references?: string | null;
}) {
  const normalizedInReplyTo = normalizeHeaderValue(inReplyTo);
  const normalizedReferences = normalizeHeaderValue(references);
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    ...(normalizedInReplyTo ? [`In-Reply-To: ${normalizedInReplyTo}`] : []),
    ...(normalizedReferences ? [`References: ${normalizedReferences}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];

  return toBase64Url(lines.join('\r\n'));
}

export async function POST(
  req: NextRequest,
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
  const idempotencyKey =
    req.headers.get('x-idempotency-key')?.trim() ||
    `thread:${thread.id}:draft:${draft?.updatedAt.getTime() ?? 0}`;

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

  const [replyAnchor] = await db
    .select({
      rfcMessageId: emails.rfcMessageId,
      references: emails.references,
    })
    .from(emails)
    .where(and(eq(emails.threadId, thread.id), isNotNull(emails.rfcMessageId)))
    .orderBy(desc(emails.sentAt))
    .limit(1);

  const inReplyTo = normalizeHeaderValue(replyAnchor?.rfcMessageId);
  const references = mergeReferences(normalizeHeaderValue(replyAnchor?.references), inReplyTo);

  const [existingOutbox] = await db
    .select()
    .from(sendOutbox)
    .where(eq(sendOutbox.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingOutbox?.status === 'sent') {
    return NextResponse.json({
      ok: true,
      gmailMessageId: existingOutbox.gmailMessageId,
      idempotencyKey,
      outboxStatus: 'sent',
      replayed: true,
    });
  }

  await db
    .insert(sendOutbox)
    .values({
      idempotencyKey,
      threadId: thread.id,
      draftUpdatedAt: draft?.updatedAt ?? null,
      status: 'pending',
      updatedAt: new Date(),
    })
    .onConflictDoNothing();

  const now = new Date();
  const staleBefore = new Date(Date.now() - PENDING_TIMEOUT_MS);

  // Allow retry for previously failed sends with the same idempotency key.
  await db
    .update(sendOutbox)
    .set({ status: 'pending', startedAt: null, error: null, updatedAt: now })
    .where(and(eq(sendOutbox.idempotencyKey, idempotencyKey), eq(sendOutbox.status, 'failed')));

  // Recover stuck in-progress rows after timeout so sends can continue.
  await db
    .update(sendOutbox)
    .set({ startedAt: null, updatedAt: now })
    .where(
      and(
        eq(sendOutbox.idempotencyKey, idempotencyKey),
        eq(sendOutbox.status, 'pending'),
        lt(sendOutbox.startedAt, staleBefore)
      )
    );

  const claimed = await db
    .update(sendOutbox)
    .set({ startedAt: now, updatedAt: now })
    .where(
      and(
        eq(sendOutbox.idempotencyKey, idempotencyKey),
        eq(sendOutbox.status, 'pending'),
        isNull(sendOutbox.startedAt)
      )
    )
    .returning({ key: sendOutbox.idempotencyKey });

  if (claimed.length === 0) {
    const [latestOutbox] = await db
      .select()
      .from(sendOutbox)
      .where(eq(sendOutbox.idempotencyKey, idempotencyKey))
      .limit(1);

    if (latestOutbox?.status === 'sent') {
      return NextResponse.json({
        ok: true,
        gmailMessageId: latestOutbox.gmailMessageId,
        idempotencyKey,
        outboxStatus: 'sent',
        replayed: true,
      });
    }

    if (latestOutbox?.status === 'failed') {
      return NextResponse.json(
        {
          error: 'send_failed_previously',
          detail: latestOutbox.error ?? 'previous send failed',
          idempotencyKey,
          outboxStatus: 'failed',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'send_in_progress',
        idempotencyKey,
        outboxStatus: 'pending',
      },
      { status: 409 }
    );
  }

  try {
    const raw = buildRawMime({
      from: account.email,
      to: thread.customerEmail,
      subject,
      html,
      inReplyTo,
      references,
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
          inReplyTo,
          references,
          fromEmail: account.email,
          fromName: account.name,
          toEmail: thread.customerEmail,
          body: html,
          direction: 'outbound',
          sentAt: now,
        })
        .onConflictDoNothing();

      await tx
        .update(sendOutbox)
        .set({
          status: 'sent',
          gmailMessageId: result.id ?? null,
          error: null,
          updatedAt: now,
        })
        .where(eq(sendOutbox.idempotencyKey, idempotencyKey));
    });

    const sentThreadId = result.threadId ?? thread.gmailThreadId;
    if (sentThreadId) {
      try {
        await markGmailThreadAsRead({ accountId: account.id, threadId: sentThreadId });
      } catch (error) {
        console.error('Failed to sync Gmail read state after send', {
          threadId: thread.id,
          gmailThreadId: sentThreadId,
          error,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      gmailMessageId: result.id ?? null,
      idempotencyKey,
      outboxStatus: 'sent',
    });
  } catch (error) {
    await db
      .update(sendOutbox)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'unknown error',
        updatedAt: new Date(),
      })
      .where(eq(sendOutbox.idempotencyKey, idempotencyKey));

    return NextResponse.json(
      {
        error: 'failed_to_send',
        detail: error instanceof Error ? error.message : String(error),
        idempotencyKey,
        outboxStatus: 'failed',
      },
      { status: 502 }
    );
  }
}
