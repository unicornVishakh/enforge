"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import type { Workspace } from "@/lib/types/database";

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
    <header className="border-border/40 bg-background/80 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur md:px-6">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="gap-2">
              <span className="bg-accent inline-block size-1.5 rounded-full" />
              <span className="max-w-[200px] truncate text-sm font-medium">
                {active?.name ?? "No workspace"}
              </span>
              <ChevronDown className="text-muted-foreground size-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground text-xs uppercase">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.length === 0 && (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              No workspaces yet.
            </div>
          )}
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} className="flex items-center gap-2">
              <span
                className={`size-1.5 rounded-full ${
                  w.id === active?.id ? "bg-accent" : "bg-muted-foreground/40"
                }`}
              />
              <span className="truncate">{w.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-accent/20 text-accent text-xs font-semibold">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
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
                  <User className="size-4" />
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
