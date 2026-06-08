"use client";

/**
 * Lightweight, dependency-free SVG charts for the GT Afrik dashboard.
 * Brand-aligned: Brand Blue line, blue->green gradient area fill, Brand Green
 * accent on the peak. Compositor-friendly (no layout animation).
 */

export type TrendPoint = { label: string; value: number };

const BRAND_BLUE = "#3866ff";
const BRAND_GREEN = "#32c96f";

export function MonthlyTrend({
  points,
  height = 200,
}: {
  points: TrendPoint[];
  height?: number;
}) {
  const width = 760;
  const padX = 36;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  if (points.length === 0) {
    return (
      <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--text-muted)" }}>
        No installation history in this range.
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const x = (i: number) => padX + stepX * i;
  const y = (v: number) => padTop + plotH - (v / max) * plotH;

  const peakIdx = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L ${x(points.length - 1).toFixed(1)} ${padTop + plotH} L ${x(0).toFixed(1)} ${padTop + plotH} Z`;

  // Show at most ~8 axis labels to avoid clutter.
  const labelEvery = Math.ceil(points.length / 8);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monthly installations trend" style={{ display: "block" }}>
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={BRAND_BLUE} stopOpacity="0.22" />
          <stop offset="100%" stopColor={BRAND_GREEN} stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="trendStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BRAND_BLUE} />
          <stop offset="100%" stopColor={BRAND_GREEN} />
        </linearGradient>
      </defs>

      {/* gridlines */}
      {[0, 0.5, 1].map((g) => (
        <line
          key={g}
          x1={padX}
          x2={width - padX}
          y1={padTop + plotH * g}
          y2={padTop + plotH * g}
          stroke="var(--border-subtle)"
          strokeWidth="1"
        />
      ))}

      <path d={area} fill="url(#trendFill)" />
      <path d={line} fill="none" stroke="url(#trendStroke)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <g key={p.label}>
          {i === peakIdx && (
            <circle cx={x(i)} cy={y(p.value)} r="4.5" fill={BRAND_GREEN} stroke="var(--surface-2)" strokeWidth="2" />
          )}
          {i % labelEvery === 0 && (
            <text x={x(i)} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
              {p.label}
            </text>
          )}
        </g>
      ))}

      {/* peak value label */}
      <text x={x(peakIdx)} y={y(points[peakIdx].value) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={BRAND_GREEN}>
        {points[peakIdx].value}
      </text>
    </svg>
  );
}

export type BarItem = { label: string; value: number; color: string };

export function BranchBars({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((it) => (
        <div key={it.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{it.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: it.color }}>{it.value.toLocaleString()}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, backgroundColor: "var(--surface-3)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(it.value / max) * 100}%`,
                borderRadius: 4,
                backgroundColor: it.color,
                transition: "width 0.6s var(--ease-out-quart)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
