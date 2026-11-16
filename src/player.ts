import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Track } from "@/api";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrack: (track: Track, queue?: Track[]) => void;
  playAt: (index: number) => void;
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeAt: (index: number) => void;
  clearQueue: () => void;
  setPlaying: (playing: boolean) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      shuffle: false,
      repeat: "off",

      playTrack: (track, queue) => {
        const nextQueue = queue && queue.length > 0 ? queue : [track];
        const index = Math.max(
          0,
          nextQueue.findIndex((item) => item.id === track.id),
        );

        set({
          queue: nextQueue,
          index,
          playing: true,
          currentTime: 0,
          duration: 0,
        });
      },

      playAt: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) {
          return;
        }
        set({ index, playing: true, currentTime: 0, duration: 0 });
      },

      playNext: (track) => {
        const { queue, index } = get();
        if (queue.length === 0) {
          get().playTrack(track);
          return;
        }
        const nextQueue = [...queue];
        nextQueue.splice(index + 1, 0, track);
        set({ queue: nextQueue });
      },

      addToQueue: (track) => {
        const { queue } = get();
        if (queue.length === 0) {
          get().playTrack(track);
          return;
        }
        set({ queue: [...queue, track] });
      },

      removeAt: (index) => {
        const { queue, index: current } = get();
        if (index < 0 || index >= queue.length) {
          return;
        }

        const nextQueue = queue.filter((_, position) => position !== index);
        if (nextQueue.length === 0) {
          set({ queue: [], index: 0, playing: false, currentTime: 0, duration: 0 });
          return;
        }

        if (index < current) {
          set({ queue: nextQueue, index: current - 1 });
          return;
        }

        if (index === current) {
          set({
            queue: nextQueue,
            index: Math.min(current, nextQueue.length - 1),
            currentTime: 0,
            duration: 0,
            playing: true,
          });
          return;
        }

        set({ queue: nextQueue });
      },

      clearQueue: () =>
        set({ queue: [], index: 0, playing: false, currentTime: 0, duration: 0 }),

      setPlaying: (playing) => set({ playing }),

      toggle: () => {
        if (get().queue.length === 0) {
          return;
        }
        set({ playing: !get().playing });
      },

      next: () => {
        const { index, queue, repeat } = get();
        if (queue.length === 0) {
          return;
        }
        if (repeat === "one") {
          set({ currentTime: 0, playing: true });
          return;
        }
        if (index + 1 < queue.length) {
          set({ index: index + 1, currentTime: 0, duration: 0, playing: true });
        } else if (repeat === "all") {
          set({ index: 0, currentTime: 0, duration: 0, playing: true });
        } else {
          set({ playing: false });
        }
      },

      previous: () => {
        const { index, currentTime, queue, repeat } = get();
        if (queue.length === 0) {
          return;
        }
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        if (index > 0) {
          set({ index: index - 1, currentTime: 0, duration: 0, playing: true });
        } else if (repeat === "all") {
          set({ index: queue.length - 1, currentTime: 0, duration: 0, playing: true });
        }
      },

      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),

      toggleShuffle: () => {
        const { queue, index, shuffle } = get();
        if (queue.length <= 1) {
          set({ shuffle: !shuffle });
          return;
        }
        if (shuffle) {
          set({ shuffle: false });
          return;
        }
        const current = queue[index];
        const rest = queue.filter((_, position) => position !== index);
        for (let position = rest.length - 1; position > 0; position -= 1) {
          const swap = Math.floor(Math.random() * (position + 1));
          [rest[position], rest[swap]] = [rest[swap], rest[position]];
        }
        set({ queue: current ? [current, ...rest] : rest, index: 0, shuffle: true });
      },

      cycleRepeat: () => {
        const { repeat } = get();
        set({ repeat: repeat === "off" ? "all" : repeat === "all" ? "one" : "off" });
      },
    }),
    {
      name: "mc-player",
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
      }),
    },
  ),
);

export function currentTrack(state: PlayerState): Track | null {
  return state.queue[state.index] ?? null;
}
