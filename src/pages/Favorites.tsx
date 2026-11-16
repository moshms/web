import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { api, ApiError, type Favorites as FavoritesData, type Track } from "@/api";
import { AlbumCard, ArtistCard } from "@/components/MediaCard";
import { TrackList } from "@/components/TrackList";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoritesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const playTrack = usePlayer((state) => state.playTrack);
  const { toast } = useToast();

  useEffect(() => {
    api
      .favorites()
      .then(setFavorites)
      .catch((caught) =>
        setError(caught instanceof ApiError ? caught.message : "Не удалось загрузить избранное"),
      );
  }, []);

  const toggleStar = async (track: Track) => {
    try {
      await api.unstarTrack(track.id);
      setFavorites((current) =>
        current
          ? { ...current, tracks: current.tracks.filter((item) => item.id !== track.id) }
          : current,
      );
      toast("Трек убран из избранного");
    } catch {
      toast("Не удалось обновить избранное", "error");
    }
  };

  const playAlbum = async (albumId: string) => {
    setBusyId(albumId);
    try {
      const detail = await api.album(albumId);
      if (detail.tracks.length > 0) {
        playTrack(detail.tracks[0], detail.tracks);
      }
    } catch {
      toast("Не удалось запустить альбом", "error");
    } finally {
      setBusyId(null);
    }
  };

  const playArtist = async (artistId: string) => {
    setBusyId(artistId);
    try {
      const artistAlbums = await api.albums(artistId);
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

  if (error) {
    return <div className="mc-surface p-8 text-center text-sm text-destructive">{error}</div>;
  }

  if (!favorites) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-56 animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  const hasFavorites =
    favorites.tracks.length > 0 ||
    favorites.albums.length > 0 ||
    favorites.artists.length > 0;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Избранное"
        description="Треки, альбомы и исполнители, которые вы отметили."
      />

      {!hasFavorites && (
        <EmptyState
          icon={<Heart className="h-5 w-5" />}
          title="Пока пусто"
          description="Нажимайте на сердечко у треков, альбомов и исполнителей."
        />
      )}

      {favorites.tracks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            Треки <span className="text-sm font-normal text-muted-foreground">{favorites.tracks.length}</span>
          </h2>
          <TrackList
            tracks={favorites.tracks}
            onPlay={(track, queue) => playTrack(track, queue)}
            starred={new Set(favorites.tracks.map((track) => track.id))}
            onToggleStar={(track) => void toggleStar(track)}
          />
        </section>
      )}

      {favorites.albums.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            Альбомы <span className="text-sm font-normal text-muted-foreground">{favorites.albums.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {favorites.albums.map((album) => (
              <AlbumCard
                key={album.id}
                album={album}
                busy={busyId === album.id}
                onPlay={() => void playAlbum(album.id)}
              />
            ))}
          </div>
        </section>
      )}

      {favorites.artists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            Исполнители{" "}
            <span className="text-sm font-normal text-muted-foreground">{favorites.artists.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {favorites.artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                busy={busyId === artist.id}
                onPlay={() => void playArtist(artist.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
