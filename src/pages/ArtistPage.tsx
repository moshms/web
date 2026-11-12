import { useCallback, useEffect, useState } from "react";
import { Heart, Loader2, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist, type Track } from "@/api";
import { AlbumCard } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { albumsLabel, tracksLabel } from "@/lib/plural";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [starred, setStarred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyAlbum, setBusyAlbum] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!artistId) {
      return;
    }

    try {
      const [artists, loadedAlbums, favorites] = await Promise.all([
        api.artists(),
        api.albums(artistId),
        api.favorites(),
      ]);
      setArtist(artists.find((item) => item.id === artistId) ?? null);
      setAlbums(loadedAlbums);
      setStarred(favorites.artists.some((item) => item.id === artistId));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Не удалось загрузить исполнителя",
      );
    }
  }, [artistId]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadTracks = async () => {
    if (!artistId) {
      return [] as Track[];
    }
    const artistAlbums = await api.albums(artistId);
    const details = await Promise.all(artistAlbums.map((album) => api.album(album.id)));
    return details.flatMap((detail) => detail.tracks);
  };

  const playAll = async () => {
    setBusy(true);
    try {
      const tracks = await loadTracks();
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch {
      toast("Не удалось запустить исполнителя", "error");
    } finally {
      setBusy(false);
    }
  };

  const playAlbum = async (albumId: string) => {
    setBusyAlbum(albumId);
    try {
      const detail = await api.album(albumId);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      toast("Не удалось запустить альбом", "error");
    } finally {
      setBusyAlbum(null);
    }
  };

  const toggleStar = async () => {
    if (!artist) {
      return;
    }

    const nextStarred = !starred;
    setStarred(nextStarred);
    try {
      if (nextStarred) {
        await api.starArtist(artist.id);
      } else {
        await api.unstarArtist(artist.id);
      }
    } catch {
      setStarred(!nextStarred);
      toast("Не удалось обновить избранное", "error");
    }
  };

  if (error) {
    return (
      <div className="mc-surface p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Link
        to="/"
        className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← Библиотека
      </Link>

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-5 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 via-primary/50 to-orange-600 text-4xl font-semibold text-primary-foreground shadow-xl shadow-primary/20 sm:h-32 sm:w-32">
            {artist.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Исполнитель
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {artist.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {albumsLabel(albums.length)} · {tracksLabel(artist.track_count)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                className="rounded-full px-6"
                onClick={() => void playAll()}
                disabled={busy || albums.length === 0}
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Слушать
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => void toggleStar()}
                aria-label={starred ? "Убрать из избранного" : "В избранное"}
              >
                <Heart className={cn("h-4 w-4", starred && "fill-primary text-primary")} />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {albums.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Альбомов пока нет.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              busy={busyAlbum === album.id}
              onPlay={() => void playAlbum(album.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
