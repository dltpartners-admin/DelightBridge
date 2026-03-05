import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gmailAccounts } from '@/lib/db/schema';

export async function refreshAccessToken(accountId: string) {
  const [account] = await db
    .select({ refreshToken: gmailAccounts.refreshToken })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, accountId));

  if (!account?.refreshToken) {
    throw new Error('Missing refresh token');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth env');
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: account.refreshToken,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error('Failed to refresh access token');
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error('No access token returned');
  }

  await db
    .update(gmailAccounts)
    .set({ accessToken: json.access_token })
    .where(eq(gmailAccounts.id, accountId));

  return json.access_token;
}

export async function getAccessToken(accountId: string) {
  const [account] = await db
    .select({ accessToken: gmailAccounts.accessToken })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, accountId));

  if (account?.accessToken) {
    return account.accessToken;
  }

  return refreshAccessToken(accountId);
}

export async function sendGmailMessage({
  accountId,
  raw,
  threadId,
}: {
  accountId: string;
  raw: string;
  threadId?: string | null;
}) {
  let accessToken = await getAccessToken(accountId);

  const send = async (token: string) => {
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw, ...(threadId ? { threadId } : {}) }),
    });
  };

  let res = await send(accessToken);
  if (res.status === 401) {
    accessToken = await refreshAccessToken(accountId);
    res = await send(accessToken);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gmail send failed: ${detail}`);
  }

  return (await res.json()) as { id?: string; threadId?: string };
}

export async function startGmailWatch({
  accountId,
  topicName,
}: {
  accountId: string;
  topicName: string;
}) {
  let accessToken = await getAccessToken(accountId);

  const callWatch = async (token: string) => {
    return fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topicName }),
    });
  };

  let res = await callWatch(accessToken);
  if (res.status === 401) {
    accessToken = await refreshAccessToken(accountId);
    res = await callWatch(accessToken);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gmail watch setup failed: ${detail}`);
  }

  return (await res.json()) as { historyId?: string; expiration?: string };
}

export async function markGmailThreadAsRead({
  accountId,
  threadId,
}: {
  accountId: string;
  threadId: string;
}) {
  let accessToken = await getAccessToken(accountId);

  const modify = async (token: string) => {
    return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
  };

  let res = await modify(accessToken);
  if (res.status === 401) {
    accessToken = await refreshAccessToken(accountId);
    res = await modify(accessToken);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gmail read sync failed: ${detail}`);
  }
}

export async function markGmailThreadAsUnread({
  accountId,
  threadId,
}: {
  accountId: string;
  threadId: string;
}) {
  let accessToken = await getAccessToken(accountId);

  const modify = async (token: string) => {
    return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addLabelIds: ['UNREAD'] }),
    });
  };

  let res = await modify(accessToken);
  if (res.status === 401) {
    accessToken = await refreshAccessToken(accountId);
    res = await modify(accessToken);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gmail unread sync failed: ${detail}`);
  }
}
