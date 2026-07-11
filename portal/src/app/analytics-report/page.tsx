"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { BusinessProvider, useBusiness } from "@/lib/business-context";
import { effectiveTier, TIER_PLANS, tierFromId } from "@/config/tiers";
import {
  PERIODS,
  periodRange,
  sumDaily,
  sumSearch,
  useBizInsights,
  useBusinessProducts,
  useDailyStats,
  useSearchDaily,
  type PeriodId,
} from "@/lib/insights";
import { formatDate } from "@/lib/format";
import { FullScreenSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/shell/brand";

/**
 * White-label print report (browser print-to-PDF), Platinum and above.
 * Chrome-free like /invoice-print; carries the business's own logo so the
 * PDF can be shared internally as the shop's document.
 */
export default function AnalyticsReportPage() {
  return (
    <BusinessProvider>
      <Suspense fallback={<FullScreenSpinner />}>
        <ReportSheet />
      </Suspense>
    </BusinessProvider>
  );
}

function ReportSheet() {
  const router = useRouter();
  const params = useSearchParams();
  const period = (params.get("period") ?? "30d") as PeriodId;
  const { fbUser, loading: authLoading } = useAuth();
  const { business, loading } = useBusiness();

  const { data: insights } = useBizInsights(business?.id ?? null);
  const { data: daily } = useDailyStats(business?.id ?? null);
  const { data: search } = useSearchDaily(business?.id ?? null);
  const { data: products } = useBusinessProducts(business?.id ?? null);

  const range = useMemo(() => periodRange(period), [period]);
  const e = sumDaily(daily, range);
  const s = sumSearch(search, range);

  if (authLoading || loading) return <FullScreenSpinner />;
  if (!fbUser || !business) {
    router.replace("/sign-in");
    return <FullScreenSpinner />;
  }
  const tier = effectiveTier(business.tier, business.tierValidUntil);
  if (tier !== "prime" && tier !== "elite") {
    router.replace("/analytics");
    return <FullScreenSpinner />;
  }

  const periodLabel =
    PERIODS.find((p) => p.id === period)?.label ?? "Last 30 Days";
  const ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
  const titleOf = new Map(products.map((p) => [p.id, p.title]));
  const top = (insights?.productPositions ?? []).slice(0, 10);

  const kpis: [string, string][] = [
    ["Product views", e.productViews.toLocaleString()],
    ["Profile views", e.profileViews.toLocaleString()],
    ["Saves", e.saves.toLocaleString()],
    ["Chats started", e.chatsStarted.toLocaleString()],
    ["Search impressions", s.impressions.toLocaleString()],
    ["Search CTR", s.impressions > 0 ? `${ctr.toFixed(1)}%` : "—"],
  ];

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-surface px-8 py-10 print:max-w-none print:px-0 print:py-0">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <button
          onClick={() => window.history.back()}
          className="cursor-pointer text-[13px] font-semibold text-ink-500 hover:text-teal"
        >
          ← Back to Analytics
        </button>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <div className="rounded-(--radius-card) border border-line p-8 print:rounded-none print:border-0 print:p-0">
        {/* White-label header: the BUSINESS is the star; PetaFinds signs
            discreetly at the bottom. */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- static export, storage URL
              <img
                src={business.logoUrl}
                alt=""
                className="size-12 rounded-xl border border-line object-cover"
              />
            ) : null}
            <div>
              <h1 className="font-display text-xl font-black text-ink-900">
                {business.businessName}
              </h1>
              <p className="text-xs text-ink-500">
                {business.category} ·{" "}
                {TIER_PLANS[tierFromId(business.tier)].name} member
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-sm font-black uppercase tracking-wide text-teal-dark">
              Business Report
            </p>
            <p className="text-xs text-ink-500">{periodLabel}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {kpis.map(([label, value]) => (
            <div
              key={label}
              className="rounded-(--radius-input) border border-line px-4 py-3 text-center"
            >
              <p className="font-display text-lg font-black text-teal-dark">
                {value}
              </p>
              <p className="text-[11px] text-ink-500">{label}</p>
            </div>
          ))}
        </div>

        {insights && (
          <p className="mt-6 rounded-(--radius-input) bg-teal-light px-4 py-3 text-[13px] font-bold text-teal-dark">
            Marketplace standing: {insights.percentileBand} — #
            {insights.marketplacePosition} of{" "}
            {insights.totalBusinesses.toLocaleString()} businesses · #
            {insights.tierPosition} in{" "}
            {TIER_PLANS[tierFromId(insights.tier)].name}
          </p>
        )}

        {top.length > 0 && (
          <>
            <h2 className="mt-8 font-display text-sm font-black uppercase tracking-wide text-ink-500">
              Top products (lifetime)
            </h2>
            <table className="mt-2 w-full text-[13px]">
              <thead>
                <tr className="border-b-2 border-ink-900 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  <th className="py-1.5">Product</th>
                  <th className="py-1.5 text-right">Views</th>
                  <th className="py-1.5 text-right">Saves</th>
                  <th className="py-1.5 text-right">Chats</th>
                  <th className="py-1.5 text-right">Marketplace</th>
                </tr>
              </thead>
              <tbody>
                {top.map((r) => (
                  <tr key={r.productId} className="border-b border-line">
                    <td className="max-w-56 truncate py-1.5 font-semibold text-ink-900">
                      {titleOf.get(r.productId) ?? "(deleted)"}
                    </td>
                    <td className="py-1.5 text-right text-ink-700">
                      {r.views.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right text-ink-700">
                      {r.saves.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right text-ink-700">
                      {r.chats.toLocaleString()}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-ink-900">
                      #{r.marketplacePosition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-line pt-4">
          <p className="text-[11px] text-ink-500">
            Generated {formatDate(new Date())} · figures from the PetaFinds
            marketplace analytics engine
          </p>
          <Wordmark className="text-[14px]" />
        </div>
      </div>
    </div>
  );
}
