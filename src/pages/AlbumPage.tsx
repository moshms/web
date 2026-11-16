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
import { EntityHeader } from "@/components/EntityHeader";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canEditTrack as canEditTrackPermission } from "@/permissions";
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
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить альбом");
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
    const queue = shuffle ? [...album.tracks].sort(() => Math.random() - 0.5) : album.tracks;
    playTrack(queue[0], queue);
  };

  if (error) {
    return <div className="mc-surface p-8 text-center text-sm text-destructive">{error}</div>;
  }

  if (!album) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalDuration = Math.round(
    album.tracks.reduce((sum, track) => sum + (track.duration_ms ?? 0), 0) / 1000,
  );
  const minutes = Math.floor(totalDuration / 60);
  const canEdit = Boolean(
    features?.tag_editor &&
      album.tracks.length > 0 &&
      album.tracks.every((track) => canEditTrackPermission(user, track)),
  );

  return (
    <div className="space-y-6">
      <EntityHeader
        kind="Альбом"
        title={album.title}
        backTo={`/artists/${album.album_artist_id}`}
        backLabel={album.album_artist}
        artwork={
          <Artwork
            albumId={album.artwork_id ? album.id : null}
            title={album.title}
            className="h-full w-full"
            iconClassName="h-12 w-12"
          />
        }
        meta={
          <span>
            <Link to={`/artists/${album.album_artist_id}`} className="hover:text-foreground">
              {album.album_artist}
            </Link>
            {album.year > 0 ? ` · ${album.year}` : ""} · {album.track_count} треков · {minutes} мин
          </span>
        }
        actions={
          <>
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
              className="h-10 w-10"
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
              className="h-10 w-10"
              onClick={() => void toggleAlbumStar()}
              aria-label={albumStarred ? "Убрать альбом из избранного" : "Добавить альбом в избранное"}
              title={albumStarred ? "Убрать из избранного" : "В избранное"}
            >
              <Heart className={cn("h-4 w-4", albumStarred && "fill-foreground")} />
            </Button>
            {canEdit && (
              <Button variant="outline" size="lg" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            )}
          </>
        }
      />

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
