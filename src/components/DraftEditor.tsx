'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Bold, Italic, Underline as UnderlineIcon, Strikethrough, LinkIcon, Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import type { EmailThread, Service, Attachment } from '@/lib/types';

interface DraftEditorProps {
  thread: EmailThread;
  service: Service;
  isGenerating: boolean;
  isSending: boolean;
  onSave: (content: string) => void;
  onReplyFromChange: (email: string) => void;
  onRegenerate: () => void;
  onSend: () => void;
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

export function DraftEditor({
  thread,
  service,
  isGenerating,
  isSending,
  onSave,
  onReplyFromChange,
  onRegenerate,
  onSend,
  onAddAttachments,
  onRemoveAttachment,
}: DraftEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
      TiptapImage.configure({ inline: true, allowBase64: true }),
    ],
    content: thread.draft,
    editorProps: {
      attributes: {
        class: 'px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onSave(editor.getHTML());
        setSaveStatus('saved');
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    },
  });

  // Sync draft content when it changes externally (e.g. after regenerate / talk)
  const prevDraftRef = useRef(thread.draft);
  useEffect(() => {
    if (editor && prevDraftRef.current !== thread.draft) {
      prevDraftRef.current = thread.draft;
      editor.commands.setContent(thread.draft);
    }
  }, [thread.draft, editor]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddAttachments(files);
    e.target.value = '';
  };

  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && editor) {
          editor.chain().focus().setImage({ src: reader.result }).run();
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const applyTemplate = () => {
    if (!editor || !selectedTemplateId) return;
    const template = service.templates.find((item) => item.id === selectedTemplateId);
    if (!template) return;
    editor.commands.setContent(template.body);
  };

  const senderOptions = service.senderIdentities.filter((identity) => identity.isEnabled);
  const selectedFrom = (thread.replyFromEmail || service.email).trim().toLowerCase();

  if (isGenerating) {
    return (
      <div className="flex flex-col min-h-[400px]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-3 flex justify-center">
              <Spinner />
            </div>
            <p className="text-[14px] font-medium text-[#1c1c1c]">Generating draft…</p>
            <p className="mt-0.5 text-[13px] text-[#a09d98]">AI is reading the conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* To / Subject */}
      <div
        className="flex-shrink-0 border-b px-4 py-2.5 space-y-1.5"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-[#a09d98] w-12">
            To
          </span>
          <span className="text-[14px] text-[#1c1c1c]">{thread.customerEmail}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-[#a09d98] w-12">
            From
          </span>
          {senderOptions.length <= 1 ? (
            <span className="text-[14px] text-[#1c1c1c]">{selectedFrom}</span>
          ) : (
            <select
              value={selectedFrom}
              onChange={(e) => onReplyFromChange(e.target.value)}
              className="h-8 min-w-[220px] rounded-lg border bg-white px-2.5 text-[12px] text-[#1c1c1c]"
              style={{ borderColor: 'var(--border)' }}
            >
              {senderOptions.map((identity) => (
                <option key={identity.id} value={identity.email}>
                  {identity.displayName ? `${identity.displayName} <${identity.email}>` : identity.email}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-[#a09d98] w-12">
            Re
          </span>
          <span className="text-[14px] text-[#3d3a37] truncate">{thread.draftSubject || thread.subject}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#a09d98] w-12">
            템플릿
          </span>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="h-8 min-w-[220px] rounded-lg border bg-white px-2.5 text-[12px] text-[#1c1c1c]"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">템플릿 선택</option>
            {service.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyTemplate}
            disabled={!selectedTemplateId}
            className="h-8 rounded-lg border px-3 text-[11px] font-medium text-[#706e6a] transition-colors hover:bg-[#f5f3ef] disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: 'var(--border)' }}
          >
            삽입
          </button>
        </div>
      </div>

      {/* Editor content — no separate scroll, flows in parent */}
      <div className="flex-shrink-0">
        <EditorContent editor={editor} />
      </div>

      {/* Toolbar + actions */}
      <div
        className="flex-1 flex flex-col justify-center border-t px-3 py-2"
        style={{ borderColor: 'var(--border)' }}
      >
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 mb-2">
          <ToolbarBtn
            active={editor?.isActive('bold') ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('italic') ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('underline') ?? false}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('strike') ?? false}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-[#e4e1db]" />
          <ToolbarBtn
            active={editor?.isActive('link') ?? false}
            onClick={() => {
              const url = window.prompt('Enter URL:');
              if (url) {
                editor?.chain().focus().toggleLink({ href: url }).run();
              }
            }}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('bulletList') ?? false}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <circle cx="2" cy="4" r="1.2" />
              <rect x="5" y="3.2" width="9" height="1.5" rx="0.75" />
              <circle cx="2" cy="8" r="1.2" />
              <rect x="5" y="7.2" width="9" height="1.5" rx="0.75" />
              <circle cx="2" cy="12" r="1.2" />
              <rect x="5" y="11.2" width="9" height="1.5" rx="0.75" />
            </svg>
          </ToolbarBtn>
          <ToolbarBtn
            active={editor?.isActive('orderedList') ?? false}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <text x="0" y="5" fontSize="5" fontFamily="sans-serif">1.</text>
              <rect x="5" y="3.2" width="9" height="1.5" rx="0.75" />
              <text x="0" y="9" fontSize="5" fontFamily="sans-serif">2.</text>
              <rect x="5" y="7.2" width="9" height="1.5" rx="0.75" />
              <text x="0" y="13" fontSize="5" fontFamily="sans-serif">3.</text>
              <rect x="5" y="11.2" width="9" height="1.5" rx="0.75" />
            </svg>
          </ToolbarBtn>
          <div className="mx-1 h-4 w-px bg-[#e4e1db]" />
          <ToolbarBtn
            active={false}
            onClick={() => imageInputRef.current?.click()}
            title="Attach image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            active={false}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageInsert}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Spacer + save status */}
          <div className="flex-1" />
          <SaveIndicator status={saveStatus} />
        </div>

        {/* Attachment chips */}
        {thread.draftAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {thread.draftAttachments.map((att) => (
              <AttachmentChip key={att.id} attachment={att} onRemove={() => onRemoveAttachment(att.id)} />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium text-[#706e6a] transition-colors hover:bg-[#f5f3ef] hover:text-[#1c1c1c]"
            style={{ borderColor: 'var(--border)' }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Regenerate
          </button>
          <div className="flex-1" />
          <button
            onClick={onSend}
            disabled={isSending}
            className="flex items-center gap-1.5 rounded-lg bg-[#3b5bdb] px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#3451c7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {isSending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function ToolbarBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded transition-colors',
        active
          ? 'bg-[#3b5bdb] text-white'
          : 'text-[#706e6a] hover:bg-[#f0eee9] hover:text-[#1c1c1c]'
      )}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  return (
    <span
      className={cn(
        'text-[10px] transition-opacity',
        status === 'saving' ? 'text-[#a09d98]' : 'text-green-600'
      )}
    >
      {status === 'saving' ? 'Saving…' : '✓ Saved'}
    </span>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  const isImage = attachment.type.startsWith('image/');
  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-[#fafaf9] px-2 py-1 text-[11px]" style={{ borderColor: 'var(--border)' }}>
      {isImage ? <ImageIcon className="h-3 w-3 text-[#706e6a]" /> : <FileText className="h-3 w-3 text-[#706e6a]" />}
      <span className="max-w-[140px] truncate text-[#1c1c1c]">{attachment.name}</span>
      <span className="text-[#a09d98]">{formatFileSize(attachment.size)}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded text-[#a09d98] hover:bg-[#fee2e2] hover:text-[#b91c1c] transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#ddd9d3] border-t-[#3b5bdb]" />
  );
}
