'use client';

import { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import type { EmailThread, Service } from '@/lib/types';
import { stripHtml, formatFileSize } from '@/lib/utils';

interface SendConfirmModalProps {
  thread: EmailThread;
  service: Service;
  onConfirm: (dontShow: boolean) => void;
  onCancel: () => void;
}

export function SendConfirmModal({ thread, service, onConfirm, onCancel }: SendConfirmModalProps) {
  const [dontShow, setDontShow] = useState(false);
  const preview = stripHtml(thread.draft).slice(0, 180);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[13px] font-semibold text-[#1c1c1c]">Send Email</h3>
          <button
            onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#a09d98] hover:bg-[#f5f3ef] hover:text-[#1c1c1c] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-3">
          {/* Email details */}
          <div className="rounded-xl bg-[#f5f3ef] p-3.5 space-y-2 text-[12px]">
            <Row label="To" value={thread.customerEmail} />
            <Row label="From" value={service.email} />
            <Row label="Subject" value={thread.draftSubject || thread.subject} />
          </div>

          {/* Attachments */}
          {thread.draftAttachments.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              <Paperclip className="h-3.5 w-3.5 text-[#706e6a]" />
              <span className="text-[12px] text-[#1c1c1c]">
                {thread.draftAttachments.length} attachment{thread.draftAttachments.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[11px] text-[#a09d98]">
                ({formatFileSize(thread.draftAttachments.reduce((sum, a) => sum + a.size, 0))})
              </span>
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#a09d98]">
                Preview
              </p>
              <p className="text-[12px] leading-relaxed text-[#3d3a37] line-clamp-3">
                {preview}
                {stripHtml(thread.draft).length > 180 ? '…' : ''}
              </p>
            </div>
          )}

          {/* Don't show again */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#ccc9c4] text-[#3b5bdb] focus:ring-[#3b5bdb] focus:ring-1"
            />
            <span className="text-[11px] text-[#706e6a]">Don&apos;t show again this session</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-1.5 text-[12px] font-medium text-[#706e6a] transition-colors hover:bg-[#f5f3ef]"
            style={{ borderColor: 'var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(dontShow)}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b5bdb] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#3451c7]"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-14 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#a09d98]">
        {label}
      </span>
      <span className="flex-1 text-[#1c1c1c] truncate">{value}</span>
    </div>
  );
}
