import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  goal?: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  className?: string;
};

export function MacroRing({
  value,
  goal,
  size = 160,
  strokeWidth = 12,
  label = "kcal",
  unit,
  className,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = goal && goal > 0 ? Math.min(1, value / goal) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth={strokeWidth}
        />
        {goal ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-macro-kcal)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 500ms ease-out" }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl font-semibold tabular-nums">{fmtNum(value)}</div>
        <div className="text-xs text-muted-foreground">
          {goal ? `de ${fmtNum(goal)} ${label}` : `${label}${unit ? " " + unit : ""}`}
        </div>
      </div>
    </div>
  );
}

type MacroBarProps = {
  name: string;
  value: number;
  goal?: number | null;
  color: string; // css var like "var(--color-macro-protein)"
  unit?: string;
};
export function MacroBar({ name, value, goal, color, unit = "g" }: MacroBarProps) {
  const pct = goal && goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{name}</span>
        <span className="tabular-nums font-medium">
          {fmtNum(value)}
          <span className="text-muted-foreground">
            {goal ? ` / ${fmtNum(goal)}` : ""} {unit}
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
