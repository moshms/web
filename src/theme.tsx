import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
  cycle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "mc-theme";
const order: Theme[] = ["dark", "light", "system"];

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [dark, setDark] = useState(() => {
    const initial = readTheme();
    return initial === "dark" || (initial === "system" && systemDark());
  });

  const apply = useCallback((next: Theme) => {
    const isDark = next === "dark" || (next === "system" && systemDark());
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    setDark(isDark);
  }, []);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, apply]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readTheme() === "system") {
        apply("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [apply]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const cycle = useCallback(
    () => setThemeState((current) => order[(order.indexOf(current) + 1) % order.length]),
    [],
  );

  const value = useMemo(
    () => ({
      theme,
      resolved: dark ? ("dark" as const) : ("light" as const),
      setTheme,
      cycle,
    }),
    [theme, dark, setTheme, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, cycle } = useTheme();
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const label =
    theme === "light" ? "Светлая тема" : theme === "dark" ? "Тёмная тема" : "Системная тема";

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label}. Переключить`}
      aria-label={`${label}. Переключить тему`}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
