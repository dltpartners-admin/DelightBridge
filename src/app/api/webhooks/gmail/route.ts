import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gmailAccounts } from '@/lib/db/schema';
import { syncAccountIncremental } from '@/lib/gmail-sync';

type PubSubPushEnvelope = {
  message?: {
    data?: string;
  };
};

type GmailPushPayload = {
  emailAddress?: string;
  historyId?: string;
};

function decodeBase64(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function extractToken(req: NextRequest) {
  const urlToken = req.nextUrl.searchParams.get('token')?.trim();
  if (urlToken) return urlToken;
  const authHeader = req.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

export async function POST(req: NextRequest) {
  const expectedToken = process.env.GMAIL_PUSH_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: 'GMAIL_PUSH_TOKEN is not configured' }, { status: 500 });
  }

  if (extractToken(req) !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized push request' }, { status: 401 });
  }

  let body: PubSubPushEnvelope;
  try {
    body = (await req.json()) as PubSubPushEnvelope;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const data = body.message?.data;
  if (!data) {
    return NextResponse.json({ ok: true, skipped: 'no_data' });
  }

  let payload: GmailPushPayload;
  try {
    payload = JSON.parse(decodeBase64(data)) as GmailPushPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid message data' }, { status: 400 });
  }

  const emailAddress = payload.emailAddress?.trim().toLowerCase();
  if (!emailAddress) {
    return NextResponse.json({ ok: true, skipped: 'missing_email' });
  }

  const [account] = await db
    .select({ id: gmailAccounts.id })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.email, emailAddress))
    .limit(1);

  if (!account) {
    return NextResponse.json({ ok: true, skipped: 'account_not_found', emailAddress });
  }

  try {
    const result = await syncAccountIncremental(account.id);
    return NextResponse.json({
      ok: true,
      accountId: account.id,
      emailAddress,
      notificationHistoryId: payload.historyId ?? null,
      syncedThreads: result.syncedThreads,
      upsertedMessages: result.upsertedMessages,
      syncedHistoryId: result.historyId,
    });
  } catch (error) {
    console.error('Gmail push sync failed', { accountId: account.id, emailAddress, error });
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'failed_to_sync_incremental',
      },
      { status: 500 }
    );
  }
}
