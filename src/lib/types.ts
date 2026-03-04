export type FilterType = 'inbox' | 'sent' | 'archived' | 'all' | 'unread' | 'hasDraft';
export type ThreadStatus = 'inbox' | 'sent' | 'archived';
export type EmailDirection = 'inbound' | 'outbound';

// ── Auth / Permissions (compatible with Google OAuth + NextAuth) ─────────────
export type PermissionLevel = 'admin' | 'send' | 'edit' | 'view';

export interface User {
  id: string;           // internal UUID (maps to DB users.id)
  googleId: string;     // Google OAuth `sub` claim
  email: string;        // Google `email`
  name: string;         // Google `name`
  picture?: string;     // Google `picture` (profile photo URL)
}

export interface AccountPermission {
  userId: string;       // FK → User.id
  accountId: string;    // FK → Service.id (= gmail_accounts.id)
  permission: PermissionLevel;
}

/**
 * Frontend permission check — hierarchy: admin > send > edit > view
 * Returns true if the user's level is >= the required level.
 */
const PERMISSION_RANK: Record<PermissionLevel, number> = {
  view: 0,
  edit: 1,
  send: 2,
  admin: 3,
};

export function hasPermission(userLevel: PermissionLevel, required: PermissionLevel): boolean {
  return PERMISSION_RANK[userLevel] >= PERMISSION_RANK[required];
}

export interface Attachment {
  id: string;
  name: string;
  size: number;      // bytes
  type: string;      // MIME type
  url: string;       // blob URL or remote URL
  contentId?: string; // for inline images (Gmail cid: reference)
}

export interface Category {
  id: string;
  name: string;
  color: string;     // background hex
  textColor: string; // text hex
}

export interface EmailTemplate {
  id: string;
  name: string;
  body: string;
}

export interface Service {
  id: string;
  name: string;
  email: string;
  color: string; // brand color hex
  gmailConnected?: boolean;
  categories: Category[];
  templates: EmailTemplate[];
  signature: string; // HTML
  document: string;  // reference/FAQ content for AI
  unreadCount: number;
}

export interface EmailMessage {
  id: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  body: string;      // HTML
  timestamp: string; // ISO string
  direction: EmailDirection;
  attachments?: Attachment[];
  translation?: string; // cached Korean translation of body
}

export interface EmailThread {
  id: string;
  serviceId: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  messages: EmailMessage[];
  categoryId: string;
  status: ThreadStatus;
  draft: string;         // HTML draft body
  draftSubject: string;
  draftAttachments: Attachment[];
  detectedLanguage: string; // 'ko' | 'en' | 'ja' ...
  translation: string;      // Korean translation of draft (empty if already Korean)
  lastMessageAt: string;    // ISO, for sorting
  isRead: boolean;
  lastMessagePreview?: string;
  messageCount?: number;
}
