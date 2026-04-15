import { getAllPageSettings } from "@/lib/site-settings";
import PagesClient from "./PagesClient";

export const dynamic = "force-dynamic";

export default async function PagesPage() {
  const pages = await getAllPageSettings();
  return <PagesClient initialPages={pages} />;
}
