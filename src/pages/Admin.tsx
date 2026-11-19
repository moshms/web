import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, ShieldCheck, Tags, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import {
  api,
  ApiError,
  type AdminStats,
  type AdminUser,
  type AuditRecord,
  type Features,
  type JobRecord,
  type Library,
  type LibraryScanResult,
  type Role,
  type ScanRunRecord,
  type Storage,
} from "@/api";
import { useAuth } from "@/auth";
import { LibraryAccessDialog } from "@/components/LibraryAccessDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusDot } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { can, canAnyLibrary, P } from "@/permissions";
import { useToast } from "@/toast";

const inputClass = "mc-field";

const jobKindLabels: Record<string, string> = {
  writeback: "Запись тегов",
  import: "Импорт файла",
  scan: "Скан",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

const jobStatusLabels: Record<string, string> = {
  pending: "ожидает",
  running: "выполняется",
  done: "готово",
  failed: "ошибка",
  needs_review: "нужна проверка",
};

function Section({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null;
  return <section className="space-y-3 mc-surface p-4">{children}</section>;
}

export function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "overview";
  const canScans = can(user, P.RUN_SCANS);
  const canStorages = can(user, P.MANAGE_STORAGES);
  const canLibraries = can(user, P.MANAGE_LIBRARIES);
  const canUsers = can(user, P.MANAGE_USERS);
  const canRoles = can(user, P.MANAGE_ROLES);
  const canAudit = can(user, P.VIEW_AUDIT_LOG);
  const canEditAny =
    canAnyLibrary(user, P.LIBRARY_EDIT_TAGS) || canAnyLibrary(user, P.LIBRARY_UPLOAD);
  const [features, setFeatures] = useState<Features | null>(null);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [scanResults, setScanResults] = useState<LibraryScanResult[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [scanRuns, setScanRuns] = useState<ScanRunRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [storageName, setStorageName] = useState("");
  const [storageKind, setStorageKind] = useState<"local" | "s3">("local");
  const [storageAccess, setStorageAccess] = useState("rw");
  const [localRoot, setLocalRoot] = useState("/library");
  const [s3Endpoint, setS3Endpoint] = useState("http://minio:9000");
  const [s3Region, setS3Region] = useState("us-east-1");
  const [s3Bucket, setS3Bucket] = useState("music");
  const [s3AccessKey, setS3AccessKey] = useState("");
  const [s3SecretKey, setS3SecretKey] = useState("");
  const [s3Root, setS3Root] = useState("");

  const [libraryName, setLibraryName] = useState("");
  const [libraryStorage, setLibraryStorage] = useState("");
  const [libraryPrefix, setLibraryPrefix] = useState("");
  const [libraryAccess, setLibraryAccess] = useState<"closed" | "everyone">("closed");
  const [accessLibrary, setAccessLibrary] = useState<Library | null>(null);

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<Role>("listener");

  const showError = (caught: unknown) => {
    setError(caught instanceof ApiError ? caught.message : "Операция не удалась");
  };

  const load = async () => {
    const tasks: Promise<void>[] = [
      api.features().then(setFeatures),
    ];
    if (canScans) {
      tasks.push(api.admin.jobs().then(setJobs));
      tasks.push(api.admin.stats().then(setStats));
    }
    if (canStorages) {
      tasks.push(api.admin.storages().then(setStorages));
    }
    if (canLibraries) {
      tasks.push(api.admin.libraries().then(setLibraries));
    }
    if (canUsers) {
      tasks.push(api.admin.users().then(setUsers));
    }
    if (canAudit) {
      tasks.push(api.auditLog().then(setAudit));
    }
    await Promise.all(tasks);
  };

  useEffect(() => {
    void load().catch(showError);
  }, []);

  useEffect(() => {
    if (!canScans) {
      return;
    }
    const source = new EventSource("/api/v1/admin/scan/events");
    source.onmessage = (event) => {
      try {
        setScanRuns(JSON.parse(event.data) as ScanRunRecord[]);
      } catch {
        // ignore malformed events
      }
    };
    return () => source.close();
  }, [canScans]);

  const scan = async () => {
    setBusy(true);
    setError(null);
    try {
      if (features?.worker) {
        await api.admin.scanAsync();
        setScanResults(null);
        toast("Скан поставлен в очередь");
        await load();
      } else {
        setScanResults(await api.admin.scan());
      }
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  };

  const createStorage = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const config =
        storageKind === "local"
          ? { root: localRoot }
          : {
              endpoint: s3Endpoint,
              region: s3Region,
              bucket: s3Bucket,
              access_key_id: s3AccessKey,
              secret_access_key: s3SecretKey,
              root: s3Root,
              virtual_host_style: false,
              presign_seconds: 3600,
            };

      await api.admin.createStorage({
        name: storageName,
        kind: storageKind,
        access: storageAccess,
        config,
      });
      setStorageName("");
      await load();
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  };

  const createLibrary = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.createLibrary({
        name: libraryName,
        storage_id: libraryStorage,
        root_prefix: libraryPrefix,
        access: {
          everyone: libraryAccess === "everyone",
          roles: [],
          users: [],
        },
      });
      setLibraryName("");
      setLibraryPrefix("");
      setLibraryAccess("closed");
      await load();
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.createUser({
        username: userName,
        password: userPassword,
        role: userRole,
      });
      setUserName("");
      setUserPassword("");
      await load();
    } catch (caught) {
      showError(caught);
    } finally {
      setBusy(false);
    }
  };

  const retryJob = async (job: JobRecord) => {
    try {
      await api.admin.retryJob(job.id);
      await load();
    } catch (caught) {
      showError(caught);
    }
  };

  const updateUser = async (user: AdminUser, body: { role?: Role; is_active?: boolean }) => {
    setError(null);
    try {
      await api.admin.updateUser(user.id, body);
      await load();
    } catch (caught) {
      showError(caught);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Удалить пользователя ${user.username}?`)) {
      return;
    }

    try {
      await api.admin.deleteUser(user.id);
      await load();
    } catch (caught) {
      showError(caught);
    }
  };

  const deleteStorage = async (storage: Storage) => {
    if (!window.confirm(`Удалить хранилище ${storage.name}?`)) {
      return;
    }

    try {
      await api.admin.deleteStorage(storage.id);
      await load();
    } catch (caught) {
      showError(caught);
    }
  };

  const deleteLibrary = async (library: Library) => {
    if (!window.confirm(`Удалить библиотеку ${library.name}?`)) {
      return;
    }

    try {
      await api.admin.deleteLibrary(library.id);
      await load();
    } catch (caught) {
      showError(caught);
    }
  };

  const tabs = [
    { value: "overview", label: "Обзор" },
    ...(canLibraries ? [{ value: "libraries", label: "Библиотеки" }] : []),
    ...(canStorages ? [{ value: "storages", label: "Хранилища" }] : []),
    ...(canUsers ? [{ value: "users", label: "Пользователи" }] : []),
    ...(canScans ? [{ value: "jobs", label: "Задания" }] : []),
    ...(canAudit ? [{ value: "audit", label: "Журнал" }] : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Управление"
        description="Библиотеки, хранилища, пользователи и фоновые задания."
        actions={
          <>
            {canRoles && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/roles">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Роли
                </Link>
              </Button>
            )}
            {features?.worker && canEditAny && (
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/tags">
                  <Tags className="mr-2 h-4 w-4" />
                  Редактор тегов
                </Link>
              </Button>
            )}
          </>
        }
      />

      <Tabs
        items={tabs}
        value={tabs.some((item) => item.value === tab) ? tab : "overview"}
        onChange={(next) => setParams({ tab: next })}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Section show={tab === "overview"}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Треки", stats?.tracks ?? 0],
            ["Альбомы", stats?.albums ?? 0],
            ["Исполнители", stats?.artists ?? 0],
            ["Пользователи", stats?.users ?? users.length],
            ["Библиотеки", stats?.libraries ?? libraries.length],
            ["Размер медиа", formatBytes(stats?.media_bytes ?? 0)],
            ["Задания", (stats?.jobs_pending ?? 0) + (stats?.jobs_running ?? 0)],
            ["Ошибки заданий", stats?.jobs_failed ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        {features && (
          <div className="flex flex-wrap gap-3 text-xs">
            {[
              ["worker", "Воркер"],
              ["transcoder", "Транскодер"],
              ["tag_editor", "Редактор тегов"],
              ["monitoring", "Метрики"],
            ].map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-muted-foreground">
                <StatusDot active={Boolean(features[key as keyof Features])} />
                {label}: {features[key as keyof Features] ? "работает" : "выключен"}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section show={tab === "overview" && canScans}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Сканирование</h2>
            <p className="text-xs text-muted-foreground">Полный скан всех библиотек</p>
          </div>
          <Button onClick={() => void scan()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Запустить скан
          </Button>
        </div>

        {scanRuns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Библиотека</th>
                  <th className="py-1 pr-3">Режим</th>
                  <th className="py-1 pr-3">Статус</th>
                  <th className="py-1 pr-3">Файлов</th>
                  <th className="py-1 pr-3">Добавлено</th>
                  <th className="py-1 pr-3">Ошибок</th>
                  <th className="py-1 pr-3">Начало</th>
                </tr>
              </thead>
              <tbody>
                {scanRuns.slice(0, 8).map((run) => (
                  <tr key={run.id} className="border-t">
                    <td className="py-1 pr-3">{run.library_name}</td>
                    <td className="py-1 pr-3">{run.mode}</td>
                    <td className="py-1 pr-3">{run.status}</td>
                    <td className="py-1 pr-3">{run.counters.files_seen ?? 0}</td>
                    <td className="py-1 pr-3">{run.counters.added ?? 0}</td>
                    <td className="py-1 pr-3">{run.counters.errors ?? 0}</td>
                    <td className="py-1 pr-3">
                      {new Date(run.started_at).toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {scanResults && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">Библиотека</th>
                  <th className="py-1 pr-3">Файлов</th>
                  <th className="py-1 pr-3">Добавлено</th>
                  <th className="py-1 pr-3">Обновлено</th>
                  <th className="py-1 pr-3">Без изменений</th>
                  <th className="py-1 pr-3">Удалено</th>
                  <th className="py-1 pr-3">Дублей</th>
                  <th className="py-1 pr-3">Ошибок</th>
                </tr>
              </thead>
              <tbody>
                {scanResults.map((result) => (
                  <tr key={result.library_id} className="border-t">
                    <td className="py-1 pr-3">{result.library_name}</td>
                    {result.stats ? (
                      <>
                        <td className="py-1 pr-3">{result.stats.files_seen}</td>
                        <td className="py-1 pr-3">{result.stats.added}</td>
                        <td className="py-1 pr-3">{result.stats.updated}</td>
                        <td className="py-1 pr-3">{result.stats.unchanged}</td>
                        <td className="py-1 pr-3">{result.stats.removed}</td>
                        <td className="py-1 pr-3">{result.stats.duplicates}</td>
                        <td className="py-1 pr-3">{result.stats.errors}</td>
                      </>
                    ) : (
                      <td className="py-1 pr-3 text-destructive" colSpan={7}>
                        {result.error}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section show={tab === "jobs" && canScans}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Задания</h2>
            <p className="text-xs text-muted-foreground">
              Фоновые задания: импорт, запись тегов и сканы.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load().catch(showError)}>
            Обновить
          </Button>
        </div>
        <div className="divide-y text-sm">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {jobKindLabels[job.kind] ?? job.kind}{" "}
                  <span className="text-xs text-muted-foreground">
                    {jobStatusLabels[job.status] ?? job.status} · попытки {job.attempts}/{job.max_attempts}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {String(job.payload.source_key ?? job.payload.filename ?? "")}
                </p>
                {job.last_error && (
                  <p className="truncate text-xs text-destructive">{job.last_error}</p>
                )}
              </div>
              {(job.status === "needs_review" || job.status === "failed") && (
                <Button variant="outline" size="sm" onClick={() => void retryJob(job)}>
                  Повторить
                </Button>
              )}
            </div>
          ))}
          {jobs.length === 0 && (
            <p className="text-sm text-muted-foreground">Заданий пока нет.</p>
          )}
        </div>
      </Section>

      <Section show={tab === "storages" && canStorages}>
        <h2 className="font-semibold">Хранилища</h2>
        <div className="divide-y text-sm">
          {storages.map((storage) => (
            <div key={storage.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {storage.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    {storage.kind} · {storage.status}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {String(storage.config.root ?? "")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void deleteStorage(storage)}
                aria-label="Удалить хранилище"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {storages.length === 0 && <p className="text-sm text-muted-foreground">Нет хранилищ.</p>}
        </div>

        <form onSubmit={(event) => void createStorage(event)} className="grid gap-2 md:grid-cols-4">
          <input
            value={storageName}
            onChange={(event) => setStorageName(event.target.value)}
            placeholder="Имя"
            required
            className={inputClass}
          />
          <select
            value={storageKind}
            onChange={(event) => setStorageKind(event.target.value as "local" | "s3")}
            className={inputClass}
          >
            <option value="local">local</option>
            <option value="s3">s3</option>
          </select>
          <select
            value={storageAccess}
            onChange={(event) => setStorageAccess(event.target.value)}
            className={inputClass}
          >
            <option value="rw">rw</option>
            <option value="ro">ro</option>
          </select>
          {storageKind === "local" ? (
            <input
              value={localRoot}
              onChange={(event) => setLocalRoot(event.target.value)}
              placeholder="/library"
              required
              className={inputClass}
            />
          ) : (
            <input
              value={s3Endpoint}
              onChange={(event) => setS3Endpoint(event.target.value)}
              placeholder="Endpoint"
              required
              className={inputClass}
            />
          )}
          {storageKind === "s3" && (
            <>
              <input
                value={s3Region}
                onChange={(event) => setS3Region(event.target.value)}
                placeholder="Region"
                className={inputClass}
              />
              <input
                value={s3Bucket}
                onChange={(event) => setS3Bucket(event.target.value)}
                placeholder="Bucket"
                required
                className={inputClass}
              />
              <input
                value={s3AccessKey}
                onChange={(event) => setS3AccessKey(event.target.value)}
                placeholder="Access key"
                required
                className={inputClass}
              />
              <input
                value={s3SecretKey}
                onChange={(event) => setS3SecretKey(event.target.value)}
                placeholder="Secret key"
                type="password"
                required
                className={inputClass}
              />
              <input
                value={s3Root}
                onChange={(event) => setS3Root(event.target.value)}
                placeholder="Root prefix"
                className={inputClass}
              />
            </>
          )}
          <div className="md:col-span-4">
            <Button type="submit" disabled={busy}>
              Добавить хранилище
            </Button>
          </div>
        </form>
      </Section>

      <Section show={tab === "libraries" && canLibraries}>
        <h2 className="font-semibold">Библиотеки</h2>
        <div className="divide-y text-sm">
          {libraries.map((library) => (
            <div key={library.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{library.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {storages.find((storage) => storage.id === library.storage_id)?.name ?? "хранилище"}
                  {library.root_prefix ? ` · ${library.root_prefix}` : ""}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setAccessLibrary(library)}>
                Доступ
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void deleteLibrary(library)}
                aria-label="Удалить библиотеку"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {libraries.length === 0 && (
            <p className="text-sm text-muted-foreground">Нет библиотек.</p>
          )}
        </div>

        <form onSubmit={(event) => void createLibrary(event)} className="grid gap-2 md:grid-cols-4">
          <input
            value={libraryName}
            onChange={(event) => setLibraryName(event.target.value)}
            placeholder="Имя библиотеки"
            required
            className={inputClass}
          />
          <select
            value={libraryStorage}
            onChange={(event) => setLibraryStorage(event.target.value)}
            required
            className={inputClass}
          >
            <option value="">Хранилище…</option>
            {storages.map((storage) => (
              <option key={storage.id} value={storage.id}>
                {storage.name}
              </option>
            ))}
          </select>
          <input
            value={libraryPrefix}
            onChange={(event) => setLibraryPrefix(event.target.value)}
            placeholder="Root prefix"
            className={inputClass}
          />
          <select
            value={libraryAccess}
            onChange={(event) =>
              setLibraryAccess(event.target.value as "closed" | "everyone")
            }
            className={inputClass}
          >
            <option value="closed">Закрытая</option>
            <option value="everyone">Доступна всем</option>
          </select>
          <Button type="submit" disabled={busy || !libraryStorage}>
            Добавить библиотеку
          </Button>
        </form>
      </Section>

      <Section show={tab === "users" && canUsers}>
        <h2 className="font-semibold">Пользователи</h2>
        <div className="divide-y text-sm">
          {users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user.is_active ? "активен" : "отключён"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {user.roles.length === 0 && (
                  <span className="text-xs text-muted-foreground">@everyone</span>
                )}
                {user.roles.map((role) => (
                  <span
                    key={role.id}
                    className="rounded-full bg-secondary/70 px-2 py-0.5 text-[10px] font-medium"
                    style={
                      role.color === null
                        ? undefined
                        : { color: `#${role.color.toString(16).padStart(6, "0")}` }
                    }
                  >
                    {role.name}
                  </span>
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={user.is_active}
                  onChange={(event) =>
                    void updateUser(user, { is_active: event.target.checked })
                  }
                />
                активен
              </label>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void deleteUser(user)}
                aria-label="Удалить пользователя"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={(event) => void createUser(event)} className="grid gap-2 md:grid-cols-4">
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="Логин"
            required
            className={inputClass}
          />
          <input
            value={userPassword}
            onChange={(event) => setUserPassword(event.target.value)}
            placeholder="Пароль"
            type="password"
            minLength={12}
            required
            className={inputClass}
          />
          <select
            value={userRole}
            onChange={(event) => setUserRole(event.target.value as Role)}
            className={inputClass}
          >
            <option value="listener">listener</option>
            <option value="uploader">uploader</option>
            <option value="admin">admin</option>
          </select>
          <Button type="submit" disabled={busy}>
            Добавить пользователя
          </Button>
        </form>
      </Section>

      <Section show={tab === "audit" && canAudit}>
        <h2 className="font-semibold">Журнал изменений</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Записей пока нет.</p>
        ) : (
          <div className="divide-y divide-border text-sm">
            {audit.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium">{entry.action}</span>
                <span className="text-xs text-muted-foreground">
                  {entry.actor ?? "система"} · {entry.target_type}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("ru-RU")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <LibraryAccessDialog
        library={accessLibrary}
        open={accessLibrary !== null}
        onClose={() => setAccessLibrary(null)}
      />
    </div>
  );
}
