import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gmailAccounts } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function buildAppRedirect(req: NextRequest, status: 'connected' | 'error', reason?: string) {
  const url = new URL('/', req.nextUrl.origin);
  url.searchParams.set('oauth', status);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  return url;
}

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const error = req.nextUrl.searchParams.get('error');
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const stateCookie = req.cookies.get('gmail_oauth_state')?.value;

  if (error || !code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'state_mismatch'));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'missing_env'));
  }

  let serviceId = '';
  try {
    const parsed = JSON.parse(fromBase64Url(state)) as { serviceId?: string };
    serviceId = parsed.serviceId ?? '';
  } catch {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'invalid_state'));
  }

  if (!serviceId) {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'missing_service'));
  }

  const redirectUri = `${req.nextUrl.origin}/api/services/oauth/callback`;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'token_exchange_failed'));
  }

  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!token.access_token || !token.refresh_token) {
    return NextResponse.redirect(buildAppRedirect(req, 'error', 'missing_tokens'));
  }

  await db
    .update(gmailAccounts)
    .set({
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
    })
    .where(eq(gmailAccounts.id, serviceId));

  const response = NextResponse.redirect(buildAppRedirect(req, 'connected'));
  response.cookies.set('gmail_oauth_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    maxAge: 0,
    path: '/',
  });

  return response;
}
