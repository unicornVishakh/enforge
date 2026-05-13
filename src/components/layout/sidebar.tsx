"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { no: "01", href: "/dashboard", label: "Dashboard" },
  { no: "02", href: "/projects", label: "Projects" },
  { no: "03", href: "/settings", label: "Settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-64 shrink-0 flex-col border-r md:flex">
      <div className="border-sidebar-border flex h-20 items-center border-b px-5">
        <Link
          href="/dashboard"
          className="flex items-center"
          aria-label="EnzymeForge — dashboard"
        >
          <Logo />
        </Link>
      </div>
      <div className="px-5 pt-6 pb-2">
        <p className="text-sidebar-foreground/50 font-mono text-[10px] tracking-[0.22em] uppercase">
          Workspace · Index
        </p>
      </div>
      <nav className="flex-1 px-3 py-2">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative grid grid-cols-[auto_1fr] items-baseline gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="bg-highlight absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                />
              )}
              <span
                className={cn(
                  "font-mono text-[10.5px] tracking-[0.18em] tabular-nums",
                  active
                    ? "text-highlight"
                    : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/70",
                )}
              >
                {item.no}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-sidebar-border flex flex-col gap-1 border-t px-5 py-4">
        <p className="text-sidebar-foreground/55 font-mono text-[10px] tracking-[0.18em] uppercase">
          Build
        </p>
        <p className="text-sidebar-foreground/80 font-mono text-[11px] tracking-wide">
          v1.0.0-rc · {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </aside>
  );
}
