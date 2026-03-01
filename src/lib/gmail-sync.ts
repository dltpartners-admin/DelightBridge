import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { categories, drafts, emailThreads, emails, gmailAccounts } from '@/lib/db/schema';
import { getAccessToken, refreshAccessToken } from '@/lib/gmail';
import { generateDraftFromContext } from '@/lib/draft-generation';
import { translateDraftToKorean } from '@/lib/draft-translation';

type GmailHeader = { name?: string; value?: string };
type GmailPayload = {
  mimeType?: string;
  body?: { data?: string };
  headers?: GmailHeader[];
  parts?: GmailPayload[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  historyId?: string;
  internalDate?: string;
  payload?: GmailPayload;
  labelIds?: string[];
};

type GmailThread = {
  id?: string;
  historyId?: string;
  messages?: GmailMessage[];
};

type GmailListResponse = {
  threads?: Array<{ id?: string }>;
  nextPageToken?: string;
};

type GmailHistoryResponse = {
  history?: Array<{
    messages?: GmailMessage[];
    messagesAdded?: Array<{ message?: GmailMessage }>;
  }>;
  nextPageToken?: string;
  historyId?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEmail(input: string | null | undefined) {
  return (input ?? '').trim().toLowerCase();
}

function toBase64(input: string) {
  const value = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = value.length % 4;
  const padded = pad ? value + '='.repeat(4 - pad) : value;
  return Buffer.from(padded, 'base64').toString('utf8');
}

function htmlEscape(input: string) {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function extractHeader(payload: GmailPayload | undefined, name: string) {
  const needle = name.toLowerCase();
  return payload?.headers?.find((header) => header.name?.toLowerCase() === needle)?.value ?? '';
}

function findBodyPart(payload: GmailPayload | undefined, mimeType: string): GmailPayload | null {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) return payload;
  for (const part of payload.parts ?? []) {
    const found = findBodyPart(part, mimeType);
    if (found) return found;
  }
  return null;
}

function extractHtml(payload: GmailPayload | undefined) {
  const htmlPart = findBodyPart(payload, 'text/html');
  if (htmlPart?.body?.data) {
    return toBase64(htmlPart.body.data);
  }

  const textPart = findBodyPart(payload, 'text/plain');
  if (textPart?.body?.data) {
    const plain = toBase64(textPart.body.data);
    return `<p>${htmlEscape(plain).replaceAll('\n', '<br />')}</p>`;
  }

  if (payload?.body?.data) {
    const body = toBase64(payload.body.data);
    return payload.mimeType === 'text/plain'
      ? `<p>${htmlEscape(body).replaceAll('\n', '<br />')}</p>`
      : body;
  }

  return '';
}

function parseAddress(raw: string) {
  const match = raw.match(/^(.*?)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].replaceAll('"', '').trim() || match[2].trim(),
      email: normalizeEmail(match[2]),
    };
  }
  return {
    name: raw.trim() || 'Unknown',
    email: normalizeEmail(raw),
  };
}

async function gmailRequest(
  accountId: string,
  path: string,
  init?: RequestInit,
  forceRefresh = false
) {
  let token = forceRefresh ? await refreshAccessToken(accountId) : await getAccessToken(accountId);

  const make = async (accessToken: string) => {
    return fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });
  };

  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const res = await make(token);

    if (res.status === 401 && !forceRefresh) {
      token = await refreshAccessToken(accountId);
      continue;
    }

    if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts - 1) {
      await sleep(300 * 2 ** attempt);
      continue;
    }

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gmail request failed (${res.status}): ${detail}`);
    }

    return res;
  }

  throw new Error('Gmail request failed after retries');
}

async function syncThread(accountId: string, accountEmail: string, gmailThreadId: string) {
  const threadRes = await gmailRequest(accountId, `/threads/${gmailThreadId}?format=full`);
  const threadJson = (await threadRes.json()) as GmailThread;
  const rawMessages = threadJson.messages ?? [];

  const parsed = rawMessages
    .map((message) => {
      const payload = message.payload;
      const fromValue = extractHeader(payload, 'From');
      const toValue = extractHeader(payload, 'To');
      const subject = extractHeader(payload, 'Subject');
      const from = parseAddress(fromValue);
      const to = parseAddress(toValue);
      const sentAt = new Date(Number(message.internalDate ?? Date.now()));
      const direction: 'inbound' | 'outbound' =
        normalizeEmail(from.email) === normalizeEmail(accountEmail) ? 'outbound' : 'inbound';
      return {
        gmailMessageId: message.id ?? '',
        gmailThreadId: message.threadId ?? gmailThreadId,
        historyId: message.historyId ?? null,
        fromEmail: from.email || 'unknown@example.com',
        fromName: from.name || from.email || 'Unknown',
        toEmail: to.email || normalizeEmail(accountEmail),
        subject,
        sentAt,
        direction,
        body: extractHtml(payload),
        labelIds: message.labelIds ?? [],
      };
    })
    .filter((message) => message.gmailMessageId)
    .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());

  if (parsed.length === 0) {
    return { insertedMessages: 0, historyId: threadJson.historyId ?? null };
  }

  const [existingThreadByGmail] = await db
    .select({ id: emailThreads.id })
    .from(emailThreads)
    .where(and(eq(emailThreads.accountId, accountId), eq(emailThreads.gmailThreadId, gmailThreadId)))
    .limit(1);

  const threadId = existingThreadByGmail?.id ?? `thread-${accountId}-${gmailThreadId}`;
  const latest = parsed[parsed.length - 1];
  const firstInbound = parsed.find((message) => message.direction === 'inbound') ?? latest;
  const hasUnread = latest.labelIds.includes('UNREAD');
  const hasInboxLabel = latest.labelIds.includes('INBOX');
  const hasSentLabel = latest.labelIds.includes('SENT');
  const nextStatus: 'inbox' | 'sent' | 'archived' =
    hasInboxLabel
      ? 'inbox'
      : hasSentLabel
        ? 'sent'
        : 'archived';

  await db
    .insert(emailThreads)
    .values({
      id: threadId,
      accountId,
      gmailThreadId,
      subject: latest.subject || '(no subject)',
      customerEmail: firstInbound.fromEmail,
      customerName: firstInbound.fromName,
      categoryId: null,
      status: nextStatus,
      detectedLanguage: 'en',
      isRead: !hasUnread,
      lastMessageAt: latest.sentAt,
    })
    .onConflictDoUpdate({
      target: emailThreads.id,
      set: {
        gmailThreadId,
        subject: latest.subject || '(no subject)',
        customerEmail: firstInbound.fromEmail,
        customerName: firstInbound.fromName,
        status: nextStatus,
        isRead: !hasUnread,
        lastMessageAt: latest.sentAt,
      },
    });

  let insertedMessages = 0;
  for (const message of parsed) {
    const emailId = `email-${accountId}-${message.gmailMessageId}`;
    await db
      .insert(emails)
      .values({
        id: emailId,
        threadId,
        gmailMessageId: message.gmailMessageId,
        fromEmail: message.fromEmail,
        fromName: message.fromName,
        toEmail: message.toEmail,
        body: message.body,
        direction: message.direction,
        sentAt: message.sentAt,
      })
      .onConflictDoUpdate({
        target: emails.id,
        set: {
          body: message.body,
          sentAt: message.sentAt,
        },
      });
    insertedMessages += 1;
  }

  const [accountForDraft] = await db
    .select({ document: gmailAccounts.document, signature: gmailAccounts.signature })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, accountId))
    .limit(1);

  if (accountForDraft && latest.direction === 'inbound') {
    const [existingDraft] = await db
      .select({ content: drafts.content, updatedAt: drafts.updatedAt })
      .from(drafts)
      .where(eq(drafts.threadId, threadId))
      .limit(1);

    const hasDraft = !!existingDraft?.content?.replace(/<[^>]*>/g, '').replace(/\s+/g, '').trim();
    const draftUpToDate = existingDraft ? existingDraft.updatedAt >= latest.sentAt : false;

    if (!hasDraft || !draftUpToDate) {
      const accountCategories = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(eq(categories.accountId, accountId));

      try {
        const generated = await generateDraftFromContext({
          messages: parsed.map((message) => ({
            direction: message.direction,
            fromName: message.fromName,
            timestamp: message.sentAt.toISOString(),
            body: message.body,
          })),
          document: accountForDraft.document,
          categories: accountCategories,
          signature: accountForDraft.signature,
        });

        let autoTranslation = '';
        if ((generated.detectedLanguage ?? '').toLowerCase() !== 'ko') {
          try {
            autoTranslation = await translateDraftToKorean(generated.draft);
          } catch (error) {
            console.error(
              `Auto draft translation failed for account ${accountId}, thread ${threadId}:`,
              error
            );
          }
        }

        const now = new Date();
        await db.transaction(async (tx) => {
          await tx
            .insert(drafts)
            .values({
              id: `draft-${threadId}`,
              threadId,
              subject: `Re: ${latest.subject || '(no subject)'}`,
              content: generated.draft,
              translation: autoTranslation,
              status: 'ready',
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: drafts.threadId,
              set: {
                subject: `Re: ${latest.subject || '(no subject)'}`,
                content: generated.draft,
                translation: autoTranslation,
                status: 'ready',
                updatedAt: now,
              },
            });

          if (generated.categoryId || generated.detectedLanguage) {
            await tx
              .update(emailThreads)
              .set({
                ...(generated.categoryId ? { categoryId: generated.categoryId } : {}),
                ...(generated.detectedLanguage
                  ? { detectedLanguage: generated.detectedLanguage }
                  : {}),
              })
              .where(eq(emailThreads.id, threadId));
          }
        });
      } catch (error) {
        console.error(
          `Auto draft generation failed for account ${accountId}, thread ${threadId}:`,
          error
        );
      }
    }
  }

  return {
    insertedMessages,
    historyId: threadJson.historyId ?? latest.historyId ?? null,
  };
}

async function setAccountHistory(accountId: string, historyId: string | null) {
  if (!historyId) return;
  await db
    .update(gmailAccounts)
    .set({ lastHistoryId: historyId })
    .where(eq(gmailAccounts.id, accountId));
}

export async function syncAccountFull(accountId: string, maxThreads = 100) {
  const [account] = await db
    .select({ id: gmailAccounts.id, email: gmailAccounts.email, refreshToken: gmailAccounts.refreshToken })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, accountId));

  if (!account) throw new Error('service not found');
  if (!account.refreshToken) throw new Error('service gmail not connected');

  const threadIds: string[] = [];
  let pageToken = '';

  while (threadIds.length < maxThreads) {
    const query = new URLSearchParams({ maxResults: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const listRes = await gmailRequest(accountId, `/threads?${query.toString()}`);
    const listJson = (await listRes.json()) as GmailListResponse;
    const ids = (listJson.threads ?? []).map((thread) => thread.id).filter(Boolean) as string[];
    threadIds.push(...ids);
    pageToken = listJson.nextPageToken ?? '';
    if (!pageToken || ids.length === 0) break;
  }

  const uniqueThreadIds = Array.from(new Set(threadIds)).slice(0, maxThreads);
  let maxHistoryId: string | null = null;
  let insertedMessages = 0;

  for (const gmailThreadId of uniqueThreadIds) {
    const result = await syncThread(accountId, account.email, gmailThreadId);
    insertedMessages += result.insertedMessages;
    if (result.historyId && (!maxHistoryId || BigInt(result.historyId) > BigInt(maxHistoryId))) {
      maxHistoryId = result.historyId;
    }
  }

  await setAccountHistory(accountId, maxHistoryId);

  return {
    syncedThreads: uniqueThreadIds.length,
    upsertedMessages: insertedMessages,
    historyId: maxHistoryId,
  };
}

export async function syncAccountIncremental(accountId: string) {
  const [account] = await db
    .select({
      id: gmailAccounts.id,
      email: gmailAccounts.email,
      refreshToken: gmailAccounts.refreshToken,
      lastHistoryId: gmailAccounts.lastHistoryId,
    })
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, accountId));

  if (!account) throw new Error('service not found');
  if (!account.refreshToken) throw new Error('service gmail not connected');

  if (!account.lastHistoryId) {
    return syncAccountFull(accountId, 50);
  }

  let pageToken = '';
  let newestHistoryId: string | null = null;
  const threadIdSet = new Set<string>();

  try {
    while (true) {
      const query = new URLSearchParams({
        startHistoryId: account.lastHistoryId,
        historyTypes: 'messageAdded',
        maxResults: '500',
      });
      if (pageToken) query.set('pageToken', pageToken);

      const res = await gmailRequest(accountId, `/history?${query.toString()}`);
      const json = (await res.json()) as GmailHistoryResponse;

      for (const history of json.history ?? []) {
        for (const entry of history.messagesAdded ?? []) {
          const tid = entry.message?.threadId;
          if (tid) threadIdSet.add(tid);
        }
        for (const message of history.messages ?? []) {
          if (message.threadId) threadIdSet.add(message.threadId);
        }
      }

      if (json.historyId) {
        newestHistoryId = json.historyId;
      }

      pageToken = json.nextPageToken ?? '';
      if (!pageToken) break;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('(404)')) {
      return syncAccountFull(accountId, 100);
    }
    throw error;
  }

  let insertedMessages = 0;
  for (const gmailThreadId of threadIdSet) {
    const result = await syncThread(accountId, account.email, gmailThreadId);
    insertedMessages += result.insertedMessages;
    if (result.historyId && (!newestHistoryId || BigInt(result.historyId) > BigInt(newestHistoryId))) {
      newestHistoryId = result.historyId;
    }
  }

  await setAccountHistory(accountId, newestHistoryId ?? account.lastHistoryId);

  return {
    syncedThreads: threadIdSet.size,
    upsertedMessages: insertedMessages,
    historyId: newestHistoryId ?? account.lastHistoryId,
  };
}

export async function syncAllConnectedAccountsIncremental() {
  const accounts = await db
    .select({ id: gmailAccounts.id, refreshToken: gmailAccounts.refreshToken })
    .from(gmailAccounts);

  const connectedIds = accounts
    .filter((account) => !!account.refreshToken)
    .map((account) => account.id);

  return syncAccountsByIdsIncremental(connectedIds);
}

type SyncOptions = {
  failureBaseDelayMs?: number;
  failureMaxDelayMs?: number;
};

export async function syncAccountsByIdsIncremental(accountIds: string[], options?: SyncOptions) {
  if (accountIds.length === 0) {
    return { total: 0, success: 0, failed: 0, results: [] as Array<{ accountId: string; ok: boolean; error?: string }> };
  }

  const failureBaseDelayMs = Math.max(0, options?.failureBaseDelayMs ?? 400);
  const failureMaxDelayMs = Math.max(failureBaseDelayMs, options?.failureMaxDelayMs ?? 3000);

  const accounts = await db
    .select({ id: gmailAccounts.id, refreshToken: gmailAccounts.refreshToken })
    .from(gmailAccounts)
    .where(inArray(gmailAccounts.id, accountIds));

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const results: Array<{
    accountId: string;
    ok: boolean;
    syncedThreads?: number;
    upsertedMessages?: number;
    error?: string;
  }> = [];
  let consecutiveFailures = 0;

  for (const accountId of accountIds) {
    const account = accountsById.get(accountId);
    if (!account) {
      results.push({ accountId, ok: false, error: 'service not found' });
      consecutiveFailures += 1;
      continue;
    }
    if (!account.refreshToken) {
      results.push({ accountId: account.id, ok: false, error: 'service gmail not connected' });
      consecutiveFailures += 1;
      continue;
    }

    try {
      const result = await syncAccountIncremental(account.id);
      results.push({
        accountId: account.id,
        ok: true,
        syncedThreads: result.syncedThreads,
        upsertedMessages: result.upsertedMessages,
      });
      consecutiveFailures = 0;
    } catch (error) {
      results.push({
        accountId: account.id,
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
      });

      consecutiveFailures += 1;
      if (failureBaseDelayMs > 0) {
        const backoff = Math.min(
          failureBaseDelayMs * 2 ** (consecutiveFailures - 1),
          failureMaxDelayMs
        );
        await sleep(backoff);
      }
    }
  }

  return {
    total: results.length,
    success: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}
