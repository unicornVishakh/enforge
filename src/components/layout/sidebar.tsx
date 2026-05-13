"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center px-4">
        <Link
          href="/dashboard"
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
          <span>EnzymeForge</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-sidebar-border border-t p-3">
        <p className="text-sidebar-foreground/50 px-2 font-mono text-[10px] tracking-wider uppercase">
          v1.0.0-rc · {new Date().toISOString().slice(0, 10)}
        </p>
      </div>
    </aside>
  );
}
