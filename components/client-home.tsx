"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Cloud, ShieldCheck, X } from "lucide-react";
import type { PortalApp } from "@/lib/apps";
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

export function ClientHome({ apps, session }: { apps: PortalApp[]; session: PortalSession }) {
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

  const visibleApps = useMemo(
    () =>
      apps.filter((app) => {
        if (app.id === "aws-sso") return session.user.canAccessAws;
        if (app.id === "aliyun-sso") return session.user.canAccessAliyun;
        if (app.id === "cloudflare") return session.user.canAccessCloudflare;
        return true;
      }),
    [apps, session.user.canAccessAliyun, session.user.canAccessAws, session.user.canAccessCloudflare],
  );

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
                    visibleApps: visibleApps.map((app) => app.id),
                  },
                  null,
                  2,
                )}</pre>
              </div>
            ) : null}
          </div>
        </header>

        <section className="flex-1 py-10">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleApps.map((app) => (
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
        </section>

        <footer className="border-t border-white/10 py-6 text-sm text-slate-500">
          Copyright <a className="text-slate-300 transition hover:text-white" href="https://t.me/dr414" target="_blank" rel="noreferrer">@dr414</a>
        </footer>
      </div>
    </main>
  );
}
