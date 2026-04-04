"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Cloud, ShieldCheck, X } from "lucide-react";
import { hasAttributeValue, type UserAttributes } from "@/lib/user-attributes";
import type { PortalApp, PortalTab } from "@/lib/apps";
import { SignOutButton } from "@/components/sign-out-button";
import { BrandMark } from "@/components/brand-mark";
import type { PortalSession } from "@/lib/session";

function AppGlyph({ appId, fallback }: { appId: string; fallback: string }) {
  if (appId === "aws-sso") {
    return <div className="text-[11px] font-semibold tracking-[0.18em] text-orange-200">AWS</div>;
  }
  if (appId === "aliyun-sso") {
    return <div className="text-[11px] font-semibold tracking-[0.18em] text-orange-100">ALI</div>;
  }
  if (appId === "cloudflare") {
    return <Cloud className="h-6 w-6 text-amber-200" />;
  }
  return <span className="text-lg text-white">{fallback}</span>;
}

function TabButton({
  tab,
  active,
  onClick,
  count,
}: {
  tab: PortalTab;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-sky-400/40 bg-sky-400/10 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.15)]"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{tab.name}</div>
          {tab.description ? <div className="mt-1 text-xs leading-5 text-slate-400">{tab.description}</div> : null}
        </div>
        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-xs text-slate-300">{count}</span>
      </div>
    </button>
  );
}

function matchesVisibilityRules(
  normalizedGroups: string[],
  userAttributes: UserAttributes,
  item: {
    groupsAny?: string[];
    groupsAll?: string[];
    requiredAttributesAny?: string[];
  },
) {
  const groupsAny = (item.groupsAny ?? []).map((group) => group.trim().toLowerCase());
  const groupsAll = (item.groupsAll ?? []).map((group) => group.trim().toLowerCase());
  const requiredAttributesAny = item.requiredAttributesAny ?? [];

  const anyMatched = groupsAny.length === 0 || groupsAny.some((group) => normalizedGroups.includes(group));
  const allMatched = groupsAll.length === 0 || groupsAll.every((group) => normalizedGroups.includes(group));
  const attributeMatched =
    requiredAttributesAny.length === 0 || requiredAttributesAny.some((key) => hasAttributeValue(userAttributes, key));

  return attributeMatched || (anyMatched && allMatched);
}

export function ClientHome({
  apps,
  tabs,
  defaultTabId,
  session,
}: {
  apps: PortalApp[];
  tabs: PortalTab[];
  defaultTabId?: string;
  session: PortalSession;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", onPointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  const normalizedGroups = useMemo(
    () => (session.user.groups ?? []).map((group) => group.trim().toLowerCase()),
    [session.user.groups],
  );

  const userAttributes = useMemo(
    () => session.user.attributes ?? {},
    [session.user.attributes],
  );

  const visibleApps = useMemo(() => {
    return apps.filter((app) => {
      if (app.id === "aws-sso") return session.user.canAccessAws;
      if (app.id === "aliyun-sso") return session.user.canAccessAliyun;
      if (app.id === "cloudflare") return session.user.canAccessCloudflare;

      return matchesVisibilityRules(normalizedGroups, userAttributes, app);
    });
  }, [apps, normalizedGroups, session.user.canAccessAliyun, session.user.canAccessAws, session.user.canAccessCloudflare, userAttributes]);

  const normalizedTabs = useMemo(() => {
    const sourceTabs = tabs.length > 0 ? tabs : [{ id: "cloud-infra", name: "云设施" }];

    return sourceTabs
      .map((tab) => ({ ...tab, id: tab.id.trim() }))
      .filter((tab) => matchesVisibilityRules(normalizedGroups, userAttributes, tab));
  }, [normalizedGroups, tabs, userAttributes]);

  const fallbackTabId = normalizedTabs[0]?.id;
  const initialTabId = normalizedTabs.some((tab) => tab.id === defaultTabId) ? defaultTabId : fallbackTabId;
  const [activeTabId, setActiveTabId] = useState(initialTabId);

  useEffect(() => {
    const nextActive = normalizedTabs.some((tab) => tab.id === activeTabId)
      ? activeTabId
      : normalizedTabs.some((tab) => tab.id === defaultTabId)
        ? defaultTabId
        : normalizedTabs[0]?.id;

    if (nextActive && nextActive !== activeTabId) {
      setActiveTabId(nextActive);
    }
  }, [activeTabId, defaultTabId, normalizedTabs]);

  const appsByTab = useMemo(() => {
    const firstTabId = normalizedTabs[0]?.id;
    const map = new Map<string, PortalApp[]>();

    normalizedTabs.forEach((tab) => {
      map.set(tab.id, []);
    });

    visibleApps.forEach((app) => {
      const targetTabId = app.tabId && map.has(app.tabId) ? app.tabId : firstTabId;
      if (!targetTabId) return;
      map.get(targetTabId)?.push(app);
    });

    return map;
  }, [normalizedTabs, visibleApps]);

  const activeApps = activeTabId ? appsByTab.get(activeTabId) ?? [] : visibleApps;
  const activeTab = normalizedTabs.find((tab) => tab.id === activeTabId);

  if (normalizedTabs.length === 0) {
    return (
      <main className="min-h-screen bg-background px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="text-lg font-semibold text-white">Optlink Access Portal</div>
            </div>
            <SignOutButton />
          </header>

          <section className="flex flex-1 items-center justify-center py-10">
            <div className="max-w-xl rounded-[24px] border border-white/10 bg-slate-950/45 p-8 text-center">
              <h1 className="text-2xl font-semibold text-white">暂无可访问项目</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                当前账号已成功登录，但还没有被授予任何项目 TAB 的访问权限。请联系管理员为你分配对应项目组权限。
              </p>
            </div>
          </section>

          <footer className="border-t border-white/10 py-6 text-sm text-slate-500">
            Copyright <a className="text-slate-300 transition hover:text-white" href="https://t.me/dr414" target="_blank" rel="noreferrer">@dr414</a>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div className="text-lg font-semibold text-white">Optlink Access Portal</div>
          </div>

          <div ref={menuRef} className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              <span>{session.user.name ?? session.user.preferredUsername ?? session.user.email}</span>
              <ChevronDown className="h-4 w-4 text-white/70" />
            </button>
            <SignOutButton />

            {open ? (
              <div className="absolute right-0 top-14 z-20 w-[360px] rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-glow backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <ShieldCheck className="h-4 w-4 text-sky-300" />
                    Debug Info
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-6 text-slate-300">{JSON.stringify(
                  {
                    user: session.user,
                    activeTabId,
                    visibleApps: visibleApps.map((app) => ({ id: app.id, tabId: app.tabId })),
                  },
                  null,
                  2,
                )}</pre>
              </div>
            ) : null}
          </div>
        </header>

        <section className="flex-1 py-10">
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-3">
              {normalizedTabs.map((tab) => (
                <TabButton
                  key={tab.id}
                  tab={tab}
                  active={tab.id === activeTabId}
                  onClick={() => setActiveTabId(tab.id)}
                  count={appsByTab.get(tab.id)?.length ?? 0}
                />
              ))}
            </aside>

            <div>
              <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h1 className="text-2xl font-semibold text-white">{activeTab?.name ?? "应用入口"}</h1>
                  {activeTab?.description ? <p className="mt-2 text-sm text-slate-400">{activeTab.description}</p> : null}
                </div>
                <div className="text-sm text-slate-500">共 {activeApps.length} 个入口</div>
              </div>

              {activeApps.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeApps.map((app) => (
                    <Link
                      key={app.id}
                      href={app.href}
                      target={app.external ? "_blank" : undefined}
                      rel={app.external ? "noreferrer" : undefined}
                      className="group rounded-[24px] border border-white/10 bg-slate-950/45 p-6 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                          <AppGlyph appId={app.id} fallback={app.icon} />
                        </div>
                        {app.badge ? <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{app.badge}</span> : null}
                      </div>
                      <div className="mt-5 space-y-2">
                        <h2 className="text-xl font-semibold text-white">{app.name}</h2>
                        <p className="text-sm leading-6 text-slate-400">{app.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/30 p-8 text-sm text-slate-400">
                  当前 TAB 下暂无可显示的应用入口。
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 py-6 text-sm text-slate-500">
          Copyright <a className="text-slate-300 transition hover:text-white" href="https://t.me/dr414" target="_blank" rel="noreferrer">@dr414</a>
        </footer>
      </div>
    </main>
  );
}
