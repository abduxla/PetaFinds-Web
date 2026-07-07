"use client";

import { useState } from "react";
import Link from "next/link";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBusiness } from "@/lib/business-context";
import { useDoc } from "@/lib/firestore-hooks";
import {
  requestUpgrade,
  upgradeRequestFromDoc,
} from "@/lib/upgrades";
import { callableError } from "@/lib/callables";
import {
  membershipState,
  TIER_ORDER,
  TIER_PLANS,
  type TierId,
} from "@/config/tiers";
import { formatDate, formatLkr } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, TierBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

export default function MembershipPage() {
  const { business } = useBusiness();
  const { data: openRequest } = useDoc(
    business ? doc(db, "upgradeRequests", business.id) : null,
    upgradeRequestFromDoc,
  );
  const [confirmTier, setConfirmTier] = useState<TierId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!business) return null;

  const ms = membershipState(business.tier, business.tierValidUntil);
  const pending = openRequest?.status === "pending";

  async function submitRequest() {
    if (!confirmTier) return;
    setBusy(true);
    setError(null);
    try {
      await requestUpgrade(confirmTier);
      setConfirmTier(null);
    } catch (err) {
      setError(callableError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Membership
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Your current plan and everything you can grow into.
        </p>
      </div>

      {/* Current plan summary */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TierBadge tier={ms.effective} />
            <div>
              <p className="font-display text-lg font-black text-ink-900">
                {TIER_PLANS[ms.effective].name}
              </p>
              <p className="text-[13px] text-ink-500">
                {TIER_PLANS[ms.effective].tagline}
              </p>
            </div>
          </div>
          <div className="text-right text-[13px] text-ink-500">
            {ms.phase === "free" && <p>Free plan — no expiry</p>}
            {ms.phase === "active" && (
              <p>
                Renews {formatDate(business.tierValidUntil)}
                <span className="font-semibold text-ink-700">
                  {" "}
                  · {ms.daysLeft} day{ms.daysLeft === 1 ? "" : "s"} left
                </span>
              </p>
            )}
            {ms.phase === "grace" && (
              <p className="font-semibold text-danger">
                Expired — {ms.daysLeft} day{ms.daysLeft === 1 ? "" : "s"} left
                to renew your {TIER_PLANS[ms.assigned].name} plan
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Open upgrade request status */}
      {openRequest && (
        <Card
          className={cn(
            openRequest.status === "pending" && "border-orange/40",
            openRequest.status === "approved" && "border-success/40",
          )}
        >
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-ink-900">
                Upgrade to {TIER_PLANS[openRequest.targetTier].name}
                {openRequest.status === "pending" && " — pending approval"}
                {openRequest.status === "approved" && " — approved 🎉"}
                {openRequest.status === "declined" && " — declined"}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Requested {formatDate(openRequest.createdAt)}
                {openRequest.decisionNote && <> · {openRequest.decisionNote}</>}
              </p>
            </div>
            {openRequest.status === "pending" && (
              <Badge tone="orange">Pending Approval</Badge>
            )}
            {openRequest.status === "approved" && (
              <Link href="/payments">
                <Button size="sm">Submit payment to activate</Button>
              </Link>
            )}
            {openRequest.status === "declined" && (
              <Badge tone="danger">Declined</Badge>
            )}
          </CardBody>
        </Card>
      )}

      {/* Comparison grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {TIER_ORDER.map((id) => {
          const plan = TIER_PLANS[id];
          const isCurrent = id === ms.effective;
          return (
            <Card
              key={id}
              className={cn(
                "relative flex flex-col",
                isCurrent && "ring-2 ring-teal border-transparent",
              )}
            >
              {plan.ribbon && (
                <span
                  className={cn(
                    "absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[10px] font-black tracking-wider text-white",
                    plan.ribbon === "MOST POPULAR"
                      ? "bg-orange"
                      : "bg-tier-vibranium",
                  )}
                >
                  {plan.ribbon === "MARKET LEADER" ? "👑 " : "★ "}
                  {plan.ribbon}
                </span>
              )}
              <CardBody className="flex flex-1 flex-col gap-4 pt-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3
                      className="font-display text-lg font-black"
                      style={{ color: plan.colorVar }}
                    >
                      {plan.name}
                    </h3>
                    {isCurrent && <Badge tone="teal">Current</Badge>}
                  </div>
                  <p className="mt-1 min-h-9 text-xs leading-relaxed text-ink-500">
                    {plan.tagline}
                  </p>
                </div>
                <div>
                  <span className="font-display text-2xl font-black text-ink-900">
                    {plan.priceLkr === 0 ? "FREE" : formatLkr(plan.priceLkr)}
                  </span>
                  {plan.priceLkr > 0 && (
                    <span className="text-xs font-semibold text-ink-500">
                      {" "}
                      /month
                    </span>
                  )}
                </div>
                <ul className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] text-ink-700"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mt-0.5 size-3.5 shrink-0 text-teal"
                      >
                        <path d="m4 10.5 4 4 8-9" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full">
                    Your current plan
                  </Button>
                ) : plan.priceLkr === 0 ? (
                  <Button variant="secondary" disabled className="w-full">
                    Included with every plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      setConfirmTier(id);
                    }}
                  >
                    {pending ? "Request pending…" : `Request ${plan.name}`}
                  </Button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {error && (
        <p className="text-center text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-ink-500">
        Prices in Sri Lankan Rupees. After your request is approved, submit
        the payment on the Payments page — your new plan activates as soon
        as it&apos;s verified.
      </p>

      <ConfirmDialog
        open={confirmTier !== null}
        title={
          confirmTier ? `Request the ${TIER_PLANS[confirmTier].name} plan?` : ""
        }
        body={
          confirmTier ? (
            <>
              The PetaFinds team reviews upgrade requests, usually within one
              business day. Once approved you&apos;ll pay{" "}
              <strong>
                {formatLkr(TIER_PLANS[confirmTier].priceLkr)}/month
              </strong>{" "}
              via the Payments page to activate it.
            </>
          ) : null
        }
        confirmLabel="Send request"
        busy={busy}
        onConfirm={() => void submitRequest()}
        onCancel={() => setConfirmTier(null)}
      />
    </div>
  );
}
