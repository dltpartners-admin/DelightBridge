import { auth } from '@/../auth';
import { NextResponse } from 'next/server';
import type { PermissionLevel } from './types';

function getSessionPermission(session: unknown): PermissionLevel | null {
  const permission =
    (session as { user?: { permission?: PermissionLevel } } | null)?.user?.permission;
  return permission ?? null;
}

export async function requireSession() {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { session, unauthorized: null };
}

export async function requirePermission(allowed: PermissionLevel[]) {
  const { session, unauthorized } = await requireSession();
  if (unauthorized || !session) {
    return { session: null, unauthorized, forbidden: null };
  }

  const permission = getSessionPermission(session);
  if (!permission || !allowed.includes(permission)) {
    return {
      session,
      unauthorized: null,
      forbidden: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { session, unauthorized: null, forbidden: null };
}

export async function requireAdminSession() {
  return requirePermission(['admin']);
}
