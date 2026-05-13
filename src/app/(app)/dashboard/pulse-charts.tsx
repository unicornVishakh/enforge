"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PREDICTIONS = [
  { week: "W14", value: 18 },
  { week: "W15", value: 31 },
  { week: "W16", value: 47 },
  { week: "W17", value: 62 },
  { week: "W18", value: 84 },
  { week: "W19", value: 96 },
  { week: "W20", value: 124 },
];

const BAND = [
  { week: "W14", band: 15 },
  { week: "W15", band: 14.2 },
  { week: "W16", band: 12.8 },
  { week: "W17", band: 11.6 },
  { week: "W18", band: 10.4 },
  { week: "W19", band: 9.5 },
  { week: "W20", band: 8.8 },
];

const CORPUS = [
  { category: "Dehydratase", n: 11 },
  { category: "Oligomerase", n: 9 },
  { category: "Reductase", n: 7 },
  { category: "Wildtype", n: 4 },
];

const AXIS = "oklch(0.48 0.025 258)";
const GRID = "oklch(0.91 0.008 250)";
const PRIMARY = "oklch(0.24 0.07 260)";
const ACCENT = "oklch(0.46 0.16 264)";
const HIGHLIGHT = "oklch(0.68 0.13 60)";

const TICK = { fill: AXIS, fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" };

function tooltipStyle() {
  return {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 12,
    padding: "8px 10px",
  } as React.CSSProperties;
}

export function PredictionsArea() {
  return (
    <ChartFrame
      eyebrow="Activity · Predictions logged"
      title="Cumulative predictions, week 14 → 20"
      caption="Each prediction is written to an immutable log with sequence, model version, and 95% CI. The slope is the programme's velocity."
      stat="124"
      statLabel="predictions this quarter"
    >
      <AreaChart data={PREDICTIONS} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.32} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" tick={TICK} stroke={GRID} tickLine={false} />
        <YAxis tick={TICK} stroke={GRID} tickLine={false} width={32} />
        <Tooltip
          contentStyle={tooltipStyle()}
          labelStyle={{ color: PRIMARY, fontWeight: 600 }}
          formatter={(v) => [`${v}`, "predictions"]}
          cursor={{ stroke: ACCENT, strokeOpacity: 0.25, strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={ACCENT}
          strokeWidth={1.8}
          fill="url(#pulseFill)"
          isAnimationActive
          animationDuration={1400}
          animationEasing="ease-out"
          dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }}
          activeDot={{ r: 4.5, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartFrame>
  );
}

export function CalibrationLine() {
  return (
    <ChartFrame
      eyebrow="Calibration · CI band"
      title="Default interval, narrowing with bench feedback"
      caption="The interval-widening multiplier converges as the bench returns measurements. The default ±15% band tightens to roughly ±9% by week 20."
      stat="± 8.8 %"
      statLabel="current default band"
    >
      <LineChart data={BAND} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="week" tick={TICK} stroke={GRID} tickLine={false} />
        <YAxis
          tick={TICK}
          stroke={GRID}
          tickLine={false}
          width={36}
          unit="%"
          domain={[6, 16]}
        />
        <ReferenceLine
          y={15}
          stroke={HIGHLIGHT}
          strokeDasharray="3 4"
          ifOverflow="extendDomain"
          label={{
            value: "default ±15%",
            position: "insideTopRight",
            fill: HIGHLIGHT,
            fontSize: 10,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        />
        <Tooltip
          contentStyle={tooltipStyle()}
          labelStyle={{ color: PRIMARY, fontWeight: 600 }}
          formatter={(v) => [`±${Number(v).toFixed(1)}%`, "CI band"]}
          cursor={{ stroke: ACCENT, strokeOpacity: 0.25, strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="band"
          stroke={ACCENT}
          strokeWidth={2}
          dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }}
          activeDot={{ r: 4.5, fill: ACCENT, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive
          animationDuration={1600}
          animationEasing="ease-out"
        />
      </LineChart>
    </ChartFrame>
  );
}

export function CorpusBars() {
  return (
    <ChartFrame
      eyebrow="Corpus · Composition"
      title="Programme wildtypes by enzyme class"
      caption="The pre-curated 31-enzyme corpus broken down by class. Dehydratase coverage is deepest because the dehydration step has the most published wildtype starting points."
      stat="31"
      statLabel="wildtypes total"
    >
      <BarChart data={CORPUS} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ ...TICK, fontSize: 10 }}
          stroke={GRID}
          tickLine={false}
        />
        <YAxis tick={TICK} stroke={GRID} tickLine={false} width={28} />
        <Tooltip
          contentStyle={tooltipStyle()}
          labelStyle={{ color: PRIMARY, fontWeight: 600 }}
          formatter={(v) => [`${v}`, "wildtypes"]}
          cursor={{ fill: ACCENT, fillOpacity: 0.06 }}
        />
        <Bar
          dataKey="n"
          fill={PRIMARY}
          radius={[3, 3, 0, 0]}
          isAnimationActive
          animationDuration={1300}
          animationEasing="ease-out"
        />
      </BarChart>
    </ChartFrame>
  );
}

function ChartFrame({
  children,
  eyebrow,
  title,
  caption,
  stat,
  statLabel,
}: {
  children: React.ReactElement;
  eyebrow: string;
  title: string;
  caption: string;
  stat: string;
  statLabel: string;
}) {
  return (
    <div className="border-border/80 bg-card flex flex-col overflow-hidden rounded-lg border">
      <div className="border-border/80 flex items-start justify-between gap-4 border-b p-5">
        <div>
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase">
            <span className="bg-highlight inline-block h-[3px] w-5" />
            <span>{eyebrow}</span>
          </div>
          <h3 className="font-display text-foreground mt-2 text-[15px] font-semibold tracking-[-0.012em]">
            {title}
          </h3>
        </div>
        <div className="text-right">
          <div className="text-foreground font-mono text-[1.35rem] font-medium tabular-nums">
            {stat}
          </div>
          <div className="text-muted-foreground mt-0.5 text-[10px] tracking-wide uppercase">
            {statLabel}
          </div>
        </div>
      </div>
      <div className="h-44 px-1 py-3">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
      <p className="border-border/80 text-muted-foreground border-t p-4 text-[12px] leading-relaxed">
        {caption}
      </p>
    </div>
  );
}
