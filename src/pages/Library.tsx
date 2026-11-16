import { useEffect, useMemo, useState } from "react";
import { Grid2X2, List, Loader2, Play, Search, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist } from "@/api";
import { useAuth } from "@/auth";
import { Artwork } from "@/components/Artwork";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { canAnyLibrary, P } from "@/permissions";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

type View = "albums" | "artists";
type Sort = "name" | "year" | "artist";

export function LibraryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<Sort>("name");
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") === "artists" ? "artists" : "albums") as View;
  const playTrack = usePlayer((state) => state.playTrack);
  const { user } = useAuth();
  const { toast } = useToast();
  const canUpload = canAnyLibrary(user, P.LIBRARY_UPLOAD);

  useEffect(() => {
    Promise.all([api.artists(), api.albums()])
      .then(([loadedArtists, loadedAlbums]) => {
        setArtists(loadedArtists);
        setAlbums(loadedAlbums);
      })
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеку"),
      )
      .finally(() => setLoading(false));
  }, []);

  const sortedAlbums = useMemo(() => {
    const copy = [...albums];
    copy.sort((left, right) => {
      if (sort === "year") {
        return right.year - left.year || left.title.localeCompare(right.title);
      }
      if (sort === "artist") {
        return (
          left.album_artist.localeCompare(right.album_artist) ||
          left.title.localeCompare(right.title)
        );
      }
      return left.title.localeCompare(right.title);
    });
    return copy;
  }, [albums, sort]);

  const sortedArtists = useMemo(
    () => [...artists].sort((left, right) => left.name.localeCompare(right.name)),
    [artists],
  );

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
  const current = view === "albums" ? sortedAlbums : sortedArtists;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Библиотека"
        description={`${artists.length} исполнителей · ${albums.length} альбомов · ${trackCount} треков`}
        actions={
          canUpload ? (
            <Button asChild variant="outline">
              <Link to="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Загрузить
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 md:hidden">
        <Button asChild variant="outline" size="sm">
          <Link to="/favorites">Избранное</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/playlists">Плейлисты</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={view}
          onChange={(next) => setParams({ view: next })}
          items={[
            { value: "albums", label: "Альбомы", count: albums.length },
            { value: "artists", label: "Исполнители", count: artists.length },
          ]}
          className="w-full sm:min-w-0 sm:flex-1"
        />
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label="Сортировка"
            className="w-36"
          >
            <option value="name">По названию</option>
            <option value="year">По году</option>
            <option value="artist">По исполнителю</option>
          </Select>
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setLayout("grid")}
              className={cn(
                "rounded p-1.5 text-muted-foreground",
                layout === "grid" && "bg-muted text-foreground",
              )}
              aria-label="Сетка"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setLayout("list")}
              className={cn(
                "rounded p-1.5 text-muted-foreground",
                layout === "list" && "bg-muted text-foreground",
              )}
              aria-label="Список"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="aspect-square" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : current.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title="Здесь пока пусто"
          description="Загрузите музыку или запустите скан библиотеки."
        />
      ) : layout === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {view === "albums"
            ? sortedAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  busy={busyId === album.id}
                  onPlay={() => void playAlbum(album)}
                />
              ))
            : sortedArtists.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  busy={busyId === artist.id}
                  onPlay={() => void playArtist(artist)}
                />
              ))}
        </div>
      ) : (
        <div className="mc-surface divide-y divide-border overflow-hidden">
          {view === "albums"
            ? sortedAlbums.map((album) => (
                <div
                  key={album.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                >
                  <Artwork
                    albumId={album.artwork_id ? album.id : null}
                    title={album.title}
                    className="h-10 w-10 shrink-0 rounded-md"
                    iconClassName="h-4 w-4"
                  />
                  <Link to={`/albums/${album.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{album.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {album.album_artist}
                      {album.year > 0 ? ` · ${album.year}` : ""}
                    </p>
                  </Link>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {album.track_count} треков
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void playAlbum(album)}
                    aria-label={`Играть ${album.title}`}
                  >
                    {busyId === album.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            : sortedArtists.map((artist) => (
                <div
                  key={artist.id}
                  className="group flex items-center gap-3 px-3 py-2 hover:bg-muted/50"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                    {artist.name.slice(0, 1).toUpperCase()}
                  </span>
                  <Link to={`/artists/${artist.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{artist.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {artist.album_count} альбомов · {artist.track_count} треков
                    </p>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void playArtist(artist)}
                    aria-label={`Играть ${artist.name}`}
                  >
                    {busyId === artist.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
        </div>
      )}
    </div>
  );
}
