# DelightBridge — Project Plan (Synced)

## Overview

DelightBridge는 여러 Gmail 서비스 계정을 한 화면에서 관리하고, 서비스별 문서를 기반으로 AI 답장을 생성/수정/번역/발송하는 내부 지원 도구다.
핵심 UX는 상세 페이지 전환 없이 3-column 화면에서 바로 처리하는 인라인 워크플로우다.

## Current Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript (strict)
- Styling: Tailwind CSS v4
- Editor: TipTap
- Auth: NextAuth (Google OAuth)
- DB: Neon PostgreSQL + Drizzle ORM
- Mail: Gmail API OAuth + sync/send endpoints
- AI: Anthropic SDK (`@anthropic-ai/sdk`)
  - draft/talk/translate: `claude-sonnet-4-6`
  - message translate: `claude-haiku-4-5`

## Architecture Snapshot

```
Next.js (Vercel)
├── UI (MainLayout single state owner)
│   ├── Sidebar (서비스 선택 + 설정)
│   ├── MailList (필터/검색/일괄 선택)
│   └── MailDetail (스레드 + 번역 + DraftEditor)
└── API
    ├── Auth: /api/auth/[...nextauth]
    ├── Services: /api/services/*
    ├── Threads: /api/threads/*
    ├── Draft: /api/draft/*, /api/drafts/*
    ├── Members: /api/members/*
    └── Cron: /api/cron/sync-gmail
```

## State Management

- 모든 앱 상태는 `src/components/MainLayout.tsx`에 집중되어 있다.
- 자식 컴포넌트는 props 기반으로만 읽기/액션을 전달받는다.
- 외부 상태 관리 라이브러리는 사용하지 않는다.

## Implemented Features

### Core Inbox UX

- 3-column 레이아웃 + 상세 패널 리사이즈
- 서비스/상태/카테고리 필터 + 검색
- 단일 선택 발송 + 일괄 발송 + 아카이브
- 발송 전 확인 모달 + "Don't show again"

### AI Workflow

- 스레드 선택 시 초안 자동 생성
- Talk to Draft 자연어 수정
- 초안 한국어 번역 + 메시지 단위 번역
- 카테고리 자동 분류 + 언어 감지값 저장

### Auth / Permissions

- Google 로그인 + 세션 기반 접근 제어
- `ADMIN_EMAILS` + `workspace_members` allowlist
- 권한 레벨: `view | edit | send | admin`
- 멤버 추가/권한 변경/삭제 UI 및 API 연동

### Gmail Integration

- 서비스 생성 직후 OAuth 연결 플로우
- Gmail 계정 프로필 이메일을 서비스 이메일로 동기화
- 풀/증분 동기화 API + Vercel cron(5분)
- Gmail label(`INBOX`,`SENT`,`UNREAD`) 기반 상태/읽음 반영
- 실제 Gmail 발송 API 연동 (첨부파일 MIME 발송은 미구현)

## DB Schema (As Implemented)

`src/lib/db/schema.ts` 기준:

- `users` (google 프로필 + permission)
- `workspace_members` (로그인 허용/권한 allowlist)
- `gmail_accounts` (서비스 + OAuth token/history cursor)
- `categories` (서비스별 카테고리)
- `email_threads` (스레드 메타 + 상태)
- `emails` (개별 메시지)
- `drafts` (subject/content/translation/status)

## API Scope (As Implemented)

- Services: `GET/POST /api/services`, `PATCH/DELETE /api/services/[id]`, `GET /api/services/[id]/connect`, `POST /api/services/[id]/sync`
- Threads: `GET /api/threads`, `GET/PATCH /api/threads/[id]`, `POST /api/threads/[id]/send`
- Draft/AI: `POST /api/draft/generate|talk|translate`, `POST /api/message/translate`, `GET/PUT /api/drafts/[threadId]`
- Members: `GET/POST /api/members`, `PATCH/DELETE /api/members/[email]`
- Cron: `GET /api/cron/sync-gmail`

## Gap Status

| Item | Status | Note |
|---|---|---|
| Gmail 수신 동기화(historyId) | Done | full/incremental + cron 구현 |
| 발송 API 연동 | Done | 단건/일괄 발송 UI 연결 |
| 발송 첨부파일 MIME 처리 | Not done | UI attachment만 존재, Gmail multipart 미구현 |
| 서비스 단위 권한(`account_permissions`) | Not done | 현재 workspace 전역 권한만 사용 |
| 멤버 초대 링크 기반 온보딩 | Not done | 이메일 allowlist 수동 추가 방식 |

## Structural Risks (Current Implementation)

### High

1. 권한 경계가 전역 역할 중심이라 서비스/스레드 리소스 단위 제어가 없다. `requireSession`만 쓰는 라우트(`services`, `threads`, `drafts`)에서는 로그인 사용자면 광범위 수정이 가능하다.
2. 메일 본문/서명/번역 HTML을 `dangerouslySetInnerHTML`로 렌더링한다. Gmail/AI 입력에 악성 HTML이 섞이면 XSS 리스크가 생긴다.

### Medium

1. 클라이언트가 여러 변경을 낙관적 업데이트 + fire-and-forget fetch로 처리해 실패 시 UI와 DB 상태가 쉽게 어긋난다.
2. 발송 중복 방지 로직이 최근 outbound 비교 기반이라 동시성 상황에서 완전한 idempotency를 보장하지 못한다.
3. AI 라우트에 별도 rate limit/쿼터 제어가 없어 비용 급증이나 오남용 리스크가 있다.

### Low

1. `service-${Date.now()}`, `cat-${Date.now()}` 같은 클라이언트 생성 ID는 충돌 가능성과 추적성 한계가 있다.

## Recommended Next Work

1. 서비스/스레드 단위 authorization 레이어를 추가하고 write API를 `edit/send/admin`로 세분화한다.
2. HTML sanitization(서버/클라이언트)을 도입해 렌더링 안전성을 확보한다.
3. mutation API 응답 기반 낙관적 업데이트 롤백 처리를 추가한다.
4. send API에 idempotency key 또는 DB 락 기반 중복 방지 장치를 넣는다.
5. AI API에 사용자/시간 단위 rate limit과 호출 로깅을 도입한다.

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AUTH_SECRET=...
ADMIN_EMAILS=...
CRON_SECRET=...
CRON_SYNC_MAX_ACCOUNTS=20
```
