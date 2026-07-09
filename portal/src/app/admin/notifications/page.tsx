"use client";

import { useState, type FormEvent } from "react";
import { useAllBusinesses } from "@/lib/admin-data";
import { broadcastNotification } from "@/lib/notifications";
import { callableError } from "@/lib/callables";
import { TIER_ORDER, TIER_PLANS, type TierId } from "@/config/tiers";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/cn";

type Audience = "all" | "tier" | "single";

export default function AdminNotificationsPage() {
  const { data: businesses } = useAllBusinesses();
  const [audience, setAudience] = useState<Audience>("all");
  const [tierId, setTierId] = useState<TierId>("spotlight");
  const [businessId, setBusinessId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const recipientPreview =
    audience === "all"
      ? `${businesses.length} businesses`
      : audience === "tier"
        ? `${businesses.filter((b) => b.tier === tierId).length} ${TIER_PLANS[tierId].name} businesses`
        : businesses.find((b) => b.id === businessId)?.businessName ??
          "— pick a business";

  function validate(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (title.trim().length < 3)
      return setMsg({ ok: false, text: "Title must be at least 3 characters." });
    if (body.trim().length < 3)
      return setMsg({ ok: false, text: "Message must be at least 3 characters." });
    if (audience === "single" && !businessId)
      return setMsg({ ok: false, text: "Pick the business to notify." });
    setConfirmOpen(true);
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await broadcastNotification({
        audience,
        tierId: audience === "tier" ? tierId : undefined,
        businessId: audience === "single" ? businessId : undefined,
        title: title.trim(),
        body: body.trim(),
      });
      setMsg({
        ok: true,
        text: `Sent to ${res.recipients} merchant${res.recipients === 1 ? "" : "s"} (inbox + push).`,
      });
      setTitle("");
      setBody("");
      setConfirmOpen(false);
    } catch (err) {
      setMsg({ ok: false, text: callableError(err) });
      setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Broadcast
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Send an announcement to merchants — it lands in their portal inbox
          and as a push notification in the app.
        </p>
      </div>

      <Card>
        <CardHeader title="Compose" subtitle="Audited · limited to 10 sends per hour" />
        <CardBody>
          <form onSubmit={validate} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-700">
                Audience
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "all", label: "All businesses" },
                    { id: "tier", label: "One tier" },
                    { id: "single", label: "Single business" },
                  ] as { id: Audience; label: string }[]
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAudience(a.id)}
                    className={cn(
                      "cursor-pointer rounded-(--radius-input) border px-3.5 py-2 text-[13px] font-semibold transition-colors",
                      audience === a.id
                        ? "border-teal bg-teal-light text-teal-dark"
                        : "border-line bg-surface text-ink-500 hover:text-ink-700",
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {audience === "tier" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-700">
                  Tier
                </span>
                <select
                  value={tierId}
                  onChange={(e) => setTierId(e.target.value as TierId)}
                  className="h-11 cursor-pointer rounded-(--radius-input) border border-line bg-surface px-3 text-sm text-ink-900 focus:border-teal focus:outline-none"
                >
                  {TIER_ORDER.map((id) => (
                    <option key={id} value={id}>
                      {TIER_PLANS[id].name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {audience === "single" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-semibold text-ink-700">
                  Business
                </span>
                <select
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  className="h-11 cursor-pointer rounded-(--radius-input) border border-line bg-surface px-3 text-sm text-ink-900 focus:border-teal focus:outline-none"
                >
                  <option value="">Select a business…</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.businessName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Title"
              placeholder="e.g. New feature: track your product views"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="broadcast-body"
                className="text-[13px] font-semibold text-ink-700"
              >
                Message
              </label>
              <textarea
                id="broadcast-body"
                rows={4}
                maxLength={500}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Keep it short — this also goes out as a push notification."
                className="rounded-(--radius-input) border border-line bg-surface px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
                required
              />
              <p className="text-xs text-ink-500">{body.length}/500</p>
            </div>

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

            <Button type="submit" className="w-full">
              Review &amp; send
            </Button>
          </form>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title={`Send to ${recipientPreview}?`}
        body={
          <>
            <p className="font-bold">{title}</p>
            <p className="mt-1">{body}</p>
            <p className="mt-3 text-xs text-ink-500">
              Delivered to each merchant&apos;s portal inbox and phone. This
              can&apos;t be unsent.
            </p>
          </>
        }
        confirmLabel="Send broadcast"
        busy={busy}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
