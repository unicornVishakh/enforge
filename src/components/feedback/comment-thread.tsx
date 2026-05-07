"use client";

import { useEffect, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { CommentEntity } from "@/lib/types/database";

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  author_email?: string | null;
}

interface Props {
  entityType: CommentEntity;
  entityId: string;
  initialComments: CommentRow[];
  currentUserId: string;
  currentUserName?: string;
}

export function CommentThread({
  entityType,
  entityId,
  initialComments,
  currentUserId,
  currentUserName,
}: Props) {
  const [comments, setComments] = useState<CommentRow[]>(initialComments);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [supabase] = useState(() => createClient());

  // Realtime subscription — push new comments from other users.
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${entityType}:${entityId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `entity_id=eq.${entityId}`,
        },
        (payload) => {
          const c = payload.new as Omit<CommentRow, "author_name" | "author_email">;
          setComments((cur) => {
            if (cur.some((x) => x.id === c.id)) return cur;
            return [...cur, { ...c }];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, entityType, entityId]);

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: currentUserId,
          body: text,
        })
        .select("*")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setBody("");
      // Optimistic — realtime will dedup if it also delivers this row
      setComments((cur) => {
        if (cur.some((x) => x.id === data.id)) return cur;
        return [...cur, { ...data, author_name: currentUserName }];
      });
    });
  }

  return (
    <Card className="space-y-3 p-4">
      <header className="flex items-center gap-2">
        <MessageSquare className="text-muted-foreground size-4" />
        <h3 className="text-sm font-semibold">
          Comments
          <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
            {comments.length}
          </span>
        </h3>
      </header>
      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="text-muted-foreground text-xs">
            No comments yet — start the discussion.
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2">
            <Avatar className="size-7">
              <AvatarFallback className="bg-accent/20 text-accent text-[10px] font-semibold">
                {(c.author_name ?? c.author_email ?? c.user_id.slice(0, 2))
                  .split(/\s+/)
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">
                  {c.author_name ?? c.author_email ?? "User"}
                </span>
                <span className="text-muted-foreground/60 font-mono text-[10px]">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-invert prose-xs mt-1 max-w-none text-xs leading-relaxed">
                <ReactMarkdown>{c.body}</ReactMarkdown>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-border/40 border-t pt-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment… markdown supported."
          className="text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-[10px]">
            ⌘/Ctrl+Enter to send
          </span>
          <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="size-3" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
