import { redirect } from "next/navigation";

interface PageProps { params: Promise<{ slug: string }> }

// /blog/tr/[slug] → canonical TR post is /blog/[slug]
export default async function TrBlogPostRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/blog/${slug}`);
}
