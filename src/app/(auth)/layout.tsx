import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.27_0_0_/_0.4)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.27_0_0_/_0.4)_1px,transparent_1px)] bg-[size:48px_48px] opacity-20" />
        <div className="bg-accent/10 absolute top-1/3 left-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]" />
      </div>

      <header className="border-border/40 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              className="text-accent"
            >
              <circle cx="11" cy="11" r="8.5" />
              <path d="M5 11 Q 8 6, 11 11 T 17 11" strokeLinecap="round" />
              <circle cx="5" cy="11" r="1.4" fill="currentColor" />
              <circle cx="11" cy="11" r="1.4" fill="currentColor" />
              <circle cx="17" cy="11" r="1.4" fill="currentColor" />
            </svg>
            <span>EnzymeForge.ai</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
