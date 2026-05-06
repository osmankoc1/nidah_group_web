import { redirect } from "next/navigation";

// /en/blog → moved to /blog/en
export default function EnBlogLegacyRedirect() {
  redirect("/blog/en");
}
