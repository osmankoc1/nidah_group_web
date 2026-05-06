"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Loader2, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOCALES, LOCALE_CONFIG, type Locale, blogListHref, blogPostHref } from "@/lib/blog-locales";
import { FlagIcon } from "@/components/blog/FlagIcon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BlogCategory { id: string; name: string; slug: string }
interface BlogTag      { id: string; name: string; slug: string }

interface LangData {
  title:          string;
  slug:           string;
  content:        string;
  excerpt:        string;
  seoTitle:       string;
  seoDescription: string;
  keywords:       string;
}

interface PostForm {
  id?:                string;
  tr:                 LangData;
  en:                 LangData;
  ru:                 LangData;
  ar:                 LangData;
  coverImageUrl:      string;
  status:             "draft" | "published" | "archived";
  publishedAt:        string;
  authorName:         string;
  categoryId:         string;
  readingTimeMinutes: number;
  tagIds:             string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_LANG: LangData = {
  title: "", slug: "", content: "", excerpt: "",
  seoTitle: "", seoDescription: "", keywords: "",
};

const EMPTY_FORM: PostForm = {
  tr: { ...EMPTY_LANG }, en: { ...EMPTY_LANG },
  ru: { ...EMPTY_LANG }, ar: { ...EMPTY_LANG },
  coverImageUrl: "", status: "draft", publishedAt: "",
  authorName: "NİDAH GROUP", categoryId: "", readingTimeMinutes: 3, tagIds: [],
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul class='list-disc pl-5 my-2'>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^(.+[^>])$/gm, "<p>$1</p>");
}

// ── Per-language editor panel ─────────────────────────────────────────────────

function LangEditor({
  locale,
  data,
  onChange,
  preview,
  slugManual,
  onSlugManual,
}: {
  locale: Locale;
  data: LangData;
  onChange: (key: keyof LangData, value: string) => void;
  preview: boolean;
  slugManual: boolean;
  onSlugManual: () => void;
}) {
  const cfg         = LOCALE_CONFIG[locale];
  const isRTL       = cfg.dir === "rtl";
  const routePrefix = locale === "tr" ? "/blog/" : `/blog/${locale}/`;
  const seoDisplay  = data.seoTitle || data.title || "…";
  const descDisplay = data.seoDescription || data.excerpt || "…";

  return (
    <div className="space-y-4" dir={cfg.dir} lang={cfg.lang}>
      <Input
        placeholder={`${cfg.name} — başlık / title / заголовок / عنوان…`}
        value={data.title}
        onChange={e => onChange("title", e.target.value)}
        className={`text-xl font-bold h-12${isRTL ? " text-right" : ""}`}
        dir={cfg.dir}
      />

      <div className="flex items-center gap-2" dir="ltr">
        <span className="text-sm text-gray-500 shrink-0">{routePrefix}</span>
        <Input
          placeholder="slug"
          value={data.slug}
          onChange={e => { onSlugManual(); onChange("slug", e.target.value); }}
          className="font-mono text-sm"
        />
        {slugManual && (
          <button
            type="button"
            onClick={() => onChange("slug", slugify(data.title))}
            className="text-xs text-nidah-yellow hover:underline shrink-0"
          >
            ↺
          </button>
        )}
      </div>

      {preview ? (
        <div
          className="min-h-[400px] border rounded-lg p-6 prose prose-sm max-w-none bg-white"
          dir={cfg.dir}
          dangerouslySetInnerHTML={{ __html: markdownToHtml(data.content) }}
        />
      ) : (
        <textarea
          className={`w-full min-h-[400px] border rounded-lg p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 bg-white${isRTL ? " text-right" : ""}`}
          placeholder={`Markdown içerik / content / содержание / محتوى…\n\n# ${cfg.name} Heading\n## Subheading`}
          value={data.content}
          onChange={e => onChange("content", e.target.value)}
          dir={cfg.dir}
        />
      )}

      <textarea
        className={`w-full h-24 border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 bg-white${isRTL ? " text-right" : ""}`}
        placeholder="Özet / Excerpt / Краткое описание / مقتطف…"
        value={data.excerpt}
        onChange={e => onChange("excerpt", e.target.value)}
        dir={cfg.dir}
      />

      {/* SEO Panel */}
      <div className="border rounded-lg p-4 bg-white space-y-3">
        <h3 className="font-semibold text-sm text-gray-800">SEO</h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            SEO Başlık / Title <span className="text-gray-400">({seoDisplay.length}/60)</span>
          </label>
          <Input
            value={data.seoTitle}
            onChange={e => onChange("seoTitle", e.target.value)}
            placeholder={data.title}
            className={`text-xs${isRTL ? " text-right" : ""}`}
            dir={cfg.dir}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">
            SEO Açıklama / Description <span className="text-gray-400">({descDisplay.length}/160)</span>
          </label>
          <textarea
            className={`w-full border rounded-md px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 h-20${isRTL ? " text-right" : ""}`}
            value={data.seoDescription}
            onChange={e => onChange("seoDescription", e.target.value)}
            placeholder={data.excerpt}
            dir={cfg.dir}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Keywords</label>
          <Input
            value={data.keywords}
            onChange={e => onChange("keywords", e.target.value)}
            placeholder="spare parts, volvo, hydraulic"
            className="text-xs"
            dir="ltr"
          />
          {locale === "tr" && (
            <p className="text-[10px] text-gray-400 mt-1">
              Virgülle ayrılmış — kaydederken otomatik etiket oluşturulur
            </p>
          )}
        </div>
        {/* Google preview — always LTR */}
        <div className="bg-gray-50 rounded-md p-3 text-xs" dir="ltr">
          <p className="text-blue-600 font-medium truncate">{seoDisplay}</p>
          <p className="text-green-700 text-[10px]">
            nidahgroup.com.tr{routePrefix}{data.slug || "slug"}
          </p>
          <p className="text-gray-600 mt-0.5 line-clamp-2">{descDisplay}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BlogEditor({
  initialData,
}: {
  initialData?: Partial<PostForm> & { id?: string };
}) {
  const router = useRouter();
  const isEdit = Boolean(initialData?.id);

  const [form, setForm] = useState<PostForm>({
    ...EMPTY_FORM,
    ...initialData,
    tr: { ...EMPTY_LANG, ...(initialData?.tr ?? {}) },
    en: { ...EMPTY_LANG, ...(initialData?.en ?? {}) },
    ru: { ...EMPTY_LANG, ...(initialData?.ru ?? {}) },
    ar: { ...EMPTY_LANG, ...(initialData?.ar ?? {}) },
  });

  const [activeLang,   setActiveLang]   = useState<Locale>("tr");
  const [preview,      setPreview]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [categories,   setCategories]   = useState<BlogCategory[]>([]);
  const [tags,         setTags]         = useState<BlogTag[]>([]);
  const [newTag,       setNewTag]       = useState("");
  const [newCat,       setNewCat]       = useState("");

  // Per-locale slug-manual state
  const [slugManual, setSlugManual]   = useState<Record<Locale, boolean>>({
    tr: isEdit,
    en: isEdit && Boolean(initialData?.en?.slug),
    ru: isEdit && Boolean(initialData?.ru?.slug),
    ar: isEdit && Boolean(initialData?.ar?.slug),
  });

  useEffect(() => {
    fetch("/api/admin/blog/categories").then(r => r.json()).then(j => setCategories(j.data ?? []));
    fetch("/api/admin/blog/tags").then(r => r.json()).then(j => setTags(j.data ?? []));
  }, []);

  // Auto-slug from title (per locale)
  useEffect(() => {
    for (const locale of LOCALES) {
      if (!slugManual[locale] && form[locale].title) {
        const computed = slugify(form[locale].title);
        setForm(f => ({ ...f, [locale]: { ...f[locale], slug: computed } }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tr.title, form.en.title, form.ru.title, form.ar.title]);

  // Auto reading time from the longest content
  useEffect(() => {
    const content = [form.tr.content, form.en.content, form.ru.content, form.ar.content]
      .reduce((a, b) => (a.length >= b.length ? a : b), "");
    setForm(f => ({ ...f, readingTimeMinutes: estimateReadingTime(content) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tr.content, form.en.content, form.ru.content, form.ar.content]);

  const setLang = useCallback((locale: Locale, key: keyof LangData, value: string) => {
    setForm(f => ({ ...f, [locale]: { ...f[locale], [key]: value } }));
  }, []);

  const setShared = useCallback(<K extends keyof PostForm>(key: K, value: PostForm[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  async function handleSave(status?: "draft" | "published") {
    if (!form.tr.title.trim()) { toast.error("Türkçe başlık zorunlu"); return; }
    if (!form.tr.slug.trim())  { toast.error("Türkçe slug zorunlu");   return; }

    setSaving(true);
    const payload = { ...form, status: status ?? form.status };
    try {
      const url    = isEdit ? `/api/admin/blog/posts/${initialData!.id}` : "/api/admin/blog/posts";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json   = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kayıt başarısız");
      toast.success(status === "published" ? "Yayınlandı!" : "Taslak kaydedildi");
      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Bu yazıyı silmek istediğinizden emin misiniz?")) return;
    setDeleting(true);
    await fetch(`/api/admin/blog/posts/${initialData!.id}`, { method: "DELETE" });
    toast.success("Yazı silindi");
    router.push("/admin/blog");
    router.refresh();
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const slug = slugify(name);

    // Reuse existing tag if already loaded locally
    const existing = tags.find(t => t.slug === slug);
    if (existing) {
      if (!form.tagIds.includes(existing.id)) {
        setShared("tagIds", [...form.tagIds, existing.id]);
      }
      setNewTag("");
      return;
    }

    try {
      const res  = await fetch("/api/admin/blog/tags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Etiket oluşturulamadı");
      const tag: BlogTag = json.data;
      setTags(t => [...t, tag]);
      setShared("tagIds", [...form.tagIds, tag.id]);
      setNewTag("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Etiket oluşturulamadı");
    }
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const slug = slugify(name);

    // Reuse existing category if already loaded locally
    const existing = categories.find(c => c.slug === slug);
    if (existing) {
      setShared("categoryId", existing.id);
      setNewCat("");
      return;
    }

    try {
      const res  = await fetch("/api/admin/blog/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Kategori oluşturulamadı");
      const cat: BlogCategory = json.data;
      setCategories(c => [...c, cat]);
      setShared("categoryId", cat.id);
      setNewCat("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Kategori oluşturulamadı");
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            form.status === "published" ? "bg-green-100 text-green-700" :
            form.status === "archived"  ? "bg-gray-100 text-gray-600"  :
            "bg-amber-100 text-amber-700"
          }`}>
            {form.status === "published" ? "Yayında" : form.status === "archived" ? "Arşiv" : "Taslak"}
          </span>
          <span className="text-xs text-gray-500">{form.readingTimeMinutes} dk okuma</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPreview(p => !p)}>
            {preview ? <EyeOff className="size-4 mr-1" /> : <Eye className="size-4 mr-1" />}
            {preview ? "Editör" : "Önizleme"}
          </Button>
          {isEdit && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4 mr-1" />}
              Sil
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleSave("draft")} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : <Save className="size-4 mr-1" />}
            Taslak
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave("published")} disabled={saving}>
            Yayınla
          </Button>
        </div>
      </div>

      {/* Language tabs */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {LOCALES.map(locale => {
          const cfg     = LOCALE_CONFIG[locale];
          const hasData = Boolean(form[locale].title);
          return (
            <button
              key={locale}
              onClick={() => setActiveLang(locale)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                activeLang === locale
                  ? "border-nidah-yellow text-nidah-dark"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <FlagIcon locale={locale} className="inline-block w-4 h-3 rounded-[1px] shadow-sm" /> {cfg.label}
              {hasData && <span className="ml-1.5 text-xs text-green-600">✓</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor — locale-specific */}
        <div className="lg:col-span-2">
          <LangEditor
            key={activeLang}
            locale={activeLang}
            data={form[activeLang]}
            onChange={(key, val) => setLang(activeLang, key, val)}
            preview={preview}
            slugManual={slugManual[activeLang]}
            onSlugManual={() => setSlugManual(s => ({ ...s, [activeLang]: true }))}
          />
        </div>

        {/* Shared sidebar */}
        <div className="space-y-4">
          {/* Publish settings */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Yayın Ayarları</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Durum</label>
              <select
                value={form.status}
                onChange={e => setShared("status", e.target.value as PostForm["status"])}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
                <option value="archived">Arşiv</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Yazar</label>
              <Input value={form.authorName} onChange={e => setShared("authorName", e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Yayın Tarihi (boş = şimdi)</label>
              <Input type="datetime-local" value={form.publishedAt} onChange={e => setShared("publishedAt", e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Category */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Kategori</h3>
            <select
              value={form.categoryId}
              onChange={e => setShared("categoryId", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50"
            >
              <option value="">— Kategori seç —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-1">
              <Input placeholder="Yeni kategori..." value={newCat} onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCategory()} className="text-xs h-8" />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={addCategory}><Plus className="size-3" /></Button>
            </div>
          </div>

          {/* Tags */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Etiketler</h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => {
                const selected = form.tagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => setShared("tagIds", selected ? form.tagIds.filter(id => id !== tag.id) : [...form.tagIds, tag.id])}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selected ? "bg-nidah-dark text-white border-nidah-dark" : "bg-white text-gray-600 border-gray-200 hover:border-nidah-dark"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1">
              <Input placeholder="Yeni etiket..." value={newTag} onChange={e => setNewTag(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()} className="text-xs h-8" />
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={addTag}><Plus className="size-3" /></Button>
            </div>
          </div>

          {/* Cover image */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Kapak Görseli</h3>
            <Input
              placeholder="https://... veya Cloudinary URL"
              value={form.coverImageUrl}
              onChange={e => setShared("coverImageUrl", e.target.value)}
              className="text-xs"
            />
            {form.coverImageUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverImageUrl} alt="Kapak" className="w-full rounded-md object-cover h-32" />
                <button onClick={() => setShared("coverImageUrl", "")}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* Translation status summary */}
          <div className="border rounded-lg p-4 bg-gray-50 space-y-2 text-xs text-gray-600">
            <p className="font-semibold text-gray-700 mb-1">Çeviri Durumu</p>
            {LOCALES.map(locale => {
              const cfg  = LOCALE_CONFIG[locale];
              const lang = form[locale];
              const done = Boolean(lang.title);
              return (
                <div key={locale} className="flex items-start gap-2">
                  <span className={`mt-0.5 size-2 rounded-full shrink-0 ${done ? "bg-green-500" : "bg-gray-300"}`} />
                  <div className="min-w-0">
                    <span className="font-medium"><FlagIcon locale={locale} className="inline-block w-4 h-3 rounded-[1px] shadow-sm" /> {cfg.label}:</span>{" "}
                    <span className="truncate">{lang.title ? lang.title.slice(0, 28) + (lang.title.length > 28 ? "…" : "") : "—"}</span>
                    {lang.slug && <span className="text-gray-400 block font-mono text-[10px]">{blogPostHref(locale, lang.slug)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
