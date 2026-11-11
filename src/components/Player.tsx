import { useEffect, useRef } from "react";
import { Music2, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";

import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function Player() {
  const audioRef = useRef<HTMLAudioElement>(null);
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
  const next = usePlayer((state) => state.next);
  const previous = usePlayer((state) => state.previous);
  const track = queue[index] ?? null;

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

    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
    };
  }, [track, next, previous, setPlaying]);

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = value;
    setCurrentTime(value);
  };

  return (
    <footer className="border-t bg-white px-4 py-3">
      <audio ref={audioRef} hidden />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 items-center gap-3 md:w-72">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
            {track?.album_id ? (
              <img
                src={api.artworkUrl(track.album_id)}
                alt=""
                className="h-12 w-12 rounded-md object-cover"
              />
            ) : (
              <Music2 className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {track?.title ?? "Ничего не играет"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {track?.artist ?? "Выберите трек"}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-center gap-2">
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
              onClick={() => setPlaying(!playing)}
              disabled={!track}
              aria-label={playing ? "Пауза" : "Играть"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!track || duration === 0}
              className="h-1 flex-1 cursor-pointer accent-zinc-900"
              aria-label="Позиция"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex md:w-40">
          <Volume2 className="h-4 w-4 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="h-1 w-full cursor-pointer accent-zinc-900"
            aria-label="Громкость"
          />
        </div>
      </div>
    </footer>
  );
}
