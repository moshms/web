import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Music2, Search as SearchIcon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type SearchResults } from "@/api";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/player";

const emptyResults: SearchResults = { artists: [], albums: [], tracks: [] };

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const playTrack = usePlayer((state) => state.playTrack);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults(emptyResults);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const timer = window.setTimeout(() => {
      api
        .search(value)
        .then(setResults)
        .catch((caught) =>
          setError(caught instanceof ApiError ? caught.message : "Поиск не удался"),
        )
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.artists.length > 0 || results.albums.length > 0 || results.tracks.length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Поиск
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          Найти в коллекции
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Исполнители, альбомы и треки — результаты появляются по мере ввода
        </p>
      </div>

      <form onSubmit={submit} className="relative max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название трека, альбома или исполнителя"
          autoFocus
          className="mc-field h-12 rounded-2xl pl-12 pr-12 text-base"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        )}
      </form>

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && !query.trim() && (
        <div className="mc-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-semibold">Что послушаем?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Введите название или начните с исполнителя из библиотеки.
            </p>
          </div>
        </div>
      )}

      {!loading && !error && query.trim() && !hasResults && (
        <div className="mc-surface px-6 py-14 text-center">
          <Music2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            По запросу «{query.trim()}» ничего не найдено.
          </p>
        </div>
      )}

      {results.artists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Исполнители
          </h2>
          <div className="flex flex-wrap gap-2">
            {results.artists.map((artist) => (
              <Link
                key={artist.id}
                to={`/artists/${artist.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-4 py-2 text-sm transition hover:border-primary/40 hover:text-primary"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                  {artist.name.slice(0, 1).toUpperCase()}
                </span>
                {artist.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Альбомы
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.albums.map((album) => (
              <Link
                key={album.id}
                to={`/albums/${album.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/50 p-2 transition hover:border-primary/30 hover:bg-accent/40"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/25 via-accent to-secondary text-primary/70">
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
                  <p className="truncate text-sm font-medium group-hover:text-primary">
                    {album.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{album.album_artist}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.tracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Треки
          </h2>
          <TrackList
            tracks={results.tracks}
            onPlay={(track, queue) => playTrack(track, queue)}
          />
        </section>
      )}
    </div>
  );
}
