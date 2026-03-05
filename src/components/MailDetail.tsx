'use client';

import { useEffect, useRef } from 'react';
import type { EmailThread, Service } from '@/lib/types';
import { ThreadView } from './ThreadView';
import { DraftEditor } from './DraftEditor';
import { TalkToDraft } from './TalkToDraft';
import { TranslationPanel } from './TranslationPanel';

interface MailDetailProps {
  thread: EmailThread;
  service: Service;
  isGenerating: boolean;
  isTalking: boolean;
  isTranslating: boolean;
  isSending: boolean;
  onSaveDraft: (content: string) => void;
  onReplyFromChange: (email: string) => void;
  onRegenerate: () => void;
  onSend: () => void;
  onTalkToDraft: (instruction: string) => Promise<void> | void;
  onTranslate: () => void;
  onUpdateTranslation: (t: string) => void;
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  onEnsureMessageTranslation: (messageId: string) => void;
  translatingMessageIds: Set<string>;
}

export function MailDetail({
  thread,
  service,
  isGenerating,
  isTalking,
  isTranslating,
  isSending,
  onSaveDraft,
  onReplyFromChange,
  onRegenerate,
  onSend,
  onTalkToDraft,
  onTranslate,
  onAddAttachments,
  onRemoveAttachment,
  onEnsureMessageTranslation,
  translatingMessageIds,
}: MailDetailProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = scrollRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [thread.id, thread.messages.length]);

  const category = service.categories.find((c) => c.id === thread.categoryId);
  const isNonKorean = thread.detectedLanguage !== 'ko';

  return (
    <div className="flex flex-1 flex-col h-screen min-w-0 bg-white">
      {/* Thread header — sticky */}
      <div
        className="flex flex-shrink-0 items-center gap-3 border-b px-5 py-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-[#1c1c1c]">
            {thread.subject}
          </h2>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-[13px] text-[#a09d98]">{thread.customerEmail}</span>
            <span className="text-[#d0cdc8]">·</span>
            <span className="text-[13px] text-[#a09d98]">
              {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isNonKorean && (
            <span className="rounded-md bg-[#fff4e6] px-2 py-0.5 text-[12px] font-medium text-[#c87a00]">
              {thread.detectedLanguage.toUpperCase()}
            </span>
          )}
          {category && (
            <span
              className="rounded-md px-2 py-0.5 text-[12px] font-medium"
              style={{ backgroundColor: category.color, color: category.textColor }}
            >
              {category.name}
            </span>
          )}
        </div>
      </div>

      {/* Single scrollable area: thread + panels + draft */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Thread messages */}
        <ThreadView
          thread={thread}
          service={service}
          translatingMessageIds={translatingMessageIds}
          onEnsureMessageTranslation={onEnsureMessageTranslation}
        />

        {/* Collapsible panels (Translation + Talk to Draft) */}
        {isNonKorean && (
          <TranslationPanel
            translation={thread.translation}
            isLoading={isTranslating}
            onTranslate={onTranslate}
          />
        )}
        <TalkToDraft isLoading={isTalking} onSubmit={onTalkToDraft} />

        {/* Draft editor — inline in scroll */}
        <div className="border-t min-h-[50vh]" style={{ borderColor: 'var(--border)' }}>
          <DraftEditor
            thread={thread}
            service={service}
            isGenerating={isGenerating}
            isSending={isSending}
            onSave={onSaveDraft}
            onReplyFromChange={onReplyFromChange}
            onRegenerate={onRegenerate}
            onSend={onSend}
            onAddAttachments={onAddAttachments}
            onRemoveAttachment={onRemoveAttachment}
          />
        </div>
      </div>
    </div>
  );
}
