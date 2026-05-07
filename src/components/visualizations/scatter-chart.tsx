"use client";

import {
  ResponsiveContainer,
  ScatterChart as RechartsScatter,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from "recharts";

export interface ScatterPoint {
  id: string;
  name: string;
  x: number; // activity
  y: number; // stability
  z: number; // predicted_yield (controls dot size)
  source: "db" | "generated";
  ec_number: string | null;
  organism: string | null;
  predicted_yield: number;
  confidence_lower: number;
  confidence_upper: number;
  selected?: boolean;
}

interface Props {
  data: ScatterPoint[];
  onPointClick?: (id: string) => void;
}

export function ActivityStabilityScatter({ data, onPointClick }: Props) {
  const dbPoints = data.filter((d) => d.source === "db");
  const genPoints = data.filter((d) => d.source === "generated");

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <RechartsScatter
          margin={{ top: 16, right: 16, bottom: 28, left: 8 }}
        >
          <CartesianGrid stroke="oklch(0.27 0 0)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name="Activity"
            domain={[0, 1]}
            tickCount={6}
            stroke="oklch(0.708 0 0)"
            label={{
              value: "Activity score",
              position: "insideBottom",
              offset: -10,
              fill: "oklch(0.708 0 0)",
              fontSize: 11,
            }}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Stability"
            domain={[0, 1]}
            tickCount={6}
            stroke="oklch(0.708 0 0)"
            label={{
              value: "Stability score",
              angle: -90,
              position: "insideLeft",
              fill: "oklch(0.708 0 0)",
              fontSize: 11,
            }}
            tick={{ fontSize: 11 }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 240]} />
          <Tooltip
            cursor={{ stroke: "oklch(0.65 0.18 152)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const p = payload[0].payload as ScatterPoint;
              return (
                <div className="border-border/60 bg-card text-foreground rounded-md border p-2 text-xs shadow-md">
                  <div className="line-clamp-2 max-w-[260px] font-medium">
                    {p.name}
                  </div>
                  <div className="text-muted-foreground line-clamp-1 font-mono text-[10px]">
                    {p.ec_number ? `EC ${p.ec_number} · ` : ""}
                    {p.organism ?? ""}
                  </div>
                  <dl className="mt-1.5 grid grid-cols-2 gap-x-3 font-mono text-[11px]">
                    <dt className="text-muted-foreground">Activity</dt>
                    <dd>{p.x.toFixed(3)}</dd>
                    <dt className="text-muted-foreground">Stability</dt>
                    <dd>{p.y.toFixed(3)}</dd>
                    <dt className="text-muted-foreground">Yield</dt>
                    <dd>{p.predicted_yield.toFixed(3)}</dd>
                    <dt className="text-muted-foreground">95% CI</dt>
                    <dd>
                      {p.confidence_lower.toFixed(2)}–
                      {p.confidence_upper.toFixed(2)}
                    </dd>
                  </dl>
                </div>
              );
            }}
          />
          <Scatter
            name="DB-sourced"
            data={dbPoints}
            fill="oklch(0.65 0.21 245)"
            fillOpacity={0.85}
            onClick={(e: unknown) => {
              const p = e as ScatterPoint;
              onPointClick?.(p.id ?? "");
            }}
          />
          <Scatter
            name="AI-generated"
            data={genPoints}
            fill="oklch(0.65 0.18 152)"
            fillOpacity={0.85}
            onClick={(e: unknown) => {
              const p = e as ScatterPoint;
              onPointClick?.(p.id ?? "");
            }}
          />
        </RechartsScatter>
      </ResponsiveContainer>
    </div>
  );
}
