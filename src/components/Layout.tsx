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
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth";
import { Player } from "@/components/Player";

const navItems = [
  { to: "/", label: "Библиотека", icon: Library, end: true },
  { to: "/search", label: "Поиск", icon: Search },
  { to: "/playlists", label: "Плейлисты", icon: ListMusic },
  { to: "/favorites", label: "Избранное", icon: Heart },
];

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r bg-white p-4 md:flex">
          <div className="mb-6 flex items-center gap-2 px-2">
            <Music2 className="h-5 w-5" />
            <span className="font-semibold">Music Cloud</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
            {user && (user.role === "admin" || user.role === "uploader") && (
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <Upload className="h-4 w-4" />
                Загрузка
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <Settings className="h-4 w-4" />
                Админка
              </NavLink>
            )}
          </nav>

          <div className="mt-auto border-t pt-4">
            <p className="truncate px-3 text-sm font-medium">{user?.username}</p>
            <p className="px-3 text-xs capitalize text-muted-foreground">{user?.role}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 overflow-x-auto border-b bg-white px-4 py-2 md:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    isActive ? "bg-zinc-900 text-white" : "text-zinc-600"
                  }`
                }
              >
                <item.icon className="h-3 w-3" />
                {item.label}
              </NavLink>
            ))}
            {user && (user.role === "admin" || user.role === "uploader") && (
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`
                }
              >
                <Upload className="h-4 w-4" />
                Загрузка
              </NavLink>
            )}
            {user && (user.role === "admin" || user.role === "uploader") && (
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    isActive ? "bg-zinc-900 text-white" : "text-zinc-600"
                  }`
                }
              >
                <Upload className="h-3 w-3" />
                Загрузка
              </NavLink>
            )}
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs ${
                    isActive ? "bg-zinc-900 text-white" : "text-zinc-600"
                  }`
                }
              >
                <Settings className="h-3 w-3" />
                Админка
              </NavLink>
            )}
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>

      <Player />
    </div>
  );
}
