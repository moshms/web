import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  AudioLines,
  ChevronDown,
  Disc3,
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Pencil,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { api, type Features, type Track } from "@/api";
import { useAuth } from "@/auth";
import { AlbumEditDialog } from "@/components/AlbumEditDialog";
import { TrackEditDialog } from "@/components/TrackEditDialog";
import { Artwork } from "@/components/Artwork";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { canLibrary, P } from "@/permissions";
import { usePlayer } from "@/player";
import { useToast } from "@/toast";
import { cn } from "@/lib/utils";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${rest}`;
}

function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-0.5 rounded-full bg-primary transition-all",
            playing ? "animate-pulse" : "h-1",
          )}
          style={
            playing
              ? {
                  height: `${5 + ((bar * 5) % 9)}px`,
                  animationDelay: `${bar * 140}ms`,
                }
              : undefined
          }
        />
      ))}
    </span>
  );
}

function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector('[role="dialog"]')) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(children, document.body);
}

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastVolume = useRef(0.8);
  const queue = usePlayer((state) => state.queue);
  const index = usePlayer((state) => state.index);
  const playing = usePlayer((state) => state.playing);
  const currentTime = usePlayer((state) => state.currentTime);
  const duration = usePlayer((state) => state.duration);
  const volume = usePlayer((state) => state.volume);
  const setPlaying = usePlayer((state) => state.setPlaying);
  const setCurrentTime = usePlayer((state) => state.setCurrentTime);
  const setDuration = usePlayer((state) => state.setDuration);
  const setVolume = usePlayer((state) => state.setVolume);
  const toggle = usePlayer((state) => state.toggle);
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const playAt = usePlayer((state) => state.playAt);
  const removeAt = usePlayer((state) => state.removeAt);
  const clearQueue = usePlayer((state) => state.clearQueue);
  const track = queue[index] ?? null;

  const { user } = useAuth();
  const { toast } = useToast();
  const [features, setFeatures] = useState<Features | null>(null);
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [trackEditOpen, setTrackEditOpen] = useState(false);

  const canEditTrack = Boolean(
    features?.tag_editor &&
      track &&
      (canLibrary(user, track.library_id, P.LIBRARY_EDIT_TAGS) ||
        (canLibrary(user, track.library_id, P.LIBRARY_UPLOAD) &&
          track.uploaded_by === user?.id)),
  );
  const canEditAlbum = canEditTrack && Boolean(track?.album_id);
  const isStarred = track ? starred.has(track.id) : false;
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const rangeStyle = { "--range-progress": `${progress}%` } as CSSProperties;
  const volumeStyle = {
    "--range-progress": `${Math.round(volume * 100)}%`,
  } as CSSProperties;

  useEffect(() => {
    api
      .features()
      .then(setFeatures)
      .catch(() => setFeatures(null));
    api
      .favorites()
      .then((favorites) => setStarred(new Set(favorites.tracks.map((item) => item.id))))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!track) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.src = api.streamUrl(track.id);
    audio.load();

    if (usePlayer.getState().playing) {
      void audio.play().catch(() => setPlaying(false));
    }
  }, [track?.id, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (playing) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => next();
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [next, setCurrentTime, setDuration, setPlaying]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) {
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist ?? "",
      album: track.album ?? "",
      artwork: track.album_id
        ? [{ src: api.artworkUrl(track.album_id), sizes: "512x512", type: "image/png" }]
        : [],
    });

    navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => previous());
    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        seek(details.seekTime);
      }
    });

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("seekto", null);
    };
  }, [track, next, previous, setPlaying]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        toggle();
      } else if (event.key === "ArrowRight") {
        next();
      } else if (event.key === "ArrowLeft") {
        previous();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, next, previous]);

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  };

  const toggleStar = async () => {
    if (!track) {
      return;
    }

    const nextStarred = !isStarred;
    setStarred((current) => {
      const updated = new Set(current);
      if (nextStarred) {
        updated.add(track.id);
      } else {
        updated.delete(track.id);
      }
      return updated;
    });

    try {
      if (nextStarred) {
        await api.starTrack(track.id);
      } else {
        await api.unstarTrack(track.id);
      }
    } catch {
      setStarred((current) => {
        const updated = new Set(current);
        if (nextStarred) {
          updated.delete(track.id);
        } else {
          updated.add(track.id);
        }
        return updated;
      });
      toast("Не удалось обновить избранное", "error");
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      lastVolume.current = volume;
      setVolume(0);
    } else {
      setVolume(lastVolume.current || 0.8);
    }
  };

  const closeExpanded = () => setExpanded(false);

  return (
    <>
      <audio ref={audioRef} hidden />

      <footer className="relative z-30 shrink-0 border-t border-border/70 bg-card/90 backdrop-blur">
        <div
          className="absolute inset-x-0 top-0 h-0.5 bg-muted md:hidden"
          aria-hidden="true"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-2 md:h-20 md:gap-4 md:px-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 text-left transition hover:bg-accent/50 md:w-64 md:flex-none"
          >
            <Artwork
              albumId={track?.album_id}
              title={track?.album ?? "Ничего не играет"}
              className="h-11 w-11 shrink-0 rounded-lg md:h-12 md:w-12"
              iconClassName="h-5 w-5"
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {track?.title ?? "Ничего не играет"}
                {track && playing && <Equalizer playing />}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {track?.artist ?? "Выберите трек"}
              </p>
            </div>
          </button>

          <div className="hidden min-w-0 flex-1 flex-col gap-1.5 md:flex">
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                disabled={!track || index === 0}
                aria-label="Предыдущий трек"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 shadow-glow"
                onClick={() => setPlaying(!playing)}
                disabled={!track}
                aria-label={playing ? "Пауза" : "Играть"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                disabled={!track || index + 1 >= queue.length}
                aria-label="Следующий трек"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
              <span className="w-9 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={Math.min(currentTime, duration || 0)}
                onChange={(event) => seek(Number(event.target.value))}
                disabled={!track || duration === 0}
                className="mc-range"
                style={rangeStyle}
                aria-label="Позиция"
              />
              <span className="w-9">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStar}
              disabled={!track}
              aria-label={isStarred ? "Убрать из избранного" : "В избранное"}
            >
              <Heart className={cn("h-4 w-4", isStarred && "fill-primary text-primary")} />
            </Button>
            <Button
              size="icon"
              className="h-9 w-9"
              onClick={() => setPlaying(!playing)}
              disabled={!track}
              aria-label={playing ? "Пауза" : "Играть"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              disabled={!track || index + 1 >= queue.length}
              aria-label="Следующий трек"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="hidden items-center gap-0.5 md:flex">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStar}
              disabled={!track}
              aria-label={isStarred ? "Убрать из избранного" : "В избранное"}
            >
              <Heart className={cn("h-4 w-4", isStarred && "fill-primary text-primary")} />
            </Button>
            {canEditAlbum && track?.album_id && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditOpen(true)}
                aria-label="Редактировать альбом"
                title="Редактировать альбом"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <div className="mx-1 hidden items-center gap-1.5 lg:flex">
              <button
                type="button"
                onClick={toggleMute}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label={volume === 0 ? "Включить звук" : "Выключить звук"}
              >
                {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                className="mc-range w-24"
                style={volumeStyle}
                aria-label="Громкость"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQueueOpen(true)}
              aria-label="Очередь"
              title="Очередь"
              className="relative"
            >
              <ListMusic className="h-4 w-4" />
              {queue.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {queue.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(true)}
              aria-label="Развернуть плеер"
              title="Развернуть плеер"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>

      {expanded && (
        <Overlay onClose={closeExpanded}>
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-background animate-fade-in">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.22),transparent_55%)]" />
            <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-8 pt-4 md:px-8 md:pt-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeExpanded}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-card/70 px-4 text-sm text-muted-foreground transition hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4" />
                  Свернуть
                </button>
                <div className="flex items-center gap-1">
                  {canEditTrack && track && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackEditOpen(true)}
                      aria-label="Редактировать трек"
                      title="Редактировать трек"
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Редактировать трек</span>
                    </Button>
                  )}
                  {canEditAlbum && track?.album_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      aria-label="Редактировать альбом"
                      title="Редактировать альбом"
                    >
                      <Disc3 className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Редактировать альбом</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQueueOpen(true)}
                    aria-label="Очередь"
                  >
                    <ListMusic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid flex-1 items-center gap-8 md:mt-10 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-14">
                <div className="mx-auto w-full max-w-sm lg:mx-0">
                  <Artwork
                    albumId={track?.album_id}
                    title={track?.album ?? "Обложка"}
                    className="aspect-square w-full rounded-3xl shadow-2xl shadow-primary/10"
                    iconClassName="h-16 w-16"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    <AudioLines className="h-4 w-4" />
                    Сейчас играет
                  </div>
                  <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                    {track?.title ?? "Ничего не играет"}
                  </h1>
                  <p className="mt-2 text-lg text-muted-foreground">
                    {track?.artist ?? "Выберите трек в библиотеке"}
                  </p>
                  {track?.album_id && (
                    <Link
                      to={`/albums/${track.album_id}`}
                      onClick={closeExpanded}
                      className="mt-1 inline-block text-sm text-muted-foreground transition hover:text-primary"
                    >
                      {track.album}
                      {track.album_year ? ` · ${track.album_year}` : ""}
                    </Link>
                  )}

                  <div className="mt-8 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={toggleStar}
                      disabled={!track}
                      aria-label={isStarred ? "Убрать из избранного" : "В избранное"}
                    >
                      <Heart
                        className={cn("h-5 w-5", isStarred && "fill-primary text-primary")}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12"
                      onClick={previous}
                      disabled={!track || index === 0}
                      aria-label="Предыдущий трек"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-16 w-16 rounded-full shadow-glow"
                      onClick={() => setPlaying(!playing)}
                      disabled={!track}
                      aria-label={playing ? "Пауза" : "Играть"}
                    >
                      {playing ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="ml-1 h-6 w-6" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12"
                      onClick={next}
                      disabled={!track || index + 1 >= queue.length}
                      aria-label="Следующий трек"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11"
                      onClick={() => setQueueOpen(true)}
                      aria-label="Очередь"
                    >
                      <ListMusic className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
                    <span className="w-10 text-right">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={(event) => seek(Number(event.target.value))}
                      disabled={!track || duration === 0}
                      className="mc-range"
                      style={rangeStyle}
                      aria-label="Позиция"
                    />
                    <span className="w-10">{formatTime(duration)}</span>
                  </div>

                  <div className="mt-4 hidden items-center gap-2 md:flex">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                      aria-label={volume === 0 ? "Включить звук" : "Выключить звук"}
                    >
                      {volume === 0 ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(event) => setVolume(Number(event.target.value))}
                      className="mc-range w-32"
                      style={volumeStyle}
                      aria-label="Громкость"
                    />
                  </div>
                </div>
              </div>

              {queue.length > 0 && (
                <section className="mt-10 border-t border-border/60 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold">
                      Далее <span className="text-muted-foreground">· {queue.length}</span>
                    </h2>
                    <Button variant="ghost" size="sm" onClick={clearQueue}>
                      Очистить
                    </Button>
                  </div>
                  <div className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                    {queue.map((item, position) => (
                      <QueueRow
                        key={`${item.id}-${position}`}
                        track={item}
                        active={position === index}
                        playing={playing}
                        onClick={() => playAt(position)}
                        onRemove={() => removeAt(position)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </Overlay>
      )}

      <Dialog
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        title="Очередь"
        description={`${queue.length} треков`}
        size="md"
        footer={
          queue.length > 0 ? (
            <Button variant="outline" onClick={clearQueue}>
              <Trash2 className="mr-2 h-4 w-4" />
              Очистить очередь
            </Button>
          ) : undefined
        }
      >
        {queue.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Очередь пуста.</p>
        ) : (
          <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
            {queue.map((item, position) => (
              <QueueRow
                key={`${item.id}-${position}`}
                track={item}
                active={position === index}
                playing={playing}
                onClick={() => playAt(position)}
                onRemove={() => removeAt(position)}
              />
            ))}
          </div>
        )}
      </Dialog>

      <AlbumEditDialog
        albumId={track?.album_id ?? null}
        open={editOpen}
        features={features}
        onClose={() => setEditOpen(false)}
      />

      <TrackEditDialog
        track={track}
        open={trackEditOpen}
        features={features}
        onClose={() => setTrackEditOpen(false)}
      />
    </>
  );
}

function QueueRow({
  track,
  active,
  playing,
  onClick,
  onRemove,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  onClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl px-2 py-1.5 transition",
        active ? "bg-primary/10" : "hover:bg-accent/60",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className="flex w-5 shrink-0 items-center justify-center text-xs text-muted-foreground">
          {active ? <Equalizer playing={playing} /> : null}
        </span>
        <Artwork
          albumId={track.album_id}
          title={track.album ?? track.title}
          className="h-9 w-9 shrink-0 rounded-lg"
          iconClassName="h-4 w-4"
        />
        <div className="min-w-0">
          <p className={cn("truncate text-sm", active && "font-medium text-primary")}>
            {track.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {track.artist ?? "Неизвестный исполнитель"}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        aria-label="Убрать из очереди"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
