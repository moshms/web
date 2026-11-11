import { useEffect, useMemo, useState } from "react";
import { Library, Loader2, Play, Search, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError, type Album, type Artist } from "@/api";
import { useAuth } from "@/auth";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

type Tab = "artists" | "albums";

export function LibraryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tab, setTab] = useState<Tab>("artists");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { user } = useAuth();
  const { toast } = useToast();
  const canUpload = user?.role === "admin" || user?.role === "uploader";

  useEffect(() => {
    Promise.all([api.artists(), api.albums()])
      .then(([loadedArtists, loadedAlbums]) => {
        setArtists(loadedArtists);
        setAlbums(loadedAlbums);
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеку",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const filteredArtists = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) {
      return artists;
    }
    return artists.filter((artist) => artist.name.toLocaleLowerCase().includes(value));
  }, [artists, query]);

  const filteredAlbums = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) {
      return albums;
    }
    return albums.filter(
      (album) =>
        album.title.toLocaleLowerCase().includes(value) ||
        album.album_artist.toLocaleLowerCase().includes(value),
    );
  }, [albums, query]);

  const playAlbum = async (album: Album) => {
    setBusyId(album.id);
    try {
      const detail = await api.album(album.id);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      toast("Не удалось запустить альбом", "error");
    } finally {
      setBusyId(null);
    }
  };

  const playArtist = async (artist: Artist) => {
    setBusyId(artist.id);
    try {
      const artistAlbums = await api.albums(artist.id);
      const details = await Promise.all(artistAlbums.map((album) => api.album(album.id)));
      const tracks = details.flatMap((detail) => detail.tracks);
      if (tracks.length > 0) {
        playTrack(tracks[0], tracks);
      }
    } catch {
      toast("Не удалось запустить исполнителя", "error");
    } finally {
      setBusyId(null);
    }
  };

  const trackCount = artists.reduce((sum, artist) => sum + artist.track_count, 0);
  const noMatches =
    !loading &&
    !error &&
    Boolean(query.trim()) &&
    ((tab === "artists" && filteredArtists.length === 0) ||
      (tab === "albums" && filteredAlbums.length === 0));

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Ваша коллекция
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            Библиотека
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {artists.length > 0
              ? `${artists.length} исполнителей · ${albums.length} альбомов · ${trackCount} треков`
              : "Исполнители и альбомы"}
          </p>
        </div>
        {canUpload && (
          <Button asChild>
            <Link to="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Загрузить музыку
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Фильтр по библиотеке"
            className="mc-field pl-10"
          />
        </div>

        <div className="inline-flex w-fit rounded-full border border-border/70 bg-card/60 p-1">
          {(
            [
              ["artists", "Исполнители", artists.length],
              ["albums", "Альбомы", albums.length],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
                tab === value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label} <span className="opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <div className="aspect-square animate-pulse rounded-2xl bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mc-surface border-destructive/30 p-6 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && artists.length === 0 && (
        <div className="mc-surface flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Library className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-semibold">Библиотека пуста</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Загрузите музыку или запустите скан в админке.
            </p>
          </div>
          {canUpload && (
            <Button asChild>
              <Link to="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Загрузить музыку
              </Link>
            </Button>
          )}
        </div>
      )}

      {!loading && !error && tab === "artists" && filteredArtists.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filteredArtists.map((artist) => (
            <div key={artist.id} className="group relative">
              <Link
                to={`/artists/${artist.id}`}
                className="mc-surface block rounded-2xl p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              >
                <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 via-accent to-secondary">
                  <span className="text-4xl font-semibold text-primary/70">
                    {artist.name.slice(0, 1).toUpperCase()}
                  </span>
                </div>
                <p className="truncate font-medium group-hover:text-primary">{artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {artist.album_count} альбомов · {artist.track_count} треков
                </p>
              </Link>
              <Button
                size="icon"
                className="absolute bottom-14 right-5 h-10 w-10 rounded-full opacity-0 shadow-lg transition group-hover:opacity-100"
                onClick={() => void playArtist(artist)}
                aria-label={`Играть ${artist.name}`}
              >
                {busyId === artist.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && tab === "albums" && filteredAlbums.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filteredAlbums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              busy={busyId === album.id}
              onPlay={() => void playAlbum(album)}
            />
          ))}
        </div>
      )}

      {noMatches && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          По запросу «{query.trim()}» ничего не найдено.
        </p>
      )}
    </div>
  );
}

export function AlbumCard({
  album,
  busy,
  onPlay,
}: {
  album: Album;
  busy?: boolean;
  onPlay?: () => void;
}) {
  return (
    <div className="group relative">
      <Link
        to={`/albums/${album.id}`}
        className="block rounded-2xl p-2 transition hover:-translate-y-0.5 hover:bg-accent/40"
      >
        <Artwork
          albumId={album.artwork_id ? album.id : null}
          title={album.title}
          className="mb-3 aspect-square w-full rounded-xl shadow-sm"
        />
        <p className="truncate text-sm font-medium group-hover:text-primary">{album.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {album.album_artist}
          {album.year > 0 ? ` · ${album.year}` : ""}
        </p>
      </Link>
      {onPlay && (
        <Button
          size="icon"
          className="absolute bottom-14 right-4 h-10 w-10 rounded-full opacity-0 shadow-lg transition group-hover:opacity-100 focus-visible:opacity-100"
          onClick={onPlay}
          aria-label={`Играть ${album.title}`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="ml-0.5 h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
