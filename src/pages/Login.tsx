import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/button";

export function Login() {
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.login(username, password);
      await refresh();
      navigate("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="С возвращением" subtitle="Войдите, чтобы продолжить слушать.">
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Логин</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            autoFocus
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
            autoComplete="current-password"
            required
            className="mc-field"
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="mr-2 h-4 w-4" />
          )}
          {loading ? "Входим…" : "Войти"}
        </Button>
      </form>
    </AuthShell>
  );
}
