# DelightBridge — Project Plan

## Overview

여러 Gmail 계정(서비스)의 메일을 한 곳에서 관리하고, 계정별 참고 문서를 기반으로 LLM이 답변 초안을 자동 생성하는 웹 앱.
스프레드시트처럼 인라인에서 바로 수정 · 재생성 · 발송 가능.

## Requirements

### 기본 요구사항

- Gmail 3개 계정 (확장 가능), 일 150건
- 계정별 다른 참고 문서 (Markdown)
- Vercel 배포, PC 웹 전용
- 협업 가능 (여러 사람이 접근)
- 핵심: 상세 페이지 없이 테이블에서 바로 작업

### 추가 요구사항

- 메일 스레드(체인) 전체 컨텍스트 참조하여 답변 생성
- 오발송 방지를 위한 발송 확인 팝업
- 체크박스 선택 후 일괄 발송
- 계정(서비스)별 필터링
- 계정별 사용자 권한 관리 (협업 시 접근 제어)
- 서비스별 메일 카테고리 자동 라벨링
- 앱 로그인 계정과 서비스 Gmail 계정을 분리하여 관리

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS v4 with PostCSS
- **Rich Text Editor**: TipTap
- **AI**: Anthropic Claude API (`@anthropic-ai/sdk`) — claude-sonnet-4-5-20250514
- **Deployment**: Vercel

### Future (planned)

- **Database**: Neon DB (Serverless PostgreSQL) + Drizzle ORM
- **Email**: Gmail API (OAuth 2.0)
- **Table**: TanStack Table (스프레드시트 UX)
- **Auth**: NextAuth (Google OAuth)

## Architecture

### System Architecture

```
[Vercel - Next.js]
    │
    ├── Frontend (React)
    │     └── 3-Column Layout (Sidebar + Mail List + Detail Panel)
    │
    └── API Routes
          ├── /api/draft/generate   (초안 생성)
          ├── /api/draft/talk       (Talk to Draft — 자연어로 초안 수정)
          └── /api/draft/translate  (한국어 번역)
```

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/draft/          # AI API endpoints
│   │   ├── generate/       # Generate initial draft from thread + service docs
│   │   ├── talk/           # Refine draft via natural language instruction
│   │   └── translate/      # Translate draft to Korean
│   ├── layout.tsx          # Root layout (Korean locale, Pretendard font)
│   └── page.tsx            # Entry point, renders MainLayout
├── components/             # React components
│   ├── MainLayout.tsx      # Primary orchestrator — manages all state
│   ├── Sidebar.tsx         # Service filter + Settings button
│   ├── MailList.tsx        # Filterable email thread list
│   ├── MailDetail.tsx      # Thread view + draft editor container
│   ├── ThreadView.tsx      # Email thread messages display
│   ├── DraftEditor.tsx     # TipTap-based rich text editor
│   ├── TalkToDraft.tsx     # Natural language draft refinement UI
│   ├── TranslationPanel.tsx# Korean translation preview
│   ├── SendConfirmModal.tsx# Send confirmation popup
│   ├── BulkSendModal.tsx   # Bulk send confirmation popup
│   └── SettingsModal.tsx   # Settings modal (서비스/문서/카테고리/권한)
└── lib/
    ├── types.ts            # TypeScript interfaces
    ├── utils.ts            # Utility functions (cn, formatTime, etc.)
    └── mock-data.ts        # Mock services and email threads
```

### State Management

모든 애플리케이션 상태는 `MainLayout.tsx`에 위치. 자식 컴포넌트는 props로 데이터와 콜백을 전달받음. 외부 상태관리 라이브러리 없음.

### AI Integration

모든 Claude API 호출은 Next.js API Routes(`/api/draft/*`)를 통해 수행:
1. 프론트엔드에서 요청 데이터 전송 (스레드 메시지, 참고 문서, 드래프트 등)
2. API Route에서 프롬프트 구성
3. Claude API 호출 후 JSON 응답 파싱
4. 구조화된 결과를 프론트엔드에 반환

## Data Models

### Service

서비스(Gmail 계정)를 나타냄.

| Field | Type | Description |
|-------|------|-------------|
| id | string | 고유 식별자 |
| name | string | 서비스명 (예: "Noji", "AnkiPro") |
| email | string | 지원 이메일 주소 |
| color | string | 브랜드 색상 (hex) |
| categories | Category[] | 서비스별 카테고리 목록 |
| signature | string | HTML 서명 |
| document | string | AI 참고 문서 (Markdown) |
| unreadCount | number | 읽지 않은 메일 수 |

### Category

| Field | Type | Description |
|-------|------|-------------|
| id | string | 고유 식별자 |
| name | string | 카테고리명 |
| color | string | 배경색 (hex) |
| textColor | string | 텍스트색 (hex) |

### EmailThread

| Field | Type | Description |
|-------|------|-------------|
| id | string | 고유 식별자 |
| serviceId | string | 소속 서비스 ID |
| subject | string | 메일 제목 |
| customerEmail | string | 고객 이메일 |
| customerName | string | 고객 이름 |
| messages | EmailMessage[] | 스레드 내 메시지 목록 |
| categoryId | string | 분류된 카테고리 ID |
| status | 'inbox' \| 'sent' \| 'archived' | 상태 |
| draft | string | HTML 드래프트 본문 |
| draftSubject | string | 드래프트 제목 |
| detectedLanguage | string | 감지된 언어 코드 |
| translation | string | 한국어 번역 |
| lastMessageAt | string | 마지막 메시지 시각 (ISO) |
| isRead | boolean | 읽음 여부 |

### EmailMessage

| Field | Type | Description |
|-------|------|-------------|
| id | string | 고유 식별자 |
| fromEmail | string | 발신자 이메일 |
| fromName | string | 발신자 이름 |
| toEmail | string | 수신자 이메일 |
| body | string | HTML 본문 |
| timestamp | string | 발신 시각 (ISO) |
| direction | 'inbound' \| 'outbound' | 방향 |

## UI Layout

### 전체 레이아웃 (3-Column)

```
┌─────────────┬──────────────────────────────┬─────────────────────────────────┐
│ SIDEBAR     │ MAIL LIST                    │ DETAIL PANEL                    │
│ (서비스)    │ (메일 목록)                  │ (메일 스레드 + AI 초안)         │
│ 60px        │ 320px                        │ 나머지 (flex)                   │
└─────────────┴──────────────────────────────┴─────────────────────────────────┘
```

### Sidebar (60px)

- 상단: 로고
- 중앙: 서비스 아이콘 (배지 = 미확인 메일 수, hover 시 서비스명 툴팁)
- 하단: 설정 버튼 → Settings Modal

### Mail List (320px)

- 상단: 필터 드롭다운 (Inbox / Sent / Archived / All) + 카테고리 필터
- 리스트: 체크박스(hover시 노출) + 발신자 + 제목 + 카테고리 태그 + 메시지 수 + 시간
- 하단 액션바: 선택 시 노출 (Send All / Archive / 선택 해제)

### Detail Panel (flex)

위에서 아래로 단일 스크롤 영역:

1. **Thread** — 메일 스레드 전체 표시
2. **Translation** — 비한국어일 때만 표시, 접기/펼치기
3. **Talk to Draft** — AI에게 자연어로 수정 요청, 접기/펼치기, 퀵 프롬프트 버튼
4. **AI Draft** — TipTap 리치 텍스트 에디터, To/Subject, 서명 자동 포함, 자동저장(500ms debounce), Regenerate/Send 버튼

### Settings Modal

풀스크린 모달, 좌측 탭 + 우측 콘텐츠:

1. **서비스 관리** — 서비스 목록, 이름/이메일/색상 수정, 추가/삭제
2. **문서 및 서명 관리** — 서비스별 참고 문서(Markdown 편집), 서명(HTML 편집)
3. **카테고리 설정** — 서비스별 카테고리 CRUD (이름, 색상)
4. **권한 관리** — 멤버별 권한 레벨 (View/Edit/Send/Admin)

## Key Flows

### 1. 초안 자동 생성 (Draft Generation)

1. 사용자가 스레드 선택 → `MainLayout.handleSelectThread`
2. 드래프트가 비어있으면 `generateDraft()` 자동 호출
3. API Route에서 서비스 참고 문서 + 스레드 전체 메시지로 프롬프트 구성
4. AI가 초안 생성 + 카테고리 자동 분류
5. 서비스 서명 서버사이드에서 추가

### 2. Talk to Draft (초안 수정)

1. 사용자가 자연어 명령 입력 (예: "더 간결하게", "영어로")
2. 현재 드래프트 + 명령 + 스레드 컨텍스트를 API Route로 전달
3. AI가 수정된 드래프트 반환
4. 에디터에 자동 반영

### 3. 번역 (Translation)

1. 비한국어 메일의 경우, Translation 패널에서 "Translate" 버튼 클릭
2. 현재 드래프트를 API Route로 전달
3. AI가 한국어 번역 반환
4. Translation 패널에 표시 (읽기 전용)

### 4. 발송 (Send)

1. Send 버튼 클릭 → 확인 팝업 (To, From, Subject, 미리보기)
2. "Don't show again" 체크 옵션
3. 확인 시 status → 'sent'
4. 일괄 발송: 체크박스 선택 → 하단 액션바 "Send All" → Bulk Send 팝업

## LLM Prompt Structure

### 초안 생성 프롬프트

```
System: 고객 지원 담당자 역할
참고 문서: {service.document}
메일 스레드: {thread messages}
카테고리 목록: {service.categories}

Instructions:
- HTML 본문만 작성 (<p>, <strong>, <em>, <ol>, <ul>, <li>, <a>)
- 고객 이름 사용, 따뜻하고 공감적 톤
- 고객의 최신 메시지와 같은 언어로 작성
- 카테고리 자동 분류
- 서명/인사말 미포함 (서버사이드에서 추가)
```

### Talk to Draft 프롬프트

```
현재 드래프트 + 수정 명령 + 스레드 컨텍스트
→ 수정된 HTML 드래프트 반환
```

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/voc?sslmode=require
```

## Design

- **Theme**: 라이트 모드, 깔끔한 UI
- **Font**: Pretendard
- **Colors**: 흰 배경(#ffffff) + 회색 텍스트 + 서비스별 액센트 컬러
- **UI 문구**: AI 모델명 노출 금지 — "AI"로 통일

## DB Schema (Neon DB)

### users
id, email, name, role (admin | member), created_at

### organizations
id, name, created_at

### org_members
id, org_id (FK), user_id (FK), created_at

### gmail_accounts (= 서비스)
id, org_id (FK), email, display_name, access_token (encrypted), refresh_token (encrypted), document_id (FK), created_at

### account_permissions
id, account_id (FK), user_id (FK), permission (view | edit | send | admin), created_at

### documents
id, account_id (FK), name, content (text/md), template, updated_at

### categories
id, account_id (FK), name, description, color, keywords (array), created_at

### email_threads
id, account_id (FK), gmail_thread_id, subject, participant_emails, message_count, last_message_at, created_at

### emails
id, thread_id (FK), account_id (FK), gmail_message_id, direction, from_email, from_name, to_email, subject, body, received_at, category_id (FK), created_at

### drafts
id, thread_id (FK), content, version, status (pending | ready | sent | skipped), created_by (FK), sent_by (FK), sent_at, created_at, updated_at

## Currently Mocked (→ 실 구현 필요)

| 위치 | 현재 동작 | 실 구현 |
|---|---|---|
| `MainLayout.tsx` `SERVICES` | mock-data.ts 하드코딩 | DB `gmail_accounts` 조회 |
| `MainLayout.tsx` `THREADS` | mock-data.ts 하드코딩 | DB + Gmail API 폴링 |
| `MainLayout.handleSend` | `status: 'sent'` 로컬 변경만 | Gmail API로 실제 발송 |
| `MainLayout.handleArchive` | 로컬 상태 변경만 | DB 업데이트 |
| `MainLayout.handleSelectThread` isRead | 로컬 상태 변경만 | DB 업데이트 |
| `MainLayout.handleSaveDraft` | 로컬 상태 변경만 | DB `drafts` upsert |
| `SettingsModal` `INITIAL_MEMBERS` | 하드코딩 4명, 권한 변경 로컬만 | DB `users` + `account_permissions` |
| `SettingsModal` 서비스/문서/카테고리 저장 | React state만 (새로고침 시 리셋) | DB CRUD API 호출 |
| `SettingsModal` "Google 계정 연결" 버튼 | 아무 동작 없음 | Gmail OAuth 2.0 플로우 |
| 인증 없음 | 누구나 접근 가능 | NextAuth + Google OAuth |

## Implementation Status

### ✅ Completed

- 3-Column 레이아웃 (Sidebar + Mail List + Detail Panel, 리사이즈 가능)
- 서비스별 메일 필터링 + 카테고리 필터
- 메일 스레드 표시
- AI 초안 자동 생성
- TipTap 리치 텍스트 에디터 (Bold, Italic, Underline, Strike, Link, List)
- 자동저장 (debounce 500ms)
- Talk to Draft (자연어 수정 요청 + 퀵 프롬프트)
- 비한국어 메일 번역 패널 (드래프트 + 메시지 개별 번역)
- 카테고리 자동 라벨링
- 발송 확인 팝업 (Don't show again 옵션)
- 일괄 발송 팝업
- 체크박스 선택 + 하단 액션바 (Send All / Archive)
- Settings Modal UI (서비스 관리, 문서/서명, 카테고리, 권한 탭)

### ✅ Phase 1: DB 연동 — 완료

- `@neondatabase/serverless` + `drizzle-orm` + `drizzle-kit` + `dotenv-cli` + `tsx` 설치
- Drizzle 스키마 정의 (`gmail_accounts`, `categories`, `email_threads`, `emails`, `drafts`, `users`)
- Neon DB에 테이블 생성 (`pnpm db:push`)
- mock-data 기반 초기 시드 스크립트 완료 (`scripts/seed.ts`)
- API Routes: `GET/POST /api/services`, `PATCH/DELETE /api/services/[id]`, `GET /api/threads`, `PATCH /api/threads/[id]`, `GET/PUT /api/drafts/[threadId]`
- `MainLayout.tsx` mock-data 제거, fetch 기반 로딩 전환
- isRead / status / draft / translation / categoryId 변경 시 DB 동기화
- Settings Modal 서비스/문서/카테고리 변경 API로 저장

### ✅ Phase 2: 사용자 인증 — 완료

#### 구현 완료
- `next-auth@beta` 설치
- `users` DB 테이블 추가
- `auth.config.ts` — Edge 코에 호환 경량 config
- `auth.ts` — Google Provider + signIn 콜백 (이메일 검사 + DB upsert) + session 콜백
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth 핸들러
- `src/app/login/page.tsx` — Google 로그인 버튼 페이지
- `proxy.ts` — 비로그인 시 `/login` 리다이렉트 + API 401 보호 (Next.js 16 규약)
- `src/lib/session.ts` + API Routes 세션 가드 적용
- Sidebar 로그아웃 버튼 + NextAuth signOut 연동
- 권한 관리 탭 실연동 (`workspace_members` 기반 멤버 추가/권한 변경/삭제)
- 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `ADMIN_EMAILS` 등록 완료

### ✅ 인증/연동 개념 분리 원칙

- **앱 사용자 인증**: "누가 웹앱에 접근 가능한가"를 결정 (NextAuth + users)
- **서비스 Gmail 연동**: "어떤 Gmail 사서함을 DelightBridge가 읽고/보낼 수 있는가"를 결정 (`gmail_accounts` OAuth 토큰)
- 앱 로그인 계정(`peter@delightroom.com` 등)은 서비스 Gmail 계정(`support@noji.io` 등)과 달라도 됨

### 📋 Phase 2: 사용자 인증 — 원래 계획

목표: Google 로그인, 세션 기반 접근 제어

#### 접근 흐름
```
앱 접속 (bridge.delightroom.com)
   ↓ 세션 없음
proxy.ts → /login 리다이렉트
   ↓
/login 페이지 (로고 + "Google로 로그인" 버튼)
   ↓
Google OAuth consent screen
   ↓
이메일 확인
  → ADMIN_EMAILS에 있음   → admin 권한으로 DB upsert → 메인 앱
  → @delightroom.com 도메인 → view 권한으로 DB upsert → 메인 앱
  → 그 외               → 접근 거부 페이지
```

#### 구현 항목
- `next-auth` + Google OAuth Provider 설치 및 설정
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth 핸들러 (sign-in 콜백에서 이메일 검사 + DB upsert)
- `proxy.ts` — 비로그인 시 `/login` 리다이렉트
- `src/app/login/page.tsx` — Google 로그인 버튼 단일 페이지
- API Routes에 세션 검사 추가
- 환경변수: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `ADMIN_EMAILS`

### 📋 Phase 3: Gmail API 연동

목표: 실제 Gmail 메일 수신 + 발송, 계정별 OAuth 토큰 관리

#### 3-1. 서비스 계정 Gmail OAuth 연결
- Settings에서 "서비스 추가 + 연결" 시 즉시 Gmail OAuth 2.0 플로우 진입 (scope: `gmail.readonly`, `gmail.send`)
- OAuth 완료 시 연결된 Google 이메일을 서비스 이메일로 자동 저장
- access_token + refresh_token을 DB `gmail_accounts`에 암호화 저장
- 토큰 만료 시 자동 refresh 유틸 (`src/lib/gmail.ts`)
- Gmail OAuth 시작/완료 API는 `admin` 권한 사용자만 가능하도록 제한

#### 3-2. 메일 수신 폴링 (Vercel Cron)

```
최초 Gmail 계정 연결 시 (풀 싱크)
   → users.threads.list (q: "after:날짜", 페이지네이션)
   → 각 thread의 messages.get으로 본문 수집
   → DB email_threads / emails upsert
   → 마지막 historyId를 gmail_accounts에 저장

Cron (5분마다)
   → users.history.list?startHistoryId={저장된값}
   → 추가/변경된 메시지만 upsert
   → historyId 갱신
```

- `src/app/api/cron/sync-gmail/route.ts` — 5분 간격 Cron Job (historyId 기반 증분 동기화)
- `src/app/api/services/[id]/sync/route.ts` — 최초 연결 시 풀 싱크 트리거
- `vercel.json`에 cron 설정: `{ "path": "/api/cron/sync-gmail", "schedule": "*/5 * * * *" }`
- 환경변수: `CRON_SECRET` (Vercel Cron 보안)

#### 3-3. 메일 발송
- `POST /api/threads/[id]/send` — Gmail API `users.messages.send`
- 드래프트 내용 + 첨부파일을 MIME 메시지로 인코딩
- 발송 성공 시 DB thread status → `sent`, draft status → `sent`
- `handleSend` / `confirmBulkSend`에서 API 호출로 교체

### ✅ Phase 4: 권한 관리 실 연동 — 1차 완료

- Settings Permissions 탭 — DB `workspace_members` 조회/수정
- "멤버 추가"로 이메일 allowlist 등록 (로그인 전 초대)
- `auth.ts` 로그인 허용 기준: `ADMIN_EMAILS` 또는 `workspace_members`
- API Routes에 admin 권한 검사(`requireAdminSession`) 적용

### 🚧 Phase 3: Gmail API 연동 — 진행중

- 서비스 생성 플로우를 `서비스 추가 + 연결`로 통합 (생성 직후 OAuth 진입)
- OAuth 콜백에서 Gmail profile 이메일을 읽어 서비스 이메일 자동 동기화
- Gmail 토큰(access/refresh) 저장 및 기본 오류 처리 구현
- 실제 Gmail 발송 API(`POST /api/threads/[id]/send`)는 다음 구현 단계

### 📋 Refactor Checklist (분리 구조 반영)

- `src/lib/session.ts`: `requireSession` 외 `requireAdminSession`, `requirePermission` 유틸 추가
- `src/app/api/services/[id]/connect/route.ts`: admin만 OAuth 시작 가능
- `src/app/api/services/oauth/callback/route.ts`: OAuth token 교환 및 DB 저장 안정화
- `src/components/SettingsModal.tsx`: 연결 실패 사유(`reason`)를 사용자에게 노출
- `src/lib/db/schema.ts`: `account_permissions` 실사용 스키마 반영 및 API 연동 준비

### 📋 Future (Nice-to-have)

- Slack 알림 연동 (신규 메일 수신 시)
- 답변 품질 피드백 (👍👎)
- 메일 우선순위 자동 태깅
- 통계 대시보드
- 첨부파일 처리 (Gmail attachment download + upload)
