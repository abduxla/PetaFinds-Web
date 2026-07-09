"use client";

import { useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useQuerySub } from "@/lib/firestore-hooks";
import { notificationFromDoc, unreadQuery } from "@/lib/notifications";
import { IconBell } from "@/components/shell/icons";

/** Bell nav icon with a live unread dot (drops into the NAV item slot). */
export function NotificationsNavIcon() {
  const { fbUser } = useAuth();
  const q = useMemo(
    () => (fbUser ? unreadQuery(fbUser.uid) : null),
    [fbUser],
  );
  const { data: unread } = useQuerySub(
    q,
    notificationFromDoc,
    `unread-${fbUser?.uid ?? "none"}`,
  );

  return (
    <span className="relative inline-flex">
      {IconBell}
      {unread.length > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-orange text-[8px] font-black text-white">
          {unread.length > 9 ? "9+" : unread.length}
        </span>
      )}
    </span>
  );
}
