import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gmailAccounts, categories, emailThreads, serviceSenderIdentities } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq, and, sql } from 'drizzle-orm';
import { parseTemplates, stringifyTemplates } from '@/lib/email-templates';

export async function GET() {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const accounts = await db.select().from(gmailAccounts).orderBy(gmailAccounts.createdAt);
  const cats = await db.select().from(categories);
  const senderRows = await db.select().from(serviceSenderIdentities);

  const unreadCounts = await db
    .select({
      accountId: emailThreads.accountId,
      count: sql<number>`count(*)::int`,
    })
    .from(emailThreads)
    .where(and(eq(emailThreads.status, 'inbox'), eq(emailThreads.isRead, false)))
    .groupBy(emailThreads.accountId);

  const unreadMap = Object.fromEntries(unreadCounts.map((r) => [r.accountId, r.count]));

  const services = accounts.map((account) => {
    const accountSenders = senderRows
      .filter((sender) => sender.accountId === account.id)
      .map((sender) => ({
        id: sender.id,
        email: sender.email,
        displayName: sender.displayName,
        isDefault: sender.isDefault,
        isEnabled: sender.isEnabled,
      }));
    const hasPrimary = accountSenders.some((sender) => sender.email === account.email);

    return {
      id: account.id,
      name: account.name,
      email: account.email,
      color: account.color,
      gmailConnected: !!account.refreshToken,
      signature: account.signature,
      document: account.document,
      templates: parseTemplates(account.templates),
      unreadCount: unreadMap[account.id] ?? 0,
      senderIdentities: hasPrimary
        ? accountSenders
        : [
            ...accountSenders,
            {
              id: `sender-${account.id}-${account.email}`,
              email: account.email,
              displayName: account.name,
              isDefault: true,
              isEnabled: true,
            },
          ],
      categories: cats
        .filter((c) => c.accountId === account.id)
        .map((c) => ({ id: c.id, name: c.name, color: c.color, textColor: c.textColor })),
    };
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, email, color, signature, document, templates } = await req.json();
  const newId = id ?? `service-${Date.now()}`;
  const fallbackEmail = `${newId}@pending.local`;
  const normalizedEmail =
    typeof email === 'string' && email.includes('@')
      ? email.trim().toLowerCase()
      : fallbackEmail;

  const [account] = await db
    .insert(gmailAccounts)
    .values({
      id: newId,
      name,
      email: normalizedEmail,
      color: color ?? '#3b5bdb',
      signature: signature ?? '',
      document: document ?? '',
      templates: stringifyTemplates(templates),
    })
    .returning();

  return NextResponse.json({
    ...account,
    templates: parseTemplates(account.templates),
    categories: [],
    unreadCount: 0,
    senderIdentities: [
      {
        id: `sender-${account.id}-${account.email}`,
        email: account.email,
        displayName: account.name,
        isDefault: true,
        isEnabled: true,
      },
    ],
  });
}
