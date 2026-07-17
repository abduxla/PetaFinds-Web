"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Business } from "@/lib/types";
import { TIER_PLANS, tierFromId, type TierId } from "@/config/tiers";
import {
  PERIODS,
  periodRange,
  sumDaily,
  sumSearch,
  useBizInsights,
  useBusinessProducts,
  useDailyStats,
  useMarketAggregates,
  useSearchDaily,
  type PeriodId,
  type ProductPosition,
} from "@/lib/insights";
import {
  FunnelChart,
  HBars,
  Movement,
  TrendChart,
} from "@/components/charts";
import { ExecInsightsCard, MilestonesSection } from "./milestones";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardBody className="px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        <p className="mt-1 font-display text-xl font-black text-ink-900">
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
      </CardBody>
    </Card>
  );
}

function PeriodFilter({
  value,
  onChange,
  ids,
}: {
  value: PeriodId;
  onChange: (p: PeriodId) => void;
  ids?: PeriodId[];
}) {
  const shown = ids
    ? PERIODS.filter((p) => ids.includes(p.id))
    : PERIODS;
  return (
    <div className="flex flex-wrap gap-1 rounded-(--radius-input) border border-line bg-surface p-1">
      {shown.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
            value === p.id
              ? "bg-teal-light text-teal-dark"
              : "text-ink-500 hover:text-ink-700",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

const nf = (n: number) => n.toLocaleString();

// Session-stable "now" for recency checks (react-hooks/purity forbids
// Date.now() inside render/memo; per-pageload precision is plenty here).
const PAGE_LOAD_MS = Date.now();

// ---------------------------------------------------------------------------
// SILVER — teaser with the business's real numbers
// ---------------------------------------------------------------------------

export function SilverTeaser({ business }: { business: Business }) {
  const { data: insights } = useBizInsights(business.id);
  const { data: search } = useSearchDaily(business.id);
  const s7 = sumSearch(search, periodRange("7d"));
  const best = insights?.productPositions?.[0];

  const teasers: { value: string; caption: string }[] = [];
  if (s7.impressions > 0 || (insights?.search7d.impressions ?? 0) > 0) {
    teasers.push({
      value: nf(Math.max(s7.impressions, insights?.search7d.impressions ?? 0)),
      caption: "times your products appeared in search this week",
    });
  }
  if (insights && insights.categoryBenchmark) {
    teasers.push({
      value: nf(insights.categoryBenchmark.myViews),
      caption: "times customers viewed your products",
    });
  }
  if (best && insights) {
    teasers.push({
      value: `#${best.marketplacePosition}`,
      caption: `your best product's position among ${nf(insights.marketplaceProductTotal)} marketplace products`,
    });
  }
  if (insights) {
    teasers.push({
      value: insights.percentileBand || `#${insights.marketplacePosition}`,
      caption: `where your shop stands among ${nf(insights.totalBusinesses)} businesses`,
    });
  }

  return (
    <div className="space-y-6">
      {teasers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {teasers.map((t) => (
            <Card key={t.caption}>
              <CardBody className="px-5 py-5">
                <p className="font-display text-2xl font-black text-teal-dark">
                  {t.value}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-700">
                  {t.caption}
                </p>
                <p className="mt-2 text-xs font-semibold text-orange">
                  🔒 See the full picture with a paid plan
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="py-8 text-center text-sm text-ink-500">
            Your shop&apos;s numbers are already being collected — the first
            insights appear after tonight&apos;s marketplace analysis.
          </CardBody>
        </Card>
      )}

      <Card className="border-teal/40">
        <CardBody className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-display text-lg font-black text-ink-900">
            Your customers are telling you what they want.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-ink-500">
            Every view, search and save is recorded from day one. Upgrade
            and it all lights up — trends, product performance, search
            visibility and your position in the marketplace.
          </p>
          <Link href="/membership">
            <Button size="lg">Upgrade to Platinum</Button>
          </Link>
          <p className="text-xs text-ink-500">
            or start with Gold ({TIER_PLANS.spotlight.name}) for engagement
            basics
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GOLD — engagement only ("are customers interested?")
// ---------------------------------------------------------------------------

export function GoldAnalytics({ business }: { business: Business }) {
  const { data: daily } = useDailyStats(business.id);
  const { data: insights } = useBizInsights(business.id);
  const [period, setPeriod] = useState<PeriodId>("thisMonth");
  const range = periodRange(period);

  const sums = sumDaily(daily, range);
  const lifetime = insights?.categoryBenchmark;
  const trend = useMemo(
    () =>
      [...daily]
        .reverse()
        .slice(-30)
        .map((d) => ({ label: d.date.slice(5), value: d.productViews })),
    [daily],
  );
  const nProducts = Math.max(1, insights?.totalProducts ?? 1);

  return (
    <div className="space-y-6">
      <PeriodFilter
        value={period}
        onChange={setPeriod}
        ids={["thisMonth", "lifetime"]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Profile views"
          value={
            period === "lifetime" ? "All-time" : nf(sums.profileViews)
          }
          sub={period === "lifetime" ? "in your monthly email report" : undefined}
        />
        <Kpi
          label="Product views"
          value={
            period === "lifetime"
              ? nf(lifetime?.myViews ?? sums.productViews)
              : nf(sums.productViews)
          }
        />
        <Kpi
          label="Saves"
          value={
            period === "lifetime"
              ? nf(lifetime?.mySaves ?? sums.saves)
              : nf(sums.saves)
          }
        />
        <Kpi
          label="Chats started"
          value={
            period === "lifetime"
              ? nf(lifetime?.myChats ?? sums.chatsStarted)
              : nf(sums.chatsStarted)
          }
        />
      </div>

      <Card>
        <CardHeader
          title="Product views — last 30 days"
          subtitle="Daily views across all your products"
        />
        <CardBody>
          <TrendChart points={trend} valueLabel="views" />
        </CardBody>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Kpi
          label="Avg views / product"
          value={nf(Math.round((lifetime?.myViews ?? 0) / nProducts))}
        />
        <Kpi
          label="Avg saves / product"
          value={nf(Math.round((lifetime?.mySaves ?? 0) / nProducts))}
        />
        <Kpi
          label="Avg chats / product"
          value={nf(Math.round((lifetime?.myChats ?? 0) / nProducts))}
        />
      </div>

      <Card className="border-orange/30">
        <CardBody className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="text-[13px] text-ink-700">
            <span className="font-bold">Platinum unlocks:</span> search
            analytics &amp; CTR · product rankings · marketplace position ·
            category benchmarks · CSV export
          </p>
          <Link href="/membership">
            <Button size="sm">See Platinum</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PLATINUM (+ Vibranium executive extras)
// ---------------------------------------------------------------------------

const EXEC_SECTIONS = [
  { id: "percentile", label: "Marketplace standing" },
  { id: "visibility", label: "Search visibility vs tiers" },
  { id: "market", label: "Market demand" },
  { id: "terms", label: "Search intelligence" },
] as const;

export function PlatinumAnalytics({
  business,
  executive,
}: {
  business: Business;
  executive: boolean;
}) {
  const { data: insights } = useBizInsights(business.id);
  const { data: daily } = useDailyStats(business.id);
  const { data: search } = useSearchDaily(business.id);
  const { data: products } = useBusinessProducts(business.id);
  const { data: market } = useMarketAggregates();
  const [period, setPeriod] = useState<PeriodId>("30d");
  const range = periodRange(period);

  const e = sumDaily(daily, range);
  const s = sumSearch(search, range);
  const ctr = s.impressions > 0 ? (s.clicks / s.impressions) * 100 : 0;
  const avgPos = s.impressions > 0 ? s.positionSum / s.impressions : 0;

  const titleOf = useMemo(() => {
    const m = new Map(products.map((p) => [p.id, p.title]));
    return (id: string) => m.get(id) ?? "(deleted product)";
  }, [products]);

  const viewTrend = useMemo(
    () =>
      [...daily].reverse().map((d) => ({
        label: d.date.slice(5),
        value: d.productViews,
      })),
    [daily],
  );
  const impressionTrend = useMemo(
    () =>
      [...search].reverse().map((d) => ({
        label: d.date.slice(5),
        value: d.impressions,
      })),
    [search],
  );

  // Executive widget visibility (persisted locally). Lazy initializer:
  // reads localStorage once on the client; prerender sees an empty set.
  const [hidden, setHidden] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem("pf-exec-hidden");
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  function toggleSection(id: string) {
    setHidden((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem("pf-exec-hidden", JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter value={period} onChange={setPeriod} />
        <Link href={`/analytics-report/?period=${period}`}>
          <Button variant="secondary" size="sm">
            PDF report
          </Button>
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Product views" value={nf(e.productViews)} />
        <Kpi label="Profile views" value={nf(e.profileViews)} />
        <Kpi
          label="Search impressions"
          value={nf(s.impressions)}
          sub={`${nf(s.top10)} top-10 appearances`}
        />
        <Kpi
          label="Search CTR"
          value={s.impressions > 0 ? `${ctr.toFixed(1)}%` : "—"}
          sub={
            avgPos > 0 ? `avg position ${avgPos.toFixed(1)}` : undefined
          }
        />
      </div>

      {/* Executive: standing */}
      {executive && insights && !hidden.has("percentile") && (
        <Card className="border-teal/40">
          <CardBody className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">
                Marketplace standing
              </p>
              <p className="font-display text-3xl font-black text-teal-dark">
                {insights.percentileBand}
              </p>
              <p className="mt-1 text-[13px] text-ink-700">
                #{insights.marketplacePosition} of{" "}
                {nf(insights.totalBusinesses)} businesses ·{" "}
                #{insights.tierPosition} of {nf(insights.tierTotal)}{" "}
                {TIER_PLANS[tierFromId(insights.tier)].name} businesses
              </p>
            </div>
            <Movement
              current={insights.marketplacePosition}
              prev={insights.prevMarketplacePosition}
            />
          </CardBody>
        </Card>
      )}

      {/* Trends — one measure per chart, never dual-axis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Product views" subtitle="Per day" />
          <CardBody>
            <TrendChart points={viewTrend.slice(-30)} valueLabel="views" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Search impressions"
            subtitle="Per day — how often you appear in results"
          />
          <CardBody>
            <TrendChart
              points={impressionTrend.slice(-30)}
              valueLabel="impressions"
            />
          </CardBody>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader
          title="Search funnel"
          subtitle="Where customers drop off in the selected period"
        />
        <CardBody>
          <FunnelChart
            stages={[
              { label: "Search impressions", value: s.impressions },
              { label: "Product views", value: e.productViews },
              { label: "Saves", value: e.saves },
              { label: "Chats started", value: e.chatsStarted },
            ]}
          />
        </CardBody>
      </Card>

      {/* Executive insights — Vibranium: the platform explains the data */}
      {executive && (
        <ExecInsightsCard
          insights={insights}
          daily={daily}
          titleOf={titleOf}
        />
      )}

      {/* Milestones — achievements + progress toward the next ones */}
      <MilestonesSection insights={insights} />

      {/* Product performance */}
      <ProductTable
        insights={insights?.productPositions ?? []}
        titleOf={titleOf}
        marketplaceTotal={insights?.marketplaceProductTotal ?? 0}
        tierTotal={insights?.tierProductTotal ?? 0}
        tierName={TIER_PLANS[tierFromId(insights?.tier)].name}
        businessName={business.businessName}
      />

      {/* Category benchmark */}
      {insights?.categoryBenchmark && (
        <Card>
          <CardHeader
            title={`Category benchmark — ${insights.categoryBenchmark.category}`}
            subtitle="You vs the anonymous category average (lifetime views)"
          />
          <CardBody className="space-y-4">
            <HBars
              rows={[
                {
                  label: "Your store",
                  value: insights.categoryBenchmark.myViews,
                  highlight: true,
                  annotation:
                    insights.categoryBenchmark.viewsVsAvgPct >= 0
                      ? `+${insights.categoryBenchmark.viewsVsAvgPct}%`
                      : `${insights.categoryBenchmark.viewsVsAvgPct}%`,
                },
                {
                  label: `Average ${insights.categoryBenchmark.category} store`,
                  value: insights.categoryBenchmark.avgViews,
                },
              ]}
            />
            <div className="grid grid-cols-2 gap-3 text-[13px] text-ink-700">
              <p>
                Saves: <b>{nf(insights.categoryBenchmark.mySaves)}</b> vs
                avg {nf(insights.categoryBenchmark.avgSaves)}
              </p>
              <p>
                Chats: <b>{nf(insights.categoryBenchmark.myChats)}</b> vs
                avg {nf(insights.categoryBenchmark.avgChats)}
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Product health */}
      <ProductHealth products={products} insights={insights?.productPositions ?? []} />

      {/* Executive intelligence */}
      {executive && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-500">
              Executive widgets:
            </span>
            {EXEC_SECTIONS.map((s2) => (
              <button
                key={s2.id}
                onClick={() => toggleSection(s2.id)}
                className={cn(
                  "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                  hidden.has(s2.id)
                    ? "border-line bg-surface text-ink-300"
                    : "border-teal bg-teal-light text-teal-dark",
                )}
              >
                {s2.label}
              </button>
            ))}
          </div>

          {!hidden.has("visibility") && market && (
            <Card>
              <CardHeader
                title="Search visibility vs membership tiers"
                subtitle="Average search impressions per business, last 7 days (anonymous)"
              />
              <CardBody>
                <HBars
                  rows={[
                    {
                      label: "Your store",
                      value: insights?.search7d.impressions ?? 0,
                      highlight: true,
                    },
                    ...(
                      ["spotlight", "prime", "elite"] as TierId[]
                    )
                      .filter((t) => market.tierAverages[t])
                      .map((t) => ({
                        label: `Average ${TIER_PLANS[t].name}`,
                        value:
                          market.tierAverages[t]!.avgSearchImpressions7d,
                      })),
                  ]}
                />
              </CardBody>
            </Card>
          )}

          {!hidden.has("market") && market && (
            <Card>
              <CardHeader
                title="Market demand"
                subtitle="Share of marketplace views by category (anonymous)"
              />
              <CardBody>
                <HBars
                  rows={Object.entries(market.categoryStats)
                    .sort(
                      (a, b) => b[1].demandSharePct - a[1].demandSharePct,
                    )
                    .slice(0, 8)
                    .map(([name, c]) => ({
                      label: name,
                      value: Math.round(c.demandSharePct * 10) / 10,
                      annotation: `${c.demandSharePct}%`,
                      highlight: name === business.category,
                    }))}
                />
              </CardBody>
            </Card>
          )}

          {!hidden.has("terms") && market && (
            <Card>
              <CardHeader
                title="Search intelligence"
                subtitle="What Pettah is searching for (anonymous, this week)"
              />
              <CardBody className="space-y-4">
                {market.topTermsWeek.length === 0 ? (
                  <p className="py-4 text-center text-[13px] text-ink-500">
                    Term data appears once app users are on the latest
                    version and searching.
                  </p>
                ) : (
                  <>
                    <HBars
                      rows={market.topTermsWeek.slice(0, 10).map((t) => ({
                        label: t.term,
                        value: t.searches,
                      }))}
                    />
                    {market.trendingTerms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-ink-500">
                          Trending:
                        </span>
                        {market.trendingTerms.slice(0, 8).map((t) => (
                          <Badge key={t.term} tone="success">
                            {t.term} +{t.growthPct}%
                          </Badge>
                        ))}
                      </div>
                    )}
                    {market.decliningTerms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-ink-500">
                          Declining:
                        </span>
                        {market.decliningTerms.slice(0, 8).map((t) => (
                          <Badge key={t.term} tone="danger">
                            {t.term} {t.growthPct}%
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      <p className="text-center text-xs text-ink-500">
        Positions, percentiles and benchmarks refresh nightly. Day-by-day
        data accrues from the moment analytics capture went live.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product performance table (sortable + CSV export)
// ---------------------------------------------------------------------------

type SortKey = "views" | "saves" | "chats" | "marketplacePosition";

function SortableTh({
  k,
  sort,
  onSort,
  children,
}: {
  k: SortKey;
  sort: SortKey;
  onSort: (k: SortKey) => void;
  children: string;
}) {
  return (
    <th
      className={cn(
        "cursor-pointer px-3 py-2.5 text-right",
        sort === k && "text-teal-dark",
      )}
      onClick={() => onSort(k)}
    >
      {children}
      {sort === k ? " ↓" : ""}
    </th>
  );
}

function ProductTable({
  insights,
  titleOf,
  marketplaceTotal,
  tierTotal,
  tierName,
  businessName,
}: {
  insights: ProductPosition[];
  titleOf: (id: string) => string;
  marketplaceTotal: number;
  tierTotal: number;
  tierName: string;
  businessName: string;
}) {
  const [sort, setSort] = useState<SortKey>("views");
  const rows = useMemo(
    () =>
      [...insights].sort((a, b) =>
        sort === "marketplacePosition"
          ? a.marketplacePosition - b.marketplacePosition
          : b[sort] - a[sort],
      ),
    [insights, sort],
  );

  function exportCsv() {
    const header =
      "Product,Views,Saves,Chats,Marketplace Position,Tier Position," +
      "Category Position\n";
    const body = rows
      .map((r) =>
        [
          `"${titleOf(r.productId).replace(/"/g, '""')}"`,
          r.views,
          r.saves,
          r.chats,
          r.marketplacePosition,
          r.tierPosition,
          r.categoryPosition,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + body], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${businessName.replace(/[^a-z0-9]+/gi, "-")}-products.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Product performance"
        subtitle={
          marketplaceTotal > 0
            ? `Positions among ${nf(marketplaceTotal)} marketplace products · ${nf(tierTotal)} ${tierName} products`
            : "Positions appear after tonight's marketplace analysis"
        }
        action={
          <Button variant="secondary" size="sm" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />
      <CardBody className="px-0 pb-2 pt-3">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink-500">
            Product insights appear after the first nightly analysis.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-bold uppercase tracking-wide text-ink-500">
                  <th className="px-6 py-2.5 text-left">Product</th>
                  <SortableTh k="views" sort={sort} onSort={setSort}>
                    Views
                  </SortableTh>
                  <SortableTh k="saves" sort={sort} onSort={setSort}>
                    Saves
                  </SortableTh>
                  <SortableTh k="chats" sort={sort} onSort={setSort}>
                    Chats
                  </SortableTh>
                  <SortableTh
                    k="marketplacePosition"
                    sort={sort}
                    onSort={setSort}
                  >
                    Marketplace
                  </SortableTh>
                  <th className="px-3 py-2.5 text-right">Movement</th>
                  <th className="px-3 py-2.5 text-right">In {tierName}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {rows.map((r) => (
                  <tr key={r.productId} className="hover:bg-bg-section/60">
                    <td className="max-w-56 truncate px-6 py-2.5 font-semibold text-ink-900">
                      {titleOf(r.productId)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-700">
                      {nf(r.views)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-700">
                      {nf(r.saves)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-700">
                      {nf(r.chats)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink-900">
                      #{r.marketplacePosition}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Movement
                        current={r.marketplacePosition}
                        prev={r.prevMarketplacePosition}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right text-ink-700">
                      #{r.tierPosition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Product health — actionable housekeeping
// ---------------------------------------------------------------------------

function ProductHealth({
  products,
  insights,
}: {
  products: {
    id: string;
    title: string;
    hasImage: boolean;
    hasPrice: boolean;
    isActive: boolean;
    createdAt: Date | null;
  }[];
  insights: ProductPosition[];
}) {
  const { active, noImage, noPrice, zeroViews, recent } = useMemo(() => {
    const statOf = new Map(insights.map((i) => [i.productId, i]));
    const act = products.filter((p) => p.isActive);
    const weekAgo = PAGE_LOAD_MS - 7 * 86400000;
    return {
      active: act,
      noImage: act.filter((p) => !p.hasImage),
      noPrice: act.filter((p) => !p.hasPrice),
      zeroViews: act.filter((p) => (statOf.get(p.id)?.views ?? 0) === 0),
      recent: act.filter((p) => (p.createdAt?.getTime() ?? 0) >= weekAgo),
    };
  }, [products, insights]);

  const items: { label: string; count: number; hint: string; tone: "success" | "orange" | "danger" | "neutral" }[] = [
    {
      label: "Active products",
      count: active.length,
      hint: "live in the marketplace",
      tone: "success",
    },
    {
      label: "Missing images",
      count: noImage.length,
      hint: "products with photos get dramatically more views",
      tone: noImage.length > 0 ? "danger" : "neutral",
    },
    {
      label: "No published price",
      count: noPrice.length,
      hint: "“Ask for price” converts fine — but check it's intentional",
      tone: noPrice.length > 0 ? "orange" : "neutral",
    },
    {
      label: "Zero views",
      count: zeroViews.length,
      hint: "consider better titles, photos or keywords",
      tone: zeroViews.length > 0 ? "orange" : "neutral",
    },
    {
      label: "Added this week",
      count: recent.length,
      hint: "fresh listings get a discovery boost",
      tone: "neutral",
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Product health"
        subtitle="Housekeeping that directly moves your numbers"
      />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {items.map((i) => (
            <div
              key={i.label}
              className="rounded-(--radius-input) border border-line px-4 py-3"
            >
              <p
                className={cn(
                  "font-display text-xl font-black",
                  i.tone === "success" && "text-success",
                  i.tone === "orange" && "text-orange",
                  i.tone === "danger" && "text-danger",
                  i.tone === "neutral" && "text-ink-900",
                )}
              >
                {i.count}
              </p>
              <p className="text-[12.5px] font-bold text-ink-900">
                {i.label}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">
                {i.hint}
              </p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
