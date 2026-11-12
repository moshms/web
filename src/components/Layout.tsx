import {
  Heart,
  Library,
  ListMusic,
  LogOut,
  Music2,
  Search,
  Settings,
  Upload,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth";
import { Player } from "@/components/Player";
import { ThemeToggle } from "@/theme";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Библиотека", short: "Библиотека", icon: Library, end: true },
  { to: "/search", label: "Поиск", short: "Поиск", icon: Search },
  { to: "/playlists", label: "Плейлисты", short: "Плейлисты", icon: ListMusic },
  { to: "/favorites", label: "Избранное", short: "Избранное", icon: Heart },
];

const roleLabels = {
  admin: "Администратор",
  uploader: "Загрузчик",
  listener: "Слушатель",
} as const;

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const canUpload = user?.role === "admin" || user?.role === "uploader";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    const section = location.pathname.split("/")[1];
    const labels: Record<string, string> = {
      "": "Библиотека",
      search: "Поиск",
      playlists: "Плейлисты",
      favorites: "Избранное",
      artists: "Исполнитель",
      albums: "Альбом",
      upload: "Загрузка",
      admin: "Админка",
    };
    document.title = section ? `${labels[section] ?? "Music Cloud"} · Music Cloud` : "Music Cloud";
  }, [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const mobileItems = [
    ...navItems,
    ...(canUpload
      ? [{ to: "/upload", label: "Загрузка", short: "Загрузка", icon: Upload }]
      : []),
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/70 bg-card/40 px-3 py-4 md:flex">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 via-primary to-orange-600 text-white shadow-glow">
              <Music2 className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold tracking-tight">Music Cloud</span>
              <span className="block text-[11px] text-muted-foreground">
                ваша коллекция
              </span>
            </span>
          </Link>

          <nav className="mt-6 space-y-1">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Обзор
            </p>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}

            {(canUpload || isAdmin) && (
              <>
                <p className="px-3 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                  Управление
                </p>
                {canUpload && (
                  <NavLink
                    to="/upload"
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                      )
                    }
                  >
                    <Upload className="h-[18px] w-[18px]" />
                    Загрузка
                  </NavLink>
                )}
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                      )
                    }
                  >
                    <Settings className="h-[18px] w-[18px]" />
                    Админка
                  </NavLink>
                )}
              </>
            )}
          </nav>

          <div className="mt-auto space-y-2">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-orange-600 text-sm font-semibold text-primary-foreground">
                  {user?.username.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user?.username}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user ? roleLabels[user.role] : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur md:h-16 md:px-6">
            <Link to="/" className="flex items-center gap-2 md:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                <Music2 className="h-4 w-4" />
              </span>
              <span className="font-semibold tracking-tight">Music Cloud</span>
            </Link>

            <Link
              to="/search"
              className="hidden h-9 w-full max-w-md items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 text-sm text-muted-foreground transition hover:border-primary/30 hover:text-foreground sm:flex"
            >
              <Search className="h-4 w-4" />
              Поиск в библиотеке…
            </Link>

            <div className="ml-auto flex items-center gap-1">
              <Link
                to="/search"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground sm:hidden"
                aria-label="Поиск"
              >
                <Search className="h-4 w-4" />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
                  aria-label="Админка"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              )}
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
                aria-label="Выйти"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main ref={mainRef} className="relative min-h-0 flex-1 overflow-y-auto">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent" />
            <div className="relative mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Player />

      <nav className="safe-bottom shrink-0 border-t border-border/70 bg-card/90 px-2 py-1.5 backdrop-blur md:hidden">
        <div
          className="mx-auto grid max-w-md gap-1"
          style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        >
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={"end" in item ? item.end : undefined}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.short}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
