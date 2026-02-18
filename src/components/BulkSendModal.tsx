'use client';

import { X, Send } from 'lucide-react';
import type { EmailThread } from '@/lib/types';

interface BulkSendModalProps {
  threads: EmailThread[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function BulkSendModal({ threads, onConfirm, onCancel }: BulkSendModalProps) {
  const withDraft = threads.filter((t) => t.draft);
  const noDraft = threads.filter((t) => !t.draft);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-4 pb-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <h3 className="text-[13px] font-semibold text-[#1c1c1c]">
            Send {threads.length} Email{threads.length !== 1 ? 's' : ''}
          </h3>
          <button
            onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[#a09d98] hover:bg-[#f5f3ef] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Thread list */}
        <div className="px-5 py-4 max-h-60 overflow-y-auto space-y-1">
          {withDraft.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              <span className="flex-1 truncate text-[12px] text-[#1c1c1c]">{t.customerName}</span>
              <span className="text-[11px] text-[#a09d98] truncate max-w-[140px]">{t.subject}</span>
            </div>
          ))}
          {noDraft.length > 0 && (
            <>
              <div className="pt-1 pb-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#e55353]">
                  No draft — will be skipped
                </p>
              </div>
              {noDraft.map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1 opacity-50">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#ccc9c4] flex-shrink-0" />
                  <span className="flex-1 truncate text-[12px] text-[#1c1c1c]">{t.customerName}</span>
                  <span className="text-[11px] text-[#a09d98] truncate max-w-[140px]">{t.subject}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {withDraft.length === 0 && (
          <div className="px-5 pb-3">
            <p className="text-[12px] text-[#e55353]">
              None of the selected threads have a draft. Please generate drafts first.
            </p>
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-2 px-5 pb-4 pt-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onCancel}
            className="rounded-lg border px-4 py-1.5 text-[12px] font-medium text-[#706e6a] transition-colors hover:bg-[#f5f3ef]"
            style={{ borderColor: 'var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={withDraft.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b5bdb] px-4 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#3451c7] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            Send {withDraft.length > 0 ? withDraft.length : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
