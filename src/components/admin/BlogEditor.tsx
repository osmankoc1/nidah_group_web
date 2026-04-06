"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Loader2, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface BlogCategory { id: string; name: string; slug: string }
interface BlogTag      { id: string; name: string; slug: string }
interface PostData {
  id?:                 string;
  title:               string;
  slug:                string;
  content:             string;
  excerpt:             string;
  coverImageUrl:       string;
  metaTitle:           string;
  metaDescription:     string;
  status:              "draft" | "published" | "archived";
  publishedAt:         string;
  authorName:          string;
  categoryId:          string;
  readingTimeMinutes:  number;
  tagIds:              string[];
}

const EMPTY: PostData = {
  title: "", slug: "", content: "", excerpt: "", coverImageUrl: "",
  metaTitle: "", metaDescription: "", status: "draft", publishedAt: "",
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

export default function BlogEditor({ initialData }: { initialData?: Partial<PostData> & { id?: string } }) {
  const router  = useRouter();
  const isEdit  = Boolean(initialData?.id);

  const [form,        setForm]        = useState<PostData>({ ...EMPTY, ...initialData });
  const [preview,     setPreview]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [categories,  setCategories]  = useState<BlogCategory[]>([]);
  const [tags,        setTags]        = useState<BlogTag[]>([]);
  const [newTag,      setNewTag]      = useState("");
  const [newCat,      setNewCat]      = useState("");
  const [slugManual,  setSlugManual]  = useState(isEdit);

  // Load categories + tags
  useEffect(() => {
    fetch("/api/admin/blog/categories").then(r => r.json()).then(j => setCategories(j.data ?? []));
    fetch("/api/admin/blog/tags").then(r => r.json()).then(j => setTags(j.data ?? []));
  }, []);

  // Auto-slug from title
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugManual]);

  // Auto reading time
  useEffect(() => {
    setForm(f => ({ ...f, readingTimeMinutes: estimateReadingTime(f.content) }));
  }, [form.content]);

  const set = useCallback(<K extends keyof PostData>(key: K, value: PostData[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  async function handleSave(status?: "draft" | "published") {
    if (!form.title.trim()) { toast.error("Başlık zorunlu"); return; }
    if (!form.slug.trim())  { toast.error("Slug zorunlu");   return; }

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
    const res  = await fetch("/api/admin/blog/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    const json = await res.json();
    const tag: BlogTag = json.data;
    setTags(t => [...t, tag]);
    setForm(f => ({ ...f, tagIds: [...f.tagIds, tag.id] }));
    setNewTag("");
  }

  async function addCategory() {
    const name = newCat.trim();
    if (!name) return;
    const slug = slugify(name);
    const res  = await fetch("/api/admin/blog/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });
    const json = await res.json();
    const cat: BlogCategory = json.data;
    setCategories(c => [...c, cat]);
    setForm(f => ({ ...f, categoryId: cat.id }));
    setNewCat("");
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
          {form.readingTimeMinutes > 0 && (
            <span className="text-xs text-gray-500">{form.readingTimeMinutes} dk okuma</span>
          )}
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
            Taslak Kaydet
          </Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSave("published")} disabled={saving}>
            Yayınla
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          <Input
            placeholder="Yazı başlığı..."
            value={form.title}
            onChange={e => set("title", e.target.value)}
            className="text-xl font-bold h-12"
          />

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 shrink-0">/blog/</span>
            <Input
              placeholder="slug"
              value={form.slug}
              onChange={e => { setSlugManual(true); set("slug", e.target.value); }}
              className="font-mono text-sm"
            />
          </div>

          {preview ? (
            <div
              className="min-h-[400px] border rounded-lg p-6 prose prose-sm max-w-none bg-white"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(form.content) }}
            />
          ) : (
            <textarea
              className="w-full min-h-[400px] border rounded-lg p-4 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 bg-white"
              placeholder="İçeriği Markdown formatında yazın...

# Başlık 1
## Başlık 2

**Kalın metin** veya *italik*

- Madde 1
- Madde 2

[Link metni](https://ornek.com)"
              value={form.content}
              onChange={e => set("content", e.target.value)}
            />
          )}

          <textarea
            className="w-full h-24 border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 bg-white"
            placeholder="Özet (excerpt) — liste ve sosyal medya paylaşımlarında görünür..."
            value={form.excerpt}
            onChange={e => set("excerpt", e.target.value)}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish settings */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Yayın Ayarları</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Durum</label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value as PostData["status"])}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50"
              >
                <option value="draft">Taslak</option>
                <option value="published">Yayında</option>
                <option value="archived">Arşiv</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Yazar</label>
              <Input value={form.authorName} onChange={e => set("authorName", e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Yayın Tarihi (boş = şimdi)</label>
              <Input type="datetime-local" value={form.publishedAt} onChange={e => set("publishedAt", e.target.value)} className="text-sm" />
            </div>
          </div>

          {/* Category */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">Kategori</h3>
            <select
              value={form.categoryId}
              onChange={e => set("categoryId", e.target.value)}
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
                    onClick={() => set("tagIds", selected ? form.tagIds.filter(id => id !== tag.id) : [...form.tagIds, tag.id])}
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
              onChange={e => set("coverImageUrl", e.target.value)}
              className="text-xs"
            />
            {form.coverImageUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.coverImageUrl} alt="Kapak" className="w-full rounded-md object-cover h-32" />
                <button onClick={() => set("coverImageUrl", "")}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70">
                  <X className="size-3" />
                </button>
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="border rounded-lg p-4 bg-white space-y-3">
            <h3 className="font-semibold text-sm text-gray-800">SEO</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Meta Başlık <span className="text-gray-400">({(form.metaTitle || form.title).length}/60)</span></label>
              <Input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)}
                placeholder={form.title} className="text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Meta Açıklama <span className="text-gray-400">({(form.metaDescription || form.excerpt).length}/160)</span></label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50 h-20"
                value={form.metaDescription}
                onChange={e => set("metaDescription", e.target.value)}
                placeholder={form.excerpt}
              />
            </div>
            {/* Google preview */}
            <div className="bg-gray-50 rounded-md p-3 text-xs">
              <p className="text-blue-600 font-medium truncate">{form.metaTitle || form.title || "Başlık..."}</p>
              <p className="text-green-700 text-[10px]">nidahgroup.com.tr/blog/{form.slug || "slug"}</p>
              <p className="text-gray-600 mt-0.5 line-clamp-2">{form.metaDescription || form.excerpt || "Açıklama..."}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal markdown → HTML (no extra packages needed)
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
    .replace(/^(?!<[h|u|l])/gm, "")
    .replace(/\n/g, "<br/>")
    .replace(/^(.+[^>])$/gm, "<p>$1</p>");
}
