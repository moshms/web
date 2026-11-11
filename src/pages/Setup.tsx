import { useState, type FormEvent } from "react";
import { Music2 } from "lucide-react";

import { api, ApiError } from "@/api";
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
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать администратора");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-sm space-y-5 rounded-xl border bg-white p-8 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Music2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">Первый запуск</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Создайте администратора Music Cloud.
        </p>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Логин</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
            className="h-10 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="h-10 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Повторите пароль</span>
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            className="h-10 w-full rounded-md border px-3 outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Создаём…" : "Создать администратора"}
        </Button>
      </form>
    </div>
  );
}
