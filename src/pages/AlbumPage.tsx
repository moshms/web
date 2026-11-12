import { useCallback, useEffect, useState } from "react";
import { Heart, Pencil, Play, Shuffle } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import {
  api,
  ApiError,
  type AlbumDetail,
  type Features,
  type Playlist,
  type Track,
} from "@/api";
import { useAuth } from "@/auth";
import { AlbumEditDialog } from "@/components/AlbumEditDialog";
import { Artwork } from "@/components/Artwork";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { tracksLabel } from "@/lib/plural";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [albumStarred, setAlbumStarred] = useState(false);
  const [features, setFeatures] = useState<Features | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!albumId) {
      return;
    }

    try {
      const [loadedAlbum, favorites, loadedPlaylists, loadedFeatures] = await Promise.all([
        api.album(albumId),
        api.favorites(),
        api.playlists(),
        api.features(),
      ]);
      setAlbum(loadedAlbum);
      setStarred(new Set(favorites.tracks.map((track) => track.id)));
      setAlbumStarred(favorites.albums.some((item) => item.id === albumId));
      setPlaylists(loadedPlaylists);
      setFeatures(loadedFeatures);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Не удалось загрузить альбом",
      );
    }
  }, [albumId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStar = async (track: Track) => {
    const isStarred = starred.has(track.id);
    setStarred((current) => {
      const next = new Set(current);
      if (isStarred) {
        next.delete(track.id);
      } else {
        next.add(track.id);
      }
      return next;
    });

    try {
      if (isStarred) {
        await api.unstarTrack(track.id);
      } else {
        await api.starTrack(track.id);
      }
    } catch {
      toast("Не удалось обновить избранное", "error");
      void load();
    }
  };

  const toggleAlbumStar = async () => {
    if (!album) {
      return;
    }

    const nextStarred = !albumStarred;
    setAlbumStarred(nextStarred);
    try {
      if (nextStarred) {
        await api.starAlbum(album.id);
      } else {
        await api.unstarAlbum(album.id);
      }
    } catch {
      setAlbumStarred(!nextStarred);
      toast("Не удалось обновить избранное", "error");
    }
  };

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      await api.addToPlaylist(playlistId, trackId);
      toast("Трек добавлен в плейлист");
    } catch {
      toast("Не удалось добавить трек", "error");
    }
  };

  const play = (shuffle = false) => {
    if (!album || album.tracks.length === 0) {
      return;
    }

    const queue = shuffle
      ? [...album.tracks].sort(() => Math.random() - 0.5)
      : album.tracks;
    playTrack(queue[0], queue);
  };

  if (error) {
    return (
      <div className="mc-surface p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="space-y-6">
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const totalDuration = Math.round(
    album.tracks.reduce((sum, track) => sum + (track.duration_ms ?? 0), 0) / 1000,
  );
  const minutes = Math.floor(totalDuration / 60);
  const canEdit = user?.role === "admin" && Boolean(features?.tag_editor);

  return (
    <div className="space-y-6">
      <Link
        to={`/artists/${album.album_artist_id}`}
        className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← {album.album_artist}
      </Link>

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-4 md:p-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
          {album.artwork_id && (
            <img
              src={api.artworkUrl(album.id)}
              alt=""
              className="h-full w-full scale-125 object-cover opacity-15 blur-3xl"
            />
          )}
        </div>

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end">
          <Artwork
            albumId={album.artwork_id ? album.id : null}
            title={album.title}
            className="mx-auto aspect-square w-40 shrink-0 rounded-2xl shadow-xl shadow-black/10 sm:mx-0 sm:w-52 md:w-56"
            iconClassName="h-12 w-12"
          />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Альбом
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {album.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {album.album_artist}
              {album.year > 0 ? ` · ${album.year}` : ""} · {tracksLabel(album.track_count)} ·{" "}
              {minutes} мин
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                size="lg"
                className="rounded-full px-6"
                onClick={() => play(false)}
                disabled={album.tracks.length === 0}
              >
                <Play className="mr-2 h-4 w-4" />
                Слушать
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => play(true)}
                disabled={album.tracks.length === 0}
                aria-label="Перемешать альбом"
                title="Перемешать"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11"
                onClick={() => void toggleAlbumStar()}
                aria-label={albumStarred ? "Убрать альбом из избранного" : "Добавить альбом в избранное"}
                title={albumStarred ? "Убрать из избранного" : "В избранное"}
              >
                <Heart
                  className={cn("h-4 w-4", albumStarred && "fill-primary text-primary")}
                />
              </Button>
              {canEdit && (
                <Button variant="outline" size="lg" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Редактировать
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <TrackList
        tracks={album.tracks}
        onPlay={(track, queue) => playTrack(track, queue)}
        starred={starred}
        onToggleStar={(track) => void toggleStar(track)}
        playlists={playlists}
        onAddToPlaylist={(playlistId, trackId) => void addToPlaylist(playlistId, trackId)}
        onTracksChanged={() => void load()}
      />

      <AlbumEditDialog
        albumId={album.id}
        open={editOpen}
        features={features}
        onClose={() => setEditOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
