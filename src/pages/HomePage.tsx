import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Library, Pause, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { api, ApiError } from "@/api";
import { Artwork } from "@/components/Artwork";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/player";

function SectionHeader({
  title,
  to,
  icon,
}: {
  title: string;
  to?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h2>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Смотреть всё
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function HomePage() {
  const albumsQuery = useQuery({ queryKey: ["albums"], queryFn: () => api.albums() });
  const favoritesQuery = useQuery({ queryKey: ["favorites"], queryFn: () => api.favorites() });
  const artistsQuery = useQuery({ queryKey: ["artists"], queryFn: () => api.artists() });
  const albums = albumsQuery.data ?? [];
  const favorites = favoritesQuery.data ?? null;
  const artists = artistsQuery.data ?? [];
  const loading =
    albumsQuery.isLoading || favoritesQuery.isLoading || artistsQuery.isLoading;
  const error =
    albumsQuery.error ?? favoritesQuery.error ?? artistsQuery.error;

  const queue = usePlayer((state) => state.queue);
  const index = usePlayer((state) => state.index);
  const playing = usePlayer((state) => state.playing);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const track = queue[index] ?? null;

  const randomAlbums = useMemo(() => {
    const copy = [...albums];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const swap = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[swap]] = [copy[swap], copy[i]];
    }
    return copy.slice(0, 10);
  }, [albums]);

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Домой"
        description="Продолжите слушать, откройте новое или вернитесь к любимому."
        actions={
          <Button asChild variant="outline">
            <Link to="/library">
              <Library className="mr-2 h-4 w-4" />
              Библиотека
            </Link>
          </Button>
        }
      />

      {error && (
        <div className="mc-surface border-destructive/30 p-4 text-sm text-destructive">
          {error instanceof ApiError ? error.message : "Не удалось загрузить главную"}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <EmptyState
          icon={<Library className="h-5 w-5" />}
          title="Библиотека пуста"
          description="Загрузите музыку или запустите скан в управлении."
          action={
            <Button asChild>
              <Link to="/library">Открыть библиотеку</Link>
            </Button>
          }
        />
      ) : (
        <>
          <section>
            <SectionHeader title="Продолжить" icon={<Clock3 className="h-4 w-4" />} />
            {track ? (
              <div className="mc-surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <Artwork
                  albumId={track.album_id}
                  title={track.album ?? track.title}
                  className="h-24 w-24 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">{track.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {track.artist ?? "Неизвестный исполнитель"}
                    {track.album ? ` · ${track.album}` : ""}
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <Button
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full"
                  onClick={() => setPlaying(!playing)}
                  aria-label={playing ? "Пауза" : "Продолжить"}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="mc-surface flex items-center justify-between gap-4 p-4">
                <p className="text-sm text-muted-foreground">
                  Здесь появится последний трек, который вы слушали.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/library">Выбрать музыку</Link>
                </Button>
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Недавно добавлено" to="/library" />
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
              {albums.slice(0, 10).map((album) => (
                <AlbumCard key={album.id} album={album} className="w-36 shrink-0 sm:w-40" />
              ))}
            </div>
          </section>

          {favorites && (favorites.albums.length > 0 || favorites.artists.length > 0) && (
            <section>
              <SectionHeader title="Избранное" to="/favorites" icon={<Sparkles className="h-4 w-4" />} />
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                {favorites.albums.slice(0, 10).map((album) => (
                  <AlbumCard key={album.id} album={album} className="w-36 shrink-0 sm:w-40" />
                ))}
                {favorites.artists.slice(0, 10).map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} className="w-36 shrink-0 sm:w-40" />
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHeader title="Случайные альбомы" to="/library" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {randomAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
          </section>

          {artists.length > 0 && (
            <section>
              <SectionHeader title="Исполнители" to="/library" />
              <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1">
                {artists.slice(0, 10).map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} className="w-36 shrink-0 sm:w-40" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
