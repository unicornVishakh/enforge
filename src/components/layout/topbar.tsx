"use client";

import { Check, ChevronDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/app/(auth)/actions";
import type { Workspace } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface TopbarProps {
  email: string;
  fullName: string | null;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
}

export function Topbar({
  email,
  fullName,
  workspaces,
  activeWorkspaceId,
}: TopbarProps) {
  const active =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
  const initials = (fullName ?? email)
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-border bg-background sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "group inline-flex h-8 items-center gap-2 rounded-md border border-transparent pr-2 pl-1 transition-colors",
                "hover:border-border hover:bg-secondary/60",
              )}
            >
              <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.18em] uppercase">
                Workspace
              </span>
              <span className="bg-border h-3.5 w-px" aria-hidden="true" />
              <span className="text-foreground max-w-[220px] truncate text-sm font-medium">
                {active?.name ?? "No workspace"}
              </span>
              <ChevronDown
                className="text-muted-foreground/60 size-3.5 transition-transform group-data-[state=open]:rotate-180"
                aria-hidden="true"
              />
            </button>
          }
        />
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.18em] uppercase">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.length === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              No workspaces yet.
            </div>
          )}
          {workspaces.map((w) => {
            const isActive = w.id === active?.id;
            return (
              <DropdownMenuItem
                key={w.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate">{w.name}</span>
                {isActive && <Check className="text-accent size-3.5" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hover:bg-secondary/60 inline-flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-primary text-[11px] font-semibold">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown
                  className="text-muted-foreground/60 size-3.5"
                  aria-hidden="true"
                />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {fullName ?? "Researcher"}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={
                <a href="/settings" className="flex items-center gap-2">
                  <User className="text-muted-foreground size-4" />
                  Profile & settings
                </a>
              }
            />
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem
                render={
                  <button
                    type="submit"
                    className="text-destructive flex w-full items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                }
              />
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
