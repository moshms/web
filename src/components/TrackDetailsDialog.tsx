import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { api, ApiError, type Track } from "@/api";
import { Dialog } from "@/components/ui/dialog";

type TrackDetails = Track & {
  year: number;
  bitrate: number | null;
  sample_rate: number | null;
  lyrics: string | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(milliseconds: number | null) {
  if (!milliseconds) return "—";
  const seconds = Math.round(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function TrackDetailsDialog({
  trackId,
  open,
  onClose,
}: {
  trackId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [track, setTrack] = useState<TrackDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !trackId) {
      return;
    }
    setTrack(null);
    setError(null);
    api
      .track(trackId)
      .then((loaded) => setTrack(loaded as TrackDetails))
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить сведения"),
      );
  }, [open, trackId]);

  const rows = track
    ? [
        ["Исполнитель", track.artist ?? "—"],
        ["Альбом", track.album ?? "—"],
        ["Год", track.year > 0 ? String(track.year) : "—"],
        ["Формат", track.format ?? "—"],
        ["Битрейт", track.bitrate ? `${track.bitrate} kbps` : "—"],
        ["Частота", track.sample_rate ? `${track.sample_rate} Hz` : "—"],
        ["Длительность", formatDuration(track.duration_ms)],
        ["Размер", formatSize(track.size)],
        ["Файл", track.file_key],
        ["Библиотека", track.library_id],
        ["Загрузил", track.uploaded_by ?? "—"],
      ]
    : [];

  return (
    <Dialog open={open} onClose={onClose} title="Сведения о треке" size="lg">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!track && !error ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Загружаем…
        </p>
      ) : (
        <dl className="divide-y divide-border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {track?.lyrics && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Текст
          </p>
          <p className="whitespace-pre-line text-sm">{track.lyrics}</p>
        </div>
      )}
    </Dialog>
  );
}
