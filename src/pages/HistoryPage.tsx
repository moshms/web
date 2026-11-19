import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";

import { api, ApiError, type HistoryEntry } from "@/api";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackList } from "@/components/TrackList";
import { usePlayer } from "@/player";

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);

  useEffect(() => {
    api
      .history()
      .then(setEntries)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить историю"),
      )
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const result = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const label = dayLabel(entry.played_at);
      const list = result.get(label) ?? [];
      list.push(entry);
      result.set(label, list);
    }
    return [...result.entries()];
  }, [entries]);

  return (
    <div className="space-y-6">
      <PageHeader title="История" description="Недавно прослушанные треки." />

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="История пуста"
          description="Послушайте трек, и он появится здесь."
        />
      ) : (
        groups.map(([label, tracks]) => (
          <section key={label} className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </h2>
            <TrackList
              tracks={tracks}
              onPlay={(track, queue) => playTrack(track, queue)}
            />
          </section>
        ))
      )}
    </div>
  );
}
