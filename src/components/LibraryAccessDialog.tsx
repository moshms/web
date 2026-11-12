import { useEffect, useState } from "react";
import { Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";

import {
  api,
  ApiError,
  type Library,
  type PermissionOverwrite,
} from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { P } from "@/permissions";
import { useToast } from "@/toast";

type AvailableRole = { id: string; name: string; color: number | null; is_everyone: boolean };
type AvailableUser = { id: string; username: string };

const levels = [
  { key: "deny", label: "Запретить", allow: 0, deny: P.LIBRARY_VIEW },
  { key: "view", label: "Слушать", allow: P.LIBRARY_VIEW, deny: 0 },
  { key: "download", label: "Скачивать", allow: P.LIBRARY_VIEW | P.LIBRARY_DOWNLOAD, deny: 0 },
  {
    key: "upload",
    label: "Загружать",
    allow: P.LIBRARY_VIEW | P.LIBRARY_DOWNLOAD | P.LIBRARY_UPLOAD,
    deny: 0,
  },
  {
    key: "edit",
    label: "Редактировать",
    allow: P.LIBRARY_VIEW | P.LIBRARY_DOWNLOAD | P.LIBRARY_UPLOAD | P.LIBRARY_EDIT_TAGS,
    deny: 0,
  },
  {
    key: "full",
    label: "Полный доступ",
    allow:
      P.LIBRARY_VIEW |
      P.LIBRARY_DOWNLOAD |
      P.LIBRARY_UPLOAD |
      P.LIBRARY_EDIT_TAGS |
      P.LIBRARY_DELETE_FILES,
    deny: 0,
  },
];

function levelLabel(allow: number, deny: number) {
  if ((deny & P.LIBRARY_VIEW) !== 0) return "Запрещено";
  if ((allow & P.LIBRARY_DELETE_FILES) !== 0) return "Полный доступ";
  if ((allow & P.LIBRARY_EDIT_TAGS) !== 0) return "Редактирование";
  if ((allow & P.LIBRARY_UPLOAD) !== 0) return "Загрузка";
  if ((allow & P.LIBRARY_DOWNLOAD) !== 0) return "Скачивание";
  if ((allow & P.LIBRARY_VIEW) !== 0) return "Прослушивание";
  return "Нет доступа";
}

export function LibraryAccessDialog({
  library,
  open,
  onClose,
}: {
  library: Library | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [overwrites, setOverwrites] = useState<PermissionOverwrite[]>([]);
  const [roles, setRoles] = useState<AvailableRole[]>([]);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [targetType, setTargetType] = useState<"role" | "user">("role");
  const [targetId, setTargetId] = useState("");
  const [level, setLevel] = useState("view");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!library) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [loadedOverwrites, loadedRoles, loadedUsers] = await Promise.all([
        api.libraryPermissions(library.id),
        api.availableRoles(),
        api.availableUsers(),
      ]);
      setOverwrites(loadedOverwrites);
      setRoles(loadedRoles);
      setUsers(loadedUsers);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить доступ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, library?.id]);

  const everyoneRole = roles.find((role) => role.is_everyone);
  const everyoneOverwrite = overwrites.find(
    (item) => item.target_type === "role" && item.target_id === everyoneRole?.id,
  );
  const isPublic = Boolean(everyoneOverwrite && (everyoneOverwrite.allow & P.LIBRARY_VIEW));
  const customOverwrites = overwrites.filter(
    (item) => !(item.target_type === "role" && item.target_id === everyoneRole?.id),
  );

  const targetOptions =
    targetType === "role"
      ? roles.filter((role) => !role.is_everyone).map((role) => ({ id: role.id, label: role.name }))
      : users.map((user) => ({ id: user.id, label: user.username }));

  const targetName = (overwrite: PermissionOverwrite) => {
    if (overwrite.target_type === "role") {
      return roles.find((role) => role.id === overwrite.target_id)?.name ?? "Роль";
    }
    return users.find((user) => user.id === overwrite.target_id)?.username ?? "Пользователь";
  };

  const togglePublic = async () => {
    if (!library || !everyoneRole) return;
    setBusy(true);
    setError(null);
    try {
      if (isPublic) {
        await api.deleteLibraryPermission(library.id, "role", everyoneRole.id);
      } else {
        await api.setLibraryPermission(library.id, "role", everyoneRole.id, {
          allow: P.LIBRARY_VIEW | P.LIBRARY_DOWNLOAD,
          deny: 0,
        });
      }
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось изменить доступ");
    } finally {
      setBusy(false);
    }
  };

  const addAccess = async () => {
    if (!library || !targetId) return;
    const preset = levels.find((item) => item.key === level) ?? levels[0];
    setBusy(true);
    setError(null);
    try {
      await api.setLibraryPermission(library.id, targetType, targetId, {
        allow: preset.allow,
        deny: preset.deny,
      });
      setTargetId("");
      await load();
      toast("Доступ обновлён");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось выдать доступ");
    } finally {
      setBusy(false);
    }
  };

  const removeAccess = async (overwrite: PermissionOverwrite) => {
    if (!library) return;
    setBusy(true);
    try {
      await api.deleteLibraryPermission(
        library.id,
        overwrite.target_type,
        overwrite.target_id,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось убрать доступ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={library ? `Доступ: ${library.name}` : "Доступ к библиотеке"}
      description="Кто видит и слушает эту библиотеку. Администраторы видят всё."
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Загружаем…
        </div>
      ) : (
        <div className="space-y-5">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between gap-4 rounded-xl bg-secondary/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Доступна всем</p>
              <p className="text-xs text-muted-foreground">
                Роль @everyone получает просмотр и скачивание.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => void togglePublic()}
              disabled={busy || !everyoneRole}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                isPublic ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  isPublic ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Индивидуальный доступ</h3>
            {customOverwrites.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока никому не выдан.</p>
            ) : (
              <div className="divide-y divide-border/40 rounded-xl bg-card/40 px-2">
                {customOverwrites.map((overwrite) => (
                  <div
                    key={`${overwrite.target_type}-${overwrite.target_id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{targetName(overwrite)}</p>
                      <p className="text-xs text-muted-foreground">
                        {overwrite.target_type === "role" ? "Роль" : "Пользователь"} ·{" "}
                        {levelLabel(overwrite.allow, overwrite.deny)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void removeAccess(overwrite)}
                      disabled={busy}
                      aria-label="Убрать доступ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-[7rem_1fr_1fr_auto]">
            <select
              value={targetType}
              onChange={(event) => {
                setTargetType(event.target.value as "role" | "user");
                setTargetId("");
              }}
              className="mc-select"
            >
              <option value="role">Роль</option>
              <option value="user">Пользователь</option>
            </select>
            <select
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
              className="mc-select"
            >
              <option value="">Выберите…</option>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="mc-select"
            >
              {levels.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <Button onClick={() => void addAccess()} disabled={busy || !targetId}>
              <Plus className="mr-2 h-4 w-4" />
              Выдать
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
