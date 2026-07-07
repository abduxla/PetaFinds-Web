import type {
  DocumentData,
  DocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { toDate } from "@/lib/types";
import { tierFromId, type TierId } from "@/config/tiers";
import type { PaymentMethod } from "@/lib/payments";

/** Mirrors the invoices doc issued by reviewPayment (functions/index.js).
 *  Client-side READ-ONLY; lifecycle changes go through manageInvoice. */

export type InvoiceStatus = "paid" | "void";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  businessId: string;
  businessName: string;
  paymentId: string;
  tier: TierId;
  months: number;
  amountLkr: number;
  method: PaymentMethod;
  referenceNumber: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  status: InvoiceStatus;
  statusNote: string;
  issuedAt: Date | null;
}

export function invoiceFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): Invoice | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    invoiceNumber: (d.invoiceNumber as string) ?? "",
    businessId: (d.businessId as string) ?? "",
    businessName: (d.businessName as string) ?? "",
    paymentId: (d.paymentId as string) ?? "",
    tier: tierFromId(d.tier as string),
    months: typeof d.months === "number" ? d.months : 1,
    amountLkr: typeof d.amountLkr === "number" ? d.amountLkr : 0,
    method: (d.method as PaymentMethod) ?? "bank_transfer",
    referenceNumber: (d.referenceNumber as string) ?? "",
    periodStart: toDate(d.periodStart),
    periodEnd: toDate(d.periodEnd),
    status: d.status === "void" ? "void" : "paid",
    statusNote: (d.statusNote as string) ?? "",
    issuedAt: toDate(d.issuedAt),
  };
}

export async function manageInvoice(
  invoiceId: string,
  action: "email" | "void" | "markPaid",
  note?: string,
): Promise<{ ok: boolean; status: string }> {
  const fn = httpsCallable<
    { invoiceId: string; action: string; note?: string },
    { ok: boolean; status: string }
  >(functions, "manageInvoice");
  return (await fn({ invoiceId, action, note })).data;
}
