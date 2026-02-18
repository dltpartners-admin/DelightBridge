'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import type { Service } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';

interface SidebarProps {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  onOpenSettings: () => void;
}

export function Sidebar({ services, selectedServiceId, onSelectService, onOpenSettings }: SidebarProps) {
  return (
    <div
      className="flex h-screen w-[60px] flex-shrink-0 flex-col items-center py-3 gap-1"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      {/* Logo */}
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[#3b5bdb]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 text-white"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      <div className="w-full px-2">
        <div className="h-px bg-[#d0cdc8]" />
      </div>

      {/* Service icons */}
      <div className="mt-1 flex flex-col items-center gap-3 w-full px-2">
        {services.map((service) => (
          <ServiceIcon
            key={service.id}
            service={service}
            isSelected={service.id === selectedServiceId}
            onClick={() => onSelectService(service.id)}
          />
        ))}
      </div>

      {/* Add service */}
      <TooltipButton label="Add service">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#a09d98] hover:bg-[#d9d6d0] hover:text-[#1c1c1c] transition-colors"
          onClick={() => alert('Settings: Add new service (coming soon)')}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </TooltipButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <TooltipButton label="Settings" side="top">
        <button
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#a09d98] hover:bg-[#d9d6d0] hover:text-[#1c1c1c] transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </TooltipButton>
    </div>
  );
}

// ── Service icon with badge ──────────────────────────────────────────────────
function ServiceIcon({
  service,
  isSelected,
  onClick,
}: {
  service: Service;
  isSelected: boolean;
  onClick: () => void;
}) {
  const unread = service.unreadCount;

  return (
    <TooltipButton label={service.name}>
      <button
        onClick={onClick}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold transition-all',
          isSelected
            ? 'ring-2 ring-offset-1 ring-offset-[#e5e2dc] scale-105 shadow-md'
            : 'hover:scale-105 hover:shadow-sm opacity-80 hover:opacity-100'
        )}
        style={{ backgroundColor: service.color }}
      >
        {getInitials(service.name)}

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#e55353] text-[9px] font-bold text-white px-0.5 ring-2 ring-[#e5e2dc]">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </TooltipButton>
  );
}

// ── Tooltip wrapper ──────────────────────────────────────────────────────────
function TooltipButton({
  children,
  label,
  side = 'right',
}: {
  children: React.ReactNode;
  label: string;
  side?: 'right' | 'top';
}) {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[#1c1c1c] px-2 py-1 text-[11px] font-medium text-white shadow-lg',
            side === 'right'
              ? 'left-full ml-2 top-1/2 -translate-y-1/2'
              : 'bottom-full mb-2 left-1/2 -translate-x-1/2'
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}
