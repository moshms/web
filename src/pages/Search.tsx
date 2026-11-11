import { useState, type FormEvent } from "react";
import { Music2, Play, Search as SearchIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type SearchResults } from "@/api";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";

const emptyResults: SearchResults = { artists: [], albums: [], tracks: [] };

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const playTrack = usePlayer((state) => state.playTrack);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) {
      setResults(emptyResults);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setResults(await api.search(value));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Поиск не удался");
    } finally {
      setLoading(false);
    }
  };

  const hasResults =
    results.artists.length > 0 || results.albums.length > 0 || results.tracks.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Поиск</h1>
        <p className="text-sm text-muted-foreground">Исполнители, альбомы и треки</p>
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex max-w-xl gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название трека, альбома или исполнителя"
          className="h-10 flex-1 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
        />
        <Button type="submit" disabled={loading}>
          <SearchIcon className="mr-2 h-4 w-4" />
          Найти
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Ищем…</p>}

      {!loading && !error && query.trim() && !hasResults && (
        <p className="text-sm text-muted-foreground">Ничего не найдено.</p>
      )}

      {results.artists.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Исполнители
          </h2>
          <div className="flex flex-wrap gap-2">
            {results.artists.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="rounded-full border bg-white px-3 py-1 text-sm hover:border-zinc-400"
              >
                {artist.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.albums.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Альбомы
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.albums.map((album) => (
              <Link
                key={album.id}
                to={`/albums/${album.id}`}
                className="flex items-center gap-3 rounded-lg border bg-white p-2 hover:border-zinc-300"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 text-zinc-400">
                  {album.artwork_id ? (
                    <img
                      src={api.artworkUrl(album.id)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Music2 className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{album.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{album.album_artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.tracks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Треки
          </h2>
          <div className="divide-y rounded-lg border bg-white">
            {results.tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-3 px-3 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => playTrack(track, results.tracks)}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{track.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {track.artist ?? "Неизвестный исполнитель"}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
