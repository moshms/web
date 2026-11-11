import { useEffect, useState } from "react";
import { Heart, Loader2, Music2, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type Favorites as FavoritesData, type Track } from "@/api";
import { Artwork } from "@/components/Artwork";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { toast } = useToast();

  useEffect(() => {
    api
      .favorites()
      .then(setFavorites)
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : "Не удалось загрузить избранное",
        ),
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
      toast("Трек убран из избранного");
    } catch {
      toast("Не удалось обновить избранное", "error");
    }
  };

  const playAlbum = async (albumId: string) => {
    setBusyId(albumId);
    try {
      const detail = await api.album(albumId);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      toast("Не удалось запустить альбом", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <div className="mc-surface p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!favorites) {
    return (
      <div className="space-y-6">
        <div className="h-24 w-64 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const hasFavorites =
    favorites.tracks.length > 0 ||
    favorites.albums.length > 0 ||
    favorites.artists.length > 0;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Избранное
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
          Любимая музыка
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Отмеченные треки, альбомы и исполнители
        </p>
      </div>

      {!hasFavorites && (
        <div className="mc-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-semibold">Пока пусто</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Нажимайте на сердечко у треков и альбомов, чтобы собрать коллекцию.
            </p>
          </div>
        </div>
      )}

      {favorites.tracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Треки <span className="text-muted-foreground/60">{favorites.tracks.length}</span>
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
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Альбомы <span className="text-muted-foreground/60">{favorites.albums.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {favorites.albums.map((album) => (
              <div key={album.id} className="group relative">
                <Link
                  to={`/albums/${album.id}`}
                  className="block rounded-2xl p-2 transition hover:-translate-y-0.5 hover:bg-accent/40"
                >
                  <Artwork
                    albumId={album.artwork_id ? album.id : null}
                    title={album.title}
                    className="mb-3 aspect-square w-full rounded-xl shadow-sm"
                  />
                  <p className="truncate text-sm font-medium group-hover:text-primary">
                    {album.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{album.album_artist}</p>
                </Link>
                <Button
                  size="icon"
                  className="absolute bottom-14 right-4 h-10 w-10 rounded-full opacity-0 shadow-lg transition group-hover:opacity-100"
                  onClick={() => void playAlbum(album.id)}
                  aria-label={`Играть ${album.title}`}
                >
                  {busyId === album.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {favorites.artists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Исполнители{" "}
            <span className="text-muted-foreground/60">{favorites.artists.length}</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {favorites.artists.map((artist) => (
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

      {!hasFavorites && (
        <div className="flex justify-center text-muted-foreground/50">
          <Music2 className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}
