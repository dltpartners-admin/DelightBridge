import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../src/lib/db/schema';
import { SERVICES, THREADS } from '../src/lib/mock-data';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('Seeding database...');

  // Insert gmail_accounts (services)
  for (const service of SERVICES) {
    await db.insert(schema.gmailAccounts).values({
      id: service.id,
      name: service.name,
      email: service.email,
      color: service.color,
      signature: service.signature,
      document: service.document,
    }).onConflictDoNothing();

    // Insert categories for each service
    for (const cat of service.categories) {
      await db.insert(schema.categories).values({
        id: `${service.id}-${cat.id}`,
        accountId: service.id,
        name: cat.name,
        color: cat.color,
        textColor: cat.textColor,
      }).onConflictDoNothing();
    }
  }
  console.log(`✓ Inserted ${SERVICES.length} services`);

  // Insert threads and messages
  let threadCount = 0;
  let messageCount = 0;
  for (const thread of THREADS) {
    const service = SERVICES.find((s) => s.id === thread.serviceId)!;
    const cat = service.categories.find((c) => c.id === thread.categoryId);
    const categoryDbId = cat ? `${service.id}-${cat.id}` : null;

    await db.insert(schema.emailThreads).values({
      id: thread.id,
      accountId: thread.serviceId,
      subject: thread.subject,
      customerEmail: thread.customerEmail,
      customerName: thread.customerName,
      categoryId: categoryDbId,
      status: thread.status,
      detectedLanguage: thread.detectedLanguage,
      isRead: thread.isRead,
      lastMessageAt: new Date(thread.lastMessageAt),
    }).onConflictDoNothing();

    for (const msg of thread.messages) {
      await db.insert(schema.emails).values({
        id: msg.id,
        threadId: thread.id,
        fromEmail: msg.fromEmail,
        fromName: msg.fromName,
        toEmail: msg.toEmail,
        body: msg.body,
        direction: msg.direction,
        sentAt: new Date(msg.timestamp),
      }).onConflictDoNothing();
      messageCount++;
    }

    if (thread.draft) {
      await db.insert(schema.drafts).values({
        id: `draft-${thread.id}`,
        threadId: thread.id,
        subject: thread.draftSubject,
        content: thread.draft,
        status: 'ready',
      }).onConflictDoNothing();
    }

    threadCount++;
  }
  console.log(`✓ Inserted ${threadCount} threads, ${messageCount} messages`);
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
