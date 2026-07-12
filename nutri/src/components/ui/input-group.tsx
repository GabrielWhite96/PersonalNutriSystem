import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InputGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupAddon({
  align,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { align?: "block-end" | "block-start" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "block-start" ? "order-first" : "order-last",
        className,
      )}
      {...props}
    />
  );
}

export function InputGroupButton({
  className,
  ...props
}: ButtonProps) {
  return <Button className={cn(className)} {...props} />;
}

export const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-16 w-full resize-none border-0 bg-transparent px-1 py-0 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});

InputGroupTextarea.displayName = "InputGroupTextarea";
