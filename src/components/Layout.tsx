import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  Library,
  LogOut,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Upload,
  User,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api, type Playlist } from "@/api";
import { useAuth } from "@/auth";
import { Player } from "@/components/Player";
import { NavItem } from "@/components/ui/nav-item";
import { can, canAnyLibrary, canManageServer, P } from "@/permissions";
import { ThemeToggle } from "@/theme";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/", label: "Домой", icon: Home, end: true },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/library", label: "Библиотека", icon: Library },
  { to: "/favorites", label: "Избранное", icon: Heart },
];

const mobileNav = [
  { to: "/", label: "Домой", icon: Home, end: true },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/library", label: "Библиотека", icon: Library },
  { to: "/profile", label: "Профиль", icon: User },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("mc-sidebar-collapsed") === "1",
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const canUpload = canAnyLibrary(user, P.LIBRARY_UPLOAD);
  const canManage = canManageServer(user);
  const canRoles = can(user, P.MANAGE_ROLES);
  const canTags =
    canAnyLibrary(user, P.LIBRARY_EDIT_TAGS) || canAnyLibrary(user, P.LIBRARY_UPLOAD);

  useEffect(() => {
    api
      .playlists()
      .then((loaded) => setPlaylists(loaded.slice(0, 8)))
      .catch(() => setPlaylists([]));
  }, [user?.id]);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    const section = location.pathname.split("/")[1] || "home";
    const labels: Record<string, string> = {
      home: "Домой",
      search: "Поиск",
      library: "Библиотека",
      favorites: "Избранное",
      playlists: "Плейлисты",
      artists: "Исполнитель",
      albums: "Альбом",
      profile: "Профиль",
      upload: "Загрузка",
      admin: "Управление",
    };
    const exact =
      location.pathname === "/admin/roles"
        ? "Роли"
        : location.pathname === "/admin/tags"
          ? "Теги"
          : location.pathname === "/admin"
            ? "Управление"
            : null;
    document.title = `${exact ?? labels[section] ?? "Music Cloud"} · Music Cloud`;
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!accountOpen) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [accountOpen]);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const value = searchRef.current?.value.trim();
    if (value) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem("mc-sidebar-collapsed", current ? "0" : "1");
      return !current;
    });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 flex-col border-r border-border bg-card px-2 py-3 transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-60",
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2 px-1.5")}>
            <Link
              to="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-foreground text-background"
              aria-label="Music Cloud"
            >
              <Music2 className="h-4 w-4" />
            </Link>
            {!collapsed && (
              <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
                Music Cloud
              </span>
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Свернуть меню"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="mx-auto mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Развернуть меню"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          <nav className="mt-4 space-y-0.5">
            {primaryNav.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                end={item.end}
                collapsed={collapsed}
              />
            ))}
          </nav>

          {!collapsed && playlists.length > 0 && (
            <div className="mt-5 min-h-0">
              <div className="flex items-center justify-between px-2.5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Плейлисты
                </p>
                <Link to="/playlists" className="text-[11px] text-muted-foreground hover:text-foreground">
                  Все
                </Link>
              </div>
              <div className="mt-1 space-y-0.5">
                {playlists.map((playlist) => (
                  <NavLink
                    key={playlist.id}
                    to={`/playlists/${playlist.id}`}
                    className={({ isActive }) =>
                      cn(
                        "block truncate rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        isActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )
                    }
                  >
                    {playlist.name}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {(canUpload || canManage || canRoles || canTags) && (
            <div className="mt-auto space-y-0.5 border-t border-border pt-3">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Управление
                </p>
              )}
              {canUpload && (
                <NavItem to="/upload" label="Загрузка" icon={Upload} collapsed={collapsed} />
              )}
              {canTags && <NavItem to="/admin/tags" label="Теги" icon={Tags} collapsed={collapsed} />}
              {canRoles && (
                <NavItem to="/admin/roles" label="Роли" icon={ShieldCheck} collapsed={collapsed} />
              )}
              {canManage && (
                <NavItem to="/admin" label="Управление" icon={Settings} collapsed={collapsed} end />
              )}
            </div>
          )}

          <div className={cn("relative", (canUpload || canManage || canRoles || canTags) ? "mt-2" : "mt-auto")} ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((current) => !current)}
              className={cn(
                "flex w-full items-center rounded-md py-2 transition-colors hover:bg-muted",
                collapsed ? "justify-center" : "gap-2.5 px-2",
              )}
              aria-expanded={accountOpen}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {user?.username.slice(0, 1).toUpperCase()}
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium">{user?.username}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {user?.roles[0]?.name ?? "Слушатель"}
                  </span>
                </span>
              )}
            </button>

            {accountOpen && (
              <div className="absolute bottom-full left-0 z-40 mb-2 w-56 rounded-md border border-border bg-popover p-1">
                <Link
                  to="/profile"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted"
                >
                  <User className="h-4 w-4" />
                  Профиль
                </Link>
                <div className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm">
                  <span>Тема</span>
                  <ThemeToggle />
                </div>
                {canManage && (
                  <Link
                    to="/admin"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted"
                  >
                    <Settings className="h-4 w-4" />
                    Управление
                  </Link>
                )}
                <div className="my-1 h-px bg-border" />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:h-16 md:px-6">
            <Link to="/" className="flex items-center gap-2 md:hidden" aria-label="Music Cloud">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
                <Music2 className="h-4 w-4" />
              </span>
            </Link>

            <div className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Назад"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Вперёд"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={submitSearch} className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                key={location.search}
                ref={searchRef}
                defaultValue={new URLSearchParams(location.search).get("q") ?? ""}
                placeholder="Поиск"
                className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-14 text-sm outline-none transition focus:border-foreground focus:ring-2 focus:ring-foreground/15"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                Ctrl K
              </kbd>
            </form>

            <Link
              to="/profile"
              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold hover:bg-accent"
              aria-label="Профиль"
            >
              {user?.username.slice(0, 1).toUpperCase()}
            </Link>
          </header>

          <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-8 md:py-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <Player />

      <nav className="safe-bottom shrink-0 border-t border-border bg-card px-2 py-1 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {mobileNav.map((item) => (
            <NavItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              end={item.end}
              compact
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
