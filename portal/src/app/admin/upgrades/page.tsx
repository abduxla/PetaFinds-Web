"use client";

import { useMemo, useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQuerySub } from "@/lib/firestore-hooks";
import {
  decideUpgrade,
  upgradeRequestFromDoc,
  type UpgradeRequest,
} from "@/lib/upgrades";
import { callableError } from "@/lib/callables";
import { TIER_PLANS } from "@/config/tiers";
import { formatDate, formatLkr } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

type Tab = "pending" | "all";

export default function AdminUpgradesPage() {
  const q = useMemo(
    () =>
      query(collection(db, "upgradeRequests"), orderBy("createdAt", "desc")),
    [],
  );
  const { data: requests, loading } = useQuerySub(
    q,
    upgradeRequestFromDoc,
    "admin-upgrades",
  );
  const [tab, setTab] = useState<Tab>("pending");

  const pending = requests.filter((r) => r.status === "pending");
  const shown = tab === "pending" ? pending : requests;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Upgrade requests
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {pending.length} awaiting review · approval invites the merchant to
          pay; the plan activates when their payment is verified
        </p>
      </div>

      <div className="flex rounded-(--radius-input) border border-line bg-surface p-1 w-fit">
        {(
          [
            { id: "pending", label: "Pending" },
            { id: "all", label: "All" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "cursor-pointer rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              tab === t.id
                ? "bg-teal-light text-teal-dark"
                : "text-ink-500 hover:text-ink-700",
            )}
          >
            {t.label}
            {t.id === "pending" && pending.length > 0 && (
              <span className="ml-1.5 rounded-full bg-orange px-1.5 text-[10px] font-black text-white">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={tab === "pending" ? "No pending requests" : "No requests"}
            message="Merchant upgrade requests appear here for review."
          />
        ) : (
          <ul className="divide-y divide-line/70">
            {shown.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RequestRow({ request: r }: { request: UpgradeRequest }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function decide(decision: "approve" | "decline") {
    if (decision === "decline" && note.trim().length < 3) {
      setMsg({
        ok: false,
        text: "Add a short note explaining the decline for the merchant.",
      });
      return;
    }
    setBusy(decision);
    setMsg(null);
    try {
      await decideUpgrade(r.businessId, decision, note.trim() || undefined);
    } catch (err) {
      setMsg({ ok: false, text: callableError(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="space-y-3 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">
            {r.businessName || r.businessId}
          </p>
          <p className="text-xs text-ink-500">
            {TIER_PLANS[r.currentTier].name} (
            {r.currentMonthlyLkr === 0
              ? "Free"
              : `${formatLkr(r.currentMonthlyLkr)}/mo`}
            ) → <strong>{TIER_PLANS[r.targetTier].name}</strong> (
            {formatLkr(r.targetMonthlyLkr)}/mo) · requested{" "}
            {formatDate(r.createdAt)}
          </p>
          {r.notes && (
            <p className="mt-1 text-[13px] text-ink-700">
              <span className="font-bold">Merchant note:</span> {r.notes}
            </p>
          )}
        </div>
        {r.status === "pending" ? (
          <Badge tone="orange">Pending</Badge>
        ) : r.status === "approved" ? (
          <Badge tone="success">Approved</Badge>
        ) : (
          <Badge tone="danger">Declined</Badge>
        )}
      </div>

      {r.status === "pending" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <Input
              label="Note to merchant (required when declining)"
              placeholder="e.g. Let's talk pricing first — we'll call you"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button
            onClick={() => void decide("approve")}
            loading={busy === "approve"}
            disabled={busy !== null}
          >
            Approve
          </Button>
          <Button
            variant="danger"
            onClick={() => void decide("decline")}
            loading={busy === "decline"}
            disabled={busy !== null}
          >
            Decline
          </Button>
        </div>
      ) : (
        r.decisionNote && (
          <p className="text-[13px] text-ink-700">
            <span className="font-bold">Decision note:</span> {r.decisionNote}
          </p>
        )
      )}
      {msg && (
        <p
          className={cn(
            "text-[13px] font-semibold",
            msg.ok ? "text-success" : "text-danger",
          )}
        >
          {msg.text}
        </p>
      )}
    </li>
  );
}
