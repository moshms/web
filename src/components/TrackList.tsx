import { Heart, ListPlus, Play, Trash2 } from "lucide-react";

import type { Playlist, Track } from "@/api";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <div className="mc-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Play className="h-6 w-6 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Треков пока нет.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-1.5">
      {tracks.map((track, index) => (
        <div
          key={`${track.id}-${index}`}
          className="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-accent/55 sm:gap-3"
        >
          <span className="hidden w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground/70 sm:block">
            {track.track_no > 0 ? track.track_no : index + 1}
          </span>

          <button
            type="button"
            onClick={() => onPlay(track, tracks)}
            className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg"
            aria-label={`Играть ${track.title}`}
          >
            <Artwork
              albumId={track.album_id}
              title={track.album ?? track.title}
              className="h-full w-full"
              iconClassName="h-4 w-4"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{track.title}</p>
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
                className={cn(
                  "h-4 w-4",
                  starred?.has(track.id) && "fill-primary text-primary",
                )}
              />
            </Button>
          )}

          {playlists && onAddToPlaylist && playlists.length > 0 && (
            <div className="relative hidden shrink-0 items-center sm:flex">
              <ListPlus className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value=""
                onChange={(event) => {
                  if (event.target.value) {
                    onAddToPlaylist(event.target.value, track.id);
                  }
                }}
                className="h-8 max-w-32 appearance-none rounded-lg border border-border/70 bg-background/60 pl-7 pr-2 text-xs text-muted-foreground outline-none transition hover:text-foreground focus:border-primary"
                aria-label="Добавить в плейлист"
              >
                <option value="">В плейлист…</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {formatDuration(track.duration_ms)}
          </span>

          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
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
