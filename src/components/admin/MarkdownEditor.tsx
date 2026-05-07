"use client";

import { useRef, useLayoutEffect, useState } from "react";
import {
  Heading1, Heading2, Heading3,
  Bold, Italic,
  List, ListOrdered,
  Quote, Link, Image as ImageIcon,
  Table2, Code, Minus,
  Eye, EyeOff,
} from "lucide-react";

// ── Markdown → HTML renderer ──────────────────────────────────────────────────

function renderMarkdown(md: string): string {
  let h = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks (must come first)
  h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
    `<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm font-mono"><code>${code.trim()}</code></pre>`
  );

  // Tables — detect blocks of pipe-delimited lines
  h = h.replace(/((?:^\|.+\|\n?)+)/gm, (block) => {
    const rows = block.trim().split("\n");
    const isSep = (r: string) => /^\|[\s\-:|]+\|$/.test(r);
    const parse = (r: string) =>
      r.split("|").slice(1, -1).map(c => c.trim());

    const headerRow = rows.find(r => !isSep(r));
    if (!headerRow) return block;
    const dataRows = rows.filter(r => r !== headerRow && !isSep(r));

    const th = parse(headerRow)
      .map(c => `<th class="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold text-left text-sm">${c}</th>`)
      .join("");
    const tds = dataRows.map(r =>
      `<tr>${parse(r).map(c => `<td class="border border-gray-300 px-3 py-2 text-sm">${c}</td>`).join("")}</tr>`
    ).join("");

    return `<div class="overflow-x-auto my-4"><table class="border-collapse w-full"><thead><tr>${th}</tr></thead><tbody>${tds}</tbody></table></div>`;
  });

  // Headings
  h = h.replace(/^### (.+)$/gm, `<h3 class="text-lg font-bold mt-5 mb-2">$1</h3>`);
  h = h.replace(/^## (.+)$/gm,  `<h2 class="text-xl font-bold mt-6 mb-2">$1</h2>`);
  h = h.replace(/^# (.+)$/gm,   `<h1 class="text-2xl font-bold mt-8 mb-3">$1</h1>`);

  // Blockquote
  h = h.replace(/^&gt; (.+)$/gm,
    `<blockquote class="border-l-4 border-nidah-yellow pl-4 italic my-3 text-gray-600">$1</blockquote>`
  );

  // Horizontal rule
  h = h.replace(/^---$/gm, `<hr class="my-6 border-gray-300" />`);

  // Inline: bold, italic, inline code
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\*(.+?)\*/g,     "<em>$1</em>");
  h = h.replace(/`(.+?)`/g,       `<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>`);

  // Images (before links)
  h = h.replace(/!\[(.+?)\]\((.+?)\)/g, (_, alt, url) => {
    const safe = /^(javascript|data):/i.test(url.trim()) ? "#" : url;
    return `<img src="${safe}" alt="${alt}" class="max-w-full rounded-lg my-4 shadow-sm" />`;
  });

  // Links
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, (_, text, url) => {
    const safe = /^(javascript|data):/i.test(url.trim()) ? "#" : url;
    return `<a href="${safe}" class="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Bullet & numbered lists
  h = h.replace(/^- (.+)$/gm,    `<li class="ml-5 list-disc my-0.5">$1</li>`);
  h = h.replace(/^\d+\. (.+)$/gm, `<li class="ml-5 list-decimal my-0.5">$1</li>`);

  // Paragraphs
  h = h
    .split(/\n\n+/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => (block.startsWith("<") ? block : `<p class="my-3 leading-relaxed">${block.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");

  return h;
}

// ── Cursor-aware transformation helpers ──────────────────────────────────────

interface Transform { newValue: string; newStart: number; newEnd: number }

/** Wrap selection (or placeholder) with prefix + suffix */
function wrapInline(v: string, s: number, e: number, prefix: string, suffix: string, placeholder: string): Transform {
  const sel = v.slice(s, e) || placeholder;
  const result = prefix + sel + suffix;
  return {
    newValue: v.slice(0, s) + result + v.slice(e),
    newStart: s + prefix.length,
    newEnd:   s + prefix.length + sel.length,
  };
}

/** Add prefix to every line in the selection (or the current line) */
function prefixLines(v: string, s: number, e: number, prefix: string): Transform {
  const lineStart = v.lastIndexOf("\n", s - 1) + 1;
  const lineEnd   = (() => { const i = v.indexOf("\n", e); return i === -1 ? v.length : i; })();
  const lines     = v.slice(lineStart, lineEnd).split("\n").map(l => prefix + l);
  const middle    = lines.join("\n");
  return {
    newValue: v.slice(0, lineStart) + middle + v.slice(lineEnd),
    newStart: lineStart + prefix.length,
    newEnd:   lineStart + middle.length,
  };
}

/** Insert a multi-line block, ensuring it starts on a fresh line */
function insertBlock(v: string, s: number, e: number, block: string): Transform {
  const before = v.slice(0, s);
  const after  = v.slice(e);
  const nl     = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  const tail   = after.length  > 0 && !after.startsWith("\n") ? "\n" : "";
  const full   = nl + block + tail;
  return {
    newValue: before + full + after,
    newStart: s + nl.length,
    newEnd:   s + nl.length + block.length,
  };
}

// ── Toolbar definition ────────────────────────────────────────────────────────

interface ToolItem {
  icon: React.ReactNode;
  title: string;
  transform: (v: string, s: number, e: number) => Transform;
}

type ToolbarItem = ToolItem | "sep";

const TOOLBAR: ToolbarItem[] = [
  {
    icon: <Heading1 className="size-3.5" />, title: "Başlık 1 (H1)",
    transform: (v, s, e) => prefixLines(v, s, e, "# "),
  },
  {
    icon: <Heading2 className="size-3.5" />, title: "Başlık 2 (H2)",
    transform: (v, s, e) => prefixLines(v, s, e, "## "),
  },
  {
    icon: <Heading3 className="size-3.5" />, title: "Başlık 3 (H3)",
    transform: (v, s, e) => prefixLines(v, s, e, "### "),
  },
  "sep",
  {
    icon: <Bold className="size-3.5" />, title: "Kalın / Bold (**text**)",
    transform: (v, s, e) => wrapInline(v, s, e, "**", "**", "kalın metin"),
  },
  {
    icon: <Italic className="size-3.5" />, title: "İtalik / Italic (*text*)",
    transform: (v, s, e) => wrapInline(v, s, e, "*", "*", "italik metin"),
  },
  "sep",
  {
    icon: <List className="size-3.5" />, title: "Madde listesi (- item)",
    transform: (v, s, e) => prefixLines(v, s, e, "- "),
  },
  {
    icon: <ListOrdered className="size-3.5" />, title: "Numaralı liste (1. item)",
    transform: (v, s, e) => prefixLines(v, s, e, "1. "),
  },
  {
    icon: <Quote className="size-3.5" />, title: "Alıntı / Blockquote (> text)",
    transform: (v, s, e) => prefixLines(v, s, e, "> "),
  },
  "sep",
  {
    icon: <Link className="size-3.5" />, title: "Bağlantı / Link [text](url)",
    transform: (v, s, e) => wrapInline(v, s, e, "[", "](https://)", "bağlantı metni"),
  },
  {
    icon: <ImageIcon className="size-3.5" />, title: "Görsel / Image ![alt](url)",
    transform: (v, s, e) => wrapInline(v, s, e, "![", "](https://)", "görsel açıklaması"),
  },
  "sep",
  {
    icon: <Table2 className="size-3.5" />, title: "Tablo / Table",
    transform: (v, s, e) =>
      insertBlock(v, s, e,
        "| Başlık 1 | Başlık 2 | Başlık 3 |\n" +
        "|----------|----------|----------|\n" +
        "| Hücre 1  | Hücre 2  | Hücre 3  |"
      ),
  },
  {
    icon: <Code className="size-3.5" />, title: "Kod bloğu / Code block",
    transform: (v, s, e) => {
      const sel = v.slice(s, e);
      return insertBlock(v, s, e, sel ? `\`\`\`\n${sel}\n\`\`\`` : "```\nkod buraya\n```");
    },
  },
  {
    icon: <Minus className="size-3.5" />, title: "Yatay çizgi / Horizontal rule (---)",
    transform: (v, s, e) => insertBlock(v, s, e, "---"),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: string;
  onChange: (value: string) => void;
  dir?: "ltr" | "rtl";
  lang?: string;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, dir = "ltr", lang, placeholder }: Props) {
  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const pendingCursor = useRef<{ start: number; end: number } | null>(null);
  const [preview, setPreview] = useState(false);

  // Restore cursor position after React re-renders the controlled textarea
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !pendingCursor.current) return;
    const { start, end } = pendingCursor.current;
    ta.setSelectionRange(start, end);
    ta.focus();
    pendingCursor.current = null;
  });

  function applyTransform(transform: (v: string, s: number, e: number) => Transform) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, newStart, newEnd } = transform(value, ta.selectionStart, ta.selectionEnd);
    onChange(newValue);
    pendingCursor.current = { start: newStart, end: newEnd };
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar — always LTR regardless of content direction */}
      <div
        className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b bg-gray-50"
        dir="ltr"
      >
        {TOOLBAR.map((item, i) =>
          item === "sep" ? (
            <span key={`sep-${i}`} className="w-px h-5 bg-gray-300 mx-0.5 self-center" />
          ) : (
            <button
              key={i}
              type="button"
              title={item.title}
              // onMouseDown + preventDefault keeps textarea focused so selectionStart/End stay valid
              onMouseDown={e => {
                e.preventDefault();
                applyTransform(item.transform);
              }}
              className="flex items-center justify-center w-7 h-7 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-colors"
            >
              {item.icon}
            </button>
          )
        )}

        {/* Preview toggle — right-aligned */}
        <button
          type="button"
          onClick={() => setPreview(p => !p)}
          className="ml-auto flex items-center gap-1 h-7 px-2 rounded text-xs text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap"
        >
          {preview
            ? <><EyeOff className="size-3.5" /> Editör</>
            : <><Eye    className="size-3.5" /> Önizleme</>
          }
        </button>
      </div>

      {/* Content area */}
      {preview ? (
        <div
          className="min-h-[400px] p-6 prose prose-sm max-w-none overflow-auto"
          dir={dir}
          lang={lang}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) || "<p class='text-gray-400 italic'>İçerik yok / No content</p>" }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className={[
            "w-full min-h-[400px] p-4 text-sm font-mono resize-y",
            "focus:outline-none focus:ring-2 focus:ring-inset focus:ring-nidah-yellow/50",
            "bg-white leading-relaxed",
            dir === "rtl" ? "text-right" : "",
          ].join(" ")}
          dir={dir}
          lang={lang}
        />
      )}
    </div>
  );
}
