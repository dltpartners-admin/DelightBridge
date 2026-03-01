import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';

function toBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const { id: serviceId } = await params;
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID is missing' }, { status: 500 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/services/oauth/callback`;

  const state = toBase64Url(
    JSON.stringify({
      serviceId,
      nonce: crypto.randomUUID(),
      ts: Date.now(),
    })
  );

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set(
    'scope',
    ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send'].join(' ')
  );
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    maxAge: 10 * 60,
    path: '/',
  });

  return response;
}
