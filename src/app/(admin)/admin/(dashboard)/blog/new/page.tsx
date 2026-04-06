import BlogEditor from "@/components/admin/BlogEditor";

export default function NewBlogPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Yeni Blog Yazısı</h1>
      <BlogEditor />
    </div>
  );
}
