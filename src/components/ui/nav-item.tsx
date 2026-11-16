import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

export function NavItem({
  to,
  label,
  icon: Icon,
  end,
  collapsed,
  compact,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  collapsed?: boolean;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) =>
          cn(
            "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px] font-medium transition-colors",
            isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
          )
        }
      >
        <Icon className="h-5 w-5" />
        {label}
      </NavLink>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
          isActive
            ? "bg-muted font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          collapsed && "justify-center px-0",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && !collapsed && (
            <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
          )}
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}
