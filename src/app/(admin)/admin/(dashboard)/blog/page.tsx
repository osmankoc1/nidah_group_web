import Link from "next/link";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Plus, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = db
    ? await db
        .select({
          id:          blogPosts.id,
          title:       blogPosts.title,
          slug:        blogPosts.slug,
          status:      blogPosts.status,
          publishedAt: blogPosts.publishedAt,
          categoryName: blogCategories.name,
          readingTimeMinutes: blogPosts.readingTimeMinutes,
          updatedAt:   blogPosts.updatedAt,
        })
        .from(blogPosts)
        .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
        .orderBy(desc(blogPosts.updatedAt))
    : [];

  const statusBadge = (s: string) => {
    if (s === "published") return <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Yayında</Badge>;
    if (s === "archived")  return <Badge variant="outline" className="text-gray-500">Arşiv</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">Taslak</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Yazıları</h1>
          <p className="text-sm text-gray-500 mt-1">{posts.length} yazı</p>
        </div>
        <Button asChild className="bg-nidah-yellow text-nidah-dark hover:bg-nidah-yellow-dark font-bold">
          <Link href="/admin/blog/new">
            <Plus className="size-4 mr-1" />
            Yeni Yazı
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-white">
          <p className="text-gray-400 mb-4">Henüz blog yazısı yok.</p>
          <Button asChild variant="outline">
            <Link href="/admin/blog/new">İlk Yazıyı Oluştur</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Başlık</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">Kategori</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Tarih</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map(post => (
                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 line-clamp-1">{post.title}</div>
                    <div className="text-xs text-gray-400 font-mono">/blog/{post.slug}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-500 text-xs">{post.categoryName ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">{statusBadge(post.status)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("tr-TR")
                      : new Date(post.updatedAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {post.status === "published" && (
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-700 transition-colors">
                          <Eye className="size-4" />
                        </a>
                      )}
                      <Link href={`/admin/blog/${post.id}/edit`}
                        className="text-gray-400 hover:text-nidah-dark transition-colors">
                        <Edit className="size-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
