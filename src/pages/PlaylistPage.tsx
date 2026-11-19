import { useCallback, useEffect, useState } from "react";
import { Download, ListMusic, ListPlus, Lock, Pencil, Play, Share2, Trash2 } from "lucide-react";
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
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPublic, setEditPublic] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const playTrack = usePlayer((state) => state.playTrack);
  const addToQueue = usePlayer((state) => state.addToQueue);
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

  const openEdit = () => {
    if (!detail) return;
    setEditName(detail.playlist.name);
    setEditDescription(detail.playlist.description ?? "");
    setEditPublic(detail.playlist.is_public);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!playlistId || !editName.trim()) return;
    setEditBusy(true);
    try {
      await api.updatePlaylist(playlistId, {
        name: editName.trim(),
        description: editDescription.trim(),
        is_public: editPublic,
      });
      setEditOpen(false);
      load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось сохранить плейлист");
    } finally {
      setEditBusy(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reorder = async (from: number, to: number) => {
    if (!playlistId || !detail) return;
    const ids = detail.tracks.map((track) => track.id);
    const [moved] = ids.splice(from, 1);
    if (!moved) return;
    ids.splice(to, 0, moved);
    try {
      await api.reorderPlaylist(playlistId, ids);
      load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось изменить порядок");
    }
  };

  const removeSelected = async () => {
    if (!playlistId || !detail) return;
    const positions = detail.tracks
      .map((track, index) => (selected.has(track.id) ? index : -1))
      .filter((index) => index >= 0)
      .sort((left, right) => right - left);
    try {
      for (const position of positions) {
        await api.removeFromPlaylist(playlistId, position);
      }
      setSelected(new Set());
      setSelecting(false);
      load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось удалить треки");
    }
  };

  const queueSelected = () => {
    if (!detail) return;
    for (const track of detail.tracks) {
      if (selected.has(track.id)) addToQueue(track);
    }
    setSelected(new Set());
    setSelecting(false);
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
            <Button asChild variant="outline" size="lg">
              <a href={api.playlistM3uUrl(detail.playlist.id)} download>
                <Download className="mr-2 h-4 w-4" />
                M3U
              </a>
            </Button>
            {canManage && (
              <Button variant="outline" size="lg" onClick={openEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Редактировать
              </Button>
            )}
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

      {detail.playlist.description && (
        <p className="max-w-3xl whitespace-pre-line text-sm text-muted-foreground">
          {detail.playlist.description}
        </p>
      )}

      {editOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void saveEdit();
          }}
          className="mc-surface space-y-3 p-4"
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <input
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              placeholder="Название"
              className="mc-field"
            />
            <input
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              placeholder="Описание"
              className="mc-field"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={editPublic}
              onChange={(event) => setEditPublic(event.target.checked)}
            />
            Публичный плейлист
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={editBusy || !editName.trim()}>
              Сохранить
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
          </div>
        </form>
      )}

      {detail.hidden_count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          <Lock className="h-4 w-4" />
          Скрыто {detail.hidden_count} треков — они из библиотек, к которым у вас нет доступа.
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          {!selecting ? (
            <Button variant="outline" size="sm" onClick={() => setSelecting(true)}>
              Выбрать треки
            </Button>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">Выбрано: {selected.size}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={queueSelected}
                disabled={selected.size === 0}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                В очередь
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void removeSelected()}
                disabled={selected.size === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelected(new Set());
                  setSelecting(false);
                }}
              >
                Отмена
              </Button>
            </>
          )}
        </div>
      )}

      <TrackList
        tracks={detail.tracks}
        onPlay={(track, queue) => playTrack(track, queue)}
        onRemove={canEdit ? (position) => void removeTrack(position) : undefined}
        onTracksChanged={load}
        onReorder={canEdit ? (from, to) => void reorder(from, to) : undefined}
        selectable={selecting}
        selected={selected}
        onToggleSelect={toggleSelect}
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
