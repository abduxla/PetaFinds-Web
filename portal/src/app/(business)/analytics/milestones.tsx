"use client";

/**
 * Milestones + executive insights for the tiered Analytics module.
 *
 * Everything here is DERIVED client-side from data the page already
 * subscribes to (bizInsights nightly doc + daily rollups) — no new
 * Firestore reads, no new backend surface. Achievement state doesn't
 * need persistence: a milestone is "earned" iff the underlying counter
 * has crossed the threshold, which is stable because the counters are
 * lifetime-monotonic (saves can dip, so no save milestones).
 *
 * Consumed by sections.tsx:
 *   <MilestonesSection>  — Platinum + Vibranium (analytics tiers)
 *   <ExecInsightsCard>   — Vibranium executive block only
 */

import type { BizInsights, DailyStat } from "@/lib/insights";
import { sumDaily } from "@/lib/insights";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";

const nf = (n: number) => n.toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

const VIEW_STEPS = [100, 500, 1_000, 5_000, 10_000, 50_000, 100_000];
const CHAT_STEPS = [10, 50, 100, 500, 1_000];
/** Percentile bands in ascending prestige; must match the nightly job. */
const BANDS = ["Top 50%", "Top 25%", "Top 10%", "Top 5%", "Top 2%", "Top 1%"];

interface Milestone {
  id: string;
  label: string;
  detail: string;
  earned: boolean;
  /** 0..1 toward the NEXT threshold — only for unearned, measurable ones. */
  progress?: number;
}

function buildMilestones(insights: BizInsights): Milestone[] {
  const bench = insights.categoryBenchmark;
  // Lifetime product views: prefer the benchmark copy, fall back to the
  // per-product positions sum (both come from the same nightly run).
  const views =
    bench?.myViews ??
    insights.productPositions.reduce((a, p) => a + p.views, 0);
  const chats =
    bench?.myChats ??
    insights.productPositions.reduce((a, p) => a + p.chats, 0);

  const out: Milestone[] = [];

  // View thresholds: every earned step + the single next one with a bar.
  for (const step of VIEW_STEPS) {
    if (views >= step) {
      out.push({
        id: `views-${step}`,
        label: `${nf(step)} product views`,
        detail: `Lifetime views across your products — now ${nf(views)}.`,
        earned: true,
      });
    } else {
      out.push({
        id: `views-${step}`,
        label: `${nf(step)} product views`,
        detail: `${nf(views)} of ${nf(step)}`,
        earned: false,
        progress: views / step,
      });
      break;
    }
  }

  for (const step of CHAT_STEPS) {
    if (chats >= step) {
      out.push({
        id: `chats-${step}`,
        label: `${nf(step)} customer chats`,
        detail: `Customers have started ${nf(chats)} chats with you.`,
        earned: true,
      });
    } else {
      out.push({
        id: `chats-${step}`,
        label: `${nf(step)} customer chats`,
        detail: `${nf(chats)} of ${nf(step)}`,
        earned: false,
        progress: chats / step,
      });
      break;
    }
  }

  // Percentile bands: all bands up to the current one are earned; the
  // next band up is the open goal (no measurable bar — rank-based).
  const bandIdx = BANDS.indexOf(insights.percentileBand);
  BANDS.forEach((band, i) => {
    if (bandIdx >= 0 && i <= bandIdx) {
      out.push({
        id: `band-${band}`,
        label: `${band} of the marketplace`,
        detail: `#${insights.marketplacePosition} of ${nf(insights.totalBusinesses)} businesses.`,
        earned: true,
      });
    } else if (i === bandIdx + 1) {
      out.push({
        id: `band-${band}`,
        label: `Reach the ${band}`,
        detail: "Climb the marketplace ranking to unlock.",
        earned: false,
      });
    }
  });

  // Search visibility.
  if (insights.search7d.impressions > 0) {
    out.push({
      id: "search-appearance",
      label: "Appearing in search",
      detail: `Shown ${nf(insights.search7d.impressions)} times in results this week.`,
      earned: true,
    });
  } else {
    out.push({
      id: "search-appearance",
      label: "First search appearance",
      detail: "Add searchable titles and keywords to your products.",
      earned: false,
    });
  }

  // Overnight climb (from the nightly movement fields).
  if (
    insights.prevMarketplacePosition !== null &&
    insights.marketplacePosition < insights.prevMarketplacePosition
  ) {
    out.push({
      id: "climber",
      label: "Marketplace climber",
      detail: `Up ${insights.prevMarketplacePosition - insights.marketplacePosition} place(s) overnight — #${insights.marketplacePosition} now.`,
      earned: true,
    });
  }

  return out;
}

export function MilestonesSection({
  insights,
}: {
  insights: BizInsights | null;
}) {
  if (!insights) return null;
  const all = buildMilestones(insights);
  const earned = all.filter((m) => m.earned);
  const upcoming = all.filter((m) => !m.earned);

  return (
    <Card>
      <CardHeader
        title="Milestones"
        subtitle="Achievements your shop has unlocked — and what's next"
      />
      <CardBody className="space-y-5">
        {earned.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {earned.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-teal/30 bg-teal/5 px-4 py-3"
              >
                <p className="text-[13px] font-black text-teal-dark">
                  🏆 {m.label}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">{m.detail}</p>
              </div>
            ))}
          </div>
        )}
        {upcoming.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">
              Up next
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-line px-4 py-3"
                >
                  <p className="text-[13px] font-bold text-ink-900">
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">{m.detail}</p>
                  {m.progress !== undefined && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{
                          width: `${Math.min(100, Math.round(m.progress * 100))}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {earned.length === 0 && upcoming.length === 0 && (
          <p className="text-sm text-ink-500">
            Milestones appear after your first nightly analytics run.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Executive insights — the platform explains the data, not just shows it
// ---------------------------------------------------------------------------

interface Insight {
  tone: "win" | "act" | "info";
  text: string;
}

function buildInsights(
  insights: BizInsights,
  daily: DailyStat[],
  titleOf: (id: string) => string,
): Insight[] {
  const out: Insight[] = [];
  const bench = insights.categoryBenchmark;

  // Month-over-month engagement movement from the daily rollups the
  // page already streams (last 30 full days vs the 30 before them).
  const now = new Date();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const dAgo = (n: number) => key(new Date(now.getTime() - n * 86_400_000));
  const cur = sumDaily(daily, [dAgo(30), dAgo(1)]);
  const prev = sumDaily(daily, [dAgo(60), dAgo(31)]);
  const eng = (s: DailyStat) =>
    s.profileViews + s.productViews + s.chatsStarted + s.saves;
  if (eng(prev) >= 10) {
    const pct = Math.round(((eng(cur) - eng(prev)) / eng(prev)) * 100);
    if (pct >= 5) {
      out.push({
        tone: "win",
        text: `Your engagement is up ${pct}% compared to the previous 30 days. Whatever you changed — keep doing it.`,
      });
    } else if (pct <= -15) {
      out.push({
        tone: "act",
        text: `Engagement is down ${Math.abs(pct)}% vs the previous 30 days. Fresh product photos and answering chats quickly are the two fastest levers.`,
      });
    }
  }

  // Standing vs category average.
  if (bench && bench.avgViews > 0) {
    if (bench.viewsVsAvgPct >= 10) {
      out.push({
        tone: "win",
        text: `Your visibility is ${bench.viewsVsAvgPct}% above the ${bench.category} average — customers find you more often than a typical shop in your category.`,
      });
    } else if (bench.viewsVsAvgPct <= -10) {
      out.push({
        tone: "act",
        text: `Your views are ${Math.abs(bench.viewsVsAvgPct)}% below the ${bench.category} average. More active listings with clear titles is the most reliable way to close that gap.`,
      });
    }
  }

  // Product-level: high interest, no conversations.
  const looker = [...insights.productPositions]
    .filter((p) => p.views >= 15 && p.chats === 0)
    .sort((a, b) => b.views - a.views)[0];
  if (looker) {
    out.push({
      tone: "act",
      text: `"${titleOf(looker.productId)}" has ${nf(looker.views)} views but no chats yet. Customers are interested — consider sharper pricing or better photos to convert them.`,
    });
  }

  // Viewed but rarely saved.
  const unsaved = [...insights.productPositions]
    .filter((p) => p.views >= 30 && p.saves === 0)
    .sort((a, b) => b.views - a.views)[0];
  if (unsaved && (!looker || unsaved.productId !== looker.productId)) {
    out.push({
      tone: "info",
      text: `Customers view "${titleOf(unsaved.productId)}" frequently but rarely save it — often a sign they're comparing prices before committing.`,
    });
  }

  // Search funnel: shown a lot, clicked rarely.
  const s7 = insights.search7d;
  if (s7.impressions >= 50 && s7.clicks / s7.impressions < 0.05) {
    out.push({
      tone: "act",
      text: `You appeared ${nf(s7.impressions)} times in search this week but were tapped ${nf(s7.clicks)} times. The first photo and title decide that tap — lead with your strongest product image.`,
    });
  }

  if (out.length === 0) {
    out.push({
      tone: "info",
      text: "No standout signals this week. Insights sharpen as customers browse — check back after a few days of traffic.",
    });
  }
  return out.slice(0, 5);
}

export function ExecInsightsCard({
  insights,
  daily,
  titleOf,
}: {
  insights: BizInsights | null;
  daily: DailyStat[];
  titleOf: (id: string) => string;
}) {
  if (!insights) return null;
  const rows = buildInsights(insights, daily, titleOf);
  return (
    <Card className="border-teal/40">
      <CardHeader
        title="Executive insights"
        subtitle="What the numbers mean — and what to do next"
      />
      <CardBody>
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 text-sm",
                  r.tone === "win" && "text-teal-dark",
                  r.tone === "act" && "text-orange",
                  r.tone === "info" && "text-ink-300",
                )}
              >
                {r.tone === "win" ? "▲" : r.tone === "act" ? "●" : "◦"}
              </span>
              <p className="text-[13.5px] leading-relaxed text-ink-700">
                {r.text}
              </p>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
