"use client";

import { useMemo, useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQuerySub } from "@/lib/firestore-hooks";
import {
  invoiceFromDoc,
  manageInvoice,
  type Invoice,
} from "@/lib/invoices";
import { callableError } from "@/lib/callables";
import { InvoiceRow } from "@/app/(business)/invoices/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function AdminInvoicesPage() {
  const q = useMemo(
    () => query(collection(db, "invoices"), orderBy("issuedAt", "desc")),
    [],
  );
  const { data: invoices, loading } = useQuerySub(
    q,
    invoiceFromDoc,
    "admin-invoices",
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const ql = search.trim().toLowerCase();
    if (!ql) return invoices;
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(ql) ||
        i.businessName.toLowerCase().includes(ql) ||
        i.referenceNumber.toLowerCase().includes(ql),
    );
  }, [invoices, search]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Invoices
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {invoices.length} issued · every approved payment generates one
          automatically
        </p>
      </div>

      <input
        type="search"
        placeholder="Search invoice number, business, reference…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-10 w-full rounded-(--radius-input) border border-line bg-surface px-3.5 text-[13px] text-ink-900 placeholder:text-ink-300 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
      />

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No invoices"
            message="Approve a payment and its invoice will appear here."
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {filtered.map((inv) => (
              <InvoiceRow
                key={inv.id}
                invoice={inv}
                canEmail
                adminActions={<VoidButton invoice={inv} />}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function VoidButton({ invoice: inv }: { invoice: Invoice }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isVoid = inv.status === "void";

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await manageInvoice(inv.id, isVoid ? "markPaid" : "void");
      setOpen(false);
    } catch (err) {
      setError(callableError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant={isVoid ? "secondary" : "danger"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isVoid ? "Restore" : "Void"}
      </Button>
      <ConfirmDialog
        open={open}
        title={
          isVoid
            ? `Restore ${inv.invoiceNumber} to paid?`
            : `Void ${inv.invoiceNumber}?`
        }
        body={
          <>
            {isVoid
              ? "The invoice becomes valid again."
              : "The invoice is marked VOID on every copy the merchant sees. This does not reverse the membership — adjust the business's tier separately if needed."}
            {error && (
              <p className="mt-2 text-[13px] font-semibold text-danger">
                {error}
              </p>
            )}
          </>
        }
        confirmLabel={isVoid ? "Restore" : "Void invoice"}
        tone={isVoid ? "primary" : "danger"}
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
