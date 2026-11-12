import { Loader2, ListMusic, Play } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { Album, Artist, Playlist } from "@/api";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { albumsLabel, tracksLabel } from "@/lib/plural";
import { cn } from "@/lib/utils";

type MediaCardProps = {
  to: string;
  title: string;
  subtitle?: string;
  artwork: ReactNode;
  badge?: ReactNode;
  onPlay?: () => void;
  busy?: boolean;
  className?: string;
};

export function MediaCard({
  to,
  title,
  subtitle,
  artwork,
  badge,
  onPlay,
  busy,
  className,
}: MediaCardProps) {
  return (
    <div className={cn("group relative min-w-0", className)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted shadow-sm transition-shadow duration-300 group-hover:shadow-2xl group-hover:shadow-black/15 dark:group-hover:shadow-black/50">
        <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-[1.04]">
          {artwork}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <Link to={to} className="absolute inset-0 z-10" aria-label={`Открыть ${title}`} />
        {badge && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-full bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur">
            {badge}
          </span>
        )}
        {onPlay && (
          <Button
            size="icon"
            className="absolute bottom-3 right-3 z-20 h-10 w-10 rounded-full opacity-100 shadow-lg transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus-visible:translate-y-0 sm:focus-visible:opacity-100"
            onClick={onPlay}
            aria-label={`Играть ${title}`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <Link to={to} className="block px-1 pt-3">
        <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
          {title}
        </p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </Link>
    </div>
  );
}

export function AlbumCard({
  album,
  onPlay,
  busy,
}: {
  album: Album;
  onPlay?: () => void;
  busy?: boolean;
}) {
  return (
    <MediaCard
      to={`/albums/${album.id}`}
      title={album.title}
      subtitle={`${album.album_artist}${album.year > 0 ? ` · ${album.year}` : ""}`}
      artwork={
        <Artwork
          albumId={album.artwork_id ? album.id : null}
          title={album.title}
          className="h-full w-full"
        />
      }
      onPlay={onPlay}
      busy={busy}
    />
  );
}

export function ArtistCard({
  artist,
  onPlay,
  busy,
}: {
  artist: Artist;
  onPlay?: () => void;
  busy?: boolean;
}) {
  return (
    <MediaCard
      to={`/artists/${artist.id}`}
      title={artist.name}
      subtitle={`${albumsLabel(artist.album_count)} · ${tracksLabel(artist.track_count)}`}
      artwork={
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-secondary">
          <span className="text-4xl font-semibold text-primary/70">
            {artist.name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      }
      onPlay={onPlay}
      busy={busy}
    />
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <MediaCard
      to={`/playlists/${playlist.id}`}
      title={playlist.name}
      subtitle={`${playlist.owner}${playlist.is_public ? " · публичный" : " · приватный"}`}
      artwork={
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-secondary">
          <ListMusic className="h-10 w-10 text-primary/70" />
        </div>
      }
      badge={tracksLabel(playlist.song_count)}
    />
  );
}
