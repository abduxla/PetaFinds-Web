import type {
  DocumentData,
  DocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { toDate } from "@/lib/types";
import { tierFromId, type TierId } from "@/config/tiers";

/** Mirrors /upgradeRequests/{businessId} — written ONLY by the
 *  requestUpgrade / decideUpgrade callables. Doc id == businessId, which
 *  is what guarantees a single open request per business. */

export type UpgradeStatus = "pending" | "approved" | "declined";

export interface UpgradeRequest {
  id: string;
  businessId: string;
  businessName: string;
  currentTier: TierId;
  targetTier: TierId;
  currentMonthlyLkr: number;
  targetMonthlyLkr: number;
  notes: string;
  status: UpgradeStatus;
  decisionNote: string;
  createdAt: Date | null;
  decidedAt: Date | null;
}

export function upgradeRequestFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): UpgradeRequest | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    businessId: (d.businessId as string) ?? snap.id,
    businessName: (d.businessName as string) ?? "",
    currentTier: tierFromId(d.currentTier as string),
    targetTier: tierFromId(d.targetTier as string),
    currentMonthlyLkr:
      typeof d.currentMonthlyLkr === "number" ? d.currentMonthlyLkr : 0,
    targetMonthlyLkr:
      typeof d.targetMonthlyLkr === "number" ? d.targetMonthlyLkr : 0,
    notes: (d.notes as string) ?? "",
    status: (["pending", "approved", "declined"] as const).includes(d.status)
      ? (d.status as UpgradeStatus)
      : "pending",
    decisionNote: (d.decisionNote as string) ?? "",
    createdAt: toDate(d.createdAt),
    decidedAt: toDate(d.decidedAt),
  };
}

export async function requestUpgrade(
  targetTier: TierId,
  notes?: string,
): Promise<{ ok: boolean }> {
  const fn = httpsCallable<{ targetTier: string; notes?: string },
    { ok: boolean }>(functions, "requestUpgrade");
  return (await fn({ targetTier, notes })).data;
}

export async function decideUpgrade(
  businessId: string,
  decision: "approve" | "decline",
  note?: string,
): Promise<{ ok: boolean; status: string }> {
  const fn = httpsCallable<
    { businessId: string; decision: string; note?: string },
    { ok: boolean; status: string }
  >(functions, "decideUpgrade");
  return (await fn({ businessId, decision, note })).data;
}
