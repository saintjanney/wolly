'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

import { PaywallNode, docHasPaywall } from './PaywallNode';
import type { ComposerDoc } from '@/services/blogService';

/**
 * The post composer.
 *
 * Produces TipTap JSON, which is the canonical stored form. It deliberately
 * does NOT render HTML: that happens server-side in services/api, against a
 * closed allowlist, because the blog injects the result with
 * dangerouslySetInnerHTML on an origin shared by every publication. Anything
 * this component produced would be attacker-controlled from the server's point
 * of view, so it is treated as untrusted input there regardless.
 */

export interface PostEditorProps {
  initialDoc?: ComposerDoc | null;
  /** Debounced, for autosave. Not called on first render. */
  onChange?: (doc: ComposerDoc) => void;
  autosaveDelayMs?: number;
  editable?: boolean;
}

export function PostEditor({
  initialDoc,
  onChange,
  autosaveDelayMs = 10_000,
  editable = true,
}: PostEditorProps) {
  const [hasPaywall, setHasPaywall] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<ComposerDoc | null>(null);

  const editor = useEditor({
    editable,
    // Required in Next: the editor must not render during SSR.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Links are configured separately below so autolink and protocol
        // handling are explicit rather than inherited.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Mirrors the server allowlist. The server re-checks regardless; this
        // is a convenience so the author sees a dead link immediately rather
        // than losing it silently at publish.
        protocols: ['http', 'https', 'mailto'],
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Write something worth subscribing to…' }),
      PaywallNode,
    ],
    content: (initialDoc as object) ?? '',
    onUpdate: ({ editor: e }) => {
      const json = e.getJSON() as ComposerDoc;
      latest.current = json;
      setHasPaywall(docHasPaywall(json as { content?: Array<{ type?: string }> }));

      if (!onChange) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (latest.current) onChange(latest.current);
      }, autosaveDelayMs);
    },
  });

  // Flush any pending autosave on unmount so navigating away cannot lose the
  // last few seconds of typing.
  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        if (latest.current && onChange) onChange(latest.current);
      }
    };
  }, [onChange]);

  useEffect(() => {
    if (editor && initialDoc) {
      setHasPaywall(docHasPaywall(initialDoc as { content?: Array<{ type?: string }> }));
    }
  }, [editor, initialDoc]);

  if (!editor) return <div className="min-h-64 animate-pulse rounded-lg bg-gray-100" />;

  return (
    <div className="rounded-lg border border-gray-200">
      <Toolbar editor={editor} hasPaywall={hasPaywall} />
      <EditorContent
        editor={editor}
        className="prose-editor px-4 py-4 min-h-[28rem] focus:outline-none"
      />
    </div>
  );
}

// ── Toolbar ────────────────────────────────────────────────────────────────

function Toolbar({ editor, hasPaywall }: { editor: Editor; hasPaywall: boolean }) {
  const addLink = useCallback(() => {
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-2 py-2">
      <Button editor={editor} action="bold" label="B" title="Bold" className="font-bold" />
      <Button editor={editor} action="italic" label="I" title="Italic" className="italic" />
      <Button editor={editor} action="strike" label="S" title="Strikethrough" className="line-through" />
      <Divider />
      <HeadingButton editor={editor} level={2} />
      <HeadingButton editor={editor} level={3} />
      <Divider />
      <Button editor={editor} action="bulletList" label="• List" title="Bullet list" />
      <Button editor={editor} action="orderedList" label="1. List" title="Numbered list" />
      <Button editor={editor} action="blockquote" label="&ldquo;" title="Quote" />
      <Button editor={editor} action="codeBlock" label="&lt;/&gt;" title="Code block" />
      <Divider />
      <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Add link">
        Link
      </ToolbarButton>
      <ToolbarButton onClick={addImage} title="Insert image by URL">
        Image
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        &mdash;
      </ToolbarButton>

      <div className="ml-auto">
        {hasPaywall ? (
          <ToolbarButton
            onClick={() => editor.chain().focus().removePaywall().run()}
            title="Remove the paywall; the whole post becomes free"
            className="text-amber-700"
          >
            Remove paywall
          </ToolbarButton>
        ) : (
          <ToolbarButton
            onClick={() => editor.chain().focus().setPaywall().run()}
            title="Everything below this line becomes paid-subscribers-only"
            className="text-amber-700"
          >
            Add paywall
          </ToolbarButton>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />;
}

function ToolbarButton({
  onClick,
  active,
  title,
  className = '',
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-sm hover:bg-gray-100 ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-600'
      } ${className}`}
    >
      {children}
    </button>
  );
}

type SimpleAction = 'bold' | 'italic' | 'strike' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock';

function Button({
  editor,
  action,
  label,
  title,
  className,
}: {
  editor: Editor;
  action: SimpleAction;
  label: string;
  title: string;
  className?: string;
}) {
  const run = () => {
    const chain = editor.chain().focus();
    switch (action) {
      case 'bold': chain.toggleBold().run(); break;
      case 'italic': chain.toggleItalic().run(); break;
      case 'strike': chain.toggleStrike().run(); break;
      case 'bulletList': chain.toggleBulletList().run(); break;
      case 'orderedList': chain.toggleOrderedList().run(); break;
      case 'blockquote': chain.toggleBlockquote().run(); break;
      case 'codeBlock': chain.toggleCodeBlock().run(); break;
    }
  };

  return (
    <ToolbarButton onClick={run} active={editor.isActive(action)} title={title} className={className}>
      <span dangerouslySetInnerHTML={{ __html: label }} />
    </ToolbarButton>
  );
}

function HeadingButton({ editor, level }: { editor: Editor; level: 2 | 3 }) {
  return (
    <ToolbarButton
      onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
      active={editor.isActive('heading', { level })}
      title={`Heading ${level}`}
      className="font-semibold"
    >
      H{level}
    </ToolbarButton>
  );
}
