import { useState, useRef, useEffect } from "react";

import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, AlertCircle, Inbox, CalendarDays, Boxes, FileSpreadsheet } from "lucide-react";
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications.functions";

const ICONS: Record<string, typeof Bell> = {
  quote_request: Inbox,
  quote_review: AlertCircle,
  event_upcoming: CalendarDays,
  inventory: Boxes,
  sync: FileSpreadsheet,
};

export function AdminBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const listFn = useServerFn(listNotifications);
  const countFn = useServerFn(countUnreadNotifications);
  const readFn = useServerFn(markNotificationRead);
  const allFn = useServerFn(markAllNotificationsRead);

  const { data: count } = useQuery({
    queryKey: ["admin-notifications-count"],
    queryFn: () => countFn(),
    refetchInterval: 30_000,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => listFn(),
    enabled: open,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => readFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications-count"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => allFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notifications"] });
      qc.invalidateQueries({ queryKey: ["admin-notifications-count"] });
    },
  });

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = count?.count ?? 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card hover:bg-secondary"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="h-4 w-4 text-foreground" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--gold)] px-1 text-[10px] font-bold text-primary">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-2.5">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                You're all caught up.
              </div>
            ) : (
              items.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                const isUnread = !n.read_at;
                const body = (
                  <div
                    className={`flex gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                      isUnread ? "bg-[color:var(--gold)]/5" : ""
                    }`}
                  >
                    <Icon className={`mt-0.5 h-4 w-4 flex-none ${isUnread ? "text-[color:var(--gold)]" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markOne.mutate(n.id);
                        }}
                        className="self-start rounded p-1 text-muted-foreground hover:bg-secondary"
                        aria-label="Mark read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
                return n.link ? (
                  <a
                    key={n.id}
                    href={n.link}
                    onClick={() => {
                      if (isUnread) markOne.mutate(n.id);
                      setOpen(false);
                    }}
                    className="block hover:bg-secondary/40"
                  >
                    {body}
                  </a>
                ) : (
                  <div key={n.id}>{body}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
