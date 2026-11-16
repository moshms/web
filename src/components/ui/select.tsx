import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn("mc-select", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
