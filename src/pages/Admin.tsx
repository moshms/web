import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Tags, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import {
  api,
  ApiError,
  type AdminUser,
  type Features,
  type JobRecord,
  type Library,
  type LibraryScanResult,
  type Role,
  type Storage,
} from "@/api";
import { Button } from "@/components/ui/button";

const inputClass = "mc-field";

export function AdminPage() {
  const [features, setFeatures] = useState<Features | null>(null);
  const [storages, setStorages] = useState<Storage[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [scanResults, setScanResults] = useState<LibraryScanResult[] | null>(null);
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

  const [userName, setUserName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<Role>("listener");

  const showError = (caught: unknown) => {
    setError(caught instanceof ApiError ? caught.message : "Операция не удалась");
  };

  const load = async () => {
    const [loadedFeatures, loadedStorages, loadedLibraries, loadedUsers, loadedJobs] =
      await Promise.all([
        api.features(),
        api.admin.storages(),
        api.admin.libraries(),
        api.admin.users(),
        api.admin.jobs(),
      ]);
    setFeatures(loadedFeatures);
    setStorages(loadedStorages);
    setLibraries(loadedLibraries);
    setUsers(loadedUsers);
    setJobs(loadedJobs);
  };

  useEffect(() => {
    void load().catch(showError);
  }, []);

  const scan = async () => {
    setBusy(true);
    setError(null);
    try {
      setScanResults(await api.admin.scan());
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
      });
      setLibraryName("");
      setLibraryPrefix("");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Управление</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Админка</h1>
          <p className="text-sm text-muted-foreground">Библиотеки, хранилища и пользователи</p>
        </div>
        {features?.worker && (
          <Link
            to="/admin/tags"
            className="inline-flex h-9 items-center rounded-xl border border-border/70 bg-card px-3 text-sm hover:bg-accent/50"
          >
            <Tags className="mr-2 h-4 w-4" />
            Редактор тегов
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {features && (
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(features).map(([name, enabled]) => (
            <span
              key={name}
              className={`rounded-full border px-2 py-1 ${
                enabled
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {name}: {enabled ? "on" : "off"}
            </span>
          ))}
        </div>
      )}

      <section className="space-y-3 mc-surface p-4">
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
      </section>

      <section className="space-y-3 mc-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Импорт</h2>
            <p className="text-xs text-muted-foreground">
              Задания воркера: раскладка загруженных файлов по шаблону
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
                  {job.kind}{" "}
                  <span className="text-xs text-muted-foreground">
                    {job.status} · {job.attempts}/{job.max_attempts}
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
      </section>

      <section className="space-y-3 mc-surface p-4">
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
      </section>

      <section className="space-y-3 mc-surface p-4">
        <h2 className="font-semibold">Библиотеки</h2>
        <div className="divide-y text-sm">
          {libraries.map((library) => (
            <div key={library.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{library.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  storage {library.storage_id} · prefix {library.root_prefix || "—"}
                </p>
              </div>
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
          <Button type="submit" disabled={busy || !libraryStorage}>
            Добавить библиотеку
          </Button>
        </form>
      </section>

      <section className="space-y-3 mc-surface p-4">
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
              <select
                value={user.role}
                onChange={(event) =>
                  void updateUser(user, { role: event.target.value as Role })
                }
                className="h-8 rounded-lg border border-border/70 bg-card px-2 text-xs"
              >
                <option value="admin">admin</option>
                <option value="uploader">uploader</option>
                <option value="listener">listener</option>
              </select>
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
            minLength={8}
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
      </section>
    </div>
  );
}
