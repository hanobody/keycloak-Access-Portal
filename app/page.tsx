import { redirect } from "next/navigation";
import { ClientHome } from "@/components/client-home";
import { loadPortalApps } from "@/lib/apps";
import { readPortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await readPortalSession();

  if (!session?.user) {
    redirect("/signin");
  }

  const apps = loadPortalApps();
  return <ClientHome apps={apps} session={session} />;
}
