"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useDoc } from "@/lib/firestore-hooks";
import { invoiceFromDoc } from "@/lib/invoices";
import { TIER_PLANS } from "@/config/tiers";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { formatDate, formatLkr } from "@/lib/format";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shell/brand";

/**
 * Print-ready invoice sheet (no portal chrome). "Download PDF" is the
 * browser's print-to-PDF — the right tool for a static export, and what
 * the Print button triggers. Access control is enforced by Firestore
 * rules: only the owning business or an admin can read the doc.
 */
export default function InvoicePrintPage() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <InvoiceSheet />
    </Suspense>
  );
}

function InvoiceSheet() {
  const params = useSearchParams();
  const id = params.get("id");
  const { data: inv, loading } = useDoc(
    id ? doc(db, "invoices", id) : null,
    invoiceFromDoc,
  );

  if (loading) return <FullScreenSpinner />;
  if (!inv) {
    return (
      <EmptyState
        title="Invoice not found"
        message="It may have been removed, or you don't have access to it."
      />
    );
  }

  const plan = TIER_PLANS[inv.tier];

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-surface px-8 py-10 print:max-w-none print:px-0 print:py-0">
      {/* Screen-only toolbar */}
      <div className="mb-8 flex items-center justify-between print:hidden">
        <button
          onClick={() => window.history.back()}
          className="cursor-pointer text-[13px] font-semibold text-ink-500 hover:text-teal"
        >
          ← Back
        </button>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      {/* Invoice sheet */}
      <div className="rounded-(--radius-card) border border-line p-8 print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between">
          <div>
            <Wordmark className="text-[22px]" />
            <p className="mt-1 text-xs text-ink-500">
              PetaFinds (Pvt) Ltd · Colombo 11 · support@petafinds.lk
            </p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-xl font-black text-ink-900">
              INVOICE
            </h1>
            <p className="font-mono text-sm font-bold text-teal-dark">
              {inv.invoiceNumber}
            </p>
            {inv.status === "void" && (
              <p className="mt-1 inline-block rounded-md border-2 border-danger px-2 py-0.5 text-xs font-black uppercase text-danger">
                VOID
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Billed to
            </p>
            <p className="mt-1 font-bold text-ink-900">{inv.businessName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Issued
            </p>
            <p className="mt-1 font-semibold text-ink-900">
              {formatDate(inv.issuedAt)}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-sm">
          <thead>
            <tr className="border-b-2 border-ink-900 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <td className="py-3">
                <p className="font-bold text-ink-900">
                  {plan.name} membership × {inv.months} month
                  {inv.months > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-ink-500">
                  Coverage {formatDate(inv.periodStart)} –{" "}
                  {formatDate(inv.periodEnd)} ·{" "}
                  {PAYMENT_METHOD_LABELS[inv.method]} · Ref{" "}
                  {inv.referenceNumber}
                </p>
              </td>
              <td className="py-3 text-right font-semibold text-ink-900">
                {formatLkr(inv.amountLkr)}
              </td>
            </tr>
            <tr>
              <td className="py-3 font-display text-base font-black text-teal-dark">
                Total paid
              </td>
              <td className="py-3 text-right font-display text-lg font-black text-teal-dark">
                {formatLkr(inv.amountLkr)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mt-10 text-xs leading-relaxed text-ink-500">
          Payment received with thanks — this invoice was settled at issue.
          {inv.statusNote && (
            <>
              {" "}
              Note: <span className="font-semibold">{inv.statusNote}</span>
            </>
          )}
          <br />
          PetaFinds · Bringing Pettah online · petafinds.lk
        </p>
      </div>
    </div>
  );
}
