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
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
        {artwork}
        <div className="pointer-events-none absolute inset-0 bg-black/15 opacity-0 transition-opacity group-hover:opacity-100" />
        <Link to={to} className="absolute inset-0 z-10" aria-label={`Открыть ${title}`} />
        {badge && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-20 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
            {badge}
          </span>
        )}
        {onPlay && (
          <Button
            size="icon"
            className="absolute bottom-2 right-2 z-20 h-9 w-9 rounded-full bg-white text-black opacity-100 hover:bg-white/90 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            onClick={onPlay}
            aria-label={`Играть ${title}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="ml-0.5 h-4 w-4" />}
          </Button>
        )}
      </div>
      <Link to={to} className="block px-0.5 pt-2.5">
        <p className="truncate text-sm font-medium transition-colors group-hover:text-foreground/70">
          {title}
        </p>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </Link>
    </div>
  );
}

export function AlbumCard({
  album,
  onPlay,
  busy,
  className,
}: {
  album: Album;
  onPlay?: () => void;
  busy?: boolean;
  className?: string;
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
      className={className}
    />
  );
}

export function ArtistCard({
  artist,
  onPlay,
  busy,
  className,
}: {
  artist: Artist;
  onPlay?: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <MediaCard
      to={`/artists/${artist.id}`}
      title={artist.name}
      subtitle={`${albumsLabel(artist.album_count)} · ${tracksLabel(artist.track_count)}`}
      artwork={
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <span className="text-3xl font-semibold text-muted-foreground">
            {artist.name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      }
      onPlay={onPlay}
      busy={busy}
      className={className}
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
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <ListMusic className="h-8 w-8 text-muted-foreground" />
        </div>
      }
      badge={tracksLabel(playlist.song_count)}
    />
  );
}
