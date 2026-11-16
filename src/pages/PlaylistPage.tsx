import { useCallback, useEffect, useState } from "react";
import { ListMusic, Lock, Play, Share2, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { api, ApiError, type PlaylistDetail } from "@/api";
import { useAuth } from "@/auth";
import { EntityHeader } from "@/components/EntityHeader";
import { PlaylistShareDialog } from "@/components/PlaylistShareDialog";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { can, P } from "@/permissions";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";

export function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PlaylistDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const playTrack = usePlayer((state) => state.playTrack);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = useCallback(() => {
    if (!playlistId) {
      return;
    }
    api
      .playlist(playlistId)
      .then(setDetail)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлист"),
      );
  }, [playlistId]);

  useEffect(() => {
    load();
  }, [load]);

  const removeTrack = async (position: number) => {
    if (!playlistId) {
      return;
    }
    try {
      await api.removeFromPlaylist(playlistId, position);
      toast("Трек убран из плейлиста");
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
    return <div className="mc-surface p-8 text-center text-sm text-destructive">{error}</div>;
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const canManage =
    (detail.permissions & P.PLAYLIST_MANAGE) !== 0 || can(user, P.ADMINISTRATOR);
  const canEdit = (detail.permissions & P.PLAYLIST_EDIT) !== 0 || canManage;

  return (
    <div className="space-y-6">
      <EntityHeader
        kind="Плейлист"
        title={detail.playlist.name}
        backTo="/playlists"
        backLabel="Плейлисты"
        artwork={
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ListMusic className="h-12 w-12 text-muted-foreground" />
          </div>
        }
        meta={
          <span>
            {detail.playlist.owner} · {detail.playlist.song_count} треков ·{" "}
            {detail.playlist.is_public ? "публичный" : "приватный"}
          </span>
        }
        actions={
          <>
            <Button
              size="lg"
              className="rounded-full px-6"
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
            {canManage && (
              <Button variant="outline" size="lg" onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Поделиться
              </Button>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-destructive"
                onClick={() => void removePlaylist()}
                aria-label="Удалить плейлист"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        }
      />

      {detail.hidden_count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" />
          Скрыто {detail.hidden_count} треков — они из библиотек, к которым у вас нет доступа.
        </div>
      )}

      <TrackList
        tracks={detail.tracks}
        onPlay={(track, queue) => playTrack(track, queue)}
        onRemove={canEdit ? (position) => void removeTrack(position) : undefined}
        onTracksChanged={load}
      />

      <PlaylistShareDialog
        playlistId={detail.playlist.id}
        playlistName={detail.playlist.name}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onChanged={load}
      />
    </div>
  );
}
