import { auth, signIn } from '@/../auth';
import { redirect } from 'next/navigation';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await auth();

  if (session?.user) {
    redirect('/');
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#efede8]">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1c1c1c]">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-[18px] font-bold text-[#1c1c1c]">DelightBridge</span>
        </div>

        {/* Card */}
        <div className="w-[340px] rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-[20px] font-bold text-[#1c1c1c]">로그인</h1>
          <p className="mb-6 text-[13px] text-[#a09d98]">팀 계정으로 로그인하세요.</p>

          {error === 'unauthorized' && (
            <div className="mb-4 rounded-lg bg-[#fee2e2] px-4 py-3 text-[12px] text-[#b91c1c]">
              접근 권한이 없는 계정입니다.
            </div>
          )}

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/' });
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#e0ddd9] bg-white px-4 py-3 text-[14px] font-medium text-[#1c1c1c] transition-colors hover:bg-[#f5f3ef]"
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google로 로그인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
