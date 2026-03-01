import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gmailAccounts } from '@/lib/db/schema';
import { requireAdminSession } from '@/lib/session';

function fromBase64Url(input: string) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildAppRedirect(req: NextRequest, status: 'connected' | 'error', reason?: string) {
  const url = new URL('/', req.nextUrl.origin);
  url.searchParams.set('oauth', status);
  if (reason) {
    url.searchParams.set('reason', reason);
  }
  return url;
}

function redirectWithCleanup(req: NextRequest, status: 'connected' | 'error', reason?: string) {
  const response = NextResponse.redirect(buildAppRedirect(req, status, reason));
  response.cookies.set('gmail_oauth_state', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export async function GET(req: NextRequest) {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const error = req.nextUrl.searchParams.get('error');
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const stateCookie = req.cookies.get('gmail_oauth_state')?.value;

  if (error || !code || !state || !stateCookie || state !== stateCookie) {
    return redirectWithCleanup(req, 'error', 'state_mismatch');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectWithCleanup(req, 'error', 'missing_env');
  }

  let serviceId = '';
  try {
    const parsed = JSON.parse(fromBase64Url(state)) as { serviceId?: string };
    serviceId = parsed.serviceId ?? '';
  } catch {
    return redirectWithCleanup(req, 'error', 'invalid_state');
  }

  if (!serviceId) {
    return redirectWithCleanup(req, 'error', 'missing_service');
  }

  const [account] = await db
    .select({
      id: gmailAccounts.id,
      email: gmailAccounts.email,
      refreshToken: gmailAccounts.refreshToken,
    })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, serviceId));

  if (!account) {
    return redirectWithCleanup(req, 'error', 'service_not_found');
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
    const detail = await tokenRes.text();
    console.error('Gmail OAuth token exchange failed', detail);
    return redirectWithCleanup(req, 'error', 'token_exchange_failed');
  }

  const token = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!token.access_token) {
    return redirectWithCleanup(req, 'error', 'missing_access_token');
  }

  const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!profileRes.ok) {
    return redirectWithCleanup(req, 'error', 'gmail_profile_failed');
  }

  const profile = (await profileRes.json()) as { emailAddress?: string };
  const connectedEmail = profile.emailAddress;
  if (!connectedEmail) {
    return redirectWithCleanup(req, 'error', 'missing_connected_email');
  }

  if (normalizeEmail(connectedEmail) !== normalizeEmail(account.email)) {
    return redirectWithCleanup(req, 'error', 'connected_email_mismatch');
  }

  const refreshToken = token.refresh_token ?? account?.refreshToken ?? null;
  if (!refreshToken) {
    return redirectWithCleanup(req, 'error', 'missing_refresh_token');
  }

  const updated = await db
    .update(gmailAccounts)
    .set({
      accessToken: token.access_token,
      refreshToken,
    })
    .where(eq(gmailAccounts.id, serviceId))
    .returning({ id: gmailAccounts.id });

  if (updated.length === 0) {
    return redirectWithCleanup(req, 'error', 'service_not_found');
  }

  return redirectWithCleanup(req, 'connected');
}
