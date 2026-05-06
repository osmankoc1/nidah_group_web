import { redirect } from "next/navigation";

// /blog/tr → canonical TR list is /blog
export default function TrBlogRedirect() {
  redirect("/blog");
}
