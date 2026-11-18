import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { type Track } from "@/api";
import { Artwork } from "@/components/Artwork";
import { cn } from "@/lib/utils";

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-0.5 rounded-full bg-current transition-all",
            playing ? "animate-pulse" : "h-1",
          )}
          style={
            playing
              ? { height: `${4 + ((bar * 5) % 8)}px`, animationDelay: `${bar * 140}ms` }
              : undefined
          }
        />
      ))}
    </span>
  );
}

export function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(children, document.body);
}

export function QueueRow({
  track,
  active,
  playing,
  onClick,
  onRemove,
  dark,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  onClick: () => void;
  onRemove: () => void;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        active ? (dark ? "bg-white/10" : "bg-accent") : dark ? "hover:bg-white/5" : "hover:bg-muted/60",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={cn("flex w-5 shrink-0 items-center justify-center", dark ? "text-white/40" : "text-muted-foreground")}>
          {active ? <Equalizer playing={playing} /> : null}
        </span>
        <Artwork
          albumId={track.album_id}
          title={track.album ?? track.title}
          className="h-8 w-8 shrink-0 rounded-md"
          iconClassName="h-4 w-4"
        />
        <div className="min-w-0">
          <p className={cn("truncate text-sm", active && (dark ? "font-medium text-white" : "font-medium text-foreground"))}>
            {track.title}
          </p>
          <p className={cn("truncate text-xs", dark ? "text-white/50" : "text-muted-foreground")}>
            {track.artist ?? "Неизвестный исполнитель"}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "rounded-md p-1.5 opacity-0 transition group-hover:opacity-100",
          dark ? "text-white/40 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        )}
        aria-label="Убрать из очереди"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
