"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { createMentionSuggestion, type MentionItem } from "./mentionSuggestion";

type EmojiPickerProps = {
  data: unknown;
  onEmojiSelect: (emoji: { native: string }) => void;
  locale?: string;
  theme?: string;
  previewPosition?: string;
  skinTonePosition?: string;
};

const EmojiPicker = dynamic<EmojiPickerProps>(
  () => import("@emoji-mart/react").then((m) => m.default ?? m),
  { ssr: false }
);

const btnClass = (active?: boolean) =>
  `px-2 py-1 rounded text-xs font-semibold transition-colors ${
    active
      ? "bg-dark-slate text-white"
      : "text-dark-slate/60 hover:text-dark-slate hover:bg-dark-slate/10"
  }`;

// Compact composer (chat) uses round ghost icon buttons instead of the full
// toolbar's rectangular text buttons — same size/shape as AttachmentPicker's
// and MessageComposer's send button, so the whole input reads as one set of
// controls rather than a mix of emoji glyphs and differently-shaped buttons.
export const pillIconBtnClass = (active?: boolean) =>
  `w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${
    active ? "bg-dark-slate text-white" : "text-dark-slate/50 hover:text-seagrass hover:bg-dry-sage/20"
  }`;

function Btn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} title={title} className={btnClass(active)}>
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-muted-teal/30 mx-0.5 self-center" />;
}

export default function RichTextEditor({
  content,
  onChange,
  compact,
  mentionables,
  collapsibleToolbar,
  onSubmit,
  trailingControls,
}: {
  content: string;
  onChange: (html: string) => void;
  compact?: boolean;
  mentionables?: MentionItem[];
  collapsibleToolbar?: boolean;
  onSubmit?: () => void;
  // Extra controls (attach, send, …) rendered inside the same bordered pill
  // as the compact composer's own buttons — see MessageComposer, the only
  // caller that uses collapsibleToolbar — so they read as one control group
  // instead of a separate row of differently-styled buttons outside the box.
  trailingControls?: React.ReactNode;
}) {
  const t = useTranslations("RichTextEditor");
  const locale = useLocale();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showToolbar, setShowToolbar] = useState(!collapsibleToolbar);
  const emojiRef = useRef<HTMLDivElement>(null);
  const mentionablesRef = useRef(mentionables);
  mentionablesRef.current = mentionables;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (!showEmoji) return;
    function handleClick(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmoji]);

  const extensions = useMemo(() => {
    const base = [
      StarterKit,
      TiptapImage.configure({ inline: false, allowBase64: false }),
      TiptapLink.configure({ openOnClick: false }),
    ];
    if (!mentionables) return base;
    return [
      ...base,
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: createMentionSuggestion((query) =>
          (mentionablesRef.current ?? []).filter((m) =>
            (m.name ?? "").toLowerCase().includes(query.toLowerCase())
          )
        ),
      }),
    ];
    // mentionables presence (not contents) decides whether the extension is
    // wired up at all; the live list is read via mentionablesRef instead so
    // it doesn't force the editor to be recreated when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!mentionables]);

  const isPillMode = !!collapsibleToolbar && !showToolbar;

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          `prose max-w-none focus:outline-none ${
            isPillMode ? "min-h-[20px] py-0.5 px-0" : compact ? "min-h-[44px] p-2" : "min-h-[240px] p-4"
          } ` +
          "prose-headings:text-dark-slate prose-headings:font-semibold " +
          "prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline " +
          "prose-strong:text-dark-slate prose-img:rounded-xl prose-img:max-w-full",
      },
      handleKeyDown: (_view, event) => {
        if (!onSubmitRef.current) return false;
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onSubmitRef.current();
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    // Only external content changes (e.g. switching which record is being
    // edited) should force a resync — comparing against the editor's own
    // current HTML avoids clobbering cursor position on every keystroke,
    // since after typing `content` (set via onChange) already matches it.
    if (content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const uploadImage = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("visibility", "public");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      if (data.url && editor) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className={`border border-muted-teal rounded-md bg-gray-50 animate-pulse ${compact ? "min-h-[100px]" : "min-h-[300px]"}`} />
    );
  }

  function renderEmojiButton(buttonClassName: string, icon: React.ReactNode) {
    return (
      <div ref={emojiRef} className="relative">
        <button type="button" onClick={() => setShowEmoji((v) => !v)} title={t("insertEmoji")} className={buttonClassName}>
          {icon}
        </button>
        {showEmoji && (
          <div
            className={`absolute right-0 z-50 shadow-xl rounded-xl overflow-hidden ${
              isPillMode ? "bottom-full mb-1" : "top-full mt-1"
            }`}
          >
            <EmojiPicker
              data={async () => {
                const res = await import("@emoji-mart/data");
                return res.default;
              }}
              onEmojiSelect={(emoji: { native: string }) => {
                editor.chain().focus().insertContent(emoji.native).run();
                setShowEmoji(false);
              }}
              locale={locale}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        )}
      </div>
    );
  }

  const emojiIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[18px] h-[18px]">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
      />
    </svg>
  );

  const emojiPicker = renderEmojiButton(btnClass(showEmoji), "😊");

  const imageUpload = (
    <label className={btnClass()} title={t("uploadImage")}>
      🖼
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadImage(file);
          e.target.value = "";
        }}
      />
    </label>
  );

  if (isPillMode) {
    return (
      <div className="flex items-center gap-0.5 rounded-full border border-gray-300 bg-white pl-3 pr-1 py-1 focus-within:border-seagrass focus-within:ring-1 focus-within:ring-seagrass/30 transition-all">
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button type="button" onClick={() => setShowToolbar(true)} title={t("formatText")} className={pillIconBtnClass()}>
            <span className="text-[13px] font-bold">Aa</span>
          </button>
          {renderEmojiButton(pillIconBtnClass(showEmoji), emojiIcon)}
          {trailingControls}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-muted-teal rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-muted-teal/30">
        {collapsibleToolbar && (
          <>
            <Btn onClick={() => setShowToolbar(false)} active title={t("hideFormatting")}>
              Aa
            </Btn>
            <Divider />
          </>
        )}

        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title={t("bold")}>
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title={t("italic")}>
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title={t("strikethrough")}>
          <s>S</s>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title={t("inlineCode")}>
          {"<>"}
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title={t("heading1")}>H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title={t("heading2")}>H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title={t("heading3")}>H3</Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title={t("bulletList")}>{t("bulletListShort")}</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title={t("orderedList")}>{t("orderedListShort")}</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title={t("quote")}>{t("quoteShort")}</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title={t("codeBlock")}>{"</>"}</Btn>

        <Divider />

        <Btn
          onClick={() => {
            const prev = editor.isActive("link") ? editor.getAttributes("link").href : "";
            const url = window.prompt(t("linkUrlPrompt"), prev);
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title={t("linkTooltip")}
        >
          {t("linkShort")}
        </Btn>

        <Btn onClick={() => editor.chain().focus().undo().run()} title={t("undo")}>{t("undoShort")}</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title={t("redo")}>{t("redoShort")}</Btn>

        <Divider />

        {imageUpload}

        <Divider />

        {emojiPicker}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
