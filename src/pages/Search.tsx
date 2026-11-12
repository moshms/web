import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Music2, Search as SearchIcon, Sparkles, X } from "lucide-react";

import { api, ApiError, type Album, type Artist, type SearchResults } from "@/api";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/player";

const emptyResults: SearchResults = { artists: [], albums: [], tracks: [] };

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
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

  const playAlbum = async (album: Album) => {
    setBusyId(album.id);
    try {
      const detail = await api.album(album.id);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      setError("Не удалось запустить альбом");
    } finally {
      setBusyId(null);
    }
  };

  const playArtist = async (artist: Artist) => {
    setBusyId(artist.id);
    try {
      const artistAlbums = await api.albums(artist.id);
      const details = await Promise.all(artistAlbums.map((album) => api.album(album.id)));
      const tracks = details.flatMap((detail) => detail.tracks);
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch {
      setError("Не удалось запустить исполнителя");
    } finally {
      setBusyId(null);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
  };

  const refresh = () => {
    const value = query.trim();
    if (!value) {
      return;
    }
    api.search(value).then(setResults).catch(() => undefined);
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
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
        ) : query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Очистить поиск"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {results.artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                busy={busyId === artist.id}
                onPlay={() => void playArtist(artist)}
              />
            ))}
          </div>
        </section>
      )}

      {results.albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Альбомы
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {results.albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                busy={busyId === album.id}
                onPlay={() => void playAlbum(album)}
              />
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
            onTracksChanged={refresh}
          />
        </section>
      )}
    </div>
  );
}
