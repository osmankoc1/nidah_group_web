import { redirect } from "next/navigation";

// Visiting /admin bare redirects to the RFQ list
export default function AdminRootPage() {
  redirect("/admin/rfq");
}
