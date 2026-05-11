import { BlogSubNav } from "@/components/admin/BlogSubNav";
import { TagManager } from "@/components/admin/TagManager";

export const dynamic = "force-dynamic";

export default function BlogTagsPage() {
  return (
    <div>
      <BlogSubNav />
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-nidah-dark mb-6">Etiketler</h1>
        <TagManager />
      </div>
    </div>
  );
}
