"use client";

import { useBusiness } from "@/lib/business-context";
import { effectiveTier } from "@/config/tiers";
import {
  GoldAnalytics,
  PlatinumAnalytics,
  SilverTeaser,
} from "./sections";

/**
 * Tiered Analytics (BI) module. One route; the experience deepens with
 * membership so the value of upgrading is always visible:
 *   Silver    → teaser with the business's REAL numbers + upgrade CTA
 *   Gold      → "are customers interested?" (engagement + This Month)
 *   Platinum  → product performance, search analytics, positions, exports
 *   Vibranium → executive intelligence on top (benchmarks, market, terms)
 */
export default function AnalyticsPage() {
  const { business } = useBusiness();
  if (!business) return null;

  const tier = effectiveTier(business.tier, business.tierValidUntil);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-ink-900">
          Analytics
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {tier === "listed" &&
            "See what your shop is already doing on PetaFinds."}
          {tier === "spotlight" &&
            "Are customers interested in your business?"}
          {tier === "prime" && "Which of your products perform best?"}
          {tier === "elite" &&
            "Your executive view — what should you do next to grow?"}
        </p>
      </div>

      {tier === "listed" && <SilverTeaser business={business} />}
      {tier === "spotlight" && <GoldAnalytics business={business} />}
      {tier === "prime" && (
        <PlatinumAnalytics business={business} executive={false} />
      )}
      {tier === "elite" && (
        <PlatinumAnalytics business={business} executive />
      )}
    </div>
  );
}
