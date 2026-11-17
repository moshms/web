import { useEffect, useState, type FormEvent } from "react";
import { Copy, KeyRound, Loader2, LogOut, Moon, Sun, Monitor, ShieldCheck, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { api, ApiError, type ApiToken, type CreatedToken, type SessionInfo, type SubsonicCredentials } from "@/api";
import { useAuth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { canManageServer } from "@/permissions";
import { useTheme } from "@/theme";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subsonic, setSubsonic] = useState<SubsonicCredentials | null>(null);
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [tokenDays, setTokenDays] = useState("");
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [credentials, loadedTokens, loadedSessions] = await Promise.all([
        api.subsonicCredentials(),
        api.tokens(),
        api.sessions(),
      ]);
      setSubsonic(credentials);
      setTokens(loadedTokens);
      setSessions(loadedSessions);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} скопирован`);
    } catch {
      toast("Не удалось скопировать", "error");
    }
  };

  const createToken = async (event: FormEvent) => {
    event.preventDefault();
    if (!tokenName.trim()) {
      return;
    }
    setBusy(true);
    try {
      const token = await api.createToken({
        name: tokenName.trim(),
        ...(tokenDays.trim() ? { expires_in_days: Number(tokenDays) } : {}),
      });
      setCreated(token);
      setCreateOpen(false);
      setTokenName("");
      setTokenDays("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать токен");
    } finally {
      setBusy(false);
    }
  };

  const removeToken = async (token: ApiToken) => {
    if (!window.confirm(`Удалить токен «${token.name}»?`)) {
      return;
    }
    try {
      await api.deleteToken(token.id);
      await load();
      toast("Токен удалён");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось удалить токен");
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Новые пароли не совпадают");
      return;
    }
    setSecurityBusy(true);
    setError(null);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast("Пароль изменён. Войдите снова.");
      await logout();
      navigate("/login");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось изменить пароль");
    } finally {
      setSecurityBusy(false);
    }
  };

  const revokeSession = async (session: SessionInfo) => {
    setSecurityBusy(true);
    try {
      await api.deleteSession(session.id);
      setSessions(await api.sessions());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось отозвать сессию");
    } finally {
      setSecurityBusy(false);
    }
  };

  const revokeOtherSessions = async () => {
    setSecurityBusy(true);
    try {
      await api.deleteOtherSessions();
      setSessions(await api.sessions());
      toast("Остальные сессии отозваны");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось отозвать сессии");
    } finally {
      setSecurityBusy(false);
    }
  };

  const rotateSubsonic = async () => {
    setSecurityBusy(true);
    try {
      const credentials = await api.rotateSubsonic();
      setSubsonic(credentials);
      toast("Subsonic-пароль обновлён");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось обновить пароль");
    } finally {
      setSecurityBusy(false);
    }
  };

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  const server = window.location.origin;

  return (
    <div className="space-y-6">
      <PageHeader title="Профиль" description="Аккаунт, подключение приложений и внешний вид." />

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Аккаунт" description="Текущая учётная запись" />
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-lg font-semibold">
                {user?.username.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <p className="font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.roles.map((role) => role.name).join(", ") || "Слушатель"}
                </p>
              </div>
            </div>
            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              Смена пароля и управление сессиями появятся в следующем обновлении.
            </div>
            <div className="flex flex-wrap gap-2">
              {canManageServer(user) && (
                <Button asChild variant="outline">
                  <Link to="/admin">Управление</Link>
                </Button>
              )}
              <Button variant="outline" onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Внешний вид" description="Тема интерфейса" />
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: "light" as const, label: "Светлая", icon: Sun },
                { key: "dark" as const, label: "Тёмная", icon: Moon },
                { key: "system" as const, label: "Системная", icon: Monitor },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTheme(item.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-md border p-3 text-xs transition-colors",
                    theme === item.key
                      ? "border-foreground bg-muted font-medium"
                      : "border-border text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Подключение приложений"
            description="Subsonic / OpenSubsonic"
            action={
              <Button variant="outline" size="sm" onClick={() => void rotateSubsonic()} disabled={securityBusy}>
                Обновить пароль
              </Button>
            }
          />
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Загружаем…
              </div>
            ) : subsonic ? (
              <>
                {[
                  ["Сервер", server],
                  ["Логин", subsonic.username],
                  ["Пароль", subsonic.password],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 rounded-md border border-border px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="truncate font-mono text-xs">{value}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void copy(value, label)}
                      aria-label={`Скопировать ${label}`}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Используйте этот пароль в Subsonic-клиентах. Основной пароль аккаунта для
                  приложений больше не подходит.
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="API-токены"
            description="Для скриптов и интеграций"
            action={
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Создать
              </Button>
            }
          />
          <CardContent>
            {tokens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Токенов пока нет.</p>
            ) : (
              <div className="divide-y divide-border">
                {tokens.map((token) => (
                  <div key={token.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{token.name}</p>
                      <p className="text-xs text-muted-foreground">
                        создан {new Date(token.created_at).toLocaleDateString("ru-RU")}
                        {token.expires_at
                          ? ` · до ${new Date(token.expires_at).toLocaleDateString("ru-RU")}`
                          : " · бессрочный"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => void removeToken(token)}
                      aria-label="Удалить токен"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Безопасность"
            description="Пароль и активные сессии"
            action={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          />
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <form onSubmit={(event) => void changePassword(event)} className="space-y-3">
              <h3 className="text-sm font-medium">Сменить пароль</h3>
              <Input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Текущий пароль"
                autoComplete="current-password"
                required
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Новый пароль, минимум 12 символов"
                autoComplete="new-password"
                minLength={12}
                required
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Повторите новый пароль"
                autoComplete="new-password"
                minLength={12}
                required
              />
              <Button type="submit" disabled={securityBusy}>
                Сменить пароль
              </Button>
              <p className="text-xs text-muted-foreground">
                После смены пароля все сессии и API-токены будут отозваны.
              </p>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Активные сессии</h3>
                <Button variant="outline" size="sm" onClick={() => void revokeOtherSessions()} disabled={securityBusy}>
                  Выйти везде
                </Button>
              </div>
              <div className="divide-y divide-border">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {session.client_name ?? "Неизвестное устройство"}
                        {session.current && <span className="ml-2 text-xs text-muted-foreground">текущая</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.last_seen_at).toLocaleString("ru-RU")}
                      </p>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void revokeSession(session)}
                        disabled={securityBusy}
                        aria-label="Отозвать сессию"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="py-2 text-sm text-muted-foreground">Нет активных сессий.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый API-токен"
        description="Токен показывается один раз после создания."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button type="submit" form="token-form" disabled={busy || !tokenName.trim()}>
              Создать
            </Button>
          </>
        }
      >
        <form id="token-form" onSubmit={(event) => void createToken(event)} className="space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Название</span>
            <Input
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              placeholder="Например, home-assistant"
              autoFocus
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">Срок действия, дней</span>
            <Input
              value={tokenDays}
              onChange={(event) => setTokenDays(event.target.value.replace(/\D/g, ""))}
              placeholder="Бессрочно"
              inputMode="numeric"
            />
          </label>
        </form>
      </Dialog>

      <Dialog
        open={created !== null}
        onClose={() => setCreated(null)}
        title="Токен создан"
        description="Скопируйте его сейчас — позже значение не показывается."
        footer={
          <Button onClick={() => setCreated(null)}>Готово</Button>
        }
      >
        {created && (
          <div className="space-y-3">
            <div className="rounded-md border border-border p-3 font-mono text-xs break-all">
              {created.token}
            </div>
            <Button variant="outline" onClick={() => void copy(created.token, "Токен")}>
              <Copy className="mr-2 h-4 w-4" />
              Скопировать
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
