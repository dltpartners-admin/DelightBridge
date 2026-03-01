import {
  pgTable,
  text,
  timestamp,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const threadStatusEnum = pgEnum('thread_status', ['inbox', 'sent', 'archived']);
export const emailDirectionEnum = pgEnum('email_direction', ['inbound', 'outbound']);
export const permissionEnum = pgEnum('permission_level', ['view', 'edit', 'send', 'admin']);
export const draftStatusEnum = pgEnum('draft_status', ['pending', 'ready', 'sent', 'skipped']);

// ── Gmail accounts (= 서비스) ─────────────────────────────────────────────
export const gmailAccounts = pgTable('gmail_accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  color: text('color').notNull().default('#3b5bdb'),
  signature: text('signature').notNull().default(''),
  document: text('document').notNull().default(''),
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
});

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
});

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
