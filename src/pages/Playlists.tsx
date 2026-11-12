import { useEffect, useState, type FormEvent } from "react";
import { ListMusic, Plus, Sparkles } from "lucide-react";

import { api, ApiError, type Playlist } from "@/api";
import { useAuth } from "@/auth";
import { can, P } from "@/permissions";
import { PlaylistCard } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/toast";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const canCreate = can(user, P.PLAYLIST_CREATE);

  const load = () =>
    api
      .playlists()
      .then(setPlaylists)
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлисты",
        ),
      );

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setBusy(true);
    try {
      await api.createPlaylist(name.trim());
      toast(`Плейлист «${name.trim()}» создан`);
      setName("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Не удалось создать плейлист",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Подборки
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Плейлисты</h1>
        <p className="mt-1 text-sm text-muted-foreground">Личные и публичные подборки</p>
      </div>

      {canCreate && (
      <form
        onSubmit={(event) => void create(event)}
        className="mc-surface flex flex-col gap-2 p-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Название нового плейлиста"
            className="mc-field pl-10"
          />
        </div>
        <Button type="submit" disabled={busy || !name.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Создать
        </Button>
      </form>
      )}

      {error && (
        <div className="mc-surface bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="mc-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ListMusic className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-semibold">Плейлистов пока нет</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Создайте первую подборку и добавляйте треки из библиотеки.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}
    </div>
  );
}
