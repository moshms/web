import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Track } from "@/api";

type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
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
        const { index, queue } = get();
        if (index + 1 < queue.length) {
          set({ index: index + 1, currentTime: 0, duration: 0, playing: true });
        } else {
          set({ playing: false });
        }
      },

      previous: () => {
        const { index } = get();
        if (index > 0) {
          set({ index: index - 1, currentTime: 0, duration: 0, playing: true });
        }
      },

      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),
    }),
    {
      name: "mc-player",
      partialize: (state) => ({
        queue: state.queue,
        index: state.index,
        volume: state.volume,
      }),
    },
  ),
);

export function currentTrack(state: PlayerState): Track | null {
  return state.queue[state.index] ?? null;
}
