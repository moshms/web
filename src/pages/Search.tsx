import { useEffect, useState } from "react";
import { Music2, Sparkles } from "lucide-react";

import { useSearchParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist, type SearchResults } from "@/api";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/player";

const emptyResults: SearchResults = { artists: [], albums: [], tracks: [] };

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
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

  const refresh = () => {
    const value = query.trim();
    if (!value) {
      return;
    }
    api.search(value).then(setResults).catch(() => undefined);
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title="Поиск"
        description="Исполнители, альбомы и треки — результаты появляются по мере ввода."
      />

      {loading && <p className="text-sm text-muted-foreground">Ищем…</p>}

      {error && (
        <div className="mc-surface bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && !query.trim() && (
        <EmptyState
          icon={<Sparkles className="h-5 w-5" />}
          title="Что послушаем?"
          description="Введите запрос в строке поиска сверху — результаты появятся здесь."
        />
      )}

      {!loading && !error && query.trim() && !hasResults && (
        <EmptyState
          icon={<Music2 className="h-5 w-5" />}
          title="Ничего не найдено"
          description={`По запросу «${query.trim()}» ничего не найдено.`}
        />
      )}

      {results.artists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Исполнители
          </h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4 xl:grid-cols-5">
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
