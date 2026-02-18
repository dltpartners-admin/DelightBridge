'use client';

import { useEffect, useState } from 'react';
import type { EmailThread, Service, EmailMessage, Attachment } from '@/lib/types';
import { formatFullDateTime, formatFileSize, getInitials, getAvatarColor, stripHtml, isKorean } from '@/lib/utils';
import { Paperclip, FileText, Download, Languages } from 'lucide-react';

interface ThreadViewProps {
  thread: EmailThread;
  service: Service;
  onEnsureMessageTranslation: (messageId: string) => void;
  translatingMessageIds: Set<string>;
}

export function ThreadView({ thread, service, onEnsureMessageTranslation, translatingMessageIds }: ThreadViewProps) {
  return (
    <div className="px-5 py-4">
      {thread.messages.map((msg) => (
        <EmailItem
          key={msg.id}
          message={msg}
          service={service}
          onEnsureTranslation={(id) => onEnsureMessageTranslation(id)}
          isTranslating={translatingMessageIds.has(msg.id)}
        />
      ))}
    </div>
  );
}

function EmailItem({
  message,
  service,
  onEnsureTranslation,
  isTranslating,
}: {
  message: EmailMessage;
  service: Service;
  onEnsureTranslation: (id: string) => void;
  isTranslating: boolean;
}) {
  const isOutbound = message.direction === 'outbound';
  const avatarColor = isOutbound ? service.color : getAvatarColor(message.fromName);
  const initials = getInitials(message.fromName);
  const senderName = isOutbound ? service.name : message.fromName;
  const attachments = message.attachments ?? [];
  const imageAttachments = attachments.filter((a) => a.type.startsWith('image/'));
  const fileAttachments = attachments.filter((a) => !a.type.startsWith('image/'));

  const plain = stripHtml(message.body);
  const nonKorean = !isKorean(plain);
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    if (nonKorean && !message.translation) {
      onEnsureTranslation(message.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  return (
    <div
      className="border-b py-4 first:pt-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Email header */}
      <div className="flex items-start gap-3 mb-3">
        {/* Avatar */}
        <div
          className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>

        {/* From / To / Date */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[14.5px] font-semibold text-[#1c1c1c] truncate">
                {senderName}
              </span>
              <span className="text-[12.5px] text-[#a09d98] truncate">
                &lt;{message.fromEmail}&gt;
              </span>
            </div>
            <span className="flex-shrink-0 text-[12.5px] text-[#a09d98]">
              {formatFullDateTime(message.timestamp)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-[#a09d98]">
            <span>To: {message.toEmail}</span>
            {attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[#706e6a]">
                <Paperclip className="h-3 w-3" />
                {attachments.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Email body */}
      <div
        className="pl-11 text-[14.5px] leading-relaxed text-[#1c1c1c]"
        dangerouslySetInnerHTML={{ __html: message.body }}
        style={{ wordBreak: 'break-word' }}
      />

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="pl-11 mt-3 space-y-2">
          {/* Inline images */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imageAttachments.map((att) => (
                <ImageAttachment key={att.id} attachment={att} />
              ))}
            </div>
          )}
          {/* File attachments */}
          {fileAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fileAttachments.map((att) => (
                <FileAttachment key={att.id} attachment={att} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline translation toggle */}
      {nonKorean && (
        <div className="pl-11 mt-2">
          {message.translation ? (
            <button
              onClick={() => setShowTranslation((v) => !v)}
              className="text-[12px] text-[#3b5bdb] hover:underline flex items-center gap-1"
            >
              <Languages className="h-3 w-3" />
              {showTranslation ? 'Hide translation' : 'See translation'}
            </button>
          ) : (
            <span className="text-[12px] text-[#a09d98] flex items-center gap-1">
              <Languages className="h-3 w-3" />
              {isTranslating ? 'Translating…' : 'Preparing translation…'}
            </span>
          )}
          {showTranslation && message.translation && (
            <div
              className="mt-1 rounded-md bg-[#f7f6f3] p-2 text-[13px] leading-relaxed text-[#706e6a]"
              dangerouslySetInnerHTML={{ __html: message.translation }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-lg border bg-[#fafaf9] transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--border)' }}
    >
      <img
        src={attachment.url}
        alt={attachment.name}
        className="max-h-[200px] max-w-[300px] object-contain"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="truncate text-[10px] font-medium text-white">{attachment.name}</p>
        <p className="text-[9px] text-white/70">{formatFileSize(attachment.size)}</p>
      </div>
    </a>
  );
}

function FileAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 rounded-lg border bg-[#fafaf9] px-3 py-2 transition-colors hover:bg-[#f0eee9]"
      style={{ borderColor: 'var(--border)' }}
    >
      <FileText className="h-4 w-4 flex-shrink-0 text-[#706e6a]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-medium text-[#1c1c1c]">{attachment.name}</p>
        <p className="text-[10px] text-[#a09d98]">{formatFileSize(attachment.size)}</p>
      </div>
      <Download className="h-3.5 w-3.5 flex-shrink-0 text-[#a09d98]" />
    </a>
  );
}
