"use client";

import { useRef, useState } from "react";

/**
 * Dependency-free SVG charts for the Analytics module, built to the
 * dataviz spec: thin marks, 2px lines, 4px rounded data-ends anchored to
 * the baseline, recessive grid, hover tooltips, text in ink tokens
 * (never the series color).
 *
 * Palette: validated mark hues (chroma/contrast/CVD-checked on white) —
 * NOT the raw brand tokens, which fail the chroma floor at mark size.
 *   data-teal   #0f9e97  primary series / magnitude
 *   data-orange #c96a0d  the highlighted "you" entity in comparisons
 */
export const DATA_TEAL = "#0f9e97";
export const DATA_ORANGE = "#c96a0d";
const GRID = "#e8e8e4";
const INK_MUTED = "#78786e";

interface Point {
  label: string;
  value: number;
}

/** Single-series trend: 2px line + soft area, crosshair hover tooltip.
 *  One series → no legend; the surrounding card title names it. */
export function TrendChart({
  points,
  height = 120,
  color = DATA_TEAL,
  valueLabel = "",
}: {
  points: Point[];
  height?: number;
  color?: string;
  valueLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const W = 600;
  const H = height;
  const PAD = 6;

  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-ink-500">
        No data yet for this period.
      </p>
    );
  }

  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) =>
    PAD + (points.length === 1 ? (W - 2 * PAD) / 2
      : (i * (W - 2 * PAD)) / (points.length - 1));
  const y = (v: number) => H - PAD - (v / max) * (H - 2 * PAD - 14);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const area =
    `${path} L${x(points.length - 1).toFixed(1)},${H - PAD} ` +
    `L${x(0).toFixed(1)},${H - PAD} Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((_, i) => {
      const d = Math.abs(x(i) - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  return (
    <div ref={ref} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={valueLabel || "Trend"}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* recessive grid: 3 lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + 14 + f * (H - 2 * PAD - 14)}
            y2={PAD + 14 + f * (H - 2 * PAD - 14)}
            stroke={GRID}
            strokeWidth={1}
          />
        ))}
        <path d={area} fill={color} opacity={0.08} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} />
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD}
              y2={H - PAD}
              stroke={INK_MUTED}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={x(hover)}
              cy={y(points[hover].value)}
              r={4}
              fill={color}
              stroke="#fff"
              strokeWidth={2}
            />
          </>
        )}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > points.length / 2 ? "-105%" : "5%"})`,
          }}
        >
          <span className="font-bold text-ink-900">
            {points[hover].value.toLocaleString()}
          </span>{" "}
          <span className="text-ink-500">
            {valueLabel} · {points[hover].label}
          </span>
        </div>
      )}
    </div>
  );
}

export interface BarRow {
  label: string;
  value: number;
  /** The "you" entity in anonymous comparisons — rendered in data-orange. */
  highlight?: boolean;
  /** Optional right-side annotation (e.g. "22%"). */
  annotation?: string;
}

/** Horizontal bars, single hue + one highlight hue; 4px rounded data-end,
 *  2px row gaps, direct value labels in ink. */
export function HBars({
  rows,
  maxValue,
}: {
  rows: BarRow[];
  maxValue?: number;
}) {
  const max = Math.max(1, maxValue ?? Math.max(...rows.map((r) => r.value)));
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-ink-500">No data yet.</p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="group">
          <div className="mb-0.5 flex items-baseline justify-between gap-3">
            <span
              className={`truncate text-[13px] ${r.highlight ? "font-bold text-ink-900" : "text-ink-700"}`}
            >
              {r.label}
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-ink-900">
              {r.value.toLocaleString()}
              {r.annotation && (
                <span className="ml-1.5 font-normal text-ink-500">
                  {r.annotation}
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-[4px] bg-bg-section">
            <div
              className="h-full rounded-r-[4px] transition-[width] duration-300"
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                background: r.highlight ? DATA_ORANGE : DATA_TEAL,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Conversion funnel: stage bars scaled to the first stage, conversion %
 *  between stages, weakest hand-off flagged as the bottleneck. */
export function FunnelChart({
  stages,
}: {
  stages: { label: string; value: number }[];
}) {
  if (stages.length === 0 || stages[0].value === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-ink-500">
        The funnel appears once search impressions start arriving.
      </p>
    );
  }
  const first = stages[0].value;
  const conversions = stages.slice(1).map((s, i) => ({
    pct: stages[i].value > 0 ? (s.value / stages[i].value) * 100 : 0,
  }));
  const weakest =
    conversions.length > 0
      ? conversions.reduce(
          (min, c, i) => (c.pct < conversions[min].pct ? i : min),
          0,
        )
      : -1;

  return (
    <div className="space-y-1">
      {stages.map((s, i) => (
        <div key={s.label}>
          {i > 0 && (
            <div className="flex items-center gap-2 py-1 pl-1">
              <span className="text-ink-300">↓</span>
              <span
                className={`text-xs font-semibold ${
                  i - 1 === weakest ? "text-danger" : "text-ink-500"
                }`}
              >
                {conversions[i - 1].pct.toFixed(1)}%
                {i - 1 === weakest && " · bottleneck"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="h-7 flex-1 overflow-hidden rounded-[4px] bg-bg-section">
              <div
                className="flex h-full items-center rounded-r-[4px] px-2"
                style={{
                  width: `${Math.max(3, (s.value / first) * 100)}%`,
                  background: DATA_TEAL,
                }}
              />
            </div>
            <div className="w-40 shrink-0 text-[13px]">
              <span className="font-bold text-ink-900">
                {s.value.toLocaleString()}
              </span>{" "}
              <span className="text-ink-500">{s.label}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Movement indicator vs the previous nightly run. */
export function Movement({
  current,
  prev,
}: {
  current: number;
  prev: number | null;
}) {
  if (prev === null || prev === current) {
    return <span className="text-xs text-ink-300">–</span>;
  }
  const up = current < prev; // lower position number = better
  return (
    <span
      className={`text-xs font-bold ${up ? "text-success" : "text-danger"}`}
    >
      {up ? "▲" : "▼"} {Math.abs(prev - current)}
    </span>
  );
}
