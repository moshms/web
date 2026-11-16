import { useCallback, useEffect, useState } from "react";
import { Heart, Play, Shuffle } from "lucide-react";
import { useParams } from "react-router-dom";

import { api, ApiError, type Album, type Artist, type Track } from "@/api";
import { Artwork } from "@/components/Artwork";
import { EntityHeader } from "@/components/EntityHeader";
import { AlbumCard } from "@/components/MediaCard";
import { TrackList } from "@/components/TrackList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [starred, setStarred] = useState(false);
  const [busyAlbum, setBusyAlbum] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!artistId) {
      return;
    }
    try {
      const [artists, loadedAlbums, favorites] = await Promise.all([
        api.artists(),
        api.albums(artistId),
        api.favorites(),
      ]);
      setArtist(artists.find((item) => item.id === artistId) ?? null);
      setAlbums(loadedAlbums);
      setStarred(favorites.artists.some((item) => item.id === artistId));

      const details = await Promise.all(loadedAlbums.map((album) => api.album(album.id)));
      setTracks(details.flatMap((detail) => detail.tracks));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить исполнителя");
    }
  }, [artistId]);

  useEffect(() => {
    void load();
  }, [load]);

  const playAll = (shuffle = false) => {
    if (tracks.length === 0) {
      return;
    }
    const queue = shuffle ? [...tracks].sort(() => Math.random() - 0.5) : tracks;
    playTrack(queue[0], queue);
  };

  const playAlbum = async (album: Album) => {
    setBusyAlbum(album.id);
    try {
      const detail = await api.album(album.id);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      toast("Не удалось запустить альбом", "error");
    } finally {
      setBusyAlbum(null);
    }
  };

  const toggleStar = async () => {
    if (!artist) {
      return;
    }
    const nextStarred = !starred;
    setStarred(nextStarred);
    try {
      if (nextStarred) {
        await api.starArtist(artist.id);
      } else {
        await api.unstarArtist(artist.id);
      }
    } catch {
      setStarred(!nextStarred);
      toast("Не удалось обновить избранное", "error");
    }
  };

  if (error) {
    return <div className="mc-surface p-8 text-center text-sm text-destructive">{error}</div>;
  }

  if (!artist) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const coverAlbum = albums.find((album) => album.artwork_id);
  const popular = tracks.slice(0, 5);

  return (
    <div className="space-y-7">
      <EntityHeader
        kind="Исполнитель"
        title={artist.name}
        backTo="/library?view=artists"
        backLabel="Исполнители"
        artwork={
          coverAlbum ? (
            <Artwork albumId={coverAlbum.id} title={artist.name} className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-5xl font-semibold text-muted-foreground">
              {artist.name.slice(0, 1).toUpperCase()}
            </div>
          )
        }
        meta={
          <span>
            {artist.album_count} альбомов · {artist.track_count} треков
          </span>
        }
        actions={
          <>
            <Button
              size="lg"
              className="rounded-full px-6"
              onClick={() => playAll(false)}
              disabled={tracks.length === 0}
            >
              <Play className="mr-2 h-4 w-4" />
              Слушать
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => playAll(true)}
              disabled={tracks.length === 0}
              aria-label="Перемешать"
              title="Перемешать"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10"
              onClick={() => void toggleStar()}
              aria-label={starred ? "Убрать из избранного" : "В избранное"}
            >
              <Heart className={cn("h-4 w-4", starred && "fill-foreground")} />
            </Button>
          </>
        }
      />

      {popular.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Популярное</h2>
          <TrackList
            tracks={popular}
            onPlay={(track, queue) => playTrack(track, queue)}
            onTracksChanged={() => void load()}
          />
        </section>
      )}

      {albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Альбомы</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                busy={busyAlbum === album.id}
                onPlay={() => void playAlbum(album)}
              />
            ))}
          </div>
        </section>
      )}

      {albums.length === 0 && tracks.length === 0 && (
        <div className="mc-surface p-8 text-center text-sm text-muted-foreground">
          У этого исполнителя пока нет доступных треков.
        </div>
      )}
    </div>
  );
}
