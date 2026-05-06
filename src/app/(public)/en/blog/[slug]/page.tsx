import { redirect } from "next/navigation";

interface PageProps { params: Promise<{ slug: string }> }

// /en/blog/[slug] → moved to /blog/en/[slug]
export default async function EnBlogPostLegacyRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/blog/en/${slug}`);
}
