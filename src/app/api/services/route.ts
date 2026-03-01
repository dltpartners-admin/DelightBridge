import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gmailAccounts, categories, emailThreads } from '@/lib/db/schema';
import { requireSession } from '@/lib/session';
import { eq, and, sql } from 'drizzle-orm';

export async function GET() {
  const { unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;

  const accounts = await db.select().from(gmailAccounts).orderBy(gmailAccounts.createdAt);
  const cats = await db.select().from(categories);

  const unreadCounts = await db
    .select({
      accountId: emailThreads.accountId,
      count: sql<number>`count(*)::int`,
    })
    .from(emailThreads)
    .where(and(eq(emailThreads.status, 'inbox'), eq(emailThreads.isRead, false)))
    .groupBy(emailThreads.accountId);

  const unreadMap = Object.fromEntries(unreadCounts.map((r) => [r.accountId, r.count]));

  const services = accounts.map((account) => ({
    id: account.id,
    name: account.name,
    email: account.email,
    color: account.color,
    gmailConnected: !!account.refreshToken,
    signature: account.signature,
    document: account.document,
    unreadCount: unreadMap[account.id] ?? 0,
    categories: cats
      .filter((c) => c.accountId === account.id)
      .map((c) => ({ id: c.id, name: c.name, color: c.color, textColor: c.textColor })),
  }));

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized) return unauthorized;
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, name, email, color, signature, document } = await req.json();
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
    })
    .returning();

  return NextResponse.json({ ...account, categories: [], unreadCount: 0 });
}
