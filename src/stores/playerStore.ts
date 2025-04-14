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

  // Shuffle state
  isShuffleEnabled: boolean;
  shuffleIndices: number[]; // Maps original indices to shuffled order
  recentlyPlayedIndices: number[]; // Tracks recently played to avoid repeating
  manuallyAddedTracks: Set<string>; // Tracks manually added by user
  pendingManuallyAddedIndices: number[]; // Indices of tracks that were manually added and should be played next

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
  addToQueue: (track: string, addToFront?: boolean) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  updateCurrentIndex: (index: number) => void;
  setCircularMode: (circular: boolean) => void;

  // Shuffle actions
  toggleShuffle: () => void;
  setShuffle: (enabled: boolean) => void;
  getNextShuffledIndex: () => number;
  getPreviousShuffledIndex: () => number;
  markTrackAsManuallyAdded: (trackUri: string) => void;
  regenerateShuffleIndices: () => void;

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

  // Helper to check if queue is loaded and ready
  isQueueReady: () => boolean;
}

const MAX_RECENTLY_PLAYED = 8; // Avoid repeating the last X played tracks

// Create the player store with persistence
export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
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

      // Shuffle state
      isShuffleEnabled: false,
      shuffleIndices: [],
      recentlyPlayedIndices: [],
      manuallyAddedTracks: new Set<string>(),
      pendingManuallyAddedIndices: [],

      sourceType: "none",
      sourceId: "",

      // Actions
      setCurrentTrack: (track) => set({ currentTrack: track }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume }),

      setQueueTracks: (tracks, index = 0) => {
        const state = get();

        // Generate initial shuffle indices if shuffle is enabled
        const shuffleIndices = state.isShuffleEnabled
          ? generateShuffleIndices(tracks.length)
          : [];

        set({
          queueTracks: tracks,
          currentQueueIndex: index >= 0 && index < tracks.length ? index : 0,
          shuffleIndices,
          recentlyPlayedIndices: [],
          pendingManuallyAddedIndices: [],
        });
      },

      setQueueTrackItems: (tracks) => set({ queueTrackItems: tracks }),

      addToQueue: (track, addToFront = false) =>
        set((state) => {
          // Don't add if already in queue
          if (state.queueTracks.includes(track)) {
            return state;
          }

          const newTracks = [...state.queueTracks];
          const newIndices = [...state.shuffleIndices];
          let pendingIndices = [...state.pendingManuallyAddedIndices];

          // Add to front or back of queue based on parameter
          if (addToFront) {
            // Add right after the current track
            const insertPosition = state.currentQueueIndex + 1;
            newTracks.splice(insertPosition, 0, track);

            // Add to pending manually added tracks
            pendingIndices.push(insertPosition);

            // Update shuffle indices if needed
            if (state.isShuffleEnabled && newIndices.length > 0) {
              // Shift all indices >= insertPosition up by 1
              for (let i = 0; i < newIndices.length; i++) {
                if (newIndices[i] >= insertPosition) {
                  newIndices[i]++;
                }
              }
              // Insert at position right after current in shuffle order
              newIndices.splice(state.currentQueueIndex + 1, 0, insertPosition);
            }

            // Mark track as manually added
            const newManuallyAdded = new Set(state.manuallyAddedTracks);
            newManuallyAdded.add(track);

            return {
              queueTracks: newTracks,
              shuffleIndices: newIndices,
              manuallyAddedTracks: newManuallyAdded,
              pendingManuallyAddedIndices: pendingIndices,
            };
          } else {
            // Add to end of queue (original behavior)
            return {
              queueTracks: [...state.queueTracks, track],
            };
          }
        }),

      removeFromQueue: (index) =>
        set((state) => {
          // Check if index is valid
          if (index < 0 || index >= state.queueTracks.length) {
            return state;
          }

          const newTracks = [...state.queueTracks];
          const trackToRemove = newTracks[index];
          newTracks.splice(index, 1);

          const newTrackItems = [...state.queueTrackItems];
          newTrackItems.splice(index, 1);

          // Update shuffle indices if enabled
          let newShuffleIndices: number[] = [];
          if (state.isShuffleEnabled) {
            newShuffleIndices = [...state.shuffleIndices].filter(
              (i) => i !== index
            );
            // Adjust indices that are greater than the removed index
            for (let i = 0; i < newShuffleIndices.length; i++) {
              if (newShuffleIndices[i] > index) {
                newShuffleIndices[i]--;
              }
            }
          }

          // Remove from manually added tracks if present
          const newManuallyAdded = new Set(state.manuallyAddedTracks);
          if (newManuallyAdded.has(trackToRemove)) {
            newManuallyAdded.delete(trackToRemove);
          }

          // Update pending manually added indices
          let newPendingIndices = state.pendingManuallyAddedIndices
            .filter((i) => i !== index)
            .map((i) => (i > index ? i - 1 : i));

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
            shuffleIndices: newShuffleIndices,
            manuallyAddedTracks: newManuallyAdded,
            pendingManuallyAddedIndices: newPendingIndices,
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
              shuffleIndices: [0],
              recentlyPlayedIndices: [],
              pendingManuallyAddedIndices: [],
              manuallyAddedTracks: new Set<string>(),
            };
          }

          return {
            queueTracks: [],
            queueTrackItems: [],
            currentQueueIndex: -1,
            shuffleIndices: [],
            recentlyPlayedIndices: [],
            pendingManuallyAddedIndices: [],
            manuallyAddedTracks: new Set<string>(),
          };
        }),

      updateCurrentIndex: (index) =>
        set((state) => {
          if (index >= 0 && index < state.queueTracks.length) {
            // Add previous index to recently played if valid
            const newRecentlyPlayed = [...state.recentlyPlayedIndices];
            if (state.currentQueueIndex >= 0) {
              newRecentlyPlayed.push(state.currentQueueIndex);
              // Keep only the most recent tracks
              while (newRecentlyPlayed.length > MAX_RECENTLY_PLAYED) {
                newRecentlyPlayed.shift();
              }
            }

            // Remove this track from pending manually added if present
            const newPendingIndices = state.pendingManuallyAddedIndices.filter(
              (i) => i !== index
            );

            return {
              currentQueueIndex: index,
              recentlyPlayedIndices: newRecentlyPlayed,
              pendingManuallyAddedIndices: newPendingIndices,
            };
          }
          return state;
        }),

      setCircularMode: (circular) => set({ isCircular: circular }),

      // Shuffle actions
      toggleShuffle: () => {
        const state = get();
        const newShuffleState = !state.isShuffleEnabled;

        if (newShuffleState) {
          // Enabling shuffle - generate shuffle indices but keep current track
          const indices = generateShuffleIndices(state.queueTracks.length);

          // Make sure the current track stays in its position
          if (state.currentQueueIndex >= 0) {
            // Find where current track ended up in shuffle and swap it back
            const shuffledPos = indices.findIndex(
              (i) => i === state.currentQueueIndex
            );
            if (shuffledPos !== -1) {
              [indices[shuffledPos], indices[state.currentQueueIndex]] = [
                indices[state.currentQueueIndex],
                indices[shuffledPos],
              ];
            }
          }

          set({
            isShuffleEnabled: true,
            shuffleIndices: indices,
            recentlyPlayedIndices:
              state.currentQueueIndex >= 0 ? [state.currentQueueIndex] : [],
          });
        } else {
          // Disabling shuffle
          set({
            isShuffleEnabled: false,
            shuffleIndices: [],
          });
        }
      },

      setShuffle: (enabled) => {
        if (enabled !== get().isShuffleEnabled) {
          get().toggleShuffle();
        }
      },

      getNextShuffledIndex: () => {
        const state = get();

        if (!state.isShuffleEnabled || state.queueTracks.length <= 1) {
          // Regular sequential behavior if shuffle disabled
          const nextIndex = state.currentQueueIndex + 1;
          if (nextIndex >= state.queueTracks.length) {
            return state.isCircular ? 0 : -1;
          }
          return nextIndex;
        }

        // Check if there are any pending manually added tracks first
        if (state.pendingManuallyAddedIndices.length > 0) {
          // Play the first pending manually added track
          return state.pendingManuallyAddedIndices[0];
        }

        // With shuffle enabled, find a suitable next track
        const recentlyPlayed = new Set(state.recentlyPlayedIndices);
        const availableIndices: number[] = [];

        // First, prioritize manually added tracks that come right after current position
        for (
          let i = state.currentQueueIndex + 1;
          i < state.queueTracks.length;
          i++
        ) {
          if (
            state.manuallyAddedTracks.has(state.queueTracks[i]) &&
            !recentlyPlayed.has(i)
          ) {
            return i; // Return manually added track immediately
          }
        }

        // Then look through shuffled order, avoiding recently played tracks
        for (let i = 0; i < state.shuffleIndices.length; i++) {
          const index = state.shuffleIndices[i];
          if (index > state.currentQueueIndex && !recentlyPlayed.has(index)) {
            availableIndices.push(index);
          }
        }

        // If nothing found after current index, check from beginning if circular
        if (availableIndices.length === 0 && state.isCircular) {
          for (let i = 0; i < state.shuffleIndices.length; i++) {
            const index = state.shuffleIndices[i];
            if (index < state.currentQueueIndex && !recentlyPlayed.has(index)) {
              availableIndices.push(index);
            }
          }
        }

        // If still no tracks available, just pick next in shuffled order
        if (availableIndices.length === 0) {
          const currentPosInShuffle = state.shuffleIndices.indexOf(
            state.currentQueueIndex
          );
          if (
            currentPosInShuffle >= 0 &&
            currentPosInShuffle < state.shuffleIndices.length - 1
          ) {
            return state.shuffleIndices[currentPosInShuffle + 1];
          } else if (state.isCircular && state.shuffleIndices.length > 0) {
            return state.shuffleIndices[0];
          }
          return -1;
        }

        // Pick random track from available tracks
        return availableIndices[
          Math.floor(Math.random() * availableIndices.length)
        ];
      },

      getPreviousShuffledIndex: () => {
        const state = get();

        if (!state.isShuffleEnabled) {
          // Regular sequential behavior
          const prevIndex = state.currentQueueIndex - 1;
          if (prevIndex < 0) {
            return state.isCircular ? state.queueTracks.length - 1 : -1;
          }
          return prevIndex;
        }

        // With shuffle, go to previously played track if available
        if (state.recentlyPlayedIndices.length > 0) {
          return state.recentlyPlayedIndices[
            state.recentlyPlayedIndices.length - 1
          ];
        }

        // Otherwise, go to previous in shuffled order
        const currentPosInShuffle = state.shuffleIndices.indexOf(
          state.currentQueueIndex
        );
        if (currentPosInShuffle > 0) {
          return state.shuffleIndices[currentPosInShuffle - 1];
        } else if (state.isCircular && state.shuffleIndices.length > 0) {
          return state.shuffleIndices[state.shuffleIndices.length - 1];
        }

        return -1;
      },

      markTrackAsManuallyAdded: (trackUri: string) =>
        set((state) => {
          const newManuallyAdded = new Set(state.manuallyAddedTracks);
          newManuallyAdded.add(trackUri);

          // Find the index of this track in the queue
          const trackIndex = state.queueTracks.indexOf(trackUri);
          if (trackIndex > -1 && trackIndex !== state.currentQueueIndex) {
            // Add to pending manually added indices if not already there
            if (!state.pendingManuallyAddedIndices.includes(trackIndex)) {
              // Add to the end of the pending indices array to maintain order
              const newPendingIndices = [
                ...state.pendingManuallyAddedIndices,
                trackIndex,
              ];
              return {
                manuallyAddedTracks: newManuallyAdded,
                pendingManuallyAddedIndices: newPendingIndices,
              };
            }
          }

          return { manuallyAddedTracks: newManuallyAdded };
        }),

      regenerateShuffleIndices: () =>
        set((state) => {
          if (!state.isShuffleEnabled || state.queueTracks.length <= 1) {
            return state;
          }

          const newIndices = generateShuffleIndices(state.queueTracks.length);

          // Keep current track in its position
          if (state.currentQueueIndex >= 0) {
            const shuffledPos = newIndices.findIndex(
              (i) => i === state.currentQueueIndex
            );
            if (shuffledPos !== -1) {
              [newIndices[shuffledPos], newIndices[state.currentQueueIndex]] = [
                newIndices[state.currentQueueIndex],
                newIndices[shuffledPos],
              ];
            }
          }

          return { shuffleIndices: newIndices };
        }),

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

      // Helper to check if queue is loaded and ready
      isQueueReady: () => {
        const state = get();
        return state.queueTracks.length > 0 && state.currentQueueIndex >= 0;
      },
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
        isShuffleEnabled: state.isShuffleEnabled,
        sourceType: state.sourceType,
        sourceId: state.sourceId,
        manuallyAddedTracks: Array.from(state.manuallyAddedTracks),
      }),
      onRehydrateStorage: () => (state) => {
        // Convert manuallyAddedTracks back to Set after rehydrating
        if (state && Array.isArray(state.manuallyAddedTracks)) {
          state.manuallyAddedTracks = new Set(state.manuallyAddedTracks);
        } else if (state) {
          state.manuallyAddedTracks = new Set();
        }

        // Initialize pendingManuallyAddedIndices
        state!.pendingManuallyAddedIndices = [];
      },
    }
  )
);

// Helper function to generate shuffle indices
function generateShuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);

  // Fisher-Yates shuffle algorithm
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return indices;
}
