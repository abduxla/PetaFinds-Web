"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuerySub } from "@/lib/firestore-hooks";
import {
  inboxQuery,
  markAllRead,
  markRead,
  notificationFromDoc,
  type PortalNotification,
} from "@/lib/notifications";
import { formatDateTime } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

const TYPE_LABELS: Record<string, string> = {
  payment: "Payments",
  membership: "Membership",
  announcement: "Announcements",
  support: "Support",
  welcome: "General",
};

function typeLabel(t: string): string {
  return TYPE_LABELS[t] ?? "General";
}

export default function NotificationsPage() {
  const { fbUser } = useAuth();
  const q = useMemo(
    () => (fbUser ? inboxQuery(fbUser.uid) : null),
    [fbUser],
  );
  const { data: items, loading } = useQuerySub(
    q,
    notificationFromDoc,
    `inbox-${fbUser?.uid ?? "none"}`,
  );
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => {
    const set = new Set(items.map((n) => typeLabel(n.type)));
    return ["all", ...Array.from(set)];
  }, [items]);

  const shown =
    filter === "all" ? items : items.filter((n) => typeLabel(n.type) === filter);
  const unread = items.filter((n) => !n.read);

  async function onMarkAll() {
    setBusy(true);
    try {
      await markAllRead(unread.map((n) => n.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
            Notifications
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {unread.length} unread · {items.length} total
          </p>
        </div>
        {unread.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            loading={busy}
            onClick={() => void onMarkAll()}
          >
            Mark all read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filter === c
                ? "border-teal bg-teal-light text-teal-dark"
                : "border-line bg-surface text-ink-500 hover:text-ink-700",
            )}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Inbox" subtitle="Payments, membership and announcements" />
        <CardBody className="px-0 pb-2 pt-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : shown.length === 0 ? (
            <EmptyState
              title="Nothing here"
              message="Updates about your payments, membership and announcements from PetaFinds appear here."
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {shown.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function NotificationRow({ n }: { n: PortalNotification }) {
  return (
    <li>
      <button
        onClick={() => {
          if (!n.read) void markRead(n.id);
        }}
        className={cn(
          "flex w-full cursor-pointer items-start gap-3 px-6 py-3.5 text-left transition-colors hover:bg-bg-section/60",
        )}
      >
        <span
          className={cn(
            "mt-1.5 size-2 shrink-0 rounded-full",
            n.read ? "bg-transparent" : "bg-orange",
          )}
        />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm text-ink-900",
              n.read ? "font-semibold" : "font-black",
            )}
          >
            {n.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-700">
            {n.body}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {formatDateTime(n.createdAt)}
          </p>
        </div>
        <Badge tone={n.type === "announcement" ? "orange" : "teal"}>
          {typeLabel(n.type)}
        </Badge>
      </button>
    </li>
  );
}
