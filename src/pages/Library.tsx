import { useEffect, useState } from "react";
import { Grid2X2, List, Loader2, Play, Search, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist, type Genre, type Library, type Track } from "@/api";
import { useAuth } from "@/auth";
import { Artwork } from "@/components/Artwork";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { TrackList } from "@/components/TrackList";
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

type View = "albums" | "artists" | "tracks" | "genres";
type Sort = "name" | "year" | "artist";

const PAGE_SIZE = 100;

export function LibraryPage() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [artistTotal, setArtistTotal] = useState(0);
  const [albumTotal, setAlbumTotal] = useState(0);
  const [trackTotal, setTrackTotal] = useState(0);
  const [libraryFilter, setLibraryFilter] = useState("");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState<View | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<Sort>("name");
  const [params, setParams] = useSearchParams();
  const rawView = params.get("view");
  const view: View =
    rawView === "artists" || rawView === "tracks" || rawView === "genres" ? rawView : "albums";
  const playTrack = usePlayer((state) => state.playTrack);
  const { user } = useAuth();
  const { toast } = useToast();
  const canUpload = canAnyLibrary(user, P.LIBRARY_UPLOAD);

  useEffect(() => {
    Promise.all([
      api.libraries(),
      api.albumsPage({ limit: 1, offset: 0, sort: "name" }),
      api.artistsPage({ limit: 1, offset: 0 }),
      api.tracksPage({ limit: 1, offset: 0 }),
    ])
      .then(([loadedLibraries, albumPage, artistPage, trackPage]) => {
        setLibraries(loadedLibraries);
        setAlbumTotal(albumPage.total);
        setArtistTotal(artistPage.total);
        setTrackTotal(trackPage.total);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const libraryId = libraryFilter || undefined;

    const load = async () => {
      try {
        if (view === "albums") {
          const page = await api.albumsPage({ limit: PAGE_SIZE, offset: 0, sort, libraryId });
          if (!cancelled) {
            setAlbums(page.items);
            setAlbumTotal(page.total);
          }
        } else if (view === "artists") {
          const page = await api.artistsPage({ limit: PAGE_SIZE, offset: 0, libraryId });
          if (!cancelled) {
            setArtists(page.items);
            setArtistTotal(page.total);
          }
        } else if (view === "tracks") {
          const page = await api.tracksPage({
            limit: PAGE_SIZE,
            offset: 0,
            libraryId,
            genreId: genreFilter ?? undefined,
          });
          if (!cancelled) {
            setTracks(page.items);
            setTrackTotal(page.total);
          }
        } else {
          const loaded = await api.genres(libraryId);
          if (!cancelled) {
            setGenres(loaded);
          }
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить библиотеку");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [view, libraryFilter, sort, genreFilter]);

  const loadMore = async () => {
    setLoadingMore(view);
    setError(null);
    const libraryId = libraryFilter || undefined;
    try {
      if (view === "albums") {
        const page = await api.albumsPage({
          limit: PAGE_SIZE,
          offset: albums.length,
          sort,
          libraryId,
        });
        setAlbums((current) => [...current, ...page.items]);
        setAlbumTotal(page.total);
      } else if (view === "artists") {
        const page = await api.artistsPage({
          limit: PAGE_SIZE,
          offset: artists.length,
          libraryId,
        });
        setArtists((current) => [...current, ...page.items]);
        setArtistTotal(page.total);
      } else if (view === "tracks") {
        const page = await api.tracksPage({
          limit: PAGE_SIZE,
          offset: tracks.length,
          libraryId,
          genreId: genreFilter ?? undefined,
        });
        setTracks((current) => [...current, ...page.items]);
        setTrackTotal(page.total);
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить ещё");
    } finally {
      setLoadingMore(null);
    }
  };

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

  const current =
    view === "albums" ? albums : view === "artists" ? artists : view === "tracks" ? tracks : genres;
  const currentTotal =
    view === "albums"
      ? albumTotal
      : view === "artists"
        ? artistTotal
        : view === "tracks"
          ? trackTotal
          : genres.length;
  const canLoadMore = view !== "genres" && current.length < currentTotal;
  const activeGenre = genres.find((genre) => genre.id === genreFilter)?.name;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Библиотека"
        description={`${artistTotal} исполнителей · ${albumTotal} альбомов`}
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
            { value: "albums", label: "Альбомы", count: albumTotal },
            { value: "artists", label: "Исполнители", count: artistTotal },
            { value: "tracks", label: "Треки", count: trackTotal },
            { value: "genres", label: "Жанры", count: genres.length },
          ]}
          className="w-full sm:min-w-0 sm:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <Select
            value={libraryFilter}
            onChange={(event) => setLibraryFilter(event.target.value)}
            aria-label="Библиотека"
            className="w-44"
          >
            <option value="">Все библиотеки</option>
            {libraries.map((library) => (
              <option key={library.id} value={library.id}>
                {library.name}
              </option>
            ))}
          </Select>
          {view === "albums" && (
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
          )}
          {(view === "albums" || view === "artists") && (
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
          )}
        </div>
      </div>

      {activeGenre && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Жанр: <span className="text-foreground">{activeGenre}</span>
          <Button variant="ghost" size="sm" onClick={() => setGenreFilter(null)}>
            Сбросить
          </Button>
        </div>
      )}

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
      ) : view === "tracks" ? (
        <div className="mc-surface overflow-hidden px-2">
          <TrackList
            tracks={tracks}
            onPlay={(track, queue) => playTrack(track, queue)}
          />
        </div>
      ) : view === "genres" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {genres.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => {
                setGenreFilter(genre.id);
                setParams({ view: "tracks" });
              }}
              className="mc-surface p-4 text-left transition-colors hover:bg-muted/50"
            >
              <p className="truncate text-sm font-medium">{genre.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{genre.track_count} треков</p>
            </button>
          ))}
        </div>
      ) : layout === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {view === "albums"
            ? albums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  busy={busyId === album.id}
                  onPlay={() => void playAlbum(album)}
                />
              ))
            : artists.map((artist) => (
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
            ? albums.map((album) => (
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
            : artists.map((artist) => (
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

      {canLoadMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loadingMore !== null}
          >
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Показать ещё
          </Button>
        </div>
      )}
    </div>
  );
}
