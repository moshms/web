import { useState, type FormEvent } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { api, ApiError } from "@/api";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

export function Setup({ onComplete }: { onComplete: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await api.setup(username, password);
      onComplete();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Не удалось создать администратора",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Первый запуск"
      subtitle="Создайте администратора Music Cloud. Это займёт минуту."
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Логин</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="mc-field"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="mc-field"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Повторите пароль</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="mc-field"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="mr-2 h-4 w-4" />
          )}
          {loading ? "Создаём…" : "Создать администратора"}
        </Button>
      </form>
    </AuthShell>
  );
}
