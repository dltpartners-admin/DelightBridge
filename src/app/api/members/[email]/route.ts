import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { workspaceMembers } from '@/lib/db/schema';
import { requireAdminSession } from '@/lib/session';
import { getAdminEmails } from '@/lib/admin-emails';

const ADMIN_EMAILS = getAdminEmails();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const { email } = await params;
  const { permission } = await req.json();

  if (!['view', 'edit', 'send', 'admin'].includes(permission)) {
    return NextResponse.json({ error: 'invalid permission' }, { status: 400 });
  }

  const targetEmail = decodeURIComponent(email).trim().toLowerCase();
  if (ADMIN_EMAILS.includes(targetEmail) && permission !== 'admin') {
    return NextResponse.json({ error: 'default admin cannot be downgraded' }, { status: 400 });
  }

  const [member] = await db
    .update(workspaceMembers)
    .set({ permission })
    .where(eq(workspaceMembers.email, targetEmail))
    .returning();

  if (!member) {
    return NextResponse.json({ error: 'member not found' }, { status: 404 });
  }

  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { unauthorized, forbidden } = await requireAdminSession();
  if (unauthorized) return unauthorized;
  if (forbidden) return forbidden;

  const { email } = await params;
  const targetEmail = decodeURIComponent(email).trim().toLowerCase();
  if (ADMIN_EMAILS.includes(targetEmail)) {
    return NextResponse.json({ error: 'default admin cannot be removed' }, { status: 400 });
  }

  await db
    .delete(workspaceMembers)
    .where(eq(workspaceMembers.email, targetEmail));

  return NextResponse.json({ ok: true });
}
