'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';

interface TranslationPanelProps {
  translation: string;
  isLoading: boolean;
  onTranslate: () => void;
}

export function TranslationPanel({ translation, isLoading, onTranslate }: TranslationPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex w-full items-center gap-2 px-4 py-2.5">
        <button
          onClick={() => {
            setOpen((prev) => {
              const next = !prev;
              if (next && !translation && !isLoading) {
                onTranslate();
              }
              return next;
            });
          }}
          className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#a09d98]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[#a09d98]" />
          )}
          <span className="text-[11.5px] font-semibold text-[#1c1c1c]">번역 미리보기</span>
          <span className="ml-1 text-[10px] text-[#a09d98]">Korean translation of draft</span>
        </button>
        {/* Refresh btn */}
        <button
          onClick={onTranslate}
          disabled={isLoading}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-[#706e6a] hover:bg-[#f0eee9] hover:text-[#1c1c1c] transition-colors disabled:opacity-40"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {isLoading ? 'Translating…' : 'Refresh'}
        </button>
      </div>

      {/* Content */}
      {open && (
        <div className="px-4 pb-3">
          {translation ? (
            <div
              className="rounded-lg p-3 text-[12px] leading-relaxed text-[#3d3a37]"
              style={{ backgroundColor: '#fef9f3' }}
              dangerouslySetInnerHTML={{ __html: translation }}
            />
          ) : (
            <div className="flex items-center gap-2 py-1">
              <span className="text-[11px] text-[#a09d98]">번역이 없습니다.</span>
              <button
                onClick={onTranslate}
                disabled={isLoading}
                className="text-[11px] font-medium text-[#3b5bdb] hover:underline disabled:opacity-40"
              >
                번역 생성
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
