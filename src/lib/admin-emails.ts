const DEFAULT_ADMIN_EMAILS = ['peter@delightroom.com'];

export function getAdminEmails() {
  const envAdmins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...envAdmins]));
}

export function isDefaultAdminEmail(email: string) {
  return DEFAULT_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
