import { auth } from '@/../auth';
import { MainLayout } from '@/components/MainLayout';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <MainLayout
      currentUser={{
        name: session.user.name ?? '',
        email: session.user.email ?? '',
        picture: session.user.image ?? null,
        permission: ((session.user as typeof session.user & { permission?: string }).permission ?? null),
      }}
    />
  );
}
