import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const threadStatusEnum = pgEnum('thread_status', ['inbox', 'sent', 'archived']);
export const emailDirectionEnum = pgEnum('email_direction', ['inbound', 'outbound']);
export const permissionEnum = pgEnum('permission_level', ['view', 'edit', 'send', 'admin']);
export const draftStatusEnum = pgEnum('draft_status', ['pending', 'ready', 'sent', 'skipped']);
export const sendOutboxStatusEnum = pgEnum('send_outbox_status', ['pending', 'sent', 'failed']);

// ── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  googleId: text('google_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  permission: permissionEnum('permission').notNull().default('view'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  email: text('email').primaryKey(),
  permission: permissionEnum('permission').notNull().default('view'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Gmail accounts (= 서비스) ─────────────────────────────────────────────
export const gmailAccounts = pgTable('gmail_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  color: text('color').notNull().default('#3b5bdb'),
  signature: text('signature').notNull().default(''),
  document: text('document').notNull().default(''),
  templates: text('templates').notNull().default('[]'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  lastHistoryId: text('last_history_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── Categories ────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => gmailAccounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  textColor: text('text_color').notNull(),
});

// ── Email threads ─────────────────────────────────────────────────────────
export const emailThreads = pgTable('email_threads', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(() => gmailAccounts.id, { onDelete: 'cascade' }),
  gmailThreadId: text('gmail_thread_id'),
  subject: text('subject').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name').notNull(),
  categoryId: text('category_id'),
  status: threadStatusEnum('status').notNull().default('inbox'),
  detectedLanguage: text('detected_language').notNull().default('en'),
  isRead: boolean('is_read').notNull().default(false),
  lastMessageAt: timestamp('last_message_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountLastMessageIdx: index('email_threads_account_last_message_idx').on(table.accountId, table.lastMessageAt),
  gmailThreadIdx: index('email_threads_gmail_thread_idx').on(table.gmailThreadId),
  accountGmailThreadUnique: uniqueIndex('email_threads_account_gmail_thread_uidx').on(table.accountId, table.gmailThreadId),
}));

// ── Emails (individual messages) ──────────────────────────────────────────
export const emails = pgTable('emails', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().references(() => emailThreads.id, { onDelete: 'cascade' }),
  gmailMessageId: text('gmail_message_id'),
  fromEmail: text('from_email').notNull(),
  fromName: text('from_name').notNull(),
  toEmail: text('to_email').notNull(),
  body: text('body').notNull(),
  direction: emailDirectionEnum('direction').notNull(),
  sentAt: timestamp('sent_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  threadSentAtIdx: index('emails_thread_sent_at_idx').on(table.threadId, table.sentAt),
  gmailMessageIdx: index('emails_gmail_message_idx').on(table.gmailMessageId),
  gmailMessageUnique: uniqueIndex('emails_gmail_message_uidx').on(table.gmailMessageId),
}));

// ── Drafts ────────────────────────────────────────────────────────────────
export const drafts = pgTable('drafts', {
  id: text('id').primaryKey(),
  threadId: text('thread_id').notNull().unique().references(() => emailThreads.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull().default(''),
  content: text('content').notNull().default(''),
  translation: text('translation').notNull().default(''),
  status: draftStatusEnum('status').notNull().default('pending'),
  sentAt: timestamp('sent_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ── Send outbox (idempotency) ─────────────────────────────────────────────
export const sendOutbox = pgTable('send_outbox', {
  idempotencyKey: text('idempotency_key').primaryKey(),
  threadId: text('thread_id').notNull().references(() => emailThreads.id, { onDelete: 'cascade' }),
  draftUpdatedAt: timestamp('draft_updated_at'),
  status: sendOutboxStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at'),
  gmailMessageId: text('gmail_message_id'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  threadIdx: index('send_outbox_thread_idx').on(table.threadId),
}));
