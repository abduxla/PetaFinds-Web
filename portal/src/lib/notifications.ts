import {
  collection,
  doc,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Query,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import { toDate } from "@/lib/types";

/** Mirrors AppNotification in the mobile app (lib/models/app_notification.dart)
 *  — same /notifications collection, same doc shape. */
export interface PortalNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: Date | null;
}

export function notificationFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): PortalNotification | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    userId: (d.userId as string) ?? "",
    title: (d.title as string) ?? "",
    body: (d.body as string) ?? "",
    type: (d.type as string) ?? "general",
    read: d.read === true,
    createdAt: toDate(d.createdAt),
  };
}

/** Newest-first inbox query for a user (same index the mobile app uses). */
export function inboxQuery(uid: string): Query<DocumentData> {
  return query(
    collection(db, "notifications"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
  );
}

/** Unread-only query — drives the bell badge. */
export function unreadQuery(uid: string): Query<DocumentData> {
  return query(
    collection(db, "notifications"),
    where("userId", "==", uid),
    where("read", "==", false),
  );
}

export async function markRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), {
    read: true,
    readAt: new Date(),
  });
}

export async function markAllRead(ids: string[]): Promise<void> {
  // Rules restrict updates to ['read','readAt'] on own docs; batch in
  // chunks of 450 to stay under the 500-write batch cap.
  for (let i = 0; i < ids.length; i += 450) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 450)) {
      batch.update(doc(db, "notifications", id), {
        read: true,
        readAt: new Date(),
      });
    }
    await batch.commit();
  }
}

// ---- admin broadcast ----

export interface BroadcastInput {
  audience: "single" | "tier" | "all";
  businessId?: string;
  tierId?: string;
  title: string;
  body: string;
}

export async function broadcastNotification(
  input: BroadcastInput,
): Promise<{ ok: boolean; recipients: number }> {
  const fn = httpsCallable<BroadcastInput, { ok: boolean; recipients: number }>(
    functions,
    "broadcastNotification",
  );
  return (await fn(input)).data;
}
