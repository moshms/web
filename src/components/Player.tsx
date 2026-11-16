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
  Repeat,
  Repeat1,
  Shuffle,
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
  const shuffle = usePlayer((state) => state.shuffle);
  const repeat = usePlayer((state) => state.repeat);
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
  const toggleShuffle = usePlayer((state) => state.toggleShuffle);
  const cycleRepeat = usePlayer((state) => state.cycleRepeat);
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
    api.features().then(setFeatures).catch(() => setFeatures(null));
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
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
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

      <footer className="relative z-30 shrink-0 border-t border-border bg-card">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-muted md:hidden">
          <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
        </div>

        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-2 px-3 md:gap-4 md:px-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 text-left transition-colors hover:bg-muted/60 md:w-64 md:flex-none"
          >
            <Artwork
              albumId={track?.album_id}
              title={track?.album ?? "Ничего не играет"}
              className="h-11 w-11 shrink-0 rounded-md md:h-12 md:w-12"
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

          <div className="hidden min-w-0 flex-1 flex-col gap-1 md:flex">
            <div className="flex items-center justify-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleShuffle}
                className={cn(shuffle && "bg-muted")}
                aria-label="Перемешать"
                title="Перемешать"
              >
                <Shuffle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={previous}
                disabled={!track}
                aria-label="Предыдущий трек"
              >
                <SkipBack className="h-4 w-4" />
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
                disabled={!track}
                aria-label="Следующий трек"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleRepeat}
                className={cn(repeat !== "off" && "bg-muted")}
                aria-label="Повтор"
                title={repeat === "off" ? "Повтор выключен" : repeat === "all" ? "Повтор всех" : "Повтор одного"}
              >
                {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
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
              <Heart className={cn("h-4 w-4", isStarred && "fill-foreground")} />
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
              disabled={!track}
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
              <Heart className={cn("h-4 w-4", isStarred && "fill-foreground")} />
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
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
                className="mc-range w-20"
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
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background">
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
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-black text-white">
            <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-8 pt-4 md:px-8 md:pt-6">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeExpanded}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-3 text-sm text-white/70 hover:text-white"
                >
                  <ChevronDown className="h-4 w-4" />
                  Свернуть
                </button>
                <div className="flex items-center gap-1">
                  {canEditTrack && track && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                      onClick={() => setTrackEditOpen(true)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Редактировать трек
                    </Button>
                  )}
                  {canEditAlbum && track?.album_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                      onClick={() => setEditOpen(true)}
                    >
                      <Disc3 className="mr-2 h-4 w-4" />
                      Редактировать альбом
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white/70 hover:bg-white/10 hover:text-white"
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
                    className="aspect-square w-full rounded-md"
                    iconClassName="h-16 w-16"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
                    <AudioLines className="h-4 w-4" />
                    {playing ? "Сейчас играет" : "Пауза"}
                  </div>
                  <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                    {track?.title ?? "Ничего не играет"}
                  </h1>
                  <p className="mt-2 text-lg text-white/60">
                    {track?.artist ?? "Выберите трек в библиотеке"}
                  </p>
                  {track?.album_id && (
                    <Link
                      to={`/albums/${track.album_id}`}
                      onClick={closeExpanded}
                      className="mt-1 inline-block text-sm text-white/50 hover:text-white"
                    >
                      {track.album}
                      {track.album_year ? ` · ${track.album_year}` : ""}
                    </Link>
                  )}

                  <div className="mt-8 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 border-white/20 bg-transparent text-white hover:bg-white/10"
                      onClick={toggleStar}
                      disabled={!track}
                      aria-label={isStarred ? "Убрать из избранного" : "В избранное"}
                    >
                      <Heart className={cn("h-5 w-5", isStarred && "fill-white")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={previous}
                      disabled={!track}
                      aria-label="Предыдущий трек"
                    >
                      <SkipBack className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90"
                      onClick={() => setPlaying(!playing)}
                      disabled={!track}
                      aria-label={playing ? "Пауза" : "Играть"}
                    >
                      {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={next}
                      disabled={!track}
                      aria-label="Следующий трек"
                    >
                      <SkipForward className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-10 w-10 text-white/70 hover:bg-white/10 hover:text-white", shuffle && "bg-white/10 text-white")}
                      onClick={toggleShuffle}
                      aria-label="Перемешать"
                    >
                      <Shuffle className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-10 w-10 text-white/70 hover:bg-white/10 hover:text-white", repeat !== "off" && "bg-white/10 text-white")}
                      onClick={cycleRepeat}
                      aria-label="Повтор"
                    >
                      {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                    </Button>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-xs tabular-nums text-white/50">
                    <span className="w-9 text-right">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={0.1}
                      value={Math.min(currentTime, duration || 0)}
                      onChange={(event) => seek(Number(event.target.value))}
                      disabled={!track || duration === 0}
                      className="mc-range mc-range-dark"
                      style={rangeStyle}
                      aria-label="Позиция"
                    />
                    <span className="w-9">{formatTime(duration)}</span>
                  </div>

                  <div className="mt-4 hidden items-center gap-2 md:flex">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
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
                      className="mc-range mc-range-dark w-32"
                      style={volumeStyle}
                      aria-label="Громкость"
                    />
                  </div>
                </div>
              </div>

              {queue.length > 0 && (
                <section className="mt-10 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-white/80">
                      Далее <span className="text-white/40">· {queue.length}</span>
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/50 hover:bg-white/10 hover:text-white"
                      onClick={clearQueue}
                    >
                      Очистить
                    </Button>
                  </div>
                  <div className="mt-3 max-h-72 space-y-0.5 overflow-y-auto pr-1">
                    {queue.map((item, position) => (
                      <QueueRow
                        key={`${item.id}-${position}`}
                        track={item}
                        active={position === index}
                        playing={playing}
                        onClick={() => playAt(position)}
                        onRemove={() => removeAt(position)}
                        dark
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
          <div className="max-h-[55vh] space-y-0.5 overflow-y-auto pr-1">
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
  dark,
}: {
  track: Track;
  active: boolean;
  playing: boolean;
  onClick: () => void;
  onRemove: () => void;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors",
        active ? (dark ? "bg-white/10" : "bg-accent") : dark ? "hover:bg-white/5" : "hover:bg-muted/60",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={cn("flex w-5 shrink-0 items-center justify-center", dark ? "text-white/40" : "text-muted-foreground")}>
          {active ? <Equalizer playing={playing} /> : null}
        </span>
        <Artwork
          albumId={track.album_id}
          title={track.album ?? track.title}
          className="h-8 w-8 shrink-0 rounded-md"
          iconClassName="h-4 w-4"
        />
        <div className="min-w-0">
          <p className={cn("truncate text-sm", active && (dark ? "font-medium text-white" : "font-medium text-foreground"))}>
            {track.title}
          </p>
          <p className={cn("truncate text-xs", dark ? "text-white/50" : "text-muted-foreground")}>
            {track.artist ?? "Неизвестный исполнитель"}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "rounded-md p-1.5 opacity-0 transition group-hover:opacity-100",
          dark ? "text-white/40 hover:bg-white/10 hover:text-white" : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        )}
        aria-label="Убрать из очереди"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
