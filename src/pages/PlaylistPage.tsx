import { useEffect, useState } from "react";
import { Play, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError, type PlaylistDetail } from "@/api";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";

export function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);

  const load = () => {
    if (!playlistId) {
      return;
    }

    api
      .playlist(playlistId)
      .then(setDetail)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлист"),
      );
  };

  useEffect(() => {
    load();
  }, [playlistId]);

  const removeTrack = async (position: number) => {
    if (!playlistId) {
      return;
    }

    try {
      await api.removeFromPlaylist(playlistId, position);
      load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось убрать трек");
    }
  };

  const removePlaylist = async () => {
    if (!playlistId || !window.confirm("Удалить плейлист?")) {
      return;
    }

    try {
      await api.deletePlaylist(playlistId);
      navigate("/playlists");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось удалить плейлист");
    }
  };

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!detail) {
    return <p className="text-sm text-muted-foreground">Загружаем плейлист…</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/playlists" className="text-sm text-muted-foreground hover:underline">
        ← Плейлисты
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{detail.playlist.name}</h1>
          <p className="text-sm text-muted-foreground">
            {detail.playlist.owner} · {detail.playlist.song_count} треков
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const first = detail.tracks[0];
              if (first) {
                playTrack(first, detail.tracks);
              }
            }}
            disabled={detail.tracks.length === 0}
          >
            <Play className="mr-2 h-4 w-4" />
            Слушать
          </Button>
          <Button variant="outline" onClick={() => void removePlaylist()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </Button>
        </div>
      </div>

      <TrackList
        tracks={detail.tracks}
        onPlay={(track, queue) => playTrack(track, queue)}
        onRemove={(position) => void removeTrack(position)}
      />
    </div>
  );
}
