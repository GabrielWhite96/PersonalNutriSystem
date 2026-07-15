import { fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  goal?: number | null;
  /** Used as visual scale when the user has no goal set. */
  softGoal?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  unit?: string;
  className?: string;
};

function toPositiveNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function MacroRing({
  value,
  goal,
  softGoal = 2000,
  size = 160,
  strokeWidth = 12,
  label = "kcal",
  unit,
  className,
}: Props) {
  const numericValue = Number(value) || 0;
  const personalGoal = toPositiveNumber(goal);
  const scale = personalGoal ?? softGoal;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = scale > 0 ? Math.min(1, numericValue / scale) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--macro-kcal)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 500ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-serif text-3xl font-semibold tabular-nums">{fmtNum(numericValue)}</div>
        <div className="text-xs text-muted-foreground">
          {personalGoal
            ? `de ${fmtNum(personalGoal)} ${label}`
            : `${label}${unit ? ` ${unit}` : ""}`}
        </div>
      </div>
    </div>
  );
}

type MacroBarProps = {
  name: string;
  value: number;
  goal?: number | null;
  /** Used as visual scale when the user has no goal set. */
  softGoal?: number;
  color: string; // css var like "var(--macro-protein)"
  unit?: string;
};

export function MacroBar({
  name,
  value,
  goal,
  softGoal = 100,
  color,
  unit = "g",
}: MacroBarProps) {
  const numericValue = Number(value) || 0;
  const personalGoal = toPositiveNumber(goal);
  const scale = personalGoal ?? softGoal;
  const pct = scale > 0 ? Math.min(100, (numericValue / scale) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{name}</span>
        <span className="tabular-nums font-medium">
          {fmtNum(numericValue)}
          <span className="text-muted-foreground">
            {personalGoal ? ` / ${fmtNum(personalGoal)}` : ""} {unit}
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
