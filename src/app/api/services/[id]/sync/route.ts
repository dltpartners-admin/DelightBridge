import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/session';
import { syncAccountFull, syncAccountIncremental } from '@/lib/gmail-sync';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const { id: accountId } = await params;
  const mode = req.nextUrl.searchParams.get('mode');

  try {
    const result = mode === 'full'
      ? await syncAccountFull(accountId)
      : await syncAccountIncremental(accountId);
    return NextResponse.json({ ok: true, mode: mode === 'full' ? 'full' : 'incremental', ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'failed to sync account',
      },
      { status: 500 }
    );
  }
}
