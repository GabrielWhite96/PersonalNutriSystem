import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-input bg-background p-1 shadow-sm",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
      {...props}
    />
  );
}

export function ButtonGroupText({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center justify-center px-2 text-xs font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
