import { NextRequest, NextResponse } from 'next/server';
import { desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users, workspaceMembers } from '@/lib/db/schema';
import { requireAdminSession } from '@/lib/session';
import { getAdminEmails } from '@/lib/admin-emails';

const ADMIN_EMAILS = getAdminEmails();

export async function GET() {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const members = await db
    .select()
    .from(workspaceMembers)
    .orderBy(desc(workspaceMembers.createdAt));

  const usersByEmail = members.length
    ? await db.select().from(users).where(inArray(users.email, members.map((m) => m.email)))
    : [];

  const userMap = Object.fromEntries(usersByEmail.map((u) => [u.email, u]));

  const rows = members.map((member) => {
    const user = userMap[member.email];
    return {
      email: member.email,
      permission: member.permission,
      name: user?.name ?? member.email.split('@')[0],
      picture: user?.picture ?? null,
      hasLoggedIn: !!user,
      isAdminByEnv: ADMIN_EMAILS.includes(member.email),
    };
  });

  const existingEmails = new Set(rows.map((row) => row.email));
  for (const adminEmail of ADMIN_EMAILS) {
    if (existingEmails.has(adminEmail)) continue;
    const user = usersByEmail.find((u) => u.email === adminEmail);
    rows.unshift({
      email: adminEmail,
      permission: 'admin',
      name: user?.name ?? adminEmail.split('@')[0],
      picture: user?.picture ?? null,
      hasLoggedIn: !!user,
      isAdminByEnv: true,
    });
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const { email, permission } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  if (!['view', 'edit', 'send', 'admin'].includes(permission)) {
    return NextResponse.json({ error: 'invalid permission' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const nextPermission = ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : permission;

  const [member] = await db
    .insert(workspaceMembers)
    .values({
      email: normalizedEmail,
      permission: nextPermission,
    })
    .onConflictDoUpdate({
      target: workspaceMembers.email,
      set: { permission: nextPermission },
    })
    .returning();

  return NextResponse.json(member);
}
