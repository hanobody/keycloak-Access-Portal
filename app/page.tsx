import { redirect } from "next/navigation";
import { ClientHome } from "@/components/client-home";
import { loadPortalApps, loadPortalTabs } from "@/lib/apps";
import { readPortalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await readPortalSession();

  if (!session?.user) {
    redirect("/signin");
  }

  const apps = loadPortalApps();
  const tabsConfig = loadPortalTabs();

  return <ClientHome apps={apps} tabs={tabsConfig.tabs} defaultTabId={tabsConfig.defaultTabId} session={session} />;
}
