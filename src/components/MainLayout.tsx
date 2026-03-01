'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import type { EmailThread, FilterType, Service } from '@/lib/types';
import { Sidebar } from './Sidebar';
import { MailList } from './MailList';
import { MailDetail } from './MailDetail';
import { SendConfirmModal } from './SendConfirmModal';
import { BulkSendModal } from './BulkSendModal';
import { SettingsModal } from './SettingsModal';

export function MainLayout() {
  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('inbox');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [talkingFor, setTalkingFor] = useState<string | null>(null);
  const [translatingFor, setTranslatingFor] = useState<string | null>(null);
  const [translatingMessageIds, setTranslatingMessageIds] = useState<Set<string>>(new Set());
  const [sendModal, setSendModal] = useState<{ open: boolean; threadId: string | null }>({
    open: false,
    threadId: null,
  });
  const [bulkSendModal, setBulkSendModal] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const dontShowSendConfirmRef = useRef(false);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const reason = params.get('reason');

    if (oauth === 'connected') {
      setOauthNotice({ type: 'success', text: 'Google 계정 연결이 완료되었습니다.' });
    }

    if (oauth === 'error') {
      const reasonMessage: Record<string, string> = {
        connected_email_mismatch: '선택한 Google 계정 이메일이 서비스 이메일과 다릅니다.',
        state_mismatch: '연결 세션이 만료되었거나 유효하지 않습니다. 다시 시도해 주세요.',
        missing_refresh_token: 'Google에서 refresh token을 받지 못했습니다. 다시 연결해 주세요.',
      };
      setOauthNotice({
        type: 'error',
        text: reasonMessage[reason ?? ''] ?? 'Google 계정 연결에 실패했습니다.',
      });
    }

    if (oauth) {
      params.delete('oauth');
      params.delete('reason');
      const search = params.toString();
      const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

  useEffect(() => {
    fetch('/api/services')
      .then((r) => r.json())
      .then((data: Service[]) => {
        setServices(data);
        if (data.length > 0) setSelectedServiceId(data[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;
    fetch(`/api/threads?serviceId=${selectedServiceId}`)
      .then((r) => r.json())
      .then((data: EmailThread[]) => setThreads(data));
  }, [selectedServiceId]);

  // ── Resizable detail panel ────────────────────────────────────────────────
  const [detailWidth, setDetailWidth] = useState<number | null>(null);
  const isDragging = useRef(false);

  const getClampedWidth = useCallback((x: number) => {
    const vw = window.innerWidth;
    const minW = Math.round(vw / 3);
    const maxW = Math.round((vw * 2) / 3);
    // detailWidth = total viewport - x position of the divider
    const w = vw - x;
    return Math.max(minW, Math.min(maxW, w));
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        setDetailWidth(getClampedWidth(ev.clientX));
      };
      const onUp = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [getClampedWidth]
  );

  // Clamp on window resize
  useEffect(() => {
    if (detailWidth === null) return;
    const onResize = () => {
      setDetailWidth((prev) => {
        if (prev === null) return null;
        const vw = window.innerWidth;
        const minW = Math.round(vw / 3);
        const maxW = Math.round((vw * 2) / 3);
        return Math.max(minW, Math.min(maxW, prev));
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [detailWidth]);

  // ── Derived ─────────────────────────────────────────────────────
  const currentService = services.find((s) => s.id === selectedServiceId) ?? services[0];
  const currentThread = selectedThreadId
    ? threads.find((t) => t.id === selectedThreadId) ?? null
    : null;

  const filteredThreads = threads
    .filter((t) => {
      if (t.serviceId !== selectedServiceId) return false;
      if (filter !== 'all' && t.status !== filter) return false;
      if (categoryFilter && t.categoryId !== categoryFilter) return false;
      return true;
    })
    .sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateThread = useCallback((threadId: string, patch: Partial<EmailThread>) => {
    setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, ...patch } : t)));
  }, []);

  const generateDraft = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      const service = services.find((s) => s.id === thread.serviceId);
      if (!service) return;

      setGeneratingFor(threadId);
      try {
        const res = await fetch('/api/draft/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: thread.messages,
            document: service.document,
            categories: service.categories,
            signature: service.signature,
          }),
        });
        if (!res.ok) throw new Error('Failed');
        const { draft, categoryId, detectedLanguage } = await res.json();
        updateThread(threadId, {
          draft,
          ...(categoryId ? { categoryId } : {}),
          ...(detectedLanguage ? { detectedLanguage } : {}),
        });
        fetch(`/api/drafts/${threadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draft }),
        });
        if (categoryId) {
          fetch(`/api/threads/${threadId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryId, ...(detectedLanguage ? { detectedLanguage } : {}) }),
          });
        }
      } catch (err) {
        console.error('Draft generation failed:', err);
      } finally {
        setGeneratingFor(null);
      }
    },
    [threads, services, updateThread]
  );

  const talkToDraft = useCallback(
    async (threadId: string, instruction: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      setTalkingFor(threadId);
      try {
        const res = await fetch('/api/draft/talk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draft: thread.draft,
            instruction,
            messages: thread.messages,
          }),
        });
        if (!res.ok) throw new Error('Failed');
        const { draft } = await res.json();
        updateThread(threadId, { draft });
        fetch(`/api/drafts/${threadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: draft }),
        });
      } catch (err) {
        console.error('Talk to draft failed:', err);
      } finally {
        setTalkingFor(null);
      }
    },
    [threads, updateThread]
  );

  const translateDraft = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread || !thread.draft) return;
      setTranslatingFor(threadId);
      try {
        const res = await fetch('/api/draft/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: thread.draft }),
        });
        if (!res.ok) throw new Error('Failed');
        const { translation } = await res.json();
        updateThread(threadId, { translation });
        fetch(`/api/drafts/${threadId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ translation }),
        });
      } catch (err) {
        console.error('Translate failed:', err);
      } finally {
        setTranslatingFor(null);
      }
    },
    [threads, updateThread]
  );

  const ensureMessageTranslation = useCallback(
    async (threadId: string, messageId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      const msg = thread.messages.find((m) => m.id === messageId);
      if (!msg || msg.translation) return;
      setTranslatingMessageIds((prev) => new Set(prev).add(messageId));
      try {
        const res = await fetch('/api/message/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: msg.body }),
        });
        if (!res.ok) throw new Error('Failed');
        const { translation } = await res.json();
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  messages: t.messages.map((m) =>
                    m.id === messageId ? { ...m, translation } : m
                  ),
                }
              : t
          )
        );
      } catch (err) {
        console.error('Message translate failed:', err);
      } finally {
        setTranslatingMessageIds((prev) => {
          const next = new Set(prev);
          next.delete(messageId);
          return next;
        });
      }
    },
    [threads]
  );

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSelectService = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      setSelectedThreadId(null);
      setCheckedIds(new Set());
      setCategoryFilter(null);
      setFilter('inbox');
    },
    []
  );

  const handleLogout = useCallback(() => {
    void signOut({ callbackUrl: '/login' });
  }, []);

  const handleSelectThread = useCallback(
    async (threadId: string) => {
      setSelectedThreadId(threadId);
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      if (!thread.isRead) {
        updateThread(threadId, { isRead: true });
        fetch(`/api/threads/${threadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
      }
      if (!thread.draft && thread.status === 'inbox') {
        await generateDraft(threadId);
      }
    },
    [threads, updateThread, generateDraft]
  );

  const handleToggleCheck = useCallback((threadId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) next.delete(threadId);
      else next.add(threadId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (checkedIds.size === filteredThreads.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredThreads.map((t) => t.id)));
    }
  }, [checkedIds.size, filteredThreads]);

  const handleSaveDraft = useCallback(
    (threadId: string, content: string) => {
      updateThread(threadId, { draft: content });
      const thread = threads.find((t) => t.id === threadId);
      fetch(`/api/drafts/${threadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, subject: thread?.draftSubject }),
      });
    },
    [threads, updateThread]
  );

  const handleAddAttachments = useCallback(
    (threadId: string, files: File[]) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      const newAttachments = files.map((file) => ({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        url: URL.createObjectURL(file),
      }));
      updateThread(threadId, {
        draftAttachments: [...thread.draftAttachments, ...newAttachments],
      });
    },
    [threads, updateThread]
  );

  const handleRemoveAttachment = useCallback(
    (threadId: string, attachmentId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      const removed = thread.draftAttachments.find((a) => a.id === attachmentId);
      if (removed?.url.startsWith('blob:')) URL.revokeObjectURL(removed.url);
      updateThread(threadId, {
        draftAttachments: thread.draftAttachments.filter((a) => a.id !== attachmentId),
      });
    },
    [threads, updateThread]
  );

  const handleSend = useCallback(
    (threadId: string) => {
      if (dontShowSendConfirmRef.current) {
        updateThread(threadId, { status: 'sent' });
        if (selectedThreadId === threadId) setSelectedThreadId(null);
      } else {
        setSendModal({ open: true, threadId });
      }
    },
    [selectedThreadId, updateThread]
  );

  const confirmSend = useCallback(
    (dontShow: boolean) => {
      dontShowSendConfirmRef.current = dontShow;
      if (sendModal.threadId) {
        const tid = sendModal.threadId;
        updateThread(tid, { status: 'sent' });
        if (selectedThreadId === tid) setSelectedThreadId(null);
        fetch(`/api/threads/${tid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        });
        fetch(`/api/drafts/${tid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'sent' }),
        });
      }
      setSendModal({ open: false, threadId: null });
    },
    [sendModal.threadId, selectedThreadId, updateThread]
  );

  const handleBulkSend = useCallback(() => {
    setBulkSendModal(true);
  }, []);

  const confirmBulkSend = useCallback(() => {
    setThreads((prev) =>
      prev.map((t) => (checkedIds.has(t.id) ? { ...t, status: 'sent' as const } : t))
    );
    if (selectedThreadId && checkedIds.has(selectedThreadId)) setSelectedThreadId(null);
    checkedIds.forEach((tid) => {
      fetch(`/api/threads/${tid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
      fetch(`/api/drafts/${tid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sent' }),
      });
    });
    setCheckedIds(new Set());
    setBulkSendModal(false);
  }, [checkedIds, selectedThreadId]);

  const handleArchive = useCallback(
    (ids: Set<string>) => {
      setThreads((prev) =>
        prev.map((t) => (ids.has(t.id) ? { ...t, status: 'archived' as const } : t))
      );
      if (selectedThreadId && ids.has(selectedThreadId)) setSelectedThreadId(null);
      ids.forEach((tid) => {
        fetch(`/api/threads/${tid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived' }),
        });
      });
      setCheckedIds(new Set());
    },
    [selectedThreadId]
  );

  // ── Render ─────────────────────────────────────────────────────
  if (loading || !currentService) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#efede8]">
        <div className="text-sm text-[#a09d98]">Loading…</div>
      </div>
    );
  }

  const sendModalThread = sendModal.threadId
    ? threads.find((t) => t.id === sendModal.threadId) ?? null
    : null;
  const checkedThreads = threads.filter((t) => checkedIds.has(t.id));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#efede8]">
      {oauthNotice && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className="rounded-lg px-4 py-2 text-[12px] font-medium shadow-md"
            style={{
              backgroundColor: oauthNotice.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: oauthNotice.type === 'success' ? '#166534' : '#991b1b',
            }}
          >
            {oauthNotice.text}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        services={services}
        selectedServiceId={selectedServiceId}
        onSelectService={handleSelectService}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mail list */}
      <MailList
        service={currentService}
        threads={filteredThreads}
        allThreads={threads}
        selectedThreadId={selectedThreadId}
        filter={filter}
        categoryFilter={categoryFilter}
        checkedIds={checkedIds}
        onSelectThread={handleSelectThread}
        onToggleCheck={handleToggleCheck}
        onSelectAll={handleSelectAll}
        onFilterChange={setFilter}
        onCategoryFilterChange={setCategoryFilter}
        onBulkSend={handleBulkSend}
        onArchive={handleArchive}
        onDeselect={() => setCheckedIds(new Set())}
      />

      {/* Resize handle */}
      <div className="relative w-0 flex-shrink-0 z-10">
        <div
          onMouseDown={handleDragStart}
          className="absolute top-0 bottom-0 -left-[3px] w-[6px] cursor-col-resize hover:bg-[#3b5bdb]/30 active:bg-[#3b5bdb]/40 transition-colors"
        />
      </div>

      {/* Detail panel */}
      <div
        className="flex min-w-0"
        style={detailWidth !== null ? { width: detailWidth } : { flex: 1 }}
      >
        {currentThread ? (
          <MailDetail
            key={currentThread.id}
            thread={currentThread}
            service={currentService}
            isGenerating={generatingFor === currentThread.id}
            isTalking={talkingFor === currentThread.id}
            isTranslating={translatingFor === currentThread.id}
            onSaveDraft={(content) => handleSaveDraft(currentThread.id, content)}
            onRegenerate={() => generateDraft(currentThread.id)}
            onSend={() => handleSend(currentThread.id)}
            onTalkToDraft={(instruction) => talkToDraft(currentThread.id, instruction)}
            onTranslate={() => translateDraft(currentThread.id)}
            onUpdateTranslation={(t) => updateThread(currentThread.id, { translation: t })}
            onAddAttachments={(files) => handleAddAttachments(currentThread.id, files)}
            onRemoveAttachment={(id) => handleRemoveAttachment(currentThread.id, id)}
            onEnsureMessageTranslation={(msgId) => ensureMessageTranslation(currentThread.id, msgId)}
            translatingMessageIds={translatingMessageIds}
          />
        ) : (
          <EmptyState serviceName={currentService.name} />
        )}
      </div>

      {/* Modals */}
      {sendModal.open && sendModalThread && (
        <SendConfirmModal
          thread={sendModalThread}
          service={currentService}
          onConfirm={confirmSend}
          onCancel={() => setSendModal({ open: false, threadId: null })}
        />
      )}
      {bulkSendModal && (
        <BulkSendModal
          threads={checkedThreads}
          onConfirm={confirmBulkSend}
          onCancel={() => setBulkSendModal(false)}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          services={services}
          onUpdateServices={setServices}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ serviceName }: { serviceName: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efede8]">
          <svg
            className="h-7 w-7 text-[#a09d98]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51-4.661-2.51m0 0-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.981l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#1c1c1c]">Select a conversation</p>
        <p className="mt-1 text-xs text-[#a09d98]">
          Choose a thread from {serviceName} to read and reply
        </p>
      </div>
    </div>
  );
}
