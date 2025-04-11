import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SpotifyTrackItem } from "@/utils/spotify.types";

export interface PlayerState {
  // Current playback
  currentTrack: SpotifyTrackItem | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;

  // Queue management
  queueTracks: string[]; // URIs of tracks in queue
  queueTrackItems: SpotifyTrackItem[]; // Full track data for items in queue
  currentQueueIndex: number;
  isCircular: boolean;

  // Context info (album, playlist, etc)
  sourceType: "album" | "playlist" | "artist" | "search" | "none";
  sourceId: string;

  // Actions
  setCurrentTrack: (track: SpotifyTrackItem | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;

  setQueueTracks: (tracks: string[], index?: number) => void;
  setQueueTrackItems: (tracks: SpotifyTrackItem[]) => void;
  addToQueue: (track: string) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  updateCurrentIndex: (index: number) => void;
  setCircularMode: (circular: boolean) => void;

  setPlaybackSource: (
    type: "album" | "playlist" | "artist" | "search" | "none",
    id: string
  ) => void;

  // Full state update (for syncing with Spotify API)
  syncWithSpotifyState: (data: {
    currentTrack?: SpotifyTrackItem | null;
    isPlaying?: boolean;
    progress?: number;
    duration?: number;
    volume?: number;
    queueTracks?: string[];
    queueTrackItems?: SpotifyTrackItem[];
    currentQueueIndex?: number;
  }) => void;
}

// Create the player store with persistence
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      duration: 0,
      volume: 50,

      queueTracks: [],
      queueTrackItems: [],
      currentQueueIndex: -1,
      isCircular: true,

      sourceType: "none",
      sourceId: "",

      // Actions
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),

      setQueueTracks: (tracks, index = 0) =>
        set({
          queueTracks: tracks,
          currentQueueIndex: index >= 0 && index < tracks.length ? index : 0,
        }),

      setQueueTrackItems: (tracks) => set({ queueTrackItems: tracks }),

      addToQueue: (track) =>
        set((state) => {
          // Don't add if already in queue
          if (state.queueTracks.includes(track)) {
            return state;
          }

          return {
            queueTracks: [...state.queueTracks, track],
          };
        }),

      removeFromQueue: (index) =>
        set((state) => {
          // Check if index is valid
          if (index < 0 || index >= state.queueTracks.length) {
            return state;
          }

          const newTracks = [...state.queueTracks];
          newTracks.splice(index, 1);

          const newTrackItems = [...state.queueTrackItems];
          newTrackItems.splice(index, 1);

          // Adjust currentQueueIndex if needed
          let newIndex = state.currentQueueIndex;

          if (index === state.currentQueueIndex) {
            // Current track is being removed, don't change the index position
            // as the next track will slide into this position
            if (index >= newTracks.length) {
              // Unless we're removing the last track, then move back
              newIndex = Math.max(0, newTracks.length - 1);
            }
          } else if (index < state.currentQueueIndex) {
            // If removing a track before the current one, adjust the index down
            newIndex = Math.max(0, state.currentQueueIndex - 1);
          }

          return {
            queueTracks: newTracks,
            queueTrackItems: newTrackItems,
            currentQueueIndex: newTracks.length > 0 ? newIndex : -1,
          };
        }),

      clearQueue: () =>
        set((state) => {
          // Keep only the current track if there is one
          if (
            state.currentQueueIndex >= 0 &&
            state.currentQueueIndex < state.queueTracks.length
          ) {
            const currentTrackUri = state.queueTracks[state.currentQueueIndex];
            const currentTrackItem =
              state.queueTrackItems[state.currentQueueIndex];

            return {
              queueTracks: [currentTrackUri],
              queueTrackItems: currentTrackItem ? [currentTrackItem] : [],
              currentQueueIndex: 0,
            };
          }

          return {
            queueTracks: [],
            queueTrackItems: [],
            currentQueueIndex: -1,
          };
        }),

      updateCurrentIndex: (index) =>
        set((state) => {
          if (index >= 0 && index < state.queueTracks.length) {
            return { currentQueueIndex: index };
          }
          return state;
        }),

      setCircularMode: (circular) => set({ isCircular: circular }),

      setPlaybackSource: (type, id) =>
        set({
          sourceType: type,
          sourceId: id,
        }),
      syncWithSpotifyState: (data) =>
        set((state) => ({
          ...state,
          currentTrack:
            data.currentTrack !== undefined
              ? data.currentTrack
              : state.currentTrack,
          isPlaying:
            data.isPlaying !== undefined ? data.isPlaying : state.isPlaying,
          progress:
            data.progress !== undefined ? data.progress : state.progress,
          duration:
            data.duration !== undefined ? data.duration : state.duration,
          volume: data.volume !== undefined ? data.volume : state.volume,
          queueTracks: data.queueTracks || state.queueTracks,
          queueTrackItems: data.queueTrackItems || state.queueTrackItems,
          currentQueueIndex:
            data.currentQueueIndex !== undefined
              ? data.currentQueueIndex
              : state.currentQueueIndex,
        })),
    }),
    {
      name: "player-storage", // name of the item in local storage
      partialize: (state) => ({
        // Only store these parts of the state in localStorage
        queueTracks: state.queueTracks,
        queueTrackItems: state.queueTrackItems,
        currentQueueIndex: state.currentQueueIndex,
        volume: state.volume,
        isCircular: state.isCircular,
        sourceType: state.sourceType,
        sourceId: state.sourceId,
      }),
    }
  )
);
