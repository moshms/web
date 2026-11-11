import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type Artist } from "@/api";

export function LibraryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .artists()
      .then(setArtists)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеку"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Библиотека</h1>
        <p className="text-sm text-muted-foreground">
          {artists.length > 0 ? `${artists.length} исполнителей` : "Исполнители и альбомы"}
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Загружаем…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && artists.length === 0 && (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
          Библиотека пуста. Администратор может запустить скан в разделе «Админка».
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {artists.map((artist) => (
          <Link
            key={artist.id}
            to={`/artists/${artist.id}`}
            className="group rounded-lg border bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
              <Music2 className="h-8 w-8" />
            </div>
            <p className="truncate font-medium group-hover:underline">{artist.name}</p>
            <p className="text-xs text-muted-foreground">
              {artist.album_count} альбомов · {artist.track_count} треков
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
