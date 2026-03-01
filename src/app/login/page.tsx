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
    <main className="relative h-screen w-screen overflow-hidden bg-[#f2f1ee]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-[-8%] h-80 w-80 rounded-full bg-[#2443ff]/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[18%] h-96 w-96 rounded-full bg-[#4fd0ff]/25 blur-3xl" />
        <div className="absolute bottom-[-18%] left-[35%] h-96 w-96 rounded-full bg-[#ffe8b7]/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl items-center justify-center px-5 py-8 md:px-10">
        <section className="grid w-full max-w-5xl gap-6 rounded-[32px] border border-white/70 bg-white/60 p-4 shadow-[0_20px_70px_rgba(16,24,40,0.15)] backdrop-blur-xl md:grid-cols-[1.1fr_0.9fr] md:p-6">
          <div className="relative overflow-hidden rounded-[24px] bg-[#101726] px-7 py-8 text-white md:px-9 md:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(111,169,255,0.5),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(78,239,255,0.32),transparent_45%)]" />
            <div className="relative flex h-full flex-col">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-lg font-semibold tracking-tight">DelightBridge</span>
              </div>

              <p className="max-w-sm text-[12px] font-medium uppercase tracking-[0.14em] text-white/70">
                Unified Team Inbox
              </p>
              <h1 className="mt-3 max-w-md text-[34px] leading-[1.08] font-semibold tracking-[-0.02em] text-balance md:text-[42px]">
                고객 메일 대응을 한 화면에서,
                <br />
                더 빠르고 정확하게.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-white/78 md:text-[15px]">
                서비스별 Gmail을 연결하고, AI 초안을 바탕으로 팀 기준에 맞는 응답을 빠르게 완성하세요.
              </p>

              <div className="mt-auto grid gap-3 pt-9 text-sm text-white/85 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-xl font-semibold tracking-tight">+7x</p>
                  <p className="mt-0.5 text-xs text-white/70">답변 처리 속도 향상</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
                  <p className="text-xl font-semibold tracking-tight">One Hub</p>
                  <p className="mt-0.5 text-xs text-white/70">복수 서비스 메일 통합 운영</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-[24px] bg-white/70 px-5 py-7 backdrop-blur-lg md:px-7 md:py-8">
            <div className="w-full max-w-sm">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-[#7a818d] uppercase">Workspace Access</p>
              <h2 className="mt-2 text-[30px] leading-none font-semibold tracking-[-0.02em] text-[#171c26]">
                로그인
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5f6672]">
                팀 계정으로 로그인해 워크스페이스에 접속하세요.
              </p>

              {error === 'unauthorized' && (
                <div className="mt-5 rounded-2xl border border-[#f6cccc] bg-[#fff0f0] px-4 py-3 text-[13px] text-[#b63838]">
                  접근 권한이 없는 계정입니다.
                </div>
              )}

              <form
                className="mt-6"
                action={async () => {
                  'use server';
                  await signIn('google', { redirectTo: '/' });
                }}
              >
                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-3 rounded-2xl border border-[#d8dde7] bg-white px-5 py-4 text-[14px] font-medium text-[#171c26] shadow-[0_8px_20px_rgba(28,39,63,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b7c8ff] hover:shadow-[0_12px_28px_rgba(36,67,255,0.16)]"
                >
                  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                    Google로 로그인
                  </span>
                </button>
              </form>

              <p className="mt-5 text-center text-[12px] text-[#8a909b]">
                권한이 필요한 경우 관리자에게 워크스페이스 추가를 요청하세요.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
