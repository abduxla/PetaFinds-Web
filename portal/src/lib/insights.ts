"use client";

import { useMemo } from "react";
import {
  collection,
  doc,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useDoc, useQuerySub } from "@/lib/firestore-hooks";
import { toDate } from "@/lib/types";
import type { TierId } from "@/config/tiers";

/**
 * Data layer for the tiered Analytics (BI) module. Everything here reads
 * CACHED aggregation output (bizInsights / marketAggregates, computed by
 * the nightly job) or the per-day buckets minted by recordEngagement /
 * recordSearchEvent — never other merchants' raw documents.
 */

// ---------- nightly insights (private, per business) ----------

export interface ProductPosition {
  productId: string;
  views: number;
  chats: number;
  saves: number;
  marketplacePosition: number;
  tierPosition: number;
  categoryPosition: number;
  prevMarketplacePosition: number | null;
}

export interface BizInsights {
  date: string;
  tier: string;
  category: string;
  marketplacePosition: number;
  totalBusinesses: number;
  tierPosition: number;
  tierTotal: number;
  percentile: number;
  percentileBand: string;
  prevMarketplacePosition: number | null;
  categoryBenchmark: {
    category: string;
    avgViews: number;
    avgSaves: number;
    avgChats: number;
    myViews: number;
    mySaves: number;
    myChats: number;
    viewsVsAvgPct: number;
  } | null;
  search7d: { impressions: number; clicks: number };
  totalProducts: number;
  marketplaceProductTotal: number;
  tierProductTotal: number;
  productPositions: ProductPosition[];
}

function insightsFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): BizInsights | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    date: (d.date as string) ?? "",
    tier: (d.tier as string) ?? "listed",
    category: (d.category as string) ?? "",
    marketplacePosition: (d.marketplacePosition as number) ?? 0,
    totalBusinesses: (d.totalBusinesses as number) ?? 0,
    tierPosition: (d.tierPosition as number) ?? 0,
    tierTotal: (d.tierTotal as number) ?? 0,
    percentile: (d.percentile as number) ?? 100,
    percentileBand: (d.percentileBand as string) ?? "",
    prevMarketplacePosition:
      (d.prevMarketplacePosition as number | null) ?? null,
    categoryBenchmark: (d.categoryBenchmark as BizInsights["categoryBenchmark"]) ?? null,
    search7d: (d.search7d as BizInsights["search7d"]) ?? {
      impressions: 0,
      clicks: 0,
    },
    totalProducts: (d.totalProducts as number) ?? 0,
    marketplaceProductTotal: (d.marketplaceProductTotal as number) ?? 0,
    tierProductTotal: (d.tierProductTotal as number) ?? 0,
    productPositions:
      (d.productPositions as ProductPosition[] | undefined) ?? [],
  };
}

export function useBizInsights(businessId: string | null) {
  return useDoc(
    businessId ? doc(db, "bizInsights", businessId) : null,
    insightsFromDoc,
  );
}

// ---------- market aggregates (anonymous, marketplace-wide) ----------

export interface TermRow {
  term: string;
  searches: number;
  clicks?: number;
  growthPct?: number;
}

export interface MarketAggregates {
  date: string;
  totals: { businesses: number; products: number; categories: number };
  categoryStats: Record<
    string,
    {
      businesses: number;
      products: number;
      avgViews: number;
      avgSaves: number;
      avgChats: number;
      demandSharePct: number;
    }
  >;
  tierAverages: Partial<
    Record<
      TierId,
      {
        businesses: number;
        avgEngagement: number;
        avgViews: number;
        avgSearchImpressions7d: number;
      }
    >
  >;
  topTermsToday: TermRow[];
  topTermsWeek: TermRow[];
  topTermsMonth: TermRow[];
  trendingTerms: TermRow[];
  decliningTerms: TermRow[];
}

function aggregatesFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): MarketAggregates | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    date: (d.date as string) ?? "",
    totals: (d.totals as MarketAggregates["totals"]) ?? {
      businesses: 0,
      products: 0,
      categories: 0,
    },
    categoryStats:
      (d.categoryStats as MarketAggregates["categoryStats"]) ?? {},
    tierAverages:
      (d.tierAverages as MarketAggregates["tierAverages"]) ?? {},
    topTermsToday: (d.topTermsToday as TermRow[]) ?? [],
    topTermsWeek: (d.topTermsWeek as TermRow[]) ?? [],
    topTermsMonth: (d.topTermsMonth as TermRow[]) ?? [],
    trendingTerms: (d.trendingTerms as TermRow[]) ?? [],
    decliningTerms: (d.decliningTerms as TermRow[]) ?? [],
  };
}

export function useMarketAggregates() {
  return useDoc(doc(db, "marketAggregates", "latest"), aggregatesFromDoc);
}

// ---------- daily buckets ----------

export interface DailyStat {
  date: string;
  profileViews: number;
  productViews: number;
  chatsStarted: number;
  saves: number;
}

export interface SearchDaily {
  date: string;
  impressions: number;
  clicks: number;
  positionSum: number;
  top10: number;
}

function dailyFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): DailyStat | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    date: (d.date as string) ?? "",
    profileViews: (d.profileViews as number) ?? 0,
    productViews: (d.productViews as number) ?? 0,
    chatsStarted: (d.chatsStarted as number) ?? 0,
    saves: (d.saves as number) ?? 0,
  };
}

function searchDailyFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): SearchDaily | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  return {
    date: (d.date as string) ?? "",
    impressions: (d.impressions as number) ?? 0,
    clicks: (d.clicks as number) ?? 0,
    positionSum: (d.positionSum as number) ?? 0,
    top10: (d.top10 as number) ?? 0,
  };
}

/** Last ~62 day-buckets (covers every offered period incl. Last Month). */
export function useDailyStats(businessId: string | null) {
  const q = useMemo(
    () =>
      businessId
        ? query(
            collection(db, "stats_daily"),
            where("businessId", "==", businessId),
            orderBy("date", "desc"),
            limit(62),
          )
        : null,
    [businessId],
  );
  return useQuerySub(q, dailyFromDoc, `daily-${businessId ?? "none"}`);
}

export function useSearchDaily(businessId: string | null) {
  const q = useMemo(
    () =>
      businessId
        ? query(
            collection(db, "search_daily"),
            where("businessId", "==", businessId),
            orderBy("date", "desc"),
            limit(62),
          )
        : null,
    [businessId],
  );
  return useQuerySub(q, searchDailyFromDoc, `sdaily-${businessId ?? "none"}`);
}

// ---------- product catalogue join (titles / health) ----------

export interface ProductLite {
  id: string;
  title: string;
  hasImage: boolean;
  hasPrice: boolean;
  isActive: boolean;
  createdAt: Date | null;
}

function productLiteFromDoc(
  snap: DocumentSnapshot<DocumentData>,
): ProductLite | null {
  if (!snap.exists()) return null;
  const d = snap.data() ?? {};
  const price = d.priceLkr as number | null | undefined;
  return {
    id: snap.id,
    title: (d.title as string) ?? "Product",
    hasImage: Boolean((d.image1Url as string) ?? ""),
    hasPrice: typeof price === "number" && price > 0,
    isActive: d.isActive !== false,
    createdAt: toDate(d.createdAt),
  };
}

export function useBusinessProducts(businessId: string | null) {
  const q = useMemo(
    () =>
      businessId
        ? query(
            collection(db, "products"),
            where("businessId", "==", businessId),
          )
        : null,
    [businessId],
  );
  return useQuerySub(q, productLiteFromDoc, `prods-${businessId ?? "none"}`);
}

// ---------- period math ----------

export type PeriodId =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "thisMonth"
  | "lastMonth"
  | "lifetime";

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "lifetime", label: "Lifetime" },
];

function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** [fromKey, toKey] inclusive for a period, in local calendar days.
 *  Returns null for "lifetime" (callers use lifetime counters instead). */
export function periodRange(p: PeriodId): [string, string] | null {
  const now = new Date();
  const ago = (n: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
  switch (p) {
    case "today":
      return [dayKey(now), dayKey(now)];
    case "yesterday":
      return [dayKey(ago(1)), dayKey(ago(1))];
    case "7d":
      return [dayKey(ago(6)), dayKey(now)];
    case "30d":
      return [dayKey(ago(29)), dayKey(now)];
    case "thisMonth":
      return [
        dayKey(new Date(now.getFullYear(), now.getMonth(), 1)),
        dayKey(now),
      ];
    case "lastMonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return [dayKey(first), dayKey(last)];
    }
    case "lifetime":
      return null;
  }
}

export function inRange(
  date: string,
  range: [string, string] | null,
): boolean {
  if (!range) return true;
  return date >= range[0] && date <= range[1];
}

export function sumDaily(
  rows: DailyStat[],
  range: [string, string] | null,
): DailyStat {
  const out = {
    date: "",
    profileViews: 0,
    productViews: 0,
    chatsStarted: 0,
    saves: 0,
  };
  for (const r of rows) {
    if (!inRange(r.date, range)) continue;
    out.profileViews += r.profileViews;
    out.productViews += r.productViews;
    out.chatsStarted += r.chatsStarted;
    out.saves += r.saves;
  }
  return out;
}

export function sumSearch(
  rows: SearchDaily[],
  range: [string, string] | null,
): SearchDaily {
  const out = { date: "", impressions: 0, clicks: 0, positionSum: 0, top10: 0 };
  for (const r of rows) {
    if (!inRange(r.date, range)) continue;
    out.impressions += r.impressions;
    out.clicks += r.clicks;
    out.positionSum += r.positionSum;
    out.top10 += r.top10;
  }
  return out;
}
