'use client';

import { useState } from 'react';
import { ChevronDown, Search, Send, Archive, X } from 'lucide-react';
import type { Service, EmailThread, FilterType } from '@/lib/types';
import { cn, formatTime, getInitials, getAvatarColor, stripHtml } from '@/lib/utils';

interface MailListProps {
  service: Service;
  threads: EmailThread[];
  allThreads: EmailThread[];
  loading: boolean;
  searchQuery: string;
  selectedThreadId: string | null;
  filter: FilterType;
  archivedOnly: boolean;
  hasDraftOnly: boolean;
  categoryFilter: string | null;
  checkedIds: Set<string>;
  onSelectThread: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onSelectAll: () => void;
  onFilterChange: (f: FilterType) => void;
  onArchivedOnlyChange: (value: boolean) => void;
  onHasDraftOnlyChange: (value: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onCategoryFilterChange: (cat: string | null) => void;
  onBulkSend: () => void;
  onArchive: (ids: Set<string>) => void;
  onDeselect: () => void;
}

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'Needs Reply', value: 'needsReply' },
  { label: 'Replied', value: 'replied' },
  { label: 'All', value: 'all' },
];

export function MailList({
  service,
  threads,
  loading,
  searchQuery,
  selectedThreadId,
  filter,
  archivedOnly,
  hasDraftOnly,
  categoryFilter,
  checkedIds,
  onSelectThread,
  onToggleCheck,
  onFilterChange,
  onArchivedOnlyChange,
  onHasDraftOnlyChange,
  onSearchQueryChange,
  onCategoryFilterChange,
  onBulkSend,
  onArchive,
  onDeselect,
}: MailListProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const currentCat = categoryFilter
    ? service.categories.find((c) => c.id === categoryFilter)
    : null;

  const anyChecked = checkedIds.size > 0;

  return (
    <div
      className="relative flex h-screen min-w-[280px] flex-1 flex-col border-r"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-panel)' }}
    >
      {/* Header */}
      <div className="flex flex-shrink-0 flex-col gap-2 px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: service.color }}
            />
            <span className="text-[13px] font-semibold text-[#1c1c1c]">{service.name}</span>
          </div>
          <span className="text-xs text-[#a09d98]">{threads.length}</span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a09d98]" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-lg border border-[#ddd9d3] bg-[#fafaf9] pl-8 pr-3 text-[12px] text-[#1c1c1c] placeholder:text-[#a09d98] focus:border-[#b9b5af] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-1.5">
          {/* Status filter */}
          <div className="relative">
            <button
              onClick={() => { setFilterOpen((o) => !o); setCatOpen(false); }}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-[#1c1c1c] hover:bg-[#f5f3ef] transition-colors"
              style={{ borderColor: 'var(--border)' }}
            >
              {FILTER_OPTIONS.find((o) => o.value === filter)?.label}
              <ChevronDown className="h-3 w-3 text-[#a09d98]" />
            </button>
            {filterOpen && (
              <DropdownMenu onClose={() => setFilterOpen(false)}>
                {FILTER_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    label={opt.label}
                    isActive={opt.value === filter}
                    onClick={() => {
                      onFilterChange(opt.value);
                      setFilterOpen(false);
                    }}
                  />
                ))}
              </DropdownMenu>
            )}
          </div>

          {/* Category filter */}
          <div className="relative">
            <button
              onClick={() => { setCatOpen((o) => !o); setFilterOpen(false); }}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-[#f5f3ef]"
              style={{
                borderColor: currentCat ? currentCat.color : 'var(--border)',
                backgroundColor: currentCat ? currentCat.color : 'transparent',
                color: currentCat ? currentCat.textColor : '#706e6a',
              }}
            >
              {currentCat ? currentCat.name : 'Category'}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
            {catOpen && (
              <DropdownMenu onClose={() => setCatOpen(false)}>
                <DropdownItem
                  label="All categories"
                  isActive={!categoryFilter}
                  onClick={() => { onCategoryFilterChange(null); setCatOpen(false); }}
                />
                {service.categories.map((cat) => (
                  <DropdownItem
                    key={cat.id}
                    label={cat.name}
                    isActive={cat.id === categoryFilter}
                    pill={{ color: cat.color, textColor: cat.textColor }}
                    onClick={() => { onCategoryFilterChange(cat.id); setCatOpen(false); }}
                  />
                ))}
              </DropdownMenu>
            )}
          </div>

          <TogglePill
            label="Archived"
            active={archivedOnly}
            onClick={() => onArchivedOnlyChange(!archivedOnly)}
          />

          <TogglePill
            label="Has Draft"
            active={hasDraftOnly}
            onClick={() => onHasDraftOnlyChange(!hasDraftOnly)}
          />
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 px-2 py-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="animate-pulse rounded-lg border border-[#ece9e4] bg-[#fafaf9] px-2.5 py-2.5">
                <div className="mb-1 h-3 w-24 rounded bg-[#e8e5df]" />
                <div className="mb-1 h-3 w-3/4 rounded bg-[#efede8]" />
                <div className="h-2.5 w-2/3 rounded bg-[#f2f0ec]" />
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-xs text-[#a09d98]">No conversations</p>
          </div>
        ) : (
          <ul className="px-1.5 pb-16">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                service={service}
                isSelected={thread.id === selectedThreadId}
                isChecked={checkedIds.has(thread.id)}
                onSelect={() => onSelectThread(thread.id)}
                onToggleCheck={(e) => {
                  e.stopPropagation();
                  onToggleCheck(thread.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Bottom action bar — appears when items are checked */}
      {anyChecked && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t px-3 py-2 bg-white"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[11px] font-medium text-[#706e6a]">
            {checkedIds.size} selected
          </span>
          <div className="flex items-center gap-1">
            <ActionBtn
              icon={<Send className="h-3.5 w-3.5" />}
              label="Send all"
              onClick={onBulkSend}
              variant="primary"
            />
            <ActionBtn
              icon={<Archive className="h-3.5 w-3.5" />}
              label="Archive"
              onClick={() => onArchive(checkedIds)}
            />
            <button
              onClick={onDeselect}
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#a09d98] hover:bg-[#f5f3ef] hover:text-[#1c1c1c] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Thread item ──────────────────────────────────────────────────────────────
function ThreadItem({
  thread,
  service,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
}: {
  thread: EmailThread;
  service: Service;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: (e: React.MouseEvent) => void;
}) {
  const category = service.categories.find((c) => c.id === thread.categoryId);
  const initials = getInitials(thread.customerName);
  const avatarColor = getAvatarColor(thread.customerName);

  return (
    <li
      onClick={onSelect}
      className={cn(
        'group relative cursor-pointer rounded-lg px-2.5 py-2.5 mb-0.5 transition-colors',
        isSelected
          ? 'bg-[#3b5bdb] text-white'
          : 'hover:bg-[#f5f3ef]'
      )}
    >
      <div className="flex gap-2.5">
        {/* Avatar / Checkbox area */}
        <div className="relative flex-shrink-0 h-8 w-8 mt-0.5">
          {/* Avatar (hidden on hover or when checked) */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full text-white text-[11px] font-semibold transition-opacity',
              isChecked ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
            )}
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          {/* Checkbox (visible on hover or when checked) */}
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-opacity',
              isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            onClick={onToggleCheck}
          >
            <div
              className={cn(
                'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors',
                isChecked
                  ? 'bg-[#3b5bdb] border-[#3b5bdb]'
                  : isSelected
                  ? 'border-white/60'
                  : 'border-[#ccc9c4] bg-white hover:border-[#3b5bdb]'
              )}
            >
              {isChecked && (
                <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3">
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="white"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: name + time */}
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <span
              className={cn(
                'truncate text-[12.5px] font-semibold',
                isSelected ? 'text-white' : 'text-[#1c1c1c]'
              )}
            >
              {thread.customerName}
            </span>
            <span
              className={cn(
                'flex-shrink-0 text-[10px] tabular-nums',
                isSelected ? 'text-white/70' : 'text-[#a09d98]'
              )}
            >
              {formatTime(thread.lastMessageAt)}
            </span>
          </div>

          {/* Subject */}
          <div
            className={cn(
              'mb-1 truncate text-[11.5px]',
              isSelected ? 'text-white/90' : 'text-[#3d3a37]'
            )}
          >
            {thread.subject}
          </div>

          {/* Body preview */}
          {(() => {
            const preview = thread.messages.length > 0
                ? stripHtml(thread.messages[thread.messages.length - 1].body)
                : (thread.lastMessagePreview ?? '');
              return preview ? (
                <div
                  className={cn(
                  'mb-1 truncate text-[11px]',
                    isSelected ? 'text-white/60' : 'text-[#a09d98]'
                )}
              >
                {preview}
              </div>
            ) : null;
          })()}

          {/* Preview + tags */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Message count badge */}
            {(thread.messageCount ?? thread.messages.length) > 1 && (
              <span
                className={cn(
                  'rounded px-1 text-[9px] font-medium',
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#f0eee9] text-[#706e6a]'
                )}
              >
                {thread.messageCount ?? thread.messages.length}
              </span>
            )}

            {/* Category tag */}
            {category && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={
                  isSelected
                    ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }
                    : { backgroundColor: category.color, color: category.textColor }
                }
              >
                {category.name}
              </span>
            )}

            {/* Draft indicator */}
            {thread.draft && (
              <span
                className={cn(
                  'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-green-50 text-green-700'
                )}
              >
                ✦ draft
              </span>
            )}
          </div>
        </div>
      </div>

    </li>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function DropdownMenu({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute left-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border bg-white shadow-lg"
        style={{ borderColor: 'var(--border)' }}
      >
        {children}
      </div>
    </>
  );
}

function DropdownItem({
  label,
  isActive,
  pill,
  onClick,
}: {
  label: string;
  isActive: boolean;
  pill?: { color: string; textColor: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors',
        isActive ? 'bg-[#f0edf9] text-[#3b5bdb] font-medium' : 'text-[#1c1c1c] hover:bg-[#f5f3ef]'
      )}
    >
      {pill && (
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: pill.color, color: pill.textColor }}
        >
          {label}
        </span>
      )}
      {!pill && label}
    </button>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'default';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#3b5bdb] text-white hover:bg-[#3451c7]'
          : 'border text-[#706e6a] hover:bg-[#f5f3ef] hover:text-[#1c1c1c]'
      )}
      style={variant !== 'primary' ? { borderColor: 'var(--border)' } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

function TogglePill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md border px-2 py-1 text-[11px] font-medium transition-colors',
        active ? 'border-[#3b5bdb] bg-[#eef2ff] text-[#3b5bdb]' : 'text-[#706e6a] hover:bg-[#f5f3ef]'
      )}
      style={!active ? { borderColor: 'var(--border)' } : undefined}
    >
      {label}
    </button>
  );
}
