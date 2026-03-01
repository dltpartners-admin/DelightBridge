'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { X, Plus, Trash2, Building2, FileText, Tag, Users, ChevronDown } from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import type { Service, Category, PermissionLevel } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────────
type TabId = 'services' | 'documents' | 'categories' | 'permissions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'services', label: '서비스 관리', icon: <Building2 className="h-4 w-4" /> },
  { id: 'documents', label: '문서 및 서명', icon: <FileText className="h-4 w-4" /> },
  { id: 'categories', label: '카테고리 설정', icon: <Tag className="h-4 w-4" /> },
  { id: 'permissions', label: '권한 관리', icon: <Users className="h-4 w-4" /> },
];

interface Member {
  email: string;
  name: string;
  picture?: string | null;
  permission: PermissionLevel;
  hasLoggedIn: boolean;
  isAdminByEnv: boolean;
}

const PERMISSION_OPTIONS: PermissionLevel[] = ['admin', 'send', 'edit', 'view'];

const PERMISSION_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  admin: { label: 'Admin', desc: '모든 권한 + 설정 변경', color: '#fee2e2' },
  send: { label: 'Send', desc: '조회 + 수정 + 발송', color: '#dbeafe' },
  edit: { label: 'Edit', desc: '조회 + 수정', color: '#fef3c7' },
  view: { label: 'View', desc: '조회만', color: '#f1f5f9' },
};

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#78716c',
];

// ── Main Component ───────────────────────────────────────────────────────────
interface SettingsModalProps {
  services: Service[];
  currentUser: {
    name: string;
    email: string;
    picture: string | null;
    permission: string | null;
  };
  onUpdateServices: (services: Service[]) => void;
  onClose: () => void;
}

export function SettingsModal({ services, currentUser, onUpdateServices, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('services');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(services[0]?.id ?? '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const selectedService = services.find((s) => s.id === selectedServiceId) ?? null;

  const updateService = useCallback(
    (serviceId: string, patch: Partial<Service>) => {
      onUpdateServices(services.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)));
      const body: Record<string, unknown> = {};
      const patchTyped = patch as Partial<Service> & { unreadCount?: number };
      if (patchTyped.name !== undefined) body.name = patchTyped.name;
      if (patchTyped.email !== undefined) body.email = patchTyped.email;
      if (patchTyped.color !== undefined) body.color = patchTyped.color;
      if (patchTyped.signature !== undefined) body.signature = patchTyped.signature;
      if (patchTyped.document !== undefined) body.document = patchTyped.document;
      if (patchTyped.categories !== undefined) body.categories = patchTyped.categories;
      fetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    [services, onUpdateServices]
  );

  const addService = useCallback(async () => {
    const id = `service-${Date.now()}`;
    const newService: Service = {
      id,
      name: 'New Service',
      email: '연결 전',
      color: PRESET_COLORS[services.length % PRESET_COLORS.length],
      categories: [],
      signature: '',
      document: '',
      unreadCount: 0,
    };
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newService.id,
        name: newService.name,
        color: newService.color,
        signature: newService.signature,
        document: newService.document,
      }),
    });
    if (!res.ok) {
      window.alert('서비스 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }

    const created = (await res.json()) as Service;
    const nextServices = [...services, created];
    onUpdateServices(nextServices);
    setSelectedServiceId(created.id);

    window.location.href = `/api/services/${created.id}/connect`;
  }, [services, onUpdateServices]);

  const removeService = useCallback(
    (serviceId: string) => {
      const next = services.filter((s) => s.id !== serviceId);
      onUpdateServices(next);
      if (selectedServiceId === serviceId) {
        setSelectedServiceId(next[0]?.id ?? '');
      }
      fetch(`/api/services/${serviceId}`, { method: 'DELETE' });
    },
    [services, selectedServiceId, onUpdateServices]
  );

  const connectGoogleAccount = useCallback((serviceId: string) => {
    window.location.href = `/api/services/${serviceId}/connect`;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[85vh] w-[900px] max-w-[95vw] overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Left sidebar — tabs */}
        <div className="flex w-[200px] flex-shrink-0 flex-col border-r bg-[#fafaf9]" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-4 py-4">
            <h2 className="text-[14px] font-bold text-[#1c1c1c]">Settings</h2>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors text-left',
                  activeTab === tab.id
                    ? 'bg-white text-[#1c1c1c] shadow-sm'
                    : 'text-[#706e6a] hover:bg-[#f0eee9] hover:text-[#1c1c1c]'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#a09d98]">현재 로그인</p>
            <div className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2">
              {currentUser.picture ? (
                <Image
                  src={currentUser.picture}
                  alt={currentUser.name || currentUser.email}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full border border-[#e7e4df] object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efede8] text-[11px] font-semibold text-[#706e6a]">
                  {getInitials(currentUser.name || currentUser.email || '?')}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-[#1c1c1c]">
                  {currentUser.name || 'Unknown User'}
                </p>
                <p className="truncate text-[11px] text-[#8f8b85]">{currentUser.email || '-'}</p>
                {currentUser.permission && (
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-[#706e6a]">
                    {currentUser.permission}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-[15px] font-semibold text-[#1c1c1c]">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h3>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#a09d98] hover:bg-[#f0eee9] hover:text-[#1c1c1c] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'services' && (
              <ServicesTab
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
                onUpdate={updateService}
                onAdd={addService}
                onConnectGoogle={connectGoogleAccount}
                onRemove={removeService}
              />
            )}
            {activeTab === 'documents' && selectedService && (
              <DocumentsTab
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
                service={selectedService}
                onUpdate={updateService}
              />
            )}
            {activeTab === 'categories' && selectedService && (
              <CategoriesTab
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
                service={selectedService}
                onUpdate={updateService}
              />
            )}
            {activeTab === 'permissions' && (
              <PermissionsTab
                services={services}
                selectedServiceId={selectedServiceId}
                onSelectService={setSelectedServiceId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Service Selector ─────────────────────────────────────────────────────────
function ServiceSelector({
  services,
  selectedServiceId,
  onSelect,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#a09d98]">
        서비스 선택
      </label>
      <select
        value={selectedServiceId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full max-w-[280px] rounded-lg border bg-white px-3 py-2 text-[13px] text-[#1c1c1c] focus:border-[#3b5bdb] focus:outline-none focus:ring-1 focus:ring-[#3b5bdb]"
        style={{ borderColor: 'var(--border)' }}
      >
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.email})
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Tab 1: Services ──────────────────────────────────────────────────────────
function ServicesTab({
  services,
  selectedServiceId,
  onSelectService,
  onUpdate,
  onAdd,
  onConnectGoogle,
  onRemove,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Service>) => void;
  onAdd: () => void;
  onConnectGoogle: (serviceId: string) => void;
  onRemove: (id: string) => void;
}) {
  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-[#a09d98]">서비스(Gmail 계정)를 관리합니다.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-lg border border-[#d0cdc8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1c1c1c] transition-colors hover:bg-[#f5f3ef]"
          >
            <Plus className="h-3.5 w-3.5" />
            서비스 추가 + 연결
          </button>
          <button
            onClick={() => selectedService && onConnectGoogle(selectedService.id)}
            disabled={!selectedService}
            className="flex items-center gap-1.5 rounded-lg border border-[#d0cdc8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#1c1c1c] transition-colors hover:bg-[#f5f3ef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google 계정 연결
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            isSelected={service.id === selectedServiceId}
            onSelect={() => onSelectService(service.id)}
            onUpdate={(patch) => onUpdate(service.id, patch)}
            onRemove={() => onRemove(service.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ServiceCard({
  service,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  service: Service;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (patch: Partial<Service>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(service.name);
  const [color, setColor] = useState(service.color);

  const handleSave = () => {
    onUpdate({ name, color });
    setEditing(false);
  };

  const handleCancel = () => {
    setName(service.name);
    setColor(service.color);
    setEditing(false);
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-4 transition-all cursor-pointer',
        isSelected ? 'border-[#3b5bdb] bg-[#f8f9ff]' : 'hover:border-[#d0cdc8]'
      )}
      style={{ borderColor: isSelected ? undefined : 'var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white text-sm font-bold"
          style={{ backgroundColor: editing ? color : service.color }}
        >
          {getInitials(editing ? name : service.name)}
        </div>

        {editing ? (
          <div className="flex-1 space-y-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="서비스명"
              className="w-full rounded-lg border px-3 py-1.5 text-[13px] text-[#1c1c1c] focus:border-[#3b5bdb] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-[11px] text-[#a09d98]">
              서비스 이메일은 Google 계정 연결 시 자동 설정됩니다.
            </p>
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={(e) => { e.stopPropagation(); setColor(c); }}
                  className={cn(
                    'h-6 w-6 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-1 ring-[#3b5bdb] scale-110' : 'hover:scale-110'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                className="rounded-lg bg-[#3b5bdb] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#3451c7]"
              >
                저장
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                className="rounded-lg border px-3 py-1 text-[11px] font-medium text-[#706e6a] hover:bg-[#f0eee9]"
                style={{ borderColor: 'var(--border)' }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#1c1c1c]">{service.name}</p>
            <p className="text-[12px] text-[#a09d98]">{service.email}</p>
            <p className="mt-1 text-[11px] text-[#706e6a]">
              {service.gmailConnected ? 'Google 연결됨' : 'Google 미연결'}
            </p>
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#706e6a] hover:bg-[#f0eee9] transition-colors"
            >
              수정
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="flex items-center justify-center rounded-lg p-1.5 text-[#a09d98] hover:bg-[#fee2e2] hover:text-[#b91c1c] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: Documents & Signature ─────────────────────────────────────────────
function DocumentsTab({
  services,
  selectedServiceId,
  onSelectService,
  service,
  onUpdate,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  service: Service;
  onUpdate: (id: string, patch: Partial<Service>) => void;
}) {
  const [document, setDocument] = useState(service.document);
  const [signature, setSignature] = useState(service.signature);
  const [saved, setSaved] = useState(false);

  const handleServiceChange = (id: string) => {
    // Save current before switching
    onUpdate(service.id, { document, signature });
    onSelectService(id);
    const next = services.find((s) => s.id === id);
    if (next) {
      setDocument(next.document);
      setSignature(next.signature);
    }
  };

  const handleSave = () => {
    onUpdate(service.id, { document, signature });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <ServiceSelector services={services} selectedServiceId={selectedServiceId} onSelect={handleServiceChange} />

      <div className="space-y-5">
        {/* Reference Document */}
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#1c1c1c]">
            참고 문서 (Markdown)
          </label>
          <p className="mb-2 text-[11px] text-[#a09d98]">
            FAQ, 정책, 가이드 등 AI가 답변 생성 시 참고할 문서입니다.
          </p>
          <textarea
            value={document}
            onChange={(e) => setDocument(e.target.value)}
            rows={14}
            className="w-full rounded-lg border bg-white px-4 py-3 font-mono text-[12px] text-[#1c1c1c] leading-relaxed placeholder:text-[#c0bdb9] focus:border-[#3b5bdb] focus:outline-none focus:ring-1 focus:ring-[#3b5bdb] resize-y"
            style={{ borderColor: 'var(--border)' }}
            placeholder="# 환불 정책&#10;- 결제 후 7일 이내: 전액 환불&#10;- 7일 초과: 환불 불가"
          />
        </div>

        {/* Signature */}
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-[#1c1c1c]">
            서명 (HTML)
          </label>
          <p className="mb-2 text-[11px] text-[#a09d98]">
            초안 생성 시 자동으로 추가되는 서명입니다. HTML 형식으로 입력하세요.
          </p>
          <textarea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            rows={5}
            className="w-full rounded-lg border bg-white px-4 py-3 font-mono text-[12px] text-[#1c1c1c] leading-relaxed placeholder:text-[#c0bdb9] focus:border-[#3b5bdb] focus:outline-none focus:ring-1 focus:ring-[#3b5bdb] resize-y"
            style={{ borderColor: 'var(--border)' }}
            placeholder='<p>Best regards,<br>Name<br><strong>Team Name</strong></p>'
          />

          {/* Signature preview */}
          {signature && (
            <div className="mt-2 rounded-lg border bg-[#fafaf9] px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#a09d98]">미리보기</p>
              <div
                className="text-[13px] text-[#1c1c1c] [&_p]:mb-1 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: signature }}
              />
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#3b5bdb] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#3451c7] transition-colors"
          >
            저장
          </button>
          {saved && <span className="text-[11px] text-green-600">✓ 저장되었습니다</span>}
        </div>
      </div>
    </div>
  );
}

// ── Tab 3: Categories ────────────────────────────────────────────────────────
function CategoriesTab({
  services,
  selectedServiceId,
  onSelectService,
  service,
  onUpdate,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
  service: Service;
  onUpdate: (id: string, patch: Partial<Service>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editTextColor, setEditTextColor] = useState('');

  const handleAdd = () => {
    const id = `cat-${Date.now()}`;
    const newCat: Category = { id, name: 'New Category', color: '#f1f5f9', textColor: '#475569' };
    onUpdate(service.id, { categories: [...service.categories, newCat] });
    setEditingId(id);
    setEditName(newCat.name);
    setEditColor(newCat.color);
    setEditTextColor(newCat.textColor);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditTextColor(cat.textColor);
  };

  const saveEdit = () => {
    onUpdate(service.id, {
      categories: service.categories.map((c) =>
        c.id === editingId ? { ...c, name: editName, color: editColor, textColor: editTextColor } : c
      ),
    });
    setEditingId(null);
  };

  const removeCategory = (catId: string) => {
    onUpdate(service.id, { categories: service.categories.filter((c) => c.id !== catId) });
  };

  const CATEGORY_PRESETS = [
    { bg: '#dbeafe', text: '#1d4ed8' },
    { bg: '#fee2e2', text: '#b91c1c' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#ede9fe', text: '#6d28d9' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#fef9c3', text: '#854d0e' },
    { bg: '#f1f5f9', text: '#475569' },
  ];

  return (
    <div>
      <ServiceSelector services={services} selectedServiceId={selectedServiceId} onSelect={onSelectService} />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-[12px] text-[#a09d98]">
          {service.name}의 카테고리를 관리합니다. AI가 메일 분류 시 이 카테고리를 사용합니다.
        </p>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1.5 rounded-lg bg-[#3b5bdb] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#3451c7] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          추가
        </button>
      </div>

      <div className="space-y-2">
        {service.categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            {editingId === cat.id ? (
              <div className="flex flex-1 flex-col gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full max-w-[200px] rounded-lg border px-3 py-1.5 text-[13px] focus:border-[#3b5bdb] focus:outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  {CATEGORY_PRESETS.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => { setEditColor(preset.bg); setEditTextColor(preset.text); }}
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold transition-all',
                        editColor === preset.bg ? 'ring-2 ring-offset-1 ring-[#3b5bdb] scale-110' : 'hover:scale-110'
                      )}
                      style={{ backgroundColor: preset.bg, color: preset.text }}
                    >
                      A
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="rounded-lg bg-[#3b5bdb] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#3451c7]"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border px-3 py-1 text-[11px] font-medium text-[#706e6a] hover:bg-[#f0eee9]"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span
                  className="rounded-md px-2.5 py-0.5 text-[12px] font-medium"
                  style={{ backgroundColor: cat.color, color: cat.textColor }}
                >
                  {cat.name}
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => startEdit(cat)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#706e6a] hover:bg-[#f0eee9] transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={() => removeCategory(cat.id)}
                  className="flex items-center justify-center rounded-lg p-1.5 text-[#a09d98] hover:bg-[#fee2e2] hover:text-[#b91c1c] transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}

        {service.categories.length === 0 && (
          <p className="py-8 text-center text-[12px] text-[#a09d98]">
            카테고리가 없습니다. 위의 &quot;추가&quot; 버튼으로 새 카테고리를 만들어보세요.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Tab 4: Permissions ───────────────────────────────────────────────────────
function PermissionsTab({
  services,
  selectedServiceId,
  onSelectService,
}: {
  services: Service[];
  selectedServiceId: string;
  onSelectService: (id: string) => void;
}) {
  const service = services.find((s) => s.id === selectedServiceId);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<PermissionLevel>('view');
  const [addingMember, setAddingMember] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to load members');
      const data = (await res.json()) as Member[];
      setMembers(data);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handlePermissionChange = useCallback(async (email: string, permission: PermissionLevel) => {
    await fetch(`/api/members/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission }),
    });
    setMembers((prev) => prev.map((m) => (m.email === email ? { ...m, permission } : m)));
    setOpenDropdown(null);
  }, []);

  const handleAddMember = useCallback(async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    setAddingMember(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, permission: newPermission }),
      });
      if (!res.ok) throw new Error('Failed to add member');

      setNewEmail('');
      setNewPermission('view');
      await loadMembers();
    } finally {
      setAddingMember(false);
    }
  }, [loadMembers, newEmail, newPermission]);

  const handleRemoveMember = useCallback(async (email: string) => {
    await fetch(`/api/members/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
    setMembers((prev) => prev.filter((m) => m.email !== email));
  }, []);

  return (
    <div>
      <ServiceSelector services={services} selectedServiceId={selectedServiceId} onSelect={onSelectService} />

      <p className="mb-4 text-[12px] text-[#a09d98]">
        {service?.name ?? '서비스'}에 대한 팀원별 접근 권한입니다.
      </p>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a09d98]">멤버</p>
        <div className="flex items-center gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-[200px] rounded-lg border px-3 py-1.5 text-[11px] text-[#1c1c1c]"
            style={{ borderColor: 'var(--border)' }}
          />
          <select
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value as PermissionLevel)}
            className="rounded-lg border px-2.5 py-1.5 text-[11px] text-[#1c1c1c]"
            style={{ borderColor: 'var(--border)' }}
          >
            {PERMISSION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {PERMISSION_LABELS[opt].label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void handleAddMember()}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium text-[#706e6a] transition-colors hover:bg-[#f0eee9]"
            style={{ borderColor: 'var(--border)' }}
            disabled={addingMember}
          >
            <Plus className="h-3.5 w-3.5" />
            멤버 추가
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {loadingMembers && (
          <p className="py-4 text-[12px] text-[#a09d98]">멤버 목록 불러오는 중…</p>
        )}

        {members.map((member) => {
          const perm = PERMISSION_LABELS[member.permission];
          const isOpen = openDropdown === member.email;
          return (
            <div
              key={member.email}
              className="flex items-center gap-3 rounded-lg border px-4 py-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#efede8] text-[11px] font-bold text-[#706e6a]">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1c1c1c]">{member.name}</p>
                <p className="text-[11px] text-[#a09d98]">
                  {member.email}
                  {!member.hasLoggedIn && ' · 아직 로그인 안함'}
                </p>
              </div>
              <div className="relative">
                <button
                  onClick={() => {
                    if (member.isAdminByEnv) return;
                    setOpenDropdown(isOpen ? null : member.email);
                  }}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: perm.color }}
                  disabled={member.isAdminByEnv}
                >
                  {perm.label}
                  {!member.isAdminByEnv && (
                    <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
                  )}
                </button>
                {isOpen && (
                  <div className="absolute right-0 top-full mt-1 z-20 w-[180px] rounded-lg border bg-white py-1 shadow-lg" style={{ borderColor: 'var(--border)' }}>
                    {PERMISSION_OPTIONS.map((opt) => {
                      const optLabel = PERMISSION_LABELS[opt];
                      return (
                        <button
                          key={opt}
                          onClick={() => void handlePermissionChange(member.email, opt)}
                          className={cn(
                            'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-[#f5f3ef]',
                            member.permission === opt && 'bg-[#f5f3ef]'
                          )}
                        >
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: optLabel.color }}
                          >
                            {optLabel.label}
                          </span>
                          <span className="text-[11px] text-[#706e6a]">{optLabel.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {!member.isAdminByEnv && (
                <button
                  onClick={() => void handleRemoveMember(member.email)}
                  className="ml-2 flex items-center justify-center rounded-lg p-1.5 text-[#a09d98] transition-colors hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                  title="멤버 제거"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {!loadingMembers && members.length === 0 && (
          <p className="py-4 text-[12px] text-[#a09d98]">등록된 멤버가 없습니다.</p>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-[#fafaf9] px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-2 text-[11px] font-semibold text-[#706e6a]">권한 설명</p>
        <div className="space-y-1 text-[11px] text-[#a09d98]">
          <p>• <strong>View</strong>: 메일 목록 조회만 가능</p>
          <p>• <strong>Edit</strong>: 초안 수정 가능, 발송 불가</p>
          <p>• <strong>Send</strong>: 초안 수정 + 발송 가능</p>
          <p>• <strong>Admin</strong>: 모든 권한 + 설정 변경</p>
        </div>
      </div>
    </div>
  );
}
