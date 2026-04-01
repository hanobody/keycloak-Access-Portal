export function SignOutButton() {
  return (
    <a
      href="/logout"
      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      退出登录
    </a>
  );
}