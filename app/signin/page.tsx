import { redirect } from "next/navigation";
import { SignInButton } from "@/components/sign-in-button";
import { BrandMark } from "@/components/brand-mark";
import { readPortalSession } from "@/lib/session";

export default async function SignInPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await readPortalSession();
  const resolvedSearchParams = searchParams ? await searchParams : {};

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="absolute inset-0 bg-grid bg-[size:24px_24px] opacity-15" />
      <div className="absolute left-[-10rem] top-[-10rem] h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="absolute bottom-[-12rem] right-[-8rem] h-96 w-96 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <div className="text-lg font-semibold text-white">Optlink Access Portal</div>
            <div className="text-sm text-slate-400">Enterprise application launcher</div>
          </div>
        </div>

        <div className="mt-10 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Sign in</h1>
          <p className="text-sm leading-6 text-slate-400">Use your Keycloak account to continue.</p>
        </div>

        <div className="mt-8">
          <SignInButton />
        </div>

        {resolvedSearchParams.error ? (
          <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
            登录失败：{String(resolvedSearchParams.error)}
          </div>
        ) : null}
      </div>
    </main>
  );
}
