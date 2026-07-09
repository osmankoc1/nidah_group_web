"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Pencil, X, Check, ChevronUp, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TagTrans {
  locale: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  translations: TagTrans[];
}

const TRANS_LOCALES = ["en", "ru", "ar"] as const;
type TransLocale = (typeof TRANS_LOCALES)[number];
const LOCALE_LABEL: Record<TransLocale, string> = { en: "EN", ru: "RU", ar: "AR" };

function slugPreview(name: string) {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function TagManager() {
  const [tags,    setTags]    = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId,  setSavingId]  = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  // Translation panel state
  const [expandedId,        setExpandedId]        = useState<string | null>(null);
  const [activeTransLocale, setActiveTransLocale] = useState<TransLocale>("en");
  const [transInputs, setTransInputs] = useState<Record<string, string>>({}); // key: `${tagId}-${locale}`
  const [transSaving, setTransSaving] = useState<string | null>(null); // key: `${tagId}-${locale}`

  useEffect(() => { load(); }, []);
  useEffect(() => { if (editingId && editRef.current) editRef.current.focus(); }, [editingId]);

  async function load() {
    setLoading(true);
    try {
      const json = await fetch("/api/admin/blog/tags").then(r => r.json()).catch(() => ({}));
      setTags(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/admin/blog/tags", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.warning("Bu isimde bir etiket zaten mevcut");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Oluşturulamadı");
      setTags(ts =>
        [...ts, { ...json.data, postCount: 0, translations: [] }].sort((a, b) => a.name.localeCompare(b.name, "tr"))
      );
      setNewName("");
      toast.success("Etiket oluşturuldu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditValue(tag.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function commitEdit(id: string) {
    const name    = editValue.trim();
    const current = tags.find(t => t.id === id);
    if (!name || current?.name === name) { cancelEdit(); return; }

    setSavingId(id);
    try {
      const res  = await fetch(`/api/admin/blog/tags/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error("Bu ad başka bir etikette kullanılıyor");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Güncellenemedi");
      setTags(ts =>
        ts.map(t => t.id === id ? { ...t, name: json.data.name } : t)
          .sort((a, b) => a.name.localeCompare(b.name, "tr"))
      );
      toast.success(`"${current?.name}" → "${json.data.name}"`);
      cancelEdit();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/admin/blog/tags/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Silinemedi");
      setTags(ts => ts.filter(t => t.id !== deleteTarget.id));
      const n = json.removedFromPosts ?? 0;
      toast.success(n > 0 ? `Etiket silindi (${n} yazıdan kaldırıldı)` : "Etiket silindi");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setDeleting(false);
    }
  }

  // ── Translation panel helpers ──────────────────────────────────────────────

  function toggleExpand(tag: Tag) {
    if (expandedId === tag.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tag.id);
    setActiveTransLocale("en");
    // Pre-fill inputs from existing translations
    const next: Record<string, string> = { ...transInputs };
    for (const locale of TRANS_LOCALES) {
      const key = `${tag.id}-${locale}`;
      if (!next[key]) {
        const existing = tag.translations.find(t => t.locale === locale);
        next[key] = existing?.name ?? "";
      }
    }
    setTransInputs(next);
  }

  function getTransInput(tagId: string, locale: TransLocale): string {
    return transInputs[`${tagId}-${locale}`] ?? "";
  }

  function setTransInput(tagId: string, locale: TransLocale, value: string) {
    const key = `${tagId}-${locale}`;
    setTransInputs(prev => ({ ...prev, [key]: value }));
  }

  function autoFill(tagId: string, locale: TransLocale, trName: string) {
    setTransInput(tagId, locale, trName);
  }

  async function saveTranslation(tag: Tag, locale: TransLocale) {
    const name   = getTransInput(tag.id, locale);
    const key    = `${tag.id}-${locale}`;
    setTransSaving(key);
    try {
      const res = await fetch(`/api/admin/blog/tags/${tag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          translations: [{ locale, name }],
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(json.error ?? "Bu slug başka bir etikette kullanılıyor");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Kaydedilemedi");

      const tName = name.trim();
      setTags(ts => ts.map(t => {
        if (t.id !== tag.id) return t;
        const filtered = t.translations.filter(tr => tr.locale !== locale);
        const updated  = tName
          ? [...filtered, { locale, name: tName, slug: slugPreview(tName) }]
          : filtered;
        return { ...t, translations: updated };
      }));

      toast.success(tName
        ? `${LOCALE_LABEL[locale]} çevirisi kaydedildi`
        : `${LOCALE_LABEL[locale]} çevirisi silindi`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setTransSaving(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const filtered = search
    ? tags.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.includes(search.toLowerCase()))
    : tags;

  const preview = newName.trim() ? slugPreview(newName.trim()) : null;

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-nidah-dark">Yeni Etiket</h2>
        <div className="flex gap-2 items-start">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Etiket adı..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleCreate()}
              disabled={creating}
              className="text-sm"
            />
            {preview && (
              <p className="text-[11px] text-gray-400 font-mono pl-1">slug: {preview}</p>
            )}
          </div>
          <Button onClick={handleCreate} disabled={creating || !newName.trim()} size="sm" className="shrink-0">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4 mr-1" />}
            Ekle
          </Button>
        </div>
      </div>

      {/* Search */}
      {!loading && tags.length > 5 && (
        <Input
          placeholder="Ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm"
        />
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-28" />
                <div className="h-3 bg-gray-100 rounded w-20" />
                <div className="ml-auto h-4 bg-gray-100 rounded w-6" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            {search
              ? `"${search}" aramasıyla eşleşen etiket bulunamadı.`
              : "Henüz etiket oluşturulmadı."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ad (TR)</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Slug</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600">Blog</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Çeviri</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(tag => (
                <>
                  <tr key={tag.id} className="hover:bg-gray-50 group">
                    <td className="px-4 py-2.5">
                      {editingId === tag.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            ref={editRef}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter")  commitEdit(tag.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                            disabled={savingId === tag.id}
                            className="border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50"
                          />
                          {savingId === tag.id ? (
                            <Loader2 className="size-4 animate-spin shrink-0 text-gray-400" />
                          ) : (
                            <>
                              <button
                                onClick={() => commitEdit(tag.id)}
                                className="shrink-0 text-green-500 hover:text-green-600 p-0.5"
                                title="Kaydet"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
                                title="İptal"
                              >
                                <X className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(tag)}
                          className="text-left hover:text-nidah-steel w-full flex items-center gap-1.5 group/name"
                          title="Düzenlemek için tıklayın"
                        >
                          {tag.name}
                          <Pencil className="size-3 opacity-0 group-hover/name:opacity-40 text-gray-400 shrink-0" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-400 hidden sm:table-cell">
                      {tag.slug}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-medium ${tag.postCount > 0 ? "text-nidah-dark" : "text-gray-400"}`}>
                        {tag.postCount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                      <span className={`text-[10px] font-mono ${tag.translations.length > 0 ? "text-nidah-steel" : "text-gray-300"}`}>
                        {tag.translations.map(t => t.locale.toUpperCase()).join(" ")}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleExpand(tag)}
                          className="text-gray-300 hover:text-nidah-steel transition-colors p-1"
                          title="Çevirileri yönet"
                        >
                          {expandedId === tag.id
                            ? <ChevronUp className="size-3.5" />
                            : <Globe className="size-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(tag)}
                          className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                          title="Sil"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Translation panel */}
                  {expandedId === tag.id && (
                    <tr key={`${tag.id}-trans`}>
                      <td colSpan={5} className="bg-gray-50/80 border-t border-dashed border-gray-200 px-4 py-4">
                        <div className="max-w-lg space-y-3">
                          <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                            <Globe className="size-3" /> Çeviriler — EN / RU / AR
                          </p>

                          {/* Locale tabs */}
                          <div className="flex gap-1">
                            {TRANS_LOCALES.map(loc => (
                              <button
                                key={loc}
                                onClick={() => setActiveTransLocale(loc)}
                                className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                                  activeTransLocale === loc
                                    ? "bg-nidah-dark text-white"
                                    : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
                                }`}
                              >
                                {LOCALE_LABEL[loc]}
                              </button>
                            ))}
                          </div>

                          {/* Active locale editor */}
                          {TRANS_LOCALES.map(loc => {
                            if (loc !== activeTransLocale) return null;
                            const inputVal = getTransInput(tag.id, loc);
                            const savKey   = `${tag.id}-${loc}`;
                            const isSaving = transSaving === savKey;
                            const slugPrev = inputVal.trim() ? slugPreview(inputVal.trim()) : null;

                            return (
                              <div key={loc} className="space-y-2">
                                {/* Name */}
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-500 w-14 shrink-0">Ad</label>
                                    <Input
                                      value={inputVal}
                                      onChange={e => setTransInput(tag.id, loc, e.target.value)}
                                      onKeyDown={e => e.key === "Enter" && saveTranslation(tag, loc)}
                                      placeholder={`${LOCALE_LABEL[loc]} adı...`}
                                      disabled={isSaving}
                                      className="text-sm flex-1"
                                    />
                                    <button
                                      onClick={() => autoFill(tag.id, loc, tag.name)}
                                      className="text-[11px] text-nidah-steel hover:text-nidah-dark whitespace-nowrap shrink-0 transition-colors"
                                      title="TR adını kopyala (sonra değiştirebilirsiniz)"
                                    >
                                      TR'den doldur
                                    </button>
                                  </div>
                                  {slugPrev && (
                                    <p className="text-[11px] text-gray-400 font-mono pl-16">slug: {slugPrev}</p>
                                  )}
                                </div>

                                {/* Save */}
                                <div className="flex items-center gap-3 pl-16">
                                  <Button
                                    size="sm"
                                    onClick={() => saveTranslation(tag, loc)}
                                    disabled={isSaving}
                                    className="text-xs"
                                  >
                                    {isSaving && <Loader2 className="size-3 animate-spin mr-1" />}
                                    Kaydet
                                  </Button>
                                  {!inputVal.trim() && tag.translations.find(t => t.locale === loc) && (
                                    <span className="text-[11px] text-amber-500">Ad boş bırakılırsa çeviri silinir</span>
                                  )}
                                  {!inputVal.trim() && !tag.translations.find(t => t.locale === loc) && (
                                    <span className="text-[11px] text-gray-400">Çeviri yok — boş bırakılırsa TR ad gösterilir</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-bold text-nidah-dark">Etiketi Sil</h3>
            <p className="text-sm text-gray-600">
              <strong className="text-nidah-dark">"{deleteTarget.name}"</strong> etiketini silmek
              istiyor musunuz?
              {deleteTarget.postCount > 0 && (
                <>
                  {" "}Bu etiket{" "}
                  <strong className="text-nidah-dark">{deleteTarget.postCount} yazıda</strong>{" "}
                  kullanılıyor. Etiket silinir, yazılar etkilenmez.
                </>
              )}
              {deleteTarget.translations.length > 0 && (
                <>{" "}Buna ait {deleteTarget.translations.length} çeviri de silinecek.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                İptal
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting && <Loader2 className="size-4 animate-spin mr-1" />}
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
