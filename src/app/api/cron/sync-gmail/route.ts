import { NextRequest, NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gmailAccounts } from '@/lib/db/schema';
import { syncAccountsByIdsIncremental } from '@/lib/gmail-sync';

function getCronSecret() {
  const secret = process.env.CRON_SECRET?.trim();
  return secret ? secret : null;
}

function isAuthorizedCronRequest(req: NextRequest, secret: string) {

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const xCronSecret = req.headers.get('x-cron-secret')?.trim() ?? '';

  return bearer === secret || xCronSecret === secret;
}

function pickAccountsForThisRun(accountIds: string[], maxPerRun: number) {
  if (accountIds.length <= maxPerRun) return accountIds;

  const runIndex = Math.floor(Date.now() / (5 * 60 * 1000));
  const start = (runIndex * maxPerRun) % accountIds.length;
  const picked: string[] = [];

  for (let i = 0; i < maxPerRun; i += 1) {
    picked.push(accountIds[(start + i) % accountIds.length]);
  }

  return picked;
}

export async function GET(req: NextRequest) {
  const cronSecret = getCronSecret();
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not configured' }, { status: 500 });
  }

  if (!isAuthorizedCronRequest(req, cronSecret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  const maxAccountsPerRun = Math.max(
    1,
    Number(process.env.CRON_SYNC_MAX_ACCOUNTS ?? '20') || 20
  );

  const accounts = await db
    .select({ id: gmailAccounts.id, refreshToken: gmailAccounts.refreshToken })
    .from(gmailAccounts)
    .orderBy(asc(gmailAccounts.createdAt));

  const connectedIds = accounts
    .filter((account) => !!account.refreshToken)
    .map((account) => account.id);

  const targetAccountIds = pickAccountsForThisRun(connectedIds, maxAccountsPerRun);

  const startedAt = Date.now();
  const result = await syncAccountsByIdsIncremental(targetAccountIds, {
    failureBaseDelayMs: 500,
    failureMaxDelayMs: 5000,
  });

  return NextResponse.json({
    ok: result.failed === 0,
    durationMs: Date.now() - startedAt,
    scannedConnectedAccounts: connectedIds.length,
    targetedAccounts: targetAccountIds.length,
    maxAccountsPerRun,
    ...result,
  });
}
