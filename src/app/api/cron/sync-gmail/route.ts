import { NextRequest, NextResponse } from 'next/server';
import { syncAllConnectedAccountsIncremental } from '@/lib/gmail-sync';

function isAuthorizedCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.get('authorization') ?? '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const xCronSecret = req.headers.get('x-cron-secret')?.trim() ?? '';

  return bearer === secret || xCronSecret === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  const startedAt = Date.now();
  const result = await syncAllConnectedAccountsIncremental();

  return NextResponse.json({
    ok: result.failed === 0,
    durationMs: Date.now() - startedAt,
    ...result,
  });
}
