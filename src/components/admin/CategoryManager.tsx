"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Pencil, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

function slugPreview(name: string) {
  return name
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,     setLoading]   = useState(true);
  const [search,      setSearch]    = useState("");
  const [newName,     setNewName]   = useState("");
  const [creating,    setCreating]  = useState(false);

  const [editingId,   setEditingId]  = useState<string | null>(null);
  const [editValue,   setEditValue]  = useState("");
  const [savingId,    setSavingId]   = useState<string | null>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (editingId && editRef.current) editRef.current.focus(); }, [editingId]);

  async function load() {
    setLoading(true);
    try {
      const json = await fetch("/api/admin/blog/categories").then(r => r.json()).catch(() => ({}));
      setCategories(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res  = await fetch("/api/admin/blog/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.warning("Bu isimde bir kategori zaten mevcut");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Oluşturulamadı");
      setCategories(cs =>
        [...cs, { ...json.data, postCount: 0 }].sort((a, b) => a.name.localeCompare(b.name, "tr"))
      );
      setNewName("");
      toast.success("Kategori oluşturuldu");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditValue(cat.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function commitEdit(id: string) {
    const name    = editValue.trim();
    const current = categories.find(c => c.id === id);
    if (!name || current?.name === name) { cancelEdit(); return; }

    setSavingId(id);
    try {
      const res  = await fetch(`/api/admin/blog/categories/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error("Bu ad başka bir kategoride kullanılıyor");
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Güncellenemedi");
      setCategories(cs =>
        cs.map(c => c.id === id ? { ...c, name: json.data.name } : c)
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
      const res  = await fetch(`/api/admin/blog/categories/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.error(json.error ?? "Bu kategori kullanımda");
        setDeleteTarget(null);
        return;
      }
      if (!res.ok) throw new Error(json.error ?? "Silinemedi");
      setCategories(cs => cs.filter(c => c.id !== deleteTarget.id));
      toast.success("Kategori silindi");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = search
    ? categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.includes(search.toLowerCase()))
    : categories;

  const preview = newName.trim() ? slugPreview(newName.trim()) : null;

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-nidah-dark">Yeni Kategori</h2>
        <div className="flex gap-2 items-start">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Kategori adı..."
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

      {/* Search — only shown when list is long enough */}
      {!loading && categories.length > 5 && (
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
                <div className="h-4 bg-gray-100 rounded w-36" />
                <div className="h-3 bg-gray-100 rounded w-24" />
                <div className="ml-auto h-4 bg-gray-100 rounded w-6" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            {search
              ? `"${search}" aramasıyla eşleşen kategori bulunamadı.`
              : "Henüz kategori oluşturulmadı. Yukarıdan ilk kategoriyi ekleyin."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Ad</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Slug</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600">Blog</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(cat => (
                <tr key={cat.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-2.5">
                    {editingId === cat.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={editRef}
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter")  commitEdit(cat.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          disabled={savingId === cat.id}
                          className="border rounded px-2 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-nidah-yellow/50"
                        />
                        {savingId === cat.id ? (
                          <Loader2 className="size-4 animate-spin shrink-0 text-gray-400" />
                        ) : (
                          <>
                            <button
                              onClick={() => commitEdit(cat.id)}
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
                        onClick={() => startEdit(cat)}
                        className="text-left hover:text-nidah-steel w-full flex items-center gap-1.5 group/name"
                        title="Düzenlemek için tıklayın"
                      >
                        {cat.name}
                        <Pencil className="size-3 opacity-0 group-hover/name:opacity-40 text-gray-400 shrink-0" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-400 hidden sm:table-cell">
                    {cat.slug}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium ${cat.postCount > 0 ? "text-nidah-dark" : "text-gray-400"}`}>
                      {cat.postCount}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                      title="Sil"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
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
            {deleteTarget.postCount > 0 ? (
              <>
                <h3 className="font-bold text-nidah-dark">Kategori Silinemez</h3>
                <p className="text-sm text-gray-600">
                  <strong className="text-nidah-dark">"{deleteTarget.name}"</strong> kategorisi{" "}
                  <strong className="text-nidah-dark">{deleteTarget.postCount} blog yazısında</strong>{" "}
                  kullanılıyor. Silmeden önce bu yazıları yeniden kategorize edin.
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                    Tamam
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-nidah-dark">Kategoriyi Sil</h3>
                <p className="text-sm text-gray-600">
                  <strong className="text-nidah-dark">"{deleteTarget.name}"</strong> kategorisini silmek
                  istediğinizden emin misiniz? Bu kategoride hiç blog yazısı yok.
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
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
