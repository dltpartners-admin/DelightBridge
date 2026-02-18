'use client';

import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TalkToDraftProps {
  isLoading: boolean;
  onSubmit: (instruction: string) => Promise<void> | void;
}

const QUICK_PROMPTS = [
  'Make it more concise',
  'Make it more formal',
  'More empathetic tone',
  'Add step-by-step instructions',
];

export function TalkToDraft({ isLoading, onSubmit }: TalkToDraftProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    await onSubmit(trimmed);
    setValue('');
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#fafaf9] transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#a09d98]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[#a09d98]" />
        )}
        <span className="text-[11.5px] font-semibold text-[#1c1c1c]">Talk to Draft</span>
        <span className="ml-1 text-[10px] text-[#a09d98]">Ask AI to refine</span>
      </button>

      {/* Content */}
      {open && (
        <div className="px-4 pb-3">
          {/* Quick prompts */}
          <div className="mb-2 flex flex-wrap gap-1">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setValue(prompt);
                  textareaRef.current?.focus();
                }}
                className="rounded-full border px-2.5 py-0.5 text-[10px] font-medium text-[#706e6a] transition-colors hover:bg-[#f5f3ef] hover:text-[#1c1c1c]"
                style={{ borderColor: 'var(--border)' }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input */}
          <div
            className="flex items-end gap-2 rounded-lg border bg-white px-3 py-2 focus-within:ring-1 focus-within:ring-[#3b5bdb] focus-within:border-[#3b5bdb] transition-all"
            style={{ borderColor: 'var(--border)' }}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. Make it shorter and more direct… (⌘↵ to send)"
              rows={2}
              className="flex-1 resize-none bg-transparent text-[12px] text-[#1c1c1c] placeholder:text-[#c0bdb9] focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading}
              className={cn(
                'flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                value.trim() && !isLoading
                  ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
                  : 'bg-[#f0eee9] text-[#c0bdb9] cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                'Apply'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
