"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { collection, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/lib/business-context";
import { useQuerySub } from "@/lib/firestore-hooks";
import {
  invoiceFromDoc,
  manageInvoice,
  type Invoice,
} from "@/lib/invoices";
import { callableError } from "@/lib/callables";
import { TIER_PLANS } from "@/config/tiers";
import { formatDate, formatLkr } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

export default function InvoicesPage() {
  const { business } = useBusiness();
  if (!business) return null;
  return <InvoiceCentre businessId={business.id} />;
}

function InvoiceCentre({ businessId }: { businessId: string }) {
  const q = useMemo(
    () =>
      query(
        collection(db, "invoices"),
        where("businessId", "==", businessId),
        orderBy("issuedAt", "desc"),
      ),
    [businessId],
  );
  const { data: invoices, loading } = useQuerySub(
    q,
    invoiceFromDoc,
    `invoices-${businessId}`,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Invoice Centre
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          An invoice is issued automatically every time a payment is
          approved. Open one to print it or save it as PDF.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Your invoices"
          subtitle={`${invoices.length} issued`}
        />
        <CardBody className="px-0 pb-2 pt-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              title="No invoices yet"
              message="Once your first payment is approved, its invoice appears here."
              action={
                <Link href="/payments">
                  <Button variant="secondary">Go to Payments</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} canEmail />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Shared row (also used by the admin invoices page). */
export function InvoiceRow({
  invoice: inv,
  canEmail,
  adminActions,
}: {
  invoice: Invoice;
  canEmail?: boolean;
  adminActions?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function emailAgain() {
    setBusy(true);
    setMsg(null);
    try {
      await manageInvoice(inv.id, "email");
      setMsg({ ok: true, text: "Invoice emailed." });
    } catch (err) {
      setMsg({ ok: false, text: callableError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink-900">
          <span className="font-mono">{inv.invoiceNumber}</span>
          <span className="font-normal text-ink-500">
            {" "}
            · {formatLkr(inv.amountLkr)} · {TIER_PLANS[inv.tier].name} ·{" "}
            {inv.months} mo
          </span>
        </p>
        <p className="text-xs text-ink-500">
          Issued {formatDate(inv.issuedAt)} · period{" "}
          {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
        </p>
        {msg && (
          <p
            className={`mt-1 text-xs font-semibold ${msg.ok ? "text-success" : "text-danger"}`}
          >
            {msg.text}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {inv.status === "void" ? (
          <Badge tone="danger">Void</Badge>
        ) : (
          <Badge tone="success">Paid</Badge>
        )}
        <Link href={`/invoice-print/?id=${encodeURIComponent(inv.id)}`}>
          <Button variant="secondary" size="sm">
            View / PDF
          </Button>
        </Link>
        {canEmail && (
          <Button
            variant="ghost"
            size="sm"
            loading={busy}
            onClick={() => void emailAgain()}
          >
            Email again
          </Button>
        )}
        {adminActions}
      </div>
    </li>
  );
}
