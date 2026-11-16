import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function EntityHeader({
  kind,
  title,
  meta,
  artwork,
  actions,
  backTo,
  backLabel,
}: {
  kind: string;
  title: string;
  meta?: ReactNode;
  artwork: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-5">
      {backTo && backLabel && (
        <Link
          to={backTo}
          className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="h-40 w-40 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-48 sm:w-48 md:h-60 md:w-60">
          {artwork}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {kind}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-[-0.03em] md:text-[40px] md:leading-[1.05]">
            {title}
          </h1>
          {meta && <div className="mt-2 text-sm text-muted-foreground">{meta}</div>}
          {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
