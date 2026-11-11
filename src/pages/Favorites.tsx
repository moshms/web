import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type Favorites as FavoritesData, type Track } from "@/api";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/player";

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);

  useEffect(() => {
    api
      .favorites()
      .then(setFavorites)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить избранное"),
      );
  }, []);

  const toggleStar = async (track: Track) => {
    try {
      await api.unstarTrack(track.id);
      setFavorites((current) =>
        current
          ? { ...current, tracks: current.tracks.filter((item) => item.id !== track.id) }
          : current,
      );
    } catch {
      // ignore transient errors
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!favorites) {
    return <p className="text-sm text-muted-foreground">Загружаем избранное…</p>;
  }

  const hasFavorites =
    favorites.tracks.length > 0 ||
    favorites.albums.length > 0 ||
    favorites.artists.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Избранное</h1>
        <p className="text-sm text-muted-foreground">Отмеченные треки, альбомы и исполнители</p>
      </div>

      {!hasFavorites && <p className="text-sm text-muted-foreground">Пока пусто.</p>}

      {favorites.tracks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Треки
          </h2>
          <TrackList
            tracks={favorites.tracks}
            onPlay={(track, queue) => playTrack(track, queue)}
            starred={new Set(favorites.tracks.map((track) => track.id))}
            onToggleStar={(track) => void toggleStar(track)}
          />
        </section>
      )}

      {favorites.albums.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Альбомы
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.albums.map((album) => (
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

      {favorites.artists.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Исполнители
          </h2>
          <div className="flex flex-wrap gap-2">
            {favorites.artists.map((artist) => (
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
    </div>
  );
}
