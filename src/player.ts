import { create } from "zustand";

import type { Track } from "@/api";

type PlayerState = {
  queue: Track[];
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  setPlaying: (playing: boolean) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
};

export const usePlayer = create<PlayerState>((set, get) => ({
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
}));

export function currentTrack(state: PlayerState): Track | null {
  return state.queue[state.index] ?? null;
}
