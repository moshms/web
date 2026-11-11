import { useEffect, useState } from "react";
import { Music2, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError, type AlbumDetail, type Playlist, type Track } from "@/api";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";

export function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);

  useEffect(() => {
    if (!albumId) {
      return;
    }

    Promise.all([api.album(albumId), api.favorites(), api.playlists()])
      .then(([loadedAlbum, favorites, loadedPlaylists]) => {
        setAlbum(loadedAlbum);
        setStarred(new Set(favorites.tracks.map((track) => track.id)));
        setPlaylists(loadedPlaylists);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить альбом"),
      );
  }, [albumId]);

  const toggleStar = async (track: Track) => {
    const isStarred = starred.has(track.id);
    try {
      if (isStarred) {
        await api.unstarTrack(track.id);
      } else {
        await api.starTrack(track.id);
      }

      setStarred((current) => {
        const next = new Set(current);
        if (isStarred) {
          next.delete(track.id);
        } else {
          next.add(track.id);
        }
        return next;
      });
    } catch {
      // ignore transient errors
    }
  };

  const addToPlaylist = async (playlistId: string, trackId: string) => {
    try {
      await api.addToPlaylist(playlistId, trackId);
    } catch {
      // ignore transient errors
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!album) {
    return <p className="text-sm text-muted-foreground">Загружаем альбом…</p>;
  }

  const totalDuration = Math.round(
    album.tracks.reduce((sum, track) => sum + (track.duration_ms ?? 0), 0) / 1000,
  );
  const minutes = Math.floor(totalDuration / 60);

  return (
    <div className="space-y-6">
      <Link
        to={`/artists/${album.album_artist_id}`}
        className="text-sm text-muted-foreground hover:underline"
      >
        ← {album.album_artist}
      </Link>

      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 text-zinc-400">
          {album.artwork_id ? (
            <img
              src={api.artworkUrl(album.id)}
              alt={album.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Music2 className="h-12 w-12" />
          )}
        </div>
        <div className="flex flex-col justify-end gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Альбом</p>
          <h1 className="text-3xl font-semibold">{album.title}</h1>
          <p className="text-sm text-muted-foreground">
            {album.album_artist}
            {album.year > 0 ? ` · ${album.year}` : ""} · {album.track_count} треков ·{" "}
            {minutes} мин
          </p>
          <div>
            <Button
              onClick={() => {
                const first = album.tracks[0];
                if (first) {
                  playTrack(first, album.tracks);
                }
              }}
              disabled={album.tracks.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Слушать альбом
            </Button>
          </div>
        </div>
      </div>

      <TrackList
        tracks={album.tracks}
        onPlay={(track, queue) => playTrack(track, queue)}
        starred={starred}
        onToggleStar={(track) => void toggleStar(track)}
        playlists={playlists}
        onAddToPlaylist={(playlistId, trackId) => void addToPlaylist(playlistId, trackId)}
      />
    </div>
  );
}
