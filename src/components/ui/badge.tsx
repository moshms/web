import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "muted",
  className,
}: {
  children: ReactNode;
  variant?: "muted" | "outline" | "solid" | "destructive";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "muted" && "bg-muted text-muted-foreground",
        variant === "outline" && "border border-border text-muted-foreground",
        variant === "solid" && "bg-foreground text-background",
        variant === "destructive" && "bg-destructive/10 text-destructive",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        active ? "bg-foreground" : "border border-muted-foreground/60",
      )}
      aria-hidden="true"
    />
  );
}
