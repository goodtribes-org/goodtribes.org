"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";
import { useCallback, useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";

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
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);

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

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false, allowBase64: false }),
      TiptapLink.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[240px] p-4 focus:outline-none " +
          "prose-headings:text-dark-slate prose-headings:font-semibold " +
          "prose-a:text-seagrass prose-a:no-underline hover:prose-a:underline " +
          "prose-strong:text-dark-slate prose-img:rounded-xl prose-img:max-w-full",
      },
    },
  });

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
      <div className="border border-muted-teal rounded-md min-h-[300px] bg-gray-50 animate-pulse" />
    );
  }

  return (
    <div className="border border-muted-teal rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="relative flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-muted-teal/30">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Fet (Ctrl+B)">
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Kursiv (Ctrl+I)">
          <em>I</em>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Genomstruken">
          <s>S</s>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Inlinekod">
          {"<>"}
        </Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Rubrik 1">H1</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Rubrik 2">H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Rubrik 3">H3</Btn>

        <Divider />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Punktlista">• Lista</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numrerad lista">1. Lista</Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citat">❝ Citat</Btn>
        <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Kodblock">{"</>"}</Btn>

        <Divider />

        <Btn
          onClick={() => {
            const prev = editor.isActive("link") ? editor.getAttributes("link").href : "";
            const url = window.prompt("Länk-URL:", prev);
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Lägg till/redigera länk"
        >
          🔗 Länk
        </Btn>

        {/* Image upload — label wraps input so mobile browsers open native picker directly */}
        <label
          className={btnClass()}
          title="Ladda upp bild (välj från galleri eller kamera)"
        >
          🖼 Bild
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

        <Divider />

        <Btn onClick={() => editor.chain().focus().undo().run()} title="Ångra (Ctrl+Z)">↩ Ångra</Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} title="Gör om (Ctrl+Y)">↪ Gör om</Btn>

        <Divider />

        {/* Emoji picker */}
        <div ref={emojiRef} className="relative">
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            title="Infoga emoji"
            className={btnClass(showEmoji)}
          >
            😊
          </button>
          {showEmoji && (
            <div className="absolute left-0 top-full mt-1 z-50 shadow-xl rounded-xl overflow-hidden">
              <EmojiPicker
                data={async () => {
                  const res = await import("@emoji-mart/data");
                  return res.default;
                }}
                onEmojiSelect={(emoji: { native: string }) => {
                  editor.chain().focus().insertContent(emoji.native).run();
                  setShowEmoji(false);
                }}
                locale="sv"
                theme="light"
                previewPosition="none"
                skinTonePosition="none"
              />
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
