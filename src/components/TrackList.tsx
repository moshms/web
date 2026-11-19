import {
  ChevronRight,
  Disc3,
  Download,
  Heart,
  Info,
  ListEnd,
  ListMusic,
  ListPlus,
  MoreHorizontal,
  Pencil,
  Play,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { api, type Features, type Playlist, type Track } from "@/api";
import { useAuth } from "@/auth";
import { AlbumEditDialog } from "@/components/AlbumEditDialog";
import { TrackDetailsDialog } from "@/components/TrackDetailsDialog";
import { TrackEditDialog } from "@/components/TrackEditDialog";
import { Button } from "@/components/ui/button";
import { canEditTrack as canEditTrackPermission } from "@/permissions";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

type TrackListProps = {
  tracks: Track[];
  onPlay: (track: Track, queue: Track[]) => void;
  starred?: Set<string>;
  onToggleStar?: (track: Track) => void;
  playlists?: Playlist[];
  onAddToPlaylist?: (playlistId: string, trackId: string) => void;
  onRemove?: (position: number) => void;
  onTracksChanged?: () => void;
};

function formatDuration(milliseconds: number | null) {
  if (!milliseconds) {
    return "—";
  }
  const seconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-0.5 rounded-full bg-current transition-all",
            playing ? "animate-pulse" : "h-1",
          )}
          style={
            playing
              ? { height: `${4 + ((bar * 5) % 8)}px`, animationDelay: `${bar * 140}ms` }
              : undefined
          }
        />
      ))}
    </span>
  );
}

export function TrackList({
  tracks,
  onPlay,
  starred,
  onToggleStar,
  playlists,
  onAddToPlaylist,
  onRemove,
  onTracksChanged,
}: TrackListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const playNext = usePlayer((state) => state.playNext);
  const addToQueue = usePlayer((state) => state.addToQueue);
  const currentId = usePlayer((state) => state.queue[state.index]?.id ?? null);
  const playing = usePlayer((state) => state.playing);
  const [features, setFeatures] = useState<Features | null>(null);
  const [fetchedPlaylists, setFetchedPlaylists] = useState<Playlist[]>([]);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);

  useEffect(() => {
    api.features().then(setFeatures).catch(() => setFeatures(null));
  }, []);

  useEffect(() => {
    if (playlists !== undefined) {
      return;
    }
    api
      .playlists()
      .then(setFetchedPlaylists)
      .catch(() => setFetchedPlaylists([]));
  }, [playlists]);

  const availablePlaylists = playlists ?? fetchedPlaylists;

  const addToPlaylist = async (playlist: Playlist, track: Track) => {
    if (onAddToPlaylist) {
      onAddToPlaylist(playlist.id, track.id);
      return;
    }
    try {
      await api.addToPlaylist(playlist.id, track.id);
      toast(`«${track.title}» добавлен в «${playlist.name}»`);
    } catch {
      toast("Не удалось добавить трек в плейлист", "error");
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="mc-surface flex flex-col items-center gap-2 px-6 py-12 text-center">
        <Play className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Треков пока нет.</p>
      </div>
    );
  }

  const groups = new Map<number, { track: Track; index: number }[]>();
  tracks.forEach((track, index) => {
    const disc = track.disc_no > 0 ? track.disc_no : 1;
    const list = groups.get(disc) ?? [];
    list.push({ track, index });
    groups.set(disc, list);
  });
  const showDiscs = groups.size > 1;

  return (
    <>
      <div className="mc-surface overflow-hidden">
        {[...groups.entries()].map(([disc, items]) => (
          <div key={disc}>
            {showDiscs && (
              <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Диск {disc}
              </div>
            )}
            <div className="divide-y divide-border">
              {items.map(({ track, index }) => {
                const active = track.id === currentId;
                return (
                  <div
                    key={`${track.id}-${index}`}
                    className={cn(
                      "group grid h-12 grid-cols-[2rem_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-2 px-2 transition-colors hover:bg-muted/50 sm:gap-3 sm:px-3",
                      active && "bg-accent",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onPlay(track, tracks)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-xs tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Играть ${track.title}`}
                    >
                      {active ? (
                        <Equalizer playing={playing} />
                      ) : (
                        <>
                          <span className="group-hover:hidden">
                            {track.track_no > 0 ? track.track_no : index + 1}
                          </span>
                          <Play className="ml-0.5 hidden h-3.5 w-3.5 fill-current group-hover:block" />
                        </>
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className={cn("truncate text-sm", active && "font-medium")}>{track.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {track.artist ?? "Неизвестный исполнитель"}
                      </p>
                    </div>

                    <Link
                      to={track.album_id ? `/albums/${track.album_id}` : "#"}
                      className="hidden max-w-48 truncate text-xs text-muted-foreground hover:text-foreground lg:block"
                    >
                      {track.album ?? ""}
                    </Link>

                    {onToggleStar ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onToggleStar(track)}
                        aria-label={starred?.has(track.id) ? "Убрать из избранного" : "В избранное"}
                      >
                        <Heart
                          className={cn("h-4 w-4", starred?.has(track.id) && "fill-foreground")}
                        />
                      </Button>
                    ) : (
                      <span className="w-8" />
                    )}

                    <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {formatDuration(track.duration_ms)}
                    </span>

                    <TrackMenu
                      track={track}
                      starred={starred?.has(track.id)}
                      playlists={availablePlaylists}
                      canEdit={Boolean(features?.tag_editor && canEditTrackPermission(user, track))}
                      onPlay={() => onPlay(track, tracks)}
                      onPlayNext={() => {
                        playNext(track);
                        toast(`«${track.title}» будет играть следующим`);
                      }}
                      onAddToQueue={() => {
                        addToQueue(track);
                        toast(`«${track.title}» добавлен в очередь`);
                      }}
                      onToggleStar={onToggleStar ? () => onToggleStar(track) : undefined}
                      onAddToPlaylist={(playlist) => void addToPlaylist(playlist, track)}
                      onEditTrack={
                        features?.tag_editor && canEditTrackPermission(user, track)
                          ? () => setEditingTrack(track)
                          : undefined
                      }
                      onEditAlbum={
                        features?.tag_editor && canEditTrackPermission(user, track) && track.album_id
                          ? () => setEditingAlbumId(track.album_id)
                          : undefined
                      }
                      onRemove={onRemove ? () => onRemove(index) : undefined}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <TrackEditDialog
        track={editingTrack}
        open={editingTrack !== null}
        features={features}
        onClose={() => setEditingTrack(null)}
        onSaved={onTracksChanged}
      />
      <AlbumEditDialog
        albumId={editingAlbumId}
        open={editingAlbumId !== null}
        features={features}
        onClose={() => setEditingAlbumId(null)}
        onSaved={onTracksChanged}
      />
    </>
  );
}

type TrackMenuProps = {
  track: Track;
  starred?: boolean;
  playlists: Playlist[];
  canEdit: boolean;
  onPlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onToggleStar?: () => void;
  onAddToPlaylist: (playlist: Playlist) => void;
  onEditTrack?: () => void;
  onEditAlbum?: () => void;
  onRemove?: () => void;
};

function TrackMenu({
  track,
  starred,
  playlists,
  canEdit,
  onPlay,
  onPlayNext,
  onAddToQueue,
  onToggleStar,
  onAddToPlaylist,
  onEditTrack,
  onEditAlbum,
  onRemove,
}: TrackMenuProps) {
  const [open, setOpen] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const width = 240;
    const margin = 8;
    const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 340;
    setPosition(
      openUp
        ? {
            left,
            bottom: window.innerHeight - rect.top + 6,
            maxHeight: Math.max(180, rect.top - 12),
          }
        : {
            left,
            top: rect.bottom + 6,
            maxHeight: Math.max(180, spaceBelow - 12),
          },
    );
    setOpen(true);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const onScroll = (event: Event) => {
      const target = event.target;
      if (menuRef.current && target instanceof Node && menuRef.current.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setShowPlaylists(false);
  };

  return (
    <div className="shrink-0">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={toggle}
        aria-label="Действия с треком"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              bottom: position.bottom,
              width: 240,
              maxHeight: position.maxHeight,
              overflowY: "auto",
              zIndex: 130,
            }}
            className={cn(
              "rounded-md border border-border bg-popover p-1 text-sm animate-scale-in",
              position.bottom !== undefined ? "origin-bottom-right" : "origin-top-right",
            )}
          >
            <MenuItem
              icon={Play}
              onClick={() => {
                onPlay();
                close();
              }}
            >
              Играть
            </MenuItem>
            <MenuItem
              icon={ListPlus}
              onClick={() => {
                onPlayNext();
                close();
              }}
            >
              Играть следующим
            </MenuItem>
            <MenuItem
              icon={ListEnd}
              onClick={() => {
                onAddToQueue();
                close();
              }}
            >
              В очередь
            </MenuItem>

            <div className="my-1 h-px bg-border" />

            {onToggleStar && (
              <MenuItem
                icon={Heart}
                onClick={() => {
                  onToggleStar();
                  close();
                }}
              >
                {starred ? "Убрать из избранного" : "В избранное"}
              </MenuItem>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={() => setShowPlaylists((current) => !current)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
            >
              <ListMusic className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">В плейлист</span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground transition",
                  showPlaylists && "rotate-90",
                )}
              />
            </button>

            {showPlaylists && (
              <div className="ml-3 max-h-44 overflow-y-auto border-l border-border pl-2">
                {playlists.length === 0 ? (
                  <Link
                    to="/playlists"
                    onClick={close}
                    className="block rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Плейлистов нет. Создать?
                  </Link>
                ) : (
                  playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onAddToPlaylist(playlist);
                        close();
                      }}
                      className="block w-full truncate rounded-md px-2.5 py-2 text-left text-xs hover:bg-muted"
                    >
                      {playlist.name}
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="my-1 h-px bg-border" />

            <MenuItem
              icon={Info}
              onClick={() => {
                setDetailsOpen(true);
                close();
              }}
            >
              Сведения
            </MenuItem>
            <MenuAnchor href={api.downloadUrl(track.id)} icon={Download} onClick={close}>
              Скачать
            </MenuAnchor>
            {track.album_id && (
              <MenuLink to={`/albums/${track.album_id}`} icon={Disc3} onClick={close}>
                К альбому
              </MenuLink>
            )}
            {track.album_artist_id && (
              <MenuLink to={`/artists/${track.album_artist_id}`} icon={UserRound} onClick={close}>
                К исполнителю
              </MenuLink>
            )}

            {canEdit && (onEditTrack || onEditAlbum) && <div className="my-1 h-px bg-border" />}
            {onEditTrack && (
              <MenuItem
                icon={Pencil}
                onClick={() => {
                  onEditTrack();
                  close();
                }}
              >
                Редактировать трек
              </MenuItem>
            )}
            {onEditAlbum && (
              <MenuItem
                icon={Disc3}
                onClick={() => {
                  onEditAlbum();
                  close();
                }}
              >
                Редактировать альбом
              </MenuItem>
            )}

            {onRemove && (
              <>
                <div className="my-1 h-px bg-border" />
                <MenuItem
                  icon={Trash2}
                  destructive
                  onClick={() => {
                    onRemove();
                    close();
                  }}
                >
                  Убрать из плейлиста
                </MenuItem>
              </>
            )}
          </div>,
          document.body,
        )}
      <TrackDetailsDialog
        trackId={track.id}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted",
        destructive && "text-destructive hover:bg-destructive/10",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function MenuLink({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </Link>
  );
}

function MenuAnchor({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      download
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </a>
  );
}
