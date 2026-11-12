import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ShieldCheck, Trash2, Users } from "lucide-react";

import {
  api,
  ApiError,
  type AdminUser,
  type AuditRecord,
  type PermissionInfo,
  type RoleRecord,
} from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { can, P } from "@/permissions";
import { useToast } from "@/toast";
import { plural } from "@/lib/plural";
import { cn } from "@/lib/utils";

function colorToHex(color: number | null) {
  return color === null ? "#f97316" : `#${color.toString(16).padStart(6, "0")}`;
}

function hexToColor(value: string) {
  return Number.parseInt(value.replace("#", ""), 16);
}

export function RolesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"permissions" | "members">("permissions");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f97316");
  const [bits, setBits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#38bdf8");

  const selected = roles.find((role) => role.id === selectedId) ?? null;
  const isAdmin = can(user, P.ADMINISTRATOR);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedRoles, loadedPermissions, loadedUsers] = await Promise.all([
        api.roles(),
        api.permissionCatalog(),
        api.admin.users(),
      ]);
      setRoles(loadedRoles);
      setPermissions(loadedPermissions);
      setUsers(loadedUsers);
      if (can(user, P.VIEW_AUDIT_LOG)) {
        setAudit(await api.auditLog().catch(() => []));
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить роли");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (roles.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !roles.some((role) => role.id === selectedId)) {
      setSelectedId(roles[0].id);
    }
  }, [roles, selectedId]);

  useEffect(() => {
    if (!selected) {
      return;
    }
    setName(selected.name);
    setColor(colorToHex(selected.color));
    setBits(selected.permissions);
  }, [selected]);

  const groups = useMemo(() => {
    const result = new Map<string, PermissionInfo[]>();
    for (const permission of permissions) {
      const list = result.get(permission.group) ?? [];
      list.push(permission);
      result.set(permission.group, list);
    }
    return [...result.entries()];
  }, [permissions]);

  const toggleBit = (bit: number) => {
    setBits((current) => current ^ (1 << bit));
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateRole(selected.id, {
        ...(selected.is_everyone ? {} : { name, color: hexToColor(color) }),
        permissions: bits,
      });
      await load();
      toast("Роль сохранена");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось сохранить роль");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`Удалить роль «${selected.name}»?`)) return;
    setBusy(true);
    try {
      await api.deleteRole(selected.id);
      setSelectedId(null);
      await load();
      toast("Роль удалена");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось удалить роль");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const role = await api.createRole({
        name: newName.trim(),
        color: hexToColor(newColor),
        permissions: P.PLAYLIST_CREATE | P.PLAYLIST_SHARE | P.TRANSCODE,
      });
      setCreateOpen(false);
      setNewName("");
      await load();
      setSelectedId(role.id);
      toast("Роль создана");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать роль");
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = async (member: AdminUser, role: RoleRecord, checked: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (checked) {
        await api.assignRole(member.id, role.id);
      } else {
        await api.unassignRole(member.id, role.id);
      }
      const loadedUsers = await api.admin.users();
      setUsers(loadedUsers);
      const loadedRoles = await api.roles();
      setRoles(loadedRoles);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось изменить участников");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загружаем роли…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Управление
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Роли</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Права как в Discord: роли, участники и переопределения на библиотеках и плейлистах.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Новая роль
        </Button>
      </div>

      {error && (
        <div className="mc-surface bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedId(role.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                role.id === selectedId
                  ? "bg-primary/10 ring-1 ring-inset ring-primary/15"
                  : "hover:bg-accent/60",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorToHex(role.color) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{role.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {role.is_everyone
                    ? "системная"
                    : `${role.member_count} ${plural(role.member_count, "участник", "участника", "участников")}`}
                </span>
              </span>
            </button>
          ))}
        </aside>

        {selected && (
          <section className="space-y-5">
            <div className="mc-surface p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: colorToHex(selected.color) }}
                  />
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  {selected.is_everyone && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      @everyone
                    </span>
                  )}
                </div>
                {!selected.is_everyone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                )}
              </div>

              <div className="mt-4 flex gap-1 rounded-full bg-card/60 p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setTab("permissions")}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                    tab === "permissions"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Права
                </button>
                {!selected.is_everyone && (
                  <button
                    type="button"
                    onClick={() => setTab("members")}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                      tab === "members"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Участники
                  </button>
                )}
              </div>

              {tab === "permissions" && (
                <div className="mt-5 space-y-5">
                  {!selected.is_everyone && (
                    <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                      <label className="block space-y-1.5 text-sm">
                        <span className="font-medium">Название</span>
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          className="mc-field"
                        />
                      </label>
                      <label className="block space-y-1.5 text-sm">
                        <span className="font-medium">Цвет</span>
                        <input
                          type="color"
                          value={color}
                          onChange={(event) => setColor(event.target.value)}
                          className="mc-field h-10 p-1"
                        />
                      </label>
                    </div>
                  )}

                  {groups.map(([group, items]) => (
                    <div key={group}>
                      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {group}
                      </h3>
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {items.map((permission) => {
                          const checked = (bits & (1 << permission.bit)) !== 0;
                          const disabled =
                            (!isAdmin && permission.key === "administrator") ||
                            (selected.is_everyone && permission.key === "administrator");
                          return (
                            <button
                              key={permission.key}
                              type="button"
                              role="switch"
                              aria-checked={checked}
                              disabled={disabled}
                              onClick={() => toggleBit(permission.bit)}
                              className={cn(
                                "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition",
                                checked ? "bg-primary/10" : "bg-card/40 hover:bg-accent/50",
                                disabled && "cursor-not-allowed opacity-50",
                              )}
                            >
                              <span className="text-sm">{permission.label}</span>
                              <span
                                className={cn(
                                  "relative h-5 w-9 shrink-0 rounded-full transition",
                                  checked ? "bg-primary" : "bg-muted",
                                )}
                              >
                                <span
                                  className={cn(
                                    "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                                    checked ? "left-[18px]" : "left-0.5",
                                  )}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <Button onClick={() => void save()} disabled={busy}>
                    {busy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="mr-2 h-4 w-4" />
                    )}
                    Сохранить роль
                  </Button>
                </div>
              )}

              {tab === "members" && !selected.is_everyone && (
                <div className="mt-5 space-y-2">
                  {users.map((member) => {
                    const assigned = member.roles.some((role) => role.id === selected.id);
                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-accent/50"
                      >
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={(event) =>
                            void toggleMember(member, selected, event.target.checked)
                          }
                          disabled={busy}
                          className="h-4 w-4 accent-primary"
                        />
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {member.username.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {member.username}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {member.roles.map((role) => role.name).join(", ") || "Без ролей"}
                          </span>
                        </span>
                        {!member.is_active && (
                          <span className="text-[10px] text-muted-foreground">отключён</span>
                        )}
                      </label>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-sm text-muted-foreground">Пользователей пока нет.</p>
                  )}
                </div>
              )}
            </div>

            {can(user, P.VIEW_AUDIT_LOG) && audit.length > 0 && (
              <div className="mc-surface p-4">
                <h2 className="text-sm font-semibold">Журнал изменений</h2>
                <div className="mt-3 divide-y divide-border/40">
                  {audit.slice(0, 20).map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-muted-foreground">
                        {entry.actor ?? "система"} · {entry.target_type}
                      </span>
                      <span className="ml-auto text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString("ru-RU")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новая роль"
        description="Создайте роль и настройте права. Участников можно добавить после."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={() => void create()} disabled={busy || !newName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Создать
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Название</span>
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="mc-field"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Цвет</span>
            <input
              type="color"
              value={newColor}
              onChange={(event) => setNewColor(event.target.value)}
              className="mc-field h-10 p-1"
            />
          </label>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          После создания откройте вкладку «Права» и настройте доступы.
        </p>
      </Dialog>
    </div>
  );
}
