import { useEffect, useState } from "react";
import { Music2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist } from "@/api";

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      return;
    }

    Promise.all([api.artists(), api.albums(artistId)])
      .then(([artists, loadedAlbums]) => {
        setArtist(artists.find((item) => item.id === artistId) ?? null);
        setAlbums(loadedAlbums);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить исполнителя"),
      );
  }, [artistId]);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Библиотека
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{artist?.name ?? "Исполнитель"}</h1>
        <p className="text-sm text-muted-foreground">{albums.length} альбомов</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {albums.map((album) => (
          <Link
            key={album.id}
            to={`/albums/${album.id}`}
            className="group rounded-lg border bg-white p-3 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-zinc-400">
              {album.artwork_id ? (
                <img
                  src={api.artworkUrl(album.id)}
                  alt={album.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Music2 className="h-8 w-8" />
              )}
            </div>
            <p className="truncate font-medium group-hover:underline">{album.title}</p>
            <p className="text-xs text-muted-foreground">
              {album.year > 0 ? `${album.year} · ` : ""}
              {album.track_count} треков
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
