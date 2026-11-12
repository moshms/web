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
      <Link
        to={to}
        className="block rounded-2xl border border-border/60 bg-card/50 p-2 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/30 hover:shadow-lg"
      >
        <div className="relative mb-3 aspect-square overflow-hidden rounded-xl">
          {artwork}
          {badge && (
            <span className="absolute bottom-2 right-2 rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
              {badge}
            </span>
          )}
        </div>
        <p className="truncate text-sm font-medium group-hover:text-primary">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </Link>
      {onPlay && (
        <Button
          size="icon"
          className="absolute bottom-14 right-4 h-10 w-10 rounded-full opacity-100 shadow-lg transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
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
