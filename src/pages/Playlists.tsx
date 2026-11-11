import { useEffect, useState, type FormEvent } from "react";
import { ListMusic } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type Playlist } from "@/api";
import { Button } from "@/components/ui/button";

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .playlists()
      .then(setPlaylists)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлисты"),
      );

  useEffect(() => {
    void load();
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    try {
      await api.createPlaylist(name.trim());
      setName("");
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось создать плейлист");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Плейлисты</h1>
        <p className="text-sm text-muted-foreground">Личные и публичные подборки</p>
      </div>

      <form onSubmit={(event) => void create(event)} className="flex max-w-xl gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Название нового плейлиста"
          className="h-10 flex-1 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <Button type="submit">Создать</Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {playlists.length === 0 ? (
        <p className="text-sm text-muted-foreground">Плейлистов пока нет.</p>
      ) : (
        <div className="divide-y rounded-lg border bg-white">
          {playlists.map((playlist) => (
            <Link
              key={playlist.id}
              to={`/playlists/${playlist.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50"
            >
              <ListMusic className="h-5 w-5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{playlist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {playlist.owner} · {playlist.song_count} треков
                  {playlist.is_public ? " · публичный" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
