import { Heart, Play, Trash2 } from "lucide-react";

import type { Playlist, Track } from "@/api";
import { Button } from "@/components/ui/button";

type TrackListProps = {
  tracks: Track[];
  onPlay: (track: Track, queue: Track[]) => void;
  starred?: Set<string>;
  onToggleStar?: (track: Track) => void;
  playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
  onRemove?: (position: number) => void;
};

function formatDuration(milliseconds: number | null) {
  if (!milliseconds) {
    return "—";
  }

  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function TrackList({
  tracks,
  onPlay,
  starred,
  onToggleStar,
  playlists,
  onAddToPlaylist,
  onRemove,
}: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Треков пока нет.</p>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-white">
      {tracks.map((track, index) => (
        <div
          key={`${track.id}-${index}`}
          className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-zinc-50"
        >
          <span className="w-8 text-right text-xs text-muted-foreground">{index + 1}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onPlay(track, tracks)}
            aria-label={`Играть ${track.title}`}
          >
            <Play className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {track.artist ?? "Неизвестный исполнитель"}
              {track.album ? ` · ${track.album}` : ""}
            </p>
          </div>
          {onToggleStar && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onToggleStar(track)}
              aria-label={starred?.has(track.id) ? "Убрать из избранного" : "В избранное"}
            >
              <Heart
                className={`h-4 w-4 ${
                  starred?.has(track.id) ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </Button>
          )}
          {playlists && onAddToPlaylist && playlists.length > 0 && (
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  onAddToPlaylist(event.target.value, track.id);
                }
              }}
              className="hidden h-8 max-w-36 rounded-md border bg-white px-2 text-xs text-muted-foreground sm:block"
              aria-label="Добавить в плейлист"
            >
              <option value="">В плейлист…</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          )}
          <span className="w-10 text-right text-xs text-muted-foreground">
            {formatDuration(track.duration_ms)}
          </span>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRemove(index)}
              aria-label="Убрать из плейлиста"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
