import type { Service, EmailThread } from './types';

// Timestamps relative to 2026-02-18 18:00 UTC
function ts(hoursAgo: number): string {
  const base = new Date('2026-02-18T18:00:00Z');
  base.setTime(base.getTime() - hoursAgo * 3600 * 1000);
  return base.toISOString();
}

export const SERVICES: Service[] = [
  {
    id: 'noji',
    name: 'Noji',
    email: 'support@noji.io',
    color: '#5c6df8',
    signature: `<p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
    document: `# Noji Support Reference Guide

## About Noji
Noji is an AI-powered flashcard app for iOS. Users can import PDFs, web pages, or type content to auto-generate flashcards. Plans: Free, Monthly Premium ($4.99/mo), Lifetime Premium ($49.99 one-time).

## Common Issues

### AI Card Generation Fails
- Only works with text-based (digital) PDFs — NOT scanned images/photo PDFs
- Scanned PDFs contain image pixels, not real text — our AI cannot read them
- Workaround: Use an OCR tool (e.g. Adobe Acrobat, online OCR) to convert first
- Error shown: "Could not process document"

### Missing / Lost Cards
- Usually caused by an iCloud sync interruption
- Fix: Open Noji → Settings → Restore Deck/Card
- Also check: logged in with same Apple ID as when cards were created
- Force sync: pull down on the card list screen

### Subscription Not Activating
- After App Store purchase, tap: Settings → Restore Purchases
- Ensure correct Apple ID is active on device
- Allow 5–10 min after purchase before contacting support
- Lifetime purchase includes all future updates

### Refund Requests
- All purchases managed by Apple App Store
- Noji cannot issue refunds directly
- Instruct user to visit: https://reportaproblem.apple.com
- For cancellation: Settings app → [Name] → Subscriptions → Noji → Cancel

### Log Out Issues
- Force-quit app fully, then reopen
- If stuck logged out: delete and reinstall (iCloud data preserved)
- Settings button greyed out = known bug, fixed in next update

### Sync Issues (Multi-device)
- Ensure iCloud Drive is ON for Noji in iOS Settings → [Name] → iCloud
- Both devices must use the same Apple ID
- Allow 2–3 min for sync to propagate

### Referral / Promo Codes
- Enter code in: Noji → Profile → Redeem Code
- Codes are case-insensitive
- If not applied: provide User ID (found at bottom of Settings screen)

## Response Guidelines
- Be warm, empathetic, solution-first
- Use the customer's first name
- Acknowledge frustration before jumping to solutions
- End with an offer to help further`,
    categories: [
      { id: 'subscription', name: 'subscription', color: '#dbeafe', textColor: '#1d4ed8' },
      { id: 'cancellation', name: 'cancellation & refund', color: '#fee2e2', textColor: '#b91c1c' },
      { id: 'restore', name: 'restore deck/card', color: '#d1fae5', textColor: '#065f46' },
      { id: 'logout', name: 'log out', color: '#ede9fe', textColor: '#6d28d9' },
      { id: 'server-error', name: 'server error', color: '#fce7f3', textColor: '#9d174d' },
      { id: 'referral', name: 'referral', color: '#fef3c7', textColor: '#92400e' },
      { id: 'pdf', name: 'pdf', color: '#f1f5f9', textColor: '#475569' },
      { id: 'ai-feature', name: 'AI feature', color: '#fef9c3', textColor: '#854d0e' },
    ],
    templates: [
      {
        id: 'tpl-noji-handover',
        name: '후처리 완료 안내',
        body: '<p>안녕하세요.</p><p>요청하신 후처리가 완료되어 먼저 안내드립니다. 최종 결과 확인 후 추가 요청사항이 있으면 알려주세요.</p>',
      },
    ],
    unreadCount: 8,
    senderIdentities: [
      {
        id: 'sender-noji-support',
        email: 'support@noji.io',
        displayName: 'Noji Support',
        isDefault: true,
        isEnabled: true,
      },
    ],
  },
  {
    id: 'ankipro',
    name: 'AnkiPro',
    email: 'support@ankipro.net',
    color: '#e05c4b',
    signature: `<p>Best regards,<br>Alex<br><strong>AnkiPro Support</strong></p>`,
    document: `# AnkiPro Support Reference

## About AnkiPro
AnkiPro is a powerful spaced repetition flashcard app compatible with Anki (.apkg) decks. Plans: Free (200 cards), Monthly ($7.99/mo), Annual ($59.99/yr).

## Common Issues

### Deck Import Failure
- Supported format: .apkg files only (not .colpkg for collection)
- Max file size: 50MB
- Import via: tap "+" → Import Deck → select file from Files app
- Common cause: media-heavy decks (audio/images bloating file size)

### Billing Issues
- Subscriptions managed via App Store or Google Play
- Refunds: reportaproblem.apple.com (iOS) or Google Play help (Android)
- Annual subscription does NOT auto-cancel — must be cancelled manually

### Study Stats Incorrect
- Usually a sync delay — force-close and reopen app
- If persists: Settings → Clear Cache → restart
- Streak resets can occur if timezone changes

## Response Guidelines
- Professional but approachable
- Use customer's first name
- Provide step-by-step instructions`,
    categories: [
      { id: 'import', name: 'deck import', color: '#dbeafe', textColor: '#1d4ed8' },
      { id: 'sync', name: 'sync issue', color: '#fce7f3', textColor: '#9d174d' },
      { id: 'billing', name: 'billing', color: '#fee2e2', textColor: '#b91c1c' },
      { id: 'feature', name: 'feature request', color: '#fef3c7', textColor: '#92400e' },
      { id: 'stats', name: 'stats bug', color: '#d1fae5', textColor: '#065f46' },
    ],
    templates: [
      {
        id: 'tpl-ankipro-followup',
        name: '처리 중 안내',
        body: '<p>안녕하세요.</p><p>현재 요청하신 내용을 확인 중이며, 진행 상황을 우선 공유드립니다. 확인이 끝나는 대로 최종 안내 드리겠습니다.</p>',
      },
    ],
    unreadCount: 3,
    senderIdentities: [
      {
        id: 'sender-ankipro-support',
        email: 'support@ankipro.net',
        displayName: 'AnkiPro Support',
        isDefault: true,
        isEnabled: true,
      },
    ],
  },
];

export const THREADS: EmailThread[] = [
  // ── NOJI ──────────────────────────────────────────────────────────────────
  {
    id: 'noji-1',
    serviceId: 'noji',
    subject: "Can't generate AI cards",
    customerEmail: 'ruben22_50@icloud.com',
    customerName: 'Rubén Sanz',
    categoryId: 'pdf',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(3.5),
    isRead: true,
    draftAttachments: [],
    draftSubject: "Re: Can't generate AI cards",
    draft: `<p>Hello Rubén,</p>
<p>Apologies for the delayed reply! It looks like the document in question does not have plain text to be recognised, but rather text scans, hence 'images' with text. This is why it couldn't be recognised by our AI. 😊</p>
<p>We're aware of this shortcoming and plan to enhance our PDF import feature to accommodate visual information as well, but so far, it's only plain text from "authentic" PDF docs that our algorithm can detect.</p>
<p>We apologise for the possible inconvenience.</p>`,
    messages: [
      {
        id: 'noji-1-m1',
        fromEmail: 'ruben22_50@icloud.com',
        fromName: 'Rubén Sanz',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(27),
        body: `<p>Hello,</p><p>I've been trying to import my study PDF to generate AI flashcards, but it keeps saying it can't generate cards. The PDF is a textbook chapter titled "Tema 2.2_La administración local.pdf" (6.8MB). I paid for Premium specifically for this feature. Can you help?</p><p>Thanks,<br>Rubén</p>`,
        attachments: [
          { id: 'att-ruben-1', name: 'Tema 2.2_La administración local.pdf', size: 6_800_000, type: 'application/pdf', url: '#' },
        ],
      },
      {
        id: 'noji-1-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'ruben22_50@icloud.com',
        direction: 'outbound',
        timestamp: ts(24),
        body: `<p>Hello Rubén,</p><p>Thank you for reaching out! Could you confirm — is the PDF a scanned document or a digital PDF with selectable text?</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-1-m3',
        fromEmail: 'ruben22_50@icloud.com',
        fromName: 'Rubén Sanz',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(3.5),
        body: `<p>Hi, I tried selecting text in Preview and it doesn't work — so I think it's scanned. Is there any way to make it work with this kind of PDF?</p>`,
        attachments: [
          { id: 'att-ruben-2', name: 'screenshot_preview.png', size: 245_000, type: 'image/png', url: 'https://placehold.co/600x400/f0eee9/706e6a?text=PDF+Preview+Screenshot' },
        ],
      },
    ],
  },
  {
    id: 'noji-2',
    serviceId: 'noji',
    subject: 'Noji Support Request',
    customerEmail: 'nicole.shalafova@gmail.com',
    customerName: 'Nicole Shalafova',
    categoryId: 'cancellation',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(4.2),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: Noji Support Request',
    draft: `<p>Hello Nicole,</p>
<p>Thank you for reaching out. I'm sorry to hear you were charged unexpectedly — I completely understand how frustrating that must be.</p>
<p>As Noji's purchases are processed through the Apple App Store, refunds need to be requested directly through Apple. The quickest way is to visit <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a>, select the Noji charge, and submit a refund request.</p>
<p>To prevent future renewals, please go to: <strong>Settings app → [Your Name] → Subscriptions → Noji → Cancel Subscription</strong>.</p>
<p>We're sorry to see you go, and I hope this helps resolve things quickly!</p>`,
    messages: [
      {
        id: 'noji-2-m1',
        fromEmail: 'nicole.shalafova@gmail.com',
        fromName: 'Nicole Shalafova',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(26),
        body: `<p>Hi Noji Support,</p><p>I was charged for a subscription I hadn't intended to renew. I'd like a refund and to cancel immediately — I haven't used the app in months.</p><p>Nicole</p>`,
      },
      {
        id: 'noji-2-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'nicole.shalafova@gmail.com',
        direction: 'outbound',
        timestamp: ts(22),
        body: `<p>Hello Nicole,</p><p>Thank you for reaching out. I understand your frustration. Our subscriptions auto-renew unless cancelled beforehand. Let me walk you through how to cancel and request a refund.</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-2-m3',
        fromEmail: 'nicole.shalafova@gmail.com',
        fromName: 'Nicole Shalafova',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(4.2),
        body: `<p>Thanks, but can you process the refund directly? It's been less than 24 hours since the charge and I'd prefer not to deal with Apple support.</p>`,
      },
    ],
  },
  {
    id: 'noji-3',
    serviceId: 'noji',
    subject: 'Noji Support Request',
    customerEmail: 'nishanth.bandela@outlook.com',
    customerName: 'Nishanth Bandela',
    categoryId: 'subscription',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(4.7),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: Noji Support Request',
    draft: '',
    messages: [
      {
        id: 'noji-3-m1',
        fromEmail: 'nishanth.bandela@outlook.com',
        fromName: 'Nishanth Bandela',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(48),
        body: `<p>Hello,</p><p>I purchased the Lifetime Premium plan last week but my account still shows as Free. App Store receipt confirms the payment of $49.99. Order ID: ML4RB2847K. This is very frustrating.</p>`,
        attachments: [
          { id: 'att-nish-1', name: 'appstore_receipt.png', size: 380_000, type: 'image/png', url: 'https://placehold.co/400x600/f0eee9/706e6a?text=App+Store+Receipt' },
        ],
      },
      {
        id: 'noji-3-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'nishanth.bandela@outlook.com',
        direction: 'outbound',
        timestamp: ts(44),
        body: `<p>Hello Nishanth,</p><p>Thank you for your purchase! Please try: <strong>Settings → Restore Purchases</strong>. This should activate your Lifetime Premium. Let us know if it works!</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-3-m3',
        fromEmail: 'nishanth.bandela@outlook.com',
        fromName: 'Nishanth Bandela',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(4.7),
        body: `<p>Hi, I tried Restore Purchases but it still shows Free plan. I've restarted the app multiple times. Please help — I need this for my exam prep!</p>`,
      },
    ],
  },
  {
    id: 'noji-4',
    serviceId: 'noji',
    subject: 'Missing flash cards',
    customerEmail: 'sadiep2031@gmail.com',
    customerName: 'Sadie Pettit',
    categoryId: 'restore',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(4.9),
    isRead: true,
    draftAttachments: [],
    draftSubject: 'Re: Missing flash cards',
    draft: `<p>Hello Sadie,</p>
<p>Thank you for your message! I'm so sorry to hear your flashcards have gone missing — I completely understand how stressful that must be with your exams coming up.</p>
<p>This can happen due to a sync interruption. Here's what I'd recommend:</p>
<ol>
  <li>In Noji, go to <strong>Settings → Restore Deck/Card</strong> and see if your cards reappear</li>
  <li>Make sure you're logged in with the same Apple ID used when you created the cards</li>
  <li>Try force-quitting the app fully and reopening it</li>
</ol>
<p>As for the log out button being greyed out — that's a known UI bug we're fixing in the next update. You can still access all features normally.</p>
<p>Please let me know if the restore option resolves it. If not, share your Apple ID email and I'll look into it on our end.</p>`,
    messages: [
      {
        id: 'noji-4-m1',
        fromEmail: 'sadiep2031@gmail.com',
        fromName: 'Sadie Pettit',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(20),
        body: `<p>Hi,</p><p>I logged out of the app and when I logged back in, ALL my flashcard decks are gone. I had over 300 cards I spent weeks making for my medical school exam next week. Please help me get them back urgently!</p>`,
      },
      {
        id: 'noji-4-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'sadiep2031@gmail.com',
        direction: 'outbound',
        timestamp: ts(18),
        body: `<p>Hello Sadie,</p><p>I'm so sorry to hear this! Please try: Noji → Settings → Restore Deck/Card. Your data should still be in iCloud. Let us know immediately if it works!</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-4-m3',
        fromEmail: 'sadiep2031@gmail.com',
        fromName: 'Sadie Pettit',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(4.9),
        body: `<p>Hi, I tried but can't find the Restore option — I'm on iOS 18, Noji v2.1. Also the log out button seems greyed out which is strange. Where exactly is the restore option?</p>`,
      },
    ],
  },
  {
    id: 'noji-5',
    serviceId: 'noji',
    subject: 'Issue with the AI feature',
    customerEmail: 'mbarrios92@gmail.com',
    customerName: 'Manuel Alonzo Barrios',
    categoryId: 'ai-feature',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(5.3),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: Issue with the AI feature',
    draft: `<p>Hello Manuel,</p>
<p>Thanks for the additional detail! If the text in your PDF is selectable, then it should work with our AI. Let me investigate further.</p>
<p>Could you try the following:</p>
<ol>
  <li>Copy a section of text from the PDF and paste it directly into the Noji text import instead</li>
  <li>If that works, the issue may be related to PDF encoding or special characters in the file</li>
</ol>
<p>Also, could you let me know what error message you see exactly when you try to import? A screenshot would be very helpful.</p>`,
    messages: [
      {
        id: 'noji-5-m1',
        fromEmail: 'mbarrios92@gmail.com',
        fromName: 'Manuel Alonzo Barrios',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(8),
        body: `<p>Dear Support,</p><p>I'm having an issue with AI card generation. When I paste text manually it works fine, but when I try to use a PDF file (university course materials) I get a "Could not process document" error.</p>`,
      },
      {
        id: 'noji-5-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'mbarrios92@gmail.com',
        direction: 'outbound',
        timestamp: ts(6),
        body: `<p>Hello Manuel,</p><p>Thanks for reaching out! Is your PDF text-based or scanned? You can check by trying to select/highlight text when viewing it in Files or Preview.</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-5-m3',
        fromEmail: 'mbarrios92@gmail.com',
        fromName: 'Manuel Alonzo Barrios',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(5.3),
        body: `<p>Hi, yes — I can select text in the PDF when I open it. It's definitely a digital PDF, about 2MB. Could it be a file size issue or something else?</p>`,
      },
    ],
  },
  {
    id: 'noji-6',
    serviceId: 'noji',
    subject: 'Premium',
    customerEmail: 'eserrano292960@gurnick.edu',
    customerName: 'Erika Irene Serrano',
    categoryId: 'referral',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(5.5),
    isRead: true,
    draftAttachments: [],
    draftSubject: 'Re: Premium',
    draft: `<p>Hello Erika,</p>
<p>Thanks for your message! I've looked up the referral code <strong>NOJI-MARIA-2026</strong> and your User ID <strong>#7483920</strong>.</p>
<p>It looks like the code was entered correctly but the activation was delayed on our end. I've manually applied 1 month of Premium to your account — it should be active within the next few minutes.</p>
<p>Please force-close the app and reopen it to see the update. Let me know if Premium doesn't show up after that!</p>`,
    messages: [
      {
        id: 'noji-6-m1',
        fromEmail: 'eserrano292960@gurnick.edu',
        fromName: 'Erika Irene Serrano',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(10),
        body: `<p>Hello,</p><p>I used a referral code from a classmate to get 1 month free premium (code: NOJI-MARIA-2026). After entering it, my account still shows as Free tier. Can you check?</p>`,
      },
      {
        id: 'noji-6-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'eserrano292960@gurnick.edu',
        direction: 'outbound',
        timestamp: ts(8),
        body: `<p>Hello Erika,</p><p>Thanks for your message! Please share your User ID (found at the bottom of the Settings screen) and I'll look into it right away.</p><p>Cordially,<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-6-m3',
        fromEmail: 'eserrano292960@gurnick.edu',
        fromName: 'Erika Irene Serrano',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(5.5),
        body: `<p>Hi! My User ID is #7483920. The referral code is NOJI-MARIA-2026. I've attached a screenshot of the settings screen as well.</p>`,
      },
    ],
  },
  {
    id: 'noji-7',
    serviceId: 'noji',
    subject: '[Request for Restoration] Lifetime Purchase',
    customerEmail: 'tndk2425@icloud.com',
    customerName: 'tndk2425',
    categoryId: 'subscription',
    status: 'inbox',
    detectedLanguage: 'ko',
    translation: '',
    lastMessageAt: ts(6.5),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: [Request for Restoration] Lifetime Purchase',
    draft: `<p>안녕하세요,</p>
<p>Noji를 이용해 주셔서 감사합니다. 라이프타임 구독이 복원되지 않아 불편을 드려 정말 죄송합니다.</p>
<p>영수증 번호 <strong>ML9KR3847</strong>을 확인해보겠습니다. 먼저 아래 방법을 시도해 주시겠어요?</p>
<ol>
  <li>Noji 앱 → 설정(Settings) → 구매 복원(Restore Purchases) 탭</li>
  <li>구매 당시 사용하신 Apple ID와 현재 기기의 Apple ID가 동일한지 확인</li>
</ol>
<p>위 방법으로도 해결이 되지 않으시면 저희 쪽에서 직접 계정을 확인하여 도움드리겠습니다. 조금만 더 기다려 주세요!</p>`,
    messages: [
      {
        id: 'noji-7-m1',
        fromEmail: 'tndk2425@icloud.com',
        fromName: 'tndk2425',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(72),
        body: `<p>안녕하세요,</p><p>2024년 8월에 Noji 라이프타임 프리미엄을 구매했습니다. 최근에 기기를 교체하고 나서 구매가 복원되지 않고 있어 연락드립니다. 앱스토어 영수증은 있습니다.</p>`,
      },
      {
        id: 'noji-7-m2',
        fromEmail: 'support@noji.io',
        fromName: 'Noji Support',
        toEmail: 'tndk2425@icloud.com',
        direction: 'outbound',
        timestamp: ts(60),
        body: `<p>안녕하세요,</p><p>불편을 드려서 죄송합니다. 설정(Settings) → 구매 복원(Restore Purchases)을 먼저 시도해 보시겠어요?</p><p>감사합니다.<br>Sasha<br><strong>Noji Support Team</strong></p>`,
      },
      {
        id: 'noji-7-m3',
        fromEmail: 'tndk2425@icloud.com',
        fromName: 'tndk2425',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(6.5),
        body: `<p>안녕하세요, 복원을 시도했는데 계속 무료 버전으로 나옵니다. 동일한 Apple ID로 로그인된 것도 확인했습니다. 영수증 번호는 ML9KR3847입니다.</p>`,
      },
    ],
  },
  {
    id: 'noji-8',
    serviceId: 'noji',
    subject: 'synchronize my iPhone cards with my other devices',
    customerEmail: 'danielle.soroksky@gmail.com',
    customerName: 'Danielle Soroksky',
    categoryId: 'server-error',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(6.8),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: synchronize my iPhone cards with my other devices',
    draft: '',
    messages: [
      {
        id: 'noji-8-m1',
        fromEmail: 'danielle.soroksky@gmail.com',
        fromName: 'Danielle Soroksky',
        toEmail: 'support@noji.io',
        direction: 'inbound',
        timestamp: ts(6.8),
        body: `<p>Hi,</p><p>My flashcards created on my iPhone aren't syncing to my iPad. Both devices use the same Apple ID and have iCloud Drive enabled for Noji. I can see all decks on iPhone but the iPad shows empty. I'm a Premium subscriber. Please help!</p>`,
      },
    ],
  },

  // ── ANKIPRO ───────────────────────────────────────────────────────────────
  {
    id: 'ankipro-1',
    serviceId: 'ankipro',
    subject: 'AnkiPro Premium billing issue',
    customerEmail: 'alex.martinez@gmail.com',
    customerName: 'Alex Martinez',
    categoryId: 'billing',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(2),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: AnkiPro Premium billing issue',
    draft: `<p>Hello Alex,</p>
<p>Thank you for reaching out to AnkiPro Support!</p>
<p>I completely understand your frustration with the unexpected charge. As our subscriptions are managed through the Apple App Store, refunds are processed by Apple directly. The quickest path is:</p>
<p>Visit <a href="https://reportaproblem.apple.com">reportaproblem.apple.com</a> → find the AnkiPro charge (Order #AM28471) → select "I didn't mean to subscribe" → submit.</p>
<p>I've also cancelled your subscription on our end effective immediately, so no further charges will occur.</p>
<p>Is there anything else I can help you with?</p>`,
    messages: [
      {
        id: 'ankipro-1-m1',
        fromEmail: 'alex.martinez@gmail.com',
        fromName: 'Alex Martinez',
        toEmail: 'support@ankipro.net',
        direction: 'inbound',
        timestamp: ts(24),
        body: `<p>Hello,</p><p>I was charged $59.99 for an annual subscription I thought I had cancelled. I'd like a refund please. Order #AM28471.</p>`,
      },
      {
        id: 'ankipro-1-m2',
        fromEmail: 'support@ankipro.net',
        fromName: 'AnkiPro Support',
        toEmail: 'alex.martinez@gmail.com',
        direction: 'outbound',
        timestamp: ts(20),
        body: `<p>Hello Alex,</p><p>I'm sorry to hear about this! Could you confirm the email address associated with your AnkiPro account so I can look into it?</p><p>Best regards,<br>Alex<br><strong>AnkiPro Support</strong></p>`,
      },
      {
        id: 'ankipro-1-m3',
        fromEmail: 'alex.martinez@gmail.com',
        fromName: 'Alex Martinez',
        toEmail: 'support@ankipro.net',
        direction: 'inbound',
        timestamp: ts(2),
        body: `<p>It's alex.martinez@gmail.com — same as this email. The charge came through on Feb 15th. Please process the refund ASAP.</p>`,
      },
    ],
  },
  {
    id: 'ankipro-2',
    serviceId: 'ankipro',
    subject: '학습 통계가 이상해요',
    customerEmail: 'mjpark.study@gmail.com',
    customerName: '박민준',
    categoryId: 'stats',
    status: 'inbox',
    detectedLanguage: 'ko',
    translation: '',
    lastMessageAt: ts(8),
    isRead: false,
    draftAttachments: [],
    draftSubject: 'Re: 학습 통계가 이상해요',
    draft: `<p>안녕하세요 민준님,</p>
<p>AnkiPro를 이용해 주셔서 감사합니다!</p>
<p>학습 통계가 정확하게 표시되지 않아 불편을 드려 죄송합니다. 이 문제는 서버 동기화 지연으로 인해 발생하는 경우가 많습니다.</p>
<p>다음 방법을 시도해 주시겠어요?</p>
<ol>
  <li>앱을 완전히 종료(강제 종료)한 뒤 다시 실행</li>
  <li>Settings → Clear Cache → 앱 재시작</li>
</ol>
<p>연속 학습일 초기화와 카드 수 불일치 문제는 저희 개발팀에 함께 보고하겠습니다. 앱 버전과 iOS 버전을 알려주시면 더 빠르게 확인해 드릴 수 있습니다!</p>`,
    messages: [
      {
        id: 'ankipro-2-m1',
        fromEmail: 'mjpark.study@gmail.com',
        fromName: '박민준',
        toEmail: 'support@ankipro.net',
        direction: 'inbound',
        timestamp: ts(8),
        body: `<p>안녕하세요,</p><p>어제 카드 100개를 학습했는데 통계에는 50개밖에 안 표시되고 있어요. 연속 학습일도 초기화됐습니다. 프리미엄 구독 중인데 이런 오류가 반복되어 불편합니다.</p>`,
      },
    ],
  },
  {
    id: 'ankipro-3',
    serviceId: 'ankipro',
    subject: 'Anki deck import failed',
    customerEmail: 'thomas.mueller@uni-berlin.de',
    customerName: 'Thomas Müller',
    categoryId: 'import',
    status: 'inbox',
    detectedLanguage: 'en',
    translation: '',
    lastMessageAt: ts(12),
    isRead: true,
    draftAttachments: [],
    draftSubject: 'Re: Anki deck import failed',
    draft: `<p>Hello Thomas,</p>
<p>Thank you for contacting AnkiPro Support!</p>
<p>I'm sorry to hear you're having trouble importing your German vocabulary deck. Your deck is 23MB which is well within our 50MB limit, so file size shouldn't be the issue.</p>
<p>Could you try the following steps?</p>
<ol>
  <li>Make sure you're importing via: tap <strong>"+"</strong> in the app → <strong>Import Deck</strong> → select the .apkg file from Files</li>
  <li>Check if the deck has any media files (audio/images) — these can sometimes cause import failures on certain iOS versions</li>
  <li>Try exporting the deck from Anki desktop again using <strong>File → Export → Anki Deck Package (.apkg)</strong> with "Include media" ticked</li>
</ol>
<p>Which version of AnkiPro and iOS are you on? That will help us narrow this down.</p>`,
    messages: [
      {
        id: 'ankipro-3-m1',
        fromEmail: 'thomas.mueller@uni-berlin.de',
        fromName: 'Thomas Müller',
        toEmail: 'support@ankipro.net',
        direction: 'inbound',
        timestamp: ts(14),
        body: `<p>Hallo,</p><p>I'm trying to import my German vocabulary deck (.apkg, 23MB) into AnkiPro but it says "Import failed". I've been using this deck in Anki desktop for years with no issues.</p><p>Best regards,<br>Thomas</p>`,
      },
      {
        id: 'ankipro-3-m2',
        fromEmail: 'support@ankipro.net',
        fromName: 'AnkiPro Support',
        toEmail: 'thomas.mueller@uni-berlin.de',
        direction: 'outbound',
        timestamp: ts(12),
        body: `<p>Hello Thomas,</p><p>Thanks for reaching out! Could you share your AnkiPro version and iOS version? That will help us identify the issue more quickly.</p><p>Best regards,<br>Alex<br><strong>AnkiPro Support</strong></p>`,
      },
    ],
  },
];
