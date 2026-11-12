import { useCallback, useEffect, useState } from "react";
import { ListMusic, Lock, Play, Share2, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, ApiError, type PlaylistDetail } from "@/api";
import { useAuth } from "@/auth";
import { TrackList } from "@/components/TrackList";
import { PlaylistShareDialog } from "@/components/PlaylistShareDialog";
import { Button } from "@/components/ui/button";
import { tracksLabel } from "@/lib/plural";
import { can, P } from "@/permissions";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

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
        setError(
          caught instanceof ApiError ? caught.message : "Не удалось загрузить плейлист",
        ),
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
    return (
      <div className="mc-surface p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <div className="h-48 animate-pulse rounded-3xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  const canManage =
    (detail.permissions & P.PLAYLIST_MANAGE) !== 0 || can(user, P.ADMINISTRATOR);
  const canEdit = (detail.permissions & P.PLAYLIST_EDIT) !== 0 || canManage;

  return (
    <div className="space-y-6">
      <Link
        to="/playlists"
        className="inline-flex items-center text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← Плейлисты
      </Link>

      <section className="relative overflow-hidden rounded-3xl bg-card/60 p-5 md:p-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="flex aspect-square w-40 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/35 via-primary/15 to-secondary text-primary/70 shadow-xl sm:w-44">
            <ListMusic className="h-12 w-12" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Плейлист
            </p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              {detail.playlist.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {detail.playlist.owner} · {tracksLabel(detail.playlist.song_count)} ·{" "}
              {detail.playlist.is_public ? "публичный" : "приватный"}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
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
                  className={cn("h-11 w-11 text-muted-foreground hover:text-destructive")}
                  onClick={() => void removePlaylist()}
                  aria-label="Удалить плейлист"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {detail.hidden_count > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
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
