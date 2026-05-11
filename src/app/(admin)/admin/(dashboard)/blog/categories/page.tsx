import { BlogSubNav } from "@/components/admin/BlogSubNav";
import { CategoryManager } from "@/components/admin/CategoryManager";

export const dynamic = "force-dynamic";

export default function BlogCategoriesPage() {
  return (
    <div>
      <BlogSubNav />
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-nidah-dark mb-6">Kategoriler</h1>
        <CategoryManager />
      </div>
    </div>
  );
}
